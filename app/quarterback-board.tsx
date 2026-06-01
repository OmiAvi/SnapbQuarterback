"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  computeTakeMetrics,
  getHeatLabel,
  type ConsensusSnapshot,
} from "../lib/consensus";
import { DEFAULT_RANKING, QUARTERBACK_MAP } from "./quarterbacks";
import PlayerAvatar from "./player-avatar";
import styles from "./page.module.css";
import ShareCard, { type ShareCardVariant } from "./share-card";
import { copyCardPngToClipboard, downloadCardPng } from "./share-image";

function moveRankingItem(ranking: string[], from: number, to: number) {
  if (from === to || to < 0 || to >= ranking.length) {
    return ranking;
  }

  const nextRanking = [...ranking];
  const [selected] = nextRanking.splice(from, 1);
  nextRanking.splice(to, 0, selected);
  return nextRanking;
}

function encodeRanking(ranking: string[]) {
  return ranking.join(".");
}

function extractRankingCode(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("?")) {
    return new URLSearchParams(trimmed).get("ranking") ?? "";
  }

  if (/^ranking=/.test(trimmed)) {
    return trimmed.slice("ranking=".length);
  }

  const paramMatch = trimmed.match(/[?&]ranking=([^&]+)/);
  if (paramMatch) {
    return decodeURIComponent(paramMatch[1]);
  }

  return trimmed;
}

function decodeRanking(value: string) {
  const rankingCode = extractRankingCode(value);

  if (!rankingCode) {
    return null;
  }

  const ranking = rankingCode.split(".").filter(Boolean);
  const rankingSet = new Set(ranking);

  if (ranking.length !== DEFAULT_RANKING.length || rankingSet.size !== DEFAULT_RANKING.length) {
    return null;
  }

  if (!ranking.every((id) => QUARTERBACK_MAP.has(id))) {
    return null;
  }

  return ranking;
}

function getPlacementMap(ranking: string[]) {
  return ranking.reduce<Record<string, number>>((placements, id, index) => {
    placements[id] = index + 1;
    return placements;
  }, {});
}

export default function QuarterbackBoard({ initialRankingCode }: { initialRankingCode: string }) {
  const [ranking, setRanking] = useState(() => decodeRanking(initialRankingCode) ?? DEFAULT_RANKING);
  const [comparisonInput, setComparisonInput] = useState("");
  const [comparisonRanking, setComparisonRanking] = useState<string[] | null>(null);
  const [comparisonError, setComparisonError] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [imageVariant, setImageVariant] = useState<ShareCardVariant>("top5");
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [consensus, setConsensus] = useState<ConsensusSnapshot | null>(null);

  const lastSubmittedCode = useRef("");

  const hostname = useSyncExternalStore(
    () => () => {},
    () => window.location.host || "snapbquarterback.com",
    () => "snapbquarterback.com",
  );

  const top5CardRef = useRef<HTMLDivElement>(null);
  const fullCardRef = useRef<HTMLDivElement>(null);

  const shareCode = useMemo(() => encodeRanking(ranking), [ranking]);
  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") {
      return `?ranking=${shareCode}`;
    }

    return `${window.location.origin}${window.location.pathname}?ranking=${shareCode}`;
  }, [shareCode]);

  const rankingIsValid = ranking.length === DEFAULT_RANKING.length;

  const takeMetrics = useMemo(
    () => (consensus ? computeTakeMetrics(ranking, consensus) : null),
    [consensus, ranking],
  );

  const submitRankingToCommunity = useCallback(async (currentRanking: string[]) => {
    const response = await fetch("/api/ranking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ranking: currentRanking }),
    });

    if (!response.ok) {
      return;
    }

    const payload = (await response.json()) as { consensus: ConsensusSnapshot };
    setConsensus(payload.consensus);
    lastSubmittedCode.current = encodeRanking(currentRanking);
  }, []);

  useEffect(() => {
    fetch("/api/consensus")
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: ConsensusSnapshot | null) => {
        if (payload) {
          setConsensus(payload);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!rankingIsValid) {
      return;
    }

    const rankingCode = encodeRanking(ranking);

    if (rankingCode === lastSubmittedCode.current) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void submitRankingToCommunity(ranking);
    }, 2000);

    return () => window.clearTimeout(timeout);
  }, [ranking, rankingIsValid, submitRankingToCommunity]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.history.replaceState(null, "", `?ranking=${shareCode}`);
  }, [shareCode]);

  useEffect(() => {
    if (!copyMessage) {
      return;
    }

    const timeout = window.setTimeout(() => setCopyMessage(""), 2000);
    return () => window.clearTimeout(timeout);
  }, [copyMessage]);

  const topFive = ranking.slice(0, 5).map((id) => QUARTERBACK_MAP.get(id)?.player ?? id);

  const comparisonRows = useMemo(() => {
    if (!comparisonRanking) {
      return [];
    }

    const myPlacements = getPlacementMap(ranking);
    const theirPlacements = getPlacementMap(comparisonRanking);

    return ranking
      .map((id) => {
        const quarterback = QUARTERBACK_MAP.get(id);

        if (!quarterback) {
          return null;
        }

        const mine = myPlacements[id];
        const theirs = theirPlacements[id];

        return {
          quarterback,
          mine,
          theirs,
          delta: Math.abs(mine - theirs),
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
      .sort((left, right) => right.delta - left.delta || left.mine - right.mine);
  }, [comparisonRanking, ranking]);

  const averageDelta = comparisonRows.length
    ? comparisonRows.reduce((total, row) => total + row.delta, 0) / comparisonRows.length
    : 0;
  const agreementScore = comparisonRows.length
    ? Math.max(0, Math.round((1 - averageDelta / (DEFAULT_RANKING.length - 1)) * 100))
    : 0;
  const biggestGap = comparisonRows[0];

  const updateRanking = (from: number, to: number) => {
    setRanking((currentRanking) => moveRankingItem(currentRanking, from, to));
  };

  const resetRanking = () => {
    setRanking(DEFAULT_RANKING);
    setComparisonRanking(null);
    setComparisonInput("");
    setComparisonError("");
  };

  const loadComparison = () => {
    const decodedRanking = decodeRanking(comparisonInput);

    if (!decodedRanking) {
      setComparisonRanking(null);
      setComparisonError("Paste a SnapbQuarterback share link or ranking code to compare boards.");
      return;
    }

    setComparisonRanking(decodedRanking);
    setComparisonError("");
  };

  const copyValue = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopyMessage(`${label} copied.`);
    } catch {
      setCopyMessage(`Could not copy ${label.toLowerCase()}.`);
    }
  };

  const getActiveCardNode = () => {
    const node = imageVariant === "top5" ? top5CardRef.current : fullCardRef.current;
    return node;
  };

  const runImageAction = async (action: "download" | "copy") => {
    const node = getActiveCardNode();

    if (!node || !rankingIsValid) {
      setCopyMessage("Could not generate image. Try again after your board loads.");
      return;
    }

    setIsGeneratingImage(true);

    try {
      if (encodeRanking(ranking) !== lastSubmittedCode.current) {
        await submitRankingToCommunity(ranking);
      }

      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve());
        });
      });

      if (action === "download") {
        const filename =
          imageVariant === "top5" ? "snapb-quarterback-top5.png" : "snapb-quarterback-full.png";
        await downloadCardPng(node, filename);
        setCopyMessage("Image downloaded.");
      } else {
        await copyCardPngToClipboard(node);
        setCopyMessage("Image copied.");
      }
    } catch {
      if (action === "copy") {
        setCopyMessage("Could not copy image. Try download, or use Chrome.");
      } else {
        setCopyMessage("Could not download image. Please try again.");
      }
    } finally {
      setIsGeneratingImage(false);
    }
  };

  return (
    <main className={styles.page}>
      <div className={styles.exportHost} aria-hidden="true">
        <ShareCard
          hostname={hostname}
          ranking={ranking}
          ref={top5CardRef}
          submissionCount={consensus?.submissionCount ?? 0}
          takeMetrics={takeMetrics}
          variant="top5"
        />
        <ShareCard
          hostname={hostname}
          ranking={ranking}
          ref={fullCardRef}
          submissionCount={consensus?.submissionCount ?? 0}
          takeMetrics={takeMetrics}
          variant="full"
        />
      </div>

      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>NFL QB Tiers</p>
          <h1>Rank every current starting quarterback, save your board, and compare takes.</h1>
          <p className={styles.lede}>
            Build your own 1-to-32 quarterback ladder, then keep a compact code or shareable link that
            loads your exact board for anyone else who wants to debate it.
          </p>
        </div>
        <div className={styles.summaryGrid}>
          <article className={styles.card}>
            <span className={styles.cardLabel}>QB1</span>
            <strong>{QUARTERBACK_MAP.get(ranking[0])?.player}</strong>
            <span>{QUARTERBACK_MAP.get(ranking[0])?.teamName}</span>
          </article>
          <article className={styles.card}>
            <span className={styles.cardLabel}>Top five</span>
            <strong>{topFive.join(", ")}</strong>
            <span>Instantly updates as you reorder the board.</span>
          </article>
          <article className={styles.card}>
            <span className={styles.cardLabel}>Take heat</span>
            <strong>{takeMetrics ? `${takeMetrics.takeHeat}° ${getHeatLabel(takeMetrics.takeHeat)}` : "…"}</strong>
            <span>
              {takeMetrics
                ? `${takeMetrics.fanMatchPercent}% fan match across ${consensus?.submissionCount.toLocaleString() ?? "0"} boards.`
                : "Loading community consensus…"}
            </span>
          </article>
        </div>
      </section>

      <section className={styles.content}>
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Your ranking</h2>
              <p>Use the controls to move quarterbacks up or down until the board matches your take.</p>
            </div>
            <button className={styles.secondaryButton} onClick={resetRanking} type="button">
              Reset board
            </button>
          </div>

          <ol className={styles.rankingList}>
            {ranking.map((id, index) => {
              const quarterback = QUARTERBACK_MAP.get(id);

              if (!quarterback) {
                return null;
              }

              return (
                <li className={styles.rankingItem} key={quarterback.id}>
                  <div className={styles.rankNumber}>{index + 1}</div>
                  <PlayerAvatar quarterback={quarterback} size="md" />
                  <div className={styles.playerBlock}>
                    <strong>{quarterback.player}</strong>
                    <span>
                      {quarterback.teamName} · {quarterback.conference}
                    </span>
                  </div>
                  <div className={styles.controls}>
                    <button
                      aria-label={`Move ${quarterback.player} to the top`}
                      className={styles.controlButton}
                      disabled={index === 0}
                      onClick={() => updateRanking(index, 0)}
                      type="button"
                    >
                      Top
                    </button>
                    <button
                      aria-label={`Move ${quarterback.player} up`}
                      className={styles.controlButton}
                      disabled={index === 0}
                      onClick={() => updateRanking(index, index - 1)}
                      type="button"
                    >
                      ↑
                    </button>
                    <button
                      aria-label={`Move ${quarterback.player} down`}
                      className={styles.controlButton}
                      disabled={index === ranking.length - 1}
                      onClick={() => updateRanking(index, index + 1)}
                      type="button"
                    >
                      ↓
                    </button>
                    <button
                      aria-label={`Move ${quarterback.player} to the bottom`}
                      className={styles.controlButton}
                      disabled={index === ranking.length - 1}
                      onClick={() => updateRanking(index, ranking.length - 1)}
                      type="button"
                    >
                      Bottom
                    </button>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        <div className={styles.sidebar}>
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <h2>Share your board</h2>
                <p>Send the full link, ranking code, or a shareable image for social posts.</p>
              </div>
              {copyMessage ? <span className={styles.copyMessage}>{copyMessage}</span> : null}
            </div>
            <label className={styles.fieldLabel} htmlFor="share-url">
              Share link
            </label>
            <textarea className={styles.textarea} id="share-url" readOnly value={shareUrl} />
            <button className={styles.primaryButton} onClick={() => copyValue(shareUrl, "Link")} type="button">
              Copy share link
            </button>

            {takeMetrics ? (
              <div className={styles.takeHeatPanel}>
                <div>
                  <span className={styles.cardLabel}>Take heat</span>
                  <strong className={styles.takeHeatValue}>
                    {takeMetrics.takeHeat}° {getHeatLabel(takeMetrics.takeHeat)}
                  </strong>
                </div>
                <p>
                  {takeMetrics.fanMatchPercent}% match with fan boards
                  {consensus ? ` · ${consensus.submissionCount.toLocaleString()} boards` : null}
                </p>
                {takeMetrics.hottestPick ? (
                  <p className={styles.takeHeatCallout}>
                    Spiciest: {takeMetrics.hottestPick.player} at #{takeMetrics.hottestPick.yourRank} (fans avg #
                    {takeMetrics.hottestPick.fanAvgRank})
                  </p>
                ) : null}
              </div>
            ) : null}

            <p className={styles.fieldLabel}>Share image</p>
            <div className={styles.variantToggle} role="group" aria-label="Share image layout">
              <button
                aria-pressed={imageVariant === "top5"}
                className={`${styles.variantButton} ${imageVariant === "top5" ? styles.variantButtonActive : ""}`}
                onClick={() => setImageVariant("top5")}
                type="button"
              >
                Top 5
              </button>
              <button
                aria-pressed={imageVariant === "full"}
                className={`${styles.variantButton} ${imageVariant === "full" ? styles.variantButtonActive : ""}`}
                onClick={() => setImageVariant("full")}
                type="button"
              >
                Full board
              </button>
            </div>
            <div className={styles.buttonRow}>
              <button
                aria-label={`Download ${imageVariant === "top5" ? "Top 5" : "Full board"} image`}
                className={styles.primaryButton}
                disabled={!rankingIsValid || isGeneratingImage}
                onClick={() => runImageAction("download")}
                type="button"
              >
                {isGeneratingImage ? "Generating…" : "Download image"}
              </button>
              <button
                aria-label={`Copy ${imageVariant === "top5" ? "Top 5" : "Full board"} image`}
                className={styles.secondaryButton}
                disabled={!rankingIsValid || isGeneratingImage}
                onClick={() => runImageAction("copy")}
                type="button"
              >
                Copy image
              </button>
            </div>

            <label className={styles.fieldLabel} htmlFor="share-code">
              Savable ranking code
            </label>
            <textarea className={styles.textarea} id="share-code" readOnly value={shareCode} />
            <button className={styles.secondaryButton} onClick={() => copyValue(shareCode, "Code")} type="button">
              Copy ranking code
            </button>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <h2>Compare with someone else</h2>
                <p>Paste another fan&apos;s link or ranking code to spot the biggest disagreements.</p>
              </div>
            </div>
            <label className={styles.fieldLabel} htmlFor="comparison-input">
              Opponent link or code
            </label>
            <textarea
              className={styles.textarea}
              id="comparison-input"
              onChange={(event) => setComparisonInput(event.target.value)}
              placeholder="https://.../SnapbQuarterback?ranking=..."
              value={comparisonInput}
            />
            <div className={styles.buttonRow}>
              <button className={styles.primaryButton} onClick={loadComparison} type="button">
                Compare boards
              </button>
              <button
                className={styles.secondaryButton}
                onClick={() => {
                  setComparisonInput("");
                  setComparisonRanking(null);
                  setComparisonError("");
                }}
                type="button"
              >
                Clear
              </button>
            </div>
            {comparisonError ? <p className={styles.error}>{comparisonError}</p> : null}

            {comparisonRanking ? (
              <div className={styles.comparisonPanel}>
                <div className={styles.comparisonStats}>
                  <article className={styles.card}>
                    <span className={styles.cardLabel}>Agreement score</span>
                    <strong>{agreementScore}%</strong>
                    <span>Based on average rank distance across all 32 quarterbacks.</span>
                  </article>
                  <article className={styles.card}>
                    <span className={styles.cardLabel}>Biggest disagreement</span>
                    <strong>{biggestGap?.quarterback.player}</strong>
                    <span>
                      You have him {biggestGap?.mine}, they have him {biggestGap?.theirs}.
                    </span>
                  </article>
                </div>
                <div className={styles.comparisonTable}>
                  {comparisonRows.slice(0, 8).map((row) => (
                    <div className={styles.comparisonRow} key={row.quarterback.id}>
                      <div>
                        <strong>{row.quarterback.player}</strong>
                        <span>{row.quarterback.team}</span>
                      </div>
                      <div className={styles.comparisonRanks}>
                        <span>You: {row.mine}</span>
                        <span>Them: {row.theirs}</span>
                        <span>Δ {row.delta}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        </div>
      </section>
    </main>
  );
}
