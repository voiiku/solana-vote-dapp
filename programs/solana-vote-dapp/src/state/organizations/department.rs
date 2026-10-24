use crate::constants::{ADMIN_PUBKEY, DEPARTMENT_SEED_PREFIX, SEED_VERSION};
use crate::error::PermissionError::NotAdmin;
use anchor_lang::prelude::*;
#[account]
#[derive(InitSpace)]
pub struct Department {
    // Department name: [u8; 64].
    // Department member count: u32.
    // Whether poll creation is allowed: bool.
    // Whether voting is allowed: bool.
    // Bump: u8.
    pub department_name: [u8; 64], // Immutable because it determines the PDA. To rename, create a PDA with the new name and migrate existing employees.
    pub members: u32,              // Updated automatically.
    pub allow_create_poll: bool,
    pub allow_vote: bool,
    pub bump: u8, // Immutable.
}
#[derive(Accounts)]
#[instruction(department_name: [u8;64])] // Receives a string parameter from the client.
pub struct CreateDepartment<'info> {
    #[account(mut, constraint = admin.key() == ADMIN_PUBKEY @ NotAdmin)]
    pub admin: Signer<'info>,
    #[account(init, payer = admin, seeds = [DEPARTMENT_SEED_PREFIX, SEED_VERSION,&department_name[..32]],bump,space = 8 + Department::INIT_SPACE
    )]
    pub department: Account<'info, Department>,
    pub system_program: Program<'info, System>,
}
