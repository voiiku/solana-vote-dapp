/**
 * Button.tsx — General-purpose button component
 *
 * Provides five visual variants and three sizes, with loading, disabled,
 * and full-width states.
 *
 * Variants:
 * - primary: Main actions such as create or confirm
 * - secondary: Secondary actions such as cancel or back
 * - danger: Destructive actions such as delete or close
 * - ghost: Borderless inline actions
 * - success: Actions such as enable or activate
 */
"use client";

import { type ButtonHTMLAttributes, forwardRef } from "react";

// ── Type definitions ─────────────────────────────────────────────────

/** Button visual variant */
type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "success";

/** Button size */
type ButtonSize = "sm" | "md" | "lg";

/** Button props, extending the native button attributes */
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual variant; defaults to primary */
  variant?: ButtonVariant;
  /** Size; defaults to md */
  size?: ButtonSize;
  /** Whether the button is loading (shows a spinner and disables clicks) */
  loading?: boolean;
  /** Whether to fill the parent width */
  fullWidth?: boolean;
}

// ── Style mappings ─────────────────────────────────────────────────

/** Tailwind classes for each variant */
const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 " +
    "focus:ring-blue-500/50",
  secondary:
    "bg-transparent text-gray-300 border border-gray-600 hover:bg-gray-800 " +
    "active:bg-gray-700 focus:ring-gray-500/50",
  danger:
    "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 " +
    "focus:ring-red-500/50",
  ghost:
    "bg-transparent text-gray-400 hover:text-white hover:bg-gray-800 " +
    "focus:ring-gray-500/50",
  success:
    "bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 " +
    "focus:ring-emerald-500/50",
};

/** Tailwind classes for each size */
const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs rounded",
  md: "px-4 py-2 text-sm rounded-md",
  lg: "px-6 py-3 text-base rounded-lg",
};

// ── Component implementation ─────────────────────────────────────────────────

/**
 * General-purpose button component
 *
 * @example
 * // Primary button
 * <Button onClick={handleSave}>Save</Button>
 *
 * // Loading destructive button
 * <Button variant="danger" loading>Deleting...</Button>
 *
 * // Full-width secondary button
 * <Button variant="secondary" fullWidth>Cancel</Button>
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      fullWidth = false,
      disabled,
      className = "",
      children,
      ...rest
    },
    ref
  ) => {
    // Combine all style classes
    const classes = [
      // Base styles
      "inline-flex items-center justify-center font-medium",
      "transition-colors duration-150 ease-in-out",
      "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900",
      // Variant styles
      variantStyles[variant],
      // Size styles
      sizeStyles[size],
      // Full width
      fullWidth ? "w-full" : "",
      // Disabled/loading state
      disabled || loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
      // Custom class name
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <button
        ref={ref}
        className={classes}
        disabled={disabled || loading}
        {...rest}
      >
        {/* Show a spinner while loading */}
        {loading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
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
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };
export type { ButtonProps, ButtonVariant, ButtonSize };