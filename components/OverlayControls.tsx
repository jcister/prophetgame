"use client";

import type { ReactNode } from "react";

interface OverlayControlsProps {
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export function OverlayControls({
  isFullscreen,
  onToggleFullscreen,
  isMuted,
  onToggleMute
}: OverlayControlsProps) {
  return (
    <div className="pointer-events-none fixed right-3 top-3 z-50 flex flex-col gap-2 sm:right-4 sm:top-4 sm:flex-row">
      <IconButton
        label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        pressed={isFullscreen}
        onClick={onToggleFullscreen}
        icon={isFullscreen ? <ExitFullscreenIcon /> : <EnterFullscreenIcon />}
      />
      <IconButton
        label={isMuted ? "Unmute audio" : "Mute audio"}
        pressed={isMuted}
        onClick={onToggleMute}
        icon={isMuted ? <VolumeOffIcon /> : <VolumeOnIcon />}
      />
    </div>
  );
}

interface IconButtonProps {
  label: string;
  pressed: boolean;
  onClick: () => void;
  icon: ReactNode;
}

function IconButton({ label, pressed, onClick, icon }: IconButtonProps) {
  return (
    <button
      type="button"
      className="pixel-border pointer-events-auto flex h-11 w-11 items-center justify-center bg-panel/90 text-slate-50 transition hover:bg-panel/75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent data-[pressed=true]:bg-accent data-[pressed=true]:text-background sm:h-12 sm:w-12"
      aria-label={label}
      aria-pressed={pressed}
      data-pressed={pressed}
      title={label}
      onClick={onClick}
    >
      <span className="sr-only">{label}</span>
      <span aria-hidden className="h-5 w-5 sm:h-6 sm:w-6">
        {icon}
      </span>
    </button>
  );
}

function EnterFullscreenIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-full w-full"
    >
      <path d="M3 9V3h6" />
      <path d="M21 9V3h-6" />
      <path d="M3 15v6h6" />
      <path d="M21 15v6h-6" />
    </svg>
  );
}

function ExitFullscreenIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-full w-full"
    >
      <path d="M9 3H3v6" />
      <path d="M15 3h6v6" />
      <path d="M9 21H3v-6" />
      <path d="M15 21h6v-6" />
    </svg>
  );
}

function VolumeOnIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-full w-full"
    >
      <path d="M5 10v4h3l4 3V7l-4 3H5z" />
      <path d="M16 9a3 3 0 0 1 0 6" />
      <path d="M18.5 6.5a6 6 0 0 1 0 11" />
    </svg>
  );
}

function VolumeOffIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-full w-full"
    >
      <path d="M5 10v4h3l4 3V7l-4 3H5z" />
      <line x1="19" y1="5" x2="5" y2="19" />
    </svg>
  );
}
