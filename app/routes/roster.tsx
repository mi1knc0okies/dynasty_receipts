import { Link } from "react-router";
import type { Route } from "./+types/roster";
import { getRosterWithPlayers, getRosterTransactionHistory, getLeagueIds } from "../.server/lib/data";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "../components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { PositionBadge } from "../components/position-badge";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "../components/ui/tabs";
import { ArrowLeft, Trophy, TrendingUp, Star, Layers, ArrowRightLeft, Users, Plus, Minus, Package, Calendar } from "lucide-react";

export async function loader({ params }: Route.LoaderArgs) {
  const leagueIds = await getLeagueIds();
  const primaryLeagueId = leagueIds[0] ?? "";
  const roster = await getRosterWithPlayers(parseInt(params.teamId), primaryLeagueId);
  const history = await getRosterTransactionHistory(parseInt(params.teamId));
  return { roster, history };
}

export function meta({ data }: Route.MetaArgs) {
  return [
    { title: `Roster - ${data?.roster?.user?.displayName || "Team"}` },
    { name: "description", content: "Team roster with KTC values and transaction history" },
  ];
}

export default function Roster({ loaderData }: Route.ComponentProps) {
  const { roster, history } = loaderData;

  if (!roster) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <div className="rounded-full bg-muted w-16 h-16 flex items-center justify-center">
          <Trophy className="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold">Roster not found</h2>
        <p className="text-muted-foreground">This team may not exist in the current league.</p>
        <Link to="/">
          <Badge variant="secondary" className="cursor-pointer">
            <ArrowLeft className="w-3 h-3 mr-1" /> Back to Standings
          </Badge>
        </Link>
      </div>
    );
  }

  const allPlayers = roster.players || [];
  const startersArr = ((roster.starters as unknown) as string[] | undefined) || [];
  const reserveArr = ((roster.reserve as unknown) as string[] | undefined) || [];

  const starters = allPlayers.filter((p: any) => startersArr.includes(p.id));
  const bench = allPlayers.filter((p: any) => !startersArr.includes(p.id));
  const reserve = reserveArr.map((id: string) => allPlayers.find((p: any) => p.id === id)).filter(Boolean);

  const totalValue = allPlayers.reduce((sum: number, p: any) => sum + (p.ktcValue || 0), 0);

  const renderPlayerRow = (player: any, idx: number) => (
    <TableRow key={player.id} className={!player.ktcRank ? "opacity-70" : ""}>
      <TableCell className="w-8"><span className="text-xs text-muted-foreground tabular-nums">{idx + 1}</span></TableCell>
      <TableCell>
        <div className="flex items-center gap-3">
          {player.position && <PositionBadge position={player.position} />}
          <div>
            <div className="font-medium">{player.fullName}</div>
            <div className="text-xs text-muted-foreground">{player.team}</div>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {player.ktcRank ? <span className="font-medium">#{player.ktcRank}</span> : <span className="text-muted-foreground text-xs">—</span>}
      </TableCell>
      <TableCell className="text-right tabular-nums font-semibold">
        {player.ktcValue ? <span>{player.ktcValue.toLocaleString()}</span> : <span className="text-muted-foreground">—</span>}
      </TableCell>
      <TableCell className="text-right">
        {player.ktcTier ? <Badge variant="outline" className="text-xs font-mono">T{player.ktcTier}</Badge> : <span className="text-muted-foreground text-xs">—</span>}
      </TableCell>
    </TableRow>
  );

  const hasHistory = history.trades.length > 0 || history.waivers.length > 0;

  return (
    <div className="space-y-6">
      {/* Team Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Standings
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">
            {roster.user?.displayName || roster.user?.username || `Team ${roster.rosterId}`}
          </h1>
          <p className="text-muted-foreground mt-1 flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            {(roster.settings as any)?.wins || 0}-{(roster.settings as any)?.losses || 0} Record
            <span className="text-muted-foreground/40">|</span>
            {allPlayers.length} Players
          </p>
        </div>
        <Card className="min-w-[180px]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" /> Total KTC (SF)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tabular-nums">{totalValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Superflex aggregate value</p>
          </CardContent>
        </Card>
      </div>

      {/* Roster Tabs */}
      <Tabs defaultValue="starters" className="w-full">
        <TabsList>
          <TabsTrigger value="starters" className="gap-1.5">
            <Star className="w-3.5 h-3.5" /> Starters ({starters.length})
          </TabsTrigger>
          <TabsTrigger value="bench" className="gap-1.5">
            <Layers className="w-3.5 h-3.5" /> Bench ({bench.length})
          </TabsTrigger>
          {reserve.length > 0 && (
            <TabsTrigger value="reserve" className="gap-1.5">
              Reserve ({reserve.length})
            </TabsTrigger>
          )}
          <TabsTrigger value="history" className="gap-1.5">
            <ArrowRightLeft className="w-3.5 h-3.5" /> History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="starters" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>Player</TableHead>
                    <TableHead className="text-right">Rank</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead className="text-right">Tier</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {starters.map((p: any, i: number) => renderPlayerRow(p, i))}
                  {starters.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No starters assigned</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bench" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>Player</TableHead>
                    <TableHead className="text-right">Rank</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead className="text-right">Tier</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bench.map((p: any, i: number) => renderPlayerRow(p, i))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {reserve.length > 0 && (
          <TabsContent value="reserve" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">#</TableHead>
                      <TableHead>Player</TableHead>
                      <TableHead className="text-right">Rank</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                      <TableHead className="text-right">Tier</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reserve.map((p: any, i: number) => renderPlayerRow(p, i))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Transaction History */}
        <TabsContent value="history" className="mt-4">
          {!hasHistory ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="rounded-full bg-muted w-16 h-16 flex items-center justify-center mb-4">
                  <ArrowRightLeft className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold">No transaction history</h3>
                <p className="text-muted-foreground text-sm max-w-md text-center mt-1">
                  No trades or waiver moves found for this team across any season.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Trades */}
              {history.trades.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <ArrowRightLeft className="w-4 h-4 text-primary" />
                      Trades ({history.trades.length})
                    </CardTitle>
                    <CardDescription>All trades this team has been involved in</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {history.trades.map((trade: any) => (
                      <div key={trade.id} className="p-4 rounded-lg border bg-card">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="w-3.5 h-3.5" />
                            {trade.date}
                            <span className="text-muted-foreground/40">|</span>
                            Week {trade.week}
                            <span className="text-muted-foreground/40">|</span>
                            <Badge variant="outline" className="text-xs">{trade.season}</Badge>
                          </div>
                          <Badge variant="secondary" className="capitalize text-xs">{trade.status}</Badge>
                        </div>
                        {trade.addedPlayers?.filter((ap: any) => ap.player).length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                            {trade.addedPlayers.filter((ap: any) => ap.player).map((ap: any, idx: number) => (
                              <div key={idx} className="flex items-center gap-3 p-2.5 rounded-md bg-muted/50 border">
                                <PositionBadge position={ap.player.position} />
                                <div className="min-w-0">
                                  <p className="font-medium text-sm truncate">{ap.player.fullName}</p>
                                  <p className="text-xs text-muted-foreground">{ap.player.team}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Waivers */}
              {history.waivers.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Users className="w-4 h-4 text-primary" />
                      Waiver / FA Moves ({history.waivers.length})
                    </CardTitle>
                    <CardDescription>Adds and drops across all seasons</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-24">Date</TableHead>
                          <TableHead className="w-16">Type</TableHead>
                          <TableHead>Player</TableHead>
                          <TableHead className="text-right">Pos</TableHead>
                          <TableHead className="text-right">Season</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {history.waivers.map((w: any) => (
                          <TableRow key={w.id}>
                            <TableCell className="text-sm text-muted-foreground">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5" />
                                {w.date}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={w.type === "add" ? "default" : "destructive"} className="text-xs gap-1">
                                {w.type === "add" ? <Plus className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                                {w.type === "add" ? "ADD" : "DROP"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{w.player?.fullName || w.playerName || "Unknown"}</div>
                            </TableCell>
                            <TableCell className="text-right">
                              {w.player?.position && <PositionBadge position={w.player.position} />}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant="outline" className="text-xs">{w.season}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
