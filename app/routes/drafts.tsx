import type { Route } from "./+types/drafts";
import { getLeagueDrafts, getDraftWithPicks, getLeagueIds } from "../.server/lib/data";
import { useState } from "react";
import { Link } from "react-router";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { ClipboardList, ArrowLeft, Hash } from "lucide-react";

export async function loader() {
  const leagueIds = await getLeagueIds();
  if (!leagueIds.length) return { drafts: [], draftDetail: null, configured: false };
  const drafts = await getLeagueDrafts();
  const mostRecent = drafts[0];
  const draftDetail = mostRecent ? await getDraftWithPicks(mostRecent.id) : null;
  return { drafts, draftDetail, configured: true };
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Dynasty Tools - Draft History" },
    { name: "description", content: "View league draft history and picks" },
  ];
}

export default function Drafts({ loaderData }: Route.ComponentProps) {
  const { drafts, draftDetail } = loaderData;
  const [selectedRound, setSelectedRound] = useState<string>("all");

  if (drafts.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <ClipboardList className="w-7 h-7 text-primary" />
          Draft History
        </h1>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-muted w-16 h-16 flex items-center justify-center mb-4">
              <ClipboardList className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">No drafts found</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Data may still be syncing or no drafts are available.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const picks = draftDetail?.picks || [];
  const rounds = [...new Set(picks.map((p: any) => p.round))].sort((a: number, b: number) => a - b);
  const roundTabs = ["all", ...rounds.map(String)];
  const filteredPicks = selectedRound === "all"
    ? picks
    : picks.filter((p: any) => p.round === parseInt(selectedRound));

  return (
    <div className="space-y-6">
      <div>
        <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Standings
        </Link>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <ClipboardList className="w-7 h-7 text-primary" />
          Draft History
        </h1>
        <p className="text-muted-foreground mt-1">
          {drafts.length} draft{drafts.length !== 1 ? "s" : ""} recorded
        </p>
      </div>

      {/* Draft Selector */}
      <div className="flex gap-2">
        {drafts.map((d: any) => (
          <Badge
            key={d.id}
            variant={d.id === draftDetail?.draft.id ? "default" : "outline"}
            className="text-sm px-3 py-1"
          >
            {d.season} {d.type} Draft
          </Badge>
        ))}
      </div>

      {/* Draft Info */}
      {draftDetail && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Season</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{draftDetail.draft.season}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize">{draftDetail.draft.status}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Picks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{picks.length}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Round tabs + picks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hash className="w-5 h-5 text-primary" />
            Draft Picks
          </CardTitle>
          <CardDescription>
            {draftDetail?.draft.season} {draftDetail?.draft.type} Draft — {picks.length} picks across {rounds.length} rounds
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs value={selectedRound} onValueChange={setSelectedRound} className="w-full">
            <div className="px-6 pt-2">
              <TabsList className="mb-2 flex-wrap h-auto py-1">
                {roundTabs.map((r) => (
                  <TabsTrigger key={r} value={r} className="text-xs">
                    {r === "all" ? "All Rounds" : `Round ${r}`}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <TabsContent value={selectedRound} className="mt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Pick</TableHead>
                    <TableHead className="w-16">Round</TableHead>
                    <TableHead>Player</TableHead>
                    <TableHead className="text-right">Pos</TableHead>
                    <TableHead className="text-right">Team</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPicks.map((pick: any) => (
                    <TableRow key={pick.id}>
                      <TableCell className="font-mono font-medium text-muted-foreground">
                        #{pick.overallPick || pick.pickNumber}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs font-mono">
                          R{pick.round}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {pick.player?.fullName || pick.playerName || (
                          <span className="text-muted-foreground italic text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {pick.player?.position && (
                          <PositionBadge position={pick.player.position} />
                        )}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground tabular-nums">
                        {pick.player?.team || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredPicks.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No picks found for this round
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
