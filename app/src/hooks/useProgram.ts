/**
 * useProgram.ts — Hook for accessing the Anchor Program instance
 */

import { useMemo } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { AnchorProvider, Program } from "@anchor-lang/core";
import type { SolanaVoteDapp } from "@/idl/solana_vote_dapp";
import idl from "@/idl/solana_vote_dapp.json";

/**
 * Create an Anchor Provider
 *
 * @returns An AnchorProvider instance, or null if the wallet is disconnected
 */
export function useAnchorProvider(): AnchorProvider | null {
  const { connection } = useConnection();
  const wallet = useWallet();

  const provider = useMemo(() => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      return null;
    }

    return new AnchorProvider(
      connection,
      wallet as never,
      { commitment: "confirmed" }
    );
  }, [connection, wallet]);

  return provider;
}

/**
 * Get the Anchor Program instance
 *
 * In the current @anchor-lang/core version, the Program constructor takes
 * (idl, provider), and the program ID is read from idl.address or
 * idl.metadata.address.
 *
 * @returns A Program instance, or null if the wallet is disconnected
 */
export function useProgram(): Program<SolanaVoteDapp> | null {
  const provider = useAnchorProvider();

  const program = useMemo(() => {
    if (!provider) {
      return null;
    }

    // Current Anchor API: new Program(idl, provider).
    // The IDL already contains the address, so no programId is passed separately.
    return new Program<SolanaVoteDapp>(
      idl as SolanaVoteDapp,
      provider
    );
  }, [provider]);

  return program;
}

/**
 * Determine whether the current user is an administrator
 *
 * @returns Whether the user is an administrator
 */
export function useIsAdmin(): boolean {
  const { publicKey } = useWallet();

  return useMemo(() => {
    if (!publicKey) return false;

    const adminPubkey = process.env.NEXT_PUBLIC_ADMIN_PUBKEY;
    if (!adminPubkey) return false;

    return publicKey.toBase58() === adminPubkey;
  }, [publicKey]);
}