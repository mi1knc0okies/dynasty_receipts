import type { Route } from "./+types/waivers";
import { getFormattedWaivers, getLeagueIds } from "../.server/lib/data";
import { useState } from "react";
import { Link } from "react-router";
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
import { Users, Plus, Minus, Calendar, Search } from "lucide-react";

export async function loader() {
  const leagueIds = await getLeagueIds();
  if (!leagueIds.length) return { waivers: [], configured: false };
  const waivers = await getFormattedWaivers();
  return { waivers, configured: true };
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Dynasty Tools - Waiver Wire" },
    { name: "description", content: "Waiver wire and free agent moves" },
  ];
}

export default function Waivers({ loaderData }: Route.ComponentProps) {
  const { waivers } = loaderData;
  const [filter, setFilter] = useState<string>("all");
  const [searchTeam, setSearchTeam] = useState<string>("");

  const adds = waivers.filter((w: any) => w.type === "add");
  const drops = waivers.filter((w: any) => w.type === "drop");

  let filtered = filter === "all" ? waivers : filter === "add" ? adds : drops;
  if (searchTeam) {
    filtered = filtered.filter((w: any) => w.teamName?.toLowerCase().includes(searchTeam.toLowerCase()));
  }

  // Unique team names for quick filter
  const teamNames = [...new Set(waivers.map((w: any) => w.teamName))].filter(Boolean).sort();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold uppercase tracking-wide font-heading flex items-center gap-2">
          <Users className="w-7 h-7 text-primary" />
          Waiver Wire & Free Agents
        </h1>
        <p className="text-muted-foreground mt-1">
          {adds.length} adds, {drops.length} drops recorded
        </p>
      </div>

      {/* Team filter chips */}
      {teamNames.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <Badge
            variant={searchTeam === "" ? "default" : "outline"}
            className="cursor-pointer text-xs"
            onClick={() => setSearchTeam("")}
          >
            All Teams
          </Badge>
          {teamNames.map((name: string) => (
            <Badge
              key={name}
              variant={searchTeam === name ? "default" : "outline"}
              className="cursor-pointer text-xs"
              onClick={() => setSearchTeam(name === searchTeam ? "" : name)}
            >
              {name}
            </Badge>
          ))}
        </div>
      )}

      {waivers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-muted w-16 h-16 flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">No waiver activity</h3>
            <p className="text-muted-foreground text-sm max-w-md text-center mt-1">
              No waiver wire or free agent moves recorded.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>All waiver claims, free agent adds, and drops</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Tabs value={filter} onValueChange={setFilter}>
              <div className="px-6 pt-2">
                <TabsList className="mb-4">
                  <TabsTrigger value="all" className="text-xs">
                    All ({waivers.length})
                  </TabsTrigger>
                  <TabsTrigger value="add" className="text-xs">
                    <Plus className="w-3 h-3 mr-1" /> Adds ({adds.length})
                  </TabsTrigger>
                  <TabsTrigger value="drop" className="text-xs">
                    <Minus className="w-3 h-3 mr-1" /> Drops ({drops.length})
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value={filter} className="mt-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">Date</TableHead>
                      <TableHead className="w-14">Type</TableHead>
                      <TableHead>Player</TableHead>
                      <TableHead className="text-right">Pos</TableHead>
                      <TableHead>Team</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((w: any) => (
                      <TableRow key={w.id}>
                        <TableCell className="text-xs text-muted-foreground py-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Calendar className="w-3 h-3" />
                            {w.date}
                            {w.season && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0">{w.season}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-2">
                          <Badge
                            variant={w.type === "add" ? "default" : "destructive"}
                            className="text-[10px] gap-0.5 px-1.5 py-0"
                          >
                            {w.type === "add" ? <Plus className="w-2.5 h-2.5" /> : <Minus className="w-2.5 h-2.5" />}
                            {w.type === "add" ? "ADD" : "DROP"}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2">
                          <Link to={`/player/${w.playerId}`} className="font-medium text-sm hover:text-primary transition-colors">
                            {w.player?.fullName || w.playerName || "Unknown"}
                          </Link>
                        </TableCell>
                        <TableCell className="text-right py-2">
                          {w.player?.position && <PositionBadge position={w.player.position} />}
                        </TableCell>
                        <TableCell className="py-2">
                          <Badge variant="outline" className="text-xs font-normal">
                            {w.teamName}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {filtered.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No results for this filter.
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
