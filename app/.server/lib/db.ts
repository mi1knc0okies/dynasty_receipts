import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../schema";

const connectionString = process.env.DATABASE_PUBLIC_URL;

if (!connectionString) {
  throw new Error("DATABASE_PUBLIC_URL environment variable is required");
}

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes("ssl") || connectionString.includes("neon") ? { rejectUnauthorized: false } : false,
});

export const db = drizzle(pool, { schema });

export type Database = typeof db;
