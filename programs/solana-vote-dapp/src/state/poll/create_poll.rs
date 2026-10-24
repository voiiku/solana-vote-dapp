use crate::constants::POLL_SEED_PREFIX;
use crate::constants::SEED_VERSION;
use crate::state::global_config::poll_config::PollConfig;
use crate::utils::u64_to_u8_8;
use crate::error::PermissionError;
use crate::error::InvalidParameter;
use anchor_lang::prelude::*;
use crate::{Employee, Role};

#[derive(AnchorSerialize, AnchorDeserialize)]
// This account is a prototype used to create a complete Poll structure; Poll implements From<InitPoll>.
pub struct InitPoll {
    // Basic information.
    pub title: [u8; 64],               // Title [u8; 64].
    pub simple_description: [u8; 64],  // Brief description [u8; 64].
    pub detail_link: Option<[u8; 64]>, // Optional URL with poll details [u8; 64].

    // Permission constraints.
    pub min_level: u8, // Minimum level allowed to participate.
    pub max_level: u8,

    // Poll rules and status.
    pub max_multiple_choices: u8, // Maximum number of choices allowed: 1 to 20.

    // Time lock.
    pub start_at: i64,
    pub end_at: i64,
}
// Actual poll structure. Strings are passed for convenience when used by the client and other functions,
// then converted to [u8; 64] when creating or modifying a poll.
#[account]
pub struct Poll {
    // === 1. System-populated fields (immutable) ===
    // Unique, sequential poll ID, automatically obtained from PollConfig.total_polls at creation.
    pub poll_id: u64,
    // Poll creator, populated automatically.
    pub creator: Pubkey,
    // PDA bump seed.
    pub bump: u8,
    // Time this PDA was created.
    pub create_time: i64,

    // === 2. Basic information (from InitPoll) ===
    // Title.
    pub title: [u8; 64],
    // Brief description.
    pub simple_description: [u8; 64],
    // Optional URL with poll details.
    pub detail_link: Option<[u8; 64]>,
    // Total number of participants in the poll.
    pub total_votes: u64,

    // === 3. Permission constraints (from InitPoll) ===
    // Minimum level allowed to participate.
    pub min_level: u8,
    // Maximum level allowed to participate.
    pub max_level: u8,
    // Departments allowed to participate; unrestricted if empty. Initially empty and configured through poll update methods.
    pub allowed_departments: Vec<Pubkey>,
    // Departments blocked from participating; unrestricted if empty. Initially empty and configured through poll update methods.
    pub banned_departments: Vec<Pubkey>,
    // Allowed roles (allowlist); if empty, any role may vote. Lower priority; initially empty.
    pub allowed_roles: Vec<Pubkey>,
    // Blocked roles (blocklist), initially empty.
    pub banned_roles: Vec<Pubkey>,

    // === 4. Poll rules and status ===
    // Maximum number of choices allowed: 1 to 20.
    pub max_multiple_choices: u8,
    // Poll status, initially Draft. This status is passive and used only to authorize poll edits;
    // voting eligibility is determined by checking the timestamp and whether the status is Ready.
    // To display the live status on the client or elsewhere, validate the timestamps; for example,
    // to show that a poll is in progress, ensure the current time is within the valid range.
    // The is_bad_poll helper also checks time and status validity (if the start time has passed while
    // status is still Draft, the poll is invalid and voting is disallowed).
    pub status: PollStatus,
    // Defaults to false. The creator can mark a poll as invalid by setting this to true; it cannot be reset to false.
    // When checking for an invalid poll, also check this field and whether a Draft poll has passed its start time.
    // A poll is valid only when its status is Ready and its time range is valid.
    pub is_wrong_poll: bool,
    // All candidates, stored as a list of candidate PDA addresses so the client can query every Candidate account at once; initially empty.
    pub candidates: Vec<Pubkey>,

    // === 5. Time lock (immutable) ===
    pub start_at: i64,
    pub end_at: i64,
}
#[derive(Accounts)]
#[instruction(front_poll_id:u64)]
pub struct CreatePoll<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    // Initialize with 300 bytes and empty Vecs. Candidates can be added later through updates that trigger realloc.
    // Rent is charged according to the space used and is not refunded because Poll accounts are permanently archived.
    #[account(init,payer=creator, seeds = [POLL_SEED_PREFIX,SEED_VERSION,&u64_to_u8_8(front_poll_id)],bump,space = 363 )]
    pub poll: Account<'info, Poll>,
    #[account(mut)]
    pub poll_config: Account<'info, PollConfig>,
    /// Employee account associated with the creator.
    /// The constraint automatically validates during deserialization that:
    ///   1. The employee's owner field matches the signer (preventing identity impersonation).
    ///   2. The employee is active (active == true).
    ///   3. The employee has permission to create polls (allow_create_poll == true).
    #[account(
        constraint = employee.owner == creator.key() @ InvalidParameter::AddressMismatchError,
        constraint = employee.active == true @  PermissionError::EmployeeNotActive,
        constraint = employee.allow_create_poll == true @  PermissionError::PermissionDenied,
    )]
    pub employee: Account<'info, Employee>,
    /// Department account associated with the creator, used to get the employee's level and compare it with PollConfig.
    /// The constraint automatically validates during deserialization that:
    ///   1. The employee's main_role_key matches the public key of the supplied role account.
    ///   2. The department level is not checked here because the employee may have a temporary level.
    #[account(constraint = employee.main_role_key == employee_main_role.key() @ InvalidParameter::AddressMismatchError,)]
    pub employee_main_role: Account<'info, Role>,
    system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum PollStatus {
    Draft,
    Ready,
    Closed,
}
