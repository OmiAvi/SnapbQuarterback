"use client";

import { forwardRef } from "react";
import type { TakeMetrics } from "../lib/consensus";
import PlayerAvatar from "./player-avatar";
import TakeHeatCard from "./take-heat-card";
import type { Quarterback } from "./lib/quarterbacks";
import { TEAM_COLORS } from "../lib/team-colors";
import styles from "./share-card.module.css";

export type ShareCardVariant = "top5" | "full";

type ShareCardProps = {
  ranking: string[];
  quarterbackMap: Map<string, Quarterback>;
  variant: ShareCardVariant;
  hostname: string;
  takeMetrics: TakeMetrics | null;
  submissionCount: number;
};

const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(function ShareCard(
  { ranking, quarterbackMap, variant, hostname, takeMetrics, submissionCount },
  ref,
) {
  const getQuarterback = (id: string) => quarterbackMap.get(id);
  const qb1 = getQuarterback(ranking[0] ?? "");
  const qb1Accent = qb1 ? (TEAM_COLORS[qb1.team] ?? "#2563eb") : "#2563eb";

  const heatPanel =
    takeMetrics ? (
      <div className={styles.shareHeat}>
        <TakeHeatCard
          quarterbackMap={quarterbackMap}
          submissionCount={submissionCount}
          takeMetrics={takeMetrics}
          variant="export"
        />
      </div>
    ) : null;

  if (variant === "top5") {
    const topFive = ranking.slice(0, 5);

    return (
      <div className={`${styles.card} ${styles.top5}`} ref={ref}>
        <header className={styles.header}>
          <span className={styles.eyebrow}>My QB rankings</span>
          <span className={styles.wordmark}>SnapbQuarterback</span>
        </header>

        {heatPanel}

        <div className={styles.heroBlock}>
          {qb1 ? (
            <article
              className={styles.qb1Card}
              style={{ borderColor: `${qb1Accent}66`, boxShadow: `0 24px 60px ${qb1Accent}33` }}
            >
              <span className={styles.qb1Label}>QB1</span>
              <div className={styles.qb1Row}>
                <PlayerAvatar className={styles.qb1Avatar} quarterback={qb1} size="xl" />
                <div className={styles.qb1Badge} style={{ background: `linear-gradient(135deg, ${qb1Accent}, #1d4ed8)` }}>
                  1
                </div>
                <div>
                  <div className={styles.qb1Name}>{qb1.player}</div>
                  <div className={styles.qb1Team}>
                    {qb1.teamName} · {qb1.team}
                  </div>
                </div>
              </div>
            </article>
          ) : null}

          <ol className={styles.topList}>
            {topFive.slice(1).map((id, index) => {
              const quarterback = getQuarterback(id);

              if (!quarterback) {
                return null;
              }

              const rank = index + 2;

              return (
                <li className={styles.topRow} key={quarterback.id}>
                  <span className={styles.rankPill}>{rank}</span>
                  <PlayerAvatar quarterback={quarterback} size="lg" />
                  <span className={styles.playerName}>{quarterback.player}</span>
                  <span className={styles.teamAbbr}>{quarterback.team}</span>
                </li>
              );
            })}
          </ol>
        </div>

        <footer className={styles.footer}>
          <p className={styles.footerCta}>
            Rank yours → <span className={styles.footerHost}>{hostname}</span>
          </p>
          <span className={styles.footerBrand}>SnapbQuarterback</span>
        </footer>
      </div>
    );
  }

  const leftColumn = ranking.slice(0, 16);
  const rightColumn = ranking.slice(16);

  return (
    <div className={`${styles.card} ${styles.full}`} ref={ref}>
      <header className={styles.header}>
        <span className={styles.eyebrow}>Full board</span>
        <span className={styles.wordmark}>SnapbQuarterback</span>
      </header>

      {heatPanel}

      {qb1 ? (
        <div className={styles.fullQb1}>
          <PlayerAvatar quarterback={qb1} size="md" />
          <p className={styles.fullTitle}>
            QB1: {qb1.player} ({qb1.team})
          </p>
        </div>
      ) : null}

      <div className={styles.fullGrid}>
        {[leftColumn, rightColumn].map((column, columnIndex) => (
          <div className={styles.fullColumn} key={columnIndex === 0 ? "left" : "right"}>
            {column.map((id, index) => {
              const quarterback = getQuarterback(id);

              if (!quarterback) {
                return null;
              }

              const rank = columnIndex === 0 ? index + 1 : index + 17;

              return (
                <div className={styles.fullRow} key={quarterback.id}>
                  <span className={styles.fullRank}>{rank}</span>
                  <PlayerAvatar quarterback={quarterback} size="xs" />
                  <span className={styles.fullPlayer}>{quarterback.player}</span>
                  <span className={styles.fullTeam}>{quarterback.team}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <footer className={styles.footer}>
        <p className={styles.footerCta}>
          Rank yours → <span className={styles.footerHost}>{hostname}</span>
        </p>
        <span className={styles.footerBrand}>SnapbQuarterback</span>
      </footer>
    </div>
  );
});

export default ShareCard;
