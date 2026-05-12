import { useState } from "react";
import type { Route } from "./+types/players";
import { getFreeAgentRankings, getLeagueIds } from "../.server/lib/data";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { PositionBadge } from "../components/position-badge";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Search, TrendingUp, Frown } from "lucide-react";

export async function loader() {
  const leagueIds = await getLeagueIds();
  const primaryId = leagueIds[0];
  if (!primaryId) return { rankings: [], configured: false };
  const rankings = await getFreeAgentRankings(primaryId);
  return { rankings, configured: true };
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Dynasty Tools - Free Agents" },
    { name: "description", content: "Best available free agents with KTC dynasty values" },
  ];
}

export default function Players({ loaderData }: Route.ComponentProps) {
  const { rankings } = loaderData;
  const [positionFilter, setPositionFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const positions = ["ALL", "QB", "RB", "WR", "TE"];

  const filtered = rankings
    .filter((r: any) => positionFilter === "ALL" || r.position === positionFilter)
    .filter((r: any) =>
      searchQuery === "" ||
      r.playerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.team?.toLowerCase().includes(searchQuery.toLowerCase())
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold uppercase tracking-wide font-heading flex items-center gap-2">
          <Search className="w-7 h-7 text-primary" />
          Free Agents
        </h1>
        <p className="text-muted-foreground mt-1">
          Unrostered players ranked by KeepTradeCut dynasty value
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search players..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={positionFilter} onValueChange={(v) => setPositionFilter(v || "ALL")}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Position" />
          </SelectTrigger>
          <SelectContent>
            {positions.map((pos) => (
              <SelectItem key={pos} value={pos}>{pos}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Rankings
              </CardTitle>
              <CardDescription>
                {filtered.length} players shown ({rankings.length} total unrostered)
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 text-right">Rank</TableHead>
                <TableHead>Player</TableHead>
                <TableHead className="text-right">Pos</TableHead>
                <TableHead className="text-right">Team</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead className="text-right">Tier</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((player: any) => (
                <TableRow
                  key={player.id}
                  className="cursor-pointer hover:bg-accent/30 transition-colors"
                >
                  <TableCell className="text-right font-mono">
                    {player.rank}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{player.playerName}</div>
                  </TableCell>
                  <TableCell className="text-right">
                    <PositionBadge position={player.position} />
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground tabular-nums">
                    {player.team || "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">
                    {(player.value ?? 0).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {player.tier != null && (
                      <Badge variant="outline" className="text-xs font-mono">
                        T{player.tier}
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Frown className="w-8 h-8 mb-2 opacity-50" />
              <p>No players match your filters</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
