use crate::constants::ADMIN_PUBKEY;
use crate::constants::EMPLOYEE_CONFIG_SEED_PREFIX;
use crate::constants::SEED_VERSION;
use crate::error::PermissionError::NotAdmin;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct InitEmployeeConfig<'info> {
    #[account(mut,constraint = admin.key() == ADMIN_PUBKEY @ NotAdmin)]
    pub admin: Signer<'info>,
    #[account(init,payer = admin,seeds = [EMPLOYEE_CONFIG_SEED_PREFIX, SEED_VERSION],bump,space = 8 + EmployeeConfig::INIT_SPACE
    )]
    pub employee_config: Account<'info, EmployeeConfig>,
    pub system_program: Program<'info, System>,
}
// Global employee ID counter to prevent duplicate employee IDs.
#[account]
#[derive(InitSpace)]
pub struct EmployeeConfig {
    pub global_employee_id: u64, // Use the current ID, then increment the global counter.
    pub bump: u8,
}
