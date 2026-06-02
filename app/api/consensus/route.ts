import { NextResponse } from "next/server";
import { getConsensusSnapshot } from "../../lib/consensus-store";

export async function GET() {
  const consensus = await getConsensusSnapshot();
  return NextResponse.json(consensus);
}
