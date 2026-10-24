use crate::error::{InvalidParameter, PermissionError};
use crate::state::organizations::role::CreateRole;
use crate::utils::u8_64_to_string;
use anchor_lang::prelude::*;
// Receives the role name, u8 role level, and department; derives the corresponding PDA and creates the role.
pub fn create_role(
    ctx: Context<CreateRole>,
    role_name: [u8; 64],
    role_level: u8,
    department_name: [u8; 64],
) -> Result<()> {
    // 1. Verify the value is not empty (all-zero check).
    require!(role_name != [0u8; 64], InvalidParameter::CanNotBeEmpty);

    // 2. Verify that the supplied role level is valid (0-31).
    require!(role_level <= 31, PermissionError::LevelError);

    // 3. Get the account reference.
    let role = &mut ctx.accounts.role;

    // 4. Populate the data (use the 64-byte array directly without truncation or conversion).
    role.role_name = role_name;
    role.role_level = role_level;
    role.members = 0;
    role.allow_create_poll = true;
    role.allow_vote = true;

    // Record the department name for on-chain display or later derivation.
    role.department_name = department_name;
    role.bump = ctx.bumps.role;

    // 5. Log details for developers.
    msg!(
        "Role created successfully: {}, level: {}, department: {}.",
        u8_64_to_string(&role_name),
        role_level,
        u8_64_to_string(&department_name)
    );

    Ok(())
}
