export type Quarterback = {
  id: string;
  team: string;
  teamName: string;
  player: string;
  conference: "AFC" | "NFC";
  espnId?: number;
};

export const QUARTERBACKS: Quarterback[] = [
  { id: "ari", team: "ARI", teamName: "Arizona Cardinals", player: "Kyler Murray", conference: "NFC", espnId: 3917315 },
  { id: "atl", team: "ATL", teamName: "Atlanta Falcons", player: "Michael Penix Jr.", conference: "NFC", espnId: 4432580 },
  { id: "bal", team: "BAL", teamName: "Baltimore Ravens", player: "Lamar Jackson", conference: "AFC", espnId: 3916387 },
  { id: "buf", team: "BUF", teamName: "Buffalo Bills", player: "Josh Allen", conference: "AFC", espnId: 3918298 },
  { id: "car", team: "CAR", teamName: "Carolina Panthers", player: "Bryce Young", conference: "NFC", espnId: 4685720 },
  { id: "chi", team: "CHI", teamName: "Chicago Bears", player: "Caleb Williams", conference: "NFC", espnId: 4431611 },
  { id: "cin", team: "CIN", teamName: "Cincinnati Bengals", player: "Joe Burrow", conference: "AFC", espnId: 3915511 },
  { id: "cle", team: "CLE", teamName: "Cleveland Browns", player: "Joe Flacco", conference: "AFC", espnId: 11252 },
  { id: "dal", team: "DAL", teamName: "Dallas Cowboys", player: "Dak Prescott", conference: "NFC", espnId: 2577417 },
  { id: "den", team: "DEN", teamName: "Denver Broncos", player: "Bo Nix", conference: "AFC", espnId: 4426338 },
  { id: "det", team: "DET", teamName: "Detroit Lions", player: "Jared Goff", conference: "NFC", espnId: 3046779 },
  { id: "gb", team: "GB", teamName: "Green Bay Packers", player: "Jordan Love", conference: "NFC", espnId: 4036378 },
  { id: "hou", team: "HOU", teamName: "Houston Texans", player: "C.J. Stroud", conference: "AFC", espnId: 4432764 },
  { id: "ind", team: "IND", teamName: "Indianapolis Colts", player: "Anthony Richardson", conference: "AFC", espnId: 4429084 },
  { id: "jax", team: "JAX", teamName: "Jacksonville Jaguars", player: "Trevor Lawrence", conference: "AFC", espnId: 4360310 },
  { id: "kc", team: "KC", teamName: "Kansas City Chiefs", player: "Patrick Mahomes", conference: "AFC", espnId: 3139477 },
  { id: "lv", team: "LV", teamName: "Las Vegas Raiders", player: "Geno Smith", conference: "AFC", espnId: 15864 },
  { id: "lac", team: "LAC", teamName: "Los Angeles Chargers", player: "Justin Herbert", conference: "AFC", espnId: 4038941 },
  { id: "lar", team: "LAR", teamName: "Los Angeles Rams", player: "Matthew Stafford", conference: "NFC", espnId: 12483 },
  { id: "mia", team: "MIA", teamName: "Miami Dolphins", player: "Tua Tagovailoa", conference: "AFC", espnId: 4241479 },
  { id: "min", team: "MIN", teamName: "Minnesota Vikings", player: "J.J. McCarthy", conference: "NFC", espnId: 4433288 },
  { id: "ne", team: "NE", teamName: "New England Patriots", player: "Drake Maye", conference: "AFC", espnId: 4432734 },
  { id: "no", team: "NO", teamName: "New Orleans Saints", player: "Tyler Shough", conference: "NFC" },
  { id: "nyg", team: "NYG", teamName: "New York Giants", player: "Russell Wilson", conference: "NFC", espnId: 14881 },
  { id: "nyj", team: "NYJ", teamName: "New York Jets", player: "Justin Fields", conference: "AFC", espnId: 4362887 },
  { id: "phi", team: "PHI", teamName: "Philadelphia Eagles", player: "Jalen Hurts", conference: "NFC", espnId: 4040715 },
  { id: "pit", team: "PIT", teamName: "Pittsburgh Steelers", player: "Aaron Rodgers", conference: "AFC", espnId: 8439 },
  { id: "sf", team: "SF", teamName: "San Francisco 49ers", player: "Brock Purdy", conference: "NFC", espnId: 4361741 },
  { id: "sea", team: "SEA", teamName: "Seattle Seahawks", player: "Sam Darnold", conference: "NFC", espnId: 3912547 },
  { id: "tb", team: "TB", teamName: "Tampa Bay Buccaneers", player: "Baker Mayfield", conference: "NFC", espnId: 3123076 },
  { id: "ten", team: "TEN", teamName: "Tennessee Titans", player: "Cam Ward", conference: "AFC" },
  { id: "wsh", team: "WSH", teamName: "Washington Commanders", player: "Jayden Daniels", conference: "NFC", espnId: 4426348 },
];

export const DEFAULT_RANKING = QUARTERBACKS.map(({ id }) => id);

export const QUARTERBACK_MAP = new Map(QUARTERBACKS.map((quarterback) => [quarterback.id, quarterback]));

export function getHeadshotPath(id: string) {
  return `/api/headshot/${id}`;
}

export const TEAM_COLORS: Record<string, string> = {
  ARI: "#97233F",
  ATL: "#A71930",
  BAL: "#241773",
  BUF: "#00338D",
  CAR: "#0085CA",
  CHI: "#0B162A",
  CIN: "#FB4F14",
  CLE: "#FF3C00",
  DAL: "#003594",
  DEN: "#FB4F14",
  DET: "#0076B6",
  GB: "#203731",
  HOU: "#03202F",
  IND: "#002C5F",
  JAX: "#006778",
  KC: "#E31837",
  LV: "#A5ACAF",
  LAC: "#0080C6",
  LAR: "#003594",
  MIA: "#008E97",
  MIN: "#4F2683",
  NE: "#002244",
  NO: "#D3BC8D",
  NYG: "#0B2265",
  NYJ: "#125740",
  PHI: "#004C54",
  PIT: "#FFB612",
  SF: "#AA0000",
  SEA: "#002244",
  TB: "#D50A0A",
  TEN: "#0C2340",
  WSH: "#5A1414",
};
