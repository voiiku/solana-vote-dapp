use crate::constants::{DEPARTMENT_SEED_PREFIX, ROLE_SEED_PREFIX, SEED_VERSION};
use crate::error::InvalidParameter::{AddressMismatchError, LevelError};
use crate::state::manage::employee_manage::{UpdateEmployee, UpdateEmployeeParams};
use crate::utils::{u8_64_to_string};
use anchor_lang::prelude::*;
use std::ops::{Add, Sub};

// Update employee information.
pub fn update_employee(
    ctx: Context<UpdateEmployee>,
    employee_id: u64,
    params: UpdateEmployeeParams,
) -> Result<()> {
    let employee = &mut ctx.accounts.employee;

    // --- 1. Update basic fields ---
    if let Some(val) = params.owner {
        employee.owner = val;
    }
    if let Some(val) = params.name {
        employee.name = val;
    }
    if let Some(val) = params.active {
        employee.active = val;
    }
    if let Some(val) = params.allow_create_poll {
        employee.allow_create_poll = val;
    }
    if let Some(val) = params.allow_vote {
        employee.allow_vote = val;
    }
    if let Some(val) = params.temp_level {
        if val > 31 {
            return Err(LevelError.into());
        }
        employee.temp_level = Some(val);
    }

    // --- 2. Validate the role transfer ---
    if let (Some(old_role_acc), Some(new_role_acc), Some(new_role_key)) = (
        &mut ctx.accounts.old_role,
        &mut ctx.accounts.new_role,
        params.main_role_key,
    ) {
        // Check 1: the old role account matches the employee's current role.
        require_keys_eq!(
            old_role_acc.key(),
            employee.main_role_key,
            AddressMismatchError
        );

        // Check 2: the new role account address matches the key supplied in the parameters.
        require_keys_eq!(new_role_acc.key(), new_role_key, AddressMismatchError);

        // Check 3: verify that the new_role account is a valid PDA.
        let seeds = [
            ROLE_SEED_PREFIX,
            SEED_VERSION,
            &new_role_acc.role_name,
            &new_role_acc.department_name,
        ];
        let (expected_pda, _bump) = Pubkey::find_program_address(&seeds, ctx.program_id);
        require_keys_eq!(new_role_acc.key(), expected_pda, AddressMismatchError);

        // --- 3. Perform the transfer and update role member counts ---
        old_role_acc.members = old_role_acc.members.sub(1);
        employee.main_role_key = new_role_key;
        new_role_acc.members = new_role_acc.members.add(1);

        // --- 4. For transfers across departments, update department member counts ---
        // Compare the old and new roles' department_name values to determine whether this is a cross-department transfer.
        if old_role_acc.department_name != new_role_acc.department_name {
            // Cross-department transfer: old_department and new_department accounts are required.
            let old_dept = ctx.accounts.old_department.as_mut()
                .ok_or_else(|| error!(AddressMismatchError))?;
            let new_dept = ctx.accounts.new_department.as_mut()
                .ok_or_else(|| error!(AddressMismatchError))?;

            // Verify that the old department PDA is valid (to prevent an incorrect department account from being supplied).
            let old_dept_seeds = [
                DEPARTMENT_SEED_PREFIX,
                SEED_VERSION,
                &old_role_acc.department_name[..32],
            ];
            let (expected_old_dept, _) =
                Pubkey::find_program_address(&old_dept_seeds, ctx.program_id);
            require_keys_eq!(old_dept.key(), expected_old_dept, AddressMismatchError);

            // Verify that the new department PDA is valid.
            let new_dept_seeds = [
                DEPARTMENT_SEED_PREFIX,
                SEED_VERSION,
                &new_role_acc.department_name[..32],
            ];
            let (expected_new_dept, _) =
                Pubkey::find_program_address(&new_dept_seeds, ctx.program_id);
            require_keys_eq!(new_dept.key(), expected_new_dept, AddressMismatchError);

            // Update department member counts.
            old_dept.members = old_dept.members.sub(1);
            new_dept.members = new_dept.members.add(1);

            msg!(
                "Employee ID {} transferred across departments: {} ({}) -> {} ({}).",
                employee_id,
                u8_64_to_string(&old_role_acc.role_name),
                u8_64_to_string(&old_role_acc.department_name),
                u8_64_to_string(&new_role_acc.role_name),
                u8_64_to_string(&new_role_acc.department_name)
            );
        } else {
            msg!(
                "Employee ID {} transferred within the same department: {} -> {}.",
                employee_id,
                u8_64_to_string(&old_role_acc.role_name),
                u8_64_to_string(&new_role_acc.role_name)
            );
        }

        return Ok(());
    } else {
        msg!("Employee ID {} updated; role unchanged.", employee_id);
    }

    Ok(())
}
