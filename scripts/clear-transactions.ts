import { db } from "../app/.server/lib/db";
import { trades, waivers } from "../app/.server/schema";

await db.delete(waivers);
await db.delete(trades);
console.log("✅ Cleared trades and waivers");
