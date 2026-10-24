/**
 * poll.service.ts — On-chain poll operations
 *
 * This file wraps all poll-related on-chain instructions, including creation
 * and configuration, candidate management, department/role allowlists and
 * blocklists, status management, and voting.
 *
 * Poll lifecycle:
 * 1. Draft: Initial state after creation. The creator can add candidates,
 *    configure allowlists/blocklists, and update settings.
 * 2. Ready: The creator confirms setup is complete. Employees can vote once
 *    start_at is reached.
 * 3. Closed: Automatically closes at end_at or can be closed by the creator.
 *
 * Instructions cover poll creation, candidate management, configuration,
 * allowlists/blocklists, status updates, and voting.
 */

import { Program, BN, type Idl } from "@anchor-lang/core";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { strToBytes64 } from "@/lib/utils";
import {
  getPollConfigPda,
  getPollPda,
  getCandidatePda,
  getVoteStubPda,
  getEmployeePda,
} from "@/lib/pda";

// ============================================================
// 1. Type definitions — helper types
// ============================================================
// These helper types match admin.service.ts. TypeScript module scopes are
// isolated, so each service file defines its own copy.

/** Type description for the Anchor method builder */
interface MethodBuilder {
  accounts(accts: Record<string, PublicKey | null>): MethodBuilder;
  rpc(): Promise<string>;
}

/** Base argument type */
type SimpleArg =
  | BN
  | number
  | number[]
  | boolean
  | string
  | PublicKey
  | null
  | undefined;

/** Argument object interface for Anchor struct parameters */
interface ParamsObject {
  [key: string]: SimpleArg;
}

/** Union of method argument types */
type MethodArg = SimpleArg | SimpleArg[] | ParamsObject;

/** Method signature alias */
type MethodFn = (...args: MethodArg[]) => MethodBuilder;

/** Method namespace alias */
type MethodNamespace = Record<string, MethodFn>;

/**
 * Get the callable method namespace from Program<Idl>.
 */
function getMethods(program: Program): MethodNamespace {
  return program.methods as unknown as MethodNamespace;
}

// ============================================================
// 2. Frontend-friendly parameter interfaces
// ============================================================

/**
 * Input parameters for creating a poll.
 *
 * Corresponds to the on-chain InitPoll struct, with frontend-friendly types:
 * - Strings instead of [u8;64] arrays
 * - Numbers instead of BN values
 * - undefined instead of Option::None
 */
export interface CreatePollInput {
  /** Poll title (stored as [u8;64]) */
  title: string;
  /** Short poll description (stored as [u8;64]) */
  simpleDescription: string;
  /**
   * Optional details link, such as an IPFS hash or external URL.
   * Stored as Option<[u8;64]>.
   */
  detailLink?: string;
  /** Minimum level required to vote (0–255) */
  minLevel: number;
  /** Maximum level allowed to vote (0–255) */
  maxLevel: number;
  /**
   * Maximum number of candidates that can be selected.
   * 1 = single choice; >1 = multiple choice.
   */
  maxMultipleChoices: number;
  /** Poll start time (Unix timestamp in seconds) */
  startAt: number;
  /** Poll end time (Unix timestamp in seconds) */
  endAt: number;
  // Employee's main role PDA
  employeeMainRoleKey: PublicKey;
}

/**
 * Input parameters for updating basic poll information.
 *
 * Corresponds to the on-chain SetPollNormalParams struct. All fields are
 * optional; only provided fields are updated.
 *
 * Important: title, simpleDescription, and detailLink in the IDL use Rust
 * String (not [u8;64]), so pass JavaScript strings directly without converting
 * them to byte arrays.
 */
export interface SetPollNormalInput {
  /** Poll title */
  title?: string;
  /** Short poll description */
  simpleDescription?: string;
  /** Details link */
  detailLink?: string;
  /** Minimum level */
  minLevel?: number;
  /** Maximum level */
  maxLevel?: number;
  /** Maximum number of candidates that can be selected */
  maxMultipleChoices?: number;
  /**
   * Whether to mark the poll as invalid.
   * true = invalid; the poll has no effect.
   */
  isWrongPoll?: boolean;
}

// ============================================================
// 3. Helper functions
// ============================================================

/**
 * Convert undefined to null (Anchor's Option::None).
 */
function toOption<T>(value: T | undefined): T | null {
  return value === undefined ? null : value;
}

/**
 * Build the common account list for poll management instructions.
 *
 * Most poll management instructions (candidate/allowlist/blocklist updates
 * and status changes) share these accounts:
 *   - creator: poll creator (signer, writable)
 *   - poll: poll PDA (writable)
 *   - pollConfig: global poll configuration PDA (writable)
 *   - systemProgram: system program
 *
 * Extracted into a helper to avoid duplication.
 *
 * @param creatorPubkey - Poll creator's wallet public key
 * @param pollId - Poll ID used to derive the Poll PDA
 * @returns Account list
 */
function pollManagementAccounts(
  creatorPubkey: PublicKey,
  pollId: bigint | number,
): Record<string, PublicKey | null> {
  const [pollPda] = getPollPda(pollId);
  const [pollConfigPda] = getPollConfigPda();
  return {
    creator: creatorPubkey,
    poll: pollPda,
    pollConfig: pollConfigPda,
    systemProgram: SystemProgram.programId,
  };
}

// ============================================================
// 4. Poll creation
// ============================================================

/**
 * Create a poll (create_poll).
 *
 * Call flow:
 * Implementation detail.
 * Implementation detail.
 * Implementation detail.
 * Implementation detail.
 *
 * Implementation detail.
 * Implementation detail.
 * Implementation detail.
 * Implementation detail.
 * Implementation detail.
 * Implementation detail.
 * Implementation detail.
 * Implementation detail.
 * Implementation detail.
 *   - system_program
 *
 * Implementation detail.
 * Implementation detail.
 * Implementation detail.
 * Implementation detail.
 * Implementation detail.
 *
 * @example
 * Implementation detail.
 * const pollConfig = await fetchPollConfig(program);
 * Implementation detail.
 *
 * // 2. Create a poll
 * await createPoll(program, wallet.publicKey, totalPolls, {
 *   title: "2024 Project of the Year",
 *   simpleDescription: "Vote for this year's best project",
 *   minLevel: 1,
 *   maxLevel: 255,
 *   maxMultipleChoices: 3,
 *   startAt: Math.floor(Date.now() / 1000) + 86400, // Starts tomorrow
 *   endAt: Math.floor(Date.now() / 1000) + 86400 * 7, // Ends in one week
 * });
 */
export async function createPoll(
  program: Program,
  creatorPubkey: PublicKey,
  currentTotalPolls: number | bigint,
  employeeId: number | bigint, // Current user's employee ID
  input: CreatePollInput,
): Promise<string> {
  // Convert the frontend poll count to BN (on-chain u64)
  const frontPollId = new BN(Number(currentTotalPolls));

  // Derive the new poll's PDA
  const [pollPda] = getPollPda(currentTotalPolls);
  const [pollConfigPda] = getPollConfigPda();
  const [employeePda] = getEmployeePda(employeeId); // Derive the employee PDA

  /**
   * Build the InitPoll struct.
   *
   * Rust type        → JS type
   * [u8; 64]         → number[] (strToBytes64)
   * Option<[u8; 64]> → number[] | null
   * u8               → number
   * i64              → BN
   */
  const basicPollData: ParamsObject = {
    title: strToBytes64(input.title),
    simpleDescription: strToBytes64(input.simpleDescription),
    detailLink: input.detailLink ? strToBytes64(input.detailLink) : null,
    minLevel: input.minLevel,
    maxLevel: input.maxLevel,
    maxMultipleChoices: input.maxMultipleChoices,
    startAt: new BN(input.startAt),
    endAt: new BN(input.endAt),
  };

  return getMethods(program)
    .createPoll(
      frontPollId, // front_poll_id: u64
      basicPollData, // basic_poll_data: InitPoll
    )
    .accounts({
      creator: creatorPubkey,
      employee: employeePda,
      employeeMainRole: input.employeeMainRoleKey,
      poll: pollPda,
      pollConfig: pollConfigPda,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

// ============================================================
// Implementation note.
// ============================================================

/**
 * Create a candidate PDA (create_candidate).
 *
 * A candidate is an independent on-chain account (PDA) associated with a poll.
 * Creating one takes two steps:
 * 1. create_candidate — Create the candidate PDA account (this function).
 * 2. add_candidate — Add the candidate PDA to the poll's candidates list.
 *
 * A candidate can also have a pointer to another public key to associate an
 * external resource, such as an employee PDA.
 *
 * IDL instruction details:
 * Instruction: create_candidate
 * Arguments: poll_id (u64), name ([u8; 64]), optional pointer (Option<Pubkey>)
 * Accounts: creator (signer, writable, relation: poll), poll (writable),
 * candidate (writable), system_program.
 *
 * @param program - Anchor Program instance
 * @param creatorPubkey - Poll creator's wallet public key
 * @param pollId - ID of the poll
 * @param candidateName - Candidate name
 * @param pointer - Optional external public key, such as an employee PDA
 * @returns Transaction signature
 *
 * @example
 * // Create candidate "Proposal A" without an external resource
 * await createCandidate(program, wallet.publicKey, 0, "Proposal A");
 *
 * // Create candidate "Alex Smith" and link their employee PDA
 * const [empPda] = getEmployeePda(1);
 * await createCandidate(program, wallet.publicKey, 0, "Alex Smith", empPda);
 */
export async function createCandidate(
  program: Program,
  creatorPubkey: PublicKey,
  pollId: number | bigint,
  candidateName: string,
  pointer?: PublicKey,
): Promise<string> {
  const pollIdBN = new BN(Number(pollId));
  const nameBytes = strToBytes64(candidateName);
  const [pollPda] = getPollPda(pollId);
  // Derive the candidate PDA with seeds ["candidate", "v1", pollId LE bytes, first 32 bytes of name]
  const [candidatePda] = getCandidatePda(pollId, candidateName);

  return getMethods(program)
    .createCandidate(
      pollIdBN, // poll_id: u64
      nameBytes, // name: [u8; 64]
      pointer ? pointer : null, // pointer: Option<Pubkey>
    )
    .accounts({
      creator: creatorPubkey,
      poll: pollPda,
      candidate: candidatePda,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

/**
 * Add candidates to a poll's candidates list (add_candidate).
 *
 * Unlike createCandidate, which creates the on-chain PDA account,
 * addCandidate adds an existing candidate PDA to the poll's candidates Vec.
 *
 * Usually, create the account with createCandidate before associating it
 * with the poll using addCandidate.
 *
 * IDL instruction details: add_candidate takes poll_id (u64) and a list of
 * candidate PDA addresses (Vec<Pubkey>). Accounts: creator, poll, poll_config,
 * and system_program.
 *
 * @param program - Anchor Program instance
 * @param creatorPubkey - Poll creator's wallet public key
 * @param pollId - Poll ID
 * @param candidatePdas - Candidate PDA addresses
 * @returns Transaction signature
 *
 * @example
 * const [cand1] = getCandidatePda(0, "Proposal A");
 * const [cand2] = getCandidatePda(0, "Proposal B");
 * await addCandidate(program, wallet.publicKey, 0, [cand1, cand2]);
 */
export async function addCandidate(
  program: Program,
  creatorPubkey: PublicKey,
  pollId: number | bigint,
  candidatePdas: PublicKey[],
): Promise<string> {
  return getMethods(program)
    .addCandidate(
      new BN(Number(pollId)), // poll_id: u64
      candidatePdas, // candidates: Vec<Pubkey>
    )
    .accounts(pollManagementAccounts(creatorPubkey, pollId))
    .rpc();
}

/**
 * Remove candidates from a poll (remove_candidate).
 *
 * Removes the specified candidate PDA addresses from the poll's candidates
 * Vec. This does not delete their PDA accounts; it only removes the association.
 *
 * IDL instruction details: remove_candidate takes poll_id (u64) and a list of
 * candidate PDA addresses to remove. Accounts: creator, poll, poll_config,
 * and system_program.
 *
 * @param program - Anchor Program instance
 * @param creatorPubkey - Poll creator's wallet public key
 * @param pollId - Poll ID
 * @param candidatePdas - Candidate PDA addresses to remove
 * @returns Transaction signature
 */
export async function removeCandidate(
  program: Program,
  creatorPubkey: PublicKey,
  pollId: number | bigint,
  candidatePdas: PublicKey[],
): Promise<string> {
  return getMethods(program)
    .removeCandidate(
      new BN(Number(pollId)), // poll_id: u64
      candidatePdas, // candidates: Vec<Pubkey>
    )
    .accounts(pollManagementAccounts(creatorPubkey, pollId))
    .rpc();
}

// ============================================================
// 6. Basic poll configuration
// ============================================================

/**
 * Update basic poll information (set_poll_normal).
 *
 * After creating a poll (Draft state), the creator can update its title,
 * description, level range, maximum choices, and other basic settings.
 *
 * Important: unlike createPoll, title, simpleDescription, and detailLink in
 * SetPollNormalParams use Rust String (not [u8;64]). Pass JavaScript strings
 * directly; the on-chain program converts them to [u8;64].
 *
 * IDL instruction details: set_poll_normal takes poll_id (u64) and
 * SetPollNormalParams (all fields are Option<T>). Accounts: creator, poll,
 * poll_config, and system_program.
 *
 * @param program - Anchor Program instance
 * @param creatorPubkey - Poll creator's wallet public key
 * @param pollId - Poll ID
 * @param input - Fields to update; pass only those that should change
 * @returns Transaction signature
 *
 * @example
 * // Update only the title
 * await setPollNormal(program, wallet.publicKey, 0, {
 *   title: "New title",
 * });
 */
export async function setPollNormal(
  program: Program,
  creatorPubkey: PublicKey,
  pollId: number | bigint,
  input: SetPollNormalInput,
): Promise<string> {
  /**
   * Implementation detail.
   *
   * Implementation detail.
   * Implementation detail.
   * Implementation detail.
   * Implementation detail.
   */
  const params: ParamsObject = {
    title: toOption(input.title),
    simpleDescription: toOption(input.simpleDescription),
    detailLink: toOption(input.detailLink),
    minLevel: toOption(input.minLevel),
    maxLevel: toOption(input.maxLevel),
    maxMultipleChoices: toOption(input.maxMultipleChoices),
    isWrongPoll: toOption(input.isWrongPoll),
  };

  return getMethods(program)
    .setPollNormal(
      new BN(Number(pollId)), // poll_id: u64
      params, // SetPollNormalParams
    )
    .accounts(pollManagementAccounts(creatorPubkey, pollId))
    .rpc();
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
 *
 * Implementation detail.
 * Implementation detail.
 * Implementation detail.
 *   - poll_id (u64)
 * Implementation detail.
 * Implementation detail.
 *
 * Implementation detail.
 * Implementation detail.
 * @param pollId - Vote ID
 * Implementation detail.
 * Implementation detail.
 *
 * @example
 * Implementation detail.
 * Implementation detail.
 * await addPollAllowDepartments(program, wallet.publicKey, 0, [techDept, marketDept]);
 */
export async function addPollAllowDepartments(
  program: Program,
  creatorPubkey: PublicKey,
  pollId: number | bigint,
  departmentPdas: PublicKey[],
): Promise<string> {
  return getMethods(program)
    .addPollAllowDepartments(
      new BN(Number(pollId)), // poll_id: u64
      departmentPdas, // departments: Vec<Pubkey>
    )
    .accounts(pollManagementAccounts(creatorPubkey, pollId))
    .rpc();
}

/**
 * Implementation detail.
 *
 * Implementation detail.
 *
 * Implementation detail.
 * Implementation detail.
 * Implementation detail.
 *   - poll_id (u64)
 *   - departments (Vec<Pubkey>)
 * Implementation detail.
 *
 * Implementation detail.
 * Implementation detail.
 * @param pollId - Vote ID
 * Implementation detail.
 * Implementation detail.
 */
export async function removePollAllowDepartments(
  program: Program,
  creatorPubkey: PublicKey,
  pollId: number | bigint,
  departmentPdas: PublicKey[],
): Promise<string> {
  return getMethods(program)
    .removePollAllowDepartments(
      new BN(Number(pollId)), // poll_id: u64
      departmentPdas, // departments: Vec<Pubkey>
    )
    .accounts(pollManagementAccounts(creatorPubkey, pollId))
    .rpc();
}

// ============================================================
// 8. Role allowlist management
// ============================================================

/**
 * Add roles to the allowlist (add_poll_allow_roles).
 *
 * Like the department allowlist, when allowed_roles is non-empty, only
 * employees in the listed roles can vote.
 *
 * IDL instruction details: add_poll_allow_roles takes poll_id (u64) and
 * roles (Vec<Pubkey>). Accounts: creator, poll, poll_config, system_program.
 *
 * @param program - Anchor Program instance
 * @param creatorPubkey - Poll creator's wallet public key
 * @param pollId - Poll ID
 * @param rolePdas - Role PDA addresses to add to the allowlist
 * @returns Transaction signature
 *
 * @example
 * const [seniorDev] = getRolePda("Senior Engineer", "Engineering");
 * await addPollAllowRoles(program, wallet.publicKey, 0, [seniorDev]);
 */
export async function addPollAllowRoles(
  program: Program,
  creatorPubkey: PublicKey,
  pollId: number | bigint,
  rolePdas: PublicKey[],
): Promise<string> {
  return getMethods(program)
    .addPollAllowRoles(
      new BN(Number(pollId)), // poll_id: u64
      rolePdas, // roles: Vec<Pubkey>
    )
    .accounts(pollManagementAccounts(creatorPubkey, pollId))
    .rpc();
}

/**
 * Remove roles from the allowlist (remove_poll_allow_roles).
 *
 * IDL instruction details: remove_poll_allow_roles takes poll_id (u64) and
 * roles (Vec<Pubkey>). Accounts: creator, poll, poll_config, system_program.
 *
 * @param program - Anchor Program instance
 * @param creatorPubkey - Poll creator's wallet public key
 * @param pollId - Poll ID
 * @param rolePdas - Role PDA addresses to remove from the allowlist
 * @returns Transaction signature
 */
export async function removePollAllowRoles(
  program: Program,
  creatorPubkey: PublicKey,
  pollId: number | bigint,
  rolePdas: PublicKey[],
): Promise<string> {
  return getMethods(program)
    .removePollAllowRoles(
      new BN(Number(pollId)), // poll_id: u64
      rolePdas, // roles: Vec<Pubkey>
    )
    .accounts(pollManagementAccounts(creatorPubkey, pollId))
    .rpc();
}
// ============================================================
// 9. Department blocklist management
// ============================================================

/**
 * Add departments to the blocklist (add_poll_banned_departments).
 *
 * Employees in blocked departments **cannot** vote. The blocklist takes
 * precedence over the allowlist: employees remain blocked even if their
 * department is also allowlisted.
 *
 * IDL instruction details: add_poll_banned_departments takes poll_id (u64)
 * and departments (Vec<Pubkey>). Accounts: creator, poll, poll_config,
 * system_program.
 *
 * @param program - Anchor Program instance
 * @param creatorPubkey - Poll creator's wallet public key
 * @param pollId - Poll ID
 * @param departmentPdas - Department PDA addresses to add to the blocklist
 * @returns Transaction signature
 */
export async function addPollBannedDepartments(
  program: Program,
  creatorPubkey: PublicKey,
  pollId: number | bigint,
  departmentPdas: PublicKey[],
): Promise<string> {
  return getMethods(program)
    .addPollBannedDepartments(
      new BN(Number(pollId)), // poll_id: u64
      departmentPdas, // departments: Vec<Pubkey>
    )
    .accounts(pollManagementAccounts(creatorPubkey, pollId))
    .rpc();
}

/**
 * Remove departments from the blocklist (remove_poll_banned_departments).
 *
 * IDL instruction details: remove_poll_banned_departments takes poll_id
 * (u64) and departments (Vec<Pubkey>). Accounts: creator, poll, poll_config,
 * system_program.
 *
 * @param program - Anchor Program instance
 * @param creatorPubkey - Poll creator's wallet public key
 * @param pollId - Poll ID
 * @param departmentPdas - Department PDA addresses to remove from the blocklist
 * @returns Transaction signature
 */
export async function removePollBannedDepartments(
  program: Program,
  creatorPubkey: PublicKey,
  pollId: number | bigint,
  departmentPdas: PublicKey[],
): Promise<string> {
  return getMethods(program)
    .removePollBannedDepartments(
      new BN(Number(pollId)), // poll_id: u64
      departmentPdas, // departments: Vec<Pubkey>
    )
    .accounts(pollManagementAccounts(creatorPubkey, pollId))
    .rpc();
}

// ============================================================
// 10. Role blocklist management
// ============================================================

/**
 * Add roles to the blocklist (add_poll_banned_roles).
 *
 * Employees in blocked roles cannot vote.
 *
 * IDL instruction details: add_poll_banned_roles takes poll_id (u64) and
 * roles (Vec<Pubkey>). Accounts: creator, poll, poll_config, system_program.
 *
 * @param program - Anchor Program instance
 * @param creatorPubkey - Poll creator's wallet public key
 * @param pollId - Poll ID
 * @param rolePdas - Role PDA addresses to add to the blocklist
 * @returns Transaction signature
 */
export async function addPollBannedRoles(
  program: Program,
  creatorPubkey: PublicKey,
  pollId: number | bigint,
  rolePdas: PublicKey[],
): Promise<string> {
  return getMethods(program)
    .addPollBannedRoles(
      new BN(Number(pollId)), // poll_id: u64
      rolePdas, // roles: Vec<Pubkey>
    )
    .accounts(pollManagementAccounts(creatorPubkey, pollId))
    .rpc();
}

/**
 * Remove roles from the blocklist (remove_poll_banned_roles).
 *
 * IDL instruction details: remove_poll_banned_roles takes poll_id (u64) and
 * roles (Vec<Pubkey>). Accounts: creator, poll, poll_config, system_program.
 *
 * @param program - Anchor Program instance
 * @param creatorPubkey - Poll creator's wallet public key
 * @param pollId - Poll ID
 * @param rolePdas - Role PDA addresses to remove from the blocklist
 * @returns Transaction signature
 */
export async function removePollBannedRoles(
  program: Program,
  creatorPubkey: PublicKey,
  pollId: number | bigint,
  rolePdas: PublicKey[],
): Promise<string> {
  return getMethods(program)
    .removePollBannedRoles(
      new BN(Number(pollId)), // poll_id: u64
      rolePdas, // roles: Vec<Pubkey>
    )
    .accounts(pollManagementAccounts(creatorPubkey, pollId))
    .rpc();
}

// ============================================================
// 11. Poll status management
// ============================================================

/**
 * Update poll status (update_poll_status).
 *
 * After completing configuration, the poll creator calls this instruction
 * to change the status from Draft to Ready. The on-chain program determines
 * the final status based on the current time and configuration:
 * - is_ready=true and valid configuration → Ready
 * - end_at has passed → Closed
 * - Incomplete configuration → remains Draft
 *
 * IDL instruction details: update_poll_status takes poll_id (u64) and
 * is_ready (Option<bool>); true attempts to set the status to Ready.
 * Accounts: creator, poll, poll_config, system_program.
 *
 * @param program - Anchor Program instance
 * @param creatorPubkey - Poll creator's wallet public key
 * @param pollId - Poll ID
 * @param isReady - Whether to set the status to Ready (true to set; null to omit)
 * @returns Transaction signature
 *
 * @example
 * // Set the poll to Ready
 * await updatePollStatus(program, wallet.publicKey, 0, true);
 */
export async function updatePollStatus(
  program: Program,
  creatorPubkey: PublicKey,
  pollId: number | bigint,
  isReady: boolean | null,
): Promise<string> {
  return getMethods(program)
    .updatePollStatus(
      new BN(Number(pollId)), // poll_id: u64
      isReady, // is_ready: Option<bool>
    )
    .accounts(pollManagementAccounts(creatorPubkey, pollId))
    .rpc();
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
 * Implementation detail.
 * Implementation detail.
 *   - poll_id (u64)
 * Implementation detail.
 *
 * Implementation detail.
 * Implementation detail.
 * @param pollId - Vote ID
 * Implementation detail.
 */
export async function tryUpdatePollStatus(
  program: Program,
  creatorPubkey: PublicKey,
  pollId: number | bigint,
): Promise<string> {
  return getMethods(program)
    .tryUpdatePollStatus(
      new BN(Number(pollId)), // poll_id: u64
    )
    .accounts(pollManagementAccounts(creatorPubkey, pollId))
    .rpc();
}

// ============================================================
// Implementation note.
// ============================================================

/**
 * Implementation detail.
 *
 * Implementation detail.
 * 1. EmployeeConnectWallet
 * Implementation detail.
 * Implementation detail.
 * Implementation detail.
 * Implementation detail.
 *
 * Implementation detail.
 * Implementation detail.
 * Implementation detail.
 * - employee.active == true
 * - employee.allow_vote == true
 * - role.allow_vote == true
 * - department.allow_vote == true
 * - VoteStatus == Ready
 * Implementation detail.
 * Implementation detail.
 * Implementation detail.
 * Implementation detail.
 * Implementation detail.
 * Implementation detail.
 *
 * Implementation detail.
 * Implementation detail.
 * Implementation detail.
 * Implementation detail.
 * Implementation detail.
 *
 * Implementation detail.
 * Implementation detail.
 * Implementation detail.
 *   - employee_id (u64): Employee ID
 *   - poll_id (u64): Vote ID
 * Implementation detail.
 * Implementation detail.
 * Implementation detail.
 * Implementation detail.
 * Implementation detail.
 * Implementation detail.
 * Implementation detail.
 *   - poll (writable): Vote PDA（Update total_votes）
 * Implementation detail.
 *   - system_program
 *
 * Implementation detail.
 * Implementation detail.
 * Implementation detail.
 * @param pollId - Vote ID
 * Implementation detail.
 * Implementation detail.
 * Implementation detail.
 * Implementation detail.
 *
 * @example
 * Implementation detail.
 * // employeeId = 3, rolePda = ..., departmentPda = ...
 * Implementation detail.
 * await vote(
 *   program,
 *   wallet.publicKey,
 *   3,          // employeeId
 *   0,          // pollId
 * Implementation detail.
 *   rolePda,
 *   departmentPda
 * );
 */
export async function vote(
  program: Program,
  voterPubkey: PublicKey,
  employeeId: number | bigint,
  pollId: number | bigint,
  choices: PublicKey[],
  rolePda: PublicKey,
  departmentPda: PublicKey,
): Promise<string> {
  const [employeePda] = getEmployeePda(employeeId);
  const [pollPda] = getPollPda(pollId);
  const [pollConfigPda] = getPollConfigPda();
  const [voteStubPda] = getVoteStubPda(pollId, voterPubkey);

  // Implementation note.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const builder: any = getMethods(program)
    .vote(new BN(Number(employeeId)), new BN(Number(pollId)), choices)
    .accounts({
      voter: voterPubkey,
      employee: employeePda,
      role: rolePda,
      department: departmentPda,
      pollConfig: pollConfigPda,
      poll: pollPda,
      voteStub: voteStubPda,
      systemProgram: SystemProgram.programId,
    });

  // Implementation note.
  return builder
    .remainingAccounts(
      choices.map((pk: PublicKey) => ({
        pubkey: pk,
        isSigner: false,
        isWritable: true, // Candidate account must be writable to update vote count
      })),
    )
    .rpc();
}
