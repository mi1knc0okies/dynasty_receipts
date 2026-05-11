import type { NewLeague, NewTrade, NewRoster, NewPlayer } from "../schema";

const SLEEPER_API_BASE = "https://api.sleeper.app/v1";

// Draft endpoints
export async function getDraft(draftId: string): Promise<any> {
  const response = await fetch(`${SLEEPER_API_BASE}/draft/${draftId}`);
  if (!response.ok) return null;
  return response.json();
}

export async function getDraftPicks(draftId: string): Promise<any[]> {
  const response = await fetch(`${SLEEPER_API_BASE}/draft/${draftId}/picks`);
  if (!response.ok) return [];
  return response.json();
}

export async function getLeagueDrafts(leagueId: string): Promise<any[]> {
  const response = await fetch(`${SLEEPER_API_BASE}/league/${leagueId}/drafts`);
  if (!response.ok) return [];
  return response.json();
}

// Metdata for drafts from prev league
export async function getUserDrafts(userId: string): Promise<any[]> {
  const response = await fetch(`${SLEEPER_API_BASE}/user/${userId}/drafts/nfl`);
  if (!response.ok) return [];
  return response.json();
}

// Raw Sleeper API types (snake_case)
export interface SleeperLeague {
  league_id: string;
  name: string;
  season: string;
  status: string;
  sport: string;
  total_rosters: number;
  roster_positions: string[];
  settings: any;
  scoring_settings: any;
  metadata: any;
}

export interface SleeperRoster {
  roster_id: number;
  league_id: string;
  owner_id: string;
  players: string[];
  starters: string[];
  reserve: string[];
  settings: any;
  metadata: any;
}

export interface SleeperUser {
  user_id: string;
  username: string;
  display_name: string;
  avatar: string;
  metadata: any;
}

export interface SleeperPlayer {
  player_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  team: string;
  position: string;
  number: number;
  age: number;
  height: string;
  weight: string;
  college: string;
  status: string;
  fantasy_positions: string[];
  [key: string]: any;
}

export interface SleeperTransaction {
  transaction_id: string;
  league_id: string;
  type: string;
  status: string;
  roster_ids: number[];
  consenter_ids: string[];
  adds: Record<string, string>;
  drops: Record<string, string>;
  draft_picks: any[];
  created: number;
  season: string;
  leg: number;
  [key: string]: any;
}

// Fetch league details
export async function getLeague(leagueId: string): Promise<SleeperLeague | null> {
  const response = await fetch(`${SLEEPER_API_BASE}/league/${leagueId}`);
  if (!response.ok) return null;
  return response.json();
}

// Fetch all users in a league
export async function getLeagueUsers(leagueId: string): Promise<SleeperUser[]> {
  const response = await fetch(`${SLEEPER_API_BASE}/league/${leagueId}/users`);
  if (!response.ok) return [];
  return response.json();
}

// Fetch all rosters in a league
export async function getLeagueRosters(leagueId: string): Promise<SleeperRoster[]> {
  const response = await fetch(`${SLEEPER_API_BASE}/league/${leagueId}/rosters`);
  if (!response.ok) return [];
  return response.json();
}

// Fetch transactions for weeks — fetches each week individually and merges
export async function getLeagueTransactions(leagueId: string, weeks: number[]): Promise<SleeperTransaction[]> {
  const all: SleeperTransaction[] = [];
  const seen = new Set<string>();

  for (const week of weeks) {
    const response = await fetch(`${SLEEPER_API_BASE}/league/${leagueId}/transactions/${week}`);
    if (!response.ok) continue;
    const weekTxs: SleeperTransaction[] = await response.json();
    for (const t of weekTxs) {
      if (!seen.has(t.transaction_id)) {
        seen.add(t.transaction_id);
        all.push(t);
      }
    }
  }

  return all;
}

// Fetch all players from Sleeper (cached player database)
export async function getAllPlayers(): Promise<Record<string, SleeperPlayer>> {
  const response = await fetch(`${SLEEPER_API_BASE}/players/nfl`);
  if (!response.ok) return {};
  return response.json();
}

// Fetch matchups for a week
export async function getMatchups(leagueId: string, week: number) {
  const response = await fetch(`${SLEEPER_API_BASE}/league/${leagueId}/matchups/${week}`);
  if (!response.ok) return [];
  return response.json();
}
