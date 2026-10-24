/**
 * admin/employees/page.tsx — Employee management
 *
 * Implementation detail.
 * Implementation detail.
 * 2. Search by employee ID, name, department, or role
 * Implementation detail.
 * 4. Toggle active / allowCreatePoll / allowVote Status
 * Implementation detail.
 * 6. Show temporary, role, and effective levels
 */
"use client";

import { getDepartmentPda } from "@/lib/pda";
import { useState, useMemo } from "react";
import Link from "next/link";
import { PublicKey } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  useIsAdmin,
  useAllEmployees,
  useAllRoles,
  useAllDepartments,
  useEmployeeConfig,
  useCreateEmployee,
  useUpdateEmployee,
} from "@/hooks";
import type { EmployeeListItem, RoleListItem } from "@/hooks";
import type { UpdateEmployeeInput } from "@/services/admin.service";

// Search mode enum
type SearchMode = "all" | "id" | "name" | "dept";

export default function EmployeesPage() {
  const { publicKey } = useWallet();
  const isAdmin = useIsAdmin();

  // Implementation note.
  const employees = useAllEmployees();
  const roles = useAllRoles();
  const departments = useAllDepartments();
  const empConfig = useEmployeeConfig();

  // ── Actions Hooks ────────────────────────────────────────────
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();

  // Implementation note.
  const [formWallet, setFormWallet] = useState("");
  const [formName, setFormName] = useState("");
  const [formRolePda, setFormRolePda] = useState("");
  const [msg, setMsg] = useState("");

  // ── Search and filter state ────────────────────────────────────────
  const [searchMode, setSearchMode] = useState<SearchMode>("all");
  const [searchId, setSearchId] = useState(""); // By employee IDSearch
  const [searchName, setSearchName] = useState(""); // Search by name
  const [filterDept, setFilterDept] = useState(""); // Filter by department
  const [filterRolePda, setFilterRolePda] = useState(""); // Filter by role

  // ── TemporarylevelEditStatus ──────────────────────────────────────
  const [editingEmp, setEditingEmp] = useState<EmployeeListItem | null>(null);
  const [tempLevelInput, setTempLevelInput] = useState("");

  // Implementation note.
  const isValidWallet = useMemo(() => {
    if (!formWallet.trim()) return false;
    try {
      new PublicKey(formWallet.trim());
      return true;
    } catch {
      return false;
    }
  }, [formWallet]);

  // Implementation note.
  // Implementation note.
  const roleMap = useMemo(() => {
    const map = new Map<string, RoleListItem>();
    roles.data?.forEach((r) => map.set(r.pda.toBase58(), r));
    return map;
  }, [roles.data]);

  // Implementation note.
  const filteredEmployees = useMemo(() => {
    if (!employees.data) return [];
    let list = [...employees.data];

    switch (searchMode) {
      case "id":
        // Implementation note.
        if (searchId.trim()) {
          list = list.filter(
            (e) => e.employeeId.toString() === searchId.trim(),
          );
        }
        break;

      case "name":
        // Implementation note.
        if (searchName.trim()) {
          const keyword = searchName.trim().toLowerCase();
          list = list.filter((e) => e.name.toLowerCase().includes(keyword));
        }
        break;

      case "dept":
        // Implementation note.
        if (filterDept) {
          const deptRolePdaSet = new Set(
            roles.data
              ?.filter((r) => r.departmentName === filterDept)
              .map((r) => r.pda.toBase58()) ?? [],
          );
          list = list.filter((e) =>
            deptRolePdaSet.has(e.mainRoleKey.toBase58()),
          );

          // Further filter by the selected role
          if (filterRolePda) {
            list = list.filter(
              (e) => e.mainRoleKey.toBase58() === filterRolePda,
            );
          }
        }
        break;

      // Implementation note.
    }

    return list;
  }, [
    employees.data,
    searchMode,
    searchId,
    searchName,
    filterDept,
    filterRolePda,
    roles.data,
  ]);

  // Implementation note.
  const deptRoles = useMemo(() => {
    if (!filterDept || !roles.data) return [];
    return roles.data.filter((r) => r.departmentName === filterDept);
  }, [filterDept, roles.data]);

  // Implementation note.
  // Back { roleLevel, tempLevel, effectiveLevel, roleName, deptName }
  const getEmployeeLevels = (emp: EmployeeListItem) => {
    const role = roleMap.get(emp.mainRoleKey.toBase58());
    const roleLevel = role?.roleLevel ?? 0;
    const tempLevel = emp.tempLevel;
    // Implementation note.
    const effectiveLevel =
      tempLevel !== null && tempLevel !== undefined ? tempLevel : roleLevel;
    return {
      roleLevel,
      tempLevel,
      effectiveLevel,
      roleName: role?.roleName ?? "Unknown role",
      deptName: role?.departmentName ?? "Unknown department",
    };
  };

  // Implementation note.
  if (!publicKey)
    return <p className="p-8 text-center text-gray-400">Connect your wallet first.</p>;
  if (!isAdmin)
    return <p className="p-8 text-center text-red-400">⛔ Administrators only.</p>;

  // Implementation note.
  const handleCreate = async () => {
    if (!isValidWallet || !formName.trim() || !formRolePda || !empConfig.data)
      return;
    setMsg("");

    try {
      // Find the selected role’s department and derive its PDA
      const selectedRole = roles.data?.find(
        (r) => r.pda.toBase58() === formRolePda,
      );
      if (!selectedRole) {
        setMsg("⚠ Selected role not found. Please choose another.");
        return;
      }
      const [departmentPda] = getDepartmentPda(selectedRole.departmentName);

      const tx = await createEmployee.execute({
        employeePubkey: new PublicKey(formWallet.trim()),
        employeeName: formName.trim(),
        currentGlobalId: empConfig.data.globalEmployeeId,
        mainRolePda: new PublicKey(formRolePda),
        departmentPda,
      });
      if (tx) {
        setMsg(`✅ Employee “${formName.trim()}” created successfully!`);
        setFormWallet("");
        setFormName("");
        setFormRolePda("");
        employees.refetch();
        empConfig.refetch();
      }
    } catch (err) {
      setMsg("Creation failed: " + String(err));
    }
  };

  // Implementation note.
  const handleToggle = async (
    emp: EmployeeListItem,
    field: "active" | "allowCreatePoll" | "allowVote",
  ) => {
    setMsg("");
    const input: UpdateEmployeeInput = { [field]: !emp[field] };
    const tx = await updateEmployee.execute({
      employeeId: emp.employeeId,
      params: input,
    });
    if (tx) {
      setMsg(`Updated employee #${emp.employeeId.toString()} — ${field}`);
      employees.refetch();
    }
  };

  // Implementation note.
  const handleSetTempLevel = async () => {
    if (!editingEmp) return;
    setMsg("");

    // Implementation note.
    const newTempLevel =
      tempLevelInput.trim() === "" ? null : Number(tempLevelInput);

    // Implementation note.
    if (
      newTempLevel !== null &&
      (isNaN(newTempLevel) || newTempLevel < 0 || newTempLevel > 255)
    ) {
      setMsg("⚠ Temporary level must be an integer from 0 to 255");
      return;
    }

    const tx = await updateEmployee.execute({
      employeeId: editingEmp.employeeId,
      params: { tempLevel: newTempLevel } as UpdateEmployeeInput,
    });
    if (tx) {
      setMsg(
        newTempLevel !== null
          ? `✅ Set employee #${editingEmp.employeeId.toString()} temporary level to Lv.${newTempLevel}`
          : `✅ Cleared employee #${editingEmp.employeeId.toString()} temporary level`,
      );
      setEditingEmp(null);
      setTempLevelInput("");
      employees.refetch();
    }
  };

  // ── Start editing the temporary level ──────────────────────────────────────
  const startEditTempLevel = (emp: EmployeeListItem) => {
    setEditingEmp(emp);
    // Implementation note.
    setTempLevelInput(
      emp.tempLevel !== null && emp.tempLevel !== undefined
        ? emp.tempLevel.toString()
        : "",
    );
  };

  // Implementation note.
  const switchSearchMode = (mode: SearchMode) => {
    setSearchMode(mode);
    setSearchId("");
    setSearchName("");
    setFilterDept("");
    setFilterRolePda("");
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* UI section */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin"
          className="text-blue-400 hover:text-blue-300 text-sm"
        >
          ← Back to admin panel
        </Link>
        <h1 className="text-2xl font-bold">👤 Employee management</h1>
      </div>

      {/* UI section */}
      {msg && (
        <div className="bg-gray-800 border border-gray-600 rounded p-3 text-sm text-emerald-400">
          {msg}
        </div>
      )}

      {/* UI section */}
      <section className="bg-gray-800 rounded-lg p-6 space-y-3">
        <h2 className="text-lg font-semibold">Create employee</h2>

        {!empConfig.data && !empConfig.loading && (
          <p className="text-yellow-400 text-sm">
            ⚠ Initialize EmployeeConfig in the admin panel first.
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* UI section */}
          <div>
            <label className="text-xs text-gray-400">Employee wallet address</label>
            <input
              type="text"
              value={formWallet}
              onChange={(e) => setFormWallet(e.target.value)}
              placeholder="Solana public key (Base58)"
              className={`w-full bg-gray-700 rounded px-3 py-2 text-sm ${
                formWallet && !isValidWallet ? "border border-red-500" : ""
              }`}
            />
            {formWallet && !isValidWallet && (
              <p className="text-red-400 text-xs mt-1">Invalid public key format</p>
            )}
          </div>

          {/* Name */}
          <div>
            <label className="text-xs text-gray-400">EmployeeName</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. Alex Smith"
              className="w-full bg-gray-700 rounded px-3 py-2 text-sm"
            />
          </div>

          {/* UI section */}
          <div>
            <label className="text-xs text-gray-400">Primary role</label>
            <select
              value={formRolePda}
              onChange={(e) => setFormRolePda(e.target.value)}
              className="w-full bg-gray-700 rounded px-3 py-2 text-sm"
            >
              <option value="">-- Select a role --</option>
              {roles.data?.map((r) => (
                <option key={r.pda.toBase58()} value={r.pda.toBase58()}>
                  {r.departmentName} / {r.roleName} (Lv.{r.roleLevel})
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleCreate}
          disabled={
            createEmployee.loading ||
            !isValidWallet ||
            !formName.trim() ||
            !formRolePda ||
            !empConfig.data
          }
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 rounded text-sm"
        >
          {createEmployee.loading ? "Creating..." : "Create employee"}
        </button>
        {createEmployee.error && (
          <p className="text-red-400 text-sm">{createEmployee.error.message}</p>
        )}
      </section>

      {/* UI section */}
      <section className="bg-gray-800 rounded-lg p-4 space-y-3">
        {/* UI section */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-400">Search by:</span>
          {(
            [
              ["all", "All employees"],
              ["id", "By employee ID"],
              ["name", "Name"],
              ["dept", "Department/role"],
            ] as [SearchMode, string][]
          ).map(([mode, label]) => (
            <button
              key={mode}
              onClick={() => switchSearchMode(mode)}
              className={`px-3 py-1 rounded text-xs transition-colors ${
                searchMode === mode
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* By employee IDSearch */}
        {searchMode === "id" && (
          <input
            type="text"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            placeholder="Enter employee ID..."
            className="w-full bg-gray-700 rounded px-3 py-2 text-sm"
          />
        )}

        {/* UI section */}
        {searchMode === "name" && (
          <input
            type="text"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            placeholder="Enter employee name (supports partial matching)..."
            className="w-full bg-gray-700 rounded px-3 py-2 text-sm"
          />
        )}

        {/* UI section */}
        {searchMode === "dept" && (
          <div className="flex gap-3 flex-wrap">
            {/* UI section */}
            <select
              value={filterDept}
              onChange={(e) => {
                setFilterDept(e.target.value);
                setFilterRolePda(""); // Reset role selection when changing departments
              }}
              className="bg-gray-700 rounded px-3 py-2 text-sm min-w-[200px]"
            >
              <option value="">-- Select a department --</option>
              {departments.data?.map((d) => (
                <option key={d.pda.toBase58()} value={d.departmentName}>
                  {d.departmentName}
                </option>
              ))}
            </select>

            {/* UI section */}
            {filterDept && (
              <select
                value={filterRolePda}
                onChange={(e) => setFilterRolePda(e.target.value)}
                className="bg-gray-700 rounded px-3 py-2 text-sm min-w-[200px]"
              >
                <option value="">All roles</option>
                {deptRoles.map((r) => (
                  <option key={r.pda.toBase58()} value={r.pda.toBase58()}>
                    {r.roleName} (Lv.{r.roleLevel})
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
      </section>

      {/* UI section */}
      {editingEmp && (
        <section className="bg-gray-800 border border-blue-600 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-blue-400">
            ⚡ Set temporary level — {editingEmp.name} (#
            {editingEmp.employeeId.toString()})
          </h3>
          <div className="flex gap-3 items-end">
            <div>
              <label className="text-xs text-gray-400">
                Temporary level (leave blank to clear and use the role level)
              </label>
              <input
                type="number"
                value={tempLevelInput}
                onChange={(e) => setTempLevelInput(e.target.value)}
                placeholder="e.g. 5 (leave blank to clear)"
                min={0}
                max={255}
                className="w-48 bg-gray-700 rounded px-3 py-2 text-sm"
              />
            </div>
            <button
              onClick={handleSetTempLevel}
              disabled={updateEmployee.loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 rounded text-sm"
            >
              {updateEmployee.loading ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => {
                setEditingEmp(null);
                setTempLevelInput("");
              }}
              className="bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded text-sm"
            >
              Cancel
            </button>
          </div>
          <p className="text-xs text-gray-500">
            When set, the employee’s temporary level overrides the role level. Clearing it restores the role level.
          </p>
        </section>
      )}

      {/* UI section */}
      <section className="bg-gray-800 rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold">
          Employee list ({filteredEmployees.length}
          {employees.data && filteredEmployees.length !== employees.data.length
            ? ` / ${employees.data.length}`
            : ""}
          )
        </h2>

        {employees.loading && <p className="text-gray-400">Loading...</p>}
        {employees.error && (
          <p className="text-red-400 text-sm">{employees.error.message}</p>
        )}

        {filteredEmployees.map((emp) => {
          // Implementation note.
          const levels = getEmployeeLevels(emp);

          return (
            <div
              key={emp.pda.toBase58()}
              className="bg-gray-700 rounded p-4 space-y-2"
            >
              {/* UI section */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-gray-400">
                    #{emp.employeeId.toString()}
                  </span>
                  <span className="font-medium">{emp.name}</span>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded ${
                      emp.active
                        ? "bg-emerald-700/50 text-emerald-300"
                        : "bg-red-800/50 text-red-300"
                    }`}
                  >
                    {emp.active ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="text-xs text-gray-400">
                  {emp.owner.toBase58().slice(0, 8)}…
                  {emp.owner.toBase58().slice(-4)}
                </div>
              </div>

              {/* UI section */}
              <div className="flex items-center gap-3 flex-wrap">
                {/* Department/Role */}
                <span className="text-xs bg-gray-600 px-2 py-0.5 rounded">
                  🏢 {levels.deptName} / {levels.roleName}
                </span>
                {/* Rolelevel */}
                <span className="text-xs bg-blue-600/30 text-blue-300 px-2 py-0.5 rounded">
                  Rolelevel: Lv.{levels.roleLevel}
                </span>
                {/* UI section */}
                {levels.tempLevel !== null &&
                  levels.tempLevel !== undefined && (
                    <span className="text-xs bg-orange-600/30 text-orange-300 px-2 py-0.5 rounded">
                      Temporarylevel: Lv.{levels.tempLevel}
                    </span>
                  )}
                {/* UI section */}
                <span
                  className={`text-xs px-2 py-0.5 rounded font-semibold ${
                    levels.tempLevel !== null && levels.tempLevel !== undefined
                      ? "bg-orange-600/50 text-orange-200" // Orange indicates the temporary level is active
                      : "bg-blue-600/50 text-blue-200" // Blue indicates the role level is active
                  }`}
                >
                  ⭐ Effectivelevel: Lv.{levels.effectiveLevel}
                </span>
                {/* UI section */}
                <button
                  onClick={() => startEditTempLevel(emp)}
                  className="text-xs text-yellow-400 hover:text-yellow-300 underline"
                >
                  ⚡ Set temporary level
                </button>
              </div>

              {/* UI section */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-gray-400">
                <div>
                  Employee ID:{" "}
                  <span className="text-gray-200">
                    {emp.employeeId.toString()}
                  </span>
                </div>
                <div>
                  Bump: <span className="text-gray-200">{emp.bump}</span>
                </div>
                <div>
                  ActiveStatus:{" "}
                  <span
                    className={emp.active ? "text-emerald-400" : "text-red-400"}
                  >
                    {emp.active ? "Yes" : "No"}
                  </span>
                </div>
                <div>
                  Can create polls:{" "}
                  <span
                    className={
                      emp.allowCreatePoll ? "text-emerald-400" : "text-red-400"
                    }
                  >
                    {emp.allowCreatePoll ? "Yes" : "No"}
                  </span>
                </div>
                <div>
                  Can vote:{" "}
                  <span
                    className={
                      emp.allowVote ? "text-emerald-400" : "text-red-400"
                    }
                  >
                    {emp.allowVote ? "Yes" : "No"}
                  </span>
                </div>
                <div>
                  Primary role PDA:{" "}
                  <span className="text-gray-300">
                    {emp.mainRoleKey.toBase58().slice(0, 8)}…
                  </span>
                </div>
              </div>

              {/* UI section */}
              <div className="text-xs text-gray-500 break-all space-y-0.5">
                <div>Employee PDA: {emp.pda.toBase58()}</div>
                <div>Wallet address: {emp.owner.toBase58()}</div>
                <div>Primary role PDA: {emp.mainRoleKey.toBase58()}</div>
              </div>

              {/* UI section */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => handleToggle(emp, "active")}
                  disabled={updateEmployee.loading}
                  className={`px-2 py-1 rounded text-xs transition-colors ${
                    emp.active
                      ? "bg-emerald-700 hover:bg-emerald-800"
                      : "bg-red-800 hover:bg-red-700"
                  }`}
                >
                  {emp.active ? "Active ✅" : "Inactive ❌"}
                </button>
                <button
                  onClick={() => handleToggle(emp, "allowCreatePoll")}
                  disabled={updateEmployee.loading}
                  className={`px-2 py-1 rounded text-xs transition-colors ${
                    emp.allowCreatePoll
                      ? "bg-emerald-700 hover:bg-emerald-800"
                      : "bg-gray-600 hover:bg-gray-500"
                  }`}
                >
                  Create polls {emp.allowCreatePoll ? "✅" : "❌"}
                </button>
                <button
                  onClick={() => handleToggle(emp, "allowVote")}
                  disabled={updateEmployee.loading}
                  className={`px-2 py-1 rounded text-xs transition-colors ${
                    emp.allowVote
                      ? "bg-emerald-700 hover:bg-emerald-800"
                      : "bg-gray-600 hover:bg-gray-500"
                  }`}
                >
                  Vote {emp.allowVote ? "✅" : "❌"}
                </button>
              </div>
            </div>
          );
        })}

        {/* Empty state */}
        {filteredEmployees.length === 0 && !employees.loading && (
          <p className="text-gray-500 text-center py-4">
            {searchMode === "all"
              ? "No employees yet. Create a department and role before adding employees."
              : searchMode === "id"
              ? "No employee found with this ID."
              : searchMode === "name"
              ? "No employees match that name."
              : filterDept
              ? filterRolePda
                ? "No employees in this department or role."
                : "No employees in this department."
              : "Select a department first."}
          </p>
        )}
      </section>

      {/* Global update error */}
      {updateEmployee.error && (
        <p className="text-red-400 text-sm">{updateEmployee.error.message}</p>
      )}
    </div>
  );
}
