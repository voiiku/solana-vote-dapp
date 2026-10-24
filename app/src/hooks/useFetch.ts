/**
 * Implementation detail.
 *
 * Implementation detail.
 * Implementation detail.
 * Implementation detail.
 * Implementation detail.
 * Implementation detail.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { PublicKey } from "@solana/web3.js";
import { useProgram } from "./useProgram";
import { bytes64ToStr } from "@/lib/utils";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  getPollConfigPda,
  getEmployeeConfigPda,
  getPollPda,
  getEmployeePda,
  getDepartmentPda,
  getRolePda,
  getCandidatePda,
  getVoteStubPda,
} from "@/lib/pda";

// ============================================================
// Implementation note.
// ============================================================

export interface FetchResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export interface PollConfigData {
  totalPolls: bigint;
  allowCreatePoll: boolean;
  minPollingInterval: bigint;
  maxPollingInterval: bigint;
  minAllowCreatePoll: number;
  bump: number;
}

export interface EmployeeConfigData {
  globalEmployeeId: bigint;
  bump: number;
}

export type PollStatus = "Draft" | "Ready" | "Closed";

export interface PollData {
  pollId: bigint;
  creator: PublicKey;
  createTime: bigint;
  title: string;
  simpleDescription: string;
  detailLink: string | null;
  totalVotes: bigint;
  minLevel: number;
  maxLevel: number;
  allowedDepartments: PublicKey[];
  bannedDepartments: PublicKey[];
  allowedRoles: PublicKey[];
  bannedRoles: PublicKey[];
  maxMultipleChoices: number;
  status: PollStatus;
  isWrongPoll: boolean;
  candidates: PublicKey[];
  startAt: bigint;
  endAt: bigint;
  bump: number;
}

export interface EmployeeData {
  owner: PublicKey;
  employeeId: bigint;
  name: string;
  active: boolean;
  allowCreatePoll: boolean;
  allowVote: boolean;
  tempLevel: number | null;
  mainRoleKey: PublicKey;
  bump: number;
}

export interface DepartmentData {
  departmentName: string;
  members: number;
  allowCreatePoll: boolean;
  allowVote: boolean;
  bump: number;
}

export interface RoleData {
  roleName: string;
  roleLevel: number;
  members: number;
  allowCreatePoll: boolean;
  allowVote: boolean;
  departmentName: string;
  bump: number;
}

export interface CandidateData {
  poll: PublicKey;
  candidateName: string;
  candidateCount: bigint;
  pointer: PublicKey | null;
  bump: number;
}

export interface VoteStubData {
  pollId: bigint;
  voter: PublicKey;
  slot: bigint;
  timestamp: bigint;
  choices: PublicKey[];
  bump: number;
}

// ============================================================
// Implementation note.
// ============================================================

function parsePollStatus(status: unknown): PollStatus {
  if (typeof status === "object" && status !== null) {
    if ("draft" in status) return "Draft";
    if ("ready" in status) return "Ready";
    if ("closed" in status) return "Closed";
  }
  return "Draft";
}

function toBigInt(value: unknown): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(value);
  if (value && typeof (value as { toString: () => string }).toString === "function") {
    try {
      return BigInt((value as { toString: () => string }).toString());
    } catch {
      return BigInt(0);
    }
  }
  return BigInt(0);
}

// ============================================================
// Implementation note.
// ============================================================

/**
 * Implementation detail.
 *
 * Implementation detail.
 * Implementation detail.
 * Implementation detail.
 * Implementation detail.
 */
export function usePollConfig(): FetchResult<PollConfigData> {
  const program = useProgram();
  const [data, setData] = useState<PollConfigData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const [pollConfigPda] = useMemo(() => getPollConfigPda(), []);

  const fetchData = useCallback(async () => {
    if (!program) return;

    setLoading(true);
    setError(null);

    try {
      // Implementation note.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const account = await (program.account as any).pollConfig.fetch(pollConfigPda);

      setData({
        totalPolls: toBigInt(account.totalPolls),
        allowCreatePoll: account.allowCreatePoll,
        minPollingInterval: toBigInt(account.minPollingInterval),
        maxPollingInterval: toBigInt(account.maxPollingInterval),
        minAllowCreatePoll: account.minAllowCreatePoll,
        bump: account.bump,
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [program, pollConfigPda]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Implementation detail.
 */
export function useEmployeeConfig(): FetchResult<EmployeeConfigData> {
  const program = useProgram();
  const [data, setData] = useState<EmployeeConfigData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const [employeeConfigPda] = useMemo(() => getEmployeeConfigPda(), []);

  const fetchData = useCallback(async () => {
    if (!program) return;

    setLoading(true);
    setError(null);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const account = await (program.account as any).employeeConfig.fetch(employeeConfigPda);

      setData({
        globalEmployeeId: toBigInt(account.globalEmployeeId),
        bump: account.bump,
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [program, employeeConfigPda]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// ============================================================
// Implementation note.
// ============================================================

/**
 * Implementation detail.
 */
export function usePoll(pollId: number | bigint | null): FetchResult<PollData> {
  const program = useProgram();
  const [data, setData] = useState<PollData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!program || pollId === null) return;

    setLoading(true);
    setError(null);

    try {
      const [pollPda] = getPollPda(pollId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const account = await (program.account as any).poll.fetch(pollPda);

      const detailLinkBytes = account.detailLink as number[] | null;

      setData({
        pollId: toBigInt(account.pollId),
        creator: account.creator,
        createTime: toBigInt(account.createTime),
        title: bytes64ToStr(account.title as number[]),
        simpleDescription: bytes64ToStr(account.simpleDescription as number[]),
        detailLink: detailLinkBytes ? bytes64ToStr(detailLinkBytes) : null,
        totalVotes: toBigInt(account.totalVotes),
        minLevel: account.minLevel,
        maxLevel: account.maxLevel,
        allowedDepartments: account.allowedDepartments,
        bannedDepartments: account.bannedDepartments,
        allowedRoles: account.allowedRoles,
        bannedRoles: account.bannedRoles,
        maxMultipleChoices: account.maxMultipleChoices,
        status: parsePollStatus(account.status),
        isWrongPoll: account.isWrongPoll,
        candidates: account.candidates,
        startAt: toBigInt(account.startAt),
        endAt: toBigInt(account.endAt),
        bump: account.bump,
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [program, pollId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Implementation detail.
 */
export function useEmployee(employeeId: number | bigint | null): FetchResult<EmployeeData> {
  const program = useProgram();
  const [data, setData] = useState<EmployeeData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!program || employeeId === null) return;

    setLoading(true);
    setError(null);

    try {
      const [employeePda] = getEmployeePda(employeeId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const account = await (program.account as any).employee.fetch(employeePda);

      setData({
        owner: account.owner,
        employeeId: toBigInt(account.employeeId),
        name: bytes64ToStr(account.name as number[]),
        active: account.active,
        allowCreatePoll: account.allowCreatePoll,
        allowVote: account.allowVote,
        tempLevel: account.tempLevel ?? null,
        mainRoleKey: account.mainRoleKey,
        bump: account.bump,
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [program, employeeId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Implementation detail.
 */
export function useDepartment(departmentName: string | null): FetchResult<DepartmentData> {
  const program = useProgram();
  const [data, setData] = useState<DepartmentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!program || !departmentName) return;

    setLoading(true);
    setError(null);

    try {
      const [departmentPda] = getDepartmentPda(departmentName);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const account = await (program.account as any).department.fetch(departmentPda);

      setData({
        departmentName: bytes64ToStr(account.departmentName as number[]),
        members: account.members,
        allowCreatePoll: account.allowCreatePoll,
        allowVote: account.allowVote,
        bump: account.bump,
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [program, departmentName]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Implementation detail.
 */
export function useRole(
  roleName: string | null,
  departmentName: string | null
): FetchResult<RoleData> {
  const program = useProgram();
  const [data, setData] = useState<RoleData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!program || !roleName || !departmentName) return;

    setLoading(true);
    setError(null);

    try {
      const [rolePda] = getRolePda(roleName, departmentName);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const account = await (program.account as any).role.fetch(rolePda);

      setData({
        roleName: bytes64ToStr(account.roleName as number[]),
        roleLevel: account.roleLevel,
        members: account.members,
        allowCreatePoll: account.allowCreatePoll,
        allowVote: account.allowVote,
        departmentName: bytes64ToStr(account.departmentName as number[]),
        bump: account.bump,
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [program, roleName, departmentName]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Implementation detail.
 */
export function useCandidate(
  pollId: number | bigint | null,
  candidateName: string | null
): FetchResult<CandidateData> {
  const program = useProgram();
  const [data, setData] = useState<CandidateData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!program || pollId === null || !candidateName) return;

    setLoading(true);
    setError(null);

    try {
      const [candidatePda] = getCandidatePda(pollId, candidateName);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const account = await (program.account as any).candidate.fetch(candidatePda);

      setData({
        poll: account.poll,
        candidateName: bytes64ToStr(account.candidateName as number[]),
        candidateCount: toBigInt(account.candidateCount),
        pointer: account.pointer ?? null,
        bump: account.bump,
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [program, pollId, candidateName]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Implementation detail.
 */
export function useVoteStub(
  pollId: number | bigint | null,
  voterPubkey: PublicKey | null
): FetchResult<VoteStubData> {
  const program = useProgram();
  const [data, setData] = useState<VoteStubData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!program || pollId === null || !voterPubkey) return;

    setLoading(true);
    setError(null);

    try {
      const [voteStubPda] = getVoteStubPda(pollId, voterPubkey);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const account = await (program.account as any).voteStub.fetch(voteStubPda);

      setData({
        pollId: toBigInt(account.pollId),
        voter: account.voter,
        slot: toBigInt(account.slot),
        timestamp: toBigInt(account.timestamp),
        choices: account.choices,
        bump: account.bump,
      });
    } catch (err) {
      // Implementation note.
      if (String(err).includes("Account does not exist")) {
        setData(null);
        setError(null);
      } else {
        setError(err instanceof Error ? err : new Error(String(err)));
        setData(null);
      }
    } finally {
      setLoading(false);
    }
  }, [program, pollId, voterPubkey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Implementation detail.
 */
export function useRoleByPda(rolePda: PublicKey | null): FetchResult<RoleData> {
  const program = useProgram();
  const [data, setData] = useState<RoleData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!program || !rolePda) return;

    setLoading(true);
    setError(null);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const account = await (program.account as any).role.fetch(rolePda);

      setData({
        roleName: bytes64ToStr(account.roleName as number[]),
        roleLevel: account.roleLevel,
        members: account.members,
        allowCreatePoll: account.allowCreatePoll,
        allowVote: account.allowVote,
        departmentName: bytes64ToStr(account.departmentName as number[]),
        bump: account.bump,
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [program, rolePda]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
// ============================================================
// Implementation note.
// ============================================================

/**
 * Implementation detail.
 *
 * Implementation detail.
 * Implementation detail.
 * Implementation detail.
 * Implementation detail.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseDepartmentAccount(account: any): DepartmentData {
  return {
    departmentName: bytes64ToStr(account.departmentName as number[]),
    members: account.members,
    allowCreatePoll: account.allowCreatePoll,
    allowVote: account.allowVote,
    bump: account.bump,
  };
}

/**
 * Implementation detail.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseRoleAccount(account: any): RoleData {
  return {
    roleName: bytes64ToStr(account.roleName as number[]),
    roleLevel: account.roleLevel,
    members: account.members,
    allowCreatePoll: account.allowCreatePoll,
    allowVote: account.allowVote,
    departmentName: bytes64ToStr(account.departmentName as number[]),
    bump: account.bump,
  };
}

/**
 * Implementation detail.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseEmployeeAccount(account: any): EmployeeData {
  return {
    owner: account.owner,
    employeeId: toBigInt(account.employeeId),
    name: bytes64ToStr(account.name as number[]),
    active: account.active,
    allowCreatePoll: account.allowCreatePoll,
    allowVote: account.allowVote,
    tempLevel: account.tempLevel ?? null,
    mainRoleKey: account.mainRoleKey,
    bump: account.bump,
  };
}

/**
 * Implementation detail.
 *
 * Implementation detail.
 * Implementation detail.
 * Implementation detail.
 * - pollId / createTime / totalVotes / startAt / endAt: BN → bigint
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parsePollAccount(account: any): PollData {
  const detailLinkBytes = account.detailLink as number[] | null;
  return {
    pollId: toBigInt(account.pollId),
    creator: account.creator,
    createTime: toBigInt(account.createTime),
    title: bytes64ToStr(account.title as number[]),
    simpleDescription: bytes64ToStr(account.simpleDescription as number[]),
    detailLink: detailLinkBytes ? bytes64ToStr(detailLinkBytes) : null,
    totalVotes: toBigInt(account.totalVotes),
    minLevel: account.minLevel,
    maxLevel: account.maxLevel,
    allowedDepartments: account.allowedDepartments,
    bannedDepartments: account.bannedDepartments,
    allowedRoles: account.allowedRoles,
    bannedRoles: account.bannedRoles,
    maxMultipleChoices: account.maxMultipleChoices,
    status: parsePollStatus(account.status),
    isWrongPoll: account.isWrongPoll,
    candidates: account.candidates,
    startAt: toBigInt(account.startAt),
    endAt: toBigInt(account.endAt),
    bump: account.bump,
  };
}

/**
 * Implementation detail.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseCandidateAccount(account: any): CandidateData {
  return {
    poll: account.poll,
    candidateName: bytes64ToStr(account.candidateName as number[]),
    candidateCount: toBigInt(account.candidateCount),
    pointer: account.pointer ?? null,
    bump: account.bump,
  };
}

/**
 * Implementation detail.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseVoteStubAccount(account: any): VoteStubData {
  return {
    pollId: toBigInt(account.pollId),
    voter: account.voter,
    slot: toBigInt(account.slot),
    timestamp: toBigInt(account.timestamp),
    choices: account.choices,
    bump: account.bump,
  };
}

// ============================================================
// Implementation note.
// ============================================================

/**
 * Implementation detail.
 *
 * Implementation detail.
 * Implementation detail.
 * Implementation detail.
 *
 * Implementation detail.
 * Implementation detail.
 */

/** Department list item, including its PDA address */
export interface DepartmentListItem extends DepartmentData {
  /** Department PDA for later actions, such as updates or allowlist parameters */
  pda: PublicKey;
}

/** Role list item, including its PDA address */
export interface RoleListItem extends RoleData {
  /** Role PDA address */
  pda: PublicKey;
}

/** Employee list item, including its PDA address */
export interface EmployeeListItem extends EmployeeData {
  /** Employee PDA address */
  pda: PublicKey;
}

/** Vote list item, including its PDA address */
export interface PollListItem extends PollData {
  /** Vote PDA address */
  pda: PublicKey;
}

/** Candidate list item, including its PDA address */
export interface CandidateListItem extends CandidateData {
  /** Candidate PDA address */
  pda: PublicKey;
}

/** Vote stub list item, including its PDA address */
export interface VoteStubListItem extends VoteStubData {
  /** Vote stub PDA address */
  pda: PublicKey;
}

// ============================================================
// Implementation note.
// ============================================================

/**
 * Implementation detail.
 *
 * Implementation detail.
 * Implementation detail.
 * Implementation detail.
 * Implementation detail.
 *
 * Implementation detail.
 * Implementation detail.
 * Implementation detail.
 *
 * @returns FetchResult<DepartmentListItem[]>
 *
 * @example
 * const { data: departments, loading, refetch } = useAllDepartments();
 * departments?.forEach(dept => {
 *   console.log(dept.departmentName, dept.pda.toBase58());
 * });
 */
export function useAllDepartments(): FetchResult<DepartmentListItem[]> {
  const program = useProgram();
  const [data, setData] = useState<DepartmentListItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!program) return;

    setLoading(true);
    setError(null);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const accounts = await (program.account as any).department.all();

      // Implementation note.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const list: DepartmentListItem[] = accounts.map((item: any) => ({
        pda: item.publicKey as PublicKey,
        ...parseDepartmentAccount(item.account),
      }));

      // Implementation note.
      list.sort((a, b) => a.departmentName.localeCompare(b.departmentName));

      setData(list);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [program]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Implementation detail.
 *
 * Implementation detail.
 * Implementation detail.
 * Implementation detail.
 * Implementation detail.
 *
 * @returns FetchResult<RoleListItem[]>
 */
export function useAllRoles(): FetchResult<RoleListItem[]> {
  const program = useProgram();
  const [data, setData] = useState<RoleListItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!program) return;

    setLoading(true);
    setError(null);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const accounts = await (program.account as any).role.all();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const list: RoleListItem[] = accounts.map((item: any) => ({
        pda: item.publicKey as PublicKey,
        ...parseRoleAccount(item.account),
      }));

      // Implementation note.
      list.sort((a, b) => {
        // Implementation note.
        const deptCompare = a.departmentName.localeCompare(b.departmentName);
        if (deptCompare !== 0) return deptCompare;
        // Implementation note.
        if (a.roleLevel !== b.roleLevel) return b.roleLevel - a.roleLevel;
        // Implementation note.
        return a.roleName.localeCompare(b.roleName);
      });

      setData(list);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [program]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Implementation detail.
 *
 * Implementation detail.
 * Implementation detail.
 * Implementation detail.
 *
 * @returns FetchResult<EmployeeListItem[]>
 */
export function useAllEmployees(): FetchResult<EmployeeListItem[]> {
  const program = useProgram();
  const [data, setData] = useState<EmployeeListItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!program) return;

    setLoading(true);
    setError(null);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const accounts = await (program.account as any).employee.all();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const list: EmployeeListItem[] = accounts.map((item: any) => ({
        pda: item.publicKey as PublicKey,
        ...parseEmployeeAccount(item.account),
      }));

      // Implementation note.
      list.sort((a, b) => {
        if (a.employeeId < b.employeeId) return -1;
        if (a.employeeId > b.employeeId) return 1;
        return 0;
      });

      setData(list);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [program]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Implementation detail.
 *
 * Implementation detail.
 * Implementation detail.
 * Implementation detail.
 * Implementation detail.
 *
 * @returns FetchResult<PollListItem[]>
 */
export function useAllPolls(): FetchResult<PollListItem[]> {
  const program = useProgram();
  const [data, setData] = useState<PollListItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!program) return;

    setLoading(true);
    setError(null);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const accounts = await (program.account as any).poll.all();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const list: PollListItem[] = accounts.map((item: any) => ({
        pda: item.publicKey as PublicKey,
        ...parsePollAccount(item.account),
      }));

      // Implementation note.
      list.sort((a, b) => {
        if (a.pollId > b.pollId) return -1;
        if (a.pollId < b.pollId) return 1;
        return 0;
      });

      setData(list);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [program]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Implementation detail.
 *
 * Implementation detail.
 * Implementation detail.
 * Implementation detail.
 *
 * Implementation detail.
 * Implementation detail.
 * Implementation detail.
 *
 * Implementation detail.
 * @returns FetchResult<CandidateListItem[]>
 *
 * @example
 * const { data: candidates } = useCandidatesByPoll(0);
 * candidates?.forEach(c => {
 *   console.log(c.candidateName, c.candidateCount);
 * });
 */
export function useCandidatesByPoll(
  pollId: number | bigint | null
): FetchResult<CandidateListItem[]> {
  const program = useProgram();
  const [data, setData] = useState<CandidateListItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!program || pollId === null) return;

    setLoading(true);
    setError(null);

    try {
      // Implementation note.
      const [pollPda] = getPollPda(pollId);

      // Implementation note.
      // Implementation note.
      //    [0..8)   discriminator (8 bytes)
      // Implementation note.
      //    [40..104) candidateName: [u8; 64]
      //    ...
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const accounts = await (program.account as any).candidate.all([
        {
          memcmp: {
            offset: 8, // poll field follows the discriminator
            bytes: pollPda.toBase58(),
          },
        },
      ]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const list: CandidateListItem[] = accounts.map((item: any) => ({
        pda: item.publicKey as PublicKey,
        ...parseCandidateAccount(item.account),
      }));

      // Implementation note.
      list.sort((a, b) => {
        if (a.candidateCount > b.candidateCount) return -1;
        if (a.candidateCount < b.candidateCount) return 1;
        // Implementation note.
        return a.candidateName.localeCompare(b.candidateName);
      });

      setData(list);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [program, pollId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// ============================================================
// Implementation note.
// ============================================================

/**
 * Implementation detail.
 *
 * Implementation detail.
 * Implementation detail.
 * Implementation detail.
 *
 * Implementation detail.
 * Implementation detail.
 * Implementation detail.
 * Implementation detail.
 *
 * Implementation detail.
 * Implementation detail.
 * Implementation detail.
 * Implementation detail.
 *
 * Implementation detail.
 *
 * @example
 * const { data: myEmployee, loading } = useMyEmployee();
 * if (!myEmployee) {
 * Implementation detail.
 * }
 * Implementation detail.
 * Implementation detail.
 */
export function useMyEmployee(): FetchResult<EmployeeListItem> {
  const program = useProgram();
  const { publicKey } = useWallet();
  const [data, setData] = useState<EmployeeListItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!program || !publicKey) return;

    setLoading(true);
    setError(null);

    try {
      // Implementation note.
      // Implementation note.
      // [0..8)   discriminator (8 bytes)
      // Implementation note.
      // [40..48) employeeId: u64
      // ...
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const accounts = await (program.account as any).employee.all([
        {
          memcmp: {
            offset: 8, // owner field follows the discriminator
            bytes: publicKey.toBase58(),
          },
        },
      ]);

      if (accounts.length > 0) {
        // Implementation note.
        const item = accounts[0];
        setData({
          pda: item.publicKey as PublicKey,
          ...parseEmployeeAccount(item.account),
        });
      } else {
        // Implementation note.
        setData(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [program, publicKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Implementation detail.
 *
 * Implementation detail.
 * Implementation detail.
 * Implementation detail.
 *
 * Implementation detail.
 * Implementation detail.
 * [0..8)   discriminator (8 bytes)
 * [8..16)  pollId: u64   (8 bytes)
 * Implementation detail.
 * ...
 *
 * @returns FetchResult<VoteStubListItem[]>
 *
 * @example
 * const { data: myVotes } = useMyVoteStubs();
 * Implementation detail.
 */
export function useMyVoteStubs(): FetchResult<VoteStubListItem[]> {
  const program = useProgram();
  const { publicKey } = useWallet();
  const [data, setData] = useState<VoteStubListItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!program || !publicKey) return;

    setLoading(true);
    setError(null);

    try {
      // Implementation note.
      // [0..8)   discriminator
      // [8..16)  pollId: u64    (8 bytes)
      // [16..48) voter: Pubkey  (32 bytes) ← offset 16
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const accounts = await (program.account as any).voteStub.all([
        {
          memcmp: {
            offset: 16, // voter follows the 8-byte discriminator and 8-byte pollId
            bytes: publicKey.toBase58(),
          },
        },
      ]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const list: VoteStubListItem[] = accounts.map((item: any) => ({
        pda: item.publicKey as PublicKey,
        ...parseVoteStubAccount(item.account),
      }));

      // Implementation note.
      list.sort((a, b) => {
        if (a.timestamp > b.timestamp) return -1;
        if (a.timestamp < b.timestamp) return 1;
        return 0;
      });

      setData(list);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [program, publicKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
/**
 * Implementation detail.
 *
 * Implementation detail.
 * Implementation detail.
 *
 * Implementation detail.
 * [0..8)   discriminator (8 bytes)
 * Implementation detail.
 *
 * Implementation detail.
 * @returns FetchResult<EmployeeListItem>
 */
export function useEmployeeByOwner(
  ownerPubkey: PublicKey | null
): FetchResult<EmployeeListItem> {
  const program = useProgram();
  const [data, setData] = useState<EmployeeListItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Implementation note.
  const ownerKey = ownerPubkey?.toBase58() ?? null;

  const fetchData = useCallback(async () => {
    if (!program || !ownerKey) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Implementation note.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const accounts = await (program.account as any).employee.all([
        {
          memcmp: {
            offset: 8, // owner field follows the 8-byte discriminator
            bytes: ownerKey,
          },
        },
      ]);

      if (accounts.length > 0) {
        // Implementation note.
        const item = accounts[0];
        setData({
          pda: item.publicKey as PublicKey,
          ...parseEmployeeAccount(item.account),
        });
      } else {
        // Implementation note.
        setData(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [program, ownerKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}