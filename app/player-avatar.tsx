"use client";

import { useState } from "react";
import { getHeadshotPath, TEAM_COLORS, type Quarterback } from "./quarterbacks";
import styles from "./player-avatar.module.css";

type PlayerAvatarProps = {
  quarterback: Quarterback;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function PlayerAvatar({ quarterback, size = "md", className = "" }: PlayerAvatarProps) {
  const [failed, setFailed] = useState(false);
  const teamColor = TEAM_COLORS[quarterback.team] ?? "#2563eb";

  if (failed) {
    return (
      <span
        className={`${styles.avatar} ${styles[size]} ${styles.fallback} ${className}`}
        style={{ background: `linear-gradient(135deg, ${teamColor}, #1d4ed8)` }}
      >
        {getInitials(quarterback.player)}
      </span>
    );
  }

  return (
    // Native img required for html-to-image export of share cards.
    // eslint-disable-next-line @next/next/no-img-element -- share card PNG capture
    <img
      alt={quarterback.player}
      className={`${styles.avatar} ${styles[size]} ${className}`}
      onError={() => setFailed(true)}
      src={getHeadshotPath(quarterback.id)}
    />
  );
}
