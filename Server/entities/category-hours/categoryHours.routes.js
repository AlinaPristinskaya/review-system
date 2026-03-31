import { Router } from "express";
import { loadCategoryHours, updateCategoryHours } from "./categoryHours.service.js";

export const categoryHoursRouter = Router();

categoryHoursRouter.get("/", async (_request, response) => {
  try {
    const rows = await loadCategoryHours();
    response.json({ rows });
  } catch (error) {
    console.error(error);
    response.status(500).json({
      error: "Failed to load category hours."
    });
  }
});

categoryHoursRouter.put("/", async (request, response) => {
  const rows = Array.isArray(request.body?.rows) ? request.body.rows : null;

  if (!rows || rows.length === 0) {
    response.status(400).json({
      error: "Invalid category hours payload."
    });
    return;
  }

  try {
    const result = await updateCategoryHours(rows);

    if (!result.ok) {
      response.status(result.status).json({
        error: result.error
      });
      return;
    }

    response.json({ ok: true });
  } catch (error) {
    console.error(error);
    response.status(500).json({
      error: "Failed to update category hours."
    });
  }
});
