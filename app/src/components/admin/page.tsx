/**
 * admin/page.tsx — Admin dashboard
 *
 * Features:
 * 1. Initialize, view, and update PollConfig (global poll configuration)
 * 2. Initialize and view EmployeeConfig (global employee configuration)
 * 3. Navigate to department, role, and employee management pages
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  useIsAdmin,
  usePollConfig,
  useEmployeeConfig,
  useInitPollConfig,
  useInitEmployeeConfig,
  useUpdatePollConfig,
} from "@/hooks";

export default function AdminPage() {
  const { publicKey } = useWallet();
  const isAdmin = useIsAdmin();

  // ── Data fetching ────────────────────────────────────────
  const pollConfig = usePollConfig();
  const employeeConfig = useEmployeeConfig();

  // ── Operation hooks ──────────────────────────────────────
  const initPollConfig = useInitPollConfig();
  const initEmployeeConfig = useInitEmployeeConfig();
  const updatePollConfig = useUpdatePollConfig();

  // ── PollConfig update form state ──────────────────────────
  const [formAllowCreate, setFormAllowCreate] = useState(true);
  const [formMinInterval, setFormMinInterval] = useState("");
  const [formMaxInterval, setFormMaxInterval] = useState("");
  const [formMinLevel, setFormMinLevel] = useState("");

  // ── General message ──────────────────────────────────────
  const [msg, setMsg] = useState("");

  // ── Access guard ─────────────────────────────────────────
  if (!publicKey) {
    return <p className="p-8 text-center text-gray-400">Connect your wallet first.</p>;
  }
  if (!isAdmin) {
    return <p className="p-8 text-center text-red-400">⛔ Admin access only.</p>;
  }

  // ── Initialize PollConfig ─────────────────────────────────
  const handleInitPollConfig = async () => {
    setMsg("");
    const tx = await initPollConfig.execute();
    if (tx) {
      setMsg("PollConfig initialized successfully! TX: " + tx.slice(0, 20) + "...");
      pollConfig.refetch();
    }
  };

  // ── Initialize EmployeeConfig ─────────────────────────────
  const handleInitEmployeeConfig = async () => {
    setMsg("");
    const tx = await initEmployeeConfig.execute();
    if (tx) {
      setMsg("EmployeeConfig initialized successfully! TX: " + tx.slice(0, 20) + "...");
      employeeConfig.refetch();
    }
  };

  // ── Update PollConfig ─────────────────────────────────────
  // UpdatePollConfigInput fields are `number | undefined`; use undefined to
  // leave a field unchanged rather than passing null or BigInt.
  const handleUpdatePollConfig = async () => {
    setMsg("");
    const tx = await updatePollConfig.execute({
      allowCreatePoll: formAllowCreate,
      // Empty means undefined (unchanged); otherwise convert to a number.
      minPollingInterval: formMinInterval ? Number(formMinInterval) : undefined,
      maxPollingInterval: formMaxInterval ? Number(formMaxInterval) : undefined,
      minAllowCreatePoll: formMinLevel ? Number(formMinLevel) : undefined,
    });
    if (tx) {
      setMsg("PollConfig updated successfully!");
      pollConfig.refetch();
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>

      {/* ── General message ────────────────────────────────── */}
      {msg && (
        <div className="bg-gray-800 border border-gray-600 rounded p-3 text-sm text-emerald-400">
          {msg}
        </div>
      )}

      {/* ================================================================
          Global Poll Configuration (PollConfig)
          ================================================================ */}
      <section className="bg-gray-800 rounded-lg p-6 space-y-4">
        <h2 className="text-xl font-semibold">Global poll configuration (PollConfig)</h2>

        {pollConfig.loading && <p className="text-gray-400">Loading...</p>}

        {/* Not initialized: show the initialization button */}
        {pollConfig.error && (
          <div className="space-y-2">
            <p className="text-yellow-400">PollConfig is not initialized or failed to load.</p>
            <button
              onClick={handleInitPollConfig}
              disabled={initPollConfig.loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 rounded text-sm"
            >
              {initPollConfig.loading ? "Initializing..." : "Initialize PollConfig"}
            </button>
            {initPollConfig.error && (
              <p className="text-red-400 text-sm">{initPollConfig.error.message}</p>
            )}
          </div>
        )}

        {/* Initialized: show current values and the update form */}
        {pollConfig.data && (
          <div className="space-y-4">
            {/* Current values */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-gray-400">Total polls:</span>
              <span>{pollConfig.data.totalPolls.toString()}</span>
              <span className="text-gray-400">Poll creation allowed:</span>
              <span className={pollConfig.data.allowCreatePoll ? "text-emerald-400" : "text-red-400"}>
                {pollConfig.data.allowCreatePoll ? "Yes" : "No"}
              </span>
              <span className="text-gray-400">Minimum poll interval:</span>
              <span>{pollConfig.data.minPollingInterval.toString()} seconds</span>
              <span className="text-gray-400">Maximum poll interval:</span>
              <span>{pollConfig.data.maxPollingInterval.toString()} seconds</span>
              <span className="text-gray-400">Minimum level to create polls:</span>
              <span>{pollConfig.data.minAllowCreatePoll}</span>
            </div>

            {/* Update form */}
            <div className="border-t border-gray-700 pt-4 space-y-3">
              <h3 className="text-lg font-medium">Update Configuration</h3>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formAllowCreate}
                  onChange={(e) => setFormAllowCreate(e.target.checked)}
                />
                Allow poll creation
              </label>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-400">Minimum poll interval (seconds)</label>
                  <input
                    type="number"
                    value={formMinInterval}
                    onChange={(e) => setFormMinInterval(e.target.value)}
                    placeholder="Leave blank to keep unchanged"
                    className="w-full bg-gray-700 rounded px-3 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Maximum poll interval (seconds)</label>
                  <input
                    type="number"
                    value={formMaxInterval}
                    onChange={(e) => setFormMaxInterval(e.target.value)}
                    placeholder="Leave blank to keep unchanged"
                    className="w-full bg-gray-700 rounded px-3 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Minimum level to create polls</label>
                  <input
                    type="number"
                    value={formMinLevel}
                    onChange={(e) => setFormMinLevel(e.target.value)}
                    placeholder="Leave blank to keep unchanged"
                    className="w-full bg-gray-700 rounded px-3 py-1.5 text-sm"
                  />
                </div>
              </div>

              <button
                onClick={handleUpdatePollConfig}
                disabled={updatePollConfig.loading}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 px-4 py-2 rounded text-sm"
              >
                {updatePollConfig.loading ? "Submitting..." : "Update Configuration"}
              </button>
              {updatePollConfig.error && (
                <p className="text-red-400 text-sm">{updatePollConfig.error.message}</p>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ================================================================
          Global Employee Configuration (EmployeeConfig)
          ================================================================ */}
      <section className="bg-gray-800 rounded-lg p-6 space-y-4">
        <h2 className="text-xl font-semibold">Global employee configuration (EmployeeConfig)</h2>

        {employeeConfig.loading && <p className="text-gray-400">Loading...</p>}

        {employeeConfig.error && (
          <div className="space-y-2">
            <p className="text-yellow-400">EmployeeConfig is not initialized or failed to load.</p>
            <button
              onClick={handleInitEmployeeConfig}
              disabled={initEmployeeConfig.loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 rounded text-sm"
            >
              {initEmployeeConfig.loading ? "Initializing..." : "Initialize EmployeeConfig"}
            </button>
            {initEmployeeConfig.error && (
              <p className="text-red-400 text-sm">{initEmployeeConfig.error.message}</p>
            )}
          </div>
        )}

        {employeeConfig.data && (
          <p className="text-sm">
            Next available global employee ID:
            <span className="text-emerald-400 font-mono ml-2">
              {employeeConfig.data.globalEmployeeId.toString()}
            </span>
          </p>
        )}
      </section>

      {/* ================================================================
          Quick Links
          ================================================================ */}
      <div className="grid grid-cols-3 gap-4">
        <Link href="/admin/departments" className="bg-gray-800 hover:bg-gray-700 rounded-lg p-6 text-center transition-colors">
          <div className="text-3xl mb-2">🏢</div>
          <div className="font-medium">Department Management</div>
        </Link>
        <Link href="/admin/roles" className="bg-gray-800 hover:bg-gray-700 rounded-lg p-6 text-center transition-colors">
          <div className="text-3xl mb-2">👔</div>
          <div className="font-medium">Role Management</div>
        </Link>
        <Link href="/admin/employees" className="bg-gray-800 hover:bg-gray-700 rounded-lg p-6 text-center transition-colors">
          <div className="text-3xl mb-2">👤</div>
          <div className="font-medium">Employee Management</div>
        </Link>
      </div>
    </div>
  );
}