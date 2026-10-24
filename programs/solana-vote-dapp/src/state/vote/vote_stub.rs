use anchor_lang::prelude::*;

#[account]
pub struct VoteStub {
    pub poll_id: u64,         // ID of the associated poll.
    pub voter: Pubkey,        // Voter's public key (optional; useful for auditing who voted).
    pub slot: u64,            // Slot when the vote was cast.
    pub timestamp: i64,       // Time when the vote was cast.
    pub choices: Vec<Pubkey>, // Selected candidates, up to 20.
    pub bump: u8,
}
impl VoteStub {
    // Maximum current storage size of the vote stub, in bytes.
    // Discriminator + u64 + 32-byte Pubkey + u64 + i64 + (4-byte on-chain Vec header + up to 20 x 32-byte entries) + u8.
    pub const MAX_SIZE: usize = 8 + 8 + 32 + 8 + 8 + (4 + 32 * 20) + 1;
}