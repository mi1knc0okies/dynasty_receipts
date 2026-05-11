import { scrapeAllKtcRankings, convertToDbPlayers } from "../app/.server/lib/ktc-scraper";
import { db } from "../app/.server/lib/db";
import { ktcRankings } from "../app/.server/schema";

console.log("🔄 Syncing Keeptradecut rankings...");

async function syncKtc() {
  const { standard, superflex } = await scrapeAllKtcRankings();
  
  await db.delete(ktcRankings);
  
  const standardDb = convertToDbPlayers(standard, false);
  const superflexDb = convertToDbPlayers(superflex, true);
  
  if (standardDb.length > 0) {
    await db.insert(ktcRankings).values(standardDb);
  }
  if (superflexDb.length > 0) {
    await db.insert(ktcRankings).values(superflexDb);
  }

  console.log(`✅ KTC sync: ${standard.length} standard + ${superflex.length} superflex rankings`);
}

syncKtc()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("❌ KTC sync failed:", e);
    process.exit(1);
  });
