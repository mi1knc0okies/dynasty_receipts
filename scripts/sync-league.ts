import { syncLeague } from "../app/.server/lib/sync";

const leagueId = process.argv[2] || process.env.SLEEPER_LEAGUE_ID || "1312487502052888576";
const syncHistory = process.argv.includes("--history");

console.log(`🔄 Syncing Sleeper league data for ${leagueId}...`);
syncLeague(leagueId, syncHistory)
  .then(() => {
    console.log("✅ Sync complete!");
    process.exit(0);
  })
  .catch((e) => {
    console.error("❌ Sync failed:", e.message);
    process.exit(1);
  });
