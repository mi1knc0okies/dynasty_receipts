import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import * as schema from "../schema";

export async function runMigrations() {
  const connectionString = process.env.DATABASE_PUBLIC_URL;
  if (!connectionString) throw new Error("DATABASE_PUBLIC_URL required");

  const pool = new Pool({
    connectionString,
    ssl: connectionString.includes("ssl") || connectionString.includes("neon") ? { rejectUnauthorized: false } : false,
  });

  const db = drizzle(pool, { schema });
  console.log("Creating tables...");

  await db.execute(sql`CREATE TABLE IF NOT EXISTS "leagues" (
    "id" text PRIMARY KEY, "name" text NOT NULL, "season" text, "status" text,
    "total_rosters" integer, "roster_positions" json, "settings" json,
    "scoring_settings" json, "metadata" json, "created_at" timestamp, "updated_at" timestamp
  )`);

  await db.execute(sql`CREATE TABLE IF NOT EXISTS "users" (
    "id" text PRIMARY KEY, "username" text NOT NULL, "display_name" text,
    "avatar" text, "metadata" json
  )`);

  await db.execute(sql`CREATE TABLE IF NOT EXISTS "rosters" (
    "id" serial PRIMARY KEY, "roster_id" integer NOT NULL,
    "league_id" text NOT NULL REFERENCES "leagues"("id"),
    "owner_id" text REFERENCES "users"("id"),
    "players" json, "starters" json, "reserve" json, "settings" json, "metadata" json,
    "created_at" timestamp, "updated_at" timestamp
  )`);

  await db.execute(sql`CREATE TABLE IF NOT EXISTS "trades" (
    "id" text PRIMARY KEY, "league_id" text NOT NULL REFERENCES "leagues"("id"),
    "season" text, "week" integer, "timestamp" timestamp,
    "roster_ids" json, "consenter_ids" json, "adds" json, "drops" json,
    "draft_picks" json, "status" text, "metadata" json, "created_at" timestamp DEFAULT now()
  )`);

  await db.execute(sql`CREATE TABLE IF NOT EXISTS "waivers" (
    "id" text PRIMARY KEY, "league_id" text NOT NULL REFERENCES "leagues"("id"),
    "season" text, "week" integer, "timestamp" timestamp,
    "roster_id" integer, "type" text, "player_id" text, "player_name" text,
    "player_position" text,
    "bid" integer, "status" text, "metadata" json, "created_at" timestamp DEFAULT now()
  )`);
  await db.execute(sql`ALTER TABLE "waivers" ADD COLUMN IF NOT EXISTS "player_position" text`);

  await db.execute(sql`CREATE TABLE IF NOT EXISTS "drafts" (
    "id" text PRIMARY KEY, "league_id" text NOT NULL REFERENCES "leagues"("id"),
    "season" text, "status" text, "type" text,
    "draft_order" json, "metadata" json, "created_at" timestamp, "updated_at" timestamp
  )`);

  await db.execute(sql`CREATE TABLE IF NOT EXISTS "draft_picks" (
    "id" serial PRIMARY KEY, "draft_id" text NOT NULL REFERENCES "drafts"("id"),
    "pick_number" integer NOT NULL, "round" integer NOT NULL,
    "overall_pick" integer, "roster_id" integer,
    "player_id" text, "player_name" text, "timestamp" timestamp, "metadata" json
  )`);

  await db.execute(sql`CREATE TABLE IF NOT EXISTS "players" (
    "id" text PRIMARY KEY, "first_name" text, "last_name" text, "full_name" text,
    "team" text, "position" text, "number" integer, "age" integer,
    "height" text, "weight" text, "college" text, "status" text,
    "fantasy_positions" json, "metadata" json, "updated_at" timestamp
  )`);

  await db.execute(sql`CREATE TABLE IF NOT EXISTS "ktc_rankings" (
    "id" serial PRIMARY KEY, "player_name" text NOT NULL, "position" text NOT NULL,
    "team" text, "rank" integer NOT NULL, "value" integer NOT NULL,
    "tier" integer, "position_rank" integer, "sf_rank" integer,
    "superflex" integer, "scraped_at" timestamp DEFAULT now()
  )`);

  await db.execute(sql`CREATE TABLE IF NOT EXISTS "app_settings" (
    "key" text PRIMARY KEY,
    "value" text,
    "updated_at" timestamp DEFAULT now()
  )`);

  console.log("✅ Tables created successfully!");
  await pool.end();
}

if (import.meta.main) {
  runMigrations().catch(console.error);
}
