import type { Route } from "./+types/api.sync-ktc";
import { scrapeAllKtcRankings, convertToDbPlayers } from "../.server/lib/ktc-scraper";
import { db } from "../.server/lib/db";
import { ktcRankings } from "../.server/schema";

export async function loader() {
  return Response.json({ error: "Method not allowed" }, { status: 405 });
}

export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const { standard, superflex } = await scrapeAllKtcRankings();
    
    // Clear old rankings
    await db.delete(ktcRankings);
    
    // Insert new rankings
    const standardDb = convertToDbPlayers(standard, false);
    const superflexDb = convertToDbPlayers(superflex, true);
    
    if (standardDb.length > 0) {
      await db.insert(ktcRankings).values(standardDb);
    }
    if (superflexDb.length > 0) {
      await db.insert(ktcRankings).values(superflexDb);
    }

    return Response.json({ 
      success: true, 
      message: `Scraped ${standard.length} standard and ${superflex.length} superflex rankings` 
    });
  } catch (error: any) {
    console.error("KTC sync error:", error);
    return Response.json(
      { error: error.message || "Failed to sync KTC data" },
      { status: 500 }
    );
  }
}
