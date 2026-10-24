/**
 * app/my/page.tsx — My account
 *
 * Features:
 * 1. Show the employee information linked to the current wallet (name, ID,
 *    status, permissions, role, and department)
 * 2. Show voting history, including poll, vote time, and number of choices
 * 3. Provide quick navigation
 */
"use client";

import { useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useWallet } from "@solana/wallet-adapter-react";

// Dynamically import the wallet button
const WalletMultiButtonDynamic = dynamic(
  async () =>
    (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false },
);

// ---- UI components ----
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { EmptyState } from "@/components/ui/EmptyState";

// ---- Data fetching ----
import {
  useMyEmployee,
  useAllRoles,
  useAllPolls,
  useMyVoteStubs,
} from "@/hooks/useFetch";
import type { PollListItem, VoteStubListItem } from "@/hooks/useFetch";

// ---- Badge color type ----
type BadgeColor = "gray" | "green" | "red" | "blue" | "yellow" | "purple";

// ============================================================
// Implementation note.
// ============================================================

/** Convert a bigint timestamp to a local readable time */
function formatTime(ts: bigint): string {
  return new Date(Number(ts) * 1000).toLocaleString("en-US");
}

// ============================================================
// Main component
// ============================================================

export default function MyPage() {
  const { publicKey, connected } = useWallet();

  // ---- Fetch employee information ----
  const {
    data: employee,
    loading: empLoading,
    error: empError,
  } = useMyEmployee();

  // ---- Fetch all roles to find the employee's role and department ----
  const { data: allRoles } = useAllRoles();

  // ---- Fetch all polls to show titles in voting history ----
  const { data: allPolls } = useAllPolls();

  // ---- Fetch the current user's voting history ----
  const { data: voteStubs, loading: stubsLoading } = useMyVoteStubs();

  // ---- Find the employee's role information ----
  const myRole = useMemo(() => {
    if (!employee || !allRoles) return null;
    return allRoles.find((r) => r.pda.equals(employee.mainRoleKey)) ?? null;
  }, [employee, allRoles]);

  // ---- Map poll IDs to PollListItems for titles in voting history ----
  const pollMap = useMemo(() => {
    if (!allPolls) return new Map<string, PollListItem>();
    const map = new Map<string, PollListItem>();
    allPolls.forEach((p) => map.set(String(p.pollId), p));
    return map;
  }, [allPolls]);

  // ============================================================
  // Render: wallet not connected
  // ============================================================
  if (!connected || !publicKey) {
    return (
      <main className="max-w-3xl mx-auto p-6 space-y-6">
        <h1 className="text-2xl font-bold">👤 My Account</h1>
        <Card>
          <div className="p-6 text-center space-y-4">
            <p className="text-gray-400">Connect your wallet to view your account.</p>
            <WalletMultiButtonDynamic />
          </div>
        </Card>
      </main>
    );
  }

  // ============================================================
  // Render: loading
  // ============================================================
  if (empLoading) return <LoadingSpinner />;

  // ============================================================
  // Render: loading failed
  // ============================================================
  if (empError) {
    return <ErrorMessage message={empError.message ?? "Failed to load employee information"} />;
  }

  // ============================================================
  // Render: no employee record
  // ============================================================
  if (!employee) {
    return (
      <main className="max-w-3xl mx-auto p-6 space-y-6">
        <h1 className="text-2xl font-bold">👤 My Account</h1>
        <EmptyState
          title="No employee record found"
          description="This wallet address is not linked to an employee account. Contact an administrator to create one."
        />
        <Link href="/">
          <Button>Back to Home</Button>
        </Link>
      </main>
    );
  }

  // ============================================================
  // Render: account page
  // ============================================================
  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">👤 My Account</h1>

      {/* ======== Employee information card ======== */}
      <Card>
        <div className="p-4 space-y-3">
          <h2 className="text-lg font-semibold">Employee Information</h2>

          <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
            {/* Name */}
            <span className="text-gray-400">Name</span>
            <span>{employee.name}</span>

            {/* Employee ID */}
            <span className="text-gray-400">Employee ID</span>
            <span>{Number(employee.employeeId)}</span>

            {/* Employment status */}
            <span className="text-gray-400">Status</span>
            <span>
              <Badge color={employee.active ? "green" : "red"}>
                {employee.active ? "Active" : "Inactive"}
              </Badge>
            </span>

            {/* Poll creation permission */}
            <span className="text-gray-400">Can create polls</span>
            <span>
              <Badge color={employee.allowCreatePoll ? "green" : "gray"}>
                {employee.allowCreatePoll ? "Yes" : "No"}
              </Badge>
            </span>

            {/* Voting permission */}
            <span className="text-gray-400">Can vote</span>
            <span>
              <Badge color={employee.allowVote ? "green" : "gray"}>
                {employee.allowVote ? "Yes" : "No"}
              </Badge>
            </span>

            {/* Temporary level, shown only when set */}
            {employee.tempLevel !== null && (
              <>
                <span className="text-gray-400">Temporary level</span>
                <span>{employee.tempLevel}</span>
              </>
            )}

            {/* Role, found in allRoles */}
            <span className="text-gray-400">Role</span>
            <span>{myRole ? myRole.roleName : "—"}</span>

            {/* Role level */}
            <span className="text-gray-400">Level</span>
            <span>{myRole ? myRole.roleLevel : "—"}</span>

            {/* Department, from the role's departmentName */}
            <span className="text-gray-400">Department</span>
            <span>{myRole ? myRole.departmentName : "—"}</span>

            {/* Wallet address */}
            <span className="text-gray-400">Wallet address</span>
            <span className="font-mono text-xs break-all">
              {employee.owner.toBase58()}
            </span>
          </div>
        </div>
      </Card>

      {/* ======== Voting history ======== */}
      <Card>
        <div className="p-4 space-y-3">
          <h2 className="text-lg font-semibold">Voting History</h2>

          {/* Loading */}
          {stubsLoading && <LoadingSpinner />}

          {/* Empty history */}
          {!stubsLoading && (!voteStubs || voteStubs.length === 0) && (
            <EmptyState
              title="No voting history"
              description="You have not participated in any polls yet."
            />
          )}

          {/* Voting history list */}
          {voteStubs && voteStubs.length > 0 && (
            <div className="space-y-2">
              {voteStubs.map((stub: VoteStubListItem) => {
                // Look up the poll title in pollMap
                const poll = pollMap.get(String(stub.pollId));
                return (
                  <Link
                    key={stub.pda.toBase58()}
                    href={`/polls/${Number(stub.pollId)}`}
                  >
                    <div className="p-3 rounded-lg border border-gray-700 hover:border-gray-500 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          {/* Poll title, or the ID if not found */}
                          <p className="font-medium">
                            {poll ? poll.title : `Poll #${Number(stub.pollId)}`}
                          </p>
                          {/* Vote time and number of choices */}
                          <p className="text-xs text-gray-500 mt-1">
                            Voted: {formatTime(stub.timestamp)} · Selected{" "}
                            {stub.choices.length} candidates
                          </p>
                        </div>
                        <span className="text-gray-500 flex-shrink-0">→</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {/* ======== Quick navigation ======== */}
      <div className="flex flex-wrap gap-3">
        <Link href="/polls">
          <Button>View All Polls</Button>
        </Link>
        <Link href="/">
          <Button>Back to Home</Button>
        </Link>
      </div>
    </main>
  );
}
