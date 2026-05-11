import type { Route } from "./+types/api.sync";
import { syncLeague } from "../.server/lib/sync";
import { getLeagueIds } from "../.server/lib/data";

export async function loader() {
  return Response.json({ error: "Method not allowed" }, { status: 405 });
}

export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const leagueIds = await getLeagueIds();
  if (!leagueIds.length) {
    return Response.json({ error: "No leagues configured. Go to /settings first." }, { status: 400 });
  }

  try {
    for (const id of leagueIds) {
      await syncLeague(id, false); // false = don't auto-follow chain; user controls which IDs are tracked
    }
    return Response.json({ success: true, message: `Synced ${leagueIds.length} league(s)` });
  } catch (error: any) {
    console.error("Sync error:", error);
    return Response.json(
      { error: error.message || "Failed to sync data" },
      { status: 500 }
    );
  }
}
