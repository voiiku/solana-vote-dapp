/**
 * TransactionToast.tsx — Transaction notification component
 *
 * Compact version that shows transaction status in the bottom-right corner
 * and links to the Explorer on success.
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import { EXPLORER_URL } from "@/lib/constants";

// ── Type definitions ─────────────────────────────────────────

/** Transaction notification status */
export type ToastStatus = "pending" | "success" | "error";

/** Transaction notification data */
export interface ToastData {
  id: string;
  status: ToastStatus;
  message: string;
  txSignature?: string;
}

// ── Helpers: return styles based on status ───────────────────

/** Return the left border color class */
function getBorderColor(status: ToastStatus): string {
  switch (status) {
    case "pending":
      return "border-l-blue-500";
    case "success":
      return "border-l-emerald-500";
    case "error":
      return "border-l-red-500";
  }
}

/** Return the status emoji */
function getStatusEmoji(status: ToastStatus): string {
  switch (status) {
    case "pending":
      return "⏳";
    case "success":
      return "✅";
    case "error":
      return "❌";
  }
}

// ── Individual toast component ──────────────────────────────

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastData;
  onDismiss: (id: string) => void;
}) {
  // Auto-dismiss five seconds after leaving the pending state
  useEffect(() => {
    if (toast.status === "pending") return;
    const timer = setTimeout(() => onDismiss(toast.id), 5000);
    return () => clearTimeout(timer);
  }, [toast.status, toast.id, onDismiss]);

  // Build an Explorer link only on success and when a signature is available
  const explorerUrl =
    toast.status === "success" && toast.txSignature
      ? EXPLORER_URL + "/tx/" + toast.txSignature
      : null;

  return (
    <div
      className={
        "bg-gray-800 border-l-4 " +
        getBorderColor(toast.status) +
        " rounded-r-md px-4 py-3 shadow-lg flex items-start gap-2 min-w-[280px] max-w-[360px]"
      }
    >
      {/* Status emoji */}
      <span className="shrink-0 text-sm">
        {getStatusEmoji(toast.status)}
      </span>

      {/* Message and optional link */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-200 wrap-break-word">
          {toast.message}
        </p>
        {explorerUrl !== null && (
          <ExplorerLink url={explorerUrl} />
        )}
      </div>

      {/* Close button */}
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 text-gray-500 hover:text-gray-300 text-lg leading-none"
      >
        ×
      </button>
    </div>
  );
}

// ── Explorer link in a separate component for reliable JSX rendering ──

function ExplorerLink({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-1 inline-block text-xs text-blue-400 hover:text-blue-300 underline"
    >
      View in Explorer →
    </a>
  );
}

// ── Toast container ─────────────────────────────────────────

/**
 * Place in a layout component to render all toast notifications.
 */
export function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

// ── useToast hook ───────────────────────────────────────────

/**
 * Hook for managing toast state
 *
 * @example
 * const { toasts, addToast, updateToast, removeToast } = useToast();
 * const id = addToast("pending", "Transaction submitted...");
 * updateToast(id, "success", "Transaction succeeded!", txSignature);
 */
export function useToast() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  /** Add a notification and return its unique ID */
  const addToast = useCallback(
    (status: ToastStatus, message: string, txSignature?: string): string => {
      const id =
        "toast-" + Date.now().toString() + "-" + Math.random().toString(36).slice(2);
      setToasts((prev) => [...prev, { id, status, message, txSignature }]);
      return id;
    },
    [],
  );

  /** Update an existing notification's status or message */
  const updateToast = useCallback(
    (
      id: string,
      status: ToastStatus,
      message: string,
      txSignature?: string,
    ) => {
      setToasts((prev) =>
        prev.map((t) =>
          t.id === id
            ? { ...t, status, message, txSignature: txSignature ?? t.txSignature }
            : t,
        ),
      );
    },
    [],
  );

  /** Manually remove a notification */
  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, addToast, updateToast, removeToast } as const;
}