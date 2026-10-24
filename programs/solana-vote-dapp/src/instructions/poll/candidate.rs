use crate::error::{InvalidParameter, PDAError};
use crate::state::poll::candidate::CreateCandidate;
use crate::utils::u8_64_to_string;
use anchor_lang::prelude::*;

// Of all the poll Vecs, only candidates require on-chain accounts, created by the poll creator.
pub fn create_candidate(
    ctx: Context<CreateCandidate>,
    poll_id: u64,
    name: [u8; 64],
    pointer: Option<Pubkey>,
) -> Result<()> {
    let candidate = &mut ctx.accounts.candidate;

    // 1. Initialize the basic fields.
    candidate.candidate_name = name;
    candidate.poll = ctx.accounts.poll.key();
    candidate.candidate_count = 0;
    candidate.bump = ctx.bumps.candidate;

    // 2. Validate the pointer if supplied.
    if let Some(target_pubkey) = pointer {
        // Try to get the first account from remaining_accounts.
        if let Some(pointer_acc_info) = ctx.remaining_accounts.get(0) {
            // A. Ensure the supplied account address matches the address declared by pointer.
            require_keys_eq!(
                pointer_acc_info.key(),
                target_pubkey,
                InvalidParameter::AddressMismatchError
            );
            // B. Ensure the account actually exists on-chain (has data).
            require!(!pointer_acc_info.data_is_empty(), PDAError::PDANotExist);

            candidate.pointer = Some(target_pubkey);
        } else {
            // If pointer is set but its corresponding AccountInfo is missing, return an error to prevent a false declaration.
            return Err(InvalidParameter::CanNotBeEmpty.into());
        }
    } else {
        // If pointer is None, store None directly.
        candidate.pointer = None;
    }
    msg!(
        "Candidate created successfully for poll ID {}: < {} >.",
        poll_id,
        u8_64_to_string(&name)
    );
    Ok(())
}
