/**
 * Spinner.tsx — Loading spinner component
 *
 * Lightweight wrapper and re-export of LoadingSpinner that keeps imports
 * consistent in components such as PollDetail. Also provides a compact
 * inline spinner without a full-screen overlay.
 */
"use client";

// Re-export LoadingSpinner for full-page loading states
export { LoadingSpinner } from "./LoadingSpinner";

interface SpinnerProps {
  /** Size: sm=16px, md=24px, lg=32px */
  size?: "sm" | "md" | "lg";
  /** Custom class name */
  className?: string;
}

const sizeMap = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
};

/**
 * Inline loading spinner without an overlay
 *
 * @example
 * <Button disabled={loading}>
 *   {loading && <Spinner size="sm" className="mr-2" />}
 *   Submit
 * </Button>
 */
export function Spinner({ size = "md", className = "" }: SpinnerProps) {
  return (
    <svg
      className={`animate-spin text-blue-400 ${sizeMap[size]} ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-label="Loading"
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
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}