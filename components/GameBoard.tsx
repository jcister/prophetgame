"use client";

import clsx from "clsx";
import Image from "next/image";
import type { CSSProperties } from "react";
import type { CardFeedback, GameCard, LayoutMode } from "@/types/game";

interface GameBoardProps {
  cards: GameCard[];
  selectedId: string | null;
  feedback: Record<string, CardFeedback | undefined>;
  revealYears: boolean;
  onSelect: (id: string) => void;
  layoutMode: LayoutMode;
  cardScale: number;
  isInteractive: boolean;
}

const feedbackIcon: Record<CardFeedback, string> = {
  correct: "✓",
  incorrect: "✗",
  pending: "?"
};

export function GameBoard({
  cards,
  selectedId,
  feedback,
  revealYears,
  onSelect,
  layoutMode,
  cardScale,
  isInteractive
}: GameBoardProps) {
  const isGallery = layoutMode === "gallery";
  const baseGapPx = 8;
  const gapPx = Math.max(4, Math.round(baseGapPx * cardScale));
  const galleryMinWidth = Math.round(110 * cardScale);
  const containerStyle: CSSProperties = isGallery
    ? {
        gap: `${gapPx}px`,
        gridTemplateColumns: `repeat(auto-fit, minmax(${galleryMinWidth}px, 1fr))`,
        gridAutoRows: "1fr"
      }
    : {
        gap: `${gapPx}px`
      };
  const buttonPadding = Math.max(8, Math.round(12 * cardScale));

  return (
    <div
      className={clsx(
        "w-full px-2",
        isGallery ? "grid" : "flex flex-col"
      )}
      style={containerStyle}
    >
      {cards.map((card) => {
        const state = feedback[card.id] ?? "pending";
        const isSelected = selectedId === card.id;
        const interactionClasses = isInteractive
          ? isSelected
            ? "-translate-y-1 ring-4 ring-accent"
            : "hover:-translate-y-1"
          : "";
        const stateClasses =
          state === "correct"
            ? "border-success/80 bg-success/15"
            : state === "incorrect"
            ? "border-danger/70 bg-danger/10"
            : "border-black bg-panel/95";

        return (
          <button
            type="button"
            key={card.id}
            onClick={() => onSelect(card.id)}
            className={clsx(
              "relative rounded-sm border-2 text-left transition-transform duration-150",
              "focus:outline-none focus-visible:ring-4 focus-visible:ring-accent/60",
              "disabled:cursor-default disabled:opacity-100",
              interactionClasses,
              stateClasses
            )}
            disabled={!isInteractive}
            style={{ padding: `${buttonPadding}px` }}
          >
            {isGallery ? (
              <GalleryCardContent
                card={card}
                state={state}
                revealYears={revealYears}
                cardScale={cardScale}
              />
            ) : (
              <ListCardContent
                card={card}
                state={state}
                revealYears={revealYears}
                cardScale={cardScale}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

interface CardContentProps {
  card: GameCard;
  state: CardFeedback;
  revealYears: boolean;
  cardScale: number;
}

function GalleryCardContent({ card, state, revealYears, cardScale }: CardContentProps) {
  const imageMaxHeight = Math.round(168 * cardScale);
  return (
    <div className="card-frame gap-2">
      <div className="relative w-full">
        <Image
          src={card.image}
          alt={card.name}
          width={220}
          height={294}
          className="w-full rounded-sm border-2 border-black object-cover"
          style={{ aspectRatio: "3 / 4", maxHeight: `${imageMaxHeight}px` }}
        />
        {state !== "pending" && (
          <FeedbackBadge
            state={state}
            className="absolute -top-3 -right-3"
            ariaLabel={state === "correct" ? "Correct position" : "Incorrect position"}
          />
        )}
      </div>
      <div className="flex flex-col items-center gap-2">
        <p className="card-name text-center text-xs">{card.name}</p>
        {revealYears && (
          <p className="text-[9px] uppercase tracking-[0.18em] text-slate-300">{card.years}</p>
        )}
      </div>
    </div>
  );
}

function ListCardContent({ card, state, revealYears, cardScale }: CardContentProps) {
  const paddingY = Math.max(6, Math.round(8 * cardScale));
  const paddingX = Math.max(10, Math.round(12 * cardScale));
  return (
    <div
      className="flex items-center justify-between gap-3 rounded-sm border border-black/30 bg-panel/80"
      style={{ padding: `${paddingY}px ${paddingX}px` }}
    >
      <div className="flex flex-col items-start gap-1">
        <p className="card-name text-left text-xs">{card.name}</p>
        {revealYears && (
          <p className="text-[9px] uppercase tracking-[0.18em] text-slate-300">{card.years}</p>
        )}
      </div>
      {state !== "pending" && (
        <FeedbackBadge
          state={state}
          ariaLabel={state === "correct" ? "Correct position" : "Incorrect position"}
          size="sm"
        />
      )}
    </div>
  );
}

interface FeedbackBadgeProps {
  state: CardFeedback;
  className?: string;
  ariaLabel: string;
  size?: "sm" | "md";
}

function FeedbackBadge({ state, className = "", ariaLabel, size = "md" }: FeedbackBadgeProps) {
  const sizeClasses = size === "sm" ? "h-6 w-6 text-sm" : "h-8 w-8 text-base";

  return (
    <span
      className={clsx(
        "flex items-center justify-center rounded-sm border-2 border-black",
        sizeClasses,
        state === "correct" ? "bg-success text-black" : "bg-danger text-white",
        className
      )}
      aria-label={ariaLabel}
    >
      {feedbackIcon[state]}
    </span>
  );
}
