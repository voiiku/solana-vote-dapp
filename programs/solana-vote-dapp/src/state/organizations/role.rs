use crate::constants::{ADMIN_PUBKEY, DEPARTMENT_SEED_PREFIX, ROLE_SEED_PREFIX, SEED_VERSION};
use crate::error::PermissionError::NotAdmin;
use crate::state::organizations::department::Department;
use anchor_lang::prelude::*;
#[account]
#[derive(InitSpace)]
pub struct Role {
    pub role_name: [u8; 64], // Immutable because it is used to derive the seeds. Create a new account and migrate to rename.
    pub role_level: u8,
    pub members: u32, // Updated automatically when employees are added, removed, or reassigned.
    pub allow_create_poll: bool,
    pub allow_vote: bool,
    pub department_name: [u8; 64], // Immutable because it is used to derive the seeds. Create a new account and migrate to rename.
    pub bump: u8,                  // Immutable.
}
#[derive(Accounts)]
#[instruction(role_name: [u8; 64], role_level:u8,department_name: [u8; 64])]
pub struct CreateRole<'info> {
    #[account(
        mut,
        constraint = admin.key() == ADMIN_PUBKEY @ NotAdmin
    )]
    pub admin: Signer<'info>,

    /// 1. Verify that the department exists.
    /// Seeds must match [b"department", v1, [u8; 64]].
    #[account(
        seeds = [
            DEPARTMENT_SEED_PREFIX,
            SEED_VERSION,
            &department_name[..32]
        ],
        bump = department.bump,
    )]
    pub department: Account<'info, Department>,

    /// 2. Create the role account.
    /// Seeds must match [b"role", v1, [u8; 64], [u8; 64]].
    #[account(
        init,
        payer = admin,
        space = 8 + Role::INIT_SPACE,
        seeds = [
            ROLE_SEED_PREFIX,
            SEED_VERSION,
            &role_name[..32],
            &department_name[..32]
        ],
        bump
    )]
    pub role: Account<'info, Role>,

    pub system_program: Program<'info, System>,
}
