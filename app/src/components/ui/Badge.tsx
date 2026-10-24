/**
 * Badge.tsx — Status badge component
 *
 * Usage:
 * - Poll status: Draft (gray) / Ready (green) / Closed (red)
 * - Employee status: Active (green) / Inactive (gray)
 * - Voting access: Allowed (green) / Denied (red)
 */
"use client";

import { type ReactNode } from "react";

/** Available badge colors */
export type BadgeColor = "gray" | "green" | "red" | "blue" | "yellow" | "purple";

interface BadgeProps {
  /** Badge content */
  children: ReactNode;
  /** Color; defaults to gray */
  color?: BadgeColor;
  /** Custom class name */
  className?: string;
}

/** Color styles */
const colorStyles: Record<BadgeColor, string> = {
  gray: "bg-gray-700 text-gray-300",
  green: "bg-emerald-900/50 text-emerald-400 border border-emerald-700/50",
  red: "bg-red-900/50 text-red-400 border border-red-700/50",
  blue: "bg-blue-900/50 text-blue-400 border border-blue-700/50",
  yellow: "bg-yellow-900/50 text-yellow-400 border border-yellow-700/50",
  purple: "bg-purple-900/50 text-purple-400 border border-purple-700/50",
};

/**
 * Status badge
 *
 * @example
 * <Badge color="green">Active</Badge>
 * <Badge color="red">Closed</Badge>
 */
export function Badge({ children, color = "gray", className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorStyles[color]} ${className}`}
    >
      {children}
    </span>
  );
}

/**
 * Poll status badge
 *
 * Selects a color based on the poll status:
 * - Draft → gray
 * - Ready → green
 * - Closed → red
 */
export function PollStatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: BadgeColor; label: string }> = {
    Draft: { color: "gray", label: "Draft" },
    Ready: { color: "green", label: "Ready" },
    Closed: { color: "red", label: "Closed" },
  };

  const { color, label } = config[status] ?? { color: "gray" as BadgeColor, label: status };

  return <Badge color={color}>{label}</Badge>;
}

/**
 * Boolean status badge (Yes/No)
 */
export function BooleanBadge({
  value,
  trueText = "Yes",
  falseText = "No",
}: {
  value: boolean;
  trueText?: string;
  falseText?: string;
}) {
  return (
    <Badge color={value ? "green" : "red"}>
      {value ? trueText : falseText}
    </Badge>
  );
}