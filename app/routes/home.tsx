import { useState } from "react";
import { Link } from "react-router";
import type { Route } from "./+types/home";
import { getLeagueWithData, getFormattedTrades, getFormattedWaivers, getLeagueIds } from "../.server/lib/data";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "../components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Form } from "react-router";
import {
  Trophy, ArrowRightLeft, Users, Calendar, RefreshCw, TrendingUp, Activity,
  ArrowUp, ArrowDown, Settings, Plus, Minus,
} from "lucide-react";
import { PositionBadge } from "../components/position-badge";

type SortKey = "default" | "name" | "ktc" | "wins" | "losses" | "pf" | "pa" | "diff";
type SortDir = "asc" | "desc";

export async function loader() {
  const leagueIds = await getLeagueIds();
  const primaryId = leagueIds[0];
  if (!primaryId) return { data: null, recentActivity: [], configured: false };
  const data = await getLeagueWithData(primaryId);

  const [trades, waivers] = await Promise.all([
    getFormattedTrades(primaryId),
    getFormattedWaivers(primaryId),
  ]);

  const recentActivity = [
    ...trades.map((t: any) => ({ ...t, kind: "trade" })),
    ...waivers.map((w: any) => ({ ...w, kind: "waiver" })),
  ]
    .sort((a: any, b: any) => {
      const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, 8);

  return { data, recentActivity, configured: true };
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Dynasty Tools - Dashboard" },
    { name: "description", content: "Dynasty Fantasy Football Dashboard" },
  ];
}

function SortButton({
  active,
  direction,
  onClick,
  children,
  className,
}: {
  active: boolean;
  direction: SortDir;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-0.5 hover:text-foreground transition-colors ${
        active ? "text-foreground font-semibold" : "text-muted-foreground"
      } ${className || ""}`}
    >
      {children}
      {active && (
        direction === "desc" ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />
      )}
    </button>
  );
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { data, recentActivity, configured } = loaderData;
  const [sortKey, setSortKey] = useState<SortKey>("default");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  if (!configured) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <div className="rounded-full bg-muted w-16 h-16 flex items-center justify-center">
          <Settings className="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold">No league configured</h2>
        <p className="text-muted-foreground">Enter your Sleeper league ID to get started.</p>
        <Link to="/settings">
          <Button>Go to Settings</Button>
        </Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <div className="rounded-full bg-muted w-16 h-16 flex items-center justify-center">
          <Trophy className="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold">League not found</h2>
        <p className="text-muted-foreground">Try syncing the league data first.</p>
      </div>
    );
  }

  const maxKtc = Math.max(...data.rosters.map((r: any) => r.ktcValue || 0), 1);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  };

  const sorted = [...data.rosters].sort((a: any, b: any) => {
    const sA = (a.settings as any) || {};
    const sB = (b.settings as any) || {};
    const dir = sortDir === "asc" ? 1 : -1;

    switch (sortKey) {
      case "name":
        return dir * ((a.user?.displayName || "").localeCompare(b.user?.displayName || ""));
      case "ktc":
        return dir * ((a.ktcValue || 0) - (b.ktcValue || 0));
      case "wins":
        return dir * ((sA.wins || 0) - (sB.wins || 0));
      case "losses":
        return dir * ((sA.losses || 0) - (sB.losses || 0));
      case "pf":
        return dir * ((sA.fpts || 0) - (sB.fpts || 0));
      case "pa":
        return dir * ((sA.fpts_against || 0) - (sB.fpts_against || 0));
      case "diff":
        return dir * (((sA.fpts || 0) - (sA.fpts_against || 0)) - ((sB.fpts || 0) - (sB.fpts_against || 0)));
      default:
        return dir * ((sA.wins || 0) - (sB.wins || 0));
    }
  });

  return (
    <div className="space-y-6">
      {/* League Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{data.league.name}</h1>
          <p className="text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
            <Users className="w-4 h-4" />
            {data.league.totalRosters} Teams
            <span className="text-muted-foreground/40">|</span>
            <Calendar className="w-4 h-4" />
            Season {data.league.season}
            <Badge variant="secondary" className="capitalize">{data.league.status}</Badge>
          </p>
        </div>
        <div className="flex gap-2">
          <Form method="post" action="/api/sync">
            <Button type="submit" variant="outline" size="sm" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Sync League
            </Button>
          </Form>
          <Form method="post" action="/api/sync-ktc">
            <Button type="submit" variant="outline" size="sm" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              Sync KTC
            </Button>
          </Form>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Teams</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.rosters.length}</div>
            <p className="text-xs text-muted-foreground">{data.users.length} active managers</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Trades</CardTitle>
            <ArrowRightLeft className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentActivity.filter((a: any) => a.kind === "trade").length}</div>
            <p className="text-xs text-muted-foreground">Shown recently</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">League Status</CardTitle>
            <Activity className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{data.league.status}</div>
            <p className="text-xs text-muted-foreground">{data.league.season} season</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Top KTC Value</CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{maxKtc.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Superflex aggregate</p>
          </CardContent>
        </Card>
      </div>

      {/* Standings Table — sortable */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Standings
          </CardTitle>
          <CardDescription>Click column headers to sort • Superflex KTC roster values</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table className="table-fixed w-full">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-10 text-center px-1">
                  <SortButton active={sortKey === "default"} direction={sortDir} onClick={() => handleSort("default")}>
                    #
                  </SortButton>
                </TableHead>
                <TableHead className="w-[35%]">
                  <SortButton active={sortKey === "name"} direction={sortDir} onClick={() => handleSort("name")}>
                    Team
                  </SortButton>
                </TableHead>
                <TableHead className="text-right w-24 px-2">
                  <SortButton active={sortKey === "ktc"} direction={sortDir} onClick={() => handleSort("ktc")} className="justify-end ml-auto">
                    KTC (SF)
                  </SortButton>
                </TableHead>
                <TableHead className="text-right w-10 px-1">
                  <SortButton active={sortKey === "wins"} direction={sortDir} onClick={() => handleSort("wins")} className="justify-end ml-auto">
                    W
                  </SortButton>
                </TableHead>
                <TableHead className="text-right w-10 px-1">
                  <SortButton active={sortKey === "losses"} direction={sortDir} onClick={() => handleSort("losses")} className="justify-end ml-auto">
                    L
                  </SortButton>
                </TableHead>
                <TableHead className="text-right w-16 px-1">
                  <SortButton active={sortKey === "pf"} direction={sortDir} onClick={() => handleSort("pf")} className="justify-end ml-auto">
                    PF
                  </SortButton>
                </TableHead>
                <TableHead className="text-right w-16 px-1">
                  <SortButton active={sortKey === "pa"} direction={sortDir} onClick={() => handleSort("pa")} className="justify-end ml-auto">
                    PA
                  </SortButton>
                </TableHead>
                <TableHead className="text-right w-16 px-1">
                  <SortButton active={sortKey === "diff"} direction={sortDir} onClick={() => handleSort("diff")} className="justify-end ml-auto">
                    Diff
                  </SortButton>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((roster: any, idx: number) => {
                const s = (roster.settings as any) || {};
                const pf = s.fpts || 0;
                const pa = s.fpts_against || 0;
                const diff = pf - pa;
                const ktc = roster.ktcValue || 0;
                const ktcPct = maxKtc > 0 ? (ktc / maxKtc) * 100 : 0;
                return (
                  <TableRow key={roster.id}>
                    <TableCell className="text-center px-1 py-2">
                      <span className={`inline-flex w-5 h-5 items-center justify-center rounded-full text-[10px] font-bold ${
                        sortKey === "default" && idx < 3 ?
                          idx === 0 ? "bg-yellow-500/15 text-yellow-600" :
                          idx === 1 ? "bg-slate-400/15 text-slate-500" :
                          "bg-orange-500/15 text-orange-600"
                        : "text-muted-foreground"
                      }`}>
                        {idx + 1}
                      </span>
                    </TableCell>
                    <TableCell className="px-2 py-2">
                      <Link to={`/roster/${roster.rosterId}`} className="font-medium hover:underline text-sm truncate block max-w-full" title={roster.user?.displayName || roster.user?.username}>
                        {roster.user?.displayName || roster.user?.username || `Team ${roster.rosterId}`}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right px-2 py-2">
                      <div className="flex items-center justify-end gap-1.5">
                        <div className="w-10 h-1.5 rounded-full bg-muted overflow-hidden hidden sm:block">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${ktcPct}%` }} />
                        </div>
                        <span className="tabular-nums font-semibold text-xs">{ktc.toLocaleString()}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-sm px-1 py-2">{s.wins || 0}</TableCell>
                    <TableCell className="text-right text-muted-foreground text-sm px-1 py-2">{s.losses || 0}</TableCell>
                    <TableCell className="text-right tabular-nums text-sm px-1 py-2">{pf.toFixed(1)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground text-sm px-1 py-2">{pa.toFixed(1)}</TableCell>
                    <TableCell className={`text-right tabular-nums font-medium text-sm px-1 py-2 ${diff >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                      {diff > 0 ? "+" : ""}{diff.toFixed(1)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                Recent Activity
              </CardTitle>
              <CardDescription className="text-xs">Latest trades and transactions</CardDescription>
            </div>
            <div className="flex gap-1">
              <Link to="/trades"><Button variant="ghost" size="sm">Trades</Button></Link>
              <Link to="/waivers"><Button variant="ghost" size="sm">Waivers</Button></Link>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No activity recorded yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentActivity.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors gap-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                    <Calendar className="w-3 h-3" />
                    {item.date}
                  </div>

                  {item.kind === "trade" ? (
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-1 flex-wrap">
                        <Badge variant="secondary" className="text-[10px] px-1.5 shrink-0">Trade</Badge>
                        {item.involvedTeams?.map((team: any, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs">{team.name}</Badge>
                        ))}
                      </div>
                      {item.addedPlayers?.filter((ap: any) => ap.player).length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {item.addedPlayers.filter((ap: any) => ap.player).map((ap: any, i: number) => (
                            <div key={i} className="flex items-center gap-1 text-xs bg-muted rounded px-1.5 py-0.5">
                              <PositionBadge position={ap.player.position} />
                              <span className="truncate max-w-[120px]">{ap.player.fullName}</span>
                              <span className="text-muted-foreground">→ {ap.toTeamName}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {item.draftPicks?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {item.draftPicks.map((pick: any, i: number) => (
                            <span key={i} className="text-xs text-muted-foreground bg-muted rounded px-1.5 py-0.5">
                              {pick.season} {pick.round === 1 ? "1st" : pick.round === 2 ? "2nd" : pick.round === 3 ? "3rd" : `${pick.round}th`}
                              {pick.toTeamName ? ` → ${pick.toTeamName}` : ""}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        {item.player?.position && <PositionBadge position={item.player.position} />}
                        <span className="text-sm font-medium truncate">{item.player?.fullName || item.playerName}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-xs text-muted-foreground truncate max-w-[80px]">{item.teamName}</span>
                        <Badge
                          variant={item.type === "add" ? "default" : "destructive"}
                          className="text-[10px] gap-0.5 px-1.5 py-0"
                        >
                          {item.type === "add" ? <Plus className="w-2.5 h-2.5" /> : <Minus className="w-2.5 h-2.5" />}
                          {item.type === "add" ? "ADD" : "DROP"}
                        </Badge>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
