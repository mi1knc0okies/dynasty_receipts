import { syncLeague } from "../app/.server/lib/sync";

const CURRENT_LEAGUE = "1312487502052888576";
const PREVIOUS_LEAGUE = "1199123493216587776";

async function run() {
  console.log("=== Syncing both leagues ===\n");
  
  console.log(`[1/2] Current league: ${CURRENT_LEAGUE}`);
  await syncLeague(CURRENT_LEAGUE, false);
  
  console.log(`\n[2/2] Previous league: ${PREVIOUS_LEAGUE}`);
  await syncLeague(PREVIOUS_LEAGUE, false);
  
  console.log("\n✅ All leagues synced!");
}

run()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("❌ Failed:", e.message);
    process.exit(1);
  });
