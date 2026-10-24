use crate::error::InvalidParameter;
use crate::state::organizations::employee::CreateEmployee;
use crate::utils::u8_64_to_string;
use anchor_lang::prelude::*;

// Creates an employee from their public key and primary role address, then increments the role and department member counts.
pub fn create_employee(
    ctx: Context<CreateEmployee>,
    employee_pubkey: Pubkey,
    employee_name: [u8; 64],
) -> Result<()> {
    // 1. Basic validation: ensure the supplied employee name is valid.
    require!(employee_name != [0u8; 64], InvalidParameter::CanNotBeEmpty);

    let employee_config = &mut ctx.accounts.employee_config;
    let assigned_id = employee_config.global_employee_id;

    let employee = &mut ctx.accounts.employee;
    let main_role = &mut ctx.accounts.employee_main_role;
    let department = &mut ctx.accounts.department; // Added.

    // 2. Populate employee data.
    employee.employee_id = assigned_id;
    employee.name = employee_name;
    employee.owner = employee_pubkey;
    employee.active = true;
    employee.allow_vote = true;
    employee.allow_create_poll = true;
    employee.main_role_key = main_role.key();
    employee.bump = ctx.bumps.employee;

    // 3. Increment the counter.
    employee_config.global_employee_id += 1;

    // 4. Increment the role member count.
    main_role.members += 1;

    // 5. Increment the department member count.
    department.members += 1;

    // 6. Log the operation.
    msg!(
        "Employee created successfully! Name: {}, ID: {}, wallet: {}, role: {}, department: {}, department members: {}.",
        u8_64_to_string(&employee_name),
        assigned_id,
        employee_pubkey,
        u8_64_to_string(&main_role.role_name),
        u8_64_to_string(&main_role.department_name),
        department.members
    );

    Ok(())
}
