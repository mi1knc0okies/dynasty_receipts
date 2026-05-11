import { Badge } from "./ui/badge";

const POSITION_COLORS: Record<string, string> = {
  QB: "bg-red-500/15 text-red-500 hover:bg-red-500/20 border-red-500/20",
  RB: "bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20",
  WR: "bg-blue-500/15 text-blue-500 hover:bg-blue-500/20 border-blue-500/20",
  TE: "bg-purple-500/15 text-purple-500 hover:bg-purple-500/20 border-purple-500/20",
  K: "bg-amber-500/15 text-amber-500 hover:bg-amber-500/20 border-amber-500/20",
  DEF: "bg-slate-500/15 text-slate-500 hover:bg-slate-500/20 border-slate-500/20",
};

export function PositionBadge({ position }: { position: string }) {
  const className = POSITION_COLORS[position] || "bg-zinc-500/15 text-zinc-500 border-zinc-500/20";
  return (
    <Badge variant="outline" className={`${className} font-bold text-xs px-2 py-0.5`}>
      {position}
    </Badge>
  );
}
