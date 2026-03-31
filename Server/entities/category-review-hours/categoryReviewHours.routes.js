import { Router } from "express";
import {
  loadCategoryReviewHours,
  loadCategoryReviewHoursByCategoryId,
  updateCategoryReviewHours
} from "./categoryReviewHours.service.js";

export const categoryReviewHoursRouter = Router();

categoryReviewHoursRouter.get("/", async (_request, response) => {
  try {
    const payload = await loadCategoryReviewHours();
    response.json(payload);
  } catch (error) {
    console.error(error);
    response.status(500).json({
      error: "Failed to load category review hours."
    });
  }
});

categoryReviewHoursRouter.get("/categories/:categoryId", async (request, response) => {
  try {
    const result = await loadCategoryReviewHoursByCategoryId(request.params.categoryId);

    if (!result.ok) {
      response.status(result.status).json({
        error: result.error
      });
      return;
    }

    response.json({
      reviewColumns: result.reviewColumns,
      category: result.category
    });
  } catch (error) {
    console.error(error);
    response.status(500).json({
      error: "Failed to load category review hours."
    });
  }
});

categoryReviewHoursRouter.put("/", async (request, response) => {
  const rows = Array.isArray(request.body?.rows) ? request.body.rows : null;

  if (!rows || rows.length === 0) {
    response.status(400).json({
      error: "Invalid category review hours payload."
    });
    return;
  }

  try {
    const result = await updateCategoryReviewHours(rows);

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
      error: "Failed to update category review hours."
    });
  }
});
