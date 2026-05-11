# Dynasty Fantasy Football Tools - Todo

## Project Setup (Completed ✅)
- [x] Initialize React Router 7 app with Bun
- [x] Install dependencies: cheerio, drizzle-orm, drizzle-kit, pg
- [x] Create project structure with `.server` folders per React Router 7 docs
- [x] Set up drizzle.config.ts for PostgreSQL

## Gather Requirements ✅

### Sleeper API Configuration
- [x] **Sleeper league ID provided**: `1312487502052888576`
  - League: Die Nasty (2026 season)
  - Previous league: `1199123493216587776` (2025 season)

### Database Selection
- [x] **PostgreSQL** (credentials via Doppler)

### Features Implemented ✅
- [x] Fetch league dynasty history from Sleeper API
- [x] Display past trades
- [x] Show current roster with KTC values
- [x] Scrape Keeptradecut.com dynasty rankings
- [x] Show player rankings and values (standard + superflex)
- [x] League standings on dashboard
- [x] Draft history (308 picks from 2025 season)
- [x] Waiver wire activity tracking
- [x] Free agent KTC rankings (unrostered players)

### Routes ✅
- [x] `/` - Dashboard: League overview, standings, latest trades
- [x] `/trades` - Trade history
- [x] `/drafts` - Draft history
- [x] `/waivers` - Waiver wire moves
- [x] `/roster/:teamId` - Individual roster with KTC values
- [x] `/players` - Free agent rankings from KTC

## Implementation Tasks

### Backend ✅
- [x] Set up database schema (leagues, rosters, trades, players, drafts, draft_picks, waivers, ktc_rankings)
- [x] Create Sleeper API client
- [x] Create Keeptradecut scraper (500 players per format)
- [x] Create database helpers
- [x] Create sync scripts
- [x] Create data service layer
- [x] Set up API routes (sync endpoints created)

### Frontend ✅
- [x] Create layout and navigation
- [x] Build dashboard/home page
- [x] Build trades history page
- [x] Build roster page with KTC values (Sleeper + KTC cross-referenced)
- [x] Build free agents page (unrostered KTC rankings)
- [x] Build draft history page
- [x] Build waiver wire page

### Database & Data ✅
- [x] PostgreSQL schema deployed
- [x] Current league synced: Die Nasty (2026) - 14 teams, 295 players
- [x] Previous league synced: Die Nasty (2025) - 14 teams, 308 players, 308-pick draft
- [x] KTC rankings synced: 500 standard + 500 superflex
- [x] KTC values linked to roster players for value analysis

## Current Status Summary

### ✅ What's Built
1. **Project Structure** - React Router 7 app with Bun, all server code in `.server` folders
2. **Database Schema** - PostgreSQL schema with Drizzle ORM (leagues, users, rosters, trades, players, ktc_rankings)
3. **API Integration** - Sleeper API client (league, users, rosters, trades, players)
4. **KTC Scraper** - Cheerio-based scraper for Keeptradecut dynasty rankings
5. **Sync Scripts** - Automated sync for league data and KTC rankings
6. **Frontend Pages** - Dashboard, Trades, Roster detail, Free Agents
7. **Build** - Production build succeeds

### 🔴 Current Blockers
- **PostgreSQL not installed** on this remote server - migrations can't run
- Need to either: install PostgreSQL locally, or point to a remote database

### 📝 Next Steps
1. Set up PostgreSQL database (install locally or provide remote connection)
2. Run migrations to create tables
3. Run initial data sync (Sleeper league + KTC rankings)
4. Test routes with real data
5. Polish UI and add more features

---

**Next Steps**: Review this todo, provide the missing information (league ID, database choice), and check off features/routes you want included.
