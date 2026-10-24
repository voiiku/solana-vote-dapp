use crate::error::InvalidParameter::PollStatusUpdateError;
use crate::error::TxError::{ClosedPoll, ReadyPoll};
use crate::state::poll::create_poll::PollStatus::{Closed, Draft, Ready};
use crate::state::poll::set_poll::SetPoll;
use anchor_lang::prelude::*;

/// Manually attempts to update the current poll status, usually to let the creator change Draft to Ready.
pub fn update_poll_status(ctx: Context<SetPoll>, is_ready: Option<bool>) -> Result<()> {
    let poll = &mut ctx.accounts.poll;
    let time_now = Clock::get()?.unix_timestamp;
    // 1. A closed poll cannot be modified; return an error.
    if poll.status == Closed {
        return Err(ClosedPoll.into());
    }
    // A Draft poll past its start time is invalid; a Ready poll past its end time has ended normally.
    // 2. A Draft poll past its start time cannot be modified.
    // Check for an invalid poll.
    if poll.status == Draft && time_now > poll.start_at {
        poll.status = Closed;
        msg!(
            "Poll ID {} is invalid; the system automatically set its status to Closed.",
            poll.poll_id
        );
        return Ok(());
    }

    // 3. If the deadline has passed (only Ready polls and unstarted Draft polls can reach this point),
    // set the status to Closed. Closed polls were already handled above, avoiding duplicate messages.
    if time_now > poll.end_at {
        poll.status = Closed;
        msg!("Poll ID {} has ended; the system automatically set its status to Closed.", poll.poll_id);
        return Ok(());
    }

    // 4. The only case requiring a parameter is manually changing Draft to Ready.
    // Previous checks have passed, so only the Draft-to-Ready transition needs validation.
    // Allow the transition only if the poll is still Draft, has not started, and is explicitly marked for readiness.
    if poll.status == Draft && time_now <= poll.start_at && is_ready == Some(true) {
        poll.status = Ready;
        return Ok(());
    }
    // 5. At this point, only Ready polls that have not ended or Draft polls that have not started
    // with is_ready other than true can reach this logic.
    if poll.status == Ready {
        return Err(ReadyPoll.into());
    }
    if (is_ready == Some(true)) && poll.status == Draft {
        return Err(PollStatusUpdateError.into());
    }
    // This is a regular status update with no state change, so return successfully.
    Ok(())
}
/// Attempts to update the poll status (silent mode).
/// Always returns Ok(()) regardless of the current state.
/// Primarily used by client scripts to scan and close expired polls without rolling back
/// when a poll is already Closed or the state does not match.
pub fn try_update_poll_status(ctx: Context<SetPoll>) -> Result<()> {
    let poll = &mut ctx.accounts.poll;
    let time_now = Clock::get()?.unix_timestamp;

    // 1. If already Closed, the poll has been handled; exit silently.
    if poll.status == Closed {
        return Ok(());
    }

    // 2. Check for invalid polls: Draft status and past the start time.
    if poll.status == Draft && time_now > poll.start_at {
        poll.status = Closed;
        msg!(
            "Attempted update: poll ID {} is invalid and was automatically set to Closed.",
            poll.poll_id
        );
        return Ok(());
    }

    // 3. Check for expiration: close any poll past its end time, whether Draft (inactive) or Ready (active).
    if time_now > poll.end_at {
        poll.status = Closed;
        msg!("Attempted update: poll ID {} has expired and was automatically set to Closed.", poll.poll_id);
        return Ok(());
    }

    // 4. Note: this function does not handle a manual Draft -> Ready transition.
    // Setting Ready manually requires the creator's explicit intent (is_ready: Some(true));
    // try_update is primarily for the system to "harvest" poll states by closing expired polls.

    Ok(())
}
