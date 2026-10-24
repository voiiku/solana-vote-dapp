use crate::error::PermissionError;
use crate::constants::CANDIDATE_SEED_PREFIX;
use crate::constants::POLL_SEED_PREFIX;
use crate::constants::SEED_VERSION;
use crate::state::poll::create_poll::{Poll, PollStatus};
use crate::utils::u64_to_u8_8;
use anchor_lang::prelude::*;
#[account]
#[derive(InitSpace)]
pub struct Candidate {
    pub poll: Pubkey,             // Public key of the associated poll.
    pub candidate_name: [u8; 64], // Candidate name (supports longer descriptions).
    pub candidate_count: u64,     // Current vote count.
    pub bump: u8,
    pub pointer: Option<Pubkey>,  // On-chain entity pointer (such as an employee PDA), used to enable execution.
}
#[derive(Accounts)]
#[instruction(poll_id: u64, name: [u8;64])] // Parameter names and types must match fn create_candidate.
pub struct CreateCandidate<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        mut,
        seeds = [POLL_SEED_PREFIX, SEED_VERSION, &u64_to_u8_8(poll_id)],
        bump = poll.bump,
        has_one = creator @ PermissionError::PermissionDenied,
        constraint = poll.status == PollStatus::Draft
    )]
    pub poll: Account<'info, Poll>,

    #[account(
        init,
        payer = creator,
        space = 8 + Candidate::INIT_SPACE,
        seeds = [
            CANDIDATE_SEED_PREFIX,
            SEED_VERSION,
            &u64_to_u8_8(poll_id),
            &name[..32]
        ],
        bump
    )]
    pub candidate: Account<'info, Candidate>,

    pub system_program: Program<'info, System>,
}