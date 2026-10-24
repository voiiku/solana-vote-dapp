use crate::state::manage::department_manage::{UpdateDepartment, UpdateDepartmentParams};
use crate::utils::u8_64_to_string;
use anchor_lang::context::Context;
use anchor_lang::prelude::*;

// The client derives the department PDA from its name and passes it to this function to update department information.
// Use UpdateDepartmentParams to pass all update values at once instead of defining a separate method for each setting.
pub fn update_department(
    ctx: Context<UpdateDepartment>,
    department_name: [u8; 64],
    params: UpdateDepartmentParams,
) -> Result<()> {
    let dept = &mut ctx.accounts.department;

    // Apply updates consistently.
    if let Some(val) = params.allow_create_poll {
        dept.allow_create_poll = val;
    }

    if let Some(val) = params.allow_vote {
        dept.allow_vote = val;
    }

    msg!("Configuration updated successfully for department {}.", u8_64_to_string(&department_name));
    Ok(())
}
