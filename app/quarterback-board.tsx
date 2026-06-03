"use client";

import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import html2canvas from "html2canvas";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import styles from "./page.module.css";
import { getHeadshotPath, type Quarterback } from "./lib/quarterbacks";

function encodeRanking(ranking: string[]) {
  return ranking.join(".");
}

function decodeRanking(value: string, quarterbackMap: Map<string, Quarterback>) {
  const rankingCode = value.trim();

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

function shuffle<T>(input: T[]) {
  const result = [...input];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }

  return result;
}

async function waitForImages(node: ParentNode) {
  const images = Array.from(node.querySelectorAll("img"));

  await Promise.all(
    images.map(
      (image) =>
        new Promise<void>((resolve) => {
          if (image.complete && image.naturalWidth > 0) {
            resolve();
            return;
          }

          image.addEventListener("load", () => resolve(), { once: true });
          image.addEventListener("error", () => resolve(), { once: true });
        }),
    ),
  );
}

function ShareCapMark() {
  // eslint-disable-next-line @next/next/no-img-element
  return <img alt="" aria-hidden="true" className={styles.shareCapMark} src="/Icon-Yellow.png" />;
}

const BLIND_COUNT_OPTIONS = [10, 15, 32] as const;
const BRACKET_ROUNDS = [
  { key: "r32", title: "Round of 32", matches: 16 },
  { key: "r16", title: "Round of 16", matches: 8 },
  { key: "qf", title: "Quarterfinals", matches: 4 },
  { key: "sf", title: "Semifinals", matches: 2 },
  { key: "f", title: "Final", matches: 1 },
] as const;
const BRACKET_BASE_SPAN = 10;
const INTERNS_AVERAGE_ORDER = [
  "Patrick Mahomes",
  "Josh Allen",
  "Lamar Jackson",
  "Matthew Stafford",
  "Dak Prescott",
  "Joe Burrow",
  "Caleb Williams",
  "Drake Maye",
  "Jared Goff",
  "Justin Herbert",
  "Jayden Daniels",
  "Bryce Young",
  "Jalen Hurts",
  "Jordan Love",
  "Bo Nix",
  "Brock Purdy",
  "Sam Darnold",
  "Baker Mayfield",
  "Trevor Lawrence",
  "Jaxson Dart",
  "C.J. Stroud",
  "Daniel Jones",
  "Cam Ward",
  "Kirk Cousins",
  "Tyler Shough",
  "Aaron Rodgers",
  "Malik Willis",
  "Kyler Murray",
  "Geno Smith",
  "Michael Penix Jr.",
  "Deshaun Watson",
  "Jacoby Brissett",
] as const;
const INTERNS_AVERAGE_BY_NAME: Record<(typeof INTERNS_AVERAGE_ORDER)[number], string> = {
  "Patrick Mahomes": "1.67",
  "Josh Allen": "2.00",
  "Lamar Jackson": "3.00",
  "Matthew Stafford": "4.17",
  "Dak Prescott": "7.67",
  "Joe Burrow": "8.00",
  "Caleb Williams": "8.17",
  "Drake Maye": "9.83",
  "Jared Goff": "10.17",
  "Justin Herbert": "11.33",
  "Jayden Daniels": "12.83",
  "Bryce Young": "13.83",
  "Jalen Hurts": "14.00",
  "Jordan Love": "14.00",
  "Bo Nix": "14.17",
  "Brock Purdy": "15.17",
  "Sam Darnold": "15.67",
  "Baker Mayfield": "17.00",
  "Trevor Lawrence": "17.00",
  "Jaxson Dart": "17.33",
  "C.J. Stroud": "19.17",
  "Daniel Jones": "23.00",
  "Cam Ward": "23.17",
  "Kirk Cousins": "25.17",
  "Tyler Shough": "25.33",
  "Aaron Rodgers": "25.50",
  "Malik Willis": "25.50",
  "Kyler Murray": "26.67",
  "Geno Smith": "29.00",
  "Michael Penix Jr.": "29.17",
  "Deshaun Watson": "29.50",
  "Jacoby Brissett": "29.83",
};
const CUSTOM_SCENARIO_VALUE = "__custom__";
const NO_SCENARIO_VALUE = "";
const SCENARIO_OPTIONS = [
  "Down by 4 with the ball and 2 minutes left",
  "Only able to throw with their left hand",
  "Who would you rather have date your daughter",
  "Based on deep ball accuracy",
  "Based on scrambling ability only",
  "Most likely to make the NBA",
  "Biggest Madden cheatcode",
  "Based on college career",
  "Best media presence",
  "Most likely to be broke in 10 years",
  "Most likely to get benched this season",
  "Most likely to choke in the playoffs",
  "Most fun to watch",
  "Based on who has the most to prove",
  "Best game day outfits",
  "Most overrated right now",
] as const;

type Mode = "classic" | "blind" | "bracket";
type BlindStage = "setup" | "playing" | "done";
type BracketPicks = (0 | 1 | null)[][];

function createBlindRoundState(ranking: string[], count: (typeof BLIND_COUNT_OPTIONS)[number]) {
  const [first, ...rest] = shuffle(ranking).slice(0, count);

  return {
    blindStage: first ? ("playing" as const) : ("setup" as const),
    blindCurrent: first ?? null,
    blindQueue: rest,
    blindSlots: Array(count).fill(null) as (string | null)[],
  };
}

function SortableRankingItem({
  id,
  index,
  quarterback,
}: {
  id: string;
  index: number;
  quarterback: Quarterback;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const internsAverage = INTERNS_AVERAGE_BY_NAME[quarterback.player as keyof typeof INTERNS_AVERAGE_BY_NAME];

  return (
    <li
      ref={setNodeRef}
      className={`${styles.rankingItem} ${isDragging ? styles.rankingItemDragging : ""}`}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <div className={styles.rankNumber}>{index + 1}</div>
      {quarterback.espnPlayerId ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={quarterback.player}
          className={styles.headshot}
          src={getHeadshotPath(quarterback.id, quarterback.playerEspnId ?? quarterback.espnPlayerId)}
        />
      ) : (
        <div className={styles.headshotPlaceholder} />
      )}
      <div className={styles.playerBlock}>
        <span className={styles.dragHint}>Drag to reorder</span>
        <strong>{quarterback.player}</strong>
        <span>
          {quarterback.teamName} · {quarterback.conference}
        </span>
        {internsAverage ? <small className={styles.internsAverage}>Interns avg: {internsAverage}</small> : null}
      </div>
      <button
        aria-label={`Drag ${quarterback.player}`}
        className={styles.dragHandleButton}
        type="button"
        {...attributes}
        {...listeners}
      >
        <span className={styles.dragHandle} aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      </button>
    </li>
  );
}

function subscribeToMount() {
  return () => {};
}

function buildInternsRanking(quarterbacks: Quarterback[]) {
  const remaining = new Map(quarterbacks.map((quarterback) => [quarterback.id, quarterback]));
  const ranking: string[] = [];

  for (const playerName of INTERNS_AVERAGE_ORDER) {
    const match = Array.from(remaining.values()).find((quarterback) => quarterback.player === playerName);

    if (!match) {
      continue;
    }

    ranking.push(match.id);
    remaining.delete(match.id);
  }

  return [...ranking, ...remaining.keys()];
}

export default function QuarterbackBoard({
  quarterbacks,
  initialRankingCode,
}: {
  quarterbacks: Quarterback[];
  initialRankingCode: string;
}) {
  const defaultRanking = useMemo(() => buildInternsRanking(quarterbacks), [quarterbacks]);
  const quarterbackMap = useMemo(
    () => new Map(quarterbacks.map((quarterback) => [quarterback.id, quarterback])),
    [quarterbacks],
  );

  const [ranking, setRanking] = useState(
    () => decodeRanking(initialRankingCode, quarterbackMap) ?? defaultRanking,
  );
  const [mode, setMode] = useState<Mode>("blind");
  const [blindCount, setBlindCount] = useState<(typeof BLIND_COUNT_OPTIONS)[number]>(10);
  const [blindStage, setBlindStage] = useState<BlindStage>("setup");
  const [blindQueue, setBlindQueue] = useState<string[]>([]);
  const [blindCurrent, setBlindCurrent] = useState<string | null>(null);
  const [blindSlots, setBlindSlots] = useState<(string | null)[]>([]);
  const [bracketSeeds, setBracketSeeds] = useState<string[]>([]);
  const [bracketPicks, setBracketPicks] = useState<BracketPicks>(() =>
    BRACKET_ROUNDS.map((round) => Array(round.matches).fill(null)),
  );
  const [selectedScenario, setSelectedScenario] = useState<string>(NO_SCENARIO_VALUE);
  const [customScenario, setCustomScenario] = useState("");
  const [scenarioPickerOpen, setScenarioPickerOpen] = useState(false);
  const [shareViewOpen, setShareViewOpen] = useState(false);
  const [shareMessage, setShareMessage] = useState("");
  const [sharePreviewScale, setSharePreviewScale] = useState(1);
  const shareStageRef = useRef<HTMLDivElement | null>(null);
  const sharePreviewRef = useRef<HTMLDivElement | null>(null);
  const shareCaptureRef = useRef<HTMLDivElement | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
  );
  const isMounted = useSyncExternalStore(subscribeToMount, () => true, () => false);

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

  useEffect(() => {
    const stage = shareStageRef.current;

    if (!stage || typeof ResizeObserver === "undefined") {
      return;
    }

    const updateScale = () => {
      const availableWidth = stage.clientWidth - 8;
      const nextScale = Math.min(1, Math.max(0.28, availableWidth / 1120));
      setSharePreviewScale(Number(nextScale.toFixed(3)));
    };

    updateScale();

    const observer = new ResizeObserver(() => updateScale());
    observer.observe(stage);

    return () => observer.disconnect();
  }, [shareViewOpen]);

  const canShareImageFile = useMemo(() => {
    if (!isMounted || typeof navigator === "undefined" || !navigator.share || !navigator.canShare) {
      return false;
    }

    const testFile = new File(["snapquarterback"], "snapquarterback-board.png", { type: "image/png" });
    return navigator.canShare({ files: [testFile] });
  }, [isMounted]);

  const placedCount = blindSlots.filter(Boolean).length;
  const blindResultRanking = useMemo(
    () => blindSlots.filter((id): id is string => Boolean(id)),
    [blindSlots],
  );
  const isSharingBlindMode = mode === "blind";
  const isSharingBlindResult = isSharingBlindMode && blindStage === "done" && blindResultRanking.length > 0;
  const isSharingBracket = mode === "bracket";
  const activeScenario =
    selectedScenario === CUSTOM_SCENARIO_VALUE ? customScenario.trim() : selectedScenario;
  const exportRanking = isSharingBlindResult ? blindResultRanking : ranking;
  const blindShareSlots = useMemo(
    () => (blindSlots.length > 0 ? blindSlots : Array(blindCount).fill(null)),
    [blindCount, blindSlots],
  );
  const exportEntries = useMemo(() => {
    if (isSharingBlindMode) {
      return blindShareSlots.map((id, index) => ({
        id,
        placement: index + 1,
      }));
    }

    return exportRanking.map((id, index) => ({
      id,
      placement: index + 1,
    }));
  }, [blindShareSlots, exportRanking, isSharingBlindMode]);
  const exportColumns = useMemo(() => {
    const rowsPerColumn = exportEntries.length > 16 ? 8 : Math.max(5, Math.ceil(exportEntries.length / 2));

    return Array.from({ length: Math.ceil(exportEntries.length / rowsPerColumn) }, (_, columnIndex) =>
      exportEntries.slice(columnIndex * rowsPerColumn, columnIndex * rowsPerColumn + rowsPerColumn),
    );
  }, [exportEntries]);
  const bracketChampionId = useMemo(() => {
    const finalPick = bracketPicks[BRACKET_ROUNDS.length - 1]?.[0];

    if (finalPick === null || bracketSeeds.length === 0) {
      return null;
    }

    const getWinner = (roundIndex: number, matchIndex: number): string | null => {
      const pick = bracketPicks[roundIndex]?.[matchIndex];
      if (pick === null) {
        return null;
      }

      if (roundIndex === 0) {
        return bracketSeeds[matchIndex * 2 + pick] ?? null;
      }

      return getWinner(roundIndex - 1, matchIndex * 2 + pick);
    };

    return getWinner(BRACKET_ROUNDS.length - 1, 0);
  }, [bracketPicks, bracketSeeds]);

  const resetRanking = () => {
    setRanking(defaultRanking);
  };

  const resetBracket = () => {
    setBracketPicks(BRACKET_ROUNDS.map((round) => Array(round.matches).fill(null)));
  };

  const randomizeBracket = () => {
    setBracketSeeds(shuffle(defaultRanking));
    setBracketPicks(BRACKET_ROUNDS.map((round) => Array(round.matches).fill(null)));
  };

  const resetBlind = () => {
    setBlindStage("setup");
    setBlindQueue([]);
    setBlindCurrent(null);
    setBlindSlots([]);
  };

  const startBlindRound = useCallback((count: (typeof BLIND_COUNT_OPTIONS)[number]) => {
    const nextRound = createBlindRoundState(defaultRanking, count);

    setBlindSlots(nextRound.blindSlots);
    setBlindQueue(nextRound.blindQueue);
    setBlindCurrent(nextRound.blindCurrent);
    setBlindStage(nextRound.blindStage);
  }, [defaultRanking]);

  useEffect(() => {
    if (!isMounted || mode !== "blind" || blindStage !== "setup" || blindSlots.length > 0) {
      return;
    }

    const timeout = window.setTimeout(() => {
      startBlindRound(blindCount);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [blindCount, blindSlots.length, blindStage, isMounted, mode, startBlindRound]);

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

    if (nextMode === "blind" && blindStage === "setup") {
      startBlindRound(blindCount);
    }

    if (nextMode === "bracket" && bracketSeeds.length === 0) {
      setBracketSeeds(shuffle(defaultRanking));
    }
  };

  function getBracketParticipant(roundIndex: number, matchIndex: number, side: 0 | 1): string | null {
    if (roundIndex === 0) {
      return bracketSeeds[matchIndex * 2 + side] ?? null;
    }

    return getBracketWinner(roundIndex - 1, matchIndex * 2 + side);
  }

  function getBracketWinner(roundIndex: number, matchIndex: number): string | null {
    const pick = bracketPicks[roundIndex]?.[matchIndex];

    if (pick === null) {
      return null;
    }

    return getBracketParticipant(roundIndex, matchIndex, pick);
  }

  const updateBracketPick = (roundIndex: number, matchIndex: number, side: 0 | 1) => {
    setBracketPicks((currentPicks) => {
      if (currentPicks[roundIndex]?.[matchIndex] === side) {
        return currentPicks;
      }

      const nextPicks = currentPicks.map((round) => [...round]);
      nextPicks[roundIndex][matchIndex] = side;

      let nextRoundIndex = roundIndex + 1;
      let currentMatchIndex = matchIndex;

      while (nextRoundIndex < nextPicks.length) {
        const nextMatchIndex = Math.floor(currentMatchIndex / 2);
        const fedSide = currentMatchIndex % 2;

        if (nextPicks[nextRoundIndex][nextMatchIndex] === fedSide) {
          nextPicks[nextRoundIndex][nextMatchIndex] = null;
          currentMatchIndex = nextMatchIndex;
          nextRoundIndex += 1;
          continue;
        }

        break;
      }

      return nextPicks;
    });
  };

  const bracketShareRounds = useMemo(
    () => {
      const getShareParticipant = (
        roundIndex: number,
        matchIndex: number,
        side: 0 | 1,
      ): string | null => {
        if (roundIndex === 0) {
          return bracketSeeds[matchIndex * 2 + side] ?? null;
        }

        return getShareWinner(roundIndex - 1, matchIndex * 2 + side);
      };

      const getShareWinner = (roundIndex: number, matchIndex: number): string | null => {
        const pick = bracketPicks[roundIndex]?.[matchIndex];

        if (pick === null) {
          return null;
        }

        return getShareParticipant(roundIndex, matchIndex, pick);
      };

      return BRACKET_ROUNDS.map((round, roundIndex) => ({
        ...round,
        matches: Array.from({ length: round.matches }, (_, matchIndex) => {
          const topId = getShareParticipant(roundIndex, matchIndex, 0);
          const bottomId = getShareParticipant(roundIndex, matchIndex, 1);
          const pick = bracketPicks[roundIndex]?.[matchIndex] ?? null;

          return {
            key: `${round.key}-${matchIndex}`,
            top: topId ? quarterbackMap.get(topId) ?? null : null,
            bottom: bottomId ? quarterbackMap.get(bottomId) ?? null : null,
            pick,
          };
        }),
      }));
    },
    [bracketPicks, quarterbackMap, bracketSeeds],
  );
  const bracketShareTree = useMemo(() => {
    const canvasWidth = 1068;
    const canvasHeight = 610;
    const cardWidth = 104;
    const cardHeight = 28;
    const finalCardWidth = 72;
    const finalCardHeight = 26;
    const topOffset = 46;
    const matchStride = 64;
    const slotGap = 8;
    const connectorGap = 12;
    const leftRoundX = [8, 118, 228, 338];
    const rightRoundX = [956, 846, 736, 626];
    const finalLeftX = 462;
    const finalRightX = 548;

    const lines: Array<{ key: string; d: string }> = [];

    const buildSide = (
      side: "left" | "right",
      rounds: (typeof bracketShareRounds)[number]["matches"][],
      xPositions: number[],
    ) => {
      const columns: Array<
        Array<{
          key: string;
          top: Quarterback | null;
          bottom: Quarterback | null;
          pick: 0 | 1 | null;
          topBox: { x: number; y: number; width: number; height: number };
          bottomBox: { x: number; y: number; width: number; height: number };
          centerY: number;
        }>
      > = [];
      let previousCenters: number[] = [];

      rounds.forEach((matches, roundIndex) => {
        const x = xPositions[roundIndex];
        const column = matches.map((match, matchIndex) => {
          const topY =
            roundIndex === 0
              ? topOffset + matchIndex * matchStride
              : previousCenters[matchIndex * 2] - cardHeight / 2;
          const bottomY =
            roundIndex === 0
              ? topY + cardHeight + slotGap
              : previousCenters[matchIndex * 2 + 1] - cardHeight / 2;
          const topCenterY = topY + cardHeight / 2;
          const bottomCenterY = bottomY + cardHeight / 2;
          const centerY = (topCenterY + bottomCenterY) / 2;

          return {
            key: `${side}-${roundIndex}-${matchIndex}`,
            top: match.top,
            bottom: match.bottom,
            pick: match.pick,
            topBox: { x, y: topY, width: cardWidth, height: cardHeight },
            bottomBox: { x, y: bottomY, width: cardWidth, height: cardHeight },
            centerY,
          };
        });

        columns.push(column);
        previousCenters = column.map((match) => match.centerY);
      });

      columns.forEach((column, roundIndex) => {
        const nextX =
          roundIndex === columns.length - 1
            ? side === "left"
              ? finalLeftX
              : finalRightX + finalCardWidth
            : side === "left"
              ? xPositions[roundIndex + 1]
              : xPositions[roundIndex + 1] + cardWidth;

        column.forEach((match) => {
          const joinX =
            side === "left"
              ? match.topBox.x + match.topBox.width + connectorGap
              : match.topBox.x - connectorGap;
          const startX =
            side === "left" ? match.topBox.x + match.topBox.width : match.topBox.x;
          const endX = nextX;
          const topY = match.topBox.y + match.topBox.height / 2;
          const bottomY = match.bottomBox.y + match.bottomBox.height / 2;
          const horizontalStart =
            side === "left"
              ? `M ${startX} ${topY} L ${joinX} ${topY} M ${startX} ${bottomY} L ${joinX} ${bottomY}`
              : `M ${startX} ${topY} L ${joinX} ${topY} M ${startX} ${bottomY} L ${joinX} ${bottomY}`;
          const vertical = `M ${joinX} ${topY} L ${joinX} ${bottomY}`;
          const carry = `M ${joinX} ${match.centerY} L ${endX} ${match.centerY}`;

          lines.push({
            key: `line-${match.key}`,
            d: `${horizontalStart} ${vertical} ${carry}`,
          });
        });
      });

      return columns;
    };

    const leftColumns = buildSide(
      "left",
      [
        bracketShareRounds[0]?.matches.slice(0, 8) ?? [],
        bracketShareRounds[1]?.matches.slice(0, 4) ?? [],
        bracketShareRounds[2]?.matches.slice(0, 2) ?? [],
        bracketShareRounds[3]?.matches.slice(0, 1) ?? [],
      ],
      leftRoundX,
    );

    const rightColumns = buildSide(
      "right",
      [
        bracketShareRounds[0]?.matches.slice(8, 16) ?? [],
        bracketShareRounds[1]?.matches.slice(4, 8) ?? [],
        bracketShareRounds[2]?.matches.slice(2, 4) ?? [],
        bracketShareRounds[3]?.matches.slice(1, 2) ?? [],
      ],
      rightRoundX,
    );

    const finalMatch = bracketShareRounds[4]?.matches[0] ?? { top: null, bottom: null, pick: null };
    const finalCenterY = leftColumns[3]?.[0]?.centerY ?? canvasHeight / 2;
    const finalTopBox = {
      x: finalLeftX,
      y: finalCenterY - finalCardHeight / 2,
      width: finalCardWidth,
      height: finalCardHeight,
    };
    const finalBottomBox = {
      x: finalRightX,
      y: finalCenterY - finalCardHeight / 2,
      width: finalCardWidth,
      height: finalCardHeight,
    };

    lines.push({
      key: "line-final-center",
      d: `M ${finalTopBox.x + finalTopBox.width} ${finalCenterY} L ${finalBottomBox.x} ${finalCenterY}`,
    });

    return {
      canvasWidth,
      canvasHeight,
      lines,
      leftColumns,
      rightColumns,
      finalMatch: {
        ...finalMatch,
        topBox: finalTopBox,
        bottomBox: finalBottomBox,
      },
    };
  }, [bracketShareRounds]);
  const handleClassicDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) {
      return;
    }

    setRanking((currentRanking) => {
      const oldIndex = currentRanking.indexOf(String(active.id));
      const newIndex = currentRanking.indexOf(String(over.id));

      if (oldIndex === -1 || newIndex === -1) {
        return currentRanking;
      }

      return arrayMove(currentRanking, oldIndex, newIndex);
    });
  };

  const classicRankingList = (
    <ol className={styles.rankingList}>
      {ranking.map((id, index) => {
        const quarterback = quarterbackMap.get(id);
        const internsAverage = quarterback
          ? INTERNS_AVERAGE_BY_NAME[quarterback.player as keyof typeof INTERNS_AVERAGE_BY_NAME]
          : undefined;

        if (!quarterback) {
          return null;
        }

        return isMounted ? (
          <SortableRankingItem id={quarterback.id} index={index} key={quarterback.id} quarterback={quarterback} />
        ) : (
          <li className={styles.rankingItem} key={quarterback.id}>
            <div className={styles.rankNumber}>{index + 1}</div>
            {quarterback.espnPlayerId ? (
              // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt={quarterback.player}
                  className={styles.headshot}
                  src={getHeadshotPath(quarterback.id, quarterback.playerEspnId ?? quarterback.espnPlayerId)}
                />
            ) : (
              <div className={styles.headshotPlaceholder} />
            )}
            <div className={styles.playerBlock}>
              <span className={styles.dragHint}>Drag to reorder</span>
              <strong>{quarterback.player}</strong>
              <span>
                {quarterback.teamName} · {quarterback.conference}
              </span>
              {internsAverage ? (
                <small className={styles.internsAverage}>Interns avg: {internsAverage}</small>
              ) : null}
            </div>
            <div className={styles.dragHandleButton} aria-hidden="true">
              <span className={styles.dragHandle}>
                <span />
                <span />
                <span />
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );

  const copyValue = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setShareMessage(`${label} copied.`);
    } catch {
      setShareMessage(`Could not copy ${label.toLowerCase()}.`);
    }
  };

  const captureShareImageBlob = async () => {
    if (!shareCaptureRef.current) {
      throw new Error("not-ready");
    }

    await waitForImages(shareCaptureRef.current);

    const canvas = await html2canvas(shareCaptureRef.current, {
      backgroundColor: "#f8fbff",
      scale: window.devicePixelRatio > 1 ? 2 : 1,
      imageTimeout: 0,
      useCORS: true,
      width: 1120,
      windowWidth: 1400,
      windowHeight: 1800,
      scrollX: 0,
      scrollY: 0,
      onclone: async (documentClone) => {
        documentClone.documentElement.style.width = "1400px";
        documentClone.body.style.width = "1400px";

        const clonedCaptureRoot = documentClone.querySelector('[data-share-capture-root="true"]');

        if (clonedCaptureRoot) {
          await waitForImages(clonedCaptureRoot);
        }
      },
    });
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve));

    if (!blob) {
      throw new Error("no-blob");
    }

    return blob;
  };

  const downloadShareImage = async () => {
    try {
      const blob = await captureShareImageBlob();
      const file = new File([blob], "snapquarterback-board.png", { type: "image/png" });

      if (
        canShareImageFile &&
        typeof navigator !== "undefined" &&
        navigator.share &&
        navigator.canShare?.({ files: [file] })
      ) {
        await navigator.share({
          title: "SnapQuarterback board",
          text: "Save or share my QB rankings image.",
          files: [file],
        });
        setShareMessage("Image ready to save.");
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "snapquarterback-board.png";
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
          title: "SnapQuarterback board",
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

  const openBlindShare = () => {
    setShareViewOpen(true);
  };

  const renderScenarioSelector = () => (
    <>
      <button
        className={styles.secondaryButton}
        onClick={() => setScenarioPickerOpen((current) => !current)}
        type="button"
      >
        {scenarioPickerOpen ? "Hide scenario" : "Choose your scenario"}
      </button>
      {scenarioPickerOpen ? (
        <div className={styles.scenarioCard}>
          <div className={styles.scenarioHeader}>
            <span className={styles.cardLabel}>Scenario</span>
            <p>Choose the lens for how you want to rank these quarterbacks.</p>
          </div>
          <select
            className={styles.scenarioSelect}
            onChange={(event) => setSelectedScenario(event.target.value)}
            value={selectedScenario}
          >
            <option value={CUSTOM_SCENARIO_VALUE}>Write your own</option>
            <option value={NO_SCENARIO_VALUE}>No scenario selected</option>
            {SCENARIO_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {selectedScenario === CUSTOM_SCENARIO_VALUE ? (
            <input
              className={styles.scenarioInput}
              onChange={(event) => setCustomScenario(event.target.value)}
              placeholder="Enter your own scenario"
              type="text"
              value={customScenario}
            />
          ) : null}
        </div>
      ) : null}
    </>
  );

  const renderRankingSharePreview = (
    ref: React.RefObject<HTMLDivElement | null>,
    options?: { captureRoot?: boolean },
  ) => (
    <div
      className={`${styles.sharePreview} ${styles.sharePreviewDesktop}`}
      data-share-capture-root={options?.captureRoot ? "true" : undefined}
      ref={ref}
    >
      <header className={styles.sharePreviewHeader}>
        <div>
          <h3>{isSharingBlindMode ? "Blind QB ranking" : "Your QB ranking"}</h3>
          <p className={styles.shareSubcopy}>Saved on {new Date().toLocaleDateString()}</p>
        </div>
        <ShareCapMark />
        {!isSharingBlindMode && activeScenario ? (
          <div className={styles.shareScenario}>
            <span>Scenario</span>
            <strong>{activeScenario}</strong>
          </div>
        ) : null}
      </header>

      <div className={`${styles.shareGrid} ${isSharingBlindMode ? styles.shareGridBlind : ""}`}>
        {exportColumns.map((column, columnIndex) => (
          <div className={styles.shareColumn} key={`share-column-${columnIndex}`}>
            {column.map((entry) => {
              const quarterback = entry.id ? quarterbackMap.get(entry.id) : null;

              return (
                <div className={styles.shareRow} key={`share-${entry.id ?? `open-${entry.placement}`}`}>
                  <span className={styles.shareRank}>{entry.placement}</span>
                  {quarterback?.espnPlayerId ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt={quarterback.player}
                      className={styles.shareHeadshot}
                      src={getHeadshotPath(quarterback.id, quarterback.playerEspnId ?? quarterback.espnPlayerId)}
                    />
                  ) : (
                    <div className={styles.shareHeadshotPlaceholder} />
                  )}
                  <div className={styles.sharePlayer}>
                    <strong>{quarterback?.player ?? "Not selected yet"}</strong>
                    <span>{quarterback?.team ?? "Open slot"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <footer className={styles.shareFooter}>
        <span>snapquarterback</span>
        <span>Build yours. Save it. Debate it.</span>
      </footer>
    </div>
  );

  const renderBracketSharePreview = (
    ref: React.RefObject<HTMLDivElement | null>,
    options?: { captureRoot?: boolean },
  ) => (
    <div
      className={`${styles.sharePreview} ${styles.sharePreviewDesktop} ${styles.shareBracketPreview}`}
      data-share-capture-root={options?.captureRoot ? "true" : undefined}
      ref={ref}
    >
      <header className={styles.sharePreviewHeader}>
        <div>
          <h3>Your QB bracket</h3>
          <p className={styles.shareSubcopy}>Saved on {new Date().toLocaleDateString()}</p>
        </div>
        <ShareCapMark />
        <div className={styles.shareBracketHeaderAside}>
          {activeScenario ? (
            <div className={styles.shareScenario}>
              <span>Scenario</span>
              <strong>{activeScenario}</strong>
            </div>
          ) : null}
          <div className={styles.shareChampionCard}>
            <span>Champion</span>
            <strong>{bracketChampionId ? quarterbackMap.get(bracketChampionId)?.player : "Still deciding"}</strong>
          </div>
        </div>
      </header>

      <div className={styles.shareBracketTree}>
        <svg
          aria-hidden="true"
          className={styles.shareBracketSvg}
          viewBox={`0 0 ${bracketShareTree.canvasWidth} ${bracketShareTree.canvasHeight}`}
        >
          {bracketShareTree.lines.map((line) => (
            <path className={styles.shareBracketPath} d={line.d} key={line.key} />
          ))}
        </svg>

        {[...bracketShareTree.leftColumns.flat(), ...bracketShareTree.rightColumns.flat()].map((match) =>
          [0, 1].map((side) => {
            const quarterback = side === 0 ? match.top : match.bottom;
            const box = side === 0 ? match.topBox : match.bottomBox;
            const isPicked = match.pick === side;

            return (
              <div
                className={`${styles.shareBracketNode} ${isPicked ? styles.shareBracketNodePicked : ""}`}
                key={`${match.key}-${side}`}
                style={{
                  left: `${box.x}px`,
                  top: `${box.y}px`,
                  width: `${box.width}px`,
                  height: `${box.height}px`,
                }}
              >
                {quarterback?.espnPlayerId ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt={quarterback.player}
                    className={styles.shareBracketNodeHeadshot}
                    src={getHeadshotPath(quarterback.id, quarterback.playerEspnId ?? quarterback.espnPlayerId)}
                  />
                ) : (
                  <div className={styles.shareBracketNodePlaceholder} />
                )}
                <span className={styles.shareBracketNodeName}>{quarterback?.player ?? "TBD"}</span>
              </div>
            );
          }),
        )}

        {[0, 1].map((side) => {
          const quarterback = side === 0 ? bracketShareTree.finalMatch.top : bracketShareTree.finalMatch.bottom;
          const box = side === 0 ? bracketShareTree.finalMatch.topBox : bracketShareTree.finalMatch.bottomBox;
          const isPicked = bracketShareTree.finalMatch.pick === side;

          return (
            <div
              className={`${styles.shareBracketNode} ${styles.shareBracketFinalNode} ${isPicked ? styles.shareBracketNodePicked : ""}`}
              key={`final-${side}`}
              style={{
                left: `${box.x}px`,
                top: `${box.y}px`,
                width: `${box.width}px`,
                height: `${box.height}px`,
              }}
            >
              {quarterback?.espnPlayerId ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt={quarterback.player}
                  className={styles.shareBracketNodeHeadshot}
                  src={getHeadshotPath(quarterback.id, quarterback.playerEspnId ?? quarterback.espnPlayerId)}
                />
              ) : (
                <div className={styles.shareBracketNodePlaceholder} />
              )}
              <span className={styles.shareBracketNodeName}>{quarterback?.player ?? "TBD"}</span>
            </div>
          );
        })}
      </div>

      <footer className={styles.shareFooter}>
        <span>snapquarterback</span>
        <span>Build yours. Save it. Debate it.</span>
      </footer>
    </div>
  );

  const renderSharePreview = (ref: React.RefObject<HTMLDivElement | null>, options?: { captureRoot?: boolean }) =>
    isSharingBracket ? renderBracketSharePreview(ref, options) : renderRankingSharePreview(ref, options);

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroTop}>
          <div>
            <p className={styles.eyebrow}>NFL QB Tiers</p>
            <h1>Rank every current{"\u00a0"}starting quarterback your way.</h1>
            <p className={styles.lede}>
              Test your instincts in blind mode, settle it in the QB bracket, or build a full 1-to-32
              board in classic mode.
            </p>
          </div>
          <div className={styles.heroArtWrap}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt="Top NFL quarterbacks lineup"
              className={styles.heroArt}
              src="/hero-qbs.png"
            />
          </div>
        </div>
      </section>

      <section className={styles.content}>
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <div className={styles.panelActions}>
              <div className={styles.modeToggle}>
                <button
                  className={`${styles.modeButton} ${mode === "blind" ? styles.modeButtonActive : ""}`}
                  onClick={() => selectMode("blind")}
                  type="button"
                >
                  Blind
                </button>
                <button
                  className={`${styles.modeButton} ${mode === "bracket" ? styles.modeButtonActive : ""}`}
                  onClick={() => selectMode("bracket")}
                  type="button"
                >
                  Bracket
                </button>
                <button
                  className={`${styles.modeButton} ${mode === "classic" ? styles.modeButtonActive : ""}`}
                  onClick={() => selectMode("classic")}
                  type="button"
                >
                  Classic
                </button>
              </div>
            </div>
          </div>

          {mode === "classic" ? (
            isMounted ? (
              <DndContext collisionDetection={closestCenter} onDragEnd={handleClassicDragEnd} sensors={sensors}>
                <SortableContext items={ranking} strategy={verticalListSortingStrategy}>
                  <div className={styles.classicBoard}>
                    <div className={styles.modeBanner}>
                      <div>
                        <span className={styles.cardLabel}>Classic Mode</span>
                        <strong>Build your full QB board</strong>
                        <span>Drag player cards up and down until the ranking matches your take.</span>
                      </div>
                      <div className={`${styles.modeBannerActions} ${styles.modeBannerActionsCentered}`}>
                        <button className={styles.secondaryButton} onClick={resetRanking} type="button">
                          Reset Board
                        </button>
                        {renderScenarioSelector()}
                      </div>
                    </div>
                    <div className={styles.panelShareRow}>
                      <button
                        className={`${styles.primaryButton} ${styles.shareModeButton}`}
                        onClick={() => setShareViewOpen(true)}
                        type="button"
                      >
                        Share Board
                      </button>
                    </div>
                    {classicRankingList}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <div className={styles.classicBoard}>
                <div className={styles.modeBanner}>
                  <div>
                    <span className={styles.cardLabel}>Classic Mode</span>
                    <strong>Build your full QB board</strong>
                    <span>Drag player cards up and down until the ranking matches your take.</span>
                  </div>
                  <div className={`${styles.modeBannerActions} ${styles.modeBannerActionsCentered}`}>
                    <button className={styles.secondaryButton} onClick={resetRanking} type="button">
                      Reset Board
                    </button>
                    {renderScenarioSelector()}
                  </div>
                </div>
                <div className={styles.panelShareRow}>
                  <button
                    className={`${styles.primaryButton} ${styles.shareModeButton}`}
                    onClick={() => setShareViewOpen(true)}
                    type="button"
                  >
                    Share Board
                  </button>
                </div>
                {classicRankingList}
              </div>
            )
          ) : null}

          {mode === "bracket" ? (
            <div className={styles.bracketBoard}>
              <div className={styles.modeBanner}>
                <div>
                  <span className={styles.cardLabel}>Bracket Mode</span>
                  <strong>{bracketChampionId ? `${quarterbackMap.get(bracketChampionId)?.player} is your champion` : "Pick your QB champion"}</strong>
                  <span>
                    {bracketChampionId
                      ? "Reset to clear your picks, or randomize for a fresh field."
                      : "Use reset to clear picks or randomize to shuffle the field."}
                  </span>
                </div>
                <div className={styles.modeBannerActions}>
                  <button className={styles.primaryButton} onClick={randomizeBracket} type="button">
                    Randomize Matchups
                  </button>
                  <button className={styles.secondaryButton} onClick={resetBracket} type="button">
                    Reset Bracket
                  </button>
                  {renderScenarioSelector()}
                </div>
              </div>
              <div className={styles.panelShareRow}>
                <button
                  className={`${styles.primaryButton} ${styles.shareModeButton}`}
                  onClick={() => setShareViewOpen(true)}
                  type="button"
                >
                  Share Bracket
                </button>
              </div>
              <div className={styles.bracketGrid}>
                {BRACKET_ROUNDS.map((round, roundIndex) => (
                  <section className={styles.bracketRound} key={round.key}>
                    <div className={styles.bracketRoundTitle}>{round.title}</div>
                    <div className={styles.bracketMatches}>
                      {Array.from({ length: round.matches }, (_, matchIndex) => {
                        const topId = getBracketParticipant(roundIndex, matchIndex, 0);
                        const bottomId = getBracketParticipant(roundIndex, matchIndex, 1);
                        const topQuarterback = topId ? quarterbackMap.get(topId) : null;
                        const bottomQuarterback = bottomId ? quarterbackMap.get(bottomId) : null;
                        const pick = bracketPicks[roundIndex]?.[matchIndex] ?? null;
                        const locked = !topQuarterback || !bottomQuarterback;
                        const slotSpan = BRACKET_BASE_SPAN * 2 ** roundIndex;
                        const slotStart = 1 + matchIndex * slotSpan;

                        return (
                          <div
                            className={styles.bracketMatch}
                            key={`${round.key}-${matchIndex}`}
                            style={{
                              gridRow: `${slotStart} / span ${slotSpan}`,
                            }}
                          >
                            <div className={`${styles.bracketMatchCard} ${locked ? styles.bracketMatchLocked : ""}`}>
                              {[topQuarterback, bottomQuarterback].map((quarterback, side) => {
                                const isPicked = pick === side;
                                const isEliminated = pick !== null && pick !== side && quarterback;

                                return (
                                  <button
                                    aria-pressed={isPicked}
                                    className={`${styles.bracketSlot} ${isPicked ? styles.bracketSlotPicked : ""} ${isEliminated ? styles.bracketSlotEliminated : ""}`}
                                    disabled={locked || !quarterback}
                                    key={quarterback?.id ?? `${round.key}-${matchIndex}-${side}`}
                                    onClick={() => updateBracketPick(roundIndex, matchIndex, side as 0 | 1)}
                                    type="button"
                                  >
                                    <span className={styles.bracketSeed}>{quarterback ? quarterback.team : "TBD"}</span>
                                    <span className={styles.bracketName}>{quarterback?.player ?? "TBD"}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          ) : null}

          {mode === "blind" && blindStage === "setup" ? (
            <div className={styles.blindSetup}>
              <div className={styles.panelShareRow}>
                <button
                  className={`${styles.primaryButton} ${styles.shareModeButton}`}
                  onClick={openBlindShare}
                  type="button"
                >
                  Share Blind Ranking
                </button>
              </div>
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
              <div className={`${styles.currentCard} ${styles.currentCardHeader}`}>
                <div className={styles.currentCardContent}>
                  <span className={styles.cardLabel}>
                    Place {placedCount + 1} of {blindSlots.length}
                  </span>
                  <strong>{quarterbackMap.get(blindCurrent)?.player}</strong>
                  <span>
                    {quarterbackMap.get(blindCurrent)?.teamName} · {quarterbackMap.get(blindCurrent)?.conference}
                  </span>
                  <span className={styles.blindHint}>
                    {blindQueue.length} still to come. Choose a slot now. No take-backs.
                  </span>
                </div>
                <button className={styles.secondaryButton} onClick={() => startBlindRound(blindCount)} type="button">
                  Start Over
                </button>
              </div>
              <div className={styles.panelShareRow}>
                <button
                  className={`${styles.primaryButton} ${styles.shareModeButton}`}
                  onClick={openBlindShare}
                  type="button"
                >
                  Share Blind Ranking
                </button>
              </div>
              <ol className={styles.slotList}>
                {blindSlots.map((id, index) => {
                  const placedQuarterback = id ? quarterbackMap.get(id) : null;

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
              <div className={`${styles.currentCard} ${styles.currentCardHeader}`}>
                <div className={styles.currentCardContent}>
                  <span className={styles.cardLabel}>Round complete</span>
                  <strong>Your blind top {blindSlots.length}</strong>
                  <span>Apply these locked results to your full board or run another blind round.</span>
                </div>
                <button className={styles.secondaryButton} onClick={() => startBlindRound(blindCount)} type="button">
                  Start Over
                </button>
              </div>
              <div className={styles.panelShareRow}>
                <button
                  className={`${styles.primaryButton} ${styles.shareModeButton}`}
                  onClick={openBlindShare}
                  type="button"
                >
                  Share Blind Ranking
                </button>
              </div>
              <ol className={styles.rankingList}>
                {blindSlots.map((id, index) => {
                  const quarterback = id ? quarterbackMap.get(id) : null;

                  if (!quarterback) {
                    return null;
                  }

                  return (
                    <li className={styles.rankingItem} key={`blind-finish-${quarterback.id}`}>
                      {quarterback.espnPlayerId ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          alt={quarterback.player}
                          className={styles.headshot}
                          src={getHeadshotPath(quarterback.id, quarterback.playerEspnId ?? quarterback.espnPlayerId)}
                        />
                      ) : (
                        <div className={styles.rankNumber}>{index + 1}</div>
                      )}
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
                <h2>
                  {isSharingBlindMode
                    ? "Share your blind ranking"
                    : isSharingBracket
                      ? "Share your bracket"
                      : "Share your board"}
                </h2>
                <p>
                  {isSharingBlindMode
                    ? "Save the blind-ranking card below. Unpicked slots stay marked until you place each player."
                    : isSharingBracket
                      ? "Copy the link or save the bracket card below."
                      : "Copy the link or save the full ranking card below."}
                </p>
              </div>
              {shareMessage ? <span className={styles.copyMessage}>{shareMessage}</span> : null}
            </div>

            <div className={`${styles.shareControls} ${isSharingBlindMode ? styles.shareControlsMuted : ""}`}>
              <label className={styles.fieldLabel} htmlFor="share-url">
                {isSharingBlindMode ? "Board link" : "Share link"}
              </label>
              <textarea className={styles.textarea} id="share-url" readOnly value={shareUrl} />
              {isSharingBlindMode ? (
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
                <button className={styles.primaryButton} onClick={downloadShareImage} type="button">
                  {canShareImageFile ? "Save image" : "Download PNG"}
                </button>
              </div>
            </div>

            <div className={styles.shareStage} ref={shareStageRef}>
              <div className={styles.sharePreviewScaler} style={{ zoom: sharePreviewScale }}>
                {renderSharePreview(sharePreviewRef)}
              </div>
            </div>

            <div className={styles.shareCaptureSurface} aria-hidden="true">
              {renderSharePreview(shareCaptureRef, { captureRoot: true })}
            </div>

            <div className={styles.shareModalActions}>
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
