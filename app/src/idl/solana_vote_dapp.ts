import type { Idl } from "@anchor-lang/core";
import idlJson from "./solana_vote_dapp.json";

// Export the IDL type
export type SolanaVoteDapp = typeof idlJson & Idl;
