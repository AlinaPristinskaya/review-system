import { Router } from "express";
import { loadProgressData, updateProgressCell } from "./progress.service.js";

export const progressRouter = Router();

progressRouter.get("/", async (_request, response) => {
  try {
    const data = await loadProgressData();
    response.json(data);
  } catch (error) {
    console.error(error);
    response.status(500).json({
      error: "Failed to load progress data."
    });
  }
});

progressRouter.put("/subcategories/:subcategoryId/sources/:sourceCode", async (request, response) => {
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
    const updated = await updateProgressCell(subcategoryId, sourceCode, value, factor);

    if (!updated) {
      response.status(404).json({
        error: "Source not found."
      });
      return;
    }

    response.json({ ok: true });
  } catch (error) {
    console.error(error);
    response.status(500).json({
      error: "Failed to update progress data."
    });
  }
});
