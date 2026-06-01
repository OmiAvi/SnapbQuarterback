import { NextResponse } from "next/server";
import { QUARTERBACK_MAP } from "../../../quarterbacks";

function initialsAvatar(name: string, teamColor: string) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
    <rect width="256" height="256" rx="128" fill="${teamColor}"/>
    <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="#f8fafc" font-family="Inter, system-ui, sans-serif" font-size="88" font-weight="700">${initials}</text>
  </svg>`;

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400",
    },
  });
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const quarterback = QUARTERBACK_MAP.get(id);

  if (!quarterback) {
    return NextResponse.json({ error: "Unknown quarterback." }, { status: 404 });
  }

  if (!quarterback.espnId) {
    return initialsAvatar(quarterback.player, "#2563eb");
  }

  const headshotUrl = `https://a.espncdn.com/i/headshots/nfl/players/full/${quarterback.espnId}.png`;

  try {
    const response = await fetch(headshotUrl, {
      next: { revalidate: 60 * 60 * 24 },
    });

    if (!response.ok) {
      return initialsAvatar(quarterback.player, "#1d4ed8");
    }

    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": response.headers.get("content-type") ?? "image/png",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return initialsAvatar(quarterback.player, "#1d4ed8");
  }
}
