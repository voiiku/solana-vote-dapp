/**
 * program.ts — Get an Anchor Program instance (v3 fix)
 */

import { Program, AnchorProvider, type Idl } from "@anchor-lang/core";
import { Connection } from "@solana/web3.js";
import { createConnection } from "./provider";

import idlJson from "@/idl/solana_vote_dapp.json";

// Cast the JSON to Anchor's Idl type
const idl = idlJson as unknown as Idl;

/**
 * Extract the type of the second AnchorProvider constructor parameter (Wallet).
 *
 * AnchorProvider's constructor is:
 *   constructor(connection: Connection, wallet: Wallet, opts?: ConfirmOptions)
 * The wallet parameter's type is needed for a type assertion.
 *
 * ConstructorParameters<typeof AnchorProvider> returns a tuple of constructor
 * parameter types. [1] selects the second parameter, the Wallet type.
 *
 * Unlike Parameters<T>, which is for regular functions, ConstructorParameters<T>
 * is for class constructors. AnchorProvider is a class, so use the latter.
 */
type AnchorWalletType = ConstructorParameters<typeof AnchorProvider>[1];

// ============================================================
// 1. Create a Program instance (requires a wallet; read and write)
// ============================================================

export function getProgram(provider: AnchorProvider): Program {
  return new Program(idl, provider);
}

// ============================================================
// 2. Read-only Program instance (no wallet required; queries only)
// ============================================================

export function getReadonlyProgram(connection?: Connection): Program {
  const conn = connection ?? createConnection();

  const dummyWallet: AnchorWalletType = {
    publicKey: null,
    signTransaction: () => {
      return Promise.reject(new Error("Signing is not supported in read-only mode"));
    },
    signAllTransactions: () => {
      return Promise.reject(new Error("Signing is not supported in read-only mode"));
    },
  } as unknown as AnchorWalletType;
  // ↑ AnchorWallet requires publicKey to be a PublicKey rather than null,
  //   but it is unused in read-only mode, so the assertion bypasses this.

  const provider = new AnchorProvider(conn, dummyWallet, {
    commitment: "confirmed",
  });

  return new Program(idl, provider);
}