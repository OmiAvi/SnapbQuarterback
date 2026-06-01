import type { Quarterback } from "../app/lib/quarterbacks";

export function getHeadshotPath(quarterback: Pick<Quarterback, "id" | "espnPlayerId">) {
  if (quarterback.espnPlayerId) {
    return `/api/headshot/${quarterback.id}?playerId=${quarterback.espnPlayerId}`;
  }

  return `/api/headshot/${quarterback.id}`;
}
