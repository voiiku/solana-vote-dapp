/**
 * hooks/index.ts — Central exports for hooks
 */

// ── Program hooks ────────────────────────────────────────────
export { useProgram, useAnchorProvider, useIsAdmin } from "./useProgram";

// ── Single-record queries ────────────────────────────────────
export {
  usePollConfig,
  useEmployeeConfig,
  usePoll,
  useEmployee,
  useDepartment,
  useRole,
  useRoleByPda,
  useCandidate,
  useVoteStub,
} from "./useFetch";

// ── List queries (added in task 6.5) ─────────────────────────
export {
  useAllDepartments,
  useAllRoles,
  useAllEmployees,
  useAllPolls,
  useCandidatesByPoll,
} from "./useFetch";

// ── User-related queries (added in task 6.5) ─────────────────
export { useMyEmployee, useMyVoteStubs, useEmployeeByOwner } from "./useFetch";

// ── Data types ───────────────────────────────────────────────
export type {
  FetchResult,
  PollConfigData,
  EmployeeConfigData,
  PollData,
  PollStatus,
  EmployeeData,
  DepartmentData,
  RoleData,
  CandidateData,
  VoteStubData,
  // List types, including PDA (added in task 6.5)
  DepartmentListItem,
  RoleListItem,
  EmployeeListItem,
  PollListItem,
  CandidateListItem,
  VoteStubListItem,
} from "./useFetch";

// ── Admin operations ─────────────────────────────────────────
export {
  useInitPollConfig,
  useInitEmployeeConfig,
  useUpdatePollConfig,
  useCreateDepartment,
  useUpdateDepartment,
  useCreateRole,
  useUpdateRole,
  useCreateEmployee,
  useUpdateEmployee,
} from "./useAdmin";

// ── Poll operations ──────────────────────────────────────────
export {
  useCreatePoll,
  useCreateCandidate,
  useAddCandidate,
  useRemoveCandidate,
  useSetPollNormal,
  useAddPollAllowDepartments,
  useRemovePollAllowDepartments,
  useAddPollAllowRoles,
  useRemovePollAllowRoles,
  useAddPollBannedDepartments,
  useRemovePollBannedDepartments,
  useAddPollBannedRoles,
  useRemovePollBannedRoles,
  useUpdatePollStatus,
  useTryUpdatePollStatus,
  useVote,
} from "./usePoll";