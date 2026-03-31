import { getPool } from "../../db/pool.js";

export const sourceColumns = ["SPA", "REVIEW1", "REVIEW2", "REVIEW3", "REVIEW4", "REVIEW5", "REVIEW6", "REVIEW7"];

export async function loadProgressData() {
  const db = getPool();
  const query = `
    SELECT
      c.id AS category_id,
      c.name AS category_name,
      c.display_order AS category_order,
      sc.id AS subcategory_id,
      sc.name AS subcategory_name,
      sc.display_order AS subcategory_order,
      src.code AS source_code,
      COALESCE(ssv.metric_value, 0) AS metric_value,
      COALESCE(ssv.factor, 1) AS factor
    FROM categories c
    JOIN subcategories sc ON sc.category_id = c.id
    LEFT JOIN subcategory_source_values ssv ON ssv.subcategory_id = sc.id
    LEFT JOIN sources src ON src.id = ssv.source_id
    ORDER BY c.display_order, sc.display_order, src.code
  `;

  const result = await db.query(query);
  const categories = new Map();

  for (const row of result.rows) {
    if (!categories.has(row.category_id)) {
      categories.set(row.category_id, {
        id: row.category_id,
        name: row.category_name,
        displayOrder: row.category_order,
        subcategories: new Map()
      });
    }

    const category = categories.get(row.category_id);

    if (!category.subcategories.has(row.subcategory_id)) {
      category.subcategories.set(row.subcategory_id, {
        id: row.subcategory_id,
        name: row.subcategory_name,
        displayOrder: row.subcategory_order,
        values: {}
      });
    }

    const subcategory = category.subcategories.get(row.subcategory_id);

    if (row.source_code) {
      subcategory.values[row.source_code] = {
        value: Number(row.metric_value),
        factor: Number(row.factor)
      };
    }
  }

  return {
    sourceColumns,
    categories: Array.from(categories.values()).map((category) => ({
      id: category.id,
      name: category.name,
      displayOrder: category.displayOrder,
      subcategories: Array.from(category.subcategories.values())
    }))
  };
}

export async function updateProgressCell(subcategoryId, sourceCode, value, factor) {
  const db = getPool();
  const sourceResult = await db.query(
    "SELECT id FROM sources WHERE code = $1",
    [sourceCode.toUpperCase()]
  );

  if (sourceResult.rowCount === 0) {
    return false;
  }

  await db.query(
    `
      INSERT INTO subcategory_source_values (subcategory_id, source_id, metric_value, factor, updated_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (subcategory_id, source_id)
      DO UPDATE SET
        metric_value = EXCLUDED.metric_value,
        factor = EXCLUDED.factor,
        updated_at = NOW()
    `,
    [subcategoryId, sourceResult.rows[0].id, value, factor]
  );

  return true;
}
