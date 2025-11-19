"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export type SoundKey =
  | "game-start"
  | "ui-select"
  | "card-pickup"
  | "card-place"
  | "success"
  | "error";

const DEFAULT_VOLUME = 0.6;

export function useGameAudio() {
  const [isBrowser, setIsBrowser] = useState(false);

  useEffect(() => {
    setIsBrowser(typeof window !== "undefined" && typeof window.Audio !== "undefined");
  }, []);

  const audioMap = useMemo<Record<SoundKey, string>>(
    () => ({
      "game-start": "/audio/game_start.wav",
      "ui-select": "/audio/ui_select.wav",
      "card-pickup": "/audio/card_pickup.wav",
      "card-place": "/audio/card_place.wav",
      success: "/audio/success.wav",
      error: "/audio/error.wav"
    }),
    []
  );

  return useCallback(
    (key: SoundKey) => {
      if (!isBrowser) {
        return;
      }

      const src = audioMap[key];
      if (!src) {
        return;
      }

      try {
        const clip = new Audio(src);
        clip.volume = DEFAULT_VOLUME;
        void clip.play();
      } catch (error) {
        console.warn("Audio playback skipped:", error);
      }
    },
    [audioMap, isBrowser]
  );
}
