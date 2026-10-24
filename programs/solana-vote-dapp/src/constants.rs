use anchor_lang::prelude::*;

/*
Seed rules:
1. Maximum seed length: a single seed cannot exceed 32 bytes.
2. Slicing: when deriving a PDA from a [u8; 64] name field, always slice it to [..32].
3. Consistent ordering: clients deriving PDAs must follow the defined [prefix, version, dynamic parameters...] order.
4. Byte order: u64 values must use little-endian encoding (8 bytes).
*/
/// Length of the discriminator in Anchor account data (8 bytes).
pub const ANCHOR_DISC_LEN: usize = 8;
pub const ADMIN_PUBKEY: Pubkey = pubkey!("");

// Seed version identifier: separates implementation versions (use v2 for upgrades to isolate existing data).
pub const SEED_VERSION: &[u8] = b"v1";

/// --- 1. Global configuration (singleton PDAs) ---

// Global employee system counter.
// Seed structure: [b"employee_config", SEED_VERSION]
pub const EMPLOYEE_CONFIG_SEED_PREFIX: &[u8] = b"employee_config";

// Global poll system configuration.
// Seed structure: [b"poll_config", SEED_VERSION]
pub const POLL_CONFIG_SEED_PREFIX: &[u8] = b"poll_config";

/// --- 2. Organization structure (dynamic PDAs) ---

// Department account (Department PDA).
// Purpose: stores department information.
// Seed structure: [b"department", SEED_VERSION, department_name[..32]]
// Note: when deriving this on the client, convert the department name to a 32-byte buffer (zero-pad if shorter, truncate if longer).
pub const DEPARTMENT_SEED_PREFIX: &[u8] = b"department";

// Role account (Role PDA).
// Purpose: stores role information associated with a department.
// Seed structure: [b"role", SEED_VERSION, role_name[..32], department_name[..32]]
// A department may have multiple roles with the same name; department_name ensures each full path is unique.
pub const ROLE_SEED_PREFIX: &[u8] = b"role";

// Employee account (Employee PDA).
// Purpose: stores an employee record.
// Seed structure: [b"employee", SEED_VERSION, employee_id (u64_le)]
pub const EMPLOYEE_SEED_PREFIX: &[u8] = b"employee";

/// --- 3. Polls (dynamic PDAs) ---

// Poll account (Poll PDA).
// Purpose: stores all configuration for a single poll.
// Seed structure: [b"poll", SEED_VERSION, poll_id (u64_le)]
pub const POLL_SEED_PREFIX: &[u8] = b"poll";

// Candidate account (Candidate PDA).
// Purpose: stores a candidate's vote count.
// Seed structure: [b"candidate", SEED_VERSION, poll_id (u64_le), candidate_name[..32]]
pub const CANDIDATE_SEED_PREFIX: &[u8] = b"candidate";

// Vote stub (VoteStub PDA).
// Purpose: records who voted in each poll to prevent duplicate voting.
// Seed structure: [b"vote_stub", SEED_VERSION, poll_id (u64_le), voter_pubkey (32 bytes)]
// Note: Pubkey is already 32 bytes, so use voter.key().as_ref() directly without slicing.
pub const VOTE_STUB_SEED_PREFIX: &[u8] = b"vote_stub";
