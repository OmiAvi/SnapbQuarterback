import QuarterbackBoard from "./quarterback-board";
import { getStartingQuarterbacks } from "./lib/quarterbacks";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ ranking?: string | string[] }>;
}) {
  const resolvedSearchParams = await searchParams;
  const ranking = resolvedSearchParams.ranking;
  const quarterbacks = await getStartingQuarterbacks();

  return (
    <QuarterbackBoard
      quarterbacks={quarterbacks}
      initialRankingCode={typeof ranking === "string" ? ranking : ""}
    />
  );
}
