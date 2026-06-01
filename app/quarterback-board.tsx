"use client";

import html2canvas from "html2canvas";
import { useEffect, useMemo, useRef, useState } from "react";
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

function shuffle<T>(input: T[]) {
  const result = [...input];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }

  return result;
}

const BLIND_COUNT_OPTIONS = [10, 15, 32] as const;

type Mode = "classic" | "blind";
type BlindStage = "setup" | "playing" | "done";

export default function QuarterbackBoard({ initialRankingCode }: { initialRankingCode: string }) {
  const [ranking, setRanking] = useState(() => decodeRanking(initialRankingCode) ?? DEFAULT_RANKING);
  const [mode, setMode] = useState<Mode>("classic");
  const [blindCount, setBlindCount] = useState<(typeof BLIND_COUNT_OPTIONS)[number]>(10);
  const [blindStage, setBlindStage] = useState<BlindStage>("setup");
  const [blindQueue, setBlindQueue] = useState<string[]>([]);
  const [blindCurrent, setBlindCurrent] = useState<string | null>(null);
  const [blindSlots, setBlindSlots] = useState<(string | null)[]>([]);
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
    if (!shareMessage) {
      return;
    }

    const timeout = window.setTimeout(() => setShareMessage(""), 2000);
    return () => window.clearTimeout(timeout);
  }, [shareMessage]);

  const topFive = ranking.slice(0, 5).map((id) => QUARTERBACK_MAP.get(id)?.player ?? id);
  const placedCount = blindSlots.filter(Boolean).length;
  const blindResultRanking = useMemo(
    () => blindSlots.filter((id): id is string => Boolean(id)),
    [blindSlots],
  );
  const blindTopThree = blindResultRanking.slice(0, 3).map((id) => QUARTERBACK_MAP.get(id)?.player ?? id);
  const isSharingBlindResult = mode === "blind" && blindStage === "done" && blindResultRanking.length > 0;
  const exportRanking = isSharingBlindResult ? blindResultRanking : ranking;
  const exportTopPlayers = isSharingBlindResult ? blindTopThree : topFive.slice(0, 3);
  const exportPlacements = useMemo(() => getPlacementMap(exportRanking), [exportRanking]);
  const exportColumns = useMemo(() => {
    const rowsPerColumn = exportRanking.length > 16 ? 8 : Math.max(5, Math.ceil(exportRanking.length / 2));

    return Array.from({ length: Math.ceil(exportRanking.length / rowsPerColumn) }, (_, columnIndex) =>
      exportRanking.slice(columnIndex * rowsPerColumn, columnIndex * rowsPerColumn + rowsPerColumn),
    );
  }, [exportRanking]);

  const updateRanking = (from: number, to: number) => {
    setRanking((currentRanking) => moveRankingItem(currentRanking, from, to));
  };

  const resetRanking = () => {
    setRanking(DEFAULT_RANKING);
  };

  const resetBlind = () => {
    setBlindStage("setup");
    setBlindQueue([]);
    setBlindCurrent(null);
    setBlindSlots([]);
  };

  const startBlindRound = (count: (typeof BLIND_COUNT_OPTIONS)[number]) => {
    const [first, ...rest] = shuffle(DEFAULT_RANKING).slice(0, count);

    setBlindSlots(Array(count).fill(null));
    setBlindQueue(rest);
    setBlindCurrent(first ?? null);
    setBlindStage("playing");
  };

  const placeBlind = (slotIndex: number) => {
    if (blindCurrent === null || blindSlots[slotIndex] !== null) {
      return;
    }

    setBlindSlots((currentSlots) => {
      const nextSlots = [...currentSlots];
      nextSlots[slotIndex] = blindCurrent;
      return nextSlots;
    });

    const [nextCurrent, ...rest] = blindQueue;

    if (nextCurrent === undefined) {
      setBlindCurrent(null);
      setBlindQueue([]);
      setBlindStage("done");
      return;
    }

    setBlindCurrent(nextCurrent);
    setBlindQueue(rest);
  };

  const applyBlindToBoard = () => {
    const placedIds = blindSlots.filter((id): id is string => Boolean(id));
    const remainingIds = ranking.filter((id) => !placedIds.includes(id));

    setRanking([...placedIds, ...remainingIds]);
    setMode("classic");
    resetBlind();
  };

  const selectMode = (nextMode: Mode) => {
    setMode(nextMode);

    if (nextMode === "classic") {
      resetBlind();
    }
  };

  const copyValue = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setShareMessage(`${label} copied.`);
    } catch {
      setShareMessage(`Could not copy ${label.toLowerCase()}.`);
    }
  };

  const downloadShareImage = async () => {
    if (!sharePreviewRef.current) {
      setShareMessage("Share view not ready yet.");
      return;
    }

    try {
      const canvas = await html2canvas(sharePreviewRef.current, {
        backgroundColor: "#f8fbff",
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

  const shareBoardLink = async () => {
    if (typeof navigator === "undefined") {
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: "SnapbQuarterback board",
          text: "Check out my QB rankings.",
          url: shareUrl,
        });
        return;
      } catch {
        // Fall back to copying the link if the share sheet is dismissed or unavailable.
      }
    }

    await copyValue(shareUrl, "Link");
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
                  : "Blind mode: place each quarterback as it appears. Every pick is final and you cannot see who is next."}
              </p>
            </div>
            <div className={styles.panelActions}>
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
              <div className={styles.buttonRow}>
                <button className={styles.secondaryButton} onClick={resetRanking} type="button">
                  Reset board
                </button>
                <button className={styles.secondaryButton} onClick={() => setShareViewOpen(true)} type="button">
                  Share board
                </button>
              </div>
            </div>
          </div>

          {mode === "classic" ? (
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
          ) : null}

          {mode === "blind" && blindStage === "setup" ? (
            <div className={styles.blindSetup}>
              <p>
                Quarterbacks appear one at a time in random order. Drop each into any open slot to lock in
                its rank. Pick how many you want to blind-rank this round.
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
              <button className={styles.primaryButton} onClick={() => startBlindRound(blindCount)} type="button">
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
                <strong>{QUARTERBACK_MAP.get(blindCurrent)?.player}</strong>
                <span>
                  {QUARTERBACK_MAP.get(blindCurrent)?.teamName} · {QUARTERBACK_MAP.get(blindCurrent)?.conference}
                </span>
                <span className={styles.blindHint}>
                  {blindQueue.length} still to come. Choose a slot now. No take-backs.
                </span>
              </div>
              <ol className={styles.slotList}>
                {blindSlots.map((id, index) => {
                  const placedQuarterback = id ? QUARTERBACK_MAP.get(id) : null;

                  return (
                    <li
                      className={`${styles.slot} ${placedQuarterback ? styles.slotFilled : styles.slotEmpty}`}
                      key={`blind-slot-${index + 1}`}
                    >
                      <div className={styles.rankNumber}>{index + 1}</div>
                      {placedQuarterback ? (
                        <div className={styles.playerBlock}>
                          <strong>{placedQuarterback.player}</strong>
                          <span>{placedQuarterback.teamName}</span>
                        </div>
                      ) : (
                        <button className={styles.placeButton} onClick={() => placeBlind(index)} type="button">
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
                <span>Apply these locked results to your full board or run another blind round.</span>
              </div>
              <ol className={styles.rankingList}>
                {blindSlots.map((id, index) => {
                  const quarterback = id ? QUARTERBACK_MAP.get(id) : null;

                  if (!quarterback) {
                    return null;
                  }

                  return (
                    <li className={styles.rankingItem} key={`blind-finish-${quarterback.id}`}>
                      <div className={styles.rankNumber}>{index + 1}</div>
                      <div className={styles.playerBlock}>
                        <strong>{quarterback.player}</strong>
                        <span>
                          {quarterback.teamName} · {quarterback.conference}
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
                <button className={styles.secondaryButton} onClick={resetBlind} type="button">
                  Play again
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {shareViewOpen ? (
        <div className={styles.shareModal}>
          <div className={styles.shareModalContent}>
            <div className={styles.shareModalHeader}>
              <div>
                <h2>{isSharingBlindResult ? "Share your blind ranking" : "Share your board"}</h2>
                <p>
                  {isSharingBlindResult
                    ? "Save the blind-ranking card below. Apply it to your board first if you also want a shareable link."
                    : "Copy the link or save the full ranking card below."}
                </p>
              </div>
              {shareMessage ? <span className={styles.copyMessage}>{shareMessage}</span> : null}
            </div>

            <div className={`${styles.shareControls} ${isSharingBlindResult ? styles.shareControlsMuted : ""}`}>
              <label className={styles.fieldLabel} htmlFor="share-url">
                {isSharingBlindResult ? "Board link" : "Share link"}
              </label>
              <textarea className={styles.textarea} id="share-url" readOnly value={shareUrl} />
              {isSharingBlindResult ? (
                <p className={styles.shareNote}>
                  This link still opens your current full board. The PNG below captures your blind ranking result.
                </p>
              ) : null}
              <div className={styles.buttonRow}>
                <button className={styles.secondaryButton} onClick={shareBoardLink} type="button">
                  Share link
                </button>
                <button className={styles.primaryButton} onClick={() => copyValue(shareUrl, "Link")} type="button">
                  Copy link
                </button>
              </div>
            </div>

            <div className={styles.shareStage}>
              <div className={styles.sharePreview} ref={sharePreviewRef}>
                <header className={styles.sharePreviewHeader}>
                  <div>
                    <p className={styles.shareEyebrow}>SnapbQuarterback</p>
                    <h3>{isSharingBlindResult ? "Blind QB ranking" : "Your QB ranking"}</h3>
                    <p className={styles.shareSubcopy}>Saved on {new Date().toLocaleDateString()}</p>
                  </div>
                </header>

                <div className={styles.shareHighlights}>
                  <article className={styles.shareHighlightCard}>
                    <span>{isSharingBlindResult ? "Blind QB1" : "QB1"}</span>
                    <strong>{QUARTERBACK_MAP.get(exportRanking[0])?.player}</strong>
                    <p>{QUARTERBACK_MAP.get(exportRanking[0])?.teamName}</p>
                  </article>
                  <article className={styles.shareHighlightCard}>
                    <span>Top 3</span>
                    <strong>{exportTopPlayers.join(", ")}</strong>
                    <p>{isSharingBlindResult ? "Locked in from your blind round" : "Headliners from this board"}</p>
                  </article>
                  <article className={styles.shareHighlightCard}>
                    <span>{isSharingBlindResult ? "Round" : "Format"}</span>
                    <strong>{isSharingBlindResult ? `Blind top ${exportRanking.length}` : "1 through 32"}</strong>
                    <p>{isSharingBlindResult ? "Final placements with no take-backs" : "All current starters in one frame"}</p>
                  </article>
                </div>

                <div className={`${styles.shareGrid} ${isSharingBlindResult ? styles.shareGridBlind : ""}`}>
                  {exportColumns.map((column, columnIndex) => (
                    <div className={styles.shareColumn} key={`share-column-${columnIndex}`}>
                      {column.map((id) => {
                        const quarterback = QUARTERBACK_MAP.get(id);

                        if (!quarterback) {
                          return null;
                        }

                        return (
                          <div className={styles.shareRow} key={`share-${quarterback.id}`}>
                            <span className={styles.shareRank}>{exportPlacements[id]}</span>
                            <div className={styles.sharePlayer}>
                              <strong>{quarterback.player}</strong>
                              <span>{quarterback.team}</span>
                            </div>
                            <span className={styles.shareConference}>{quarterback.conference}</span>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>

                <footer className={styles.shareFooter}>
                  <span>snapbquarterback</span>
                  <span>Build yours. Save it. Debate it.</span>
                </footer>
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
