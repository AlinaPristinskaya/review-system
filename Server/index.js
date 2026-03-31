import express from "express";
import { loadServerEnv } from "./lib/env.js";
import { progressRouter } from "./entities/progress/progress.routes.js";
import { effortWeightsRouter } from "./entities/effort-weights/effortWeights.routes.js";
import { categoryHoursRouter } from "./entities/category-hours/categoryHours.routes.js";
import { categoryReviewHoursRouter } from "./entities/category-review-hours/categoryReviewHours.routes.js";

loadServerEnv();

const app = express();
const port = Number(process.env.PORT || 3001);

const allowedOrigins = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://alinapristinskaya.github.io"
]);

function isAllowedOrigin(origin) {
  if (!origin) {
    return false;
  }

  if (allowedOrigins.has(origin)) {
    return true;
  }

  // GitHub Pages always uses the github.io origin regardless of repo path.
  if (/^https:\/\/[a-z0-9-]+\.github\.io$/i.test(origin)) {
    return true;
  }

  return false;
}

app.use(express.json());
app.use((request, response, next) => {
  const requestOrigin = request.headers.origin;

  if (isAllowedOrigin(requestOrigin)) {
    response.setHeader("Access-Control-Allow-Origin", requestOrigin);
    response.setHeader("Vary", "Origin");
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
