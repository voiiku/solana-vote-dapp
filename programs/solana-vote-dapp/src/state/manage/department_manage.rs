use crate::constants::{ADMIN_PUBKEY, DEPARTMENT_SEED_PREFIX, SEED_VERSION};
use crate::error::PermissionError::NotAdmin;
use crate::state::organizations::department::Department;
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(department_name: [u8;64])] // The name is still required to derive the seeds.
pub struct UpdateDepartment<'info> {
    #[account(mut,constraint = admin.key() == ADMIN_PUBKEY @ NotAdmin)]
    pub admin: Signer<'info>,
    #[account(
        mut,seeds = [DEPARTMENT_SEED_PREFIX,SEED_VERSION,&department_name[..32]],bump = department.bump
    )]
    pub department: Account<'info, Department>,
    // Updating an existing account usually does not require SystemProgram unless additional rent must be paid.
}
#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct UpdateDepartmentParams {
    pub allow_create_poll: Option<bool>, // Some(value) updates the field; None skips it.
    pub allow_vote: Option<bool>,
    // Add future parameters (such as a department manager or member limit) here.
}
