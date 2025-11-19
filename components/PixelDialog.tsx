"use client";

import type { ReactNode } from "react";

interface PixelDialogProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  cancelLabel?: string;
  onCancel?: () => void;
}

export function PixelDialog({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  cancelLabel,
  onCancel
}: PixelDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="dialog-overlay" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
      <div className="pixel-border dialog-panel">
        <div className="dialog-content">
          <h3 id="dialog-title" className="dialog-title">
            {title}
          </h3>
          <div className="dialog-message">{message}</div>
        </div>
        <div className="dialog-actions">
          <button type="button" className="pixel-button" onClick={onConfirm}>
            {confirmLabel}
          </button>
          {cancelLabel && onCancel && (
            <button type="button" className="pixel-button" onClick={onCancel}>
              {cancelLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
