/**
 * useAdmin.ts — Admin operation hooks
 */

import { useState, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useProgram } from "./useProgram";
import * as adminService from "@/services/admin.service";

// ============================================================
// 1. Type definitions
// ============================================================

export interface MutationResult<TInput, TOutput = string> {
  execute: (input: TInput) => Promise<TOutput | null>;
  loading: boolean;
  error: Error | null;
}

// ============================================================
// 2. Initialization hooks
// ============================================================

export function useInitPollConfig(): MutationResult<void> {
  const program = useProgram();
  const { publicKey } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async (): Promise<string | null> => {
    if (!program || !publicKey) {
      setError(new Error("Wallet is not connected"));
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const txSig = await adminService.initPollConfig(program, publicKey);
      return txSig;
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      return null;
    } finally {
      setLoading(false);
    }
  }, [program, publicKey]);

  return { execute, loading, error };
}

export function useInitEmployeeConfig(): MutationResult<void> {
  const program = useProgram();
  const { publicKey } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async (): Promise<string | null> => {
    if (!program || !publicKey) {
      setError(new Error("Wallet is not connected"));
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const txSig = await adminService.initEmployeeConfig(program, publicKey);
      return txSig;
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      return null;
    } finally {
      setLoading(false);
    }
  }, [program, publicKey]);

  return { execute, loading, error };
}

// ============================================================
// 3. Configuration update hooks
// ============================================================

export function useUpdatePollConfig(): MutationResult<adminService.UpdatePollConfigInput> {
  const program = useProgram();
  const { publicKey } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(
    async (input: adminService.UpdatePollConfigInput): Promise<string | null> => {
      if (!program || !publicKey) {
        setError(new Error("Wallet is not connected"));
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const txSig = await adminService.updatePollConfig(program, publicKey, input);
        return txSig;
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
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
// 4. Department management hooks
// ============================================================

export function useCreateDepartment(): MutationResult<string> {
  const program = useProgram();
  const { publicKey } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(
    async (departmentName: string): Promise<string | null> => {
      if (!program || !publicKey) {
        setError(new Error("Wallet is not connected"));
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const txSig = await adminService.createDepartment(program, publicKey, departmentName);
        return txSig;
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        return null;
      } finally {
        setLoading(false);
      }
    },
    [program, publicKey]
  );

  return { execute, loading, error };
}

export interface UpdateDepartmentInput {
  departmentName: string;
  params: adminService.UpdateDepartmentInput;
}

export function useUpdateDepartment(): MutationResult<UpdateDepartmentInput> {
  const program = useProgram();
  const { publicKey } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(
    async (input: UpdateDepartmentInput): Promise<string | null> => {
      if (!program || !publicKey) {
        setError(new Error("Wallet is not connected"));
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const txSig = await adminService.updateDepartment(
          program,
          publicKey,
          input.departmentName,
          input.params
        );
        return txSig;
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
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
// 5. Role management hooks
// ============================================================

export interface CreateRoleInput {
  roleName: string;
  roleLevel: number;
  departmentName: string;
}

export function useCreateRole(): MutationResult<CreateRoleInput> {
  const program = useProgram();
  const { publicKey } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(
    async (input: CreateRoleInput): Promise<string | null> => {
      if (!program || !publicKey) {
        setError(new Error("Wallet is not connected"));
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const txSig = await adminService.createRole(
          program,
          publicKey,
          input.roleName,
          input.roleLevel,
          input.departmentName
        );
        return txSig;
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        return null;
      } finally {
        setLoading(false);
      }
    },
    [program, publicKey]
  );

  return { execute, loading, error };
}

export interface UpdateRoleInput {
  roleName: string;
  departmentName: string;
  params: adminService.UpdateRoleInput;
}

export function useUpdateRole(): MutationResult<UpdateRoleInput> {
  const program = useProgram();
  const { publicKey } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(
    async (input: UpdateRoleInput): Promise<string | null> => {
      if (!program || !publicKey) {
        setError(new Error("Wallet is not connected."));
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const txSig = await adminService.updateRole(
          program,
          publicKey,
          input.roleName,
          input.departmentName,
          input.params
        );
        return txSig;
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
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
 *
 * Implementation detail.
 * createEmployee(program, adminPubkey, employeePubkey, employeeName,
 *                currentGlobalId, mainRolePda, departmentPda)
 */
export interface CreateEmployeeInput {
  /** Wallet public key for the new employee */
  employeePubkey: PublicKey;
  /** Name of the new employee */
  employeeName: string;
  /** Current global employee ID from EmployeeConfig */
  currentGlobalId: number | bigint;
  /** PDA address of the primary role */
  mainRolePda: PublicKey;
  /** Department PDA required by create_employee in the IDL */
  departmentPda: PublicKey;
}

export function useCreateEmployee(): MutationResult<CreateEmployeeInput> {
  const program = useProgram();
  const { publicKey } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(
    async (input: CreateEmployeeInput): Promise<string | null> => {
      if (!program || !publicKey) {
        setError(new Error("Wallet is not connected."));
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        // Implementation note.
        // (program, adminPubkey, employeePubkey, employeeName,
        //  currentGlobalId, mainRolePda, departmentPda)
        const txSig = await adminService.createEmployee(
          program,
          publicKey,
          input.employeePubkey,   // Argument 3: employee wallet public key
          input.employeeName,     // Argument 4: employee name
          input.currentGlobalId,  // Argument 5: current global ID (number | bigint)
          input.mainRolePda,      // Argument 6: role PDA (PublicKey)
          input.departmentPda     // Argument 7: department PDA (PublicKey)
        );
        return txSig;
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        return null;
      } finally {
        setLoading(false);
      }
    },
    [program, publicKey]
  );

  return { execute, loading, error };
}

export interface UpdateEmployeeInput {
  employeeId: number | bigint;
  params: adminService.UpdateEmployeeInput;
  oldRolePda?: PublicKey;
  newRolePda?: PublicKey;
  /** Previous department PDA, supplied when transferring between departments */
  oldDepartmentPda?: PublicKey;
  /** New department PDA, supplied when transferring between departments */
  newDepartmentPda?: PublicKey;
}

export function useUpdateEmployee(): MutationResult<UpdateEmployeeInput> {
  const program = useProgram();
  const { publicKey } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(
    async (input: UpdateEmployeeInput): Promise<string | null> => {
      if (!program || !publicKey) {
        setError(new Error("Wallet is not connected."));
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        // Implementation note.
        // (program, adminPubkey, employeeId, params,
        //  oldRolePda, newRolePda, oldDepartmentPda, newDepartmentPda)
        const txSig = await adminService.updateEmployee(
          program,
          publicKey,
          input.employeeId,
          input.params,
          input.oldRolePda ?? null,        // undefined → null when not transferring roles
          input.newRolePda ?? null,         // undefined → null
          input.oldDepartmentPda ?? null,   // undefined → null when not changing departments
          input.newDepartmentPda ?? null    // undefined → null
        );
        return txSig;
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        return null;
      } finally {
        setLoading(false);
      }
    },
    [program, publicKey]
  );

  return { execute, loading, error };
}