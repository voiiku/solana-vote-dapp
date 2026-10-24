use crate::constants::DEPARTMENT_SEED_PREFIX;
use crate::constants::{EMPLOYEE_CONFIG_SEED_PREFIX, EMPLOYEE_SEED_PREFIX, SEED_VERSION};
use crate::state::global_config::employee_config::EmployeeConfig;
use crate::state::organizations::role::Role;
use crate::utils::u64_to_u8_8;
use crate::Department;
use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Employee {
    pub owner: Pubkey, // Public key of the employee's own wallet.
    pub employee_id: u64,
    pub name: [u8; 64],
    pub active: bool,            // Whether the employee is active.
    pub allow_create_poll: bool, // Whether the employee may create polls.
    pub allow_vote: bool,        // Whether the employee may vote.
    pub temp_level: Option<u8>, // The default level comes from the primary role; if a temporary level is set, it is used for permission checks.
    pub main_role_key: Pubkey,  // Public key of the primary role, which determines the default level and department.
    pub bump: u8,
}
#[derive(Accounts)]
pub struct CreateEmployee<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [EMPLOYEE_CONFIG_SEED_PREFIX, SEED_VERSION],
        bump = employee_config.bump,
    )]
    pub employee_config: Account<'info, EmployeeConfig>,

    #[account(
        init,
        payer = admin,
        space = 8 + Employee::INIT_SPACE,
        seeds = [
            EMPLOYEE_SEED_PREFIX,
            SEED_VERSION,
            // Always use the ID in the current configuration as a seed.
            // If the client supplies the wrong ID, it cannot derive the correct PDA and the transaction fails.
            &u64_to_u8_8(employee_config.global_employee_id)
        ],
        bump
    )]
    pub employee: Account<'info, Employee>,

    #[account(mut)]
    pub employee_main_role: Account<'info, Role>,

    // Department of the employee's primary role, used to increment the department's member count.
    // Use Anchor's cross-account reference to include employee_main_role.department_name in the seeds.
    #[account(
        mut,
        seeds = [DEPARTMENT_SEED_PREFIX, SEED_VERSION, &employee_main_role.department_name[..32]],
        bump = department.bump
    )]
    pub department: Account<'info, Department>,

    pub system_program: Program<'info, System>,
}
