/**
 * PollList.tsx — Poll list component
 *
 * Features:
 * 1. Fetch and display all polls
 * 2. Filter by status (all/draft/upcoming/active/closed)
 * 3. Provide an entry point for creating polls
 * 4. Open the details page when a poll card is clicked
 */
"use client";
import { useAutoUpdatePollStatuses } from "@/hooks/useAutoUpdatePollStatuses";
import { useState, useMemo } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { useAllPolls, useMyEmployee } from "@/hooks";
import PollCard, { getDisplayStatus, type DisplayStatus } from "./PollCard";

/** Filter options */
const FILTER_OPTIONS: { value: DisplayStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "pending", label: "Upcoming" },
  { value: "draft", label: "Draft" },
  { value: "closed", label: "Closed" },
];

export default function PollList() {
  const { publicKey } = useWallet();

  // ── Data fetching ─────────────────────────────────────
  const polls = useAllPolls();
  // Fetch the current user's employee record to determine whether they can create polls
  const myEmployee = useMyEmployee();
  // ── Automatically update the on-chain status of expired polls ──
  // If a poll created by the current user has expired but is still Ready/Draft,
  // trigger tryUpdatePollStatus to synchronize its on-chain status.
  useAutoUpdatePollStatuses(polls.data ?? null, polls.refetch);
  // ── Filter state ──────────────────────────────────────
  const [filter, setFilter] = useState<DisplayStatus | "all">("all");

  // ── Filtering and sorting ─────────────────────────────
  const filteredPolls = useMemo(() => {
    if (!polls.data) return [];

    let list = [...polls.data];

    // Filter by status
    if (filter !== "all") {
      list = list.filter((p) => getDisplayStatus(p) === filter);
    }

    // Sort by poll ID in descending order (newest first)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    list.sort((a, b) => {
      const idA = typeof a.pollId === "number" ? a.pollId : Number(a.pollId);
      const idB = typeof b.pollId === "number" ? b.pollId : Number(b.pollId);
      return idB - idA;
    });

    return list;
  }, [polls.data, filter]);

  // ── Whether to show the create button ──────────────────
  // Only connected users who are employees can see the create button.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const canCreate =
    publicKey && myEmployee.data && (myEmployee.data).allowCreatePoll;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* ── Title bar ─────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🗳️ Polls</h1>
        {canCreate && (
          <Link
            href="/polls/create"
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm font-medium transition-colors"
          >
            + Create Poll
          </Link>
        )}
      </div>

      {/* ── Wallet not connected message ──────────────── */}
      {!publicKey && (
        <div className="bg-gray-800 rounded-lg p-4 text-center text-gray-400">
          Connect your wallet to view polls.
        </div>
      )}

      {/* ── Status filters ─────────────────────────────── */}
      {publicKey && (
        <div className="flex gap-2 flex-wrap">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`px-3 py-1.5 rounded text-sm transition-colors ${
                filter === opt.value
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {opt.label}
              {/* Show the count for each status */}
              {polls.data && (
                <span className="ml-1 text-xs opacity-60">
                  (
                  {opt.value === "all"
                    ? polls.data.length
                    : polls.data.filter(
                        (p) => getDisplayStatus(p) === opt.value,
                      ).length}
                  )
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* ── Loading state ──────────────────────────────── */}
      {polls.loading && (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      )}

      {/* ── Error message ──────────────────────────────── */}
      {polls.error && (
        <div className="bg-red-900/30 border border-red-800 rounded-lg p-4 text-red-400 text-sm">
          Failed to load polls:{polls.error.message}
        </div>
      )}

      {/* ── Poll card grid ────────────────────────────── */}
      {filteredPolls.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPolls.map((poll) => (
            <PollCard key={poll.pda.toBase58()} poll={poll} />
          ))}
        </div>
      )}

      {/* ── Empty state ────────────────────────────────── */}
      {!polls.loading && filteredPolls.length === 0 && polls.data && (
        <div className="text-center py-12 text-gray-500">
          {filter === "all" ? (
            <div>
              <div className="text-4xl mb-3">📭</div>
              <p>No polls yet</p>
              {canCreate && (
                <Link
                  href="/polls/create"
                  className="inline-block mt-3 text-blue-400 hover:text-blue-300 text-sm"
                >
                  Create the first poll →
                </Link>
              )}
            </div>
          ) : (
            <p>
              No polls with the status “{FILTER_OPTIONS.find((o) => o.value === filter)?.label}”
            </p>
          )}
        </div>
      )}
    </div>
  );
}
