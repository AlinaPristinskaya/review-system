import { Router } from "express";
import { loadEffortWeights, updateEffortWeights } from "./effortWeights.service.js";

export const effortWeightsRouter = Router();

effortWeightsRouter.get("/", async (_request, response) => {
  try {
    const rows = await loadEffortWeights();
    response.json({ rows });
  } catch (error) {
    console.error(error);
    response.status(500).json({
      error: "Failed to load effort weights."
    });
  }
});

effortWeightsRouter.put("/", async (request, response) => {
  const rows = Array.isArray(request.body?.rows) ? request.body.rows : null;

  if (!rows || rows.length === 0) {
    response.status(400).json({
      error: "Invalid effort weight payload."
    });
    return;
  }

  try {
    const result = await updateEffortWeights(rows);

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
      error: "Failed to update effort weight."
    });
  }
});
