import { getPool } from "../../db/pool.js";

const REVIEW_NUMBERS = [1, 2, 3, 4, 5, 6, 7];

function roundToTwo(value) {
  return Math.round(value * 100) / 100;
}

function roundToFour(value) {
  return Math.round(value * 10000) / 10000;
}

function calculateAllocatedPercent(allocatedHours, categoryHours) {
  if (!categoryHours) {
    return 0;
  }

  return roundToFour(Number(allocatedHours) / Number(categoryHours));
}

function distributeCategoryHours(totalHours) {
  const baseValue = Math.floor(totalHours / REVIEW_NUMBERS.length);
  let remainder = totalHours - (baseValue * REVIEW_NUMBERS.length);

  return REVIEW_NUMBERS.map((reviewNumber) => {
    const extra = remainder > 0 ? 1 : 0;
    remainder = Math.max(0, remainder - extra);

    return {
      reviewNumber,
      allocatedHours: baseValue + extra,
      allocatedPercent: calculateAllocatedPercent(baseValue + extra, totalHours),
      isLocked: false
    };
  });
}

async function ensureCategoryReviewHours(db) {
  const categoriesResult = await db.query(
    `
      SELECT id, allocated_hours
      FROM categories
      ORDER BY display_order, id
    `
  );

  for (const category of categoriesResult.rows) {
    const reviewHoursResult = await db.query(
      `
        SELECT review_number
        FROM category_review_hours
        WHERE category_id = $1
      `,
      [category.id]
    );

    if (reviewHoursResult.rowCount > 0) {
      continue;
    }

    const distributedRows = distributeCategoryHours(Number(category.allocated_hours));

    for (const row of distributedRows) {
      await db.query(
        `
          INSERT INTO category_review_hours (category_id, review_number, allocated_hours, allocated_percent, is_locked, updated_at)
          VALUES ($1, $2, $3, $4, $5, NOW())
        `,
        [category.id, row.reviewNumber, row.allocatedHours, row.allocatedPercent, row.isLocked]
      );
    }
  }
}

function buildCategoryReviewHoursPayload(rows) {
  const categories = new Map();

  for (const row of rows) {
    if (!categories.has(row.id)) {
      categories.set(row.id, {
        id: Number(row.id),
        name: row.name,
        displayOrder: Number(row.display_order),
        categoryHours: Number(row.category_hours),
        reviewHours: REVIEW_NUMBERS.reduce((accumulator, reviewNumber) => {
          accumulator[`Review${reviewNumber}`] = 0;
          return accumulator;
        }, {}),
        reviewPercents: REVIEW_NUMBERS.reduce((accumulator, reviewNumber) => {
          accumulator[`Review${reviewNumber}`] = 0;
          return accumulator;
        }, {}),
        lockedReviews: REVIEW_NUMBERS.reduce((accumulator, reviewNumber) => {
          accumulator[`Review${reviewNumber}`] = false;
          return accumulator;
        }, {})
      });
    }

    if (row.review_number) {
      categories.get(row.id).reviewHours[`Review${Number(row.review_number)}`] = Number(row.review_hours);
      categories.get(row.id).reviewPercents[`Review${Number(row.review_number)}`] = Number(row.allocated_percent);
      categories.get(row.id).lockedReviews[`Review${Number(row.review_number)}`] = Boolean(row.is_locked);
    }
  }

  return {
    reviewColumns: REVIEW_NUMBERS.map((reviewNumber) => `Review${reviewNumber}`),
    rows: Array.from(categories.values())
  };
}

export async function loadCategoryReviewHours() {
  const db = getPool();
  await ensureCategoryReviewHours(db);

  const result = await db.query(
    `
      SELECT
        c.id,
        c.name,
        c.display_order,
        c.allocated_hours AS category_hours,
        crh.review_number,
        crh.allocated_hours AS review_hours,
        crh.allocated_percent,
        crh.is_locked
      FROM categories c
      LEFT JOIN category_review_hours crh ON crh.category_id = c.id
      ORDER BY c.display_order, c.id, crh.review_number
    `
  );

  return buildCategoryReviewHoursPayload(result.rows);
}

export async function loadCategoryReviewHoursByCategoryId(categoryId) {
  const normalizedCategoryId = Number(categoryId);

  if (!Number.isInteger(normalizedCategoryId)) {
    return { ok: false, error: "Category id must be an integer.", status: 400 };
  }

  const db = getPool();
  await ensureCategoryReviewHours(db);

  const result = await db.query(
    `
      SELECT
        c.id,
        c.name,
        c.display_order,
        c.allocated_hours AS category_hours,
        crh.review_number,
        crh.allocated_hours AS review_hours,
        crh.allocated_percent,
        crh.is_locked
      FROM categories c
      LEFT JOIN category_review_hours crh ON crh.category_id = c.id
      WHERE c.id = $1
      ORDER BY c.display_order, c.id, crh.review_number
    `,
    [normalizedCategoryId]
  );

  if (result.rowCount === 0) {
    return { ok: false, error: "Category not found.", status: 404 };
  }

  const payload = buildCategoryReviewHoursPayload(result.rows);

  return {
    ok: true,
    category: payload.rows[0],
    reviewColumns: payload.reviewColumns
  };
}

export async function updateCategoryReviewHours(rows) {
  const normalizedRows = rows.map((row) => {
    const reviewHours = REVIEW_NUMBERS.reduce((accumulator, reviewNumber) => {
      const key = `Review${reviewNumber}`;
      accumulator[key] = Number(row.reviewHours?.[key] ?? 0);
      return accumulator;
    }, {});
    const lockedReviews = REVIEW_NUMBERS.reduce((accumulator, reviewNumber) => {
      const key = `Review${reviewNumber}`;
      accumulator[key] = Boolean(row.lockedReviews?.[key] ?? false);
      return accumulator;
    }, {});

    return {
      id: Number(row.id),
      categoryHours: Number(row.categoryHours),
      reviewHours,
      lockedReviews
    };
  });

  const hasInvalidRow = normalizedRows.some((row) => {
    if (!Number.isInteger(row.id) || !Number.isInteger(row.categoryHours) || row.categoryHours <= 0) {
      return true;
    }

    const values = Object.values(row.reviewHours);
    if (values.some((value) => !Number.isFinite(value) || value < 0)) {
      return true;
    }

    const total = roundToTwo(values.reduce((sum, value) => sum + value, 0));
    return Math.abs(total - row.categoryHours) > 0.01;
  });

  if (hasInvalidRow) {
    return {
      ok: false,
      error: "Each category must use non-negative hours, and the review total must match Category Hours.",
      status: 400
    };
  }

  const db = getPool();
  await db.query("BEGIN");

  try {
    for (const row of normalizedRows) {
      for (const reviewNumber of REVIEW_NUMBERS) {
        const key = `Review${reviewNumber}`;
        const allocatedPercent = calculateAllocatedPercent(row.reviewHours[key], row.categoryHours);
        await db.query(
          `
            INSERT INTO category_review_hours (category_id, review_number, allocated_hours, allocated_percent, is_locked, updated_at)
            VALUES ($1, $2, $3, $4, $5, NOW())
            ON CONFLICT (category_id, review_number)
            DO UPDATE SET
              allocated_hours = EXCLUDED.allocated_hours,
              allocated_percent = EXCLUDED.allocated_percent,
              is_locked = EXCLUDED.is_locked,
              updated_at = NOW()
          `,
          [row.id, reviewNumber, row.reviewHours[key], allocatedPercent, row.lockedReviews[key]]
        );
      }
    }

    await db.query("COMMIT");
    return { ok: true };
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  }
}
