import type { Route } from "./+types/trades";
import { getFormattedTrades, getLeagueIds } from "../.server/lib/data";
import {
  Card, CardContent, CardHeader,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { PositionBadge } from "../components/position-badge";
import { Separator } from "../components/ui/separator";
import { Link } from "react-router";
import { ArrowLeftRight, Calendar, ArrowRight } from "lucide-react";

export async function loader() {
  const leagueIds = await getLeagueIds();
  if (!leagueIds.length) return { trades: [], configured: false };
  const trades = await getFormattedTrades();
  return { trades, configured: true };
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Dynasty Tools - Trade History" },
    { name: "description", content: "View all trades in your dynasty league" },
  ];
}

function ordinal(n: number) {
  if (n === 1) return "1st";
  if (n === 2) return "2nd";
  if (n === 3) return "3rd";
  return `${n}th`;
}

// Build per-team "receives" buckets from trade data
function buildTradeSides(trade: any) {
  const map = new Map<string, { teamName: string; players: any[]; picks: any[]; faab: number[] }>();

  const getOrCreate = (name: string) => {
    if (!map.has(name)) map.set(name, { teamName: name, players: [], picks: [], faab: [] });
    return map.get(name)!;
  };

  trade.involvedTeams?.forEach((t: any) => getOrCreate(t.name));

  trade.addedPlayers
    ?.filter((ap: any) => ap.player && ap.toTeamName)
    .forEach((ap: any) => getOrCreate(ap.toTeamName).players.push(ap.player));

  trade.draftPicks
    ?.filter((p: any) => p.toTeamName)
    .forEach((p: any) => getOrCreate(p.toTeamName).picks.push(p));

  trade.faabTransfers
    ?.filter((f: any) => f.amount > 0 && f.toTeamName)
    .forEach((f: any) => getOrCreate(f.toTeamName).faab.push(f.amount));

  return Array.from(map.values()).filter(s => s.players.length > 0 || s.picks.length > 0 || s.faab.length > 0);
}

export default function Trades({ loaderData }: Route.ComponentProps) {
  const { trades } = loaderData;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold uppercase tracking-wide font-heading flex items-center gap-2">
          <ArrowLeftRight className="w-7 h-7 text-primary" />
          Trade History
        </h1>
        <p className="text-muted-foreground mt-1">
          {trades.length} trades recorded across all seasons
        </p>
      </div>

      {trades.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-muted w-16 h-16 flex items-center justify-center mb-4">
              <ArrowLeftRight className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">No trades found</h3>
            <p className="text-muted-foreground text-sm max-w-md text-center mt-1">
              No trades have been recorded yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {trades.map((trade: any) => {
            const sides = buildTradeSides(trade);
            return (
              <Card key={trade.id} className="overflow-hidden">
                {/* Header: date + season + status */}
                <CardHeader className="pb-3 pt-4 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5" />
                      {trade.date}
                      {trade.season && (
                        <>
                          <Separator orientation="vertical" className="h-3" />
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">{trade.season}</Badge>
                        </>
                      )}
                    </div>
                    <Badge
                      variant={trade.status === "complete" ? "default" : "secondary"}
                      className="capitalize text-xs"
                    >
                      {trade.status}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="px-4 pb-4 pt-0">
                  {/* Two-sided trade layout */}
                  <div className={`grid gap-3 ${sides.length === 2 ? "grid-cols-[1fr_auto_1fr]" : `grid-cols-${Math.min(sides.length, 3)}`}`}>
                    {sides.map((side, sideIdx) => (
                      <>
                        {/* Team column */}
                        <div key={side.teamName} className="min-w-0">
                          {/* Team name header */}
                          <div className="text-xs font-semibold text-foreground mb-2 truncate flex items-center gap-1.5">
                            <span className="truncate">{side.teamName}</span>
                            <span className="text-muted-foreground font-normal shrink-0">gets</span>
                          </div>

                          <div className="space-y-1.5">
                            {/* Players */}
                            {side.players.map((player: any, i: number) => (
                              <div
                                key={i}
                                className="flex items-center gap-2 p-2 rounded-md bg-muted/50 border min-w-0"
                              >
                                <PositionBadge position={player.position} />
                                <div className="min-w-0 flex-1">
                                  <Link
                                    to={`/player/${player.id}`}
                                    className="text-sm font-medium hover:text-primary transition-colors block truncate"
                                  >
                                    {player.fullName}
                                  </Link>
                                  {player.team && (
                                    <p className="text-[11px] text-muted-foreground">{player.team}</p>
                                  )}
                                </div>
                              </div>
                            ))}

                            {/* Picks */}
                            {side.picks.map((pick: any, i: number) => (
                              <div
                                key={i}
                                className="flex items-center gap-2 p-2 rounded-md bg-muted/50 border"
                              >
                                <Badge variant="secondary" className="text-[10px] shrink-0 font-mono">PICK</Badge>
                                <span className="text-xs font-medium">
                                  {pick.season} {ordinal(pick.round)}
                                </span>
                              </div>
                            ))}

                            {/* FAAB */}
                            {side.faab.map((amount: number, i: number) => (
                              <div
                                key={i}
                                className="flex items-center gap-2 p-2 rounded-md bg-emerald-500/10 border border-emerald-500/20"
                              >
                                <Badge variant="outline" className="text-[10px] shrink-0 text-emerald-600 border-emerald-500/40">FAAB</Badge>
                                <span className="text-xs font-semibold text-emerald-600">${amount}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Arrow divider between columns (only between pairs) */}
                        {sides.length === 2 && sideIdx === 0 && (
                          <div key="divider" className="flex items-center justify-center">
                            <div className="flex flex-col items-center gap-1 text-muted-foreground/50">
                              <ArrowRight className="w-4 h-4" />
                              <ArrowRight className="w-4 h-4 rotate-180" />
                            </div>
                          </div>
                        )}
                      </>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
