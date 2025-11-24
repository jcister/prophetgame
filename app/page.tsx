"use client";

import clsx from "clsx";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

type QuizPromptType = "image-to-name" | "name-to-image";

interface QuizChoice {
  id: string;
  name: string;
  image: string;
}

interface QuizQuestion {
  id: string;
  promptType: QuizPromptType;
  promptName: string;
  promptImage: string;
  choices: QuizChoice[];
  correctId: string;
}

interface QuizAnswer {
  choiceId: string;
  correct: boolean;
}

const DEFAULT_TIMED_SECONDS = 180;
const MIN_TIMED_SECONDS = 60;
const MAX_TIMED_SECONDS = 600;

function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function toQuizChoice(card: GameCard): QuizChoice {
  return {
    id: card.id,
    name: card.name,
    image: card.image
  };
}

function pickQuizChoices(allCards: GameCard[], correctCard: GameCard, count: number): QuizChoice[] {
  const eligible = allCards.filter((card) => card.id !== correctCard.id);
  return shuffleArray(eligible)
    .slice(0, count)
    .map((card) => toQuizChoice(card));
}

function createQuizQuestions(allCards: GameCard[]): QuizQuestion[] {
  const shuffledCards = shuffleArray(allCards);
  return shuffledCards.map((card) => {
    const promptType: QuizPromptType = Math.random() < 0.5 ? "image-to-name" : "name-to-image";
    const distractors = pickQuizChoices(allCards, card, 3);
    const choices = shuffleArray([toQuizChoice(card), ...distractors]);

    return {
      id: card.id,
      promptType,
      promptName: card.name,
      promptImage: card.image,
      choices,
      correctId: card.id
    };
  });
}

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
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, QuizAnswer>>({});
  const [quizHasAnswered, setQuizHasAnswered] = useState(false);
  const [quizLastCorrect, setQuizLastCorrect] = useState<boolean | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const quizAutoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const totalCards = orderedCards.length;

  const clearQuizAutoAdvance = useCallback(() => {
    if (quizAutoAdvanceRef.current) {
      clearTimeout(quizAutoAdvanceRef.current);
      quizAutoAdvanceRef.current = null;
    }
  }, []);

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

  const startQuizRound = useCallback(
    (options: { showInstructions?: boolean } = {}) => {
      clearQuizAutoAdvance();
      const shouldShowInstructions = options.showInstructions ?? false;
      const questions = createQuizQuestions(orderedCards);
      setQuizQuestions(questions);
      setQuizIndex(0);
      setQuizAnswers({});
      setQuizScore(0);
      setQuizHasAnswered(false);
      setQuizLastCorrect(null);
      setCards([]);
      setFeedback({});
      setScore(0);
      setSelectedId(null);
      setResult(null);
      setRevealYears(false);
      setStartTime(null);
      setRemainingSeconds(0);
      setIsPaused(false);
      setPauseDialogOpen(false);
      setExitDialogOpen(false);
      setResumePauseDialogAfterExit(false);
      setPausedBeforeExitDialog(false);
      setHasSubmitted(false);
      setSubmitDialogOpen(false);
      setShowInstructions(shouldShowInstructions);
      setPhase("playing");
    },
    [clearQuizAutoAdvance, orderedCards]
  );

  const resetRound = useCallback(
    (currentMode: GameMode, options: { showInstructions?: boolean } = {}) => {
      if (currentMode === "quiz") {
        startQuizRound(options);
        return;
      }

      clearQuizAutoAdvance();
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
    [clearQuizAutoAdvance, createFeedbackMap, shuffleCards, startQuizRound, timedDuration]
  );

  const handleStart = useCallback(
    (nextMode: GameMode) => {
      setMode(nextMode);
      if (nextMode === "quiz") {
        startQuizRound({ showInstructions: true });
      } else {
        resetRound(nextMode, { showInstructions: true });
        setPhase("playing");
      }
      playSound("game-start");
    },
    [playSound, resetRound, startQuizRound]
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
    if (mode !== "quiz") {
      setStartTime(Date.now());
    }
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
    clearQuizAutoAdvance();
    setPhase("title");
    setMode(null);
    setCards([]);
    setFeedback(createFeedbackMap());
    setScore(0);
    setQuizQuestions([]);
    setQuizIndex(0);
    setQuizAnswers({});
    setQuizScore(0);
    setQuizHasAnswered(false);
    setQuizLastCorrect(null);
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
  }, [clearQuizAutoAdvance, createFeedbackMap, timedDuration]);

  const handlePlayAgain = useCallback(() => {
    if (!mode) {
      return;
    }

    clearQuizAutoAdvance();
    if (mode === "quiz") {
      startQuizRound({ showInstructions: true });
    } else {
      resetRound(mode, { showInstructions: true });
      setPhase("playing");
    }

    playSound("game-start");
  }, [clearQuizAutoAdvance, mode, playSound, resetRound, startQuizRound]);

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

  const finishQuizRound = useCallback(() => {
    clearQuizAutoAdvance();
    const finalScore = Object.values(quizAnswers).filter((entry) => entry.correct).length;
    setQuizScore(finalScore);
    setScore(finalScore);
    setPhase("finished");
    setQuizHasAnswered(false);
    setQuizLastCorrect(null);
    setShowInstructions(false);
    setPauseDialogOpen(false);
    setExitDialogOpen(false);
    setResumePauseDialogAfterExit(false);
    setPausedBeforeExitDialog(false);
    setResult(null);
    setRevealYears(false);
    setIsPaused(false);
    const perfect = quizQuestions.length > 0 && finalScore === quizQuestions.length;
    playSound(perfect ? "success" : "ui-select");
  }, [clearQuizAutoAdvance, playSound, quizAnswers, quizQuestions.length]);

  const handleQuizChoiceSelect = useCallback(
    (choiceId: string) => {
      if (mode !== "quiz") {
        return;
      }

      const question = quizQuestions[quizIndex];
      if (!question) {
        return;
      }

      if (quizAnswers[question.id]) {
        return;
      }

      const correct = choiceId === question.correctId;
      setQuizAnswers((prev) => ({
        ...prev,
        [question.id]: { choiceId, correct }
      }));
      setQuizHasAnswered(true);
      setQuizLastCorrect(correct);
      setQuizScore((prev) => (correct ? prev + 1 : prev));
      playSound(correct ? "success" : "error");
    },
    [mode, playSound, quizAnswers, quizIndex, quizQuestions]
  );

  const handleQuizNext = useCallback(() => {
    if (mode !== "quiz") {
      return;
    }

    clearQuizAutoAdvance();
    const question = quizQuestions[quizIndex];
    if (!question) {
      return;
    }

    if (!quizAnswers[question.id]) {
      playSound("error");
      return;
    }

    if (quizIndex >= quizQuestions.length - 1) {
      finishQuizRound();
      return;
    }

    const nextIndex = quizIndex + 1;
    playSound("ui-select");
    setQuizIndex(nextIndex);
    const nextQuestion = quizQuestions[nextIndex];
    const nextAnswer = nextQuestion ? quizAnswers[nextQuestion.id] : undefined;
    setQuizHasAnswered(Boolean(nextAnswer));
    setQuizLastCorrect(nextAnswer?.correct ?? null);
  }, [clearQuizAutoAdvance, finishQuizRound, mode, playSound, quizAnswers, quizIndex, quizQuestions]);

  const handleQuizRestart = useCallback(() => {
    if (mode !== "quiz") {
      return;
    }

    clearQuizAutoAdvance();
    startQuizRound({ showInstructions: true });
    playSound("game-start");
  }, [clearQuizAutoAdvance, mode, playSound, startQuizRound]);

  useEffect(() => {
    if (mode !== "quiz" || phase !== "playing") {
      clearQuizAutoAdvance();
      return;
    }

    const question = quizQuestions[quizIndex];
    if (!quizHasAnswered || !question) {
      clearQuizAutoAdvance();
      return;
    }

    clearQuizAutoAdvance();
    quizAutoAdvanceRef.current = setTimeout(() => {
      quizAutoAdvanceRef.current = null;
      handleQuizNext();
    }, 3000);

    return () => {
      clearQuizAutoAdvance();
    };
  }, [clearQuizAutoAdvance, handleQuizNext, mode, phase, quizHasAnswered, quizIndex, quizQuestions]);

  const isResultPhase = phase === "finished" && Boolean(mode && result);
  const activeResult = isResultPhase && result ? result : null;
  const isQuizMode = mode === "quiz";
  const quizTotal = quizQuestions.length;
  const quizTotalDisplay = quizTotal || totalCards;
  const isQuizFinished = isQuizMode && phase === "finished";
  const activeQuizQuestion = isQuizMode ? quizQuestions[quizIndex] : undefined;
  const activeQuizAnswer = activeQuizQuestion ? quizAnswers[activeQuizQuestion.id] : undefined;
  const isQuizPerfect = isQuizFinished && quizTotal > 0 && quizScore === quizTotal;
  const showConfetti = Boolean(activeResult && activeResult.reason === "completed") || isQuizPerfect;
  const resultCopy = activeResult ? getResultCopy(activeResult.score, activeResult.reason, totalCards) : null;
  const quizResultCopy = isQuizFinished ? getQuizResultCopy(quizScore, quizTotal) : null;
  const isLastQuizQuestion = isQuizMode && quizTotal > 0 ? quizIndex >= quizTotal - 1 : false;
  const instructionsTitle = isQuizMode ? "Quiz Rules" : "How to Play";
  const instructionsConfirmLabel = isQuizMode ? "Start Quiz" : "Let's Go";
  const instructionsMessage = isQuizMode ? (
    <div className="space-y-3 text-left text-sm leading-relaxed text-slate-200">
      <p>
        Identify each prophet exactly once. Every round shuffles all {totalCards} leaders—no duplicates.
      </p>
      <ul className="space-y-2 text-[11px] uppercase tracking-[0.18em] text-slate-300">
        <li>Read the prompt. It alternates between portraits and names.</li>
        <li>Select an answer to lock it in—each question allows one guess.</li>
        <li>Rounds auto-advance after 3 seconds, or press Next to skip ahead.</li>
      </ul>
      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
        Aim for a perfect streak to trigger the victory confetti.
      </p>
    </div>
  ) : (
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
  );

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
          <div
            className={clsx(
              "grid w-full gap-3 text-[11px] uppercase tracking-[0.18em] text-slate-200 sm:items-center",
              isQuizMode
                ? "sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]"
                : "sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.1fr)]"
            )}
          >
            <span className="flex justify-center sm:justify-start">
              {isQuizMode ? (
                <>
                  Correct: <span className="ml-1 text-accent">{quizScore}</span>
                  <span className="ml-1 text-slate-400">/ {quizTotalDisplay}</span>
                </>
              ) : (
                <>
                  Score: <span className="ml-1 text-accent">{score}</span>
                  <span className="ml-1 text-slate-400">/ {totalCards}</span>
                </>
              )}
            </span>
            <div className="flex justify-center text-center">
              {isQuizMode ? (
                isQuizFinished ? (
                  <div className="flex flex-col items-center gap-1">
                    <span>Quiz Complete</span>
                    <span className="text-[9px] uppercase tracking-[0.18em] text-slate-400">
                      {quizScore} / {quizTotalDisplay} correct
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <span>
                      Question {quizTotal > 0 ? quizIndex + 1 : 0} of {quizTotalDisplay}
                    </span>
                    <span className="text-[9px] uppercase tracking-[0.18em] text-slate-400">
                      {quizHasAnswered
                        ? quizLastCorrect
                          ? "Correct"
                          : "Incorrect"
                        : "Awaiting Answer"}
                    </span>
                  </div>
                )
              ) : isResultPhase && result ? (
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
              {isQuizMode ? (
                <>
                  <span className="text-[9px] uppercase tracking-[0.18em] text-slate-300">Prompt</span>
                  <span className="text-xs text-accent">
                    {activeQuizQuestion
                      ? activeQuizQuestion.promptType === "image-to-name"
                        ? "Name that Prophet"
                        : "Find Their Portrait"
                      : "Preparing"}
                  </span>
                </>
              ) : (
                <>
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
                </>
              )}
            </div>
          </div>
        </section>

        {isQuizMode ? (
          isQuizFinished && quizResultCopy && (
            <section className="pixel-border w-full max-w-5xl bg-panel/90 px-4 py-5 text-center">
              <h2 className="text-xl text-accent drop-shadow-[2px_2px_0_#000]">{quizResultCopy.heading}</h2>
              <p className="mt-2 text-[11px] uppercase tracking-[0.24em] text-slate-300">
                {quizResultCopy.subheading}
              </p>
              <div className="mt-4 flex flex-col gap-2 text-xs text-slate-200 sm:flex-row sm:justify-center sm:gap-6">
                <span>
                  Correct: <span className="text-accent">{quizScore}</span> / {quizTotalDisplay}
                </span>
                <span>Perfect Answers: {quizScore === quizTotal ? "Yes" : "Not Yet"}</span>
              </div>
            </section>
          )
        ) : (
          activeResult && resultCopy && (
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
          )
        )}

        {isQuizMode ? (
          <section className="pixel-border w-full max-w-5xl bg-panel/90 px-4 py-6">
            {activeQuizQuestion ? (
              <div className="grid gap-6 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
                <div className="flex flex-col items-center gap-4 text-center sm:items-start sm:text-left">
                  {activeQuizQuestion.promptType === "image-to-name" ? (
                    <>
                      <span className="text-[11px] uppercase tracking-[0.24em] text-slate-300">
                        Which prophet is shown?
                      </span>
                      <div className="pixel-border mx-auto w-full max-w-xs bg-panel/70 p-3 sm:mx-0">
                        <Image
                          src={activeQuizQuestion.promptImage}
                          alt={activeQuizQuestion.promptName}
                          width={320}
                          height={320}
                          className="h-auto w-full rounded-sm border-2 border-black object-cover"
                          unoptimized
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="text-[11px] uppercase tracking-[0.24em] text-slate-300">
                        Select the portrait of
                      </span>
                      <div className="pixel-border mx-auto w-full max-w-sm bg-panel/70 px-4 py-5 sm:mx-0">
                        <p className="text-xl uppercase tracking-[0.28em] text-accent">
                          {activeQuizQuestion.promptName}
                        </p>
                      </div>
                    </>
                  )}
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    No repeats—each leader appears once per run.
                  </p>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-slate-300">
                    {activeQuizAnswer
                      ? activeQuizAnswer.correct
                        ? "Correct! Auto-advancing in 3 seconds."
                        : "Locked in. Auto-advancing in 3 seconds."
                      : "Tap an answer to lock it in."}
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-x-2 gap-y-4 sm:gap-3">
                    {activeQuizQuestion.choices.map((choice) => {
                      const isSelected = activeQuizAnswer?.choiceId === choice.id;
                      const isCorrectChoice = choice.id === activeQuizQuestion.correctId;
                      const reveal = Boolean(activeQuizAnswer);
                      const statusLabel = isCorrectChoice ? "Correct" : isSelected ? "Selected" : null;
                      return (
                        <button
                          key={choice.id}
                          type="button"
                          className={clsx(
                            "pixel-border relative flex h-full flex-col items-center gap-2 bg-panel/70 px-2 py-4 text-center text-xs uppercase tracking-[0.18em] text-slate-200 transition sm:px-4 sm:py-3 sm:text-sm",
                            reveal && isCorrectChoice && "bg-emerald-700/70",
                            reveal && isSelected && !isCorrectChoice && "bg-rose-800/70",
                            !reveal && "hover:-translate-y-[2px]"
                          )}
                          onClick={() => handleQuizChoiceSelect(choice.id)}
                          disabled={reveal}
                          aria-label={
                            activeQuizQuestion.promptType === "name-to-image" ? choice.name : undefined
                          }
                        >
                          {activeQuizQuestion.promptType === "image-to-name" ? (
                            <span>{choice.name}</span>
                          ) : (
                            <Image
                              src={choice.image}
                              alt={choice.name}
                              width={170}
                              height={170}
                              className="h-auto w-full rounded-sm border-2 border-black object-cover"
                              unoptimized
                            />
                          )}
                          {reveal && statusLabel && (
                            <span
                              className={clsx(
                                "pointer-events-none absolute left-1/2 -top-3 -translate-x-1/2 rounded-sm px-1 py-[1px] text-[9px] uppercase tracking-[0.2em] sm:left-auto sm:right-2 sm:top-2 sm:-translate-x-0 sm:py-[2px]",
                                isCorrectChoice
                                  ? "bg-emerald-900/85 text-emerald-200"
                                  : isSelected
                                  ? "bg-rose-900/85 text-rose-200"
                                  : "bg-slate-700/80 text-slate-200"
                              )}
                            >
                              {statusLabel}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-sm uppercase tracking-[0.2em] text-slate-300">
                Preparing next prophet...
              </div>
            )}
          </section>
        ) : (
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
        )}

        <section className="pixel-border w-full max-w-5xl bg-panel/90 px-3 py-3 sm:px-4 sm:py-4">
          {isQuizMode ? (
            isQuizFinished ? (
              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:justify-center">
                <button type="button" className="pixel-button w-full sm:w-auto" onClick={handleQuizRestart}>
                  Play Again
                </button>
                <button type="button" className="pixel-button w-full sm:w-auto" onClick={handleExitToTitle}>
                  Exit to Title
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-between gap-3 sm:flex-row sm:flex-wrap">
                <button type="button" className="pixel-button w-full sm:w-auto" onClick={handleQuizRestart}>
                  Restart Quiz
                </button>
                <button
                  type="button"
                  className="pixel-button w-full sm:w-auto"
                  onClick={handleQuizNext}
                  disabled={!quizHasAnswered}
                >
                  {isLastQuizQuestion ? "Finish Quiz" : "Next Prophet"}
                </button>
                <button type="button" className="pixel-button w-full sm:w-auto" onClick={handleExitToTitle}>
                  Exit to Title
                </button>
              </div>
            )
          ) : isResultPhase && result ? (
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
      {phase !== "title" && !isQuizMode && (
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
        title={instructionsTitle}
        message={instructionsMessage}
        confirmLabel={instructionsConfirmLabel}
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

function getQuizResultCopy(score: number, total: number): ResultCopy {
  if (total <= 0) {
    return {
      heading: "Quiz Complete",
      subheading: "Take another run to set a score."
    };
  }

  if (score >= total) {
    return {
      heading: "Prophet Scholar!",
      subheading: "Perfect recall across every prophet."
    };
  }

  if (score >= total - 2) {
    return {
      heading: "Nearly Prophetic!",
      subheading: "Just a couple more answers for perfection."
    };
  }

  if (score >= Math.ceil(total * 0.5)) {
    return {
      heading: "Strong Memory!",
      subheading: "Great progress—review a few portraits and try again."
    };
  }

  return {
    heading: "Keep Studying!",
    subheading: "Revisit the timeline and give it another go."
  };
}
