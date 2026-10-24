/**
 * page.tsx — Home page (poll dashboard)
 *
 * Features:
 * 1. Show wallet connection, user identity, and balance
 * 2. Summarize poll counts (total, active, upcoming, closed, and draft)
 * 3. List active polls with quick links to their details
 * 4. Show recently created polls, regardless of status
 * 5. Provide shortcuts to all polls, poll creation, and the admin dashboard
 */
"use client";
import { ChainTimeBanner } from "@/components/ui/ChainTimeBanner";
import { useMemo, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useWallet } from "@solana/wallet-adapter-react";
import { useConnection } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { BadgeColor } from "@/components/ui/Badge";
// Dynamically import the wallet button
const WalletMultiButtonDynamic = dynamic(
  async () =>
    (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false },
);

// ---- UI components ----
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { EmptyState } from "@/components/ui/EmptyState";

// ---- Data fetching ----
import { useAllPolls, useMyEmployee } from "@/hooks/useFetch";
import type { PollListItem } from "@/hooks/useFetch";

// ---- Reuse PollCard's status logic to keep the home page and poll list consistent ----
import {
  getDisplayStatus,
  type DisplayStatus,
} from "@/components/poll/PollCard";

// ---- Constants ----
import { ADMIN_PUBKEY } from "@/lib/constants";

// ============================================================
// Helper functions and constants
// ============================================================

/** Convert a bigint timestamp to a local readable time */
function formatTime(ts: bigint): string {
  return new Date(Number(ts) * 1000).toLocaleString("en-US");
}

/** Display status labels (used with PollCard's getDisplayStatus) */
const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  pending: "Upcoming",
  active: "Active",
  closed: "Closed",
};

/** Badge color for each display status */
const STATUS_COLOR: Record<string, BadgeColor> = {
  draft: "gray",
  pending: "yellow",
  active: "green",
  closed: "red",
  Draft: "gray",
  Ready: "green",
  Closed: "red",
};

// ============================================================
// Custom hook: fetch the wallet balance
// ============================================================

/**
 * Get the connected wallet's SOL balance on the local network.
 * Refreshes automatically every 15 seconds.
 */
function useWalletBalance() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [balance, setBalance] = useState<number | null>(null);

  const fetchBalance = useCallback(async () => {
    if (!publicKey) {
      setBalance(null);
      return;
    }
    try {
      const lamports = await connection.getBalance(publicKey);
      // Convert lamports to SOL and keep four decimal places
      setBalance(lamports / LAMPORTS_PER_SOL);
    } catch (err) {
      console.warn("Failed to fetch balance:", err);
    }
  }, [connection, publicKey]);

  useEffect(() => {
    // Schedule the initial fetch to avoid calling setState synchronously in an effect
    const t = setTimeout(fetchBalance, 0);
    // Refresh the balance every 60 seconds
    const timer = setInterval(fetchBalance, 60_000);
    return () => {
      clearTimeout(t);
      clearInterval(timer);
    };
  }, [fetchBalance]);
  return balance;
}

// ============================================================
// Child component: poll row that links to poll details
// ============================================================

function PollRow({ poll }: { poll: PollListItem }) {
  // Use getDisplayStatus to match the poll list page
  const displayStatus = getDisplayStatus(poll);

  return (
    <Link href={`/polls/${Number(poll.pollId)}`}>
      <Card>
        <div className="p-4 flex items-center justify-between">
          {/* Left: title, description, and metadata */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium truncate">{poll.title}</span>
              <Badge color={STATUS_COLOR[displayStatus] ?? "gray"}>
                {STATUS_LABEL[displayStatus] ?? displayStatus}
              </Badge>
              {/* Mark invalid polls */}
              {poll.isWrongPoll && <Badge color="red">Invalid</Badge>}
            </div>
            <p className="text-sm text-gray-400 mt-1 truncate">
              {poll.simpleDescription}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Created {formatTime(poll.createTime)} · {poll.candidates.length} candidates ·{" "}
              {Number(poll.totalVotes)} votes
            </p>
          </div>
          {/* Arrow on the right */}
          <span className="text-gray-500 ml-2 flex-shrink-0">→</span>
        </div>
      </Card>
    </Link>
  );
}

// ============================================================
// Main component
// ============================================================

export default function Home() {
  const { publicKey, connected } = useWallet();

  // ---- Wallet balance ----
  const balance = useWalletBalance();

  // ---- Check admin status ----
  const isAdmin = useMemo(() => {
    if (!publicKey) return false;
    return publicKey.equals(ADMIN_PUBKEY);
  }, [publicKey]);

  // ---- Fetch all polls ----
  const {
    data: polls,
    loading: pollsLoading,
    error: pollsError,
  } = useAllPolls();

  // ---- Fetch the current user's employee record ----
  const { data: employee } = useMyEmployee();

  // ---- Statistics (use getDisplayStatus for consistent calculations) ----
  const stats = useMemo(() => {
    if (!polls) return { total: 0, active: 0, pending: 0, closed: 0, draft: 0 };
    return {
      total: polls.length,
      active: polls.filter((p) => getDisplayStatus(p) === "active").length,
      pending: polls.filter((p) => getDisplayStatus(p) === "pending").length,
      closed: polls.filter((p) => getDisplayStatus(p) === "closed").length,
      draft: polls.filter((p) => getDisplayStatus(p) === "draft").length,
    };
  }, [polls]);

  // ---- Active polls (use getDisplayStatus and sort by creation time) ----
  const activePolls = useMemo(() => {
    if (!polls) return [];
    return polls
      .filter((p) => getDisplayStatus(p) === "active")
      .sort((a: PollListItem, b: PollListItem) =>
        Number(b.createTime - a.createTime),
      );
  }, [polls]);

  // ---- Recently created polls (any status; latest five) ----
  const recentPolls = useMemo(() => {
    if (!polls) return [];
    return [...polls]
      .sort((a: PollListItem, b: PollListItem) =>
        Number(b.createTime - a.createTime),
      )
      .slice(0, 5);
  }, [polls]);

  // ---- Render ----
  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      {/* ======== Header: title and wallet button ======== */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Solana Vote DApp</h1>
          <h2 className="text-gray-400 text-sm">An open voting system for enterprise use cases</h2>
        </div>
        <WalletMultiButtonDynamic />
      </div>

      {/* ======== User information card ======== */}
      {connected && publicKey ? (
        <Card>
          <div className="p-4 space-y-1 text-sm">
            {/* Show the full wallet address */}
            <p>
              Wallet:
              <span className="font-mono text-blue-400 break-all">
                {publicKey.toBase58()}
              </span>
            </p>
            {/* Show wallet balance */}
            <p>
              Balance:
              <span className="font-mono text-yellow-400">
                {balance !== null ? `${balance.toFixed(4)} SOL` : "Loading..."}
              </span>
            </p>
            {/* Employee record linked to this wallet */}
            {employee && (
              <p>
                Employee: {employee.name}
                {employee.active ? " (Active)" : " (Inactive)"}
              </p>
            )}
            <p>
              Role:
              {isAdmin ? (
                <Badge color="yellow">Administrator</Badge>
              ) : (
                <Badge color="gray">Standard User</Badge>
              )}
            </p>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="p-4 text-center text-gray-400">
            Connect your wallet to view your full account information.
          </div>
        </Card>
      )}
      {/* ======== On-chain time monitor ======== */}
      <ChainTimeBanner />
      {/* ======== Statistics overview ======== */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Total Polls", value: stats.total, color: "text-white" },
          { label: "Active", value: stats.active, color: "text-green-400" },
          { label: "Upcoming", value: stats.pending, color: "text-yellow-400" },
          { label: "Closed", value: stats.closed, color: "text-red-400" },
          { label: "Draft", value: stats.draft, color: "text-gray-400" },
        ].map((item) => (
          <Card key={item.label}>
            <div className="p-4 text-center">
              <p className="text-sm text-gray-400">{item.label}</p>
              <p className={`text-2xl font-bold ${item.color}`}>
                {pollsLoading ? "-" : item.value}
              </p>
            </div>
          </Card>
        ))}
      </div>

      {/* ======== Quick links ======== */}
      <div className="flex flex-wrap gap-3">
        <Link href="/polls">
          <Button>View All Polls</Button>
        </Link>
        <Link href="/polls/create">
          <Button>Create Poll</Button>
        </Link>
        {isAdmin && (
          <Link href="/admin">
            <Button>Admin Dashboard</Button>
          </Link>
        )}
      </div>

      {/* ======== Active polls ======== */}
      <section>
        <h2 className="text-lg font-semibold mb-3">🟢 Active Polls</h2>

        {/* Loading */}
        {pollsLoading && <LoadingSpinner />}

        {/* Error */}
        {pollsError && (
          <ErrorMessage message={pollsError.message ?? "Failed to load polls"} />
        )}

        {/* Empty state */}
        {!pollsLoading && !pollsError && activePolls.length === 0 && (
          <EmptyState
            title="No active polls"
            description="Waiting for an administrator to create and open a poll."
          />
        )}

        {/* Poll list */}
        {activePolls.length > 0 && (
          <div className="space-y-3">
            {activePolls.map((poll) => (
              <PollRow key={poll.pda.toBase58()} poll={poll} />
            ))}
          </div>
        )}
      </section>

      {/* ======== Recent polls ======== */}
      {!pollsLoading && recentPolls.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">📋 Recent Polls</h2>
          <div className="space-y-3">
            {recentPolls.map((poll) => (
              <PollRow key={poll.pda.toBase58()} poll={poll} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
