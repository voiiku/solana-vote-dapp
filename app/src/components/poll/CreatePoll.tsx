/**
 * CreatePoll.tsx — Create poll form
 *
 * Features:
 * 1. Verify that the user is an employee with allowCreatePoll permission
 * 2. Collect poll details (title, description, schedule, level range, etc.)
 * 3. Validate levels (0–31), choice count (1–20), and times
 * 4. Monitor on-chain time every 60 seconds and calculate a safe start-time buffer
 * 5. Create a poll with useCreatePoll()
 * 6. Open the poll details page after creation so candidates can be added
 *
 * After creation, a poll starts in Draft. The creator must use the details page
 * to add candidates, optionally set allowlists/blocklists, and change the
 * status to Ready.
 *
 * The Solana localnet clock may differ from system time, often running a few
 * minutes ahead. This component uses getChainTimestamp to display the drift
 * and calculates a safe minimum lead time at submission, rounded up to a
 * whole minute, to avoid on-chain validation failures.
 *
 * Updates:
 * - defaultStartTime/defaultEndTime are based on the current time
 * - The schedule section shows PollConfig minimum/maximum intervals
 * - The permission notice shows the effective employee level (temp_level
 *   takes precedence over role_level)
 * - Added an on-chain time monitor and dynamic time validation
 */
"use client";
import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useMyEmployee, usePollConfig, useCreatePoll } from "@/hooks";
import { getChainTimestamp } from "@/lib/utils";

// ============================================================
// Constants — program limits
// ============================================================

/** The program requires max_level < 32, so the maximum is 31 */
const MAX_LEVEL_LIMIT = 31;
/** The program requires max_multiple_choices to be between 1 and 20 */
const MIN_CHOICES = 1;
const MAX_CHOICES = 20;
/** Buffer for the time required to process an on-chain transaction (seconds) */
const TX_BUFFER = 10;

// ============================================================
// Helper functions
// ============================================================

/** Convert a datetime-local input value to a Unix timestamp in seconds */
function dateToTimestamp(dateStr: string): number {
  if (!dateStr) return 0;
  return Math.floor(new Date(dateStr).getTime() / 1000);
}

/**
 * Format a Date as a datetime-local string (YYYY-MM-DDTHH:mm) in local time.
 */
function toDatetimeLocal(d: Date): string {
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 16);
}

/**
 * Generate the default start time.
 * Set it 15 minutes ahead because the Solana localnet clock may run 5–10
 * minutes ahead of system time. On-chain validation provides a final check.
 */
function defaultStartTime(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 15, 0, 0);
  return toDatetimeLocal(d);
}

/**
 * Generate the default end time, one hour ahead. This is a reasonable
 * default within the global configuration and can be adjusted by the user.
 */
function defaultEndTime(): string {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return toDatetimeLocal(d);
}

/**
 * Format a datetime-local value for display.
 * Example: 2024-12-25T14:30 → "Dec 25, 2024, 2:30 PM"
 */
function formatChineseDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Convert seconds to a readable duration.
 * Examples: 60 → "1 minute", 3600 → "1 hour", 86400 → "1 day"
 */
function formatDuration(seconds: number): string {
  if (seconds <= 0) return "0 seconds";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} ${days === 1 ? "day" : "days"}`);
  if (hours > 0) parts.push(`${hours} ${hours === 1 ? "hour" : "hours"}`);
  if (minutes > 0) parts.push(`${minutes} ${minutes === 1 ? "minute" : "minutes"}`);
  if (secs > 0) parts.push(`${secs} ${secs === 1 ? "second" : "seconds"}`);
  return parts.join(" ");
}

// ============================================================
// Validate individual fields and show errors immediately
// ============================================================

/** Validate a numeric field and return an error message or an empty string */
function validateLevel(
  value: string,
  label: string,
  min: number,
  max: number,
): string {
  const n = Number(value);
  if (value === "" || isNaN(n)) return `${label} is required`;
  if (!Number.isInteger(n)) return `${label} must be an integer`;
  if (n < min || n > max) return `${label} must be between ${min} and ${max}`;
  return "";
}

// ============================================================
// Component
// ============================================================

export default function CreatePoll() {
  const router = useRouter();
  const { publicKey } = useWallet();
  const { connection } = useConnection();

  // ── Data fetching ─────────────────────────────────────
  const myEmployee = useMyEmployee();
  const pollConfig = usePollConfig();

  // ── Operation hook ─────────────────────────────────────
  const createPoll = useCreatePoll();

  // ── Form state ─────────────────────────────────────────
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [detailLink, setDetailLink] = useState("");
  const [minLevel, setMinLevel] = useState("0");
  const [maxLevel, setMaxLevel] = useState(String(MAX_LEVEL_LIMIT));
  const [maxChoices, setMaxChoices] = useState("1");
  const [startAt, setStartAt] = useState(defaultStartTime);
  const [endAt, setEndAt] = useState(defaultEndTime);
  const [msg, setMsg] = useState("");

  // ════════════════════════════════════════════════════════════
  // On-chain time monitor: measure clock drift every 60 seconds
  // ════════════════════════════════════════════════════════════

  /** Drift measurement (refreshed every 60 seconds) */
  const [driftInfo, setDriftInfo] = useState<{
    drift: number; // Drift in seconds: positive means the chain is ahead
    measuredAt: number; // System timestamp at measurement (seconds)
  } | null>(null);

  /** System time updated every second for live display */
  // Lazy initialization avoids calling Date.now() on every render (React purity rule)
  const [tickNow, setTickNow] = useState(() => Math.floor(Date.now() / 1000));

  // Fetch on-chain time and calculate drift every 60 seconds
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

  // ── Dynamic time buffer ──
  // Formula: ceil((|drift| + TX_BUFFER) / 60), rounded up to minutes.
  // For example, 64s drift requires 2 minutes; 0s drift requires at least 1.
  const currentDrift = driftInfo?.drift ?? 0;
  const bufferMinutes = Math.max(
    1,
    Math.ceil((Math.abs(currentDrift) + TX_BUFFER) / 60),
  );

  // Estimate on-chain time from the last measured drift and current system time
  const estimatedChainNow = tickNow + currentDrift;

  // ── Get global interval settings from pollConfig for reference ──
  const minInterval = useMemo(() => {
    if (!pollConfig.data) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = (pollConfig.data as any).minPollingInterval;
    return raw != null ? Number(raw) : null;
  }, [pollConfig.data]);

  const maxInterval = useMemo(() => {
    if (!pollConfig.data) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = (pollConfig.data as any).maxPollingInterval;
    return raw != null ? Number(raw) : null;
  }, [pollConfig.data]);

  /** Minimum poll-creation level required by the global configuration */
  const minCreateLevel = useMemo(() => {
    if (!pollConfig.data) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = (pollConfig.data as any).minAllowCreatePoll;
    return raw != null ? Number(raw) : null;
  }, [pollConfig.data]);

  // ── Validate individual fields immediately ────────────
  const minLevelErr = useMemo(
    () => validateLevel(minLevel, "Minimum level", 0, MAX_LEVEL_LIMIT),
    [minLevel],
  );

  const maxLevelErr = useMemo(
    () => validateLevel(maxLevel, "Maximum level", 0, MAX_LEVEL_LIMIT),
    [maxLevel],
  );

  /** Cross-field validation: minLevel must be less than maxLevel */
  const levelRangeErr = useMemo(() => {
    if (minLevelErr || maxLevelErr) return "";
    const min = Number(minLevel);
    const max = Number(maxLevel);
    if (min >= max) return "Minimum level must be less than maximum level";
    return "";
  }, [minLevel, maxLevel, minLevelErr, maxLevelErr]);

  const maxChoicesErr = useMemo(() => {
    const n = Number(maxChoices);
    if (maxChoices === "" || isNaN(n)) return "Maximum choices is required";
    if (!Number.isInteger(n)) return "Must be an integer";
    if (n < MIN_CHOICES || n > MAX_CHOICES)
      return `Maximum choices must be between ${MIN_CHOICES} and ${MAX_CHOICES}`;
    return "";
  }, [maxChoices]);

  // ── Validate time intervals against global settings ────
  const timeErr = useMemo(() => {
    const startTs = dateToTimestamp(startAt);
    const endTs = dateToTimestamp(endAt);
    if (!startTs) return "Set a start time";
    if (!endTs) return "Set an end time";
    if (startTs >= endTs) return "Start time must be before end time";

    if (minInterval != null && endTs - startTs < minInterval) {
      return `Poll duration must be at least the global minimum interval (${formatDuration(minInterval)})`;
    }
    if (maxInterval != null && endTs - startTs > maxInterval) {
      return `Poll duration cannot exceed the global maximum interval (${formatDuration(maxInterval)})`;
    }
    return "";
  }, [startAt, endAt, minInterval, maxInterval]);

  // ── Form validation (used to disable the submit button) ──
  const validation = useMemo(() => {
    const errors: string[] = [];
    if (!title.trim()) errors.push("Title is required");
    if (title.trim().length > 60) errors.push("Title cannot exceed 60 characters");
    if (!description.trim()) errors.push("Description is required");
    if (description.trim().length > 60) errors.push("Description cannot exceed 60 characters");
    if (detailLink && detailLink.length > 60)
      errors.push("Details link cannot exceed 60 characters");
    if (minLevelErr) errors.push(minLevelErr);
    if (maxLevelErr) errors.push(maxLevelErr);
    if (levelRangeErr) errors.push(levelRangeErr);
    if (maxChoicesErr) errors.push(maxChoicesErr);
    if (timeErr) errors.push(timeErr);
    return errors;
  }, [
    title,
    description,
    detailLink,
    minLevelErr,
    maxLevelErr,
    levelRangeErr,
    maxChoicesErr,
    timeErr,
  ]);

  // ── Access guard (after all hooks) ─────────────────────
  if (!publicKey) {
    return <p className="p-8 text-center text-gray-400">Connect your wallet first.</p>;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const emp = myEmployee.data as any;

  if (myEmployee.loading) {
    return <p className="p-8 text-center text-gray-400">Loading...</p>;
  }

  if (!emp) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center space-y-4">
        <p className="text-red-400">No employee record found. You cannot create polls.</p>
        <Link href="/" className="text-blue-400 hover:text-blue-300 text-sm">
          &larr; Back to Home
        </Link>
      </div>
    );
  }

  if (!emp.active) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center space-y-4">
        <p className="text-red-400">Your employee account is inactive. You cannot create polls.</p>
        <Link href="/" className="text-blue-400 hover:text-blue-300 text-sm">
          &larr; Back to Home
        </Link>
      </div>
    );
  }

  if (!emp.allowCreatePoll) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center space-y-4">
        <p className="text-red-400">You do not have permission to create polls.</p>
        <Link href="/" className="text-blue-400 hover:text-blue-300 text-sm">
          &larr; Back to Home
        </Link>
      </div>
    );
  }

  /**
   * The employee's effective level uses temp_level when set, otherwise
   * roleLevel. This matches the effective_level calculation in create_poll.rs.
   */
  const effectiveLevel: number | null =
    emp.tempLevel != null
      ? Number(emp.tempLevel)
      : emp.roleLevel != null
      ? Number(emp.roleLevel)
      : null;

  // ── Submit poll creation ───────────────────────────────
  const handleSubmit = async () => {
    if (validation.length > 0) return;
    if (!pollConfig.data) {
      setMsg("PollConfig has not loaded. Please try again later.");
      return;
    }

    // ── At submission, calculate a minimum lead time from clock drift ──
    // Formula: ceil((|drift| + TX_BUFFER) / 60), rounded up to minutes.
    // For example, 64s drift requires at least 2 minutes; 0s requires 1.
    const startTs = dateToTimestamp(startAt);
    const freshChainNow = await getChainTimestamp(connection);
    const freshSystemNow = Math.floor(Date.now() / 1000);
    const freshDrift = freshChainNow - freshSystemNow;

    // Dynamic buffer, rounded up to whole minutes
    const reqMinutes = Math.max(
      1,
      Math.ceil((Math.abs(freshDrift) + TX_BUFFER) / 60),
    );
    const reqSeconds = reqMinutes * 60;

    const startVsSystem = startTs - freshSystemNow; // Seconds from system time
    const startVsChain = startTs - freshChainNow; // Seconds from on-chain time

    // Diagnostic log for investigating clock drift
    console.log("[createPoll time diagnostics]", {
      startTs,
      freshChainNow,
      freshSystemNow,
      drift: freshDrift,
      reqMinutes,
      startVsSystem,
      startVsChain,
      willPass: startVsSystem >= reqSeconds,
    });

    // Reject the request if the start time is closer than the dynamic buffer
    if (startVsSystem < reqSeconds) {
      const mins = Math.floor(startVsSystem / 60);
      const secs = startVsSystem % 60;
      setMsg(
        `Start time must be at least  ${reqMinutes}  minutes in the future.\n` +
          `The start time is only ${mins}m ${secs}s away; at least ${reqMinutes} minutes are required.\n` +
          `On-chain drift: ${freshDrift > 0 ? "+" : ""}${freshDrift}s (the chain is ${
            freshDrift > 0 ? "ahead" : "behind"
          }）`,
      );
      return;
    }

    setMsg("");

    // Call the on-chain poll creation instruction
    const tx = await createPoll.execute({
      currentTotalPolls: pollConfig.data?.totalPolls + BigInt(1),
      employeeId: emp.employeeId,
      input: {
        title: title,
        simpleDescription: description,
        detailLink: detailLink || undefined,
        startAt: dateToTimestamp(startAt),
        endAt: dateToTimestamp(endAt),
        minLevel: Number(minLevel),
        maxLevel: Number(maxLevel),
        maxMultipleChoices: Number(maxChoices),
        employeeMainRoleKey: emp.mainRoleKey,
      },
    });

    // Navigate to the poll details page after successful creation
    if (tx) {
      const newPollId = Number(pollConfig.data.totalPolls) + 1;
      setMsg(`Poll created successfully! Transaction signature: ${tx}`);
      router.push(`/polls/${newPollId}`);
    }
  };

  // ============================================================
  // Render component
  // ============================================================
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center gap-4">
        <Link href="/" className="text-blue-400 hover:text-blue-300 text-sm">
          &larr; Back
        </Link>
        <h1 className="text-2xl font-bold">Create Poll</h1>
      </div>

      {/* ── Current user's effective level ── */}
      {effectiveLevel != null && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm flex items-center gap-3">
          <span className="text-gray-400">Your effective level:</span>
          {emp.tempLevel != null ? (
            <span className="text-orange-400 font-medium">
              Lv.{effectiveLevel}
              <span className="text-gray-500 text-xs ml-1">(Temporary level)</span>
            </span>
          ) : (
            <span className="text-blue-400 font-medium">
              Lv.{effectiveLevel}
              <span className="text-gray-500 text-xs ml-1">(Role level)</span>
            </span>
          )}
          {minCreateLevel != null && effectiveLevel < minCreateLevel && (
            <span className="text-red-400 text-xs ml-auto">
              Global minimum is Lv.{minCreateLevel}; you do not meet the requirement.
            </span>
          )}
          {minCreateLevel != null && effectiveLevel >= minCreateLevel && (
            <span className="text-green-400 text-xs ml-auto">
              Meets the global creation threshold (Lv.{minCreateLevel})
            </span>
          )}
        </div>
      )}

      {/* ── Messages ── */}
      {msg && (
        <div className="bg-gray-800 border border-gray-600 rounded p-3 text-sm text-emerald-400 whitespace-pre-line">
          {msg}
        </div>
      )}
      {createPoll.error && (
        <div className="bg-red-900/30 border border-red-800 rounded p-3 text-sm text-red-400">
          Poll creation failed:{createPoll.error.message}
        </div>
      )}

      {/* ── Form ── */}
      <section className="bg-gray-800 rounded-lg p-6 space-y-5">
        {/* ══ On-chain time monitor ══ */}
        <div
          className={`rounded-lg border p-3 text-sm ${
            driftInfo == null
              ? "border-gray-200 bg-gray-50 text-gray-500"
              : Math.abs(currentDrift) <= 5
              ? "border-green-200 bg-green-50 text-green-700"
              : Math.abs(currentDrift) <= 60
              ? "border-yellow-200 bg-yellow-50 text-yellow-700"
              : "border-orange-200 bg-orange-50 text-orange-700"
          }`}
        >
          {driftInfo == null ? (
            <p>Fetching on-chain time...</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-x-6 gap-y-1">
                {/* On-chain time estimated using the latest drift */}
                <span>
                  On-chain time:
                  <strong>
                    {new Date(estimatedChainNow * 1000).toLocaleTimeString()}
                  </strong>
                </span>
                {/* System time, updated every second */}
                <span>
                  System time:
                  <strong>
                    {new Date(tickNow * 1000).toLocaleTimeString()}
                  </strong>
                </span>
                {/* Clock drift */}
                <span>
                  {Math.abs(currentDrift) <= 5
                    ? `Drift: ${currentDrift}s (synchronized)`
                    : `Drift: ${currentDrift > 0 ? "+" : ""}${currentDrift}s (chain ${
                        currentDrift > 0 ? "ahead" : "behind"
                      } by ${Math.floor(Math.abs(currentDrift) / 60)}m ${
                        Math.abs(currentDrift) % 60
                      }s)`}
                </span>
              </div>
              {/* Dynamic recommendation */}
              <p className="mt-1 text-xs opacity-80">
                Set the start time at least <strong>{bufferMinutes} minutes</strong> ahead
                (drift is remeasured every 60 seconds).
              </p>
            </>
          )}
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm text-gray-400 mb-1">
            Poll title <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. 2024 Project of the Year"
            maxLength={60}
            className="w-full bg-gray-700 rounded px-3 py-2 text-sm"
          />
          <div className="text-xs text-gray-500 mt-1">{title.length}/60</div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm text-gray-400 mb-1">
            Short description <span className="text-red-400">*</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Briefly describe the purpose of this poll..."
            maxLength={60}
            rows={2}
            className="w-full bg-gray-700 rounded px-3 py-2 text-sm resize-none"
          />
          <div className="text-xs text-gray-500 mt-1">
            {description.length}/60
          </div>
        </div>

        {/* Details link (optional) */}
        <div>
          <label className="block text-sm text-gray-400 mb-1">
            Details link <span className="text-gray-600">(optional)</span>
          </label>
          <input
            type="text"
            value={detailLink}
            onChange={(e) => setDetailLink(e.target.value)}
            placeholder="IPFS hash or external URL"
            maxLength={60}
            className="w-full bg-gray-700 rounded px-3 py-2 text-sm"
          />
        </div>

        {/* ── Level range and maximum choices ── */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Minimum voting level
            </label>
            <input
              type="number"
              value={minLevel}
              onChange={(e) => setMinLevel(e.target.value)}
              min={0}
              max={MAX_LEVEL_LIMIT}
              className={`w-full bg-gray-700 rounded px-3 py-2 text-sm ${
                minLevelErr ? "border border-red-500" : ""
              }`}
            />
            {minLevelErr ? (
              <div className="text-xs text-red-400 mt-1">{minLevelErr}</div>
            ) : (
              <div className="text-xs text-gray-500 mt-1">
                Range: 0–{MAX_LEVEL_LIMIT}; 0 = unrestricted
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Maximum voting level
            </label>
            <input
              type="number"
              value={maxLevel}
              onChange={(e) => setMaxLevel(e.target.value)}
              min={0}
              max={MAX_LEVEL_LIMIT}
              className={`w-full bg-gray-700 rounded px-3 py-2 text-sm ${
                maxLevelErr ? "border border-red-500" : ""
              }`}
            />
            {maxLevelErr ? (
              <div className="text-xs text-red-400 mt-1">{maxLevelErr}</div>
            ) : (
              <div className="text-xs text-gray-500 mt-1">
                Range: 0–{MAX_LEVEL_LIMIT}; {MAX_LEVEL_LIMIT} = unrestricted
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Maximum choices
            </label>
            <input
              type="number"
              value={maxChoices}
              onChange={(e) => setMaxChoices(e.target.value)}
              min={MIN_CHOICES}
              max={MAX_CHOICES}
              className={`w-full bg-gray-700 rounded px-3 py-2 text-sm ${
                maxChoicesErr ? "border border-red-500" : ""
              }`}
            />
            {maxChoicesErr ? (
              <div className="text-xs text-red-400 mt-1">{maxChoicesErr}</div>
            ) : (
              <div className="text-xs text-gray-500 mt-1">
                Range: {MIN_CHOICES}–{MAX_CHOICES}; 1 = single choice
              </div>
            )}
          </div>
        </div>

        {levelRangeErr && (
          <div className="text-xs text-red-400 -mt-3">{levelRangeErr}</div>
        )}

        {/* ── Schedule ── */}
        <div className="space-y-3">
          <div className="bg-gray-700/50 border border-gray-600 rounded px-3 py-2 text-xs text-gray-400 flex gap-6">
            <span>Global settings —</span>
            {pollConfig.loading ? (
              <span className="text-gray-500">Loading...</span>
            ) : minInterval != null && maxInterval != null ? (
              <>
                <span>
                  Minimum interval:
                  <span className="text-blue-400 font-medium">
                    {formatDuration(minInterval)}
                  </span>
                </span>
                <span>
                  Maximum interval:
                  <span className="text-blue-400 font-medium">
                    {formatDuration(maxInterval)}
                  </span>
                </span>
              </>
            ) : (
              <span className="text-gray-500">Could not load global settings</span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Start time <span className="text-red-400">*</span>
              </label>
              <input
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                className="w-full bg-gray-700 rounded px-3 py-2 text-sm"
              />
              {startAt && (
                <div className="text-xs text-gray-500 mt-1">
                  {formatChineseDate(startAt)}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">
                End time <span className="text-red-400">*</span>
              </label>
              <input
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                className="w-full bg-gray-700 rounded px-3 py-2 text-sm"
              />
              {endAt && (
                <div className="text-xs text-gray-500 mt-1">
                  {formatChineseDate(endAt)}
                </div>
              )}
            </div>
          </div>

          {startAt &&
            endAt &&
            dateToTimestamp(endAt) > dateToTimestamp(startAt) && (
              <div className="text-xs text-gray-400 text-right">
                Poll duration:
                <span className="text-blue-400">
                  {formatDuration(
                    dateToTimestamp(endAt) - dateToTimestamp(startAt),
                  )}
                </span>
              </div>
            )}
        </div>

        {timeErr && <div className="text-xs text-red-400 -mt-3">{timeErr}</div>}

        {validation.length > 0 && (
          <div className="text-sm text-yellow-400 space-y-1">
            {validation
              .filter(
                (err) =>
                  err.includes("Title") ||
                  err.includes("Description") ||
                  err.includes("Details"),
              )
              .map((err, i) => (
                <p key={i}>{err}</p>
              ))}
          </div>
        )}

        {/* Submit button */}
        <div className="flex items-center gap-4 pt-2">
          <button
            onClick={handleSubmit}
            disabled={
              createPoll.loading || validation.length > 0 || !pollConfig.data
            }
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-6 py-2.5 rounded text-sm font-medium transition-colors"
          >
            {createPoll.loading ? "Creating..." : "Create Poll"}
          </button>
          <span className="text-xs text-gray-500">
            The poll starts as a draft. Add candidates and open it from the details page.
          </span>
        </div>
      </section>

      {/* ── Instructions ── */}
      <section className="bg-gray-800/50 rounded-lg p-4 text-xs text-gray-500 space-y-1">
        <p>New polls start as drafts. Complete these steps on the details page:</p>
        <p className="pl-4">1. Create and add at least one candidate</p>
        <p className="pl-4">2. Optionally configure department/role allowlists or blocklists</p>
        <p className="pl-4">3. Set the poll status to Ready</p>
        <p className="pl-4">4. Eligible employees can vote once the start time is reached</p>
      </section>
    </div>
  );
}
