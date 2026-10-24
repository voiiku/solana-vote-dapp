/**
 * EmptyState.tsx — Empty-state placeholder component
 *
 * Shown when a list has no data to guide the user toward an action.
 */
"use client";

import { type ReactNode } from "react";

interface EmptyStateProps {
  /** Title */
  title?: string;
  /** Description */
  description?: string;
  /** Action area, such as a "Create" button */
  action?: ReactNode;
  /** Custom icon */
  icon?: ReactNode;
}

/**
 * Empty state
 *
 * @example
 * <EmptyState
 *   title="No polls yet"
 *   description="No polls have been created yet."
 *   action={<Button onClick={handleCreate}>Create poll</Button>}
 * />
 */
export function EmptyState({
  title = "No data available",
  description,
  action,
  icon,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {/* Icon */}
      {icon || (
        <svg
          className="h-12 w-12 text-gray-600 mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
      )}

      <h3 className="text-base font-medium text-gray-400">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-gray-500 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}