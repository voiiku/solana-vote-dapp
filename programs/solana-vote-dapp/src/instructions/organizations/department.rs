use crate::error::InvalidParameter;
use crate::state::organizations::department::CreateDepartment;
use crate::utils::u8_64_to_string;
use anchor_lang::prelude::*;

// Receives a department name, derives the corresponding PDA, and creates the department.
// The client derives the PDA because Solana must lock the supplied accounts before a transaction;
// the program cannot independently derive an address and find the account.
// Solana must know all account addresses involved in a transaction before executing the program to enable parallel processing.
pub fn create_department(ctx: Context<CreateDepartment>, department_name: [u8; 64]) -> Result<()> {
    // 1. Ensure the name is not all zeros (empty-content check).
    // Use the defined InvalidParameter::CanNotBeEmpty error code.
    require!(
        department_name != [0u8; 64],
        InvalidParameter::CanNotBeEmpty
    );

    // 2. Get the account reference.
    let department = &mut ctx.accounts.department;

    // 3. Populate the data.
    // Write the entire 64-byte array directly; string_to_u8_32 is no longer needed.
    department.department_name = department_name;
    department.members = 0; // Member count starts at 0.
    department.allow_create_poll = true; // Poll creation is allowed by default.
    department.allow_vote = true; // Voting is allowed by default.
    department.bump = ctx.bumps.department; // Store the bump used at creation for later derivation.

    // 4. Log the operation.
    msg!("Department created successfully: {}, department PDA address: {}.", u8_64_to_string(&department_name),ctx.accounts.department.key());
    Ok(())
}
