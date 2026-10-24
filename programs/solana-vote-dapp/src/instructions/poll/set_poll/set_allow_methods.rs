use crate::constants::ANCHOR_DISC_LEN;
use crate::error::InvalidParameter;
use crate::error::InvalidParameter::MutexVec;
use crate::state::poll::set_poll::SetPoll;
use crate::utils::{auto_resize_account, borsh_serialized_size, shrink_account_and_refund};
use anchor_lang::prelude::*;

/// 1. Add departments to the allowlist.
pub fn add_poll_allow_departments(ctx: Context<SetPoll>, departments: Vec<Pubkey>) -> Result<()> {
    // 1. Validate the count limit.
    // Hard limit of 20 per call to prevent the transaction from becoming too large.
    require!(departments.len() <= 20, InvalidParameter::TooManyVecItem);
    let poll = &mut ctx.accounts.poll;

    // 1. Business rule validation: allowlists and blocklists are mutually exclusive.
    // Iterate over each new department Pubkey supplied by the client.
    for dept in departments.iter() {
        // Check whether this department is already on the blocklist.
        // If so, it cannot be added to the allowlist; return a conflict error.
        if poll.banned_departments.contains(dept) {
            return Err(MutexVec.into());
        }

        // Check whether this department is already on the allowlist.
        // Add it only if absent to prevent duplicates in the Vec.
        if !poll.allowed_departments.contains(dept) {
            poll.allowed_departments.push(*dept);
        }
    }

    // 2. Calculate the Borsh-serialized size of the updated Poll data.
    let required_len = ANCHOR_DISC_LEN + borsh_serialized_size(&**poll)?;

    // 3. Resize dynamically using auto_resize_account.
    // This function checks the current balance, pays any rent shortfall, and calls AccountInfo::resize().
    auto_resize_account(
        &poll.to_account_info(),                        // Target account.
        &ctx.accounts.creator.to_account_info(),        // Creator paying the rent.
        &ctx.accounts.system_program.to_account_info(), // System program reference.
        required_len,                                   // Target size.
    )?;
    msg!("Department allowlist updated for poll ID {} (no count reported).", poll.poll_id);
    Ok(())
}
/// 2. Add roles to the allowlist.
/// Validation rules:
/// 1. A role to be added cannot already be on the role blocklist (banned_roles).
/// 2. Automatically deduplicate; skip roles that are already on the allowlist.
/// 3. Precisely calculate the Borsh-serialized size and resize the account.
pub fn add_poll_allow_roles(ctx: Context<SetPoll>, roles: Vec<Pubkey>) -> Result<()> {
    // 1. Validate the count limit.
    // Hard limit of 20 per call to prevent the transaction from becoming too large.
    require!(roles.len() <= 20, InvalidParameter::TooManyVecItem);
    let poll = &mut ctx.accounts.poll;

    // 1. Enforce allowlist/blocklist exclusivity and deduplicate entries.
    for role in roles.iter() {
        // A. Exclusivity check: determine whether this role is on the role blocklist.
        // If so, remove it from the blocklist first; otherwise, return a MutexVec conflict error.
        if poll.banned_roles.contains(role) {
            return Err(MutexVec.into());
        }

        // B. Idempotency check: determine whether this role is already on the role allowlist.
        // Avoid redundant Pubkeys in the Vec (each uses 32 bytes).
        if !poll.allowed_roles.contains(role) {
            poll.allowed_roles.push(*role);
        }
    }

    // 2. Calculate the total serialized size of the updated Poll structure.
    // Since the Vec has grown, this obtains the exact size including the Borsh header.
    let required_len = ANCHOR_DISC_LEN + borsh_serialized_size(&**poll)?;

    // 3. Resize dynamically and pay any additional rent.
    // Call auto_resize_account, which internally calls resize(new_len).
    auto_resize_account(
        &poll.to_account_info(),                        // Target: Poll account.
        &ctx.accounts.creator.to_account_info(),        // Payer: creator.
        &ctx.accounts.system_program.to_account_info(), // System program.
        required_len,                                   // Calculated target size.
    )?;
    msg!("Role allowlist updated for poll ID {} (no count reported).", poll.poll_id);
    Ok(())
}
/// 3. Remove departments from the allowlist.
/// Requirements:
/// 1. Remove no more than 20 items per call, following the transaction size limit.
/// 2. Use retain to filter out the specified departments.
/// 3. If data changes, shrink the account and refund rent using shrink_account_and_refund.
pub fn remove_poll_allow_departments(
    ctx: Context<SetPoll>,
    departments: Vec<Pubkey>,
) -> Result<()> {
    // 1. Limit the number of Pubkeys per call to avoid exceeding the 1232-byte transaction limit.
    require!(departments.len() <= 20, InvalidParameter::TooManyVecItem);

    let poll = &mut ctx.accounts.poll;
    let old_len = poll.allowed_departments.len();

    // 2. Apply the removal.
    // Keep only departments not included in the `departments` list.
    poll.allowed_departments
        .retain(|dept| !departments.contains(dept));

    // 3. Check whether any data was actually removed.
    let new_len = poll.allowed_departments.len();
    if new_len < old_len {
        // A. Calculate the exact serialized size of the Poll structure after removal.
        let required_len = ANCHOR_DISC_LEN + borsh_serialized_size(&**poll)?;

        // B. Call the generic shrink utility.
        // It calculates the difference, deducts it from poll, credits creator, then calls target_account.resize(required_len).
        shrink_account_and_refund(
            &poll.to_account_info(),                 // Account to shrink: Poll.
            &ctx.accounts.creator.to_account_info(), // Refund recipient: creator.
            required_len,                            // Target physical size.
        )?;
    }
    msg!("Department allowlist updated for poll ID {} (no count reported).", poll.poll_id);
    Ok(())
}

/// 4. Remove roles from the allowlist.
pub fn remove_poll_allow_roles(ctx: Context<SetPoll>, roles: Vec<Pubkey>) -> Result<()> {
    let poll = &mut ctx.accounts.poll;
    let old_len = poll.allowed_roles.len();

    poll.allowed_roles.retain(|role| !roles.contains(role));

    if poll.allowed_roles.len() < old_len {
        let required_len = ANCHOR_DISC_LEN + borsh_serialized_size(&**poll)?;
        shrink_account_and_refund(
            &poll.to_account_info(),
            &ctx.accounts.creator.to_account_info(),
            required_len,
        )?;
    }
    msg!("Role allowlist updated for poll ID {} (no count reported).", poll.poll_id);
    Ok(())
}
