import { getPool } from "../../db/pool.js";

export async function loadEffortWeights() {
  const db = getPool();
  const result = await db.query(
    `
      SELECT from_rating, to_rating, effort_weight
      FROM effort_weights
      ORDER BY from_rating, to_rating
    `
  );

  return result.rows.map((row) => ({
    from: Number(row.from_rating),
    to: Number(row.to_rating),
    effortWeight: Number(row.effort_weight)
  }));
}

export async function updateEffortWeights(rows) {
  const normalizedRows = rows.map((row) => ({
    from: Number(row.from),
    to: Number(row.to),
    effortWeight: Number(row.effortWeight)
  }));

  const hasInvalidRow = normalizedRows.some((row) => {
    return !Number.isInteger(row.from)
      || !Number.isInteger(row.to)
      || !Number.isFinite(row.effortWeight)
      || row.effortWeight < 0;
  });

  if (hasInvalidRow) {
    return { ok: false, error: "Invalid effort weight payload.", status: 400 };
  }

  const total = normalizedRows.reduce((sum, row) => sum + row.effortWeight, 0);
  if (Math.abs(total - 1) > 0.0001) {
    return { ok: false, error: "Effort weights must sum to 1.", status: 400 };
  }

  const db = getPool();

  await db.query("BEGIN");

  try {
    for (const row of normalizedRows) {
      await db.query(
        `
          INSERT INTO effort_weights (from_rating, to_rating, effort_weight, updated_at)
          VALUES ($1, $2, $3, NOW())
          ON CONFLICT (from_rating, to_rating)
          DO UPDATE SET
            effort_weight = EXCLUDED.effort_weight,
            updated_at = NOW()
        `,
        [row.from, row.to, row.effortWeight]
      );
    }

    await db.query("COMMIT");
    return { ok: true };
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  }
}
