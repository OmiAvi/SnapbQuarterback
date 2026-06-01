"use client";

import type { CSSProperties } from "react";
import type { TakeMetrics } from "../lib/consensus";
import { getHeatTheme } from "../lib/heat-theme";
import type { Quarterback } from "./lib/quarterbacks";
import PlayerAvatar from "./player-avatar";
import styles from "./take-heat-card.module.css";

type TakeHeatCardProps = {
  takeMetrics: TakeMetrics;
  submissionCount: number;
  quarterbackMap: Map<string, Quarterback>;
  variant?: "sidebar" | "export";
};

export default function TakeHeatCard({
  takeMetrics,
  submissionCount,
  quarterbackMap,
  variant = "sidebar",
}: TakeHeatCardProps) {
  const theme = getHeatTheme(takeMetrics.takeHeat);
  const hottestQuarterback = takeMetrics.hottestPick
    ? quarterbackMap.get(takeMetrics.hottestPick.id)
    : undefined;
  const rankGap = takeMetrics.hottestPick
    ? Math.round(Math.abs(takeMetrics.hottestPick.yourRank - takeMetrics.hottestPick.fanAvgRank))
    : 0;

  return (
    <div
      className={`${styles.card} ${variant === "export" ? styles.export : ""}`}
      style={
        {
          background: `linear-gradient(145deg, ${theme.accentMuted}, rgba(15, 23, 42, 0.72))`,
          borderColor: `${theme.accent}33`,
        } as CSSProperties
      }
    >
      <div className={styles.meterWrap}>
        <div
          className={styles.meter}
          style={
            {
              "--heat": takeMetrics.takeHeat,
              "--accent": theme.accent,
              "--track": theme.ringTrack,
            } as CSSProperties
          }
        >
          <div className={styles.meterInner}>
            <div>
              <div className={styles.meterValue} style={{ color: theme.accent }}>
                {takeMetrics.takeHeat}
              </div>
              <div className={styles.meterUnit}>heat</div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.copy}>
        <span className={styles.kicker}>Compared to fan boards</span>
        <p className={styles.headline}>
          <em style={{ color: theme.accent }}>{theme.label}</em> take
        </p>
        <div className={styles.stats}>
          <span>{takeMetrics.fanMatchPercent}% consensus match</span>
          <span className={styles.statDot} aria-hidden="true" />
          <span>{submissionCount.toLocaleString()} boards</span>
          <div className={styles.matchBar} aria-hidden="true">
            <div className={styles.matchFill} style={{ width: `${takeMetrics.fanMatchPercent}%` }} />
          </div>
        </div>
      </div>

      {takeMetrics.hottestPick && hottestQuarterback ? (
        <div className={styles.spiciest}>
          <PlayerAvatar quarterback={hottestQuarterback} size={variant === "export" ? "lg" : "md"} />
          <div className={styles.spiciestCopy}>
            <span className={styles.spiciestLabel}>Biggest swing</span>
            <span className={styles.spiciestName}>{takeMetrics.hottestPick.player}</span>
            <span className={styles.spiciestRanks}>
              You: <strong>#{takeMetrics.hottestPick.yourRank}</strong> · Fans: ~
              <strong>{takeMetrics.hottestPick.fanAvgRank}</strong>
            </span>
          </div>
          <span className={styles.rankGap} style={{ background: theme.accentMuted, color: theme.accent }}>
            {rankGap} spots off
          </span>
        </div>
      ) : null}
    </div>
  );
}
