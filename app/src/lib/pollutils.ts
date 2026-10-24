// lib/pollutils.ts
import { PollData } from "@/hooks";

/**
 * Calculate the poll's "effective display status" from the given timestamp.
 *
 * The original version used Date.now() as the current time, which may differ
 * from the on-chain time. This version accepts a timestamp from the caller,
 * which should pass the on-chain time.
 *
 * @param poll - Poll data
 * @param chainNow - Current on-chain time in seconds; defaults to Date.now()
 * @returns Display status string
 */
export function getDisplayStatus(poll: PollData, chainNow?: number): string {
  const now = chainNow ?? Math.floor(Date.now() / 1000);

  // A Ready poll past its end time is displayed as closed.
  if (poll.status === "Ready" && now > Number(poll.endAt)) {
    return "Closed";
  }
  // A Draft poll past its start time is considered expired.
  if (poll.status === "Draft" && now > Number(poll.startAt)) {
    return "Expired";
  }
  return poll.status;
}