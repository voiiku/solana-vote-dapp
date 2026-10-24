/**
 * pda.ts — PDA (Program Derived Address) derivation functions
 *
 * A PDA is a Solana-specific concept. Regular addresses are generated from
 * private keys, but PDAs have no associated private key. They are deterministic
 * addresses derived by hashing a set of seeds with the program ID.
 *
 * Key PDA properties:
 * 1. Deterministic: the same seeds and program ID always produce the same PDA
 * 2. No private key: only the program can sign for the PDA
 * 3. Unique: different seeds produce different addresses for different data
 *
 * The frontend needs to tell Solana which account to access when building a
 * transaction. These functions derive PDA addresses locally without querying
 * the chain. Unlike a traditional database, the address itself identifies the
 * data to query.
 *
 * findProgramAddressSync returns a [PublicKey, bump] tuple:
 * - PublicKey: the derived PDA address
 * - bump: a number from 0 to 255 used to ensure the address is off the
 *   ed25519 curve (so there is no corresponding private key). The on-chain
 *   program stores the bump when creating the PDA and uses it for validation.
 */

import { PublicKey } from "@solana/web3.js";
import {
  PROGRAM_ID,
  SEED_VERSION,
  POLL_CONFIG_SEED,
  EMPLOYEE_CONFIG_SEED,
  DEPARTMENT_SEED,
  ROLE_SEED,
  EMPLOYEE_SEED,
  POLL_SEED,
  CANDIDATE_SEED,
  VOTE_STUB_SEED,
} from "./constants";
import { strToBytes64, u64ToLeBytes } from "./utils";

// ============================================================
// 1. Global configuration PDAs (one per program)
// ============================================================

/**
 * Derive the PDA for the global poll configuration (PollConfig).
 *
 * Seeds: ["poll_config", "v1"]. Since they are fixed, there is only one
 * PollConfig PDA per program. An administrator initializes it with
 * init_poll_config.
 *
 * Matches Rust seeds = [POLL_CONFIG_SEED_PREFIX, SEED_VERSION]
 *
 * @returns [PDA address, bump]
 */
export function getPollConfigPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [POLL_CONFIG_SEED, SEED_VERSION], // Seed array
    PROGRAM_ID // Program ID
  );
}

/**
 * Derive the PDA for the global employee configuration (EmployeeConfig).
 *
 * Seeds: ["employee_config", "v1"]. There is one per program, storing the
 * global incrementing employee ID counter.
 *
 * Matches Rust seeds = [EMPLOYEE_CONFIG_SEED_PREFIX, SEED_VERSION]
 *
 * @returns [PDA address, bump]
 */
export function getEmployeeConfigPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [EMPLOYEE_CONFIG_SEED, SEED_VERSION],
    PROGRAM_ID
  );
}

// ============================================================
// 2. Organization PDAs (derived by name or ID)
// ============================================================

/**
 * Derive the PDA for a department.
 *
 * Seeds: ["department", "v1", first 32 bytes of the department name]
 *
 * Individual Solana PDA seeds are limited to 32 bytes. Although department
 * names are stored as [u8; 64], only the first 32 bytes are used as a seed.
 * Department names must therefore differ within those bytes (about 10 Chinese
 * characters in UTF-8, which is usually enough).
 *
 * Matches Rust:
 * seeds = [DEPARTMENT_SEED_PREFIX, SEED_VERSION, &department_name[..32]]
 *
 * @param name - Department name
 * @returns [PDA address, bump]
 *
 * @example
 * const [deptPda] = getDepartmentPda("Engineering");
 * // deptPda is the on-chain account address for Engineering.
 */
export function getDepartmentPda(name: string): [PublicKey, number] {
  // 1. Convert the string to a 64-byte array
  const nameBytes = strToBytes64(name);

  // 2. Use only the first 32 bytes as the seed (matching Rust's &department_name[..32])
  return PublicKey.findProgramAddressSync(
    [
      DEPARTMENT_SEED,
      SEED_VERSION,
      Buffer.from(nameBytes.slice(0, 32)), // first 32 bytes
    ],
    PROGRAM_ID
  );
}

/**
 * Derive the PDA for a role.
 *
 * Seeds: ["role", "v1", first 32 bytes of role name, first 32 bytes of department name]
 *
 * A role belongs to a department, so its seeds include both the role name and
 * department name. Different departments can have roles with the same name
 * (such as "Engineering Manager" and "Marketing Manager") because their
 * department-name seeds produce different PDAs.
 *
 * Matches Rust:
 * seeds = [ROLE_SEED_PREFIX, SEED_VERSION, &role_name[..32], &department_name[..32]]
 *
 * @param roleName - Role name
 * @param departmentName - Name of the role's department
 * @returns [PDA address, bump]
 *
 * @example
 * const [rolePda] = getRolePda("Senior Engineer", "Engineering");
 */
export function getRolePda(
  roleName: string,
  departmentName: string
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      ROLE_SEED,
      SEED_VERSION,
      Buffer.from(strToBytes64(roleName).slice(0, 32)),
      Buffer.from(strToBytes64(departmentName).slice(0, 32)),
    ],
    PROGRAM_ID
  );
}

/**
 * Derive the PDA for an employee.
 *
 * Seeds: ["employee", "v1", employee ID as 8-byte little-endian]
 *
 * An employee is identified by a globally incrementing employee_id (u64),
 * not by name or wallet public key. Their on-chain PDA remains unchanged if
 * they change their name or wallet.
 *
 * When creating an employee, the program reads and increments
 * EmployeeConfig.global_employee_id. The frontend must query EmployeeConfig
 * for the next available ID before creating an employee.
 *
 * Matches Rust:
 * seeds = [EMPLOYEE_SEED_PREFIX, SEED_VERSION, &u64_to_u8_8(employee_id)]
 *
 * @param employeeId - Employee ID (u64)
 * @returns [PDA address, bump]
 *
 * @example
 * const [empPda] = getEmployeePda(0);  // First employee
 * const [empPda2] = getEmployeePda(1); // Second employee
 */
export function getEmployeePda(
  employeeId: bigint | number
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      EMPLOYEE_SEED,
      SEED_VERSION,
      u64ToLeBytes(employeeId), // Convert the ID to 8-byte little-endian
    ],
    PROGRAM_ID
  );
}

// ============================================================
// 3. Poll-related PDAs
// ============================================================

/**
 * Derive the PDA for a poll.
 *
 * Seeds: ["poll", "v1", poll ID as 8-byte little-endian]
 *
 * Like employees, polls use globally incrementing IDs. Query
 * PollConfig.total_polls before creating a poll and use its current value
 * as the new poll ID.
 *
 * Matches Rust:
 * seeds = [POLL_SEED_PREFIX, SEED_VERSION, &u64_to_u8_8(poll_id)]
 *
 * @param pollId - Poll ID (u64)
 * @returns [PDA address, bump]
 */
export function getPollPda(pollId: bigint | number): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [POLL_SEED, SEED_VERSION, u64ToLeBytes(pollId)],
    PROGRAM_ID
  );
}

/**
 * Derive the PDA for a candidate.
 *
 * Seeds: ["candidate", "v1", poll ID as 8-byte little-endian, first 32 bytes of candidate name]
 *
 * A candidate belongs to a poll, so its seeds include both the poll ID and
 * candidate name. Candidate names must be unique within a poll because
 * duplicates would produce the same PDA.
 *
 * Matches Rust:
 * seeds = [CANDIDATE_SEED_PREFIX, SEED_VERSION, &u64_to_u8_8(poll_id), &name[..32]]
 *
 * @param pollId - ID of the poll
 * @param name - Candidate name
 * @returns [PDA address, bump]
 *
 * @example
 * const [candPda] = getCandidatePda(0, "Proposal A");
 */
export function getCandidatePda(
  pollId: bigint | number,
  name: string
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      CANDIDATE_SEED,
      SEED_VERSION,
      u64ToLeBytes(pollId),
      Buffer.from(strToBytes64(name).slice(0, 32)),
    ],
    PROGRAM_ID
  );
}

/**
 * Derive the PDA for a vote stub (VoteStub).
 *
 * Seeds: ["vote_stub", "v1", poll ID as 8-byte little-endian, voter's 32-byte public key]
 *
 * A VoteStub records someone's vote in a poll. Its seeds include poll_id and
 * the voter's public key, which means:
 * 1. Each voter has only one VoteStub per poll (preventing duplicate votes).
 * 2. The frontend can check whether a user has voted by deriving this PDA and
 *    checking whether the account exists on-chain.
 *
 * Matches Rust:
 * seeds = [VOTE_STUB_SEED_PREFIX, SEED_VERSION, &u64_to_u8_8(poll_id), voter.key().as_ref()]
 *
 * @param pollId - Poll ID
 * @param voter - Voter's wallet public key
 * @returns [PDA address, bump]
 *
 * @example
 * const [stubPda] = getVoteStubPda(0, wallet.publicKey);
 * // Then check whether stubPda exists to determine whether the user has voted.
 */
export function getVoteStubPda(
  pollId: bigint | number,
  voter: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      VOTE_STUB_SEED,
      SEED_VERSION,
      u64ToLeBytes(pollId),
      voter.toBuffer(), // Convert the PublicKey to a 32-byte Buffer
    ],
    PROGRAM_ID
  );
}