import { getPool } from "../../db/pool.js";

export async function loadCategoryHours() {
  const db = getPool();
  const result = await db.query(
    `
      SELECT id, name, display_order, allocated_hours
      FROM categories
      ORDER BY display_order, id
    `
  );

  return result.rows.map((row) => ({
    id: Number(row.id),
    name: row.name,
    displayOrder: Number(row.display_order),
    allocatedHours: Number(row.allocated_hours)
  }));
}

export async function updateCategoryHours(rows) {
  const normalizedRows = rows.map((row) => ({
    id: Number(row.id),
    allocatedHours: Number(row.allocatedHours)
  }));

  const hasInvalidRow = normalizedRows.some((row) => {
    return !Number.isInteger(row.id)
      || !Number.isInteger(row.allocatedHours)
      || row.allocatedHours <= 0;
  });

  if (hasInvalidRow) {
    return { ok: false, error: "Allocated hours must be positive whole numbers.", status: 400 };
  }

  const db = getPool();
  await db.query("BEGIN");

  try {
    for (const row of normalizedRows) {
      const result = await db.query(
        `
          UPDATE categories
          SET allocated_hours = $2
          WHERE id = $1
        `,
        [row.id, row.allocatedHours]
      );

      if (result.rowCount === 0) {
        await db.query("ROLLBACK");
        return { ok: false, error: "Category not found.", status: 404 };
      }
    }

    await db.query("COMMIT");
    return { ok: true };
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  }
}
