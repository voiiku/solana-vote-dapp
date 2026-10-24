// hooks/useAutoUpdatePollStatuses.ts
import { useCallback, useEffect, useRef } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useConnection } from "@solana/wallet-adapter-react";
import { useProgram } from "@/hooks/useProgram";
import * as pollService from "@/services/poll.service";
import { getChainTimestamp } from "@/lib/utils";
import type { PollData } from "@/hooks/useFetch";

/**
 * Automatically update the on-chain status of expired polls.
 *
 * The original version used Date.now() to determine expiration, which may
 * differ from the on-chain Clock and cause drafts to close immediately on
 * localnet. This version uses the on-chain Clock sysvar.
 *
 * @param polls The currently loaded list of polls
 * @param onUpdated Callback after a poll is updated (usually refetch)
 */
export function useAutoUpdatePollStatuses(
  polls: PollData[] | null,
  onUpdated?: () => void
) {
  const program = useProgram();
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  // Track attempted poll IDs to avoid duplicate updates
  const triedRef = useRef<Set<string>>(new Set());

  const checkAndUpdate = useCallback(async () => {
    if (!program || !publicKey || !polls?.length) return;

    // Use on-chain time instead of Date.now()
    const now = await getChainTimestamp(connection);

    // Find polls created by the current user whose status may have expired
    const stalePolls = polls.filter((p) => {
      const key = String(p.pollId);
      if (triedRef.current.has(key)) return false;       // Already attempted
      if (!p.creator.equals(publicKey)) return false;     // Not the creator

      // Determine expiration using on-chain time
      const readyButExpired = p.status === "Ready" && now > Number(p.endAt);
      const draftButStarted = p.status === "Draft" && now > Number(p.startAt);
      return readyButExpired || draftButStarted;
    });

    if (!stalePolls.length) return;

    let anyUpdated = false;

    // Update each poll
    for (const p of stalePolls) {
      triedRef.current.add(String(p.pollId));
      try {
        await pollService.tryUpdatePollStatus(program, publicKey, p.pollId);
        anyUpdated = true;
        console.log(`[Auto-update] Triggered on-chain status update for poll #${p.pollId}`);
      } catch (err) {
        console.warn(`[Auto-update] Failed to update poll #${p.pollId}:`, err);
      }
    }

    if (anyUpdated && onUpdated) {
      onUpdated();
    }
  }, [program, publicKey, connection, polls, onUpdated]);

  useEffect(() => {
    checkAndUpdate();
  }, [checkAndUpdate]);
}