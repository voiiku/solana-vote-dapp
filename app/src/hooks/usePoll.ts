/**
 * usePoll.ts — Poll operation hooks
 *
 * Wraps all poll operations from poll.service.ts.
 */

import { useState, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useProgram } from "./useProgram";
import * as pollService from "@/services/poll.service";

// ============================================================
// 1. Type definitions
// ============================================================

export interface MutationResult<TInput, TOutput = string> {
  execute: (input: TInput) => Promise<TOutput | null>;
  loading: boolean;
  error: Error | null;
}

// ============================================================
// 2. Poll creation hooks
// ============================================================

/**
 * Create a poll
 */
export interface CreatePollInput {
  currentTotalPolls: number | bigint;
  employeeId:number | bigint;
  input: pollService.CreatePollInput;
}

export function useCreatePoll(): MutationResult<CreatePollInput> {
  const program = useProgram();
  const { publicKey } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(
    async (input: CreatePollInput): Promise<string | null> => {
      if (!program || !publicKey) {
        setError(new Error("Wallet is not connected"));
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const txSig = await pollService.createPoll(
          program,
          publicKey,
          input.currentTotalPolls,
          input.employeeId,
          input.input
        );
        return txSig;
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [program, publicKey]
  );

  return { execute, loading, error };
}

// ============================================================
// 3. Candidate management hooks
// ============================================================

/**
 * Create a candidate
 */
export interface CreateCandidateInput {
  pollId: number | bigint;
  candidateName: string;
  pointer?: PublicKey;
}

export function useCreateCandidate(): MutationResult<CreateCandidateInput> {
  const program = useProgram();
  const { publicKey } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(
    async (input: CreateCandidateInput): Promise<string | null> => {
      if (!program || !publicKey) {
        setError(new Error("Wallet is not connected"));
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const txSig = await pollService.createCandidate(
          program,
          publicKey,
          input.pollId,
          input.candidateName,
          input.pointer
        );
        return txSig;
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [program, publicKey]
  );

  return { execute, loading, error };
}

/**
 * Add candidates to a poll
 */
export interface AddCandidateInput {
  pollId: number | bigint;
  candidatePdas: PublicKey[];
}

export function useAddCandidate(): MutationResult<AddCandidateInput> {
  const program = useProgram();
  const { publicKey } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(
    async (input: AddCandidateInput): Promise<string | null> => {
      if (!program || !publicKey) {
        setError(new Error("Wallet is not connected"));
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const txSig = await pollService.addCandidate(
          program,
          publicKey,
          input.pollId,
          input.candidatePdas
        );
        return txSig;
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [program, publicKey]
  );

  return { execute, loading, error };
}

/**
 * Remove candidates from a poll
 */
export function useRemoveCandidate(): MutationResult<AddCandidateInput> {
  const program = useProgram();
  const { publicKey } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(
    async (input: AddCandidateInput): Promise<string | null> => {
      if (!program || !publicKey) {
        setError(new Error("Wallet is not connected"));
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const txSig = await pollService.removeCandidate(
          program,
          publicKey,
          input.pollId,
          input.candidatePdas
        );
        return txSig;
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [program, publicKey]
  );

  return { execute, loading, error };
}

// ============================================================
// 4. Poll configuration hooks
// ============================================================

/**
 * Update basic poll information
 */
export interface SetPollNormalInput {
  pollId: number | bigint;
  input: pollService.SetPollNormalInput;
}

export function useSetPollNormal(): MutationResult<SetPollNormalInput> {
  const program = useProgram();
  const { publicKey } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(
    async (input: SetPollNormalInput): Promise<string | null> => {
      if (!program || !publicKey) {
        setError(new Error("Wallet is not connected"));
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const txSig = await pollService.setPollNormal(
          program,
          publicKey,
          input.pollId,
          input.input
        );
        return txSig;
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [program, publicKey]
  );

  return { execute, loading, error };
}

// ============================================================
// Implementation note.
// ============================================================

/**
 * Implementation detail.
 */
export interface ListOperationInput {
  pollId: number | bigint;
  pdas: PublicKey[];
}

/**
 * Implementation detail.
 */
export function useAddPollAllowDepartments(): MutationResult<ListOperationInput> {
  const program = useProgram();
  const { publicKey } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(
    async (input: ListOperationInput): Promise<string | null> => {
      if (!program || !publicKey) {
        setError(new Error("Wallet is not connected."));
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const txSig = await pollService.addPollAllowDepartments(
          program,
          publicKey,
          input.pollId,
          input.pdas
        );
        return txSig;
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [program, publicKey]
  );

  return { execute, loading, error };
}

/**
 * Implementation detail.
 */
export function useRemovePollAllowDepartments(): MutationResult<ListOperationInput> {
  const program = useProgram();
  const { publicKey } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(
    async (input: ListOperationInput): Promise<string | null> => {
      if (!program || !publicKey) {
        setError(new Error("Wallet is not connected."));
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const txSig = await pollService.removePollAllowDepartments(
          program,
          publicKey,
          input.pollId,
          input.pdas
        );
        return txSig;
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [program, publicKey]
  );

  return { execute, loading, error };
}

/**
 * Implementation detail.
 */
export function useAddPollAllowRoles(): MutationResult<ListOperationInput> {
  const program = useProgram();
  const { publicKey } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(
    async (input: ListOperationInput): Promise<string | null> => {
      if (!program || !publicKey) {
        setError(new Error("Wallet is not connected."));
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const txSig = await pollService.addPollAllowRoles(
          program,
          publicKey,
          input.pollId,
          input.pdas
        );
        return txSig;
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [program, publicKey]
  );

  return { execute, loading, error };
}

/**
 * Implementation detail.
 */
export function useRemovePollAllowRoles(): MutationResult<ListOperationInput> {
  const program = useProgram();
  const { publicKey } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(
    async (input: ListOperationInput): Promise<string | null> => {
      if (!program || !publicKey) {
        setError(new Error("Wallet is not connected."));
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const txSig = await pollService.removePollAllowRoles(
          program,
          publicKey,
          input.pollId,
          input.pdas
        );
        return txSig;
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [program, publicKey]
  );

  return { execute, loading, error };
}

/**
 * Implementation detail.
 */
export function useAddPollBannedDepartments(): MutationResult<ListOperationInput> {
  const program = useProgram();
  const { publicKey } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(
    async (input: ListOperationInput): Promise<string | null> => {
      if (!program || !publicKey) {
        setError(new Error("Wallet is not connected."));
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const txSig = await pollService.addPollBannedDepartments(
          program,
          publicKey,
          input.pollId,
          input.pdas
        );
        return txSig;
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [program, publicKey]
  );

  return { execute, loading, error };
}

/**
 * Implementation detail.
 */
export function useRemovePollBannedDepartments(): MutationResult<ListOperationInput> {
  const program = useProgram();
  const { publicKey } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(
    async (input: ListOperationInput): Promise<string | null> => {
      if (!program || !publicKey) {
        setError(new Error("Wallet is not connected."));
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const txSig = await pollService.removePollBannedDepartments(
          program,
          publicKey,
          input.pollId,
          input.pdas
        );
        return txSig;
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [program, publicKey]
  );

  return { execute, loading, error };
}

/**
 * Implementation detail.
 */
export function useAddPollBannedRoles(): MutationResult<ListOperationInput> {
  const program = useProgram();
  const { publicKey } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(
    async (input: ListOperationInput): Promise<string | null> => {
      if (!program || !publicKey) {
        setError(new Error("Wallet is not connected."));
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const txSig = await pollService.addPollBannedRoles(
          program,
          publicKey,
          input.pollId,
          input.pdas
        );
        return txSig;
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [program, publicKey]
  );

  return { execute, loading, error };
}

/**
 * Implementation detail.
 */
export function useRemovePollBannedRoles(): MutationResult<ListOperationInput> {
  const program = useProgram();
  const { publicKey } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(
    async (input: ListOperationInput): Promise<string | null> => {
      if (!program || !publicKey) {
        setError(new Error("Wallet is not connected."));
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const txSig = await pollService.removePollBannedRoles(
          program,
          publicKey,
          input.pollId,
          input.pdas
        );
        return txSig;
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [program, publicKey]
  );

  return { execute, loading, error };
}

// ============================================================
// Implementation note.
// ============================================================

/**
 * UpdateVoteStatus
 */
export interface UpdatePollStatusInput {
  pollId: number | bigint;
  isReady: boolean | null;
}

export function useUpdatePollStatus(): MutationResult<UpdatePollStatusInput> {
  const program = useProgram();
  const { publicKey } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(
    async (input: UpdatePollStatusInput): Promise<string | null> => {
      if (!program || !publicKey) {
        setError(new Error("Wallet is not connected."));
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const txSig = await pollService.updatePollStatus(
          program,
          publicKey,
          input.pollId,
          input.isReady
        );
        return txSig;
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [program, publicKey]
  );

  return { execute, loading, error };
}

/**
 * Implementation detail.
 */
export interface TryUpdatePollStatusInput {
  pollId: number | bigint;
}

export function useTryUpdatePollStatus(): MutationResult<TryUpdatePollStatusInput> {
  const program = useProgram();
  const { publicKey } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(
    async (input: TryUpdatePollStatusInput): Promise<string | null> => {
      if (!program || !publicKey) {
        setError(new Error("Wallet is not connected."));
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const txSig = await pollService.tryUpdatePollStatus(
          program,
          publicKey,
          input.pollId
        );
        return txSig;
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [program, publicKey]
  );

  return { execute, loading, error };
}

// ============================================================
// Implementation note.
// ============================================================

/**
 * Implementation detail.
 */
export interface VoteInput {
  employeeId: number | bigint;
  pollId: number | bigint;
  choices: PublicKey[];
  rolePda: PublicKey;
  departmentPda: PublicKey;
}

export function useVote(): MutationResult<VoteInput> {
  const program = useProgram();
  const { publicKey } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(
    async (input: VoteInput): Promise<string | null> => {
      if (!program || !publicKey) {
        setError(new Error("Wallet is not connected."));
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const txSig = await pollService.vote(
          program,
          publicKey,
          input.employeeId,
          input.pollId,
          input.choices,
          input.rolePda,
          input.departmentPda
        );
        return txSig;
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [program, publicKey]
  );

  return { execute, loading, error };
}