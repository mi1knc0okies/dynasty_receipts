import { db } from "../app/.server/lib/db";
import { trades, waivers, leagues } from "../app/.server/schema";
import { count, eq } from "drizzle-orm";

async function main() {
  const allLeagues = await db.select().from(leagues);
  console.log("Leagues in DB:");
  for (const l of allLeagues) {
    console.log(`  ${l.id}: ${l.name} (${l.season})`);
    const tc = await db.select({ count: count() }).from(trades).where(eq(trades.leagueId, l.id));
    const wc = await db.select({ count: count() }).from(waivers).where(eq(waivers.leagueId, l.id));
    console.log(`    Trades: ${tc[0].count}, Waivers: ${wc[0].count}`);
  }
}

main().catch(console.error);
