/**
 * admin/roles/page.tsx — Role management
 *
 * Features:
 * 1. View all roles, including full PDA data
 * 2. Select a department to view its roles
 * 3. Create roles
 * 4. Toggle allowCreatePoll / allowVote permissions
 */
"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  useIsAdmin,
  useAllDepartments,
  useAllRoles,
  useCreateRole,
  useUpdateRole,
} from "@/hooks";
import type { RoleListItem } from "@/hooks";

export default function RolesPage() {
  const { publicKey } = useWallet();
  const isAdmin = useIsAdmin();

  // ── Data ──────────────────────────────────────────────────
  const departments = useAllDepartments();
  const roles = useAllRoles();

  // ── Operations ───────────────────────────────────────────
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();

  // ── Create role form ──────────────────────────────────────
  const [formRoleName, setFormRoleName] = useState("");
  const [formRoleLevel, setFormRoleLevel] = useState("");
  const [formDeptName, setFormDeptName] = useState("");
  const [msg, setMsg] = useState("");

  // ── Filter state: show a department's roles when selected ──
  const [filterDept, setFilterDept] = useState("");

  // ── Filter roles by department ────────────────────────────
  const filteredRoles = useMemo(() => {
    if (!roles.data) return [];
    // Show all roles when no department is selected
    if (!filterDept) return roles.data;
    return roles.data.filter((r) => r.departmentName === filterDept);
  }, [roles.data, filterDept]);

  // ── Group filtered roles by department for display ────────
  const grouped = useMemo(() => {
    const map: Record<string, RoleListItem[]> = {};
    filteredRoles.forEach((r) => {
      if (!map[r.departmentName]) map[r.departmentName] = [];
      map[r.departmentName].push(r);
    });
    return map;
  }, [filteredRoles]);

  // ── Access guard ─────────────────────────────────────────
  if (!publicKey)
    return (
      <p className="p-8 text-center text-gray-400">Connect your wallet first.</p>
    );
  if (!isAdmin)
    return (
      <p className="p-8 text-center text-red-400">⛔ Admin access only.</p>
    );

  // ── Create role ───────────────────────────────────────────
  const handleCreate = async () => {
    if (!formRoleName.trim() || !formRoleLevel || !formDeptName) return;
    setMsg("");
    const tx = await createRole.execute({
      roleName: formRoleName.trim(),
      roleLevel: Number(formRoleLevel),
      departmentName: formDeptName,
    });
    if (tx) {
      setMsg(`✅ Role “${formRoleName.trim()}” created successfully!`);
      setFormRoleName("");
      setFormRoleLevel("");
      roles.refetch();
    }
  };

  // ── Toggle permissions ────────────────────────────────────
  const handleToggleCreatePoll = async (role: RoleListItem) => {
    setMsg("");
    const tx = await updateRole.execute({
      roleName: role.roleName,
      departmentName: role.departmentName,
      params: { allowCreatePoll: !role.allowCreatePoll },
    });
    if (tx) {
      setMsg(`Poll creation permission updated for “${role.roleName}”.`);
      roles.refetch();
    }
  };

  const handleToggleVote = async (role: RoleListItem) => {
    setMsg("");
    const tx = await updateRole.execute({
      roleName: role.roleName,
      departmentName: role.departmentName,
      params: { allowVote: !role.allowVote },
    });
    if (tx) {
      setMsg(`Voting permission updated for “${role.roleName}”.`);
      roles.refetch();
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* ── Header ────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin"
          className="text-blue-400 hover:text-blue-300 text-sm"
        >
          ← Back to Admin Dashboard
        </Link>
        <h1 className="text-2xl font-bold">👔 Role Management</h1>
      </div>

      {msg && (
        <div className="bg-gray-800 border border-gray-600 rounded p-3 text-sm text-emerald-400">
          {msg}
        </div>
      )}

      {/* ── Create role ───────────────────────────────── */}
      <section className="bg-gray-800 rounded-lg p-6 space-y-3">
        <h2 className="text-lg font-semibold">Create Role</h2>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-gray-400">Role name</label>
            <input
              type="text"
              value={formRoleName}
              onChange={(e) => setFormRoleName(e.target.value)}
              placeholder="e.g. Engineer"
              className="w-full bg-gray-700 rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400">
              Level (higher numbers indicate seniority)
            </label>
            <input
              type="number"
              value={formRoleLevel}
              onChange={(e) => setFormRoleLevel(e.target.value)}
              placeholder="e.g. 3"
              min={0}
              className="w-full bg-gray-700 rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400">Department</label>
            <select
              value={formDeptName}
              onChange={(e) => setFormDeptName(e.target.value)}
              className="w-full bg-gray-700 rounded px-3 py-2 text-sm"
            >
              <option value="">-- Select a department --</option>
              {departments.data?.map((d) => (
                <option key={d.pda.toBase58()} value={d.departmentName}>
                  {d.departmentName}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button
          onClick={handleCreate}
          disabled={
            createRole.loading ||
            !formRoleName.trim() ||
            !formRoleLevel ||
            !formDeptName
          }
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 rounded text-sm"
        >
          {createRole.loading ? "Creating..." : "Create Role"}
        </button>
        {createRole.error && (
          <p className="text-red-400 text-sm">
            {createRole.error.message}
          </p>
        )}
      </section>

      {/* ── Department filter ─────────────────────────── */}
      <section className="bg-gray-800 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-400">Filter by department:</label>
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="bg-gray-700 rounded px-3 py-2 text-sm min-w-[200px]"
          >
            <option value="">All departments</option>
            {departments.data?.map((d) => (
              <option key={d.pda.toBase58()} value={d.departmentName}>
                {d.departmentName}
              </option>
            ))}
          </select>
          <span className="text-xs text-gray-500">
            {filteredRoles.length} roles
          </span>
        </div>
      </section>

      {/* ── Role list, grouped by department ──────────── */}
      <section className="bg-gray-800 rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold">
          {filterDept
            ? `Roles in ${filterDept} (${filteredRoles.length})`
            : `All roles (${roles.data?.length ?? 0})`}
        </h2>

        {roles.loading && <p className="text-gray-400">Loading...</p>}
        {roles.error && (
          <p className="text-red-400 text-sm">{roles.error.message}</p>
        )}

        {Object.entries(grouped).map(([deptName, deptRoles]) => (
          <div key={deptName} className="space-y-2">
            {/* Department heading */}
            <h3 className="text-sm font-medium text-gray-300 border-b border-gray-700 pb-1">
              🏢 {deptName}
            </h3>

            {deptRoles.map((role) => (
              <div
                key={role.pda.toBase58()}
                className="bg-gray-700 rounded p-4 ml-4 space-y-2"
              >
                {/* Role name, level, and actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{role.roleName}</span>
                    <span className="text-xs bg-blue-600/30 text-blue-300 px-1.5 py-0.5 rounded">
                      Lv.{role.roleLevel}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleToggleCreatePoll(role)}
                      disabled={updateRole.loading}
                      className={`px-3 py-1 rounded text-xs transition-colors ${
                        role.allowCreatePoll
                          ? "bg-emerald-700 hover:bg-emerald-800"
                          : "bg-gray-600 hover:bg-gray-500"
                      }`}
                    >
                      Can create polls {role.allowCreatePoll ? "✅" : "❌"}
                    </button>
                    <button
                      onClick={() => handleToggleVote(role)}
                      disabled={updateRole.loading}
                      className={`px-3 py-1 rounded text-xs transition-colors ${
                        role.allowVote
                          ? "bg-emerald-700 hover:bg-emerald-800"
                          : "bg-gray-600 hover:bg-gray-500"
                      }`}
                    >
                      Can vote {role.allowVote ? "✅" : "❌"}
                    </button>
                  </div>
                </div>

                {/* ── Full PDA data ─────────────────── */}
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
                  <div>
                    Department:{" "}
                    <span className="text-gray-200">
                      {role.departmentName}
                    </span>
                  </div>
                  <div>
                    Members:{" "}
                    <span className="text-gray-200">
                      {role.members}
                    </span>
                  </div>
                  <div>
                    Level:{" "}
                    <span className="text-blue-300">
                      Lv.{role.roleLevel}
                    </span>
                  </div>
                  <div>
                    Bump:{" "}
                    <span className="text-gray-200">{role.bump}</span>
                  </div>
                  <div>
                    Poll creation allowed:{" "}
                    <span
                      className={
                        role.allowCreatePoll
                          ? "text-emerald-400"
                          : "text-red-400"
                      }
                    >
                      {role.allowCreatePoll ? "Yes" : "No"}
                    </span>
                  </div>
                  <div>
                    Voting allowed:{" "}
                    <span
                      className={
                        role.allowVote
                          ? "text-emerald-400"
                          : "text-red-400"
                      }
                    >
                      {role.allowVote ? "Yes" : "No"}
                    </span>
                  </div>
                </div>
                {/* Full PDA address */}
                <div className="text-xs text-gray-500 break-all">
                  PDA: {role.pda.toBase58()}
                </div>
              </div>
            ))}
          </div>
        ))}

        {filteredRoles.length === 0 && !roles.loading && (
          <p className="text-gray-500 text-center py-4">
            {filterDept
              ? `No roles in ${filterDept} yet.`
              : "No roles yet. Create a department before adding roles."}
          </p>
        )}
      </section>

      {updateRole.error && (
        <p className="text-red-400 text-sm">{updateRole.error.message}</p>
      )}
    </div>
  );
}