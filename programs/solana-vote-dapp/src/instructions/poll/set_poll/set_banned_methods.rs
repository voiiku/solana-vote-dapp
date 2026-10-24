use crate::constants::ANCHOR_DISC_LEN;
use crate::error::InvalidParameter;
use crate::error::InvalidParameter::MutexVec;
use crate::state::poll::set_poll::SetPoll;
use crate::utils::{auto_resize_account, borsh_serialized_size, shrink_account_and_refund};
use anchor_lang::prelude::*;

/// 1. Add departments to the blocklist.
/// Validation rules:
/// 1. A department to be added cannot already be on the allowlist (allowed_departments).
/// 2. Automatically deduplicate; skip departments already on the blocklist.
/// 3. Resize dynamically, with the creator paying any additional rent.
pub fn add_poll_banned_departments(
    ctx: Context<SetPoll>,
    departments: Vec<Pubkey>,
) -> anchor_lang::Result<()> {
    // 1. Validate the count limit.
    // Hard limit of 20 per call to prevent the transaction from becoming too large.
    require!(departments.len() <= 20, InvalidParameter::TooManyVecItem);
    let poll = &mut ctx.accounts.poll;

    // 1. Enforce allowlist/blocklist exclusivity and deduplicate entries.
    for dept in departments.iter() {
        // A. Exclusivity check: determine whether this department is on the allowlist.
        // If so, remove it from the allowlist first; otherwise, return a conflict error.
        if poll.allowed_departments.contains(dept) {
            return Err(MutexVec.into());
        }

        // B. Idempotency check: determine whether this department is already on the blocklist.
        // Push only if absent to avoid wasting space by growing the Vec.
        if !poll.banned_departments.contains(dept) {
            poll.banned_departments.push(*dept);
        }
    }

    // 2. Calculate the total Borsh-serialized size of the updated Poll structure.
    // Includes the 4-byte header for each Vec and the added Pubkey bytes.
    let required_len = ANCHOR_DISC_LEN + borsh_serialized_size(&**poll)?;

    // 3. Resize dynamically and pay any additional rent.
    // Use the previously defined helper for AccountInfo::resize(new_len).
    auto_resize_account(
        &poll.to_account_info(),                        // Target: Poll PDA account.
        &ctx.accounts.creator.to_account_info(),        // Payer: poll creator.
        &ctx.accounts.system_program.to_account_info(), // System program reference.
        required_len,                                   // Calculated exact size.
    )?;
    msg!("Department blocklist updated for poll ID {} (no count reported).", poll.poll_id);
    Ok(())
}

/// 2. Add roles to the blocklist.
/// Validation rules:
/// 1. A role to be added cannot already be on the role allowlist (allowed_roles).
/// 2. Automatically deduplicate; skip roles already on the blocklist.
/// 3. Dynamically expand the PDA account using resize.
pub fn add_poll_banned_roles(ctx: Context<SetPoll>, roles: Vec<Pubkey>) -> anchor_lang::Result<()> {
    // 1. Validate the count limit.
    // Hard limit of 20 per call to prevent the transaction from becoming too large.
    require!(roles.len() <= 20, InvalidParameter::TooManyVecItem);
    let poll = &mut ctx.accounts.poll;

    // 1. Enforce allowlist/blocklist exclusivity and deduplicate entries.
    for role in roles.iter() {
        // A. Exclusivity check: determine whether this role is on the allowlist.
        // If so, remove it from the allowlist first; otherwise, return a MutexVec conflict error.
        if poll.allowed_roles.contains(role) {
            return Err(MutexVec.into());
        }

        // B. Idempotency check: determine whether this role is already on the blocklist.
        // Avoid redundant data in the Vec and save rent by not pushing duplicates.
        if !poll.banned_roles.contains(role) {
            poll.banned_roles.push(*role);
        }
    }

    // 2. Calculate the total serialized size of the updated Poll account.
    // Includes the Vec length field (4 bytes) and each added Pubkey (32 bytes).
    let required_len = ANCHOR_DISC_LEN + borsh_serialized_size(&**poll)?;

    // 3. Resize dynamically and pay any additional rent.
    // Call the utility function defined for AccountInfo::resize(new_len).
    auto_resize_account(
        &poll.to_account_info(),                        // Target: Poll account.
        &ctx.accounts.creator.to_account_info(),        // Payer: poll creator.
        &ctx.accounts.system_program.to_account_info(), // System program reference.
        required_len,                                   // Calculated target size.
    )?;
    msg!("Role blocklist updated for poll ID {} (no count reported).", poll.poll_id);
    Ok(())
}
/// 3. Remove departments from the blocklist.
pub fn remove_poll_banned_departments(
    ctx: Context<SetPoll>,
    departments: Vec<Pubkey>,
) -> Result<()> {
    let poll = &mut ctx.accounts.poll;
    let old_len = poll.banned_departments.len();

    poll.banned_departments
        .retain(|dept| !departments.contains(dept));

    if poll.banned_departments.len() < old_len {
        let required_len = ANCHOR_DISC_LEN + borsh_serialized_size(&**poll)?;
        shrink_account_and_refund(
            &poll.to_account_info(),
            &ctx.accounts.creator.to_account_info(),
            required_len,
        )?;
    }
    msg!("Department blocklist updated for poll ID {} (no count reported).", poll.poll_id);
    Ok(())
}
/// 4. Remove roles from the blocklist.
pub fn remove_poll_banned_roles(ctx: Context<SetPoll>, roles: Vec<Pubkey>) -> Result<()> {
    let poll = &mut ctx.accounts.poll;
    let old_len = poll.banned_roles.len();

    poll.banned_roles.retain(|role| !roles.contains(role));

    if poll.banned_roles.len() < old_len {
        let required_len = ANCHOR_DISC_LEN + borsh_serialized_size(&**poll)?;
        shrink_account_and_refund(
            &poll.to_account_info(),
            &ctx.accounts.creator.to_account_info(),
            required_len,
        )?;
    }
    msg!("Role blocklist updated for poll ID {} (no count reported).", poll.poll_id);
    Ok(())
}
