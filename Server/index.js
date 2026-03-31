import express from "express";
import { loadServerEnv } from "./lib/env.js";
import { progressRouter } from "./entities/progress/progress.routes.js";
import { effortWeightsRouter } from "./entities/effort-weights/effortWeights.routes.js";
import { categoryHoursRouter } from "./entities/category-hours/categoryHours.routes.js";
import { categoryReviewHoursRouter } from "./entities/category-review-hours/categoryReviewHours.routes.js";

loadServerEnv();

const app = express();
const port = Number(process.env.PORT || 3001);

app.use(express.json());
app.use((request, response, next) => {
  const allowedOrigins = new Set([
    "http://localhost:3000",
    "http://127.0.0.1:3000"
  ]);
  const requestOrigin = request.headers.origin;

  if (requestOrigin && allowedOrigins.has(requestOrigin)) {
    response.setHeader("Access-Control-Allow-Origin", requestOrigin);
  }

  response.setHeader("Access-Control-Allow-Methods", "GET,PUT,OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (request.method === "OPTIONS") {
    response.sendStatus(204);
    return;
  }

  next();
});

app.use("/api/progress", progressRouter);
app.use("/api/effort-weights", effortWeightsRouter);
app.use("/api/category-hours", categoryHoursRouter);
app.use("/api/category-review-hours", categoryReviewHoursRouter);

app.listen(port, () => {
  console.log(`API server running at http://localhost:${port}`);
});
