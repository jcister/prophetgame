import type { PresidentCard } from "@/data/presidents";

export type GameMode = "standard" | "timed" | "quiz";

export type GamePhase = "title" | "playing" | "finished";

export type CardFeedback = "correct" | "incorrect" | "pending";

export type GameCard = PresidentCard;

export type FinishReason = "completed" | "submitted" | "time";

export type LayoutMode = "gallery" | "list";

export interface GameResult {
  reason: FinishReason;
  score: number;
  elapsedSeconds: number;
  remainingSeconds: number;
  incorrectIds: string[];
}
