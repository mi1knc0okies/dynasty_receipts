# Dynasty Fantasy Football Tools — Project Overview

## Purpose
A React Router 7 web application that aggregates and visualizes dynasty fantasy football league data from the [Sleeper API](https://docs.sleeper.com/), scrapes [KeepTradeCut](https://keeptradecut.com/dynasty-rankings) for player values, and tracks historical transactions across multiple league seasons.

Built to track trades, waivers, drafts, rosters, and player values for the user's 14-team dynasty league **"Die Nasty"**.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Router 7 (with SSR via Vite) |
| Runtime | Bun |
| UI | shadcn/ui components + Tailwind CSS |
| Database | PostgreSQL (via Doppler) |
| ORM | Drizzle ORM (`drizzle-orm/node-postgres`) |
| API Client | Native `fetch` (Bun) |
| Scraper | Cheerio (parses KTC embedded JSON from HTML) |

---

## Project Structure

```
dynasty_tools/
├── app/
│   ├── components/
│   │   ├── ui/              # shadcn components (button, table, card, etc.)
│   │   └── position-badge.tsx  # QB/RB/WR/TE color-coded badges
│   ├── .server/            # ⭐ Server-only code (React Router convention)
│   │   ├── lib/
│   │   │   ├── db.ts        # PostgreSQL connection via Drizzle
│   │   │   ├── sleeper.ts    # Sleeper API client + types
│   │   │   ├── ktc-scraper.ts # KeepTradecut scraper
│   │   │   ├── sync.ts       # Sync engine (leagues → DB)
│   │   │   ├── data.ts       # Data helpers (KTC value calc, roster queries, transactions)
│   │   │   └── migrate.ts    # DB migration runner (creates tables manually)
│   │   └── schema/
│   │       └── index.ts      # Drizzle schema (8 tables)
│   ├── routes/              # ⭐ React Router 7 routes
│   │   ├── home.tsx          # Dashboard: standings (sortable), recent trades, sync buttons
│   │   ├── roster.tsx        # Roster detail with KTC values + history tab
│   │   ├── trades.tsx        # All trades with teams involved, players received/given up
│   │   ├── waivers.tsx       # Waiver/FA moves with team filter chips
│   │   ├── drafts.tsx        # Draft history with round tabs
│   │   ├── players.tsx       # Free agent KTC rankings (unrostered players)
│   │   ├── api.sync.tsx      # POST endpoint: sync league data
│   │   └── api.sync-ktc.tsx  # POST endpoint: scrape KTC rankings
│   ├── routes.ts             # Route definitions
│   ├── root.tsx              # Root layout + navigation
│   └── app.css               # Tailwind + shadcn theme vars
├── scripts/
│   ├── sync-league.ts        # CLI: sync single league
│   ├── sync-all.ts           # CLI: sync both current + previous league
│   ├── sync-ktc.ts           # CLI: scrape KTC rankings
│   └── clear-transactions.ts # CLI: wipe trades/waivers tables
├── drizzle/                   # Generated migration SQL
├── drizzle.config.ts          # Drizzle Kit config (PostgreSQL)
├── vite.config.ts            # Vite: host 0.0.0.0 for remote access
└── bun.lock / package.json    # Bun dependencies
```

---

## Database Schema (PostgreSQL)

**Credentials via Doppler**: `DATABASE_PUBLIC_URL` env var

### Tables

| Table | Purpose |
|-------|---------|
| `leagues` | League info (id, name, season, status, roster positions, settings) |
| `users` | Sleeper users/managers (id, username, display_name, avatar) |
| `rosters` | Team rosters per league (players[], starters[], settings JSON) |
| `players` | NFL player database from Sleeper (name, team, position, etc.) |
| `trades` | Trade transactions (adds, drops, draft_picks, roster_ids, timestamp) |
| `waivers` | Waiver/FA moves (add/drop type, bid, roster_id, timestamp) |
| `drafts` | League drafts (season, status, type) |
| `draft_picks` | Individual draft picks (round, overall_pick, player_id, roster_id) |
| `ktc_rankings` | KeepTradeCut values (player_name, rank, value, tier, superflex flag) |

**Key design decisions**:
- `players` only stores rostered players (fetched on sync), not the full 5000+ player DB
- `ktc_rankings` stores both standard (`superflex=0`) and superflex (`superflex=1`) values
- `trades` and `waivers` track `leagueId` so cross-season history is queryable

---

## External APIs

### Sleeper API (`app/.server/lib/sleeper.ts`)

Endpoints used:
- `GET /league/{id}` — league metadata
- `GET /league/{id}/users` — team owners
- `GET /league/{id}/rosters` — current rosters with players[]
- `GET /league/{id}/transactions/{week}` — ⚠️ **one week per request**
- `GET /league/{id}/drafts` — draft IDs
- `GET /draft/{id}/picks` — draft pick results
- `GET /players/nfl` — full player database (~5000 players)

### KeepTradecut Scraper (`app/.server/lib/ktc-scraper.ts`)

- Fetches `keeptradecut.com/dynasty-rankings` (and `?format=superflex`)
- KTC embeds player data as `var playersArray = [{...}]` in `<script>` tags
- Extracts the JSON array, parses into 500 players per format
- Stores `rank`, `value`, `tier`, `positionRank`, `sfRank`

---

## Sync Process

### Manual Sync Commands

```bash
# Sync current league + previous league
bun scripts/sync-all.ts

# Sync just current league
bun scripts/sync-league.ts

# Sync KTC rankings
bun scripts/sync-ktc.ts

# Or via Doppler (production DB)
doppler run -- bun scripts/sync-all.ts
doppler run -- bun scripts/sync-ktc.ts
```

### What Each Sync Does

**League Sync** (`sync.ts` → `syncLeague()`):
1. Fetch league metadata → `leagues` table
2. Fetch users → `users` table
3. Fetch rosters → `rosters` table
4. Loop weeks 0-18 → fetch transactions individually → store trades + waivers
5. Fetch full player DB → store only rostered players in `players` table
6. Fetch drafts + picks → `drafts` + `draft_picks` tables
7. Recursively syncs previous league (if `latest_league_id` in metadata)

**KTC Sync** (`sync-ktc.ts`):
1. Scrape `/dynasty-rankings` (standard) and `?format=superflex`
2. Clear old rankings, insert new ones
3. 500 standard + 500 superflex entries

---

## Routes & Features

| Route | Description |
|-------|-------------|
| `/` | **Dashboard**: Standings table (sortable by KTC value, wins, PF, PA, diff). KTC bar per team. Recent trades preview. Sync buttons. |
| `/trades` | **Trade History**: All trades with teams involved, players received/given up (with direction → toTeam / fromTeam), draft picks. Season badge. |
| `/waivers` | **Waiver/FA Moves**: Filter by team via clickable chips. Shows add/drop badges. Player + team name. |
| `/drafts` | **Draft History**: Round tabs. Pick #, round, player name, position badge. Supports multiple draft years. |
| `/roster/:teamId` | **Roster Detail**: Starters/Bench/Reserve in tabs. KTC rank, value, tier per player. Total KTC value card. **History tab**: trades + waivers across ALL seasons for this owner. |
| `/players` | **Free Agents**: Unrostered players from KTC. Search + position filter. Rank, value, tier. |

### Cross-Season History
The `getRosterTransactionHistory()` function queries transactions across ALL leagues in the DB by `owner_id`, then joins `users` to get team names. This means roster page History shows moves from 2025 season even when viewing the 2026 league.

---

## Key Implementation Details

### KTC Value Calculation
All roster KTC values are calculated using **superflex** rankings:
```typescript
// data.ts: calcRosterKtcValue()
// Looks up ktc_rankings WHERE superflex = 1
// Fuzzy matches by player name
// Sums all player values
```

### Transaction Data Flow
Sleeper API returns transactions per week. Critical fix: must fetch **one week at a time**:
```typescript
// sleeper.ts: getLeagueTransactions()
for (const week of [0,1,2,...,18]) {
  fetch(`/transactions/${week}`); // NOT /transactions/1,2,3...
  // merges + deduplicates by transaction_id
}
```

### Roster → User Mapping
Transactions store `roster_id`, not `user_id`. The `getRosterIdToUserMap()` helper builds a lookup:
```typescript
// roster_id → { username, displayName }
// Built from rosters table joined to users table
```

### Position Badge Colors
```
QB = red    | RB = emerald
WR = blue   | TE = purple
K = amber   | DEF = slate
```

---

## Current League

- **Current**: `1312487502052888576` — "Die Nasty" (2026 season)
- **Previous**: `1199123493216587776` — "Die Nasty" (2025 season)
- Data synced in DB: 14 teams, ~295 players (2026), ~309 players (2025), 308 draft picks (2025)

---

## How to Run

```bash
# Dev server (binds 0.0.0.0:5173)
doppler run -- bun run dev

# Build + preview
doppler run -- bun run build
doppler run -- bun run start

# Access locally via SSH tunnel
ssh -L 5173:localhost:5173 user@remote-server
# open http://localhost:5173
```

---

## Known Issues / TODO

1. **TypeScript**: Some `any` types in data layer (transaction parsing). Could tighten with zod schemas.
2. **KTC Matching**: Fuzzy name matching (string includes). Breaks on name variations. Could use Sleeper player IDs if KTC exposed them.
3. **Trade Visualization**: No "trade partner" direction — just lists all involved teams. Could show Side A vs Side B.
4. **Real-time Updates**: Manual sync only. Could add cron or background job.
5. **Player Search**: `/players` queries DB, not Sleeper's full player DB. Search only works for players with KTC rankings.
6. **Standings Sorting**: Client-side only. Resets on page refresh.

---

## Adding Features

To add a new feature:
1. Add schema in `app/.server/schema/index.ts`
2. Update `migrate.ts` to create the table
3. Add API helper in `sleeper.ts` (if needed)
4. Add sync logic in `sync.ts`
5. Add data helper in `data.ts`
6. Create route in `app/routes/`
7. Register in `app/routes.ts`

All server-side code **must** stay in `.server/` folders per React Router 7 conventions.
