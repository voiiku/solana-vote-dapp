use crate::error::InvalidParameter::{TooLongInterval, TooShortInterval};
use crate::error::TxError::GETPollIDFailed;
use crate::error::*;
use crate::state::poll::create_poll::PollStatus::Draft;
use crate::state::poll::create_poll::{CreatePoll, InitPoll};
use crate::utils::{get_solana_time, u8_64_to_string};
use anchor_lang::prelude::*;

// Create a poll.
// Before calling this function, the client passes current total_polls + 1. It is compared with the ID
// obtained by this program (also incremented to reserve it); if they match, no other poll was created
// during the transaction. Otherwise, the transaction fails and rolls back.
pub fn create_poll(
    ctx: Context<CreatePoll>,
    front_poll_id: u64,
    basic_poll_data: InitPoll, // Receives an initial data structure that is not stored on-chain.
) -> Result<()> {
    get_solana_time();
    // 1. Check whether the poll ID is already claimed.
    let total_polls = &mut ctx.accounts.poll_config.total_polls;
    *total_polls += 1;
    // Incrementing global total_polls reserves the ID. If it differs from the client value, the ID is invalid and must be fetched again.
    if front_poll_id != *total_polls {
        return Err(GETPollIDFailed.into());
    }
    // 2. If the ID is valid, check whether poll creation is currently allowed.
    let employee = &ctx.accounts.employee;
    let employee_main_role = &ctx.accounts.employee_main_role;
    // 2.0 The Accounts constraints already verify that the employee is active, the owner matches, and allow_create_poll is enabled.
    // The role and its department permissions must also be checked.
    require!(ctx.accounts.employee_main_role.allow_create_poll == true,PermissionError::RoleDenied);
    // There is a logic issue here: the context must be updated to pass the corresponding department account,
    // otherwise department permissions cannot be checked.
    //require!(ctx.accounts.employee_main_role.department_name)
    // 2.1 Validate the minimum and maximum participation levels: minimum must be less than maximum, and maximum must be below 32.
    require!(
        basic_poll_data.min_level < basic_poll_data.max_level && basic_poll_data.max_level < 32,
        InvalidParameter::LevelError
    );
    // 2.2 Validate the multiple-choice setting; it must be between 1 and 20.
    require!(
        basic_poll_data.max_multiple_choices >= 1 && basic_poll_data.max_multiple_choices <= 20,
        InvalidParameter::MultipleChoicesError
    );
    // 2.3 Time lock: start must precede end, and the interval must be within the global PollConfig limits.
    require!(
        basic_poll_data.start_at < basic_poll_data.end_at,
        InvalidParameter::IllegalTimeStamp
    );
    let interval = basic_poll_data.end_at - basic_poll_data.start_at;
    // Return an error if the interval is shorter than the minimum.
    if interval < ctx.accounts.poll_config.min_polling_interval {
        return Err(TooShortInterval.into());
    }
    // Return an error if the interval is longer than the maximum.
    if interval > ctx.accounts.poll_config.max_polling_interval {
        return Err(TooLongInterval.into());
    }
    // The poll start time must be in the future.
    require!(
        basic_poll_data.start_at > Clock::get()?.unix_timestamp,
        InvalidParameter::IllegalTimeStamp
    );
    // 2.4 Ensure the creator's level meets or exceeds the threshold in PollConfig.
    // Use the temporary level if set; otherwise, use the role level.
    let effective_level = employee.temp_level.unwrap_or(employee_main_role.role_level);
    require!(
        effective_level >= ctx.accounts.poll_config.min_allow_create_poll,
        PermissionError::LevelError
    );

    // 3. Write the initial data after validating the parameters.
    let poll = &mut ctx.accounts.poll;
    poll.poll_id = front_poll_id; // The client has already incremented the value, so use it directly. A successful ID check guarantees it is correct.
    poll.creator = ctx.accounts.creator.key();
    poll.bump = ctx.bumps.poll;
    poll.create_time = Clock::get()?.unix_timestamp;
    poll.title = basic_poll_data.title;
    poll.simple_description = basic_poll_data.simple_description;
    poll.detail_link = if let Some(link) = basic_poll_data.detail_link {
        Some(link)
    } else {
        None
    };
    poll.total_votes = 0;
    poll.min_level = basic_poll_data.min_level;
    poll.max_level = basic_poll_data.max_level;
    poll.allowed_departments = Vec::new();
    poll.banned_departments = Vec::new();
    poll.allowed_roles = Vec::new();
    poll.banned_roles = Vec::new();
    poll.max_multiple_choices = basic_poll_data.max_multiple_choices;
    poll.status = Draft; // Initially Draft.
    poll.is_wrong_poll = false;
    poll.candidates = Vec::new();
    poll.start_at = basic_poll_data.start_at;
    poll.end_at = basic_poll_data.end_at;
    msg!(
        "Poll ID {} was created by employee {}, ID: {} | public key: {}.",
        front_poll_id,
        u8_64_to_string(&ctx.accounts.employee.name),
        ctx.accounts.employee.employee_id,
        ctx.accounts.creator.key()
    );
    Ok(())
}
