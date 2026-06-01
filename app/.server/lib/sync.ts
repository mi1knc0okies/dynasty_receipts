import { db } from "./db";
import { eq } from "drizzle-orm";
import { leagues, users, rosters, trades, players, drafts, draftPicks, waivers } from "../schema";
import {
  getLeague,
  getLeagueUsers,
  getLeagueRosters,
  getAllPlayers,
  getLeagueTransactions,
  getLeagueDrafts,
  getDraft,
  getDraftPicks,
} from "./sleeper";
import type { SleeperTransaction } from "./sleeper";

export type PreviousLeagueInfo = {
  leagueId: string | null;
  leagueName: string | null;
};

export async function getPreviousLeagueInfo(leagueId: string): Promise<PreviousLeagueInfo> {
  const league = await getLeague(leagueId);
  if (!league) return { leagueId: null, leagueName: null };
  
  // Sleeper stores previous league IDs in metadata or settings
  const prevLeagueId = league.metadata?.latest_league_id 
    || league.settings?.league_average_match 
    || league.settings?.prev_league_id;
    
  if (prevLeagueId && typeof prevLeagueId === "string") {
    const prevLeague = await getLeague(prevLeagueId);
    return { leagueId: prevLeagueId, leagueName: prevLeague?.name || null };
  }
  
  return { leagueId: null, leagueName: null };
}

export async function syncLeague(leagueId: string, syncAllHistory = true) {
  console.log(`🔄 Syncing league ${leagueId}...`);

  const league = await getLeague(leagueId);
  if (!league) throw new Error(`League ${leagueId} not found`);

  // Validate NFL
  if (league.sport && league.sport !== "nfl") {
    throw new Error(`This is a ${league.sport.toUpperCase()} league, not NFL Fantasy Football`);
  }
  const rosterPositions = league.roster_positions || [];
  const hasFootballPositions = rosterPositions.some((pos: string) =>
    ["QB", "RB", "WR", "TE", "FLEX", "SUPER_FLEX", "K", "DEF"].includes(pos)
  );
  if (!hasFootballPositions) {
    throw new Error("League roster positions don't match NFL fantasy format");
  }

  const now = new Date();
  await db.insert(leagues).values({
    id: league.league_id, name: league.name, season: league.season,
    status: league.status, totalRosters: league.total_rosters || 0,
    rosterPositions, settings: league.settings || {},
    scoringSettings: league.scoring_settings || {}, metadata: league.metadata || {},
    updatedAt: now,
  }).onConflictDoUpdate({
    target: leagues.id,
    set: { name: league.name, status: league.status, metadata: league.metadata || {}, updatedAt: now },
  });
  console.log(`✅ League: ${league.name}`);

  // Users
  const leagueUsers = await getLeagueUsers(leagueId);
  for (const u of leagueUsers) {
    const displayName = u.display_name || u.username || "Unknown";
    const username = u.username || displayName;
    await db.insert(users).values({ id: u.user_id, username, displayName, avatar: u.avatar, metadata: u.metadata || {} })
      .onConflictDoUpdate({ target: users.id, set: { username, displayName } });
  }
  console.log(`✅ Users: ${leagueUsers.length}`);

  // Rosters
  const leagueRosters = await getLeagueRosters(leagueId);
  for (const roster of leagueRosters) {
    const rosterValues = {
      rosterId: roster.roster_id, leagueId, ownerId: roster.owner_id,
      players: roster.players || [], starters: roster.starters || [],
      reserve: roster.reserve || [], settings: roster.settings || {}, metadata: roster.metadata || {},
    };
    await db.insert(rosters).values(rosterValues).onConflictDoUpdate({
      target: [rosters.leagueId, rosters.rosterId],
      set: { players: rosterValues.players, starters: rosterValues.starters, reserve: rosterValues.reserve, settings: rosterValues.settings, metadata: rosterValues.metadata },
    });
  }
  console.log(`✅ Rosters: ${leagueRosters.length}`);

  // Fetch full player map once — used by both transactions and rostered player sync
  const allPlayersMap = await getAllPlayers();

  // Transactions
  await syncTransactions(leagueId, league.season, allPlayersMap);

  // Rostered players
  await syncPlayers(leagueId, allPlayersMap);
  
  // Drafts
  await syncDrafts(leagueId);

  console.log(`🎉 League ${leagueId} synced successfully!`);
  
  // Sync previous league if requested
  if (syncAllHistory) {
    const prev = await getPreviousLeagueInfo(leagueId);
    if (prev.leagueId && prev.leagueId !== leagueId) {
      console.log(`\n📜 Found previous league: ${prev.leagueName} (${prev.leagueId})`);
      await syncLeague(prev.leagueId, false); // Don't recursively chain
    }
  }
}

async function syncTransactions(leagueId: string, leagueSeason?: string, allPlayersMap: Record<string, any> = {}) {
  try {
    const league = (await db.select({ season: leagues.season }).from(leagues).where(eq(leagues.id, leagueId)))[0];
    const season = leagueSeason || league?.season || "";

    // Sleeper sometimes uses week 0 for offseason; fetch 0-18 to catch everything
    const weeks = [0, ...Array.from({ length: 18 }, (_, i) => i + 1)];
    const transactions = await getLeagueTransactions(leagueId, weeks);
    console.log(`  Found ${transactions.length} total transactions across ${weeks.length} weeks`);

    let tradeCount = 0;
    let waiverCount = 0;

    for (const t of transactions) {
      if (t.type === "trade") {
        const tradeData: any = {
          id: t.transaction_id, leagueId, season,
          week: t.leg || 1, status: t.status || "", metadata: t || {},
        };
        if (t.created) {
          const ts = typeof t.created === "number" ? new Date(t.created) : new Date(t.created);
          if (!isNaN(ts.getTime())) tradeData.timestamp = ts;
        }
        if (t.roster_ids) tradeData.rosterIds = t.roster_ids;
        if (t.consenter_ids) tradeData.consenterIds = t.consenter_ids;
        if (t.adds) tradeData.adds = t.adds;
        if (t.drops) tradeData.drops = t.drops;
        if (t.draft_picks) tradeData.draftPicks = t.draft_picks;
        await db.insert(trades).values(tradeData).onConflictDoNothing();
        tradeCount++;
      } else if (["waiver", "free_agent", "commissioner"].includes(t.type)) {
        // Waiver or FA adds/drops
        const adds = t.adds || {};
        const drops = t.drops || {};
        
        const bid = t.type === "waiver" ? (t.settings?.waiver_bid ?? null) : null;

        for (const [playerId, rosterId] of Object.entries(adds)) {
          const p = allPlayersMap[playerId];
          const playerName = p?.full_name || (p ? `${p.first_name || ""} ${p.last_name || ""}`.trim() : null) || null;
          const playerPosition = p?.position || null;
          await db.insert(waivers).values({
            id: `${t.transaction_id}_${playerId}_add`,
            leagueId, season, week: t.leg || 1,
            type: "add", playerId, playerName, playerPosition, rosterId: Number(rosterId),
            bid, status: t.status || "", metadata: t || {},
            timestamp: t.created ? new Date(t.created) : undefined,
          }).onConflictDoUpdate({
            target: waivers.id,
            set: { playerName, playerPosition, bid },
          });
          waiverCount++;
        }

        for (const [playerId, rosterId] of Object.entries(drops)) {
          const p = allPlayersMap[playerId];
          const playerName = p?.full_name || (p ? `${p.first_name || ""} ${p.last_name || ""}`.trim() : null) || null;
          const playerPosition = p?.position || null;
          await db.insert(waivers).values({
            id: `${t.transaction_id}_${playerId}_drop`,
            leagueId, season, week: t.leg || 1,
            type: "drop", playerId, playerName, playerPosition, rosterId: Number(rosterId),
            bid, status: t.status || "", metadata: t || {},
            timestamp: t.created ? new Date(t.created) : undefined,
          }).onConflictDoUpdate({
            target: waivers.id,
            set: { playerName, playerPosition, bid },
          });
          waiverCount++;
        }
      }
    }

    console.log(`✅ Trades: ${tradeCount}, Waiver/FA moves: ${waiverCount}`);
  } catch (error) {
    console.error("Error syncing transactions:", error);
  }
}

async function syncPlayers(leagueId: string, allPlayers?: Record<string, any>) {
  console.log("🔄 Syncing rostered players...");
  try {
    const leagueRosters = await getLeagueRosters(leagueId);
    const rosteredPlayerIds = new Set<string>();
    for (const r of leagueRosters) {
      for (const pid of r.players || []) rosteredPlayerIds.add(pid);
    }

    if (!allPlayers) allPlayers = await getAllPlayers();
    let synced = 0;
    for (const id of rosteredPlayerIds) {
      const player = allPlayers[id];
      if (!player || (!player.first_name && !player.last_name)) continue;
      
      await db.insert(players).values({
        id, firstName: player.first_name || null, lastName: player.last_name || null,
        fullName: player.full_name || `${player.first_name || ""} ${player.last_name || ""}`.trim() || id,
        team: player.team || null, position: player.position || null,
        number: player.number || null, age: player.age || null,
        height: player.height || null, weight: player.weight || null,
        college: player.college || null, status: player.status || null,
        fantasyPositions: player.fantasy_positions || [], metadata: player || {},
      }).onConflictDoNothing();
      synced++;
    }
    console.log(`✅ Players synced: ${synced}`);
  } catch (error) {
    console.error("Error syncing players:", error);
  }
}

async function syncDrafts(leagueId: string) {
  console.log("🔄 Syncing drafts...");
  try {
    const leagueDrafts = await getLeagueDrafts(leagueId);
    console.log(`  Found ${leagueDrafts.length} drafts`);

    for (const d of leagueDrafts) {
      await db.insert(drafts).values({
        id: d.draft_id, leagueId, season: d.season,
        status: d.status, type: d.type || "snake",
        draftOrder: d.draft_order || [], metadata: d || {},
      }).onConflictDoNothing();

      // Get and store picks
      const picks = await getDraftPicks(d.draft_id);
      for (const pick of picks) {
        const pickValues = {
          draftId: d.draft_id,
          pickNumber: pick.pick_no || 0,
          round: pick.round || 0,
          overallPick: pick.pick_no,
          rosterId: pick.roster_id || null,
          playerId: pick.player_id || null,
          playerName: pick.metadata?.first_name
            ? `${pick.metadata.first_name} ${pick.metadata.last_name}`
            : pick.player_id,
          metadata: pick || {},
        };
        await db.insert(draftPicks).values(pickValues).onConflictDoUpdate({
          target: [draftPicks.draftId, draftPicks.pickNumber],
          set: { rosterId: pickValues.rosterId, playerId: pickValues.playerId, playerName: pickValues.playerName, metadata: pickValues.metadata },
        });
      }
      console.log(`  ✅ Draft ${d.season}: ${picks.length} picks`);
    }
  } catch (error) {
    console.error("Error syncing drafts:", error);
  }
}
