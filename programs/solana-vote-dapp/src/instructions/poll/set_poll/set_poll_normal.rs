use crate::error::InvalidParameter;
use crate::error::PermissionError::LevelError;
use crate::error::TxError::VoteCanNotSet;
use crate::state::poll::create_poll::PollStatus::Draft;
use crate::state::poll::set_poll::{SetPoll, SetPollNormalParams};
use crate::utils::{
    auto_resize_account, borsh_serialized_size, get_solana_time, string_to_u8_64,
}; // Added auto_resize_account import.
use anchor_lang::prelude::*;

/// Anchor discriminator length constant.
const ANCHOR_DISC_LEN: usize = 8;

// This function updates only general poll settings. Vec arrays have dedicated add/remove methods,
// and poll status is updated by Update_poll_status.
// This function can update the title, description, link, level, number of choices, and invalid-poll flag.
//
// Special rule: is_wrong_poll can be set in any status (Draft/Ready/Closed);
// other fields can be changed only while the poll is Draft and has not started.
//
// Space note: changing detail_link from None to Some adds 64 bytes of Borsh data and requires
// dynamic resizing (auto_resize_account). All other fields have fixed sizes.
pub fn set_poll_normal(
    ctx: Context<SetPoll>,
    params: SetPollNormalParams,
) -> Result<()> {
    let time_now = Clock::get()?.unix_timestamp;
    get_solana_time();
    let poll = &mut ctx.accounts.poll;

    // ═══════════════════════════════════════════════════════════
    // 0. Handle is_wrong_poll first; this operation is not restricted by poll status.
    //    Only false -> true is allowed (mark as invalid); this cannot be undone.
    // ═══════════════════════════════════════════════════════════
    if params.is_wrong_poll == Some(true) {
        poll.is_wrong_poll = true;
        msg!("Poll ID {} has been marked as invalid.", poll.poll_id);
        return Ok(()); // The client sets this separately and does not pass any other parameters.
    }

    // ═══════════════════════════════════════════════════════════
    // 1. Check for update requests other than is_wrong_poll.
    // ═══════════════════════════════════════════════════════════
    let has_other_changes = params.title.is_some()
        || params.simple_description.is_some()
        || params.detail_link.is_some()
        || params.min_level.is_some()
        || params.max_level.is_some()
        || params.max_multiple_choices.is_some();

    // If there are no other updates, return successfully.
    if !has_other_changes {
        return Ok(());
    }

    // ═══════════════════════════════════════════════════════════
    // 2. Other updates require Draft status and a start time in the future.
    // ═══════════════════════════════════════════════════════════
    if !(poll.status == Draft && poll.start_at > time_now) {
        return Err(VoteCanNotSet.into());
    }

    // ═══════════════════════════════════════════════════════════
    // 3. Validate and update the changeable parameters.
    // ═══════════════════════════════════════════════════════════

    // 3.1 Validate levels.
    let min_level_now = if let Some(ml) = params.min_level {
        ml
    } else {
        poll.min_level
    };
    let max_level_now = if let Some(ml) = params.max_level {
        ml
    } else {
        poll.max_level
    };
    // The minimum level cannot exceed the maximum, and the maximum cannot exceed 31.
    if min_level_now > max_level_now || max_level_now > 31 {
        return Err(LevelError.into());
    } else {
        poll.min_level = min_level_now;
        poll.max_level = max_level_now;
    }

    // 3.2 Validate the maximum number of choices.
    if let Some(max_choices) = params.max_multiple_choices {
        require!(
            max_choices >= 1 && max_choices <= 20,
            InvalidParameter::MultipleChoicesError
        );
        poll.max_multiple_choices = max_choices;
    }

    // ═══════════════════════════════════════════════════════════
    // 4. Update the poll's basic text fields.
    // ═══════════════════════════════════════════════════════════
    if let Some(title) = params.title {
        poll.title = string_to_u8_64(&title)?;
    }
    if let Some(simple_description) = params.simple_description {
        poll.simple_description = string_to_u8_64(&simple_description)?;
    }

    // ═══════════════════════════════════════════════════════════
    // 5. Resize dynamically when setting detail_link.
    //
    //   detail_link: Option<[u8; 64]>
    //     - None  -> 1 byte when Borsh-serialized (tag = 0)
    //     - Some  -> 65 bytes when Borsh-serialized (tag = 1 + 64 bytes of data)
    //
    //   Changing None to Some increases the serialized data by 64 bytes.
    //   If the account does not have enough space (for example, after adding multiple candidates),
    //   Anchor can overflow when writing data at the end of the instruction, causing AccountDidNotSerialize.
    //   Therefore, calculate the new required size and resize the account after the update.
    // ═══════════════════════════════════════════════════════════
    if let Some(detail_link) = params.detail_link {
        // Remember whether detail_link was None before the update to determine whether resizing is needed.
        let was_none = poll.detail_link.is_none();

        // Update the field first.
        poll.detail_link = Some(string_to_u8_64(&detail_link)?);

        // Resize only when changing None -> Some (Some -> Some does not change the size).
        if was_none {
            // Calculate the full serialized size of the updated poll plus the 8-byte discriminator.
            let required_len = ANCHOR_DISC_LEN + borsh_serialized_size(&**poll)?;
            auto_resize_account(
                &poll.to_account_info(),
                &ctx.accounts.creator.to_account_info(),
                &ctx.accounts.system_program.to_account_info(),
                required_len,
            )?;
        }
    }

    msg!("Poll ID {} updated successfully.", poll.poll_id);
    Ok(())
}