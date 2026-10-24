/**
 * constants.ts — Global constants
 *
 * This file centralizes project constants:
 * 1. On-chain program ID
 * 2. PDA seed prefixes used to derive account addresses
 * 3. Seed version to distinguish PDA versions during upgrades
 * 4. Admin public key used by the frontend to identify administrators
 *
 * Solana PDAs (Program Derived Addresses) are deterministic addresses derived
 * by hashing a set of seeds with the program ID. The same seeds always produce
 * the same address, allowing the frontend and on-chain program to derive it
 * independently without storing it separately.
 */

import {PublicKey} from "@solana/web3.js";

// ============================================================
// Implementation note.
// ============================================================

/**
 * On-chain address of the deployed Anchor program. This comes from the
 * `declare_id!()` macro and the IDL's "address" field. The frontend needs it
 * to build transactions and derive PDAs.
 */
export const PROGRAM_ID = new PublicKey(
    process.env.NEXT_PUBLIC_PROGRAM_ID!
    // Throws if the environment variable is not set.
    // Ensure it is configured in .env.local for production.
);

// ============================================================
// Implementation note.
// ============================================================

/**
 * Seed version "v1", matching the SEED_VERSION constant on the Rust side.
 * All PDA seeds include this version. Changing it during a future upgrade
 * creates a new set of PDAs for data migration.
 *
 * Buffer.from("v1") produces the byte array [118, 49], corresponding to
 * {"kind":"const","value":[118,49]} in the IDL PDA seeds.
 */
export const SEED_VERSION = Buffer.from("v1");

// ============================================================
// Implementation note.
// ============================================================

/**
 * Each on-chain account type has a unique seed prefix to prevent address
 * collisions between account types.
 *
 * For example:
 * Implementation detail.
 *   Department PDA = hash(["department", "v1", first 32 bytes of name, program_id])
 *
 * These strings must exactly match the constants on the Rust side.
 */

/** Seed prefix for the global poll configuration (PollConfig) */
export const POLL_CONFIG_SEED = Buffer.from("poll_config");
// Corresponds to the IDL values [112,111,108,108,95,99,111,110,102,105,103]

/** Seed prefix for the global employee configuration (EmployeeConfig) */
export const EMPLOYEE_CONFIG_SEED = Buffer.from("employee_config");
// Corresponds to the IDL values [101,109,112,108,111,121,101,101,95,99,111,110,102,105,103]

/** Seed prefix for a department */
export const DEPARTMENT_SEED = Buffer.from("department");

/** Seed prefix for a role */
export const ROLE_SEED = Buffer.from("role");

/** Seed prefix for an employee */
export const EMPLOYEE_SEED = Buffer.from("employee");

/** Seed prefix for a poll */
export const POLL_SEED = Buffer.from("poll");

/** Seed prefix for a candidate */
export const CANDIDATE_SEED = Buffer.from("candidate");

/** Seed prefix for a VoteStub, which records whether someone voted in a poll */
export const VOTE_STUB_SEED = Buffer.from("vote_stub");

// ============================================================
// Implementation note.
// ============================================================

/**
 * Admin wallet public key, validated on the Rust side with
 * constraint = admin.key() == ADMIN_PUBKEY. The frontend uses it to determine
 * whether the connected wallet is an administrator and whether to show admin UI.
 */
export const ADMIN_PUBKEY = new PublicKey(
    process.env.NEXT_PUBLIC_ADMIN_PUBKEY!
);

/** Solana Explorer URL, selected automatically based on the network */
export const EXPLORER_URL =
  process.env.NEXT_PUBLIC_SOLANA_NETWORK === "mainnet-beta"
    ? "https://explorer.solana.com"
    : `https://explorer.solana.com?cluster=${process.env.NEXT_PUBLIC_SOLANA_NETWORK || "devnet"}`;