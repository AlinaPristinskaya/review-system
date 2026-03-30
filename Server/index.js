import express from "express";
import pg from "pg";
import { loadServerEnv } from "./lib/env.js";

const { Pool } = pg;

loadServerEnv();

const app = express();
const port = Number(process.env.PORT || 3001);

let pool;
const sourceColumns = ["SPA", "REVIEW1", "REVIEW2", "REVIEW3", "REVIEW4", "REVIEW5", "REVIEW6", "REVIEW7"];

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });
  }

  return pool;
}

async function loadDatabaseData() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured.");
  }

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

app.use(express.json());
app.use((request, response, next) => {
  response.setHeader("Access-Control-Allow-Origin", "http://localhost:3000");
  response.setHeader("Access-Control-Allow-Methods", "GET,PUT,OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (request.method === "OPTIONS") {
    response.sendStatus(204);
    return;
  }

  next();
});

app.get("/api/progress", async (_request, response) => {
  try {
    const data = await loadDatabaseData();
    response.json(data);
  } catch (error) {
    console.error(error);
    response.status(500).json({
      error: "Failed to load progress data."
    });
  }
});

app.put("/api/progress/subcategories/:subcategoryId/sources/:sourceCode", async (request, response) => {
  if (!process.env.DATABASE_URL) {
    response.status(503).json({
      error: "DATABASE_URL is not configured."
    });
    return;
  }

  const db = getPool();
  const { subcategoryId, sourceCode } = request.params;
  const value = Number(request.body?.value ?? 0);
  const factor = Number(request.body?.factor ?? 1);

  if (!Number.isFinite(value) || !Number.isFinite(factor)) {
    response.status(400).json({
      error: "Value and factor must be numeric."
    });
    return;
  }

  try {
    const sourceResult = await db.query(
      "SELECT id FROM sources WHERE code = $1",
      [sourceCode.toUpperCase()]
    );

    if (sourceResult.rowCount === 0) {
      response.status(404).json({
        error: "Source not found."
      });
      return;
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

    response.json({ ok: true });
  } catch (error) {
    console.error(error);
    response.status(500).json({
      error: "Failed to update progress data."
    });
  }
});

app.listen(port, () => {
  console.log(`API server running at http://localhost:${port}`);
});
