use crate::constants::ADMIN_PUBKEY;
use crate::constants::ROLE_SEED_PREFIX;
use crate::constants::SEED_VERSION;
use crate::error::PermissionError::NotAdmin;
use crate::state::organizations::role::Role;
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(role_name: [u8;64],department_name: [u8;64])] // Names are still required to derive the seeds.
pub struct UpdateRole<'info> {
    #[account(mut,constraint = admin.key() == ADMIN_PUBKEY @ NotAdmin)]
    pub admin: Signer<'info>,
    #[account(mut,seeds = [ROLE_SEED_PREFIX,SEED_VERSION,&role_name[..32],&department_name[..32]],bump = role.bump)]
    pub role: Account<'info, Role>,
    pub system_program: Program<'info, System>,
}
#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct UpdateRoleParams {
    pub role_level: Option<u8>, // Some(value) updates the field; None skips it.
    pub allow_create_poll: Option<bool>,
    pub allow_vote: Option<bool>,
}
