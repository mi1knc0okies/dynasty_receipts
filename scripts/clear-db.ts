import { db } from "../app/.server/lib/db";
import { sql } from "drizzle-orm";

// Drop and recreate all tables
await db.execute(sql`DROP TABLE IF EXISTS "draft_picks" CASCADE`);
await db.execute(sql`DROP TABLE IF EXISTS "drafts" CASCADE`);
await db.execute(sql`DROP TABLE IF EXISTS "waivers" CASCADE`);
await db.execute(sql`DROP TABLE IF EXISTS "trades" CASCADE`);
await db.execute(sql`DROP TABLE IF EXISTS "rosters" CASCADE`);
await db.execute(sql`DROP TABLE IF EXISTS "players" CASCADE`);
await db.execute(sql`DROP TABLE IF EXISTS "users" CASCADE`);
await db.execute(sql`DROP TABLE IF EXISTS "leagues" CASCADE`);
await db.execute(sql`DROP TABLE IF EXISTS "ktc_rankings" CASCADE`);
console.log("✅ All tables dropped");
