use crate::constants::ADMIN_PUBKEY;
use crate::constants::EMPLOYEE_SEED_PREFIX;
use crate::constants::SEED_VERSION;
use crate::error::PermissionError::NotAdmin;
use crate::state::organizations::employee::Employee;
use crate::state::organizations::role::Role;
use crate::utils::u64_to_u8_8;
use anchor_lang::prelude::*;
use crate::Department;

#[derive(Accounts)]
#[instruction(employee_id:u64)]
pub struct UpdateEmployee<'info> {
    #[account(mut,constraint = admin.key() == ADMIN_PUBKEY @ NotAdmin)]
    pub admin: Signer<'info>,
    #[account( mut,seeds = [EMPLOYEE_SEED_PREFIX,SEED_VERSION,&u64_to_u8_8(employee_id)],bump = employee.bump
    )]
    pub employee: Account<'info, Employee>,
    // Role changes may require updating role member counts. If the role is not changing, both accounts may be None.
    // The client must ensure these two account addresses differ; otherwise, the transaction will fail.
    // Keep only mut here; validation is performed inside the function.
    #[account(mut)]
    pub old_role: Option<Account<'info, Role>>,

    #[account(mut)]
    pub new_role: Option<Account<'info, Role>>,

    // Old department (required for transfers across departments; omit for transfers within a department).
    #[account(mut)]
    pub old_department: Option<Account<'info, Department>>,

    // New department (required for transfers across departments; omit for transfers within a department).
    #[account(mut)]
    pub new_department: Option<Account<'info, Department>>,

    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct UpdateEmployeeParams {
    pub owner: Option<Pubkey>,           // Public key of the employee's own wallet.
    pub name: Option<[u8; 64]>,          // Employee name; the client only needs to supply a string.
    pub active: Option<bool>,            // Whether the employee is active.
    pub allow_create_poll: Option<bool>, // Whether the employee may create polls.
    pub allow_vote: Option<bool>,        // Whether the employee may vote.
    pub temp_level: Option<u8>, // The default level comes from the primary role; if a temporary level is set, it is used for permission checks.
    pub main_role_key: Option<Pubkey>, // New role public key; if it matches the current role, no change is made.
}
