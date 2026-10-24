use std::time::SystemTime;
// This module defines basic utilities.
// Convert between names and [u8; 32] arrays.
use crate::error::InvalidParameter::{NameTooLong, StringTooLong};
use anchor_lang::prelude::program::invoke;
use anchor_lang::prelude::*;

pub fn borsh_serialized_size<T: AnchorSerialize>(value: &T) -> Result<usize> {
    let mut data = Vec::new();
    value.serialize(&mut data)?;
    Ok(data.len())
}

/// Converts a String to the [u8; 32] array stored by a PDA.
/// Also validates the parameter length to prevent names from being too long.
pub fn string_to_u8_32(input: &String) -> Result<[u8; 32]> {
    // 1. Validate the length.
    let bytes = if input.as_bytes().len() <= 32 {
        input.as_bytes()
    } else {
        return Err(NameTooLong.into());
    };
    // 2. Pad the data.
    let mut fixed_array = [0u8; 32];
    fixed_array[..bytes.len()].copy_from_slice(bytes);

    Ok(fixed_array)
}

/// Converts a [u8; 32] array to a printable String.
/// Automatically removes trailing null bytes (\0).
pub fn u8_32_to_string(input: &[u8; 32]) -> String {
    // Find the first 0; use the full length if none is found.
    let end = input.iter().position(|&x| x == 0).unwrap_or(32);
    // Use lossy conversion for safety and convert Cow to String.
    String::from_utf8_lossy(&input[..end]).into_owned()
}
/// Converts a u64 to a fixed-length 8-byte array (little-endian).
/// Used to derive PDA seeds.
pub fn u64_to_u8_8(value: u64) -> [u8; 8] {
    value.to_le_bytes()
}

/// Converts an 8-byte array back to a u64.
/// Commonly used to read numbers from raw account data.
pub fn u8_8_to_u64(bytes: [u8; 8]) -> u64 {
    u64::from_le_bytes(bytes)
}
/// Converts a [u8; 64] array to a String.
/// Automatically strips trailing null bytes (\0); commonly used to display data read from an on-chain account.
pub fn u8_64_to_string(bytes: &[u8; 64]) -> String {
    // Find the first \0; use the full string if none is found.
    let end = bytes.iter().position(|&b| b == 0).unwrap_or(64);
    String::from_utf8_lossy(&bytes[..end]).into_owned()
}

/// Converts a String to a [u8; 64] array.
/// If the string exceeds 64 bytes, return an error and roll back (fail-fast principle).
pub fn string_to_u8_64(input: &String) -> Result<[u8; 64]> {
    let bytes = input.as_bytes();

    // Strictly validate the length to prevent silent truncation.
    if bytes.len() > 64 {
        return Err(error!(StringTooLong));
    }

    let mut fixed_array = [0u8; 64];
    // Copy the input into the start of the array and leave the rest as 0.
    fixed_array[..bytes.len()].copy_from_slice(bytes);

    Ok(fixed_array)
}

/// Automatically expands a PDA account and pays any additional rent.
/// Utility function specifically for dynamically resizing PDA accounts.
pub fn auto_resize_account<'info>(
    target_account: &AccountInfo<'info>, // Target account to expand.
    payer: &AccountInfo<'info>,          // Account paying the rent difference (must be a Signer).
    system_program: &AccountInfo<'info>, // System program reference (for the transfer).
    new_len: usize,                      // Target size in bytes.
) -> Result<()> {
    // 1. Get the account's current allocated size.
    let current_len = target_account.data_len();

    // 2. If the new size is not larger, return without wasting compute resources.
    if new_len <= current_len {
        return Ok(());
    }
    // 3. Calculate the minimum SOL balance (lamports) required to remain rent-exempt at the new size.
    let rent = Rent::get()?; // Get the current rent schedule; rent may change.
    let new_minimum_balance = rent.minimum_balance(new_len); // Minimum rent for the new account size.

    // 4. Get the account's current SOL balance.
    let current_lamports = target_account.lamports();

    // 5. Pay any rent shortfall.
    if current_lamports < new_minimum_balance {
        // Calculate the difference between the current and required balances.
        let lamports_diff = new_minimum_balance.saturating_sub(current_lamports);

        // Invoke the system program transfer instruction to transfer lamports from the payer to the target account.
        // This must happen before or during resize; otherwise, the system may reject the account for insufficient rent.
        invoke(
            &system_instruction::transfer(payer.key, target_account.key, lamports_diff),
            &[
                payer.clone(),
                target_account.clone(),
                system_program.clone(),
            ],
        )?;
    }

    // 6. Resize the allocated space.
    // As defined, resize accepts only one new_len parameter.
    // On success, the account's on-chain storage is expanded to new_len bytes.
    target_account.resize(new_len)?;

    Ok(())
}

/// Automatically shrinks a PDA account and refunds rent.
pub fn shrink_account_and_refund<'info>(
    target_account: &AccountInfo<'info>, // Target PDA account.
    recipient: &AccountInfo<'info>,      // Account receiving the refund (such as the creator).
    new_len: usize,                      // Target size in bytes after shrinking.
) -> Result<()> {
    let current_len = target_account.data_len();

    // 1. Safety check: do not shrink if the target size is not smaller than the current size.
    if new_len >= current_len {
        return Ok(());
    }

    // 2. Calculate the minimum rent-exempt balance for the new account size.
    let rent = Rent::get()?;
    let new_minimum_balance = rent.minimum_balance(new_len);
    let current_lamports = target_account.lamports();

    // 3. Calculate and refund excess rent (lamports).
    if current_lamports > new_minimum_balance {
        let refund_amount = current_lamports.saturating_sub(new_minimum_balance);

        // Update the underlying u64 value through the Rc<RefCell<...>> wrapper.
        // target_account.lamports() returns Rc<RefCell<&'a mut u64>>.
        **target_account.lamports.borrow_mut() -= refund_amount;
        **recipient.lamports.borrow_mut() += refund_amount;
    }

    // 4. Resize the allocated space.
    // resize is an AccountInfo method and can be called directly.
    target_account.resize(new_len)?;

    Ok(())
}

/// For debugging: gets the current on-chain time and host UTC time.
pub fn get_solana_time()  {
    let time = Clock::get().unwrap().unix_timestamp;
    msg!("Debug: current Solana time is {}", time);
}
