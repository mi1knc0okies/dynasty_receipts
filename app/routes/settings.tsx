import type { Route } from "./+types/settings";
import { Form, useNavigation } from "react-router";
import { getLeagueIds, addLeagueId, removeLeagueId } from "../.server/lib/data";
import { getLeague } from "../.server/lib/sleeper";
import { db } from "../.server/lib/db";
import { leagues } from "../.server/schema";
import { inArray } from "drizzle-orm";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Settings, RefreshCw, TrendingUp, AlertCircle, Plus, Trash2 } from "lucide-react";

export async function loader() {
  const leagueIds = await getLeagueIds();

  // Get names from DB first (already synced), fall back to Sleeper API
  const dbLeagues = leagueIds.length
    ? await db.select({ id: leagues.id, name: leagues.name, season: leagues.season })
        .from(leagues).where(inArray(leagues.id, leagueIds))
    : [];

  const configuredLeagues = leagueIds.map((id) => {
    const dbEntry = dbLeagues.find((l) => l.id === id);
    return { id, name: dbEntry?.name ?? null, season: dbEntry?.season ?? null };
  });

  return { configuredLeagues };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "remove") {
    const id = formData.get("league_id") as string;
    if (id) await removeLeagueId(id);
    return { success: true };
  }

  if (intent === "add") {
    const id = (formData.get("league_id") as string)?.trim();
    if (!id) return { error: "League ID is required." };

    const league = await getLeague(id);
    if (!league) return { error: "League not found on Sleeper. Check the ID and try again." };

    await addLeagueId(id);
    return { success: true, added: league.name };
  }

  return { error: "Unknown action." };
}

export function meta({}: Route.MetaArgs) {
  return [{ title: "Die Nasty - Settings" }];
}

export default function SettingsPage({ loaderData, actionData }: Route.ComponentProps) {
  const { configuredLeagues } = loaderData;
  const navigation = useNavigation();
  const submitting = navigation.state === "submitting";

  const error = (actionData as any)?.error;
  const added = (actionData as any)?.added;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Settings className="w-7 h-7 text-primary" />
          Settings
        </h1>
        <p className="text-muted-foreground mt-1">Configure your Sleeper leagues</p>
      </div>

      {/* Configured leagues */}
      <Card>
        <CardHeader>
          <CardTitle>Leagues</CardTitle>
          <CardDescription>
            Add each season's league ID. First in the list is used for standings and free agents.
            Find league IDs in the Sleeper URL:{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">sleeper.com/leagues/LEAGUE_ID</code>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {configuredLeagues.length === 0 ? (
            <p className="text-sm text-muted-foreground">No leagues added yet.</p>
          ) : (
            <div className="space-y-2">
              {configuredLeagues.map((league, i) => (
                <div key={league.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                  <div className="flex items-center gap-2 min-w-0">
                    {i === 0 && (
                      <Badge variant="default" className="text-[10px] px-1.5 shrink-0">Primary</Badge>
                    )}
                    <span className="font-medium text-sm truncate">
                      {league.name ?? league.id}
                    </span>
                    {league.season && (
                      <Badge variant="outline" className="text-[10px] px-1 shrink-0">{league.season}</Badge>
                    )}
                  </div>
                  <Form method="post">
                    <input type="hidden" name="intent" value="remove" />
                    <input type="hidden" name="league_id" value={league.id} />
                    <Button type="submit" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </Form>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {added && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm font-medium text-emerald-700">
              Added: {added}
            </div>
          )}

          <Form method="post" className="flex gap-2">
            <input type="hidden" name="intent" value="add" />
            <Input
              name="league_id"
              placeholder="Paste league ID…"
              className="font-mono text-sm"
              required
            />
            <Button type="submit" disabled={submitting} className="gap-1.5 shrink-0">
              <Plus className="w-4 h-4" />
              Add
            </Button>
          </Form>
          <p className="text-xs text-muted-foreground">
            Adding validates against Sleeper. Sync data after adding a new league.
          </p>
        </CardContent>
      </Card>

      {/* Sync */}
      <Card>
        <CardHeader>
          <CardTitle>Data Sync</CardTitle>
          <CardDescription>Pull latest data from Sleeper and KeepTradeCut</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Form method="post" action="/api/sync">
            <Button
              type="submit"
              variant="outline"
              className="gap-2"
              disabled={!configuredLeagues.length}
            >
              <RefreshCw className="w-4 h-4" />
              Sync All Leagues
            </Button>
          </Form>
          <Form method="post" action="/api/sync-ktc">
            <Button type="submit" variant="outline" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              Sync KTC
            </Button>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
