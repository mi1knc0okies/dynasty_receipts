import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("trades", "routes/trades.tsx"),
  route("waivers", "routes/waivers.tsx"),
  route("drafts", "routes/drafts.tsx"),
  route("roster/:teamId", "routes/roster.tsx"),
  route("players", "routes/players.tsx"),
  route("player/:id", "routes/player.$id.tsx"),
  route("api/sync", "routes/api.sync.tsx"),
  route("api/sync-ktc", "routes/api.sync-ktc.tsx"),
  route("settings", "routes/settings.tsx"),
] satisfies RouteConfig;
