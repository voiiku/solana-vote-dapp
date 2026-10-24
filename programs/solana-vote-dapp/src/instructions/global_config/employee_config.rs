use crate::state::global_config::employee_config::InitEmployeeConfig;
use anchor_lang::prelude::*;

// Initializes the global employee settings PDA, currently containing only an immutable ID counter.
pub fn init_employee_config(ctx: Context<InitEmployeeConfig>) -> Result<()> {
    let employee_config = &mut ctx.accounts.employee_config;
    employee_config.global_employee_id = 0; // Employee IDs start at 0; otherwise, creation would require incrementing before and after use.
    employee_config.bump = ctx.bumps.employee_config;
    msg!("Global employee settings (employee_config) initialized at: {}.", ctx.accounts.employee_config.key());
    Ok(())
}
