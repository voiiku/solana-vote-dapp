/**
 * MainLayout.tsx — Page layout
 *
 * Responsibilities:
 * 1. Includes the Navbar
 * 2. Includes the global transaction ToastContainer
 * 3. Applies consistent content width and padding
 * 4. Exposes toast methods to child components through React Context
 *
 * Usage: wrap page content in app/layout.tsx:
 * ```tsx
 * <MainLayout>{children}</MainLayout>
 * ```
 *
 * Use toast in any child component:
 * ```tsx
 * const { addToast, updateToast } = useLayoutToast();
 * ```
 */
"use client";

import { type ReactNode, createContext, useContext } from "react";
import { Navbar } from "./Navbar";
import { ToastContainer, useTransactionToast } from "@/components/ui";
import type { ToastStatus } from "@/components/ui";

// ── Toast context ────────────────────────────────────────────

/**
 * Toast context type. Child components can add or update transaction
 * notifications through this context.
 */
interface ToastContextType {
  /** Add a notification and return its ID */
  addToast: (status: ToastStatus, message: string, txSignature?: string) => string;
  /** Update an existing notification */
  updateToast: (id: string, status: ToastStatus, message: string, txSignature?: string) => void;
  /** Remove a notification */
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

/**
 * Get the Toast context
 *
 * @example
 * function MyComponent() {
 *   const { addToast, updateToast } = useLayoutToast();
 *
 *   async function handleSubmit() {
 *     const toastId = addToast("pending", "Submitting transaction...");
 *     try {
 *       const txSig = await someTransaction();
 *       updateToast(toastId, "success", "Transaction succeeded!", txSig);
 *     } catch (err) {
 *       updateToast(toastId, "error", "Transaction failed: " + err.message);
 *     }
 *   }
 * }
 */
export function useLayoutToast(): ToastContextType {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useLayoutToast must be used inside MainLayout");
  }
  return ctx;
}

// ── Layout component ─────────────────────────────────────────

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  // Manage notification state with the useToast hook
  const { toasts, addToast, updateToast, removeToast } = useTransactionToast();

  return (
    <ToastContext.Provider value={{ addToast, updateToast, removeToast }}>
      <div className="min-h-screen bg-gray-900 text-white">
        {/* Top navigation */}
        <Navbar />

        {/* Main content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        {/* Global toast notifications */}
        <ToastContainer toasts={toasts} onDismiss={removeToast} />
      </div>
    </ToastContext.Provider>
  );
}