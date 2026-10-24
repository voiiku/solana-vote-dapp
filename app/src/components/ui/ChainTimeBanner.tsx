/**
 * ChainTimeBanner.tsx — Reusable on-chain time monitor
 *
 * Features:
 * 1. Fetches the on-chain time every 60 seconds and compares it with system time
 * 2. Updates the displayed clocks every second
 * 3. Uses different colors (green/yellow/orange) based on the drift
 * 4. Recommends a minimum lead time for the poll start
 *
 * On Solana localnet, the on-chain clock may differ from the system clock,
 * often running a few minutes ahead. Drift accumulates because slot production
 * does not perfectly match real time and resets when the validator restarts.
 */
"use client";

import { useState, useEffect } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { getChainTimestamp } from "@/lib/utils";

/** Buffer in seconds for the time required to process an on-chain transaction */
const TX_BUFFER = 10;

export function ChainTimeBanner() {
  const { connection } = useConnection();

  // ── Drift measurement (refreshed every 60 seconds) ──
  const [driftInfo, setDriftInfo] = useState<{
    drift: number;       // Drift in seconds: positive means the chain is ahead
    measuredAt: number;  // System timestamp at measurement (seconds)
  } | null>(null);

  // ── System time updated every second for live display ──
  // Lazy initialization avoids calling Date.now() on every render (React purity rule)
  const [tickNow, setTickNow] = useState(() => Math.floor(Date.now() / 1000));

  // Fetch the on-chain time and calculate drift every 60 seconds
  useEffect(() => {
    let cancelled = false;
    const measure = async () => {
      try {
        const chainNow = await getChainTimestamp(connection);
        const sysNow = Math.floor(Date.now() / 1000);
        if (!cancelled) {
          setDriftInfo({ drift: chainNow - sysNow, measuredAt: sysNow });
        }
      } catch (e) {
        console.warn("[On-chain time monitor] Failed to fetch time:", e);
      }
    };
    measure(); // Measure immediately on page load
    const id = setInterval(measure, 60_000); // Refresh every 60 seconds
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [connection]);

  // Update the displayed time every second
  useEffect(() => {
    const id = setInterval(() => {
      setTickNow(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // ── Calculate the dynamic buffer ──
  // Formula: ceil((|drift| + TX_BUFFER) / 60), rounded up to minutes
  const currentDrift = driftInfo?.drift ?? 0;
  const absDrift = Math.abs(currentDrift);
  const bufferMinutes = Math.max(1, Math.ceil((absDrift + TX_BUFFER) / 60));

  // Estimate on-chain time from the last measured drift and current system time
  const estimatedChainNow = tickNow + currentDrift;

  // ── Loading state ──
  if (driftInfo == null) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-400">
        Fetching on-chain time...
      </div>
    );
  }

  // ── Choose colors based on the amount of drift ──
  const borderColor =
    absDrift <= 5
      ? "border-green-700"
      : absDrift <= 60
        ? "border-yellow-700"
        : "border-orange-700";
  const bgColor =
    absDrift <= 5
      ? "bg-green-900/20"
      : absDrift <= 60
        ? "bg-yellow-900/20"
        : "bg-orange-900/20";
  const driftColor =
    absDrift <= 5
      ? "text-green-400"
      : absDrift <= 60
        ? "text-yellow-400"
        : "text-orange-400";

  return (
    <div className={`${bgColor} border ${borderColor} rounded-lg px-4 py-3 text-sm`}>
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-gray-300">
        {/* On-chain time, estimated using the latest drift */}
        <span>
          On-chain time:
          <span className="font-mono font-medium text-white">
            {new Date(estimatedChainNow * 1000).toLocaleTimeString()}
          </span>
        </span>
        {/* System time, updated every second */}
        <span>
          System time:
          <span className="font-mono font-medium text-white">
            {new Date(tickNow * 1000).toLocaleTimeString()}
          </span>
        </span>
        {/* Clock drift */}
        <span className={driftColor}>
          {absDrift <= 5
            ? `Drift: ${currentDrift}s (synchronized)`
            : `Drift: ${currentDrift > 0 ? "+" : ""}${currentDrift}s (chain ${currentDrift > 0 ? "ahead" : "behind"} by ${Math.floor(absDrift / 60)}m ${absDrift % 60}s)`}
        </span>
      </div>
      {/* Show a recommendation only when drift is significant */}
      {absDrift > 5 && (
        <div className="text-xs text-gray-400 mt-1">
          When creating a poll, set its start time at least{" "}
          <span className="text-white font-medium">{bufferMinutes} minutes</span> ahead
          (drift is remeasured every 60 seconds).
        </div>
      )}
    </div>
  );
}