/**
 * Input.tsx — Text input component
 *
 * A consistent dark-themed form input with a label, placeholder, error
 * message, and helper text.
 */
"use client";

import { type InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Input label */
  label?: string;
  /** Error message, shown in red */
  error?: string;
  /** Helper text shown below the input */
  helperText?: string;
  /** Whether to fill the available width; defaults to true */
  fullWidth?: boolean;
}

/**
 * Text input
 *
 * @example
 * <Input
 *   label="Department name"
 *   placeholder="Enter a department name"
 *   error={errors.name}
 *   value={name}
 *   onChange={e => setName(e.target.value)}
 * />
 */
const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      fullWidth = true,
      className = "",
      id,
      ...rest
    },
    ref
  ) => {
    // Generate an ID if one was not provided
    const inputId = id || `input-${label?.replace(/\s+/g, "-").toLowerCase()}`;

    return (
      <div className={fullWidth ? "w-full" : ""}>
        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-300 mb-1.5"
          >
            {label}
          </label>
        )}

        {/* Input */}
        <input
          ref={ref}
          id={inputId}
          className={[
            "block bg-gray-900 text-white rounded-md px-3 py-2",
            "border transition-colors duration-150",
            "placeholder:text-gray-500",
            "focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-gray-800",
            // Error state or normal state
            error
              ? "border-red-500 focus:ring-red-500/50"
              : "border-gray-600 focus:border-blue-500 focus:ring-blue-500/50",
            fullWidth ? "w-full" : "",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
          {...rest}
        />

        {/* Error message */}
        {error && <p className="mt-1 text-xs text-red-400">{error}</p>}

        {/* Helper text */}
        {helperText && !error && (
          <p className="mt-1 text-xs text-gray-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
export type { InputProps };