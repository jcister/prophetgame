"use client";

import { presidents } from "@/data/presidents";
import type { GameCard, GameMode, GameResult } from "@/types/game";
import { ConfettiOverlay } from "./ConfettiOverlay";

interface EndScreenProps {
  score: number;
  mode: GameMode;
  result: GameResult;
  onPlayAgain: () => void;
  onRequestExit: () => void;
  incorrectCards: GameCard[];
}

const PERFECT_SCORE = 18;

function getCelebrationCopy(score: number) {
  if (score >= PERFECT_SCORE) {
    return {
      heading: "Perfect Prophet Historian!",
      subheading: "All 18 leaders in flawless order."
    };
  }

  if (score >= 14) {
    return {
      heading: "Chronology Champion!",
      subheading: "Your memory is almost prophetic—so close to perfect."
    };
  }

  if (score >= 9) {
    return {
      heading: "Timeline Tracker!",
      subheading: "Great progress—fine tune those swaps for a higher score."
    };
  }

  return {
    heading: "Rising Archivist!",
    subheading: "Keep practicing and the order will be second nature."
  };
}

function getSubmittedCopy(score: number, perfect: boolean) {
  if (perfect) {
    return {
      heading: "Flawless Timeline!",
      subheading: "Every prophet in perfect order—amazing work."
    };
  }

  if (score >= 14) {
    return {
      heading: "Close to Prophetic!",
      subheading: "Just a few more swaps and you'll master the sequence."
    };
  }

  return {
    heading: "Order Submitted!",
    subheading: "Review the notes below and take another shot."
  };
}

export function EndScreen({
  score,
  mode,
  result,
  onPlayAgain,
  onRequestExit,
  incorrectCards
}: EndScreenProps) {
  const timeUsed = result.elapsedSeconds;
  const perfect = score >= PERFECT_SCORE;
  const showConfetti = result.reason !== "time";
  const celebration = getCelebrationCopy(score);
  const submittedCopy = getSubmittedCopy(score, perfect);

  let heading: string;
  let subheading: string;

  if (result.reason === "completed") {
    heading = celebration.heading;
    subheading = celebration.subheading;
  } else if (result.reason === "submitted") {
    heading = submittedCopy.heading;
    subheading = submittedCopy.subheading;
  } else {
    heading = "Time's Up!";
    subheading = "The clock ran out—review the notes and give it another go.";
  }

  return (
    <>
      <ConfettiOverlay active={showConfetti} />
      <section className="flex min-h-screen w-full flex-col items-center justify-center gap-6 px-4 py-10 text-center sm:gap-8 sm:py-0">
        <div className="pixel-border w-full max-w-xl bg-panel/90 px-6 py-8 sm:px-10 sm:py-12">
          <h2 className="text-2xl text-accent drop-shadow-[2px_2px_0_#000]">{heading}</h2>
          <p className="mt-4 text-[11px] uppercase tracking-[0.24em] text-slate-300">
            {subheading}
          </p>
          <p className="mt-6 text-sm text-slate-200">
            Final Score: <span className="text-accent">{score}</span>
            <span className="text-xs text-slate-400"> / {PERFECT_SCORE}</span>
          </p>
          <p className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-300">
            Mode: {mode === "timed" ? "Timed Challenge" : "Standard Game"}
          </p>
          <p className="mt-2 text-xs text-slate-300">Time Elapsed: {formatSeconds(timeUsed)}</p>
          {mode === "timed" && (
            <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-slate-400">
              Time Remaining: {formatSeconds(result.remainingSeconds)}
            </p>
          )}
          <div className="mt-8 grid gap-6 text-left text-sm lg:grid-cols-2">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-300">
                Prophets to Review
              </p>
              <ul className="mt-3 grid gap-2 text-xs sm:text-sm">
                {incorrectCards.length > 0 ? (
                  incorrectCards.map((card) => (
                    <li key={card.id} className="pixel-border bg-panel/70 px-4 py-3 text-slate-200">
                      <span className="block font-semibold text-accent">{card.name}</span>
                      <span className="text-[11px] uppercase tracking-[0.2em] text-slate-300">
                        {card.years}
                      </span>
                    </li>
                  ))
                ) : (
                  <li className="pixel-border bg-panel/70 px-4 py-3 text-center text-xs text-success">
                    Perfect order—nothing to review!
                  </li>
                )}
              </ul>
            </div>
            <div className="self-start">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-300">
                Locked-In Matches
              </p>
              <CorrectList incorrectIds={incorrectCards.map((card) => card.id)} />
            </div>
          </div>
        </div>
        <div className="flex w-full max-w-md flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
          <button type="button" className="pixel-button w-full sm:w-auto" onClick={onPlayAgain}>
            Play Again
          </button>
          <button type="button" className="pixel-button w-full sm:w-auto" onClick={onRequestExit}>
            Exit to Title
          </button>
        </div>
      </section>
    </>
  );
}

function formatSeconds(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

interface CorrectListProps {
  incorrectIds: string[];
}

function CorrectList({ incorrectIds }: CorrectListProps) {
  const { correctCards, total } = useCorrectCards(incorrectIds);

  if (total === 0) {
    return (
      <p className="mt-3 text-xs text-slate-400">
        Start a round to see your correct placements.
      </p>
    );
  }

  if (correctCards.length === 0) {
    return (
      <p className="mt-3 text-xs text-slate-400">
        No matches this time—swap cards and try again.
      </p>
    );
  }

  return (
    <div className="mt-3 space-y-2 text-xs text-slate-200">
      <p className="text-[11px] uppercase tracking-[0.2em] text-success">
        {correctCards.length} of {total} in the right spot
      </p>
      <ul className="grid gap-2 text-xs">
        {correctCards.map((card) => (
          <li key={card.id} className="pixel-border bg-success/15 px-4 py-3 text-success">
            <span className="block font-semibold">{card.name}</span>
            <span className="text-[11px] uppercase tracking-[0.18em]">
              {card.years}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function useCorrectCards(incorrectIds: string[]) {
  const allCards = presidents;
  const incorrectSet = new Set(incorrectIds);
  const correctCards = allCards.filter((card) => !incorrectSet.has(card.id));

  return {
    correctCards,
    total: allCards.length
  };
}
