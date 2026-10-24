use crate::error::InvalidParameter;
use crate::error::{PermissionError, TxError};
use crate::state::poll::candidate::Candidate;
use crate::state::poll::create_poll::PollStatus;
use crate::state::vote::vote::Vote;
use crate::utils::u8_64_to_string;
use anchor_lang::prelude::*;

// Voting logic.
// Validate permissions, ensure the supplied choices are valid, and reject duplicate choices to prevent multiple votes for the same candidate.
// If vote_stub already exists, the transaction fails during macro processing with an account-already-exists error.
pub fn vote(
    ctx: Context<Vote>,
    employee_id: u64,
    poll_id: u64,
    choices: Vec<Pubkey>,
) -> Result<()> {
    let employee = &ctx.accounts.employee;
    let role = &ctx.accounts.role;
    let department = &ctx.accounts.department;
    let poll = &mut ctx.accounts.poll;
    let now = Clock::get()?.unix_timestamp;

    // --- 1. Check poll status and time ---
    // Rule A: closed polls cannot be interacted with.
    if poll.status == PollStatus::Closed {
        return Err(TxError::ClosedPoll.into());
    }
    // Rule B: reject invalid states (for example, a Draft poll whose start time has passed).
    if poll.status == PollStatus::Draft && now > poll.start_at {
        return Err(TxError::ErrorPoll.into());
    }
    // Rule C: strictly validate the time range.
    if now < poll.start_at || now > poll.end_at {
        return Err(TxError::TimeError.into());
    }

    // --- 2. Validate identity and permission switches ---
    // Ensure the employee is active and voting is enabled for the employee, role, and department.
    require!(employee.active, PermissionError::EmployeeNotActive);
    require!(employee.allow_vote, PermissionError::PermissionDenied);
    require!(role.allow_vote, PermissionError::RoleDenied);
    require!(department.allow_vote, PermissionError::DepartmentDenied);

    // --- 3. Validate level ---
    // Use the temporary level if set; otherwise, use the role's default level.
    let effective_level = employee.temp_level.unwrap_or(role.role_level);
    require!(
        effective_level >= poll.min_level && effective_level <= poll.max_level,
        PermissionError::LevelError
    );

    // --- 4. Validate candidates and record votes ---
    // Ensure the number of choices is within the poll's allowed range.
    require!(
        !choices.is_empty() && choices.len() <= poll.max_multiple_choices as usize,
        InvalidParameter::MultipleChoicesError
    );

    // Prevent duplicate candidates (for example, maliciously submitting [CandidateA, CandidateA] to inflate votes).
    let mut unique_choices = choices.clone();
    unique_choices.sort();
    unique_choices.dedup();
    require!(
        unique_choices.len() == choices.len(),
        InvalidParameter::DuplicateChoicesError
    );

    // Ensure the number of remaining_accounts matches the choices list.
    require!(
        ctx.remaining_accounts.len() == choices.len(),
        InvalidParameter::ShouldBeEqParameters
    );

    // Avoid lifetime errors by indexing directly instead of using .iter().
    // ctx.remaining_accounts is &[AccountInfo<'info>], so passing &ctx.remaining_accounts[index] to try_from
    // makes the compiler recognize that it inherits the Context's native 'info lifetime.
    for index in 0..choices.len() {
        let choice_pubkey = choices[index];
        let candidate_info = &ctx.remaining_accounts[index];

        // A. Ensure the account address matches the public key in the choices array.
        require_keys_eq!(
            candidate_info.key(),
            choice_pubkey,
            InvalidParameter::CandidateNotFound
        );

        // B. Ensure this candidate is included in the allowlist defined by the Poll account.
        require!(
            poll.candidates.contains(&choice_pubkey),
            InvalidParameter::CandidateNotFound
        );

        // C. Manually deserialize the Rust struct from the account's binary data, without 'info.
        // Use a block scope for the immutable borrow so data is dropped at the end of the block.
        let mut candidate_data = {
            let data = candidate_info.try_borrow_data()?;
            let mut data_slice: &[u8] = &data;
            Candidate::try_deserialize(&mut data_slice)?
        }; // data is dropped here and the immutable borrow is released.

        require_keys_eq!(
            candidate_data.poll,
            poll.key(),
            InvalidParameter::AddressMismatchError
        );

        // D. Update the vote count.
        candidate_data.candidate_count = candidate_data.candidate_count.saturating_add(1);

        // E. Manually serialize and write back the data (equivalent to .exit(), which writes the modified struct to binary memory).
        // Write the modified data to the candidate PDA account manually because Anchor does not save remaining_accounts automatically.
        // Anchor automatically writes back only static accounts explicitly declared in ctx, whose identities are known at compile time.
        // Candidate accounts are dynamic and passed through remaining_accounts as an AccountInfo array.
        // Anchor does not know the data structure stored in these accounts or whether they were modified.
        // Calling candidate_data.exit(program_id)? would perform the following:
        // 1. Serialize the modified fields, such as candidate_count, back into a byte stream.
        // 2. Overwrite the memory region referenced by candidate_info.data with that byte stream.
        // 3. Check that the current program owns the account (using program_id); otherwise, writing is not allowed.
        // Without this write, changes exist only in memory and are lost when the function returns, so votes are not recorded.
        // 4. Write back using a Vec<u8> as an intermediate buffer, then copy the data all at once.
        //    This is the most reliable method and avoids pointer position issues after advancing an &mut [u8] slice.
        let mut buf = Vec::with_capacity(candidate_info.data_len());
        candidate_data.try_serialize(&mut buf)?;

        // Take a mutable borrow and overwrite the data.
        // Write only the actual length of buf; it does not need to match the total account size.
        let mut account_data = candidate_info.try_borrow_mut_data()?;
        account_data[..buf.len()].copy_from_slice(&buf);

        msg!(
            "Employee ID {} is voting in poll ID {} for candidate {}; the candidate's current vote count is {}.",
            employee_id,
            poll_id,
            u8_64_to_string(&candidate_data.candidate_name),
            candidate_data.candidate_count
        );
    }

    // --- 5. Update poll statistics ---
    // Increment the total number of voters (a multi-choice ballot counts as one voter regardless of the number of choices).
    poll.total_votes = poll.total_votes.saturating_add(1);

    // --- 6. Write the vote stub (used to prevent repeat voting) ---
    // Because the VoteStub seeds include voter.key() and poll_id, each employee has only one stub account per poll_id.
    // If the employee has already voted, Anchor rejects this initialization before the function runs.
    let stub = &mut ctx.accounts.vote_stub;
    stub.poll_id = poll_id;
    stub.voter = ctx.accounts.voter.key();
    stub.slot = Clock::get()?.slot;
    stub.timestamp = now;
    stub.choices = choices; // Store the original choices, which have already passed duplicate validation.
    stub.bump = ctx.bumps.vote_stub;

    msg!(
        "Employee ID {} successfully voted in poll ID {}; vote stub address: {}.",
        employee_id,
        poll_id,
        ctx.accounts.vote_stub.key()
    );

    Ok(())
}
