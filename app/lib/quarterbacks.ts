// Server-side data layer for NFL starting quarterbacks.
//
// Team metadata (ESPN id, abbreviation, name, conference) is effectively static —
// it changes only on a relocation/realignment — so it lives here as the source of
// truth and as a fallback. The one thing that actually changes week to week is the
// starter, so that's the only field we pull live from ESPN's public JSON APIs.

export type Quarterback = {
  id: string;
  espnId: string;
  team: string;
  teamName: string;
  player: string;
  conference: "AFC" | "NFC";
  espnPlayerId?: string;
};

// Fallback starters double as the default board if ESPN is unreachable.
export const QUARTERBACKS: Quarterback[] = [
  { id: "ari", espnId: "22", team: "ARI", teamName: "Arizona Cardinals", player: "Kyler Murray", conference: "NFC" },
  { id: "atl", espnId: "1", team: "ATL", teamName: "Atlanta Falcons", player: "Michael Penix Jr.", conference: "NFC" },
  { id: "bal", espnId: "33", team: "BAL", teamName: "Baltimore Ravens", player: "Lamar Jackson", conference: "AFC" },
  { id: "buf", espnId: "2", team: "BUF", teamName: "Buffalo Bills", player: "Josh Allen", conference: "AFC" },
  { id: "car", espnId: "29", team: "CAR", teamName: "Carolina Panthers", player: "Bryce Young", conference: "NFC" },
  { id: "chi", espnId: "3", team: "CHI", teamName: "Chicago Bears", player: "Caleb Williams", conference: "NFC" },
  { id: "cin", espnId: "4", team: "CIN", teamName: "Cincinnati Bengals", player: "Joe Burrow", conference: "AFC" },
  { id: "cle", espnId: "5", team: "CLE", teamName: "Cleveland Browns", player: "Joe Flacco", conference: "AFC" },
  { id: "dal", espnId: "6", team: "DAL", teamName: "Dallas Cowboys", player: "Dak Prescott", conference: "NFC" },
  { id: "den", espnId: "7", team: "DEN", teamName: "Denver Broncos", player: "Bo Nix", conference: "AFC" },
  { id: "det", espnId: "8", team: "DET", teamName: "Detroit Lions", player: "Jared Goff", conference: "NFC" },
  { id: "gb", espnId: "9", team: "GB", teamName: "Green Bay Packers", player: "Jordan Love", conference: "NFC" },
  { id: "hou", espnId: "34", team: "HOU", teamName: "Houston Texans", player: "C.J. Stroud", conference: "AFC" },
  { id: "ind", espnId: "11", team: "IND", teamName: "Indianapolis Colts", player: "Anthony Richardson", conference: "AFC" },
  { id: "jax", espnId: "30", team: "JAX", teamName: "Jacksonville Jaguars", player: "Trevor Lawrence", conference: "AFC" },
  { id: "kc", espnId: "12", team: "KC", teamName: "Kansas City Chiefs", player: "Patrick Mahomes", conference: "AFC" },
  { id: "lv", espnId: "13", team: "LV", teamName: "Las Vegas Raiders", player: "Geno Smith", conference: "AFC" },
  { id: "lac", espnId: "24", team: "LAC", teamName: "Los Angeles Chargers", player: "Justin Herbert", conference: "AFC" },
  { id: "lar", espnId: "14", team: "LAR", teamName: "Los Angeles Rams", player: "Matthew Stafford", conference: "NFC" },
  { id: "mia", espnId: "15", team: "MIA", teamName: "Miami Dolphins", player: "Tua Tagovailoa", conference: "AFC" },
  { id: "min", espnId: "16", team: "MIN", teamName: "Minnesota Vikings", player: "J.J. McCarthy", conference: "NFC" },
  { id: "ne", espnId: "17", team: "NE", teamName: "New England Patriots", player: "Drake Maye", conference: "AFC" },
  { id: "no", espnId: "18", team: "NO", teamName: "New Orleans Saints", player: "Tyler Shough", conference: "NFC" },
  { id: "nyg", espnId: "19", team: "NYG", teamName: "New York Giants", player: "Russell Wilson", conference: "NFC" },
  { id: "nyj", espnId: "20", team: "NYJ", teamName: "New York Jets", player: "Justin Fields", conference: "AFC" },
  { id: "phi", espnId: "21", team: "PHI", teamName: "Philadelphia Eagles", player: "Jalen Hurts", conference: "NFC" },
  { id: "pit", espnId: "23", team: "PIT", teamName: "Pittsburgh Steelers", player: "Aaron Rodgers", conference: "AFC" },
  { id: "sf", espnId: "25", team: "SF", teamName: "San Francisco 49ers", player: "Brock Purdy", conference: "NFC" },
  { id: "sea", espnId: "26", team: "SEA", teamName: "Seattle Seahawks", player: "Sam Darnold", conference: "NFC" },
  { id: "tb", espnId: "27", team: "TB", teamName: "Tampa Bay Buccaneers", player: "Baker Mayfield", conference: "NFC" },
  { id: "ten", espnId: "10", team: "TEN", teamName: "Tennessee Titans", player: "Cam Ward", conference: "AFC" },
  { id: "wsh", espnId: "28", team: "WSH", teamName: "Washington Commanders", player: "Jayden Daniels", conference: "NFC" },
];

const SCOREBOARD_URL = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard";
const DEPTHCHART_URL = (season: number, espnId: string) =>
  `https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/${season}/teams/${espnId}/depthcharts`;

const FALLBACK_SEASON = 2026;
// Cache windows (seconds). Season changes rarely; depth charts move week to week.
const SEASON_TTL = 86_400; // 24h
const QB_TTL = 21_600; // 6h

type EspnAthleteRef = { rank?: number; athlete?: { $ref?: string } };
type EspnDepthItem = { positions?: { qb?: { athletes?: EspnAthleteRef[] } } };

async function fetchJson(url: string, revalidate: number): Promise<unknown> {
  const res = await fetch(url, { next: { revalidate } });
  if (!res.ok) {
    throw new Error(`ESPN request failed (${res.status}): ${url}`);
  }
  return res.json();
}

async function getCurrentSeason(): Promise<number> {
  try {
    const data = (await fetchJson(SCOREBOARD_URL, SEASON_TTL)) as { season?: { year?: number } };
    return data?.season?.year ?? FALLBACK_SEASON;
  } catch {
    return FALLBACK_SEASON;
  }
}

// Returns the live starting QB's display name and ESPN player ID, or null on any failure.
async function fetchStarter(espnId: string, season: number): Promise<{ name: string; playerId: string } | null> {
  try {
    const depth = (await fetchJson(DEPTHCHART_URL(season, espnId), QB_TTL)) as { items?: EspnDepthItem[] };

    let ref: string | undefined;
    for (const item of depth.items ?? []) {
      const athletes = item?.positions?.qb?.athletes;
      if (athletes?.length) {
        const starter = athletes.find((a) => a.rank === 1) ?? athletes[0];
        ref = starter?.athlete?.$ref;
        if (ref) break;
      }
    }
    if (!ref) return null;

    const playerIdMatch = ref.match(/\/athletes\/(\d+)/);
    const playerId = playerIdMatch?.[1];

    const athlete = (await fetchJson(ref, QB_TTL)) as { displayName?: string };
    const name = athlete?.displayName;

    if (!name || !playerId) return null;
    return { name, playerId };
  } catch {
    return null;
  }
}

// Builds the full board, overlaying live starters on top of the static metadata.
// Any team whose live lookup fails keeps its known fallback starter.
export async function getStartingQuarterbacks(): Promise<Quarterback[]> {
  const season = await getCurrentSeason();

  return Promise.all(
    QUARTERBACKS.map(async (qb) => {
      const live = await fetchStarter(qb.espnId, season);
      if (!live) return qb;
      return { ...qb, player: live.name, espnPlayerId: live.playerId };
    }),
  );
}
