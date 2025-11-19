"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { TitleScreen } from "@/components/TitleScreen";
import { GameBoard } from "@/components/GameBoard";
import { PixelDialog } from "@/components/PixelDialog";
import { OverlayControls } from "@/components/OverlayControls";
import { ConfettiOverlay } from "@/components/ConfettiOverlay";
import { presidents } from "@/data/presidents";
import { useGameAudio, type SoundKey } from "@/hooks/useGameAudio";
import type {
  CardFeedback,
  FinishReason,
  GameCard,
  GameMode,
  GamePhase,
  GameResult,
  LayoutMode
} from "@/types/game";

const DEFAULT_TIMED_SECONDS = 180;
const MIN_TIMED_SECONDS = 60;
const MAX_TIMED_SECONDS = 600;

interface ExitDialogOptions {
  preservePause?: boolean;
  returnToPause?: boolean;
}

interface PlaySoundOptions {
  allowWhileMuted?: boolean;
}

export default function HomePage() {
  const orderedCards = useMemo<GameCard[]>(
    () => [...presidents].sort((a, b) => a.order - b.order),
    []
  );
  const [phase, setPhase] = useState<GamePhase>("title");
  const [mode, setMode] = useState<GameMode | null>(null);
  const [cards, setCards] = useState<GameCard[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, CardFeedback>>({});
  const [score, setScore] = useState(0);
  const [timedDuration, setTimedDuration] = useState(DEFAULT_TIMED_SECONDS);
  const [remainingSeconds, setRemainingSeconds] = useState(DEFAULT_TIMED_SECONDS);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [result, setResult] = useState<GameResult | null>(null);
  const [revealYears, setRevealYears] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("gallery");
  const [pauseDialogOpen, setPauseDialogOpen] = useState(false);
  const [exitDialogOpen, setExitDialogOpen] = useState(false);
  const [pausedBeforeExitDialog, setPausedBeforeExitDialog] = useState(false);
  const [resumePauseDialogAfterExit, setResumePauseDialogAfterExit] = useState(false);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [developerDialogOpen, setDeveloperDialogOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [cardScale, setCardScale] = useState(1);
  const totalCards = orderedCards.length;

  const playAudio = useGameAudio();
  const playSound = useCallback(
    (key: SoundKey, options: PlaySoundOptions = {}) => {
      if (!isMuted || options.allowWhileMuted) {
        playAudio(key);
      }
    },
    [isMuted, playAudio]
  );
  const handleToggleMute = useCallback(() => {
    playSound("ui-select", { allowWhileMuted: true });
    setIsMuted((prev) => !prev);
  }, [playSound]);
  const createFeedbackMap = useCallback(
    (status: CardFeedback = "pending") =>
      orderedCards.reduce<Record<string, CardFeedback>>((acc, card) => {
        acc[card.id] = status;
        return acc;
      }, {}),
    [orderedCards]
  );

  const shuffleCards = useCallback(() => {
    const source = [...orderedCards];
    for (let i = source.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [source[i], source[j]] = [source[j], source[i]];
    }
    return source;
  }, [orderedCards]);

  const resetRound = useCallback(
    (currentMode: GameMode, options: { showInstructions?: boolean } = {}) => {
      const shouldShowInstructions = options.showInstructions ?? false;
      const shuffled = shuffleCards();
      setCards(shuffled);
      setFeedback(createFeedbackMap());
      setSelectedId(null);
      setScore(0);
      setResult(null);
      setRevealYears(false);
      setStartTime(shouldShowInstructions ? null : Date.now());
      setRemainingSeconds(currentMode === "timed" ? timedDuration : 0);
      setIsPaused(currentMode === "timed" ? shouldShowInstructions : false);
      setPauseDialogOpen(false);
      setExitDialogOpen(false);
      setResumePauseDialogAfterExit(false);
      setPausedBeforeExitDialog(false);
      setHasSubmitted(false);
      setSubmitDialogOpen(false);
      setShowInstructions(shouldShowInstructions);
    },
    [createFeedbackMap, shuffleCards, timedDuration]
  );

  const handleStart = useCallback(
    (nextMode: GameMode) => {
      setMode(nextMode);
      resetRound(nextMode, { showInstructions: true });
      setPhase("playing");
      playSound("game-start");
    },
    [playSound, resetRound]
  );

  const finishGame = useCallback(
    (reason: FinishReason, scoreOverride?: number, incorrectIds: string[] = []) => {
      if (!mode) {
        return;
      }

      const finalScore = scoreOverride ?? score;
      const now = Date.now();
      const elapsedSeconds = startTime ? Math.floor((now - startTime) / 1000) : 0;
      const finalRemaining = mode === "timed" ? remainingSeconds : 0;
      const playSuccessAudio = reason === "completed";

      setPhase("finished");
      setResult({
        reason,
        score: finalScore,
        elapsedSeconds,
        remainingSeconds: finalRemaining,
        incorrectIds
      });
      setRevealYears(true);
      setIsPaused(false);
      setHasSubmitted(true);
      setPauseDialogOpen(false);
      setExitDialogOpen(false);
      setResumePauseDialogAfterExit(false);
      setPausedBeforeExitDialog(false);
      setSubmitDialogOpen(false);
      playSound(playSuccessAudio ? "success" : "error");
    },
    [mode, playSound, remainingSeconds, score, startTime]
  );

  const evaluateCurrentArrangement = useCallback(() => {
    const resultFeedback: Record<string, CardFeedback> = {};
    const incorrectIds: string[] = [];
    let correctCount = 0;

    cards.forEach((card, index) => {
      const expected = orderedCards[index];
      if (expected && expected.id === card.id) {
        resultFeedback[card.id] = "correct";
        correctCount += 1;
      } else {
        resultFeedback[card.id] = "incorrect";
        incorrectIds.push(card.id);
      }
    });

    return { resultFeedback, correctCount, incorrectIds };
  }, [cards, orderedCards]);

  useEffect(() => {
    if (phase !== "playing" || mode !== "timed" || isPaused) {
      return;
    }

    if (remainingSeconds <= 0) {
      const evaluation = evaluateCurrentArrangement();
      setFeedback(evaluation.resultFeedback);
      setScore(evaluation.correctCount);
      setRevealYears(true);
      finishGame("time", evaluation.correctCount, evaluation.incorrectIds);
      return;
    }

    const intervalId = window.setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          window.clearInterval(intervalId);
          setTimeout(() => finishGame("time"), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [evaluateCurrentArrangement, finishGame, isPaused, mode, phase, remainingSeconds]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    setIsFullscreen(Boolean(document.fullscreenElement));
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const handleSelectCard = useCallback(
    (cardId: string) => {
      if (phase !== "playing") {
        return;
      }

      if (hasSubmitted) {
        return;
      }

      if (mode === "timed" && isPaused) {
        return;
      }

      if (selectedId === cardId) {
        setSelectedId(null);
        return;
      }

      if (selectedId === null) {
        setSelectedId(cardId);
        playSound("card-pickup");
        return;
      }

      const firstIndex = cards.findIndex((card) => card.id === selectedId);
      const secondIndex = cards.findIndex((card) => card.id === cardId);
      if (firstIndex === -1 || secondIndex === -1) {
        setSelectedId(null);
        return;
      }

      const swapped = [...cards];
      [swapped[firstIndex], swapped[secondIndex]] = [
        swapped[secondIndex],
        swapped[firstIndex]
      ];
      setCards(swapped);
      setSelectedId(null);
      playSound("card-place");
    },
    [cards, hasSubmitted, isPaused, mode, phase, playSound, selectedId]
  );

  const handleSubmitClick = useCallback(() => {
    if (phase !== "playing" || hasSubmitted) {
      return;
    }

    setSubmitDialogOpen(true);
    playSound("ui-select");
  }, [hasSubmitted, phase, playSound]);

  const handleSubmitCancel = useCallback(() => {
    setSubmitDialogOpen(false);
    playSound("ui-select");
  }, [playSound]);

  const handleSubmitConfirm = useCallback(() => {
    if (phase !== "playing" || hasSubmitted) {
      return;
    }

    const evaluation = evaluateCurrentArrangement();
    setFeedback(evaluation.resultFeedback);
    setScore(evaluation.correctCount);
    setRevealYears(true);
    setHasSubmitted(true);
    setSubmitDialogOpen(false);

    const reason = evaluation.correctCount === orderedCards.length ? "completed" : "submitted";
    finishGame(reason, evaluation.correctCount, evaluation.incorrectIds);
  }, [evaluateCurrentArrangement, finishGame, hasSubmitted, orderedCards, phase]);

  const handleInstructionsDismiss = useCallback(() => {
    setShowInstructions(false);
    setStartTime(Date.now());
    if (mode === "timed") {
      setIsPaused(false);
    }
    playSound("ui-select");
  }, [mode, playSound]);

  const handleDeveloperInfoToggle = useCallback(() => {
    setDeveloperDialogOpen((prev) => !prev);
    playSound("ui-select");
  }, [playSound]);

  const handleFullscreenToggle = useCallback(() => {
    if (typeof document === "undefined") {
      return;
    }

    playSound("ui-select");

    if (!document.fullscreenElement) {
      const element = document.documentElement;
      const request = element?.requestFullscreen?.();
      if (request) {
        request.catch(() => undefined);
      }
    } else {
      const exit = document.exitFullscreen?.();
      if (exit) {
        exit.catch(() => undefined);
      }
    }
  }, [playSound]);

  const handleReset = useCallback(() => {
    if (!mode) {
      return;
    }

    resetRound(mode);
    playSound("ui-select");
  }, [mode, playSound, resetRound]);

  const resetToTitle = useCallback(() => {
    setPhase("title");
    setMode(null);
    setCards([]);
    setFeedback(createFeedbackMap());
    setScore(0);
    setSelectedId(null);
    setResult(null);
    setRevealYears(false);
    setIsPaused(false);
    setRemainingSeconds(timedDuration);
    setStartTime(null);
    setPauseDialogOpen(false);
    setExitDialogOpen(false);
    setResumePauseDialogAfterExit(false);
    setPausedBeforeExitDialog(false);
    setLayoutMode("gallery");
    setHasSubmitted(false);
    setSubmitDialogOpen(false);
    setShowInstructions(false);
    setDeveloperDialogOpen(false);
  }, [createFeedbackMap, timedDuration]);

  const handlePlayAgain = useCallback(() => {
    if (!mode) {
      return;
    }

    resetRound(mode, { showInstructions: true });
    setPhase("playing");
    playSound("game-start");
  }, [mode, playSound, resetRound]);

  const openExitDialog = useCallback(
    (options: ExitDialogOptions = {}) => {
      const { preservePause = false, returnToPause = false } = options;

      if (phase === "playing" && mode === "timed") {
        const shouldPreserve = preservePause || isPaused;
        setPausedBeforeExitDialog(shouldPreserve);
        if (!shouldPreserve) {
          setIsPaused(true);
        }
      } else {
        setPausedBeforeExitDialog(false);
      }

      setResumePauseDialogAfterExit(returnToPause && phase === "playing");
      setExitDialogOpen(true);
      playSound("ui-select");
    },
    [isPaused, mode, phase, playSound]
  );

  const handlePauseClick = useCallback(() => {
    if (phase !== "playing" || mode !== "timed" || isPaused) {
      return;
    }

    setIsPaused(true);
    setPauseDialogOpen(true);
    playSound("ui-select");
  }, [isPaused, mode, phase, playSound]);

  const handlePauseResume = useCallback(() => {
    setPauseDialogOpen(false);
    setIsPaused(false);
    playSound("ui-select");
  }, [playSound]);

  const handlePauseExit = useCallback(() => {
    setPauseDialogOpen(false);
    openExitDialog({ preservePause: true, returnToPause: true });
  }, [openExitDialog]);

  const handleExitConfirm = useCallback(() => {
    setExitDialogOpen(false);
    setPauseDialogOpen(false);
    setResumePauseDialogAfterExit(false);
    resetToTitle();
    playSound("ui-select");
  }, [playSound, resetToTitle]);

  const handleExitCancel = useCallback(() => {
    setExitDialogOpen(false);

    if (phase === "playing" && mode === "timed" && !pausedBeforeExitDialog) {
      setIsPaused(false);
    }

    if (resumePauseDialogAfterExit && phase === "playing") {
      setPauseDialogOpen(true);
    }

    setResumePauseDialogAfterExit(false);
    playSound("ui-select");
  }, [mode, phase, pausedBeforeExitDialog, resumePauseDialogAfterExit, playSound]);

  const handleExitToTitle = useCallback(() => {
    if (phase === "finished") {
      playSound("ui-select");
      resetToTitle();
      return;
    }

    openExitDialog();
  }, [openExitDialog, phase, playSound, resetToTitle]);

  const handleTimedDurationChange = useCallback(
    (seconds: number) => {
      const clamped = Math.min(Math.max(seconds, MIN_TIMED_SECONDS), MAX_TIMED_SECONDS);
      setTimedDuration(clamped);
      if (phase === "title") {
        setRemainingSeconds(clamped);
      }
    },
    [phase]
  );

  const handleLayoutModeChange = useCallback(
    (nextMode: LayoutMode) => {
      if (layoutMode === nextMode) {
        return;
      }

      setLayoutMode(nextMode);
      playSound("ui-select");
    },
    [layoutMode, playSound]
  );

  const handleCardScaleChange = useCallback(
    (value: string) => {
      const parsed = Number.parseFloat(value);
      if (Number.isNaN(parsed)) {
        return;
      }

      const clamped = Math.min(Math.max(parsed, 0.8), 1.3);
      if (Math.abs(clamped - cardScale) < 0.001) {
        return;
      }

      setCardScale(clamped);
      playSound("ui-select");
    },
    [cardScale, playSound]
  );

  const isResultPhase = phase === "finished" && Boolean(mode && result);
  const activeResult = isResultPhase && result ? result : null;
  const showConfetti = Boolean(activeResult && activeResult.reason === "completed");
  const resultCopy = activeResult ? getResultCopy(activeResult.score, activeResult.reason, totalCards) : null;

  let content: JSX.Element;

  if (phase === "title") {
    content = (
      <TitleScreen
        onStart={handleStart}
        timedDurationSeconds={timedDuration}
        minTimedSeconds={MIN_TIMED_SECONDS}
        maxTimedSeconds={MAX_TIMED_SECONDS}
        onTimedDurationChange={handleTimedDurationChange}
        onToggleDeveloperInfo={handleDeveloperInfoToggle}
        playSound={playSound}
      />
    );
  } else {
    content = (
      <main className="flex min-h-screen w-full flex-col items-center gap-4 px-3 pb-8 pt-6 sm:px-4">
        <section className="pixel-border w-full max-w-5xl bg-panel/90 px-3 py-3 sm:px-4 sm:py-4">
          <div className="grid w-full gap-3 text-[11px] uppercase tracking-[0.18em] text-slate-200 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.1fr)] sm:items-center">
            <span className="flex justify-center sm:justify-start">
              Score: <span className="ml-1 text-accent">{score}</span>
              <span className="ml-1 text-slate-400">/ {totalCards}</span>
            </span>
            <div className="flex justify-center text-center">
              {isResultPhase && result ? (
                <div className="flex flex-col items-center gap-1 sm:flex-row sm:gap-2">
                  <span>
                    {result.reason === "completed"
                      ? "Perfect Order Achieved"
                      : result.reason === "submitted"
                      ? "Order Submitted"
                      : "Time's Up"}
                  </span>
                  <span className="text-[9px] uppercase tracking-[0.18em] text-slate-400">
                    {score} / {totalCards} correct
                  </span>
                </div>
              ) : mode === "timed" ? (
                <>
                  Timer: <span className="ml-1 text-accent">{formatSeconds(remainingSeconds)}</span>
                  {showInstructions ? (
                    <span className="ml-2 text-[9px] text-slate-400">Instructions</span>
                  ) : (
                    isPaused && <span className="ml-2 text-[9px] text-slate-400">Paused</span>
                  )}
                </>
              ) : (
                showInstructions ? "Review Instructions" : "Standard Mode"
              )}
            </div>
            <div className="flex flex-col items-center justify-center gap-2 sm:flex-row sm:justify-end">
              <span className="text-[9px] uppercase tracking-[0.18em] text-slate-300">Layout</span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  className="pixel-toggle pixel-border"
                  data-active={layoutMode === "gallery"}
                  onClick={() => handleLayoutModeChange("gallery")}
                  aria-pressed={layoutMode === "gallery"}
                >
                  Gallery
                </button>
                <button
                  type="button"
                  className="pixel-toggle pixel-border"
                  data-active={layoutMode === "list"}
                  onClick={() => handleLayoutModeChange("list")}
                  aria-pressed={layoutMode === "list"}
                >
                  List
                </button>
              </div>
            </div>
          </div>
        </section>

        {activeResult && resultCopy && (
          <section className="pixel-border w-full max-w-5xl bg-panel/90 px-4 py-5 text-center">
            <h2 className="text-xl text-accent drop-shadow-[2px_2px_0_#000]">{resultCopy.heading}</h2>
            <p className="mt-2 text-[11px] uppercase tracking-[0.24em] text-slate-300">
              {resultCopy.subheading}
            </p>
            <div className="mt-4 flex flex-col gap-2 text-xs text-slate-200 sm:flex-row sm:justify-center sm:gap-6">
              <span>
                Score: <span className="text-accent">{score}</span> / {totalCards}
              </span>
              <span>Elapsed: {formatSeconds(activeResult.elapsedSeconds)}</span>
              {mode === "timed" && (
                <span>Remaining: {formatSeconds(activeResult.remainingSeconds)}</span>
              )}
            </div>
          </section>
        )}

        <div className="w-full max-w-5xl">
          <GameBoard
            cards={cards}
            selectedId={selectedId}
            feedback={feedback}
            revealYears={revealYears}
            onSelect={handleSelectCard}
            layoutMode={layoutMode}
            cardScale={cardScale}
            isInteractive={phase === "playing" && (!isPaused || mode !== "timed") && !hasSubmitted}
          />
        </div>

        <section className="pixel-border w-full max-w-5xl bg-panel/90 px-3 py-3 sm:px-4 sm:py-4">
          {isResultPhase && result ? (
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:justify-center">
              <button type="button" className="pixel-button w-full sm:w-auto" onClick={handlePlayAgain}>
                Play Again
              </button>
              <button type="button" className="pixel-button w-full sm:w-auto" onClick={handleExitToTitle}>
                Exit to Title
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-between gap-3 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                className="pixel-button w-full sm:w-auto"
                onClick={handleSubmitClick}
                disabled={hasSubmitted}
              >
                Submit Order
              </button>
              <button type="button" className="pixel-button w-full sm:w-auto" onClick={handleReset}>
                Reset
              </button>
              {mode === "timed" && (
                <button
                  type="button"
                  className="pixel-button w-full sm:w-auto"
                  onClick={handlePauseClick}
                  disabled={isPaused || hasSubmitted}
                >
                  {isPaused ? "Paused" : "Pause"}
                </button>
              )}
              <button type="button" className="pixel-button w-full sm:w-auto" onClick={handleExitToTitle}>
                Exit to Title
              </button>
            </div>
          )}
        </section>
      </main>
    );
  }

  return (
    <>
      {phase !== "title" && (
        <aside className="fixed left-2 top-1/2 hidden -translate-y-1/2 flex-col items-center gap-3 rounded-md border-2 border-black bg-panel/90 px-3 py-4 text-[9px] uppercase tracking-[0.18em] text-slate-200 shadow-lg md:flex">
          <span>Card Size</span>
          <input
            type="range"
            min={0.8}
            max={1.3}
            step={0.05}
            value={cardScale}
            onChange={(event) => handleCardScaleChange(event.target.value)}
            aria-label="Adjust card size"
            className="h-28 w-1.5 cursor-pointer appearance-none rounded-full bg-slate-700 outline-none"
            style={{ writingMode: "vertical-rl" }}
            dir="rtl"
          />
          <span className="text-[8px] text-slate-400">{Math.round(cardScale * 100)}%</span>
        </aside>
      )}
      <ConfettiOverlay active={Boolean(showConfetti)} />
      <OverlayControls
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleFullscreenToggle}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
      />
      {content}
      <PixelDialog
        open={showInstructions && phase === "playing"}
        title="How to Play"
        message={
          <div className="space-y-3 text-left text-sm leading-relaxed text-slate-200">
            <p>Swap portraits until every prophet is in chronological order.</p>
            <ul className="space-y-2 text-[11px] uppercase tracking-[0.18em] text-slate-300">
              <li>Tap two cards to swap their positions on the board.</li>
              <li>Submit Order when you are confident in the timeline.</li>
              {mode === "timed" ? (
                <li>The clock is paused right now—press Pause later if you need another break.</li>
              ) : (
                <li>Reset shuffles the deck for another practice round.</li>
              )}
            </ul>
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
              Years reveal after you submit or when the timer runs out.
            </p>
          </div>
        }
        confirmLabel={"Let's Go"}
        onConfirm={handleInstructionsDismiss}
      />
      <PixelDialog
        open={developerDialogOpen}
        title="About the Developer"
        message={
          <div className="space-y-3 text-left text-sm leading-relaxed text-slate-200">
            <p>
              Created by Joshua Cister, a member of The Church of Jesus Christ of
              Latter-day Saints. His faith guides this project, strengthened through
              missionary service in the Philippines Manila Mission (2019-2021).
            </p>
            <div className="space-y-2 text-xs text-slate-300">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-300">
                Tech Stack
              </p>
              <p>Next.js 14 · React · TypeScript · Tailwind CSS · custom audio hooks.</p>
              <p>
                Transparency note: the hero background animation and logo concepts were
                prototyped with Google Gemini, then refined by hand to fit the pixel
                aesthetic.
              </p>
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-300">
                Prophet roster referenced from the Church history site:
              </p>
              <a
                href="https://history.churchofjesuschrist.org/training/library/general-authorities-of-the-church/list-of-presidents-of-the-church-and-their-counselors?lang=eng"
                className="block text-xs text-accent underline"
                target="_blank"
                rel="noreferrer"
              >
                history.churchofjesuschrist.org
              </a>
            </div>
          </div>
        }
        confirmLabel="Close"
        onConfirm={handleDeveloperInfoToggle}
      />
      <PixelDialog
        open={pauseDialogOpen && phase === "playing"}
        title="Game Paused"
        message="Take a breather. When you're ready, jump back in or head to the title screen."
        confirmLabel="Resume"
        onConfirm={handlePauseResume}
        cancelLabel="Exit to Title"
        onCancel={handlePauseExit}
      />
      <PixelDialog
        open={submitDialogOpen}
        title="Submit Final Order?"
        message="This locks in your arrangement and ends the round. Double-check everything before you continue."
        confirmLabel="Submit"
        onConfirm={handleSubmitConfirm}
        cancelLabel="Keep Arranging"
        onCancel={handleSubmitCancel}
      />
      <PixelDialog
        open={exitDialogOpen}
        title="Exit to Title?"
        message="You'll lose your current progress. Are you sure you want to leave this run?"
        confirmLabel="Exit"
        onConfirm={handleExitConfirm}
        cancelLabel="Stay"
        onCancel={handleExitCancel}
      />
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

interface ResultCopy {
  heading: string;
  subheading: string;
}

const HIGH_SCORE_THRESHOLD = 14;
const MID_SCORE_THRESHOLD = 9;

function getResultCopy(score: number, reason: FinishReason, totalCards: number): ResultCopy {
  if (reason === "completed") {
    return getCelebrationCopy(score, totalCards);
  }

  if (reason === "submitted") {
    return getSubmittedCopy(score, totalCards);
  }

  return {
    heading: "Time's Up!",
    subheading: "The clock ran out—review the timeline and try again."
  };
}

function getCelebrationCopy(score: number, totalCards: number): ResultCopy {
  if (score >= totalCards) {
    return {
      heading: "Perfect Prophet Historian!",
      subheading: `All ${totalCards} leaders in flawless order.`
    };
  }

  if (score >= HIGH_SCORE_THRESHOLD) {
    return {
      heading: "Chronology Champion!",
      subheading: "Your memory is almost prophetic—so close to perfect."
    };
  }

  if (score >= MID_SCORE_THRESHOLD) {
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

function getSubmittedCopy(score: number, totalCards: number): ResultCopy {
  const perfect = score >= totalCards;

  if (perfect) {
    return {
      heading: "Flawless Timeline!",
      subheading: "Every prophet in perfect order—amazing work."
    };
  }

  if (score >= HIGH_SCORE_THRESHOLD) {
    return {
      heading: "Close to Prophetic!",
      subheading: "Just a few more swaps and you'll master the sequence."
    };
  }

  return {
    heading: "Order Submitted!",
    subheading: "Review the highlights below and take another shot."
  };
}
