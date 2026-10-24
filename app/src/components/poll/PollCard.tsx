/**
 * PollCard.tsx — Poll card component
 *
 * Displays a poll summary in a list:
 * - Status badge (draft/upcoming/active/closed)
 * - Title and description
 * - Vote and candidate counts
 * - Timing information
 * Clicking the card opens /polls/:id.
 *
 * Note: PollListItem field types depend on useFetch.ts. Helpers in this
 * component support both raw Anchor types (BN, number[]) and decoded types
 * (number, string).
 */
"use client";

import Link from "next/link";
import type { PollListItem } from "@/hooks";

// ============================================================
// 1. Shared helper functions (exported for reuse by other poll components)
// ============================================================

/**
 * Safely convert BN, bigint, or number to a JavaScript number.
 * Anchor u64/i64 fields may be BN objects, bigint, or number.
 */
export function toNum(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "bigint") return Number(v);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (v && typeof (v as any).toNumber === "function") return (v as any).toNumber();
  return Number(v) || 0;
}

/**
 * Decode a field that may be a [u8;64] byte array into a string.
 * Return it directly if useFetch has already decoded it.
 */
export function decodeField(v: unknown): string {
  if (typeof v === "string") return v;
  if (Array.isArray(v) || v instanceof Uint8Array) {
    const arr = v instanceof Uint8Array ? v : new Uint8Array(v as number[]);
    return new TextDecoder().decode(arr).replace(/\0+$/, "");
  }
  return String(v ?? "");
}

/**
 * Get an Anchor enum key. Anchor enums are represented in JavaScript as
 * { draft: {} }; this extracts the key.
 */
export function getStatusKey(status: unknown): string {
  if (typeof status === "string") return status;
  if (typeof status === "object" && status !== null) {
    return Object.keys(status)[0] ?? "unknown";
  }
  return "unknown";
}

/** Poll status for display in the frontend */
export type DisplayStatus = "draft" | "pending" | "active" | "closed" | "error";

/**
 * Derive the display status from the on-chain state and current time.
 *
 * On-chain, a poll can be Draft, Ready, or Closed. The frontend further
 * divides Ready into pending (before the start time) and active (during voting).
 */
export function getDisplayStatus(poll: PollListItem): DisplayStatus {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = poll as any;
  if (p.isWrongPoll) return "error";

  const key = getStatusKey(p.status);
  if (key === "closed") return "closed";
  if (key === "draft") return "draft";

  // For Ready polls, use the times to determine pending, active, or closed
  const now = Math.floor(Date.now() / 1000);
  const start = toNum(p.startAt);
  const end = toNum(p.endAt);

  if (now < start) return "pending";
  if (now < end) return "active";
  return "closed"; // The end time passed, but the on-chain status has not updated
}

/** Display settings for each status (label and Tailwind classes) */
export const STATUS_STYLES: Record<DisplayStatus, { label: string; cls: string }> = {
  draft:   { label: "Draft",     cls: "bg-gray-600 text-gray-200" },
  pending: { label: "Upcoming", cls: "bg-yellow-700 text-yellow-100" },
  active:  { label: "Active",   cls: "bg-emerald-600 text-white" },
  closed:  { label: "Closed",   cls: "bg-red-800 text-red-200" },
  error:   { label: "Error",     cls: "bg-red-900 text-red-300" },
};

/** Format a Unix timestamp as a readable date */
export function fmtDate(ts: unknown): string {
  const n = toNum(ts);
  if (!n) return "—";
  return new Date(n * 1000).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Format a complete date, including the year */
export function fmtDateFull(ts: unknown): string {
  const n = toNum(ts);
  if (!n) return "—";
  return new Date(n * 1000).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ============================================================
// 2. PollCard component
// ============================================================

interface PollCardProps {
  poll: PollListItem;
}

export default function PollCard({ poll }: PollCardProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = poll as any;
  const status = getDisplayStatus(poll);
  const style = STATUS_STYLES[status];
  const pollId = toNum(p.pollId);

  return (
    <Link
      href={`/polls/${pollId}`}
      className="block bg-gray-800 rounded-lg p-5 hover:bg-gray-700/80 hover:ring-1 hover:ring-gray-600 transition-all"
    >
      {/* ── Top: status badge and poll ID ─────────────── */}
      <div className="flex items-center justify-between mb-3">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${style.cls}`}>
          {style.label}
        </span>
        <span className="text-xs text-gray-500 font-mono">#{pollId}</span>
      </div>

      {/* ── Title ────────────────────────────────────── */}
      <h3 className="text-lg font-semibold mb-1 line-clamp-1">
        {decodeField(p.title) || "Untitled"}
      </h3>

      {/* ── Description ──────────────────────────────── */}
      <p className="text-sm text-gray-400 mb-3 line-clamp-2">
        {decodeField(p.simpleDescription) || "No description"}
      </p>

      {/* ── Footer information ───────────────────────── */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span>🗳 {toNum(p.totalVotes)} votes</span>
        <span>👥 {(p.candidates as unknown[])?.length ?? 0} candidates</span>
        <span className="ml-auto">
          {status === "active"
            ? `Ends ${fmtDate(p.endAt)}`
            : status === "pending"
              ? `Starts ${fmtDate(p.startAt)}`
              : fmtDate(p.endAt)}
        </span>
      </div>
    </Link>
  );
}