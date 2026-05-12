import { db } from "./db";
import { leagues, rosters, trades, players, ktcRankings, users, drafts, draftPicks, waivers, appSettings } from "../schema";
import { eq, desc, inArray, asc, and } from "drizzle-orm";

// ─── App Settings ────────────────────────────────────────────────

export async function getAppSetting(key: string): Promise<string | null> {
  try {
    const result = await db.select({ value: appSettings.value }).from(appSettings).where(eq(appSettings.key, key));
    return result[0]?.value ?? null;
  } catch {
    return null;
  }
}

export async function setAppSetting(key: string, value: string): Promise<void> {
  await db.insert(appSettings).values({ key, value }).onConflictDoUpdate({
    target: appSettings.key,
    set: { value, updatedAt: new Date() },
  });
}

// Stored as JSON array under "league_ids". Falls back to legacy "league_id" on first call.
export async function getLeagueIds(): Promise<string[]> {
  const val = await getAppSetting("league_ids");
  if (val !== null) {
    try { return JSON.parse(val); } catch { return []; }
  }
  const single = await getAppSetting("league_id");
  if (single) {
    await setAppSetting("league_ids", JSON.stringify([single]));
    return [single];
  }
  return [];
}

export async function addLeagueId(id: string): Promise<void> {
  const existing = await getLeagueIds();
  if (!existing.includes(id)) {
    await setAppSetting("league_ids", JSON.stringify([...existing, id]));
  }
}

export async function removeLeagueId(id: string): Promise<void> {
  const existing = await getLeagueIds();
  await setAppSetting("league_ids", JSON.stringify(existing.filter((l: string) => l !== id)));
}

// ─── Helpers ─────────────────────────────────────────────────────

function findSuperflexRanking(rankings: any[], playerName: string) {
  return rankings.find((r: any) =>
    r.superflex === 1 && (
      r.playerName?.toLowerCase().includes(playerName?.toLowerCase() || "") ||
      playerName?.toLowerCase().includes(r.playerName?.toLowerCase() || "")
    )
  );
}

function calcRosterKtcValue(rosterPlayers: any[], sfRankings: any[]) {
  return rosterPlayers.reduce((sum: number, p: any) => {
    const rank = findSuperflexRanking(sfRankings, p.fullName);
    return sum + (rank?.value || 0);
  }, 0);
}

// Keyed by "${leagueId}:${rosterId}" to avoid collisions when roster IDs repeat across seasons.
async function getRosterIdToUserMap(leagueIds: string[]) {
  const rosterRecs = await db.select({
    rosterId: rosters.rosterId,
    ownerId: rosters.ownerId,
    leagueId: rosters.leagueId,
  }).from(rosters).where(inArray(rosters.leagueId, leagueIds));

  const allUsers = await db.select().from(users);
  const map: Record<string, { username: string; displayName: string | null }> = {};
  for (const r of rosterRecs) {
    const user = allUsers.find((u: any) => u.id === r.ownerId);
    if (user) {
      map[`${r.leagueId}:${r.rosterId}`] = user;
    }
  }
  return map;
}

// ─── League + KTC ────────────────────────────────────────────────

export async function getLeagueWithData(leagueId: string) {
  const league = (await db.select().from(leagues).where(eq(leagues.id, leagueId)))[0];
  if (!league) return null;

  const leagueRosters = await db.select({
    id: rosters.id, rosterId: rosters.rosterId, ownerId: rosters.ownerId,
    players: rosters.players, starters: rosters.starters, settings: rosters.settings,
  }).from(rosters).where(eq(rosters.leagueId, leagueId));

  const leagueUsers = await db.select().from(users);
  const sfRankings = await db.select().from(ktcRankings).where(eq(ktcRankings.superflex, 1));

  const rostersWithUsers = await Promise.all(
    leagueRosters.map(async (r: any) => {
      const user = leagueUsers.find((u: any) => u.id === r.ownerId);
      const playerIds = (r.players as string[]) || [];
      const rosterPlayers = playerIds.length > 0
        ? await db.select({ fullName: players.fullName, position: players.position }).from(players).where(inArray(players.id, playerIds))
        : [];
      const ktcValue = calcRosterKtcValue(rosterPlayers, sfRankings);
      return { ...r, user: user || null, ktcValue };
    })
  );

  return { league, rosters: rostersWithUsers, users: leagueUsers };
}

// ─── Roster Detail (Superflex KTC) ───────────────────────────────

export async function getRosterWithPlayers(rosterId: number, leagueId: string) {
  const roster = (await db.select().from(rosters)
    .where(and(eq(rosters.rosterId, rosterId), eq(rosters.leagueId, leagueId))))[0]
    ?? (await db.select().from(rosters).where(eq(rosters.rosterId, rosterId)))[0];
  if (!roster) return null;

  const playerIds = (roster.players as string[]) || [];
  const rosterPlayers = playerIds.length > 0
    ? await db.select().from(players).where(inArray(players.id, playerIds))
    : [];
  const sfRankings = await db.select().from(ktcRankings).where(eq(ktcRankings.superflex, 1));

  const playersWithValues = rosterPlayers.map((p: any) => {
    const rank = findSuperflexRanking(sfRankings, p.fullName);
    return { ...p, ktcRank: rank?.rank || null, ktcValue: rank?.value || null, ktcTier: rank?.tier || null };
  });

  const user = roster.ownerId ? (await db.select().from(users).where(eq(users.id, roster.ownerId)))[0] : null;
  return { ...roster, players: playersWithValues, user };
}

// ─── Transaction History (cross-league with team names) ──────────

export async function getRosterTransactionHistory(rosterId: number) {
  // Find all (leagueId, rosterId) pairs belonging to this owner
  const seedRoster = (await db.select({ ownerId: rosters.ownerId })
    .from(rosters).where(eq(rosters.rosterId, rosterId)))[0];
  if (!seedRoster?.ownerId) return { trades: [], waivers: [] };

  const ownerRosters = await db.select({ rosterId: rosters.rosterId, leagueId: rosters.leagueId })
    .from(rosters).where(eq(rosters.ownerId, seedRoster.ownerId));

  // Set of "leagueId:rosterId" strings for fast membership check
  const ownerRosterSet = new Set(ownerRosters.map((r: any) => `${r.leagueId}:${r.rosterId}`));

  const leagueIds = (await db.select({ id: leagues.id }).from(leagues)).map((l: any) => l.id);
  const allPlayers = await db.select().from(players);
  const allLeagues = await db.select().from(leagues);
  const rosterToUser = await getRosterIdToUserMap(leagueIds);

  // Trades
  const allTrades = await db.select().from(trades)
    .where(inArray(trades.leagueId, leagueIds))
    .orderBy(desc(trades.timestamp));

  const rosterTrades = allTrades
    .filter((t: any) => {
      const rIds = (t.rosterIds as number[]) || [];
      return rIds.some((id: number) => ownerRosterSet.has(`${t.leagueId}:${id}`));
    })
    .map((t: any) => {
      const adds = t.adds as Record<string, string> || {};
      const rIds = (t.rosterIds as number[]) || [];
      const involvedTeams = rIds.map((rid: number) => {
        const u = rosterToUser[`${t.leagueId}:${rid}`];
        return u ? (u.displayName || u.username) : `Team ${rid}`;
      }).filter(Boolean);
      const league = allLeagues.find((l: any) => l.id === t.leagueId);
      return {
        ...t,
        leagueName: league?.name || "Unknown",
        season: league?.season || "",
        involvedTeams,
        addedPlayers: Object.entries(adds).map(([playerId, rId]) => ({
          player: allPlayers.find((p: any) => p.id === playerId),
          rosterId: Number(rId),
          teamName: rosterToUser[`${t.leagueId}:${Number(rId)}`]?.displayName
            || rosterToUser[`${t.leagueId}:${Number(rId)}`]?.username
            || `Team ${rId}`,
        })),
        date: t.timestamp ? new Date(t.timestamp).toLocaleDateString() : "Unknown",
      };
    });

  // Waivers — build per-league roster sets
  const ownerRostersByLeague = new Map<string, Set<number>>();
  for (const r of ownerRosters) {
    if (!ownerRostersByLeague.has(r.leagueId)) ownerRostersByLeague.set(r.leagueId, new Set());
    ownerRostersByLeague.get(r.leagueId)!.add(r.rosterId);
  }

  const allWaivers = await db.select().from(waivers)
    .where(inArray(waivers.leagueId, leagueIds))
    .orderBy(desc(waivers.timestamp));

  const rosterWaivers = allWaivers
    .filter((w: any) => ownerRostersByLeague.get(w.leagueId)?.has(w.rosterId))
    .map((w: any) => {
      const player = allPlayers.find((p: any) => p.id === w.playerId);
      const league = allLeagues.find((l: any) => l.id === w.leagueId);
      const user = rosterToUser[`${w.leagueId}:${w.rosterId}`];
      return {
        ...w,
        leagueName: league?.name || "Unknown",
        season: league?.season || "",
        teamName: user ? (user.displayName || user.username) : `Team ${w.rosterId}`,
        player: player || { fullName: w.playerName || "Unknown", position: w.playerPosition || "?" },
        date: w.timestamp ? new Date(w.timestamp).toLocaleDateString() : "Unknown",
      };
    });

  return { trades: rosterTrades, waivers: rosterWaivers };
}

// ─── League Trade Formatting with team names ─────────────────────

export async function getFormattedTrades(leagueId?: string) {
  const allLeagues = await db.select().from(leagues);
  const targetLeagueIds = leagueId ? [leagueId] : allLeagues.map((l: any) => l.id);

  const leagueTrades = targetLeagueIds.length > 0
    ? await db.select().from(trades).where(inArray(trades.leagueId, targetLeagueIds)).orderBy(desc(trades.timestamp))
    : [];

  const allPlayers = await db.select().from(players);
  const rosterToUser = await getRosterIdToUserMap(targetLeagueIds);

  return leagueTrades.map((t: any) => {
    const league = allLeagues.find((l: any) => l.id === t.leagueId);
    const adds = t.adds as Record<string, string> || {};
    const drops = t.drops as Record<string, string> || {};
    const rawPicks = t.draftPicks as any[] || [];
    const rIds = (t.rosterIds as number[]) || [];

    const involvedTeams = [...new Set(
      rIds.map((rid: number) => {
        const user = rosterToUser[`${t.leagueId}:${rid}`];
        return { name: (user?.displayName || user?.username || `Team ${rid}`), rosterId: rid };
      })
    )];

    const addedPlayers = Object.entries(adds).map(([playerId, rId]) => {
      const user = rosterToUser[`${t.leagueId}:${Number(rId)}`];
      return {
        player: allPlayers.find((p: any) => p.id === playerId),
        rosterId: Number(rId),
        toTeamName: user?.displayName || user?.username || `Team ${rId}`,
      };
    });

    const droppedPlayers = Object.entries(drops).map(([playerId, rId]) => {
      const user = rosterToUser[`${t.leagueId}:${Number(rId)}`];
      return {
        player: allPlayers.find((p: any) => p.id === playerId),
        rosterId: Number(rId),
        fromTeamName: user?.displayName || user?.username || `Team ${rId}`,
      };
    });

    const draftPicks = rawPicks.map((pick: any) => {
      const toUser = pick.owner_id != null ? rosterToUser[`${t.leagueId}:${pick.owner_id}`] : null;
      const fromUser = pick.previous_owner_id != null ? rosterToUser[`${t.leagueId}:${pick.previous_owner_id}`] : null;
      return {
        ...pick,
        toTeamName: toUser ? (toUser.displayName || toUser.username) : pick.owner_id ? `Team ${pick.owner_id}` : null,
        fromTeamName: fromUser ? (fromUser.displayName || fromUser.username) : pick.previous_owner_id ? `Team ${pick.previous_owner_id}` : null,
      };
    });

    return {
      ...t,
      season: league?.season || "",
      involvedTeams,
      addedPlayers,
      droppedPlayers,
      draftPicks,
      date: t.timestamp ? new Date(t.timestamp).toLocaleDateString() : "Unknown",
    };
  });
}

// ─── League Waiver Formatting with team names ────────────────────

export async function getFormattedWaivers(leagueId?: string) {
  const allLeagues = await db.select().from(leagues);
  const targetLeagueIds = leagueId ? [leagueId] : allLeagues.map((l: any) => l.id);

  const allWaivers = targetLeagueIds.length > 0
    ? await db.select().from(waivers).where(inArray(waivers.leagueId, targetLeagueIds)).orderBy(desc(waivers.timestamp))
    : [];

  const allPlayers = await db.select().from(players);
  const rosterToUser = await getRosterIdToUserMap(targetLeagueIds);

  return allWaivers.map((w: any) => {
    const league = allLeagues.find((l: any) => l.id === w.leagueId);
    const player = allPlayers.find((p: any) => p.id === w.playerId);
    const user = rosterToUser[`${w.leagueId}:${w.rosterId}`];
    return {
      ...w,
      season: league?.season || "",
      player: player || { fullName: w.playerName || "Unknown", position: w.playerPosition || "?" },
      teamName: user ? (user.displayName || user.username) : `Team ${w.rosterId}`,
      date: w.timestamp ? new Date(w.timestamp).toLocaleDateString() : "Unknown",
    };
  });
}

// ─── Drafts & free agents ────────────────────────────────────────

export async function getFreeAgentRankings(leagueId: string) {
  const leagueRosters = await db.select({ players: rosters.players }).from(rosters).where(eq(rosters.leagueId, leagueId));
  const rosteredIds = [...new Set(leagueRosters.flatMap((r: any) => (r.players as string[]) || []))];

  // Resolve IDs → full names for name-based KTC matching
  const rosteredNames = new Set<string>();
  if (rosteredIds.length > 0) {
    const rostered = await db.select({ fullName: players.fullName }).from(players).where(inArray(players.id, rosteredIds));
    for (const p of rostered) if (p.fullName) rosteredNames.add(p.fullName);
  }

  const sfRankings = await db.select().from(ktcRankings).where(eq(ktcRankings.superflex, 1)).orderBy(ktcRankings.rank);
  return sfRankings.filter((r: any) => !rosteredNames.has(r.playerName));
}

export async function getLeagueDrafts(leagueId?: string) {
  if (leagueId) {
    return db.select().from(drafts).where(eq(drafts.leagueId, leagueId)).orderBy(desc(drafts.season));
  }
  return db.select().from(drafts).orderBy(desc(drafts.season));
}

export async function getPlayerWithTransactions(playerId: string) {
  const allLeagues = await db.select().from(leagues);
  const leagueIds = allLeagues.map((l: any) => l.id);

  const player = (await db.select().from(players).where(eq(players.id, playerId)))[0] ?? null;

  const rosterToUser = await getRosterIdToUserMap(leagueIds);

  const allTrades = await db.select().from(trades)
    .where(inArray(trades.leagueId, leagueIds))
    .orderBy(desc(trades.timestamp));

  const playerTrades = allTrades
    .filter((t: any) => {
      const adds = (t.adds as Record<string, string>) || {};
      const drops = (t.drops as Record<string, string>) || {};
      return playerId in adds || playerId in drops;
    })
    .map((t: any) => {
      const league = allLeagues.find((l: any) => l.id === t.leagueId);
      const adds = (t.adds as Record<string, string>) || {};
      const drops = (t.drops as Record<string, string>) || {};
      const rIds = (t.rosterIds as number[]) || [];

      const involvedTeams = rIds.map((rid: number) => {
        const user = rosterToUser[`${t.leagueId}:${rid}`];
        return user?.displayName || user?.username || `Team ${rid}`;
      });

      const toRosterId = adds[playerId] ? Number(adds[playerId]) : null;
      const fromRosterId = drops[playerId] ? Number(drops[playerId]) : null;
      const toUser = toRosterId ? rosterToUser[`${t.leagueId}:${toRosterId}`] : null;
      const fromUser = fromRosterId ? rosterToUser[`${t.leagueId}:${fromRosterId}`] : null;

      return {
        ...t,
        kind: "trade" as const,
        season: league?.season || "",
        involvedTeams,
        toTeamName: toUser ? (toUser.displayName || toUser.username) : toRosterId ? `Team ${toRosterId}` : null,
        fromTeamName: fromUser ? (fromUser.displayName || fromUser.username) : fromRosterId ? `Team ${fromRosterId}` : null,
        date: t.timestamp ? new Date(t.timestamp).toLocaleDateString() : "Unknown",
      };
    });

  const playerWaivers = await db.select().from(waivers)
    .where(eq(waivers.playerId, playerId))
    .orderBy(desc(waivers.timestamp));

  const formattedWaivers = playerWaivers.map((w: any) => {
    const league = allLeagues.find((l: any) => l.id === w.leagueId);
    const user = rosterToUser[`${w.leagueId}:${w.rosterId}`];
    return {
      ...w,
      kind: "waiver" as const,
      season: league?.season || "",
      teamName: user ? (user.displayName || user.username) : `Team ${w.rosterId}`,
      date: w.timestamp ? new Date(w.timestamp).toLocaleDateString() : "Unknown",
    };
  });

  const timeline = [...playerTrades, ...formattedWaivers].sort((a: any, b: any) => {
    const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
    return bTime - aTime;
  });

  return { player, timeline };
}

export async function getDraftWithPicks(draftId: string) {
  const draft = (await db.select().from(drafts).where(eq(drafts.id, draftId)))[0];
  if (!draft) return null;
  const picks = await db.select().from(draftPicks).where(eq(draftPicks.draftId, draftId)).orderBy(asc(draftPicks.overallPick));
  const allPlayers = await db.select().from(players);
  const rosterToUser = await getRosterIdToUserMap([draft.leagueId]);
  const picksWithInfo = picks.map((p: any) => {
    const user = p.rosterId ? rosterToUser[`${draft.leagueId}:${p.rosterId}`] : null;
    return {
      ...p,
      player: p.playerId ? allPlayers.find((ap: any) => ap.id === p.playerId) : null,
      teamName: user ? (user.displayName || user.username) : p.rosterId ? `Team ${p.rosterId}` : null,
    };
  });
  return { draft, picks: picksWithInfo };
}
