use crate::error::InvalidParameter::{IllegalPollIntervalTime, LevelError};
use crate::state::global_config::poll_config::{
    InitPollConfig, UpdatePollConfig, UpdatePollConfigParams,
};
use anchor_lang::prelude::*;

// Initializes PollConfig.
pub fn init_poll_config(
    ctx: Context<InitPollConfig>,
    allow_create_poll: bool,   // Whether poll creation is globally enabled.
    min_polling_interval: i64, // Configurable minimum interval between poll start and end times.
    max_polling_interval: i64, // Configurable maximum interval between poll start and end times.
    min_allow_create_poll: u8, // Configurable minimum level required to create a poll.
) -> Result<()> {
    // 1. Validate the interval.
    if min_polling_interval > max_polling_interval {
        return Err(IllegalPollIntervalTime.into());
    }
    // 2. Validate the level.
    if min_allow_create_poll > 31 {
        return Err(LevelError.into());
    }

    let poll_config = &mut ctx.accounts.poll_config;
    poll_config.total_polls = 0;
    poll_config.allow_create_poll = allow_create_poll;
    poll_config.min_polling_interval = min_polling_interval;
    poll_config.max_polling_interval = max_polling_interval;
    poll_config.min_allow_create_poll = min_allow_create_poll;
    poll_config.bump = ctx.bumps.poll_config;
    msg!("Global configuration PDA PollConfig created at: {}.", ctx.accounts.poll_config.key());
    Ok(())
}
pub fn update_poll_config(
    ctx: Context<UpdatePollConfig>,
    params: UpdatePollConfigParams,
) -> Result<()> {
    let poll_config = &mut ctx.accounts.poll_config;
    // 1. Validate the interval; return an error if the time parameters are invalid, otherwise apply them.
    let min_interval = params
        .min_polling_interval
        .unwrap_or(poll_config.min_polling_interval);
    let max_interval = params
        .max_polling_interval
        .unwrap_or(poll_config.max_polling_interval);
    if min_interval > max_interval {
        return Err(IllegalPollIntervalTime.into());
    }
    poll_config.min_polling_interval = min_interval;
    poll_config.max_polling_interval = max_interval;

    // 2. Validate the configured level; return an error if invalid, otherwise apply it.
    if let Some(min_allow_create_poll) = params.min_allow_create_poll {
        if min_allow_create_poll > 31 {
            return Err(LevelError.into());
        }
        poll_config.min_allow_create_poll = min_allow_create_poll;
    }
    // 3. Apply the global poll creation switch.
    if let Some(allow_create_poll) = params.allow_create_poll {
        poll_config.allow_create_poll = allow_create_poll;
    }
    msg!("The administrator updated the global poll configuration in PollConfig.");
    Ok(())
}
