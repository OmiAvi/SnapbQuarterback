"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./page.module.css";
import type { Quarterback } from "./lib/quarterbacks";

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

function decodeRanking(value: string, quarterbackMap: Map<string, Quarterback>) {
  const rankingCode = extractRankingCode(value);

  if (!rankingCode) {
    return null;
  }

  const ranking = rankingCode.split(".").filter(Boolean);
  const rankingSet = new Set(ranking);

  if (ranking.length !== quarterbackMap.size || rankingSet.size !== quarterbackMap.size) {
    return null;
  }

  if (!ranking.every((id) => quarterbackMap.has(id))) {
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

function shuffle<T>(input: T[]): T[] {
  const result = [...input];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

const BLIND_COUNT_OPTIONS = [10, 15, 32];

type Mode = "classic" | "blind";
type BlindStage = "setup" | "playing" | "done";

export default function QuarterbackBoard({
  quarterbacks,
  initialRankingCode,
}: {
  quarterbacks: Quarterback[];
  initialRankingCode: string;
}) {
  const defaultRanking = useMemo(() => quarterbacks.map(({ id }) => id), [quarterbacks]);
  const quarterbackMap = useMemo(
    () => new Map(quarterbacks.map((quarterback) => [quarterback.id, quarterback])),
    [quarterbacks],
  );

  const [ranking, setRanking] = useState(
    () => decodeRanking(initialRankingCode, quarterbackMap) ?? defaultRanking,
  );
  const [comparisonInput, setComparisonInput] = useState("");
  const [comparisonRanking, setComparisonRanking] = useState<string[] | null>(null);
  const [comparisonError, setComparisonError] = useState("");
  const [copyMessage, setCopyMessage] = useState("");

  const [mode, setMode] = useState<Mode>("classic");
  const [blindCount, setBlindCount] = useState(10);
  const [blindStage, setBlindStage] = useState<BlindStage>("setup");
  const [blindQueue, setBlindQueue] = useState<string[]>([]);
  const [blindCurrent, setBlindCurrent] = useState<string | null>(null);
  const [blindSlots, setBlindSlots] = useState<(string | null)[]>([]);

  const shareCode = useMemo(() => encodeRanking(ranking), [ranking]);
  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") {
      return `?ranking=${shareCode}`;
    }

    return `${window.location.origin}${window.location.pathname}?ranking=${shareCode}`;
  }, [shareCode]);

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

  const topFive = ranking.slice(0, 5).map((id) => quarterbackMap.get(id)?.player ?? id);

  const comparisonRows = useMemo(() => {
    if (!comparisonRanking) {
      return [];
    }

    const myPlacements = getPlacementMap(ranking);
    const theirPlacements = getPlacementMap(comparisonRanking);

    return ranking
      .map((id) => {
        const quarterback = quarterbackMap.get(id);

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
  }, [comparisonRanking, ranking, quarterbackMap]);

  const averageDelta = comparisonRows.length
    ? comparisonRows.reduce((total, row) => total + row.delta, 0) / comparisonRows.length
    : 0;
  const agreementScore = comparisonRows.length
    ? Math.max(0, Math.round((1 - averageDelta / (defaultRanking.length - 1)) * 100))
    : 0;
  const biggestGap = comparisonRows[0];

  const updateRanking = (from: number, to: number) => {
    setRanking((currentRanking) => moveRankingItem(currentRanking, from, to));
  };

  const resetRanking = () => {
    setRanking(defaultRanking);
    setComparisonRanking(null);
    setComparisonInput("");
    setComparisonError("");
  };

  const placedCount = blindSlots.filter(Boolean).length;

  const resetBlind = () => {
    setBlindStage("setup");
    setBlindQueue([]);
    setBlindCurrent(null);
    setBlindSlots([]);
  };

  const startBlindRound = (count: number) => {
    const [first, ...rest] = shuffle(defaultRanking).slice(0, count);
    setBlindSlots(Array(count).fill(null));
    setBlindQueue(rest);
    setBlindCurrent(first ?? null);
    setBlindStage("playing");
  };

  const placeBlind = (slotIndex: number) => {
    if (blindCurrent === null || blindSlots[slotIndex] !== null) {
      return;
    }

    setBlindSlots((slots) => {
      const next = [...slots];
      next[slotIndex] = blindCurrent;
      return next;
    });

    const [nextCurrent, ...rest] = blindQueue;
    if (nextCurrent === undefined) {
      setBlindCurrent(null);
      setBlindQueue([]);
      setBlindStage("done");
    } else {
      setBlindCurrent(nextCurrent);
      setBlindQueue(rest);
    }
  };

  const applyBlindToBoard = () => {
    const placed = blindSlots.filter((id): id is string => Boolean(id));
    const rest = ranking.filter((id) => !placed.includes(id));
    setRanking([...placed, ...rest]);
    setMode("classic");
    resetBlind();
  };

  const selectMode = (nextMode: Mode) => {
    setMode(nextMode);
    if (nextMode === "classic") {
      resetBlind();
    }
  };

  const loadComparison = () => {
    const decodedRanking = decodeRanking(comparisonInput, quarterbackMap);

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

  return (
    <main className={styles.page}>
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
            <strong>{quarterbackMap.get(ranking[0])?.player}</strong>
            <span>{quarterbackMap.get(ranking[0])?.teamName}</span>
          </article>
          <article className={styles.card}>
            <span className={styles.cardLabel}>Top five</span>
            <strong>{topFive.join(", ")}</strong>
            <span>Instantly updates as you reorder the board.</span>
          </article>
          <article className={styles.card}>
            <span className={styles.cardLabel}>Saved format</span>
            <strong>{shareCode}</strong>
            <span>Keep the ranking code or full link to reopen the exact same board later.</span>
          </article>
        </div>
      </section>

      <section className={styles.content}>
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Your ranking</h2>
              <p>
                {mode === "classic"
                  ? "Use the controls to move quarterbacks up or down until the board matches your take."
                  : "Blind mode: place each quarterback the moment it appears — you can't see who's next, and every pick is final."}
              </p>
            </div>
            <div className={styles.modeToggle}>
              <button
                className={mode === "classic" ? styles.primaryButton : styles.secondaryButton}
                onClick={() => selectMode("classic")}
                type="button"
              >
                Classic
              </button>
              <button
                className={mode === "blind" ? styles.primaryButton : styles.secondaryButton}
                onClick={() => selectMode("blind")}
                type="button"
              >
                Blind ranking
              </button>
            </div>
          </div>

          {mode === "classic" ? (
            <>
              <div className={styles.buttonRow}>
                <button className={styles.secondaryButton} onClick={resetRanking} type="button">
                  Reset board
                </button>
              </div>
              <ol className={styles.rankingList}>
                {ranking.map((id, index) => {
                  const quarterback = quarterbackMap.get(id);

                  if (!quarterback) {
                    return null;
                  }

                  return (
                    <li className={styles.rankingItem} key={quarterback.id}>
                      <div className={styles.rankNumber}>{index + 1}</div>
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
            </>
          ) : null}

          {mode === "blind" && blindStage === "setup" ? (
            <div className={styles.blindSetup}>
              <p>
                Quarterbacks appear one at a time in random order. Drop each into any open slot to
                set its rank — once placed, it&apos;s locked. Pick how many to rank:
              </p>
              <span className={styles.fieldLabel}>Round length</span>
              <div className={styles.buttonRow}>
                {BLIND_COUNT_OPTIONS.map((count) => (
                  <button
                    className={blindCount === count ? styles.primaryButton : styles.secondaryButton}
                    key={count}
                    onClick={() => setBlindCount(count)}
                    type="button"
                  >
                    {count === 32 ? "All 32" : count}
                  </button>
                ))}
              </div>
              <button
                className={styles.primaryButton}
                onClick={() => startBlindRound(blindCount)}
                type="button"
              >
                Start blind round
              </button>
            </div>
          ) : null}

          {mode === "blind" && blindStage === "playing" && blindCurrent ? (
            <div className={styles.blindBoard}>
              <div className={styles.currentCard}>
                <span className={styles.cardLabel}>
                  Place {placedCount + 1} of {blindSlots.length}
                </span>
                <strong>{quarterbackMap.get(blindCurrent)?.player}</strong>
                <span>
                  {quarterbackMap.get(blindCurrent)?.teamName} ·{" "}
                  {quarterbackMap.get(blindCurrent)?.conference}
                </span>
                <span className={styles.blindHint}>
                  {blindQueue.length} still to come — choose a slot. No take-backs.
                </span>
              </div>
              <ol className={styles.slotList}>
                {blindSlots.map((id, index) => {
                  const placedQb = id ? quarterbackMap.get(id) : null;

                  return (
                    <li
                      className={`${styles.slot} ${placedQb ? styles.slotFilled : styles.slotEmpty}`}
                      key={index}
                    >
                      <div className={styles.rankNumber}>{index + 1}</div>
                      {placedQb ? (
                        <div className={styles.playerBlock}>
                          <strong>{placedQb.player}</strong>
                          <span>{placedQb.teamName}</span>
                        </div>
                      ) : (
                        <button
                          className={styles.placeButton}
                          onClick={() => placeBlind(index)}
                          type="button"
                        >
                          Place here
                        </button>
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>
          ) : null}

          {mode === "blind" && blindStage === "done" ? (
            <div className={styles.blindBoard}>
              <div className={styles.currentCard}>
                <span className={styles.cardLabel}>Round complete</span>
                <strong>Your blind top {blindSlots.length}</strong>
                <span>Locked in. Apply it to your board to share or compare — or run it back.</span>
              </div>
              <ol className={styles.rankingList}>
                {blindSlots.map((id, index) => {
                  const placedQb = id ? quarterbackMap.get(id) : null;

                  if (!placedQb) {
                    return null;
                  }

                  return (
                    <li className={styles.rankingItem} key={placedQb.id}>
                      <div className={styles.rankNumber}>{index + 1}</div>
                      <div className={styles.playerBlock}>
                        <strong>{placedQb.player}</strong>
                        <span>
                          {placedQb.teamName} · {placedQb.conference}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ol>
              <div className={styles.buttonRow}>
                <button className={styles.primaryButton} onClick={applyBlindToBoard} type="button">
                  Apply to my board
                </button>
                <button
                  className={styles.secondaryButton}
                  onClick={() => setBlindStage("setup")}
                  type="button"
                >
                  Play again
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className={styles.sidebar}>
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <h2>Share your board</h2>
                <p>Send the full link or just the compact ranking code.</p>
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
