import { NextResponse } from "next/server";
import { QUARTERBACKS } from "../../lib/quarterbacks";

const DEFAULT_RANKING = QUARTERBACKS.map(({ id }) => id);
const QUARTERBACK_MAP = new Map(QUARTERBACKS.map((quarterback) => [quarterback.id, quarterback]));
import { getConsensusSnapshot, recordRanking } from "../../../lib/consensus-store";

function isValidRanking(ranking: unknown): ranking is string[] {
  if (!Array.isArray(ranking) || ranking.length !== DEFAULT_RANKING.length) {
    return false;
  }

  const unique = new Set(ranking);

  return unique.size === DEFAULT_RANKING.length && ranking.every((id) => QUARTERBACK_MAP.has(id));
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const ranking = (body as { ranking?: unknown })?.ranking;

  if (!isValidRanking(ranking)) {
    return NextResponse.json({ error: "Invalid ranking payload." }, { status: 400 });
  }

  const submissionCount = await recordRanking(ranking);
  const consensus = await getConsensusSnapshot();

  return NextResponse.json({
    submissionCount,
    consensus,
  });
}
