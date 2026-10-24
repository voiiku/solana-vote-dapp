/**
 * Textarea.tsx — Multiline text input
 */
"use client";

import { type TextareaHTMLAttributes, forwardRef } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    { label, error, helperText, fullWidth = true, className = "", id, ...rest },
    ref
  ) => {
    const textareaId = id || `textarea-${label?.replace(/\s+/g, "-").toLowerCase()}`;

    return (
      <div className={fullWidth ? "w-full" : ""}>
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-medium text-gray-300 mb-1.5"
          >
            {label}
          </label>
        )}

        <textarea
          ref={ref}
          id={textareaId}
          className={[
            "block bg-gray-900 text-white rounded-md px-3 py-2 min-h-[80px] resize-y",
            "border transition-colors duration-150",
            "placeholder:text-gray-500",
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
        />

        {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
        {helperText && !error && (
          <p className="mt-1 text-xs text-gray-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

export { Textarea };
export type { TextareaProps };