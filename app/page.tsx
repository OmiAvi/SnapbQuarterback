import QuarterbackBoard from "./quarterback-board";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ ranking?: string | string[] }>;
}) {
  const resolvedSearchParams = await searchParams;
  const ranking = resolvedSearchParams.ranking;

  return <QuarterbackBoard initialRankingCode={typeof ranking === "string" ? ranking : ""} />;
}
