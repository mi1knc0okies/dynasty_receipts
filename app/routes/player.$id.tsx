import type { Route } from "./+types/player.$id";
import { Link } from "react-router";
import { getPlayerWithTransactions } from "../.server/lib/data";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { PositionBadge } from "../components/position-badge";
import { ArrowLeftRight, ArrowRight, Calendar, Package, Plus, Minus, UserCircle } from "lucide-react";

export async function loader({ params }: Route.LoaderArgs) {
  const { id } = params;
  if (!id) throw new Response("Not found", { status: 404 });
  const data = await getPlayerWithTransactions(id);
  return data;
}

export function meta({ data }: Route.MetaArgs) {
  const name = (data as any)?.player?.fullName || "Player";
  return [{ title: `Die Nasty — ${name}` }];
}

export default function PlayerPage({ loaderData }: Route.ComponentProps) {
  const { player, timeline } = loaderData;

  const trades = timeline.filter((e: any) => e.kind === "trade");
  const waivers = timeline.filter((e: any) => e.kind === "waiver");

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Player header */}
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded bg-muted flex items-center justify-center shrink-0">
          <UserCircle className="w-9 h-9 text-muted-foreground" />
        </div>
        <div>
          <h1
            className="text-4xl font-bold uppercase tracking-wide text-foreground"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {player?.fullName || "Unknown Player"}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            {player?.position && <PositionBadge position={player.position} />}
            {player?.team && (
              <span className="text-sm text-muted-foreground font-medium">{player.team}</span>
            )}
            {player?.age && (
              <span className="text-sm text-muted-foreground">· Age {player.age}</span>
            )}
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Trades", value: trades.length, icon: ArrowLeftRight },
          { label: "Transactions", value: waivers.length, icon: Package },
          { label: "Total Activity", value: timeline.length, icon: Calendar },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">{label}</p>
                <p className="text-3xl font-bold mt-0.5" style={{ fontFamily: "var(--font-heading)" }}>{value}</p>
              </div>
              <Icon className="w-5 h-5 text-muted-foreground/50" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Timeline */}
      {timeline.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            No transaction history found for this player.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <h2
            className="text-xl font-bold uppercase tracking-wide text-muted-foreground"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Transaction History
          </h2>
          {timeline.map((event: any, idx: number) => (
            <Card key={`${event.id}-${idx}`} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {/* Icon column */}
                  <div className={`w-8 h-8 rounded flex items-center justify-center shrink-0 mt-0.5 ${
                    event.kind === "trade"
                      ? "bg-primary/15 text-primary"
                      : event.type === "add"
                      ? "bg-emerald-500/15 text-emerald-500"
                      : "bg-red-500/15 text-red-500"
                  }`}>
                    {event.kind === "trade" ? (
                      <ArrowLeftRight className="w-4 h-4" />
                    ) : event.type === "add" ? (
                      <Plus className="w-4 h-4" />
                    ) : (
                      <Minus className="w-4 h-4" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Meta row */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {event.date}
                      </span>
                      {event.season && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0">{event.season}</Badge>
                      )}
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0 capitalize"
                      >
                        {event.kind === "trade" ? "Trade" : event.type === "add" ? "Add" : "Drop"}
                      </Badge>
                    </div>

                    {/* Trade content */}
                    {event.kind === "trade" && (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {event.involvedTeams?.map((team: string, i: number) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              <UserCircle className="w-3 h-3 mr-1" />
                              {team}
                            </Badge>
                          ))}
                        </div>
                        {(event.fromTeamName || event.toTeamName) && (
                          <div className="flex items-center gap-1.5 text-sm">
                            {event.fromTeamName && (
                              <span className="text-muted-foreground">{event.fromTeamName}</span>
                            )}
                            <ArrowRight className="w-3.5 h-3.5 text-primary shrink-0" />
                            {event.toTeamName && (
                              <span className="font-medium">{event.toTeamName}</span>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Waiver content */}
                    {event.kind === "waiver" && (
                      <div className="flex items-center gap-1.5 text-sm">
                        <span className={event.type === "add" ? "text-emerald-500 font-medium" : "text-red-500 font-medium"}>
                          {event.type === "add" ? "Picked up by" : "Dropped by"}
                        </span>
                        <span className="font-medium">{event.teamName}</span>
                        {event.bid != null && event.bid > 0 && (
                          <Badge variant="outline" className="text-xs ml-1">${event.bid} FAAB</Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="pt-2">
        <Link to="/players" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Back to Free Agents
        </Link>
      </div>
    </div>
  );
}
