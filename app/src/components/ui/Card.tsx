/**
 * Card.tsx — Card container component
 *
 * A dark-themed card with optional header and footer, used to contain
 * forms, data displays, and other content.
 */
"use client";

import { type ReactNode } from "react";

interface CardProps {
  /** Card title, shown at the top */
  title?: string;
  /** Optional actions beside the title, such as buttons */
  headerExtra?: ReactNode;
  /** Card content */
  children: ReactNode;
  /** Footer content, such as action buttons */
  footer?: ReactNode;
  /** Custom class name */
  className?: string;
  /** Whether to remove padding, for full-width content such as tables */
  noPadding?: boolean;
}

/**
 * Card container
 *
 * @example
 * // Basic card
 * <Card title="Department list">
 *   <DepartmentTable />
 * </Card>
 *
 * // Card with footer actions
 * <Card title="Create poll" footer={<Button>Submit</Button>}>
 *   <PollForm />
 * </Card>
 */
export function Card({
  title,
  headerExtra,
  children,
  footer,
  className = "",
  noPadding = false,
}: CardProps) {
  return (
    <div
      className={`bg-gray-800 border border-gray-700 rounded-lg shadow-sm ${className}`}
    >
      {/* Header */}
      {(title || headerExtra) && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          {title && (
            <h3 className="text-lg font-semibold text-white">{title}</h3>
          )}
          {headerExtra && <div className="flex items-center gap-2">{headerExtra}</div>}
        </div>
      )}

      {/* Body */}
      <div className={noPadding ? "" : "px-6 py-4"}>{children}</div>

      {/* Footer */}
      {footer && (
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-700">
          {footer}
        </div>
      )}
    </div>
  );
}