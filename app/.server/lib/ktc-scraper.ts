import * as cheerio from "cheerio";

const KTC_URL = "https://keeptradecut.com/dynasty-rankings";

export interface KtcPlayer {
  rank: number;
  playerName: string;
  position: string;
  team: string;
  value: number;
  tier: number;
  positionRank: number;
  sfRank: number;
}

function extractPlayersArray(html: string): any[] {
  // Find the main player data: var playersArray = [{...}];
  // This is the primary rankings array in KTC's HTML
  const playersMatch = html.match(/var playersArray = (\[.*?\]);\s*$/ms);

  if (playersMatch) {
    try {
      const parsed = JSON.parse(playersMatch[1]);
      if (Array.isArray(parsed)) {
        console.log(`  Found main playersArray: ${parsed.length} players`);
        return parsed;
      }
    } catch {
      // Continue to fallback
    }
  }

  // Fallback: find any array containing player objects
  const $ = cheerio.load(html);
  const allPlayers: any[] = [];

  $('script').each((_, element) => {
    const content = $(element).html() || '';

    // Look for arrays that contain playerName
    if (content.includes('playerName')) {
      // Extract the array content between brackets after "var something = [...]"
      const arrayMatches = content.match(/var \w+ = (\[[\s\S]*?\]);/g);
      if (arrayMatches) {
        for (const arrayMatch of arrayMatches) {
          try {
            const jsonStr = arrayMatch.replace(/var \w+ = /, '').replace(/;$/, '');
            const parsed = JSON.parse(jsonStr);
            if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.playerName) {
              allPlayers.push(...parsed);
            }
          } catch {
            // Skip unparseable arrays
          }
        }
      }
    }
  });

  // Remove duplicates by playerID
  const seen = new Set();
  return allPlayers.filter(p => {
    if (!p?.playerID) return false;
    if (seen.has(p.playerID)) return false;
    seen.add(p.playerID);
    return true;
  });
}

function convertKtcToPlayer(
  raw: any,
  isSuperflex: boolean
): KtcPlayer {
  const values = isSuperflex
    ? (raw.superflexValues || raw.oneQBValues)
    : (raw.oneQBValues || raw.superflexValues);

  if (!values) {
    return {
      rank: 0,
      playerName: raw.playerName || 'Unknown',
      position: raw.position || '',
      team: raw.team || '',
      value: 0,
      tier: 0,
      positionRank: 0,
      sfRank: 0,
    };
  }

  const rank = values.rank || 0;
  const value = values.value || 0;
  const positionalRank = values.positionalRank || 0;
  const tier = values.overallTier || values.positionalTier || 0;

  return {
    rank,
    playerName: raw.playerName,
    position: raw.position,
    team: raw.team,
    value,
    tier,
    positionRank: positionalRank,
    sfRank: isSuperflex ? rank : 0,
  };
}

export async function scrapeKtcRankings(
  isSuperflex = false
): Promise<KtcPlayer[]> {
  const url = isSuperflex ? `${KTC_URL}?format=superflex` : KTC_URL;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch KTC: ${response.status}`);
    }

    const html = await response.text();
    const rawPlayers = extractPlayersArray(html);

    if (rawPlayers.length === 0) {
      console.warn("  No players found in KTC HTML");
      return [];
    }

    const converted = rawPlayers.map((p) => convertKtcToPlayer(p, isSuperflex));

    // Sort by rank
    converted.sort((a, b) => a.rank - b.rank);

    return converted;
  } catch (error) {
    console.error("Error scraping KTC:", error);
    return [];
  }
}

export async function scrapeAllKtcRankings(): Promise<{
  standard: KtcPlayer[];
  superflex: KtcPlayer[];
}> {
  const [standard, superflex] = await Promise.all([
    scrapeKtcRankings(false),
    scrapeKtcRankings(true),
  ]);

  return { standard, superflex };
}

export function convertToDbPlayers(
  players: KtcPlayer[],
  isSuperflex: boolean
): { playerName: string; position: string; team: string; rank: number; value: number; tier: number; positionRank: number; sfRank: number; superflex: number; }[] {
  return players.map((p) => ({
    playerName: p.playerName,
    position: p.position,
    team: p.team,
    rank: p.rank,
    value: p.value,
    tier: p.tier,
    positionRank: p.positionRank,
    sfRank: p.sfRank,
    superflex: isSuperflex ? 1 : 0,
  }));
}
