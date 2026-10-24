use crate::error::InvalidParameter;
use crate::state::poll::set_poll::SetPoll;
use crate::utils::{auto_resize_account, borsh_serialized_size, shrink_account_and_refund};
use anchor_lang::prelude::*;
use crate::constants::ANCHOR_DISC_LEN;

/// Adds poll candidates.
/// Requirements:
/// 1. The total number of candidates cannot exceed the limit (for example, 20).
/// 2. Candidate PDA addresses must be unique.
/// 3. Precisely calculate the Borsh-serialized size and resize the account.
pub fn add_poll_candidates(
    ctx: Context<SetPoll>,
    candidates: Vec<Pubkey>,
) -> anchor_lang::Result<()> {
    let poll = &mut ctx.accounts.poll;

    // 1. Validate the count limit.
    // Hard limit of 20 per call to prevent the transaction from becoming too large.
    require!(candidates.len() <= 20, InvalidParameter::TooManyVecItem);

    // 2. Validate uniqueness and remove duplicates.
    let mut pushed_counter: u8 = 0; // Number of candidates added to the poll after deduplication.
    for candidate_pda in candidates.iter() {
        // A. Idempotency check: determine whether this candidate is already in the list.
        // Avoid pushing the same candidate address more than once.
        if !poll.candidates.contains(candidate_pda) {
            poll.candidates.push(*candidate_pda);
            pushed_counter += 1; // Increment when successfully added.
        }
    }

    // 3. Calculate the exact serialized size of the updated Poll account.
    // Each added Pubkey uses 32 bytes, and the Vec header uses 4 bytes.
    let required_len = ANCHOR_DISC_LEN + borsh_serialized_size(&**poll)?;

    // 4. Resize dynamically and pay any additional rent.
    // Call auto_resize_account, which internally calls resize(new_len).
    auto_resize_account(
        &poll.to_account_info(),                        // Target: Poll account.
        &ctx.accounts.creator.to_account_info(),        // Payer: creator.
        &ctx.accounts.system_program.to_account_info(), // System program.
        required_len,                                   // Calculated target size.
    )?;

    msg!(
        "Successfully updated poll ID {}: added {} candidates; current candidate count: {}.",
        poll.poll_id,
        pushed_counter,
        poll.candidates.len()
    );

    Ok(())
}

/// Removes candidates.
pub fn remove_poll_candidates(ctx: Context<SetPoll>, candidates: Vec<Pubkey>) -> Result<()> {
    let poll = &mut ctx.accounts.poll;
    let old_len = poll.candidates.len();
    let mut removed_counter = 0; // Number of candidates successfully removed.
    poll.candidates.retain(|c| {
        if candidates.contains(c) {
            removed_counter += 1;
            false // Return false to remove candidates marked for deletion.
        } else {
            true // Otherwise, return true to keep the candidate.
        }
    });

    if poll.candidates.len() < old_len {
        let required_len = ANCHOR_DISC_LEN + borsh_serialized_size(&**poll)?;
        shrink_account_and_refund(
            &poll.to_account_info(),
            &ctx.accounts.creator.to_account_info(),
            required_len,
        )?;
    }
    msg!(
        "Successfully updated poll ID {}: removed {} candidates; current candidate count: {}.",
        poll.poll_id,
        removed_counter,
        poll.candidates.len()
    );
    Ok(())
}
