/**
 * admin/departments/page.tsx — Department management
 *
 * Features:
 * 1. View all departments, including full PDA data
 * 2. Search departments by name
 * 3. Create departments
 * 4. Toggle allowCreatePoll / allowVote permissions
 */
"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  useIsAdmin,
  useAllDepartments,
  useCreateDepartment,
  useUpdateDepartment,
} from "@/hooks";
import type { DepartmentListItem } from "@/hooks";

export default function DepartmentsPage() {
  const { publicKey } = useWallet();
  const isAdmin = useIsAdmin();

  // ── Data ──────────────────────────────────────────────────
  const departments = useAllDepartments();

  // ── Operations ───────────────────────────────────────────
  const createDept = useCreateDepartment();
  const updateDept = useUpdateDepartment();

  // ── Form state ────────────────────────────────────────────
  const [newName, setNewName] = useState("");
  const [msg, setMsg] = useState("");

  // ── Search state ─────────────────────────────────────────
  const [search, setSearch] = useState("");

  // ── Filter by name ───────────────────────────────────────
  // Fuzzy-match the loaded department list in the frontend (case-insensitive)
  const filteredDepts = useMemo(() => {
    if (!departments.data) return [];
    if (!search.trim()) return departments.data;
    const keyword = search.trim().toLowerCase();
    return departments.data.filter((d) =>
      d.departmentName.toLowerCase().includes(keyword)
    );
  }, [departments.data, search]);

  // ── Access guard (must come after all hooks) ──────────────
  if (!publicKey)
    return (
      <p className="p-8 text-center text-gray-400">Connect your wallet first.</p>
    );
  if (!isAdmin)
    return (
      <p className="p-8 text-center text-red-400">⛔ Admin access only.</p>
    );

  // ── Create department ─────────────────────────────────────
  const handleCreate = async () => {
    if (!newName.trim()) return;
    setMsg("");
    const tx = await createDept.execute(newName.trim());
    if (tx) {
      setMsg(`✅ Department “${newName.trim()}” created successfully!`);
      setNewName("");
      departments.refetch();
    }
  };

  // ── Toggle department permissions ────────────────────────
  const handleToggleCreatePoll = async (dept: DepartmentListItem) => {
    setMsg("");
    const tx = await updateDept.execute({
      departmentName: dept.departmentName,
      params: { allowCreatePoll: !dept.allowCreatePoll },
    });
    if (tx) {
      setMsg(`Poll creation permission updated for “${dept.departmentName}”.`);
      departments.refetch();
    }
  };

  const handleToggleVote = async (dept: DepartmentListItem) => {
    setMsg("");
    const tx = await updateDept.execute({
      departmentName: dept.departmentName,
      params: { allowVote: !dept.allowVote },
    });
    if (tx) {
      setMsg(`Voting permission updated for “${dept.departmentName}”.`);
      departments.refetch();
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
        <h1 className="text-2xl font-bold">🏢 Department Management</h1>
      </div>

      {/* ── Message ───────────────────────────────────── */}
      {msg && (
        <div className="bg-gray-800 border border-gray-600 rounded p-3 text-sm text-emerald-400">
          {msg}
        </div>
      )}

      {/* ── Create department ─────────────────────────── */}
      <section className="bg-gray-800 rounded-lg p-6 space-y-3">
        <h2 className="text-lg font-semibold">Create Department</h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Enter department name"
            className="flex-1 bg-gray-700 rounded px-3 py-2 text-sm"
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <button
            onClick={handleCreate}
            disabled={createDept.loading || !newName.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 rounded text-sm"
          >
            {createDept.loading ? "Creating..." : "Create"}
          </button>
        </div>
        {createDept.error && (
          <p className="text-red-400 text-sm">{createDept.error.message}</p>
        )}
      </section>

      {/* ── Search bar ────────────────────────────────── */}
      <section className="bg-gray-800 rounded-lg p-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Search departments by name..."
          className="w-full bg-gray-700 rounded px-3 py-2 text-sm"
        />
      </section>

      {/* ── Department list ───────────────────────────── */}
      <section className="bg-gray-800 rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold">
          {search
            ? `Search results (${filteredDepts.length})`
            : `Departments (${departments.data?.length ?? 0})`}
        </h2>

        {departments.loading && (
          <p className="text-gray-400">Loading...</p>
        )}
        {departments.error && (
          <p className="text-red-400 text-sm">
            {departments.error.message}
          </p>
        )}

        {filteredDepts.map((dept) => (
          <div
            key={dept.pda.toBase58()}
            className="bg-gray-700 rounded p-4 space-y-2"
          >
            {/* Name and action buttons */}
            <div className="flex items-center justify-between">
              <div className="font-medium text-lg">
                {dept.departmentName}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleToggleCreatePoll(dept)}
                  disabled={updateDept.loading}
                  className={`px-3 py-1 rounded text-xs transition-colors ${
                    dept.allowCreatePoll
                      ? "bg-emerald-700 hover:bg-emerald-800"
                      : "bg-gray-600 hover:bg-gray-500"
                  }`}
                >
                  Can create polls {dept.allowCreatePoll ? "✅" : "❌"}
                </button>
                <button
                  onClick={() => handleToggleVote(dept)}
                  disabled={updateDept.loading}
                  className={`px-3 py-1 rounded text-xs transition-colors ${
                    dept.allowVote
                      ? "bg-emerald-700 hover:bg-emerald-800"
                      : "bg-gray-600 hover:bg-gray-500"
                  }`}
                >
                  Can vote {dept.allowVote ? "✅" : "❌"}
                </button>
              </div>
            </div>

            {/* ── Full PDA data ─────────────────────── */}
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
              <div>
                Members:{" "}
                <span className="text-gray-200">{dept.members}</span>
              </div>
              <div>
                Bump: <span className="text-gray-200">{dept.bump}</span>
              </div>
              <div>
                Poll creation allowed:{" "}
                <span
                  className={
                    dept.allowCreatePoll
                      ? "text-emerald-400"
                      : "text-red-400"
                  }
                >
                  {dept.allowCreatePoll ? "Yes" : "No"}
                </span>
              </div>
              <div>
                Voting allowed:{" "}
                <span
                  className={
                    dept.allowVote ? "text-emerald-400" : "text-red-400"
                  }
                >
                  {dept.allowVote ? "Yes" : "No"}
                </span>
              </div>
            </div>
            {/* Full PDA address (not truncated) */}
            <div className="text-xs text-gray-500 break-all">
              PDA: {dept.pda.toBase58()}
            </div>
          </div>
        ))}

        {/* Empty state */}
        {filteredDepts.length === 0 && !departments.loading && (
          <p className="text-gray-500 text-center py-4">
            {search ? "No matching departments found." : "No departments yet. Create one to get started."}
          </p>
        )}
      </section>

      {/* Global update error */}
      {updateDept.error && (
        <p className="text-red-400 text-sm">{updateDept.error.message}</p>
      )}
    </div>
  );
}