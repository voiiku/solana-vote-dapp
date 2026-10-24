/**
 * Modal.tsx — Modal dialog component
 *
 * Displays a centered dialog over a full-screen overlay. The dialog can be
 * dismissed by clicking the overlay or pressing Escape and uses a React
 * Portal to avoid z-index issues.
 *
 * Accessibility:
 * - Uses role="dialog" and aria-modal
 * - Closes on Escape
 */
"use client";

import { type ReactNode, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Close callback */
  onClose: () => void;
  /** Dialog title */
  title?: string;
  /** Dialog content */
  children: ReactNode;
  /** Footer actions, such as confirm/cancel buttons */
  footer?: ReactNode;
  /** Dialog width */
  size?: "sm" | "md" | "lg";
  /** Whether clicking the overlay closes the modal; defaults to true */
  closeOnOverlay?: boolean;
}

/** Maximum width for each size */
const sizeMap = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
};

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
  closeOnOverlay = true,
}: ModalProps) {
  // Close on Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      // Prevent body scrolling while open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, handleKeyDown]);

  // Do not render when closed
  if (!open) return null;

  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={closeOnOverlay ? onClose : undefined}
      />

      {/* Dialog */}
      <div
        className={`relative w-full ${sizeMap[size]} bg-gray-800 border border-gray-700 rounded-lg shadow-xl`}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            {/* Close button */}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-1 rounded hover:bg-gray-700"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Content */}
        <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">{children}</div>

        {/* Footer actions */}
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-700">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  // Render into the body with a Portal
  return createPortal(modal, document.body);
}