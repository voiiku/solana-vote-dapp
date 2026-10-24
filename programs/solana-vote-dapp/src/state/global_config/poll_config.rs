use crate::constants::{ADMIN_PUBKEY, POLL_CONFIG_SEED_PREFIX, SEED_VERSION};
use crate::error::PermissionError::NotAdmin;
use anchor_lang::prelude::*;
#[account]
#[derive(InitSpace)]
// Initialization is administrator-only and cannot be repeated.
pub struct PollConfig {
    pub total_polls: u64,          // Global incrementing ID; cannot be changed manually and can only be incremented.
    pub allow_create_poll: bool,   // Global switch for allowing poll creation (administrator-controlled).
    pub min_polling_interval: i64, // Configurable minimum interval between poll start and end times; stored as i64 to avoid conversion when calculating timestamp differences.
    pub max_polling_interval: i64, // Configurable maximum interval between poll start and end times.
    pub min_allow_create_poll: u8, // Configurable minimum level required to create a poll.
    pub bump: u8,
}
#[derive(AnchorSerialize, AnchorDeserialize)]
// Parameter updates are administrator-only.
pub struct UpdatePollConfigParams {
    pub allow_create_poll: Option<bool>, // Global switch for allowing poll creation (administrator-controlled).
    pub min_polling_interval: Option<i64>, // Configurable minimum interval between poll start and end times; stored as i64 to avoid conversion when calculating timestamp differences.
    pub max_polling_interval: Option<i64>, // Configurable maximum interval between poll start and end times.
    pub min_allow_create_poll: Option<u8>, // Configurable minimum level required to create a poll.
}
#[derive(Accounts)]
pub struct InitPollConfig<'info> {
    #[account(mut,constraint = admin.key() == ADMIN_PUBKEY @ NotAdmin)]
    pub admin: Signer<'info>,
    #[account(init, payer = admin,seeds = [POLL_CONFIG_SEED_PREFIX,SEED_VERSION],bump, space = 8 + PollConfig::INIT_SPACE)]
    pub poll_config: Account<'info, PollConfig>,
    pub system_program: Program<'info, System>,
}
#[derive(Accounts)]
pub struct UpdatePollConfig<'info> {
    #[account(constraint = admin.key() == ADMIN_PUBKEY @ NotAdmin )]
    pub admin: Signer<'info>,
    #[account(mut,seeds = [POLL_CONFIG_SEED_PREFIX,SEED_VERSION],bump = poll_config.bump)]
    pub poll_config: Account<'info, PollConfig>,
}
