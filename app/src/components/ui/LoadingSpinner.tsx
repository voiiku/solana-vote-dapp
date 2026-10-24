/**
 * LoadingSpinner.tsx — Loading indicator component
 *
 * Supports two modes:
 * - inline: Small inline indicator for buttons and table cells
 * - fullPage: Large centered indicator for page loading
 */
"use client";

interface LoadingSpinnerProps {
  /** Display mode */
  mode?: "inline" | "fullPage";
  /** Loading message */
  text?: string;
  /** Spinner size (Tailwind class) */
  size?: string;
}

export function LoadingSpinner({
  mode = "inline",
  text,
  size,
}: LoadingSpinnerProps) {
  // SVG spinner
  const spinnerSize = size || (mode === "fullPage" ? "h-10 w-10" : "h-5 w-5");

  const spinner = (
    <svg
      className={`animate-spin text-blue-500 ${spinnerSize}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );

  if (mode === "fullPage") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
        {spinner}
        {text && <p className="text-sm text-gray-400">{text}</p>}
      </div>
    );
  }

  // Inline mode
  return (
    <span className="inline-flex items-center gap-2">
      {spinner}
      {text && <span className="text-sm text-gray-400">{text}</span>}
    </span>
  );
}