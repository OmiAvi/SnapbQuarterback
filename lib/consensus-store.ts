import { promises as fs } from "fs";
import path from "path";
import { QUARTERBACKS } from "../app/lib/quarterbacks";

const DEFAULT_RANKING = QUARTERBACKS.map(({ id }) => id);
import { BASELINE_CONSENSUS_RANKING } from "./baseline-consensus";
import { buildConsensusSnapshot, type ConsensusSnapshot } from "./consensus";

type ConsensusStore = {
  submissionCount: number;
  rankSums: Record<string, number>;
};

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_PATH = path.join(DATA_DIR, "consensus.json");
const SEED_SUBMISSIONS = 48;

function createSeedStore(): ConsensusStore {
  const rankSums = Object.fromEntries(DEFAULT_RANKING.map((id) => [id, 0]));

  BASELINE_CONSENSUS_RANKING.forEach((id, index) => {
    rankSums[id] = (index + 1) * SEED_SUBMISSIONS;
  });

  return {
    submissionCount: SEED_SUBMISSIONS,
    rankSums,
  };
}

async function readStore(): Promise<ConsensusStore> {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf8");
    const parsed = JSON.parse(raw) as ConsensusStore;

    if (!parsed.submissionCount || !parsed.rankSums) {
      return createSeedStore();
    }

    return parsed;
  } catch {
    return createSeedStore();
  }
}

async function writeStore(store: ConsensusStore) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_PATH, JSON.stringify(store, null, 2));
}

export async function recordRanking(ranking: string[]): Promise<number> {
  const store = await readStore();
  store.submissionCount += 1;

  ranking.forEach((id, index) => {
    store.rankSums[id] = (store.rankSums[id] ?? 0) + (index + 1);
  });

  await writeStore(store);
  return store.submissionCount;
}

export async function getConsensusSnapshot(): Promise<ConsensusSnapshot> {
  const store = await readStore();
  return buildConsensusSnapshot(store.rankSums, store.submissionCount);
}
