/**
 * admin.service.ts — On-chain admin operations
 *
 * The service layer translates between the frontend and the on-chain
 * program. It accepts frontend-friendly values, converts them to the required
 * formats (BN, [u8;64] arrays, PublicKey), derives PDAs, sends transactions,
 * and returns transaction signatures.
 *
 * Keeping program.methods calls out of components separates UI from on-chain
 * details, enables reuse across pages, allows independent unit testing, and
 * centralizes changes to the on-chain interface.
 *
 * Our Program instance uses Program<Idl> (a non-specialized IDL type), so
 * TypeScript cannot infer the methods under program.methods. Helper types and
 * assertions address this; Anchor resolves method names and arguments from
 * the IDL JSON at runtime.
 *
 * Admin operations wrapped by this file (9 instructions):
 * Implementation detail.
 * │  initPollConfig      Initialize global poll configuration │
 * │  initEmployeeConfig  Initialize global employee config     │
 * │  updatePollConfig    Update global poll configuration      │
 * Implementation detail.
 * │  createDepartment    Create a department                    │
 * │  updateDepartment    Update department configuration        │
 * Implementation detail.
 * │  createRole          Create a role                          │
 * │  updateRole          Update role configuration              │
 * ├─ Employee management ─────────────────────────────────┤
 * │  createEmployee      Create an employee                     │
 * │  updateEmployee      Update employee configuration          │
 * └────────────────────────────────────────────┘
 */

import { Program, BN, type Idl } from "@anchor-lang/core";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { strToBytes64 } from "@/lib/utils";
import {
  getPollConfigPda,
  getEmployeeConfigPda,
  getDepartmentPda,
  getRolePda,
  getEmployeePda,
} from "@/lib/pda";

// ============================================================
// 1. Type definitions — helpers for Program<Idl> type limitations
// ============================================================

/** Type description for the Anchor method builder */
interface MethodBuilder {
  accounts(accts: Record<string, PublicKey | null>): MethodBuilder;
  rpc(): Promise<string>;
}

/** Base argument type (without recursive references) */
type SimpleArg = BN | number | number[] | boolean | string | PublicKey | null | undefined;

/** Argument object interface for Anchor struct parameters such as UpdatePollConfigParams */
interface ParamsObject {
  [key: string]: SimpleArg;
}

/** Union of method argument types (without circular references) */
type MethodArg = SimpleArg | SimpleArg[] | ParamsObject;

// Method signature alias to avoid an inline complex generic
type MethodFn = (...args: MethodArg[]) => MethodBuilder;

// Method namespace alias
type MethodNamespace = Record<string, MethodFn>;

/**
 * Get the callable method namespace from Program<Idl> by asserting
 * program.methods to the type defined above.
 */
function getMethods(program: Program): MethodNamespace {
  return program.methods as unknown as MethodNamespace;
}

// ============================================================
// 2. Frontend-friendly parameter interfaces
// ============================================================

/**
 * Parameters for updating global poll configuration.
 *
 * All fields are optional (Option<T>). Only provided fields are updated;
 * omitted fields remain unchanged.
 */
export interface UpdatePollConfigInput {
  /** Whether poll creation is allowed (global toggle) */
  allowCreatePoll?: boolean;
  /** Minimum poll duration in seconds; end_at - start_at cannot be less */
  minPollingInterval?: number;
  /** Maximum poll duration in seconds; end_at - start_at cannot exceed this */
  maxPollingInterval?: number;
  /** Minimum level allowed to create polls (0–255) */
  minAllowCreatePoll?: number;
}

/**
 * Parameters for updating a department
 */
export interface UpdateDepartmentInput {
  /** Whether the department can create polls */
  allowCreatePoll?: boolean;
  /** Whether the department can vote */
  allowVote?: boolean;
}

/**
 * Parameters for updating a role
 */
export interface UpdateRoleInput {
  /** Role level (0–255); higher levels have more permissions */
  roleLevel?: number;
  /** Whether the role can create polls */
  allowCreatePoll?: boolean;
  /** Whether the role can vote */
  allowVote?: boolean;
}

/**
 * Parameters for updating an employee
 */
export interface UpdateEmployeeInput {
  /** Employee wallet public key (used when changing wallets) */
  owner?: PublicKey;
  /** Employee name */
  name?: string;
  /** Whether the employee is active */
  active?: boolean;
  /** Whether the employee can create polls */
  allowCreatePoll?: boolean;
  /** Whether the employee can vote */
  allowVote?: boolean;
  /** Temporary level override (null clears it and uses the role's default level) */
  tempLevel?: number | null;
  /** Main role PDA public key (used when changing roles) */
  mainRoleKey?: PublicKey;
}

// ============================================================
// 3. Helper functions — Option<T> conversion
// ============================================================

/**
 * Convert JavaScript undefined to Anchor Option::None (null).
 *
 * @param value - Value from the frontend (may be undefined)
 * @returns null if undefined; otherwise, the original value
 */
function toOption<T>(value: T | undefined): T | null {
  return value === undefined ? null : value;
}

/**
 * Convert a number to an optional BN.
 *
 * @param value - Number or undefined
 * @returns null or a BN instance
 */
function toOptionBN(value: number | undefined): BN | null {
  return value === undefined ? null : new BN(value);
}

/**
 * Convert a string to an optional [u8;64] byte array.
 *
 * @param value - String or undefined
 * @returns null or a 64-byte number array
 */
function toOptionBytes64(value: string | undefined): number[] | null {
  return value === undefined ? null : strToBytes64(value);
}

// ============================================================
// 4. Global configuration operations
// ============================================================

/**
 * Initialize global poll configuration (init_poll_config).
 *
 * An administrator calls this instruction on first use after deployment to
 * create the PollConfig PDA. Call it once; subsequent calls fail because the
 * PDA already exists.
 *
 * @param program - Anchor Program instance
 * @param adminPubkey - Administrator wallet public key
 * @returns Transaction signature
 */
export async function initPollConfig(
  program: Program,
  adminPubkey: PublicKey
): Promise<string> {
  // Derive the PollConfig PDA with seeds ["poll_config", "v1"]
  const [pollConfigPda] = getPollConfigPda();

  return getMethods(program)
    .initPollConfig() // No arguments
    .accounts({
      admin: adminPubkey,
      pollConfig: pollConfigPda,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

/**
 * Initialize global employee configuration (init_employee_config).
 *
 * EmployeeConfig stores the global incrementing employee ID counter.
 * The next available ID is read from this counter when creating an employee.
 *
 * @param program - Anchor Program instance
 * @param adminPubkey - Administrator wallet public key
 * @returns Transaction signature
 */
export async function initEmployeeConfig(
  program: Program,
  adminPubkey: PublicKey
): Promise<string> {
  const [employeeConfigPda] = getEmployeeConfigPda();

  return getMethods(program)
    .initEmployeeConfig()
    .accounts({
      admin: adminPubkey,
      employeeConfig: employeeConfigPda,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

/**
 * Update global poll configuration (update_poll_config).
 *
 * Lets an administrator adjust global poll rules. Unlike init, update does
 * not need system_program because it does not create an account.
 *
 * @param program - Anchor Program instance
 * @param adminPubkey - Administrator wallet public key
 * @param input - Fields to update; pass only the fields to change
 * @returns Transaction signature
 */
export async function updatePollConfig(
  program: Program,
  adminPubkey: PublicKey,
  input: UpdatePollConfigInput
): Promise<string> {
  const [pollConfigPda] = getPollConfigPda();

  // Convert frontend-friendly values to Anchor's UpdatePollConfigParams format.
  // undefined → null → Option::None (leave the field unchanged)
  const params: ParamsObject = {
    allowCreatePoll: toOption(input.allowCreatePoll),
    minPollingInterval: toOptionBN(input.minPollingInterval),
    maxPollingInterval: toOptionBN(input.maxPollingInterval),
    minAllowCreatePoll: toOption(input.minAllowCreatePoll),
  };

  return getMethods(program)
    .updatePollConfig(params)
    .accounts({
      admin: adminPubkey,
      pollConfig: pollConfigPda,
    })
    .rpc();
}

// ============================================================
// 5. Department management
// ============================================================

/**
 * Create a department (create_department).
 *
 * The first 32 bytes of the department name are used as a PDA seed, so
 * department names must be unique.
 *
 * @param program - Anchor Program instance
 * @param adminPubkey - Administrator wallet public key
 * @param departmentName - Department name
 * @returns Transaction signature
 */
export async function createDepartment(
  program: Program,
  adminPubkey: PublicKey,
  departmentName: string
): Promise<string> {
  // Convert the string to a [u8;64] array (on-chain storage format)
  const nameBytes = strToBytes64(departmentName);
  // Derive the department PDA using ["department", "v1", first 32 bytes of name]
  const [departmentPda] = getDepartmentPda(departmentName);

  return getMethods(program)
    .createDepartment(
      nameBytes // department_name: [u8; 64]
    )
    .accounts({
      admin: adminPubkey,
      department: departmentPda,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

/**
 * Update department configuration (update_department).
 *
 * @param program - Anchor Program instance
 * @param adminPubkey - Administrator wallet public key
 * @param departmentName - Department name used to locate the account
 * @param input - Fields to update
 * @returns Transaction signature
 */
export async function updateDepartment(
  program: Program,
  adminPubkey: PublicKey,
  departmentName: string,
  input: UpdateDepartmentInput
): Promise<string> {
  const nameBytes = strToBytes64(departmentName);
  const [departmentPda] = getDepartmentPda(departmentName);

  const params: ParamsObject = {
    allowCreatePoll: toOption(input.allowCreatePoll),
    allowVote: toOption(input.allowVote),
  };

  return getMethods(program)
    .updateDepartment(
      nameBytes, // department_name: [u8; 64] — used for on-chain validation
      params     // UpdateDepartmentParams
    )
    .accounts({
      admin: adminPubkey,
      department: departmentPda,
    })
    .rpc();
}

// ============================================================
// 6. Role management
// ============================================================

/**
 * Create a role (create_role).
 *
 * A role belongs to a department. Role names must be unique within a
 * department. role_level (0–255) is used for permission checks.
 *
 * @param program - Anchor Program instance
 * @param adminPubkey - Administrator wallet public key
 * @param roleName - Role name
 * @param roleLevel - Role level (0–255)
 * @param departmentName - Department name
 * @returns Transaction signature
 */
export async function createRole(
  program: Program,
  adminPubkey: PublicKey,
  roleName: string,
  roleLevel: number,
  departmentName: string
): Promise<string> {
  const roleNameBytes = strToBytes64(roleName);
  const deptNameBytes = strToBytes64(departmentName);

  // Derive the department PDA to verify that the department exists
  const [departmentPda] = getDepartmentPda(departmentName);
  // Derive the role PDA with role and department name prefixes
  const [rolePda] = getRolePda(roleName, departmentName);

  return getMethods(program)
    .createRole(
      roleNameBytes, // role_name: [u8; 64]
      roleLevel,     // role_level: u8
      deptNameBytes  // department_name: [u8; 64]
    )
    .accounts({
      admin: adminPubkey,
      department: departmentPda, // Read-only; used to verify the department exists
      role: rolePda,             // Role PDA to create
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

/**
 * Update role configuration (update_role).
 *
 * @param program - Anchor Program instance
 * @param adminPubkey - Administrator wallet public key
 * @param roleName - Role name
 * @param departmentName - Department name
 * @param input - Fields to update
 * @returns Transaction signature
 */
export async function updateRole(
  program: Program,
  adminPubkey: PublicKey,
  roleName: string,
  departmentName: string,
  input: UpdateRoleInput
): Promise<string> {
  const roleNameBytes = strToBytes64(roleName);
  const deptNameBytes = strToBytes64(departmentName);
  const [rolePda] = getRolePda(roleName, departmentName);

  const params: ParamsObject = {
    roleLevel: toOption(input.roleLevel),
    allowCreatePoll: toOption(input.allowCreatePoll),
    allowVote: toOption(input.allowVote),
  };

  return getMethods(program)
    .updateRole(
      roleNameBytes, // role_name: [u8; 64]
      deptNameBytes, // department_name: [u8; 64]
      params         // UpdateRoleParams
    )
    .accounts({
      admin: adminPubkey,
      role: rolePda,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

// ============================================================
// 7. Employee management
// ============================================================

/**
 * Create an employee (create_employee).
 *
 * Employees are core entities in the voting system. Each has:
 * - A globally unique, incrementing employee_id
 * - A wallet public key for login and signing
 * - A main role (main_role_key) that determines permissions
 *
 * When an employee is created, the program automatically:
 * 1. Gets the next available ID from EmployeeConfig
 * 2. Increments EmployeeConfig.global_employee_id
 * 3. Increments the member count for the corresponding Role
 *
 * IDL instruction details:
 * Instruction: create_employee
 * Arguments:
 *   - employee_pubkey (pubkey): New employee's wallet public key
 *   - employee_name ([u8; 64]): Employee name
 * Accounts:
 *   - admin (signer, writable): Administrator wallet
 *   - employee_config (PDA, writable): Global employee configuration (incrementing ID)
 *   - employee (writable): Employee PDA to create
 *   - employee_main_role (writable): Employee's main role (increments members)
 *   - department (writable): Employee's department (required by the IDL)
 *   - system_program
 *
 * @param program - Anchor Program instance
 * @param adminPubkey - Administrator wallet public key
 * @param employeePubkey - New employee's wallet public key
 * @param employeeName - Employee name
 * @param currentGlobalId - Current global_employee_id from EmployeeConfig
 * @param mainRolePda - PDA address of the employee's main role
 * @param departmentPda - PDA address of the employee's department (required by create_employee in the IDL)
 * @returns Transaction signature
 *
 * @example
 * // 1. Fetch the current global ID
 * const empConfig = await fetchEmployeeConfig(program);
 * const currentId = empConfig.globalEmployeeId; // For example, 0
 *
 * // 2. Derive the role and department PDAs
 * const [rolePda] = getRolePda("Software Engineer", "Engineering");
 * const [deptPda] = getDepartmentPda("Engineering");
 *
 * // 3. Create the employee
 * await createEmployee(
 *   program,
 *   wallet.publicKey,
 *   new PublicKey("employee-wallet-address"),
 *   "Alex Smith",
 *   currentId,
 *   rolePda,
 *   deptPda  // New parameter
 * );
 */
export async function createEmployee(
  program: Program,
  adminPubkey: PublicKey,
  employeePubkey: PublicKey,
  employeeName: string,
  currentGlobalId: number | bigint,
  mainRolePda: PublicKey,
  departmentPda: PublicKey // Employee department PDA
): Promise<string> {
  const nameBytes = strToBytes64(employeeName);
  const [employeeConfigPda] = getEmployeeConfigPda();

  // Derive the new employee's PDA from the current global ID.
  // The on-chain program verifies it matches EmployeeConfig.global_employee_id.
  const [employeePda] = getEmployeePda(currentGlobalId);

  return getMethods(program)
    .createEmployee(
      employeePubkey, // employee_pubkey: new employee's wallet public key
      nameBytes       // employee_name: [u8; 64]
    )
    .accounts({
      admin: adminPubkey,
      employeeConfig: employeeConfigPda,   // PDA storing the global incrementing ID
      employee: employeePda,               // Employee PDA derived from currentGlobalId
      employeeMainRole: mainRolePda,       // Employee's main role (writable; increments members)
      department: departmentPda,           // Employee's department (writable; required by the IDL)
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

/**
 * Update employee configuration (update_employee).
 *
 * When changing mainRoleKey, also pass the old and new roles and departments:
 * - oldRole → previous role PDA (members -1)
 * - newRole → new role PDA (members +1)
 * - oldDepartment → previous department PDA (members -1 for cross-department moves)
 * - newDepartment → new department PDA (members +1 for cross-department moves)
 *
 * Pass null for all four parameters when not changing roles.
 *
 * IDL instruction details:
 * Instruction: update_employee
 * Arguments:
 *   - employee_id (u64): Identifies the employee
 *   - params (UpdateEmployeeParams): Fields to update
 * Accounts:
 *   - admin (signer, writable)
 *   - employee (writable)
 *   - old_role (optional, writable): Previous role when changing roles
 *   - new_role (optional, writable): New role when changing roles
 *   - old_department (optional, writable): Previous department for cross-department moves
 *   - new_department (optional, writable): New department for cross-department moves
 *   - system_program
 *
 * @param program - Anchor Program instance
 * @param adminPubkey - Administrator wallet public key
 * @param employeeId - Employee ID
 * @param input - Fields to update
 * @param oldRolePda - Previous role PDA when changing roles; otherwise null
 * @param newRolePda - New role PDA when changing roles; otherwise null
 * @param oldDepartmentPda - Previous department PDA for cross-department moves; otherwise null
 * @param newDepartmentPda - New department PDA for cross-department moves; otherwise null
 * @returns Transaction signature
 *
 * @example
 * // Update an employee's name without changing roles
 * await updateEmployee(program, wallet.publicKey, 0, {
 *   name: "Jordan Lee",
 * }, null, null, null, null);
 *
 * // Move to a different department (from Engineering/Software Engineer to Marketing/Product Manager)
 * const [oldRole] = getRolePda("Software Engineer", "Engineering");
 * const [newRole] = getRolePda("Product Manager", "Marketing");
 * const [oldDept] = getDepartmentPda("Engineering");
 * const [newDept] = getDepartmentPda("Marketing");
 * await updateEmployee(program, wallet.publicKey, 0, {
 *   mainRoleKey: newRole,
 * }, oldRole, newRole, oldDept, newDept);
 *
 * // Change roles within the same department (Software Engineer to Architect in Engineering)
 * const [oldRole] = getRolePda("Software Engineer", "Engineering");
 * const [newRole] = getRolePda("Architect", "Engineering");
 * // For an intra-department move, pass the same PDA for old/new department
 * // or null, depending on whether the on-chain program requires these accounts.
 * const [deptPda] = getDepartmentPda("Engineering");
 * await updateEmployee(program, wallet.publicKey, 0, {
 *   mainRoleKey: newRole,
 * }, oldRole, newRole, deptPda, deptPda);
 */
export async function updateEmployee(
  program: Program,
  adminPubkey: PublicKey,
  employeeId: number | bigint,
  input: UpdateEmployeeInput,
  oldRolePda: PublicKey | null,
  newRolePda: PublicKey | null,
  oldDepartmentPda: PublicKey | null, // Previous department PDA (optional)
  newDepartmentPda: PublicKey | null  // New department PDA (optional)
): Promise<string> {
  const [employeePda] = getEmployeePda(employeeId);

  // Build UpdateEmployeeParams.
  // undefined → null → Option::None (leave the field unchanged)
  const params: ParamsObject = {
    owner: toOption(input.owner) as SimpleArg,
    name: toOptionBytes64(input.name),
    active: toOption(input.active),
    allowCreatePoll: toOption(input.allowCreatePoll),
    allowVote: toOption(input.allowVote),
    tempLevel: input.tempLevel === undefined ? null : input.tempLevel,
    mainRoleKey: toOption(input.mainRoleKey) as SimpleArg,
  };

  return getMethods(program)
    .updateEmployee(
      new BN(Number(employeeId)), // employee_id: u64
      params                      // UpdateEmployeeParams
    )
    .accounts({
      admin: adminPubkey,
      employee: employeePda,
      // For optional accounts in Anchor 0.30+, pass null to omit the account.
      oldRole: oldRolePda,               // Previous role when changing roles
      newRole: newRolePda,               // New role when changing roles
      oldDepartment: oldDepartmentPda,   // Previous department for cross-department moves
      newDepartment: newDepartmentPda,   // New department for cross-department moves
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}