"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";

type ConfettiPiece = {
  id: number;
  left: number;
  delay: number;
  duration: number;
  color: string;
  rotation: number;
};

const COLORS = ["#f7c948", "#6de08d", "#ff5c8a", "#4fc4ff", "#ffe066"];
const PIECE_COUNT = 90;
const DISPLAY_DURATION_MS = 3600;

interface ConfettiOverlayProps {
  active: boolean;
}

export function ConfettiOverlay({ active }: ConfettiOverlayProps) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!active) {
      return;
    }

    setPieces(
      Array.from({ length: PIECE_COUNT }, (_, index) => ({
        id: index,
        left: Math.random() * 100,
        delay: Math.random() * 0.8,
        duration: 2.8 + Math.random() * 1.4,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        rotation: Math.random() * 360
      }))
    );
    setVisible(true);

    const timeout = window.setTimeout(() => {
      setVisible(false);
    }, DISPLAY_DURATION_MS);

    return () => window.clearTimeout(timeout);
  }, [active]);

  if (!visible) {
    return null;
  }

  return (
    <div className="confetti-overlay">
      {pieces.map((piece) => {
        const style: CSSProperties = {
          left: `${piece.left}%`,
          animationDelay: `${piece.delay}s`,
          animationDuration: `${piece.duration}s`,
          backgroundColor: piece.color
        };

        (style as CSSProperties & Record<string, string>)["--confetti-rotate"] = `${piece.rotation}deg`;

        return <span key={piece.id} className="confetti-piece" style={style} />;
      })}
    </div>
  );
}
