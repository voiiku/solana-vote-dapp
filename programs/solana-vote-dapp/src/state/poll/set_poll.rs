use crate::constants::{POLL_CONFIG_SEED_PREFIX, POLL_SEED_PREFIX, SEED_VERSION};
use crate::error::PermissionError::PermissionDenied;
use crate::state::global_config::poll_config::PollConfig;
use crate::state::poll::create_poll::Poll;
use crate::utils::u64_to_u8_8;
use anchor_lang::prelude::*;

// Rent is required because Vec values may be modified.
#[derive(Accounts)]
#[instruction(poll_id: u64)]
pub struct SetPoll<'info> {
    #[account(mut,address = poll.creator.key())]
    pub creator: Signer<'info>,
    #[account(mut,seeds = [POLL_SEED_PREFIX, SEED_VERSION,&u64_to_u8_8(poll_id)],bump = poll.bump,has_one = creator @ PermissionDenied )]
    pub poll: Account<'info, Poll>,
    #[account(mut,seeds = [POLL_CONFIG_SEED_PREFIX, SEED_VERSION],bump = poll_config.bump )]
    pub poll_config: Account<'info, PollConfig>,
    pub system_program: Program<'info, System>,
}
#[derive(AnchorSerialize, AnchorDeserialize)]
// Updates only general settings; Vec and status updates are implemented separately.
pub struct SetPollNormalParams {
    // === 2. Basic information (from InitPoll) ===
    // Title.
    pub title: Option<String>,
    // Brief description.
    pub simple_description: Option<String>,
    // Optional URL with poll details.
    pub detail_link: Option<String>,

    // === 3. Permission constraints (from InitPoll) ===
    // Minimum level allowed to participate.
    pub min_level: Option<u8>,
    // Maximum level allowed to participate.
    pub max_level: Option<u8>,

    // === 4. Poll rules and status ===
    // Maximum number of choices allowed: 1 to 20.
    pub max_multiple_choices: Option<u8>,

    pub is_wrong_poll: Option<bool>,
}
