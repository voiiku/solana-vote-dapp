/**
 * utils.ts — General utility functions
 *
 * Provides encoding and decoding helpers for data shared between Solana and
 * the frontend.
 *
 * On-chain string fields are stored as fixed-length [u8; 64] byte arrays,
 * while the frontend uses JavaScript strings. These helpers convert between
 * the two representations.
 *
 * Similarly, u64 values used as PDA seeds must be converted to 8-byte
 * little-endian arrays.
 */
// ============================================================
// 1. Convert between strings and [u8; 64]
// ============================================================

/**
 * Convert a JavaScript string to a 64-byte number array.
 *
 * In the Rust program, all name fields (department, role, employee, etc.)
 * use [u8; 64], a fixed-length 64-byte array. Shorter values are zero-padded.
 *
 * Strings are UTF-8 encoded. A Chinese character takes 3 bytes and an
 * English character takes 1 byte. For example, "Engineering" uses 11 bytes
 * and the remaining 53 bytes are zero-padded.
 *
 * @param str - String to convert
 * @returns A 64-element number array that can be passed to the Anchor program
 *
 * @example
 * strToBytes64("Engineering")
 * // => UTF-8 bytes padded with zeros to 64 elements
 */
export function strToBytes64(str: string): number[] {
  // 1. Encode the string as UTF-8 bytes
  const bytes = Buffer.from(str, "utf-8");

  // 2. Create an array of 64 zeros
  const result = new Array(64).fill(0);

  // 3. Copy the encoded bytes into the result (up to 64 bytes; excess is truncated)
  for (let i = 0; i < Math.min(64, bytes.length); i++) {
    result[i] = bytes[i];
  }

  return result;
}

/**
 * Convert a 64-byte number array back to a JavaScript string.
 *
 * When reading account data, name fields use [u8; 64] and need to be decoded
 * into readable strings with this function.
 *
 * Find the first zero byte (the start of padding), keep the preceding bytes,
 * and decode them as UTF-8.
 *
 * @param bytes - 64-byte number array from on-chain account data
 * @returns Decoded string
 *
 * @example
 * bytes64ToStr([69, 110, 103, 105, 110, 101, 101, 114, 105, 110, 103, 0, ...])
 * // => "Engineering"
 */
export function bytes64ToStr(bytes: number[]): string {
  // Find the first zero byte (end of valid data)
  const end = bytes.indexOf(0);

  // Use all 64 bytes if no zero is found; otherwise, use the bytes before it
  const validBytes = bytes.slice(0, end === -1 ? 64 : end);

  // Convert the byte array to a UTF-8 string
  return Buffer.from(validBytes).toString("utf-8");
}

// ============================================================
// 2. Convert u64 to a little-endian byte array
// ============================================================

/**
 * Convert a u64 value to an 8-byte little-endian Uint8Array.
 *
 * When deriving a PDA with numeric seeds (such as employee_id or poll_id),
 * Rust uses `u64.to_le_bytes()` to encode the value. The frontend must use
 * the same encoding to derive the same address.
 *
 * Little-endian stores the least significant byte first. For example, 1 is
 * [1, 0, 0, 0, 0, 0, 0, 0] in little-endian and
 * [0, 0, 0, 0, 0, 0, 0, 1] in big-endian.
 *
 * @param num - Number to convert; supports number and bigint
 * @returns An 8-byte little-endian Uint8Array
 *
 * @example
 * u64ToLeBytes(0)   // => Uint8Array [0, 0, 0, 0, 0, 0, 0, 0]
 * u64ToLeBytes(1)   // => Uint8Array [1, 0, 0, 0, 0, 0, 0, 0]
 * u64ToLeBytes(256) // => Uint8Array [0, 1, 0, 0, 0, 0, 0, 0]
 */
export function u64ToLeBytes(num: bigint | number): Uint8Array {
  const bigVal = BigInt(num);
  const buf = Buffer.alloc(8);
  for (let i = 0; i < 8; i++) {
    buf[i] = Number((bigVal >> BigInt(i * 8)) & BigInt(0xff));
  }
  return buf;
}

// ============================================================
// 3. BN (big number) helpers
// ============================================================

/**
 * Safely convert an Anchor BN (big number) to a JavaScript number.
 *
 * Anchor returns a BN (bn.js) object when deserializing u64 values, rather
 * than a native JavaScript number. Convert it before displaying in the UI.
 *
 * JavaScript numbers are safe only up to 2^53 - 1, while u64 supports up to
 * 2^64 - 1. Small values such as poll IDs are safe, but use bigint or strings
 * for potentially large values such as token amounts.
 *
 * @param bn - BN object returned by Anchor (usually has a toNumber() method)
 * @returns JavaScript number
 */
export function bnToNumber(bn: { toNumber: () => number }): number {
  return bn.toNumber();
}

/**
 * Safely convert an Anchor BN to bigint.
 *
 * Use this when the value may exceed Number.MAX_SAFE_INTEGER.
 *
 * @param bn - BN object returned by Anchor
 * @returns JavaScript bigint
 */
export function bnToBigInt(bn: { toString: () => string }): bigint {
  return BigInt(bn.toString());
}

// ============================================================
// 4. Timestamp helpers
// ============================================================

/**
 * Convert a Unix timestamp in seconds to a local date/time string.
 *
 * Solana uses Unix timestamps in seconds (i64). JavaScript Date uses
 * milliseconds, so multiply by 1000.
 *
 * @param timestamp - Unix timestamp in seconds from an on-chain i64
 * @returns Localized date/time string
 *
 * @example
 * timestampToLocal(1710000000) // => "2024/3/9 ..."
 */
export function timestampToLocal(timestamp: number): string {
  // Unix timestamps use seconds; JavaScript Date requires milliseconds.
  return new Date(timestamp * 1000).toLocaleString("en-US");
}

/**
 * Get the current Unix timestamp in seconds.
 *
 * Used as a reference for default start_at / end_at values when creating a poll.
 *
 * @returns Current Unix timestamp in seconds
 */
export function nowTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

// ============================================================
// 5. Poll status enum mapping
// ============================================================

/**
 * Anchor deserializes the on-chain PollStatus enum as an object such as
 * { draft: {} }, { ready: {} }, or { closed: {} }.
 *
 * Convert it to a frontend-friendly string.
 *
 * @param status - PollStatus object deserialized by Anchor
 * @returns "draft" | "ready" | "closed" | "unknown"
 *
 * @example
 * parsePollStatus({ draft: {} })  // => "draft"
 * parsePollStatus({ ready: {} })  // => "ready"
 */
export function parsePollStatus(
  status: Record<string, unknown>
): "draft" | "ready" | "closed" | "unknown" {
  // Anchor deserializes Rust enums as { variantName: {} }; inspect the key
  // to determine the current variant.
  if ("draft" in status) return "draft";
  if ("ready" in status) return "ready";
  if ("closed" in status) return "closed";
  return "unknown";
}

/**
 * Determine whether a poll is currently active.
 *
 * A poll is active when all of the following are true:
 * 1. Its status is Ready.
 * 2. The current time is between start_at and end_at.
 * 3. It is not marked as invalid (is_wrong_poll is false).
 *
 * This matches the Rust validation: a poll is valid only when its status is
 * Ready and its time window is active.
 *
 * @param status - Poll status object
 * @param startAt - Start timestamp in seconds
 * @param endAt - End timestamp in seconds
 * @param isWrongPoll - Whether the poll is marked as invalid
 * @returns Whether the poll is active
 */
export function isPollActive(
  status: Record<string, unknown>,
  startAt: number,
  endAt: number,
  isWrongPoll: boolean
): boolean {
  const now = nowTimestamp();
  return (
    parsePollStatus(status) === "ready" &&
    now >= startAt &&
    now <= endAt &&
    !isWrongPoll
  );
}


import { Connection, SYSVAR_CLOCK_PUBKEY } from "@solana/web3.js";

/**
 * Fetch the current timestamp in seconds from Solana.
 *
 * Solana programs use the Clock sysvar's unix_timestamp for time checks.
 * On localnet, it may differ from the system clock. Use on-chain time rather
 * than Date.now() so expiration checks match the program.
 *
 * Read the Clock sysvar account data and parse unix_timestamp. Its Rust
 * memory layout is:
 *   slot:                   u64 (8 bytes, offset 0)
 *   epoch_start_timestamp:  i64 (8 bytes, offset 8)
 *   epoch:                  u64 (8 bytes, offset 16)
 *   leader_schedule_epoch:  u64 (8 bytes, offset 24)
 *   unix_timestamp:         i64 (8 bytes, offset 32) ← required field
 *
 * @param connection - Solana RPC connection
 * @returns On-chain Unix timestamp in seconds; falls back to Date.now() on failure
 */
// ============================================================
// Fetch on-chain time
// ============================================================

/**
 * Get the current on-chain Unix timestamp in seconds.
 *
 * Fetches the block time for the latest slot. The localnet clock may differ
 * from the system clock (often running a few minutes ahead), so use this
 * function instead of Date.now() when comparing against Clock::get().
 *
 * Falls back to system time if fetching fails, such as when the node is unresponsive.
 */
export async function getChainTimestamp(
  connection: Connection,
): Promise<number> {
  try {
    const slot = await connection.getSlot();
    const blockTime = await connection.getBlockTime(slot);
    if (blockTime != null) return blockTime;
  } catch (e) {
    console.warn("[getChainTimestamp] Failed to fetch on-chain time; falling back to system time:", e);
  }
  // Fallback: use system time
  return Math.floor(Date.now() / 1000);
}