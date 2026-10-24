/**
 * Toast.tsx — Floating notification component and useToast hook
 *
 * Usage:
 * - Show success or failure after submitting a transaction
 * - Provide feedback for actions such as copying or saving
 *
 * A global state and portal allow any component to show a toast with
 * useToast(). Toasts disappear after a specified delay or can be dismissed.
 */
"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
  useEffect,
  useRef,
} from "react";

// ---- Type definitions ----

type ToastVariant = "info" | "success" | "warning" | "error";

interface ToastItem {
  id: number;
  variant: ToastVariant;
  title?: string;
  message: string;
  /** Duration in milliseconds; defaults to 5000 */
  duration: number;
}

interface ToastContextValue {
  /** Show a toast notification */
  toast: (options: {
    variant?: ToastVariant;
    title?: string;
    message: string;
    duration?: number;
  }) => void;
}

// ---- Context ----

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * useToast — Show toast notifications from any component
 *
 * @example
 * const { toast } = useToast();
 * toast({ variant: "success", message: "Vote submitted successfully!" });
 * toast({ variant: "error", title: "Failed", message: err.message });
 */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within <ToastProvider>");
  }
  return ctx;
}

// ---- Provider ----

/** Incrementing ID generator */
let nextId = 0;

interface ToastProviderProps {
  children: ReactNode;
}

/**
 * Toast provider — place at the application root
 *
 * @example
 * // app/layout.tsx
 * <ToastProvider>
 *   <App />
 * </ToastProvider>
 */
export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  /** Add a toast */
  const toast = useCallback(
    ({
      variant = "info",
      title,
      message,
      duration = 5000,
    }: {
      variant?: ToastVariant;
      title?: string;
      message: string;
      duration?: number;
    }) => {
      const id = nextId++;
      setToasts((prev) => [...prev, { id, variant, title, message, duration }]);
    },
    []
  );

  /** Remove a toast */
  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* Toast container fixed in the top-right corner */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map((item) => (
          <ToastCard key={item.id} item={item} onClose={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ---- Individual toast card ----

const variantStyles: Record<ToastVariant, { bg: string; border: string; icon: string }> = {
  info: { bg: "bg-gray-800", border: "border-blue-600/50", icon: "ℹ️" },
  success: { bg: "bg-gray-800", border: "border-emerald-600/50", icon: "✅" },
  warning: { bg: "bg-gray-800", border: "border-yellow-600/50", icon: "⚠️" },
  error: { bg: "bg-gray-800", border: "border-red-600/50", icon: "❌" },
};

function ToastCard({
  item,
  onClose,
}: {
  item: ToastItem;
  onClose: (id: number) => void;
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const style = variantStyles[item.variant];

  // Auto-dismiss timer
  useEffect(() => {
    timerRef.current = setTimeout(() => onClose(item.id), item.duration);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [item.id, item.duration, onClose]);

  return (
    <div
      className={`
        ${style.bg} ${style.border}
        border rounded-lg shadow-lg p-4
        text-white text-sm
        animate-in slide-in-from-right
        flex items-start gap-3
      `}
    >
      <span className="flex-shrink-0">{style.icon}</span>
      <div className="flex-1 min-w-0">
        {item.title && <p className="font-semibold mb-0.5">{item.title}</p>}
        <p className="opacity-80">{item.message}</p>
      </div>
      <button
        onClick={() => onClose(item.id)}
        className="flex-shrink-0 text-gray-400 hover:text-white transition-colors"
        aria-label="Close"
      >
        ✕
      </button>
    </div>
  );
}