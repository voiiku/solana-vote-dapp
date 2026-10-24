/**
 * Alert.tsx — Inline alert component
 *
 * Usage:
 * - Poll details: show errors, warnings, and success messages
 * - Form validation: show validation errors
 *
 * Unlike a toast, an alert stays in the page flow until dismissed or cleared.
 * Toasts float over the page and disappear automatically.
 */
"use client";

import { type ReactNode } from "react";

/** Alert type */
type AlertVariant = "info" | "success" | "warning" | "error";

interface AlertProps {
  /** Alert type, which determines its color and icon */
  variant?: AlertVariant;
  /** Optional title */
  title?: string;
  /** Content */
  children: ReactNode;
  /** Custom class name */
  className?: string;
  /** Close callback; omit to hide the close button */
  onClose?: () => void;
}

/** Styles and icons for each alert type */
const variantConfig: Record<AlertVariant, { bg: string; border: string; text: string; icon: string }> = {
  info: {
    bg: "bg-blue-900/30",
    border: "border-blue-700/50",
    text: "text-blue-300",
    icon: "ℹ️",
  },
  success: {
    bg: "bg-emerald-900/30",
    border: "border-emerald-700/50",
    text: "text-emerald-300",
    icon: "✅",
  },
  warning: {
    bg: "bg-yellow-900/30",
    border: "border-yellow-700/50",
    text: "text-yellow-300",
    icon: "⚠️",
  },
  error: {
    bg: "bg-red-900/30",
    border: "border-red-700/50",
    text: "text-red-300",
    icon: "❌",
  },
};
/**
 * Inline alert
 *
 * @example
 * <Alert variant="error" title="Voting failed">
 *   You do not have permission to vote.
 * </Alert>
 *
 * <Alert variant="success" onClose={() => setShow(false)}>
 *   Vote submitted successfully!
 * </Alert>
 */
export function Alert({
  variant = "info",
  title,
  children,
  className = "",
  onClose,
}: AlertProps) {
  const config = variantConfig[variant];

  return (
    <div
      role="alert"
      className={`
        flex items-start gap-3 p-4 rounded-lg border
        ${config.bg} ${config.border} ${config.text}
        ${className}
      `}
    >
      {/* Icon */}
      <span className="text-lg flex-shrink-0 mt-0.5">{config.icon}</span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {title && <p className="font-semibold mb-1">{title}</p>}
        <div className="text-sm opacity-90">{children}</div>
      </div>

      {/* Close button */}
      {onClose && (
        <button
          onClick={onClose}
          className="flex-shrink-0 text-current opacity-60 hover:opacity-100 transition-opacity"
          aria-label="Close"
        >
          ✕
        </button>
      )}
    </div>
  );
}