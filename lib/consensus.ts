import { QUARTERBACKS } from "../app/lib/quarterbacks";

const DEFAULT_RANKING = QUARTERBACKS.map(({ id }) => id);
const QUARTERBACK_MAP = new Map(QUARTERBACKS.map((quarterback) => [quarterback.id, quarterback]));

export type ConsensusSnapshot = {
  placements: Record<string, number>;
  ranking: string[];
  submissionCount: number;
};

export type TakeMetrics = {
  fanMatchPercent: number;
  takeHeat: number;
  hottestPick: {
    id: string;
    player: string;
    team: string;
    yourRank: number;
    fanAvgRank: number;
    gap: number;
  } | null;
};

function getUserPlacements(ranking: string[]) {
  return ranking.reduce<Record<string, number>>((placements, id, index) => {
    placements[id] = index + 1;
    return placements;
  }, {});
}

export function buildConsensusSnapshot(
  rankSums: Record<string, number>,
  submissionCount: number,
): ConsensusSnapshot {
  const ranking = [...DEFAULT_RANKING].sort((left, right) => {
    const leftAverage = rankSums[left] / submissionCount;
    const rightAverage = rankSums[right] / submissionCount;
    return leftAverage - rightAverage || left.localeCompare(right);
  });

  const placements = Object.fromEntries(
    DEFAULT_RANKING.map((id) => [id, rankSums[id] / submissionCount]),
  );

  return {
    placements,
    ranking,
    submissionCount,
  };
}

export function computeTakeMetrics(ranking: string[], consensus: ConsensusSnapshot): TakeMetrics {
  const userPlacements = getUserPlacements(ranking);
  const deltas = ranking.map((id) => Math.abs(userPlacements[id] - consensus.placements[id]));
  const averageDelta = deltas.reduce((total, delta) => total + delta, 0) / deltas.length;
  const maxPossibleDelta = DEFAULT_RANKING.length - 1;
  const fanMatchPercent = Math.max(0, Math.round((1 - averageDelta / maxPossibleDelta) * 100));
  const takeHeat = Math.min(100, Math.round((averageDelta / maxPossibleDelta) * 100));

  const hottestPick = ranking
    .map((id) => {
      const quarterback = QUARTERBACK_MAP.get(id);

      if (!quarterback) {
        return null;
      }

      const yourRank = userPlacements[id];
      const fanAvgRank = consensus.placements[id];
      const gap = Math.abs(yourRank - fanAvgRank);

      return {
        id,
        player: quarterback.player,
        team: quarterback.team,
        yourRank,
        fanAvgRank: Math.round(fanAvgRank * 10) / 10,
        gap,
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .sort((left, right) => right.gap - left.gap)[0] ?? null;

  return {
    fanMatchPercent,
    takeHeat,
    hottestPick,
  };
}

export function getHeatLabel(takeHeat: number) {
  if (takeHeat >= 75) {
    return "Scorching";
  }

  if (takeHeat >= 55) {
    return "Spicy";
  }

  if (takeHeat >= 35) {
    return "Warm";
  }

  return "Mild";
}
