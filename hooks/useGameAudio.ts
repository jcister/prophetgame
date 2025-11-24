"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  const audioElementsRef = useRef<Partial<Record<SoundKey, HTMLAudioElement>>>({});
  const initializedRef = useRef(false);

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

      if (!initializedRef.current) {
        Object.entries(audioMap).forEach(([mapKey, src]) => {
          const element = new Audio(src);
          element.volume = DEFAULT_VOLUME;
          element.preload = "auto";
          element.setAttribute("playsinline", "true");
          element.load();
          audioElementsRef.current[mapKey as SoundKey] = element;
        });
        initializedRef.current = true;
      }

      const element = audioElementsRef.current[key];
      if (!element) {
        return;
      }

      const src = audioMap[key];
      if (!src) {
        return;
      }

      try {
        element.currentTime = 0;
        void element.play().catch((error) => {
          console.warn("Audio playback skipped:", error);
        });
      } catch (error) {
        console.warn("Audio playback skipped:", error);
      }
    },
    [audioMap, isBrowser]
  );
}
