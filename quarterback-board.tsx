"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import styles from "./page.module.css";

type Quarterback = {
  id: string;
  team: string;
  teamName: string;
  player: string;
  conference: "AFC" | "NFC";
};

const QUARTERBACKS: Quarterback[] = [
  { id: "ari", team: "ARI", teamName: "Arizona Cardinals", player: "Kyler Murray", conference: "NFC" },
  { id: "atl", team: "ATL", teamName: "Atlanta Falcons", player: "Michael Penix Jr.", conference: "NFC" },
  { id: "bal", team: "BAL", teamName: "Baltimore Ravens", player: "Lamar Jackson", conference: "AFC" },
  { id: "buf", team: "BUF", teamName: "Buffalo Bills", player: "Josh Allen", conference: "AFC" },
  { id: "car", team: "CAR", teamName: "Carolina Panthers", player: "Bryce Young", conference: "NFC" },
  { id: "chi", team: "CHI", teamName: "Chicago Bears", player: "Caleb Williams", conference: "NFC" },
  { id: "cin", team: "CIN", teamName: "Cincinnati Bengals", player: "Joe Burrow", conference: "AFC" },
  { id: "cle", team: "CLE", teamName: "Cleveland Browns", player: "Joe Flacco", conference: "AFC" },
  { id: "dal", team: "DAL", teamName: "Dallas Cowboys", player: "Dak Prescott", conference: "NFC" },
  { id: "den", team: "DEN", teamName: "Denver Broncos", player: "Bo Nix", conference: "AFC" },
  { id: "det", team: "DET", teamName: "Detroit Lions", player: "Jared Goff", conference: "NFC" },
  { id: "gb", team: "GB", teamName: "Green Bay Packers", player: "Jordan Love", conference: "NFC" },
  { id: "hou", team: "HOU", teamName: "Houston Texans", player: "C.J. Stroud", conference: "AFC" },
  { id: "ind", team: "IND", teamName: "Indianapolis Colts", player: "Anthony Richardson", conference: "AFC" },
  { id: "jax", team: "JAX", teamName: "Jacksonville Jaguars", player: "Trevor Lawrence", conference: "AFC" },
  { id: "kc", team: "KC", teamName: "Kansas City Chiefs", player: "Patrick Mahomes", conference: "AFC" },
  { id: "lv", team: "LV", teamName: "Las Vegas Raiders", player: "Geno Smith", conference: "AFC" },
  { id: "lac", team: "LAC", teamName: "Los Angeles Chargers", player: "Justin Herbert", conference: "AFC" },
  { id: "lar", team: "LAR", teamName: "Los Angeles Rams", player: "Matthew Stafford", conference: "NFC" },
  { id: "mia", team: "MIA", teamName: "Miami Dolphins", player: "Tua Tagovailoa", conference: "AFC" },
  { id: "min", team: "MIN", teamName: "Minnesota Vikings", player: "J.J. McCarthy", conference: "NFC" },
  { id: "ne", team: "NE", teamName: "New England Patriots", player: "Drake Maye", conference: "AFC" },
  { id: "no", team: "NO", teamName: "New Orleans Saints", player: "Tyler Shough", conference: "NFC" },
  { id: "nyg", team: "NYG", teamName: "New York Giants", player: "Russell Wilson", conference: "NFC" },
  { id: "nyj", team: "NYJ", teamName: "New York Jets", player: "Justin Fields", conference: "AFC" },
  { id: "phi", team: "PHI", teamName: "Philadelphia Eagles", player: "Jalen Hurts", conference: "NFC" },
  { id: "pit", team: "PIT", teamName: "Pittsburgh Steelers", player: "Aaron Rodgers", conference: "AFC" },
  { id: "sf", team: "SF", teamName: "San Francisco 49ers", player: "Brock Purdy", conference: "NFC" },
  { id: "sea", team: "SEA", teamName: "Seattle Seahawks", player: "Sam Darnold", conference: "NFC" },
  { id: "tb", team: "TB", teamName: "Tampa Bay Buccaneers", player: "Baker Mayfield", conference: "NFC" },
  { id: "ten", team: "TEN", teamName: "Tennessee Titans", player: "Cam Ward", conference: "AFC" },
  { id: "wsh", team: "WSH", teamName: "Washington Commanders", player: "Jayden Daniels", conference: "NFC" },
];

const DEFAULT_RANKING = QUARTERBACKS.map(({ id }) => id);
const QUARTERBACK_MAP = new Map(QUARTERBACKS.map((quarterback) => [quarterback.id, quarterback]));

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
  const [shareViewOpen, setShareViewOpen] = useState(false);
  const [shareMessage, setShareMessage] = useState("");
  const sharePreviewRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    if (!shareMessage) {
      return;
    }

    const timeout = window.setTimeout(() => setShareMessage(""), 2000);
    return () => window.clearTimeout(timeout);
  }, [shareMessage]);

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

  const downloadShareImage = async () => {
    if (!sharePreviewRef.current) {
      setShareMessage("Share view not ready yet.");
      return;
    }

    try {
      const canvas = await html2canvas(sharePreviewRef.current, {
        backgroundColor: "#f8fafc",
        scale: window.devicePixelRatio > 1 ? 2 : 1,
      });
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve));

      if (!blob) {
        throw new Error("no-blob");
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "snapbquarterback-board.png";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setShareMessage("Image downloaded.");
    } catch {
      setShareMessage("Could not download image.");
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
            <strong>{QUARTERBACK_MAP.get(ranking[0])?.player}</strong>
            <span>{QUARTERBACK_MAP.get(ranking[0])?.teamName}</span>
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
            <button className={styles.secondaryButton} onClick={() => setShareViewOpen(true)} type="button">
              Open share view
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

      {shareViewOpen ? (
        <div className={styles.shareModal}>
          <div className={styles.shareModalContent}>
            <div className={styles.shareModalHeader}>
              <div>
                <h2>SnapbQuarterback share view</h2>
                <p>Use this clean layout to screenshot or download the board.</p>
              </div>
              {shareMessage ? <span className={styles.copyMessage}>{shareMessage}</span> : null}
            </div>
            <div className={styles.sharePreview} ref={sharePreviewRef}>
              <header className={styles.sharePreviewHeader}>
                <div>
                  <p className={styles.shareEyebrow}>SnapbQuarterback</p>
                  <h3>Your QB ranking</h3>
                  <p className={styles.shareSubcopy}>Saved on {new Date().toLocaleDateString()}</p>
                </div>
                <div className={styles.shareCodeBlock}>
                  <span className={styles.shareCodeLabel}>Ranking code</span>
                  <strong>{shareCode}</strong>
                </div>
              </header>
              <div className={styles.shareGrid}>
                {ranking.map((id, index) => {
                  const quarterback = QUARTERBACK_MAP.get(id);

                  if (!quarterback) {
                    return null;
                  }

                  return (
                    <div className={styles.shareRow} key={`share-${quarterback.id}`}>
                      <span className={styles.shareRank}>{index + 1}</span>
                      <div className={styles.sharePlayer}>
                        <strong>{quarterback.player}</strong>
                        <span>{quarterback.teamName}</span>
                      </div>
                      <span className={styles.shareConference}>{quarterback.conference}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className={styles.shareModalActions}>
              <button className={styles.primaryButton} onClick={downloadShareImage} type="button">
                Download PNG
              </button>
              <button className={styles.secondaryButton} onClick={() => setShareViewOpen(false)} type="button">
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
