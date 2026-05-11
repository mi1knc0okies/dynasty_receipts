import { pgTable, text, integer, serial, json, timestamp } from "drizzle-orm/pg-core";

// Sleeper leagues table
export const leagues = pgTable("leagues", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  season: text("season"),
  status: text("status"),
  totalRosters: integer("total_rosters"),
  rosterPositions: json("roster_positions"),
  settings: json("settings"),
  scoringSettings: json("scoring_settings"),
  metadata: json("metadata"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

// Sleeper users/teams
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull(),
  displayName: text("display_name"),
  avatar: text("avatar"),
  metadata: json("metadata"),
});

// Rosters (team rosters in a league)
export const rosters = pgTable("rosters", {
  id: serial("id").primaryKey(),
  rosterId: integer("roster_id").notNull(),
  leagueId: text("league_id").notNull().references(() => leagues.id),
  ownerId: text("owner_id").references(() => users.id),
  players: json("players"), // array of player IDs
  starters: json("starters"), // array of player IDs
  reserve: json("reserve"), // injured/reserve players
  settings: json("settings"), // wins, losses, etc.
  metadata: json("metadata"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

// Trades history
export const trades = pgTable("trades", {
  id: text("id").primaryKey(),
  leagueId: text("league_id").notNull().references(() => leagues.id),
  season: text("season"),
  week: integer("week"),
  timestamp: timestamp("timestamp"),
  rosterIds: json("roster_ids"), // [from_roster, to_roster]
  consenterIds: json("consenter_ids"), // who consented
  adds: json("adds"), // players added per roster
  drops: json("drops"), // players dropped per roster
  draftPicks: json("draft_picks"), // picks traded
  status: text("status"), // pending, accepted, etc.
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Players from Sleeper
export const players = pgTable("players", {
  id: text("id").primaryKey(), // Sleeper player ID
  firstName: text("first_name"),
  lastName: text("last_name"),
  fullName: text("full_name"),
  team: text("team"),
  position: text("position"),
  number: integer("number"),
  age: integer("age"),
  height: text("height"),
  weight: text("weight"),
  college: text("college"),
  status: text("status"), // Active, Injured, etc.
  fantasyPositions: json("fantasy_positions"),
  metadata: json("metadata"),
  updatedAt: timestamp("updated_at"),
});

// Draft picks from drafts
export const drafts = pgTable("drafts", {
  id: text("id").primaryKey(),
  leagueId: text("league_id").notNull().references(() => leagues.id),
  season: text("season"),
  status: text("status"),
  type: text("type"), // rookie, veteran, etc.
  draftOrder: json("draft_order"),
  metadata: json("metadata"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const draftPicks = pgTable("draft_picks", {
  id: serial("id").primaryKey(),
  draftId: text("draft_id").notNull().references(() => drafts.id),
  pickNumber: integer("pick_number").notNull(),
  round: integer("round").notNull(),
  overallPick: integer("overall_pick"),
  rosterId: integer("roster_id"),
  playerId: text("player_id"),
  playerName: text("player_name"),
  timestamp: timestamp("timestamp"),
  metadata: json("metadata"),
});

// Waiver/Free Agent transactions
export const waivers = pgTable("waivers", {
  id: text("id").primaryKey(),
  leagueId: text("league_id").notNull().references(() => leagues.id),
  season: text("season"),
  week: integer("week"),
  timestamp: timestamp("timestamp"),
  rosterId: integer("roster_id"),
  type: text("type"), // add, drop, trade, etc.
  playerId: text("player_id"),
  playerName: text("player_name"),
  playerPosition: text("player_position"),
  bid: integer("bid"), // FAAB bid amount
  status: text("status"), // pending, accepted, etc.
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

// KTC Rankings
export const ktcRankings = pgTable("ktc_rankings", {
  id: serial("id").primaryKey(),
  playerName: text("player_name").notNull(),
  position: text("position").notNull(),
  team: text("team"),
  rank: integer("rank").notNull(),
  value: integer("value").notNull(),
  tier: integer("tier"),
  positionRank: integer("position_rank"),
  sfRank: integer("sf_rank"), // Superflex rank
  superflex: integer("superflex"), // 1 or 0
  scrapedAt: timestamp("scraped_at").defaultNow(),
});

// App configuration
export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Type exports
export type League = typeof leagues.$inferSelect;
export type NewLeague = typeof leagues.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Roster = typeof rosters.$inferSelect;
export type NewRoster = typeof rosters.$inferInsert;
export type Trade = typeof trades.$inferSelect;
export type NewTrade = typeof trades.$inferInsert;
export type Player = typeof players.$inferSelect;
export type NewPlayer = typeof players.$inferInsert;
export type Draft = typeof drafts.$inferSelect;
export type NewDraft = typeof drafts.$inferInsert;
export type DraftPick = typeof draftPicks.$inferSelect;
export type NewDraftPick = typeof draftPicks.$inferInsert;
export type Waiver = typeof waivers.$inferSelect;
export type NewWaiver = typeof waivers.$inferInsert;
export type KtcRanking = typeof ktcRankings.$inferSelect;
export type NewKtcRanking = typeof ktcRankings.$inferInsert;
