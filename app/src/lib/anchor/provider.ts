/**
 * provider.ts — Anchor Provider factory
 *
 * AnchorProvider is the bridge between the Anchor framework and Solana,
 * wrapping three components:
 *
 * 1. Connection — network connection to a Solana node (RPC)
 *    Like a database connection string, it tells the program where to read and write data.
 *
 * 2. Wallet — user's wallet (signer), used to sign transactions
 *    Like a user's identity card and signature, it proves they initiated the action.
 *
 * 3. opts — transaction confirmation options, such as commitment level
 *    Like choosing whether an email needs a read receipt.
 *
 * In the browser, Wallet comes from a wallet adapter such as Phantom, and
 * Connection comes from the RPC URL configured in environment variables.
 * This factory assembles them into the Provider object Anchor requires.
 *
 * After a user connects a wallet, create an AnchorProvider and use it to
 * create a Program instance and invoke on-chain instructions.
 */

import { AnchorProvider } from "@anchor-lang/core";
import { Connection, type ConnectionConfig } from "@solana/web3.js";
import type { AnchorWallet } from "@solana/wallet-adapter-react";

// ============================================================
// 1. Create a Solana Connection
// ============================================================

/**
 * Create a connection to a Solana node.
 *
 * Connection is the foundation for all on-chain operations:
 * - Query account data (read)
 * - Send transactions (write)
 * - Subscribe to account changes (WebSocket)
 *
 * Solana offers several commitment levels:
 * - "processed": processed by a node but may be rolled back (fastest, least secure)
 * - "confirmed": confirmed by a supermajority of validators (recommended balance)
 * - "finalized": finalized and irreversible (slowest, most secure)
 *
 * Use "confirmed" to balance speed and security for the voting DApp.
 *
 * @returns A Connection instance
 */
export function createConnection(): Connection {
  // Get the RPC URL from the environment (configured in .env.local)
  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL!;

  // Connection configuration
  const config: ConnectionConfig = {
    commitment: "confirmed", // Commitment level

    // WebSocket URL for live subscriptions, such as account change notifications
    // Surfpool's local WebSocket uses port 8900 by default
    wsEndpoint: process.env.NEXT_PUBLIC_WS_URL || undefined,
  };

  return new Connection(rpcUrl, config);
}

// ============================================================
// 2. Create an AnchorProvider
// ============================================================

/**
 * Create an AnchorProvider from a wallet adapter.
 *
 * @param wallet - Wallet object from the useAnchorWallet() hook.
 *   AnchorWallet requires signTransaction and signAllTransactions, which
 *   wallets such as Phantom and Solflare implement.
 *
 * @param connection - Optional existing Connection; one is created if omitted
 *
 * @returns An AnchorProvider instance
 *
 * Usage:
 * ```tsx
 * const wallet = useAnchorWallet();
 * const { connection } = useConnection();
 * if (wallet) {
 *   const provider = createAnchorProvider(wallet, connection);
 *   // Create a Program instance with the provider...
 * }
 * ```
 */
export function createAnchorProvider(
  wallet: AnchorWallet,
  connection?: Connection
): AnchorProvider {
  // Create a connection if none was provided
  const conn = connection ?? createConnection();

  // Create the AnchorProvider. The third argument is ConfirmOptions,
  // which controls transaction confirmation behavior.
  return new AnchorProvider(conn, wallet, {
    // preflightCommitment: commitment level for preflight checks before sending
    // "confirmed" waits for preflight confirmation before sending.
    preflightCommitment: "confirmed",

    // commitment: final transaction confirmation level
    commitment: "confirmed",
  });
}