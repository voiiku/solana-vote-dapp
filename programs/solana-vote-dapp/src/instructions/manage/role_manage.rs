use crate::error::InvalidParameter::LevelError;
use crate::state::manage::role_manage::{UpdateRole, UpdateRoleParams};
use crate::utils::u8_64_to_string;
use anchor_lang::prelude::*;

// Use UpdateRoleParams to pass all update values at once instead of defining a separate update method for each setting.
pub fn update_role(
    ctx: Context<UpdateRole>,
    role_name: [u8; 64],
    department_name: [u8; 64],
    params: UpdateRoleParams,
) -> anchor_lang::Result<()> {
    let role = &mut ctx.accounts.role;

    // Apply updates consistently.
    if let Some(val) = params.role_level {
        // Role level must be between 0 and 31.
        if val > 31 {
            return Err(LevelError.into());
        }
        role.role_level = val;
    }
    if let Some(val) = params.allow_create_poll {
        role.allow_create_poll = val;
    }

    if let Some(val) = params.allow_vote {
        role.allow_vote = val;
    }
    msg!(
        "Configuration updated successfully for department {} role {}.",
        u8_64_to_string(&department_name),
        u8_64_to_string(&role_name)
    );
    Ok(())
}
