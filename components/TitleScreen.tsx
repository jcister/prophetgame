"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import Image from "next/image";
import type { GameMode } from "@/types/game";
import type { SoundKey } from "@/hooks/useGameAudio";

type PlaySound = (key: SoundKey, options?: { allowWhileMuted?: boolean }) => void;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type NavigatorStandalone = Navigator & { standalone?: boolean };

const getIsInstalled = () => {
  if (typeof window === "undefined") {
    return false;
  }

  const nav = window.navigator as NavigatorStandalone;
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
};

interface TitleScreenProps {
  onStart: (mode: GameMode) => void;
  timedDurationSeconds: number;
  minTimedSeconds: number;
  maxTimedSeconds: number;
  onTimedDurationChange: (seconds: number) => void;
  onToggleDeveloperInfo: () => void;
  playSound: PlaySound;
}

export function TitleScreen({
  onStart,
  timedDurationSeconds,
  minTimedSeconds,
  maxTimedSeconds,
  onTimedDurationChange,
  onToggleDeveloperInfo,
  playSound
}: TitleScreenProps) {
  const minMinutes = Math.ceil(minTimedSeconds / 60);
  const maxMinutes = Math.floor(maxTimedSeconds / 60);
  const timedMinutes = Math.round(timedDurationSeconds / 60);
  const timedMinutesInputId = "timed-minutes";
  const isNativeRuntime = useMemo(() => Capacitor.isNativePlatform(), []);
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallPromptSupported, setIsInstallPromptSupported] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const autoPromptedRef = useRef(false);

  const handleTimedMinutesChange = (value: string) => {
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed)) {
      return;
    }

    const clamped = Math.min(Math.max(parsed, minMinutes), maxMinutes);
    if (clamped !== timedMinutes) {
      playSound("ui-select");
    }
    onTimedDurationChange(clamped * 60);
  };

  const handleTimedMinutesStep = (delta: number) => {
    const next = timedMinutes + delta;
    const clamped = Math.min(Math.max(next, minMinutes), maxMinutes);
    if (clamped !== timedMinutes) {
      playSound("ui-select");
      onTimedDurationChange(clamped * 60);
    }
  };

  const promptForInstallation = useCallback(
    async (promptEvent: BeforeInstallPromptEvent, source: "auto" | "manual") => {
      let consumed = true;

      try {
        if (source === "manual") {
          playSound("ui-select", { allowWhileMuted: true });
        }

        await promptEvent.prompt();
        const choiceResult = await promptEvent.userChoice.catch(() => ({ outcome: "dismissed", platform: "" }));

        if (choiceResult?.outcome === "accepted") {
          setIsInstalled(true);
        }
      } catch (error) {
        consumed = false;
        console.error("Install prompt failed", error);
      } finally {
        if (consumed) {
          setInstallPromptEvent(null);
          setIsInstallPromptSupported(false);
        } else {
          setInstallPromptEvent(promptEvent);
          setIsInstallPromptSupported(true);
        }
      }
    },
    [playSound]
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const standaloneMedia = window.matchMedia("(display-mode: standalone)");
    const updateInstalled = () => setIsInstalled(getIsInstalled());

    updateInstalled();
    const listener = () => updateInstalled();

    if (typeof standaloneMedia.addEventListener === "function") {
      standaloneMedia.addEventListener("change", listener);
    } else if (typeof standaloneMedia.addListener === "function") {
      standaloneMedia.addListener(listener);
    }

    return () => {
      if (typeof standaloneMedia.removeEventListener === "function") {
        standaloneMedia.removeEventListener("change", listener);
      } else if (typeof standaloneMedia.removeListener === "function") {
        standaloneMedia.removeListener(listener);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      const promptEvent = event as BeforeInstallPromptEvent;
      setInstallPromptEvent(promptEvent);
      setIsInstallPromptSupported(true);
      setShowInstallHelp(false);

      if (!autoPromptedRef.current && !isInstalled) {
        autoPromptedRef.current = true;
        void promptForInstallation(promptEvent, "auto");
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPromptEvent(null);
      setIsInstallPromptSupported(false);
      setShowInstallHelp(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [isInstalled, promptForInstallation]);

  const handleInstallClick = async () => {
    if (isInstalled) {
      setShowInstallHelp(false);
      return;
    }

    if (installPromptEvent) {
      await promptForInstallation(installPromptEvent, "manual");
    } else {
      playSound("ui-select", { allowWhileMuted: true });
      setShowInstallHelp(true);
    }
  };

  return (
    <section className="hero-section">
      <div className="hero-section__background" aria-hidden="true">
        <div className="hero-section__gradient" />
        {isNativeRuntime ? (
          <Image
            className="hero-section__media"
            src="/images/hero/hero_section.png"
            alt="Pixelated temple silhouette with gradient sky"
            width={1920}
            height={1080}
            unoptimized
            priority
          />
        ) : (
          <video
            className="hero-section__media"
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
          >
            <source src="/images/hero/background_video.mp4" type="video/mp4" />
          </video>
        )}
        <div className="hero-section__overlay" />
        <div className="hero-section__sheen" />
        <div className="hero-section__scanline" />
      </div>

      <div className="hero-section__content">
        <div className="hero-card pixel-border hero-animate">
          <span className="hero-chip">Faith-Fueled Memory Trial</span>
          <h1 className="hero-title">Prophet Order Challenge</h1>
          <p className="hero-body">
            Arrange the Presidents of The Church of Jesus Christ of Latter-day Saints in
            their correct chronological order. The retro pixel aesthetic sets the stage
            while you test your recall skills.
          </p>
          <p className="hero-body hero-body--secondary">
            Shuffle, swap, and strategize your way to a flawless timeline. Perfect for
            seminary prep, family night, or youth activities that keep the experience
            playful and upbeat.
          </p>
          <div className="hero-card__actions">
            <button
              type="button"
              className="pixel-button hero-button"
              onClick={onToggleDeveloperInfo}
            >
              About the Developer
            </button>
            {!isInstalled && (
              <button
                type="button"
                className="pixel-button hero-button"
                onClick={handleInstallClick}
                disabled={!isInstallPromptSupported}
                title={
                  isInstallPromptSupported
                    ? "Install the app on this device"
                    : "Install prompt not available. Use your browser's Add to Home Screen option."
                }
              >
                Install App
              </button>
            )}
          </div>
          {showInstallHelp && !isInstallPromptSupported && !isInstalled && (
            <p className="hero-panel__hint" role="status">
              Install prompt unavailable. Use your browser menu to add the site to your home screen.
            </p>
          )}
          <p className="hero-source">
            Prophet roster sourced from the Church history site:
            <br />
            <a
              href="https://history.churchofjesuschrist.org/training/library/general-authorities-of-the-church/list-of-presidents-of-the-church-and-their-counselors?lang=eng"
              className="hero-source__link"
              target="_blank"
              rel="noreferrer"
            >
              history.churchofjesuschrist.org
            </a>
          </p>
        </div>

        <div className="hero-sidebar">
          <div className="hero-panel pixel-border hero-animate hero-animate--delay-1">
            <h2 className="hero-panel__title">Choose Your Mode</h2>
            <p className="hero-panel__copy">
              Shuffle through prophetic history in standard play or race the countdown in
              timed mode.
            </p>
            <div className="hero-mode-buttons">
              <button
                type="button"
                className="pixel-button hero-button"
                onClick={() => onStart("standard")}
              >
                Standard Game
              </button>
              <button
                type="button"
                className="pixel-button hero-button"
                onClick={() => onStart("timed")}
              >
                Timed Challenge
              </button>
            </div>
            <p className="hero-panel__hint">
              Use the top-right icons to toggle fullscreen or mute the soundtrack at any
              time.
            </p>
          </div>

          <div className="hero-panel pixel-border hero-animate hero-animate--delay-2">
            <h2 className="hero-panel__title">Timed Challenge Duration</h2>
            <p className="hero-panel__copy">
              Tailor the countdown to your study session before you dive in.
            </p>
            <div className="hero-input">
              <span className="hero-input__label" id="hero-timed-minutes-label">
                Minutes
              </span>
              <div
                className="hero-stepper"
                role="group"
                aria-labelledby="hero-timed-minutes-label"
              >
                <button
                  type="button"
                  className="hero-stepper__control"
                  onClick={() => handleTimedMinutesStep(-1)}
                  aria-label="Decrease minutes"
                  disabled={timedMinutes <= minMinutes}
                >
                  -
                </button>
                <input
                  id={timedMinutesInputId}
                  type="number"
                  min={minMinutes}
                  max={maxMinutes}
                  step={1}
                  value={timedMinutes}
                  onChange={(event) => handleTimedMinutesChange(event.target.value)}
                  className="hero-number"
                  aria-labelledby="hero-timed-minutes-label"
                />
                <button
                  type="button"
                  className="hero-stepper__control"
                  onClick={() => handleTimedMinutesStep(1)}
                  aria-label="Increase minutes"
                  disabled={timedMinutes >= maxMinutes}
                >
                  +
                </button>
              </div>
            </div>
            <p className="hero-panel__note">
              Range {minMinutes}–{maxMinutes} min. Adjust before starting a timed run.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
