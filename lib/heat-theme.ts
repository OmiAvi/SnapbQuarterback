export type HeatTheme = {
  label: string;
  accent: string;
  accentMuted: string;
  ringTrack: string;
};

export function getHeatTheme(takeHeat: number): HeatTheme {
  if (takeHeat >= 75) {
    return {
      label: "Scorching",
      accent: "#f87171",
      accentMuted: "rgba(248, 113, 113, 0.18)",
      ringTrack: "rgba(248, 113, 113, 0.22)",
    };
  }

  if (takeHeat >= 55) {
    return {
      label: "Spicy",
      accent: "#fb923c",
      accentMuted: "rgba(251, 146, 60, 0.16)",
      ringTrack: "rgba(251, 146, 60, 0.22)",
    };
  }

  if (takeHeat >= 35) {
    return {
      label: "Warm",
      accent: "#60a5fa",
      accentMuted: "rgba(96, 165, 250, 0.14)",
      ringTrack: "rgba(96, 165, 250, 0.22)",
    };
  }

  return {
    label: "Mild",
    accent: "#94a3b8",
    accentMuted: "rgba(148, 163, 184, 0.12)",
    ringTrack: "rgba(148, 163, 184, 0.2)",
  };
}
