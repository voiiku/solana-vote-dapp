use crate::constants::*;
use crate::constants::{SEED_VERSION, VOTE_STUB_SEED_PREFIX};
use crate::error::InvalidParameter;
use crate::error::PermissionError;
use crate::state::global_config::poll_config::PollConfig;
use crate::state::organizations::department::Department;
use crate::state::organizations::employee::Employee;
use crate::state::organizations::role::Role;
use crate::state::poll::create_poll::Poll;
use crate::state::vote::vote_stub::VoteStub;
use crate::utils::u64_to_u8_8;
use anchor_lang::prelude::*;
use anchor_lang::prelude::{Account, Program, Signer, System};
use anchor_lang::Accounts;

#[derive(Accounts)]
#[instruction(employee_id: u64, poll_id: u64)]
pub struct Vote<'info> {
    #[account(mut)]
    pub voter: Signer<'info>,

    /// 1. Employee account: identified by employee_id and used as the entry point.
    #[account(
        seeds = [
            EMPLOYEE_SEED_PREFIX,
            SEED_VERSION,
            &u64_to_u8_8(employee_id)
        ],
        bump = employee.bump,
        // Security check: only the wallet that owns this employee account can vote.
        constraint = employee.owner == voter.key() @ PermissionError::PermissionDenied
    )]
    pub employee: Account<'info, Employee>,

    /// 2. Role account:
    /// A. The address constraint enforces a match with the employee's main_role_key.
    /// B. The seeds constraint ensures this is a valid PDA derived from role_name and department_name.
    #[account(
        address = employee.main_role_key @ InvalidParameter::AddressMismatchError,
        seeds = [
            ROLE_SEED_PREFIX,
            SEED_VERSION,
            &role.role_name[..32],      // Use data from the role account directly as a seed for self-validation.
            &role.department_name[..32]
        ],
        bump = role.bump
    )]
    pub role: Account<'info, Role>,

    /// 3. Department account:
    /// Its seeds are derived from the department_name stored in the Role account.
    #[account(
        seeds = [
            DEPARTMENT_SEED_PREFIX,
            SEED_VERSION,
           &role.department_name[..32]
        ],
        bump = department.bump
    )]
    pub department: Account<'info, Department>,

    /// 4. Global poll configuration.
    #[account(
        seeds = [POLL_CONFIG_SEED_PREFIX, SEED_VERSION],
        bump = poll_config.bump
    )]
    pub poll_config: Account<'info, PollConfig>,

    /// 5. Main poll PDA.
    #[account(
        mut,
        seeds = [
            POLL_SEED_PREFIX,
            SEED_VERSION,
            &u64_to_u8_8(poll_id)
        ],
        bump = poll.bump
    )]
    pub poll: Account<'info, Poll>,

    /// 6. Vote stub (initialized).
    #[account(
        init ,
        payer = voter,
        space = VoteStub::MAX_SIZE,
        seeds = [
            VOTE_STUB_SEED_PREFIX,
            SEED_VERSION,
            &u64_to_u8_8(poll_id),
            voter.key().as_ref()
        ],
        bump
    )]
    pub vote_stub: Account<'info, VoteStub>,
    // Voting updates vote counts in candidate PDAs. Since the number of candidates can vary, all candidate PDAs are passed through remaining_accounts.
    pub system_program: Program<'info, System>,
}
