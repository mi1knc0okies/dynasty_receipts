import type { Route } from "./+types/trades";
import { getFormattedTrades, getLeagueIds } from "../.server/lib/data";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { PositionBadge } from "../components/position-badge";
import { Separator } from "../components/ui/separator";
import { Link } from "react-router";
import { ArrowLeftRight, Calendar, Package, UserCircle, ArrowRight } from "lucide-react";

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
          {trades.map((trade: any) => (
            <Card key={trade.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5" />
                      {trade.date}
                      {trade.season && (
                        <>
                          <Separator orientation="vertical" className="h-3" />
                          <Badge variant="outline" className="text-[10px] px-1 py-0">{trade.season}</Badge>
                        </>
                      )}
                    </div>
                  </div>
                  <Badge variant={trade.status === "complete" ? "default" : "secondary"} className="capitalize text-xs">
                    {trade.status}
                  </Badge>
                </div>
                {/* Teams involved */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  {trade.involvedTeams?.map((team: any, i: number) => (
                    <Badge key={i} variant="outline" className="flex items-center gap-1">
                      <UserCircle className="w-3 h-3" />
                      {team.name}
                    </Badge>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Players received (with team destination) */}
                {trade.addedPlayers?.filter((ap: any) => ap.player).length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Package className="w-4 h-4" />
                      Players Received
                    </h4>
                    <div className="space-y-1.5">
                      {trade.addedPlayers
                        .filter((ap: any) => ap.player)
                        .map((ap: any, idx: number) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50 border"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <PositionBadge position={ap.player.position} />
                              <div className="min-w-0">
                                <Link to={`/player/${ap.player.id}`} className="font-medium text-sm truncate hover:text-primary transition-colors block">{ap.player.fullName}</Link>
                                <p className="text-xs text-muted-foreground">{ap.player.team}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                              <ArrowRight className="w-3 h-3" />
                              <span className="truncate max-w-[100px]">{ap.toTeamName}</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Players given up (with source team) */}
                {trade.droppedPlayers?.filter((dp: any) => dp.player).length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Package className="w-4 h-4" />
                      Players Given Up
                    </h4>
                    <div className="space-y-1.5">
                      {trade.droppedPlayers
                        .filter((dp: any) => dp.player)
                        .map((dp: any, idx: number) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50 border"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <PositionBadge position={dp.player.position} />
                              <div className="min-w-0">
                                <Link to={`/player/${dp.player.id}`} className="font-medium text-sm truncate hover:text-primary transition-colors block">{dp.player.fullName}</Link>
                                <p className="text-xs text-muted-foreground">{dp.player.team}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                              from
                              <span className="truncate max-w-[100px]">{dp.fromTeamName}</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Draft picks */}
                {trade.draftPicks?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Package className="w-4 h-4" />
                      Draft Picks
                    </h4>
                    <div className="space-y-1.5">
                      {trade.draftPicks.map((pick: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50 border">
                          <Badge variant="outline" className="text-xs shrink-0">
                            {pick.season} {pick.round === 1 ? "1st" : pick.round === 2 ? "2nd" : pick.round === 3 ? "3rd" : `${pick.round}th`} Round
                          </Badge>
                          {pick.fromTeamName && pick.toTeamName && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground ml-3">
                              <span className="truncate max-w-[90px]">{pick.fromTeamName}</span>
                              <ArrowRight className="w-3 h-3 shrink-0" />
                              <span className="truncate max-w-[90px]">{pick.toTeamName}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
