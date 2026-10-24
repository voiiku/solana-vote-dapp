/**
 * PollDetail.tsx — Poll details page
 *
 * Features:
 * 1. Display poll details, allow/block lists, and creator information
 * 2. Show candidates and voting results (progress bars and percentages)
 * 3. Validate voting permissions, select candidates, and submit votes
 * 4. Let creators edit poll details, manage candidates and lists, and update status
 *
 * Updates:
 * - Issue 5: InfoSection displays the creator's name and employee ID
 * - Issue 3: ManageSection displays normalError and improves wrapped error messages
 * - Issue 6: VoteSection displays the employee's effective level (temp_level takes precedence)
 */
"use client";
import { PublicKey } from "@solana/web3.js";
import { useState, useMemo, useCallback, useEffect } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";

// On-chain time helper from lib/utils.ts
import { getChainTimestamp } from "@/lib/utils";
// UI components
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { EmptyState } from "@/components/ui/EmptyState";

// Data-fetching hooks
import {
  usePoll,
  useCandidatesByPoll,
  useAllDepartments,
  useAllRoles,
  useVoteStub,
  useMyEmployee,
  useEmployeeByOwner, // Find an employee by wallet public key (Issue 5)
} from "@/hooks/useFetch";
import type {
  PollData,
  CandidateListItem,
  DepartmentListItem,
  RoleListItem,
  EmployeeListItem,
} from "@/hooks/useFetch";

// On-chain operation hooks
import {
  useVote,
  useSetPollNormal,
  useCreateCandidate,
  useAddCandidate,
  useRemoveCandidate,
  useUpdatePollStatus,
  useTryUpdatePollStatus,
  useAddPollAllowDepartments,
  useRemovePollAllowDepartments,
  useAddPollAllowRoles,
  useRemovePollAllowRoles,
  useAddPollBannedDepartments,
  useRemovePollBannedDepartments,
  useAddPollBannedRoles,
  useRemovePollBannedRoles,
} from "@/hooks/usePoll";

// PDA utilities
import { getCandidatePda } from "@/lib/pda";

// ============================================================
// Helper functions and constants
// ============================================================

/** Convert a Unix timestamp to a local time string */
const fmtTime = (ts: number | bigint) =>
  new Date(Number(ts) * 1000).toLocaleString("en-US");

/** Badge color for each poll status */
const STATUS_COLOR: Record<string, "gray" | "green" | "red"> = {
  Draft: "gray",
  Ready: "green",
  Closed: "red",
};

/** Label for each poll status */
const STATUS_LABEL: Record<string, string> = {
  Draft: "Draft",
  Ready: "Ready",
  Closed: "Closed",
};

/** Check whether the poll is within its voting window */
// Accept an optional on-chain timestamp
const isActive = (p: PollData, chainNow?: number) => {
  const now = chainNow ?? Date.now() / 1000;
  return (
    p.status === "Ready" && now >= Number(p.startAt) && now <= Number(p.endAt)
  );
};

// ============================================================
// Child component A — poll information
// ============================================================

function InfoSection({
  poll,
  depts,
  roles,
}: {
  poll: PollData;
  depts: DepartmentListItem[];
  roles: RoleListItem[];
}) {
  // Find the creator's employee record using poll.creator (wallet public key)
  const { data: creatorEmp, loading: creatorLoading } = useEmployeeByOwner(
    poll.creator,
  );

  // Resolve a PDA to a department name
  const dName = useCallback(
    (pda: PublicKey) =>
      depts.find((d) => d.pda.equals(pda))?.departmentName ??
      pda.toBase58().slice(0, 8),
    [depts],
  );

  // Resolve a PDA to "department / role" (Issue 2 fix)
  const rName = useCallback(
    (pda: PublicKey) => {
      const role = roles.find((r) => r.pda.equals(pda));
      if (!role) return pda.toBase58().slice(0, 8);
      return `${role.departmentName} / ${role.roleName}`;
    },
    [roles],
  );

  return (
    <div className="space-y-4">
      {/* Basic information card */}
      <Card>
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">{poll.title}</h2>
            <Badge color={STATUS_COLOR[poll.status] ?? "gray"}>
              {STATUS_LABEL[poll.status] ?? poll.status}
            </Badge>
          </div>
          <p className="text-gray-400">{poll.simpleDescription}</p>
          {poll.detailLink && (
            <p className="text-sm text-blue-400">Details: {poll.detailLink}</p>
          )}

          {/* Creator information (Issue 5) */}
          <div className="text-sm flex items-center gap-2">
            <span className="text-gray-500">Created by:</span>
            {creatorLoading ? (
              <span className="text-gray-400">Loading...</span>
            ) : creatorEmp ? (
              <span className="text-blue-300">
                {/* The field is name, not employeeName */}
                {creatorEmp.name}
                <span className="text-gray-500 ml-1">
                  (Employee ID: {String(creatorEmp.employeeId)})
                </span>
              </span>
            ) : (
              /* Show a truncated wallet address if no employee record is found */
              <span className="text-gray-400 font-mono text-xs">
                {poll.creator.toBase58().slice(0, 16)}…
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-500">Starts:</span>
              {fmtTime(poll.startAt)}
            </div>
            <div>
              <span className="text-gray-500">Ends:</span>
              {fmtTime(poll.endAt)}
            </div>
            <div>
              <span className="text-gray-500">Level range:</span>
              {poll.minLevel} - {poll.maxLevel}
            </div>
            <div>
              <span className="text-gray-500">Maximum choices:</span>
              {poll.maxMultipleChoices}
            </div>
            <div>
              <span className="text-gray-500">Votes cast:</span>
              {String(poll.totalVotes)}
            </div>
            <div>
              <span className="text-gray-500">Candidates:</span>
              {poll.candidates.length}
            </div>
          </div>
          {poll.isWrongPoll && (
            <Alert variant="error">This poll has been marked as invalid.</Alert>
          )}
        </div>
      </Card>

      {/* Allowlist card */}
      {(poll.allowedDepartments.length > 0 || poll.allowedRoles.length > 0) && (
        <Card>
          <div className="p-4 space-y-2">
            <h3 className="font-semibold">Allowlist</h3>
            {poll.allowedDepartments.length > 0 && (
              <div className="flex flex-wrap gap-1">
                <span className="text-gray-500 text-sm mr-1">Allowed departments:</span>
                {poll.allowedDepartments.map((p) => (
                  <Badge key={p.toBase58()} color="blue">
                    {dName(p)}
                  </Badge>
                ))}
              </div>
            )}
            {poll.allowedRoles.length > 0 && (
              <div className="flex flex-wrap gap-1">
                <span className="text-gray-500 text-sm mr-1">Allowed roles:</span>
                {poll.allowedRoles.map((p) => (
                  <Badge key={p.toBase58()} color="purple">
                    {rName(p)}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Blocklist card */}
      {(poll.bannedDepartments.length > 0 || poll.bannedRoles.length > 0) && (
        <Card>
          <div className="p-4 space-y-2">
            <h3 className="font-semibold">Blocklist</h3>
            {poll.bannedDepartments.length > 0 && (
              <div className="flex flex-wrap gap-1">
                <span className="text-gray-500 text-sm mr-1">Blocked departments:</span>
                {poll.bannedDepartments.map((p) => (
                  <Badge key={p.toBase58()} color="red">
                    {dName(p)}
                  </Badge>
                ))}
              </div>
            )}
            {poll.bannedRoles.length > 0 && (
              <div className="flex flex-wrap gap-1">
                <span className="text-gray-500 text-sm mr-1">Blocked roles:</span>
                {poll.bannedRoles.map((p) => (
                  <Badge key={p.toBase58()} color="red">
                    {rName(p)}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

// ============================================================
// Child component B — candidate list and poll results
// ============================================================

function ResultsSection({ candidates }: { candidates: CandidateListItem[] }) {
  const sorted = useMemo(
    () =>
      [...candidates].sort(
        (a, b) => Number(b.candidateCount) - Number(a.candidateCount),
      ),
    [candidates],
  );

  const total = useMemo(
    () => sorted.reduce((s, c) => s + Number(c.candidateCount), 0),
    [sorted],
  );

  if (!candidates.length) return <EmptyState title="No candidates yet" />;

  return (
    <div className="space-y-3">
      {sorted.map((c) => {
        const pct = total > 0 ? (Number(c.candidateCount) / total) * 100 : 0;
        return (
          <Card key={c.pda.toBase58()}>
            <div className="p-3">
              <div className="flex justify-between mb-1">
                <span className="font-medium">{c.candidateName}</span>
                <span className="text-sm text-gray-400">
                  {String(c.candidateCount)} votes ({pct.toFixed(1)}%)
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              {c.pointer && (
                <p className="text-xs text-gray-500 mt-1">
                  Points to: {c.pointer.toBase58().slice(0, 16)}…
                </p>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ============================================================
// Child component C — voting
// ============================================================

function VoteSection({
  poll,
  candidates,
  employee,
  hasVoted,
  roles,
  depts,
  onDone,
  chainNow, // On-chain time
}: {
  poll: PollData;
  candidates: CandidateListItem[];
  employee: EmployeeListItem | null;
  hasVoted: boolean;
  roles: RoleListItem[];
  depts: DepartmentListItem[];
  onDone: () => void;
  chainNow?: number; 
}) {
  const { publicKey } = useWallet();
  const { toast } = useToast();
  const { execute, loading, error } = useVote();

  const [sel, setSel] = useState<Set<string>>(new Set());

  const toggle = useCallback(
    (key: string) =>
      setSel((prev) => {
        const n = new Set(prev);
        if (n.has(key)) n.delete(key);
        else if (n.size < poll.maxMultipleChoices) n.add(key);
        return n;
      }),
    [poll.maxMultipleChoices],
  );

  const submit = useCallback(async () => {
    if (!employee || !publicKey) return;

    const choices = Array.from(sel).map((s) => new PublicKey(s));
    if (!choices.length) {
      toast({ variant: "warning", message: "Select at least one candidate." });
      return;
    }

    const role = roles.find((r) => r.pda.equals(employee.mainRoleKey));
    if (!role) {
      toast({ variant: "error", message: "Your role information could not be found." });
      return;
    }
    const dept = depts.find((d) => d.departmentName === role.departmentName);
    if (!dept) {
      toast({ variant: "error", message: "Your department information could not be found." });
      return;
    }

    const tx = await execute({
      employeeId: employee.employeeId,
      pollId: poll.pollId,
      choices,
      rolePda: role.pda,
      departmentPda: dept.pda,
    });

    if (tx) {
      toast({ variant: "success", message: "Vote submitted successfully!" });
      setSel(new Set());
      onDone();
    } else {
      toast({ variant: "error", message: error?.message ?? "Failed to submit vote." });
    }
  }, [
    employee,
    publicKey,
    sel,
    roles,
    depts,
    poll,
    execute,
    toast,
    onDone,
    error,
  ]);

  // ---- Preflight checks ----
  if (!publicKey) return <Alert variant="warning">Connect your wallet first.</Alert>;
  if (!employee) return <Alert variant="warning">No employee record found.</Alert>;
  if (!employee.allowVote) return <Alert variant="error">You do not have permission to vote.</Alert>;
  if (hasVoted) return <Alert variant="info">You have already voted in this poll.</Alert>;
  if (poll.status !== "Ready") return <Alert variant="info">Voting is not open.</Alert>;
  // Use the on-chain timestamp when checking the voting window.
  if (!isActive(poll, chainNow)) return <Alert variant="info">Outside the voting period.</Alert>;
  if (!candidates.length) return <Alert variant="warning">No candidates available.</Alert>;

  // Calculate the employee's effective level for display (Issue 6).
  // Prefer tempLevel; use roleLevel when tempLevel is null.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // Employee accounts have tempLevel; roleLevel is on the Role account.
  // Look up the role level using employee.mainRoleKey.
  const roleData = roles.find((r) => r.pda.equals(employee.mainRoleKey));
  const effectiveLevel: number | null =
    employee.tempLevel != null
      ? employee.tempLevel // Prefer the temporary level
      : roleData?.roleLevel ?? null; // Otherwise use the role level
  const isTempLevel = employee.tempLevel != null;
  return (
    <div className="space-y-4">
      {/* Non-blocking warning for invalid polls (Issue 3) */}
      {poll.isWrongPoll && (
        <Alert variant="warning">
          ⚠️
          Note: An administrator marked this poll as invalid. You may still participate, but please be aware.
        </Alert>
      )}

      {/* Compare the employee's effective level with the poll's requirements (Issue 6) */}
      {effectiveLevel != null && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-xs flex items-center gap-3">
          <span className="text-gray-400">Your effective level:</span>
          {isTempLevel ? (
            <span className="text-orange-400 font-medium">
              Lv.{effectiveLevel}
              <span className="text-gray-500 ml-1">(Temporary level)</span>
            </span>
          ) : (
            <span className="text-blue-400 font-medium">
              Lv.{effectiveLevel}
              <span className="text-gray-500 ml-1">(Role level)</span>
            </span>
          )}
          <span className="text-gray-500">|</span>
          <span className="text-gray-400">
            Required level: Lv.{poll.minLevel}–Lv.{poll.maxLevel}
          </span>
          {effectiveLevel >= poll.minLevel &&
          effectiveLevel <= poll.maxLevel ? (
            <span className="text-green-400 ml-auto">✓ Eligible</span>
          ) : (
            <span className="text-red-400 ml-auto">✗ Not eligible (the program will reject the vote)</span>
          )}
        </div>
      )}

      <p className="text-sm text-gray-400">
        Select up to {poll.maxMultipleChoices} candidates ({sel.size}/
        {poll.maxMultipleChoices}）
      </p>

      {candidates.map((c) => {
        const k = c.pda.toBase58();
        const on = sel.has(k);
        return (
          <button
            key={k}
            onClick={() => toggle(k)}
            className={`w-full text-left p-3 rounded-lg border transition-colors ${
              on
                ? "border-blue-500 bg-blue-900/30"
                : "border-gray-700 hover:border-gray-500"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  on ? "border-blue-500 bg-blue-500" : "border-gray-500"
                }`}
              >
                {on && <span className="text-white text-xs">✓</span>}
              </div>
              <span>{c.candidateName}</span>
            </div>
          </button>
        );
      })}

      <Button
        onClick={submit}
        disabled={loading || !sel.size}
        className="w-full"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Spinner size="sm" /> Submitting…
          </span>
        ) : (
          "Submit Vote"
        )}
      </Button>
    </div>
  );
}

// ============================================================
// Child component D — PDA list editor shared by allowlists and blocklists
// ============================================================

function PdaListEditor({
  label,
  current,
  options,
  onAdd,
  onRemove,
  busy,
}: {
  label: string;
  current: PublicKey[];
  options: { pda: PublicKey; name: string }[];
  onAdd: (pda: PublicKey) => Promise<void>;
  onRemove: (pda: PublicKey) => Promise<void>;
  busy: boolean;
}) {
  const [picked, setPicked] = useState("");

  const available = options.filter(
    (o) => !current.some((c) => c.equals(o.pda)),
  );

  return (
    <div className="space-y-2">
      <span className="text-sm font-medium text-gray-400">{label}</span>

      {/* Current entries: badge and remove button */}
      <div className="flex flex-wrap gap-1">
        {current.length === 0 && (
          <span className="text-sm text-gray-500">None</span>
        )}
        {current.map((pda) => {
          const name =
            options.find((o) => o.pda.equals(pda))?.name ??
            pda.toBase58().slice(0, 8);
          return (
            <Badge
              key={pda.toBase58()}
              color="blue"
              className="flex items-center gap-1"
            >
              {name}
              <button
                onClick={() => onRemove(pda)}
                disabled={busy}
                className="ml-1 hover:text-red-400"
              >
                ×
              </button>
            </Badge>
          );
        })}
      </div>

      {/* Add a new entry */}
      <div className="flex gap-2">
        <select
          value={picked}
          onChange={(e) => setPicked(e.target.value)}
          className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm"
        >
          <option value="">Select a {label} to add</option>
          {available.map((o) => (
            <option key={o.pda.toBase58()} value={o.pda.toBase58()}>
              {o.name}
            </option>
          ))}
        </select>
        <Button
          onClick={async () => {
            if (picked) {
              await onAdd(new PublicKey(picked));
              setPicked("");
            }
          }}
          disabled={busy || !picked}
        >
          {busy ? <Spinner size="sm" /> : "Add"}
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// Child component E — poll management panel (creator only)
// ============================================================

function ManageSection({
  poll,
  candidates,
  depts,
  roles,
  onDone,
}: {
  poll: PollData;
  candidates: CandidateListItem[];
  depts: DepartmentListItem[];
  roles: RoleListItem[];
  onDone: () => void;
}) {
  const { toast } = useToast();
  const isDraft = poll.status === "Draft";

  // ---- On-chain operation hooks ----
  const { execute: execStatus, loading: statusL } = useUpdatePollStatus();
  const { execute: execTryStatus, loading: tryStatusL } =
    useTryUpdatePollStatus();
  // Destructure error to display on-chain error details (Issue 3)
  const {
    execute: execNormal,
    loading: normalL,
    error: normalError,
  } = useSetPollNormal();
  const { execute: execCreateCand, loading: ccL } = useCreateCandidate();
  const { execute: execAddCand, loading: acL } = useAddCandidate();
  const { execute: execRemoveCand, loading: rcL } = useRemoveCandidate();
  const { execute: execAddAllowDept, loading: aadL } =
    useAddPollAllowDepartments();
  const { execute: execRmAllowDept, loading: radL } =
    useRemovePollAllowDepartments();
  const { execute: execAddAllowRole, loading: aarL } = useAddPollAllowRoles();
  const { execute: execRmAllowRole, loading: rarL } = useRemovePollAllowRoles();
  const { execute: execAddBanDept, loading: abdL } =
    useAddPollBannedDepartments();
  const { execute: execRmBanDept, loading: rbdL } =
    useRemovePollBannedDepartments();
  const { execute: execAddBanRole, loading: abrL } = useAddPollBannedRoles();
  const { execute: execRmBanRole, loading: rbrL } = useRemovePollBannedRoles();

  // ---- Basic information form ----
  const [title, setTitle] = useState(poll.title);
  const [desc, setDesc] = useState(poll.simpleDescription);
  const [link, setLink] = useState(poll.detailLink ?? "");
  const [minLv, setMinLv] = useState(String(poll.minLevel));
  const [maxLv, setMaxLv] = useState(String(poll.maxLevel));
  const [maxChoice, setMaxChoice] = useState(String(poll.maxMultipleChoices));

  // ---- Candidate form ----
  const [candName, setCandName] = useState("");
  const [candPointer, setCandPointer] = useState("");

  // Issue 3 update: Enhance wrap to include hook error details when available
  const wrap = useCallback(
    async (fn: () => Promise<string | null>, ok: string, fail: string) => {
      const tx = await fn();
      if (tx) {
        toast({ variant: "success", message: ok });
        onDone();
      } else {
        // Keep this message brief; detailed errors appear in a separate section below.
        toast({ variant: "error", message: fail });
      }
    },
    [toast, onDone],
  );

  // ---- Action handlers ----

  /** Save basic information, sending only changed fields. */
  const saveInfo = () =>
    wrap(
      () =>
        execNormal({
          pollId: poll.pollId,
          input: {
            title: title !== poll.title ? title : undefined,
            simpleDescription:
              desc !== poll.simpleDescription ? desc : undefined,
            detailLink:
              link !== (poll.detailLink ?? "") ? link || undefined : undefined,
            minLevel:
              Number(minLv) !== poll.minLevel ? Number(minLv) : undefined,
            maxLevel:
              Number(maxLv) !== poll.maxLevel ? Number(maxLv) : undefined,
            maxMultipleChoices:
              Number(maxChoice) !== poll.maxMultipleChoices
                ? Number(maxChoice)
                : undefined,
          },
        }),
      "Information updated successfully",
      "Failed to update information",
    );

  /**
   * Issue 3 core fix: Mark as invalid
   *
   * Call set_poll_normal with only isWrongPoll: true.
   * - On-chain, only is_wrong_poll changes; status is unaffected.
   * - VoteSection displays a non-blocking warning banner.
   * - Available in Draft, Ready, or Closed status, as long as isWrongPoll is false.
   *
   * ⚠ If set_poll_normal only allows Draft polls, the program must exempt calls
   * that only update is_wrong_poll from the status check. Any on-chain error appears below.
   */
  const markWrong = () =>
    wrap(
      () =>
        execNormal({
          pollId: poll.pollId,
          input: { isWrongPoll: true },
        }),
      "Poll marked as invalid",
      "Failed to mark poll as invalid (see error details below)",
    );

  /** Create a candidate and add it to the poll. */
  const addCand = useCallback(async () => {
    const name = candName.trim();
    if (!name) {
      toast({ variant: "warning", message: "Enter a candidate name." });
      return;
    }

    let pointer: PublicKey | undefined;
    if (candPointer.trim()) {
      try {
        pointer = new PublicKey(candPointer.trim());
      } catch {
        toast({ variant: "error", message: "Invalid on-chain address." });
        return;
      }
    }

    const tx1 = await execCreateCand({
      pollId: poll.pollId,
      candidateName: name,
      pointer,
    });
    if (!tx1) {
      toast({ variant: "error", message: "Failed to create candidate." });
      return;
    }

    const [pda] = getCandidatePda(poll.pollId, name);
    const tx2 = await execAddCand({
      pollId: poll.pollId,
      candidatePdas: [pda],
    });
    toast({
      variant: tx2 ? "success" : "error",
      message: tx2 ? "Candidate added successfully" : "Failed to add candidate to the list",
    });
    if (tx2) {
      setCandName("");
      setCandPointer("");
      onDone();
    }
  }, [
    candName,
    candPointer,
    execCreateCand,
    execAddCand,
    poll.pollId,
    toast,
    onDone,
  ]);

  // Issue 2 fix: Role option format: "department / role"
  const deptOpts = useMemo(
    () => depts.map((d) => ({ pda: d.pda, name: d.departmentName })),
    [depts],
  );
  const roleOpts = useMemo(
    () =>
      roles.map((r) => ({
        pda: r.pda,
        name: `${r.departmentName} / ${r.roleName}`,
      })),
    [roles],
  );

  return (
    <div className="space-y-6">
      {/* ① Status management */}
      <Card>
        <div className="p-4 space-y-3">
          <h3 className="font-semibold">Status management</h3>
          <div className="flex flex-wrap gap-2">
            {isDraft && (
              <Button
                onClick={() =>
                  wrap(
                    () => execStatus({ pollId: poll.pollId, isReady: true }),
                    "Poll is ready",
                    "Failed to update status",
                  )
                }
                disabled={statusL}
              >
                {statusL ? <Spinner size="sm" /> : "Set to Ready"}
              </Button>
            )}

            <Button
              onClick={() =>
                wrap(
                  () => execTryStatus({ pollId: poll.pollId }),
                  "Status updated automatically",
                  "Failed to update status",
                )
              }
              disabled={tryStatusL}
            >
              {tryStatusL ? <Spinner size="sm" /> : "Try updating status"}
            </Button>

            {/* UI section */}
            {!poll.isWrongPoll && (
              <Button
                onClick={markWrong}
                disabled={normalL}
                className="bg-red-700 hover:bg-red-800"
              >
                {normalL ? <Spinner size="sm" /> : "⚠ Mark as invalid"}
              </Button>
            )}
          </div>

          {/* UI section */}
          {normalError && (
            <div className="bg-red-900/30 border border-red-800 rounded p-3 text-sm space-y-1">
              <p className="text-red-400 font-medium">Error details:</p>
              <p className="text-red-300 text-xs break-all">
                {normalError.message}
              </p>
              <p className="text-gray-500 text-xs mt-1">
                💡 If the error indicates a status restriction, the program may need to relax the status check specifically for
                the is_wrong_poll field in set_poll_normal.
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* ② Edit basic information (Draft only) */}
      {isDraft && (
        <Card>
          <div className="p-4 space-y-3">
            <h3 className="font-semibold">Edit basic information</h3>
            <Input
              value={title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setTitle(e.target.value)
              }
              placeholder="Poll title"
            />
            <Input
              value={desc}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setDesc(e.target.value)
              }
              placeholder="Poll description"
            />
            <Input
              value={link}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setLink(e.target.value)
              }
              placeholder="Details link (optional)"
            />
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-gray-500">Minimum level</label>
                <Input
                  type="number"
                  value={minLv}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setMinLv(e.target.value)
                  }
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Maximum level</label>
                <Input
                  type="number"
                  value={maxLv}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setMaxLv(e.target.value)
                  }
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Maximum choices</label>
                <Input
                  type="number"
                  value={maxChoice}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setMaxChoice(e.target.value)
                  }
                />
              </div>
            </div>
            <Button onClick={saveInfo} disabled={normalL}>
              {normalL ? <Spinner size="sm" /> : "Save changes"}
            </Button>
          </div>
        </Card>
      )}

      {/* ③ Manage candidates (Draft only) */}
      {isDraft && (
        <Card>
          <div className="p-4 space-y-3">
            <h3 className="font-semibold">Manage candidates</h3>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={candName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setCandName(e.target.value)
                  }
                  placeholder="Candidate name"
                  className="flex-1"
                />
                <Button onClick={addCand} disabled={ccL || acL}>
                  {ccL || acL ? <Spinner size="sm" /> : "Add"}
                </Button>
              </div>
              <Input
                value={candPointer}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setCandPointer(e.target.value)
                }
                placeholder="On-chain address pointer (optional, e.g. employee PDA)"
              />
            </div>
            {candidates.length === 0 ? (
              <p className="text-sm text-gray-500">No candidates yet</p>
            ) : (
              <div className="space-y-2">
                {candidates.map((c) => (
                  <div
                    key={c.pda.toBase58()}
                    className="flex items-center justify-between p-2 bg-gray-800 rounded"
                  >
                    <div>
                      <span>{c.candidateName}</span>
                      {c.pointer && (
                        <span className="ml-2 text-xs text-gray-500">
                          → {c.pointer.toBase58().slice(0, 12)}…
                        </span>
                      )}
                    </div>
                    <Button
                      onClick={() =>
                        wrap(
                          () =>
                            execRemoveCand({
                              pollId: poll.pollId,
                              candidatePdas: [c.pda],
                            }),
                          "Removed",
                          "Failed to remove",
                        )
                      }
                      disabled={rcL}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ④ Manage allowlists (Draft only) */}
      {isDraft && (
        <Card>
          <div className="p-4 space-y-4">
            <h3 className="font-semibold">Manage allowlists</h3>
            <PdaListEditor
              label="Allowed departments"
              current={poll.allowedDepartments}
              options={deptOpts}
              onAdd={(pda) =>
                wrap(
                  () =>
                    execAddAllowDept({
                      pollId: poll.pollId,
                      pdas: [pda],
                    }),
                  "Added",
                  "AddFailed",
                )
              }
              onRemove={(pda) =>
                wrap(
                  () =>
                    execRmAllowDept({
                      pollId: poll.pollId,
                      pdas: [pda],
                    }),
                  "Removed",
                  "Failed to remove",
                )
              }
              busy={aadL || radL}
            />
            <PdaListEditor
              label="Allowed roles"
              current={poll.allowedRoles}
              options={roleOpts}
              onAdd={(pda) =>
                wrap(
                  () =>
                    execAddAllowRole({
                      pollId: poll.pollId,
                      pdas: [pda],
                    }),
                  "Added",
                  "AddFailed",
                )
              }
              onRemove={(pda) =>
                wrap(
                  () =>
                    execRmAllowRole({
                      pollId: poll.pollId,
                      pdas: [pda],
                    }),
                  "Removed",
                  "Failed to remove",
                )
              }
              busy={aarL || rarL}
            />
          </div>
        </Card>
      )}

      {/* UI section */}
      {isDraft && (
        <Card>
          <div className="p-4 space-y-4">
            <h3 className="font-semibold">BlocklistManage</h3>
            <PdaListEditor
              label="Blocked departments"
              current={poll.bannedDepartments}
              options={deptOpts}
              onAdd={(pda) =>
                wrap(
                  () =>
                    execAddBanDept({
                      pollId: poll.pollId,
                      pdas: [pda],
                    }),
                  "Added",
                  "AddFailed",
                )
              }
              onRemove={(pda) =>
                wrap(
                  () =>
                    execRmBanDept({
                      pollId: poll.pollId,
                      pdas: [pda],
                    }),
                  "Removed",
                  "Failed to remove",
                )
              }
              busy={abdL || rbdL}
            />
            <PdaListEditor
              label="Blocked roles"
              current={poll.bannedRoles}
              options={roleOpts}
              onAdd={(pda) =>
                wrap(
                  () => execAddBanRole({ pollId: poll.pollId, pdas: [pda] }),
                  "Added",
                  "AddFailed",
                )
              }
              onRemove={(pda) =>
                wrap(
                  () => execRmBanRole({ pollId: poll.pollId, pdas: [pda] }),
                  "Removed",
                  "Failed to remove",
                )
              }
              busy={abrL || rbrL}
            />
          </div>
        </Card>
      )}
    </div>
  );
}

// ============================================================
// Main component
// ============================================================

export default function PollDetail({ pollId }: { pollId: number }) {
  const { publicKey } = useWallet();
  const { connection } = useConnection(); // ← Newly added

  const {
    data: poll,
    loading: pL,
    error: pE,
    refetch: rPoll,
  } = usePoll(pollId);
  const {
    data: cands,
    loading: cL,
    refetch: rCands,
  } = useCandidatesByPoll(pollId);
  const { data: depts } = useAllDepartments();
  const { data: roles } = useAllRoles();
  const { data: emp } = useMyEmployee();
  const { data: stub } = useVoteStub(pollId, publicKey ?? null);

  const hasVoted = !!stub;

  const isCreator = useMemo(
    () => (poll && publicKey ? poll.creator.equals(publicKey) : false),
    [poll, publicKey],
  );

  // ════════════════════════════════════════════════════
  // Newly addedOn-chain time：Fetch from the Clock sysvar every 30 seconds
  // This replaces Date.now() so time checks match the program.
  // ════════════════════════════════════════════════════
  const [chainNow, setChainNow] = useState<number | undefined>();

  useEffect(() => {
    let cancelled = false;
    const fetchTime = async () => {
      const t = await getChainTimestamp(connection);
      if (!cancelled) setChainNow(t);
    };
    fetchTime();
    // Refresh every 30 secondsOn-chain time
    const timer = setInterval(fetchTime, 30_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [connection]);

  // ════════════════════════════════════════════════════
  // Implementation note.
  //
  // Why is this needed?
  //   CreateCandidate creates an on-chain Candidate account that can be queried by pollId.
  //   If AddCandidate later fails to add its PDA to Poll.candidates,
  //   useCandidatesByPoll can still find this orphaned candidate.
  //   Filtering against poll.candidates ensures that only candidates belonging to this poll are displayed.
  // ════════════════════════════════════════════════════
  const filteredCands = useMemo(() => {
    if (!poll || !cands) return [];
    return cands.filter((c) =>
      poll.candidates.some((pda) => pda.equals(c.pda))
    );
  }, [poll, cands]);

  const refresh = useCallback(() => {
    rPoll();
    rCands();
  }, [rPoll, rCands]);

  if (pL || cL) return <LoadingSpinner />;
  if (pE) return <ErrorMessage message={String(pE)} />;
  if (!poll) return <EmptyState title="Poll not found" />;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{poll.title}</h1>
        <Badge color={STATUS_COLOR[poll.status] ?? "gray"}>
          {STATUS_LABEL[poll.status] ?? poll.status}
        </Badge>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Poll information</TabsTrigger>
          <TabsTrigger value="results">Candidates / results</TabsTrigger>
          <TabsTrigger value="vote">Vote</TabsTrigger>
          {isCreator && <TabsTrigger value="manage">Manage</TabsTrigger>}
        </TabsList>

        <TabsContent value="info">
          <InfoSection poll={poll} depts={depts ?? []} roles={roles ?? []} />
        </TabsContent>

        <TabsContent value="results">
          {/* Use filteredCands instead of cands */}
          <ResultsSection candidates={filteredCands} />
        </TabsContent>

        <TabsContent value="vote">
          <VoteSection
            poll={poll}
            candidates={filteredCands}  
            employee={emp ?? null}
            hasVoted={hasVoted}
            roles={roles ?? []}
            depts={depts ?? []}
            onDone={refresh}
            chainNow={chainNow}        
          />
        </TabsContent>

        {isCreator && (
          <TabsContent value="manage">
            <ManageSection
              poll={poll}
              candidates={filteredCands} 
              depts={depts ?? []}
              roles={roles ?? []}
              onDone={refresh}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
