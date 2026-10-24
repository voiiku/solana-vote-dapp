/**
 * ErrorMessage.tsx — Error message component
 *
 * Usage:
 * - Displayed when data fails to load or a form submission fails
 * - Supports retrying the operation
 */
"use client";

import { Button } from "./Button";

interface ErrorMessageProps {
  /** Error title */
  title?: string;
  /** Error details */
  message: string;
  /** Retry callback; a retry button is shown when provided */
  onRetry?: () => void;
  /** Custom class name */
  className?: string;
}

/**
 * Error message
 *
 * @example
 * // Simple error
 * <ErrorMessage message="Failed to load" />
 *
 * // With retry
 * <ErrorMessage
 *   title="Failed to load data"
 *   message={error.message}
 *   onRetry={refetch}
 * />
 */
export function ErrorMessage({
  title = "Something went wrong",
  message,
  onRetry,
  className = "",
}: ErrorMessageProps) {
  return (
    <div
      className={`rounded-lg border border-red-800/50 bg-red-900/20 p-4 ${className}`}
    >
      <div className="flex items-start gap-3">
        {/* Error icon */}
        <svg
          className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>

        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-red-400">{title}</h4>
          <p className="mt-1 text-sm text-red-300/80 break-words">{message}</p>

          {onRetry && (
            <Button
              variant="secondary"
              size="sm"
              className="mt-3"
              onClick={onRetry}
            >
              Retry
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}