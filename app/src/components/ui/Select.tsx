/**
 * Select.tsx — Select input component
 *
 * A select input that matches the Input component and supports options,
 * a placeholder, and an error state.
 */
"use client";

import { type SelectHTMLAttributes, forwardRef } from "react";

/** Select option */
export interface SelectOption {
  /** Option value */
  value: string;
  /** Option label */
  label: string;
  /** Whether the option is disabled */
  disabled?: boolean;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  /** Label */
  label?: string;
  /** Available options */
  options: SelectOption[];
  /** Placeholder text for the first, empty-valued option */
  placeholder?: string;
  /** Error message */
  error?: string;
  /** Helper text */
  helperText?: string;
  /** Whether to fill the available width */
  fullWidth?: boolean;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      options,
      placeholder,
      error,
      helperText,
      fullWidth = true,
      className = "",
      id,
      ...rest
    },
    ref
  ) => {
    const selectId = id || `select-${label?.replace(/\s+/g, "-").toLowerCase()}`;

    return (
      <div className={fullWidth ? "w-full" : ""}>
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-gray-300 mb-1.5"
          >
            {label}
          </label>
        )}

        <select
          ref={ref}
          id={selectId}
          className={[
            "block bg-gray-900 text-white rounded-md px-3 py-2",
            "border transition-colors duration-150",
            "focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-gray-800",
            error
              ? "border-red-500 focus:ring-red-500/50"
              : "border-gray-600 focus:border-blue-500 focus:ring-blue-500/50",
            fullWidth ? "w-full" : "",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
          {...rest}
        >
          {/* Placeholder option */}
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}

          {/* Options */}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>

        {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
        {helperText && !error && (
          <p className="mt-1 text-xs text-gray-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";

export { Select };
export type { SelectProps };