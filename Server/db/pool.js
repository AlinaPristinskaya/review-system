import pg from "pg";
import { loadServerEnv } from "../lib/env.js";

const { Pool } = pg;

loadServerEnv();

let pool;

export function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured.");
  }

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
