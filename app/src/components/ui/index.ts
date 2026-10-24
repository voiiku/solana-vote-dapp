/**
 * ui/index.ts — Central exports for UI components
 *
 * Note:
 * - useToast from Toast.tsx is the general-purpose toast hook
 * - TransactionToast's useToast is renamed to useTransactionToast to avoid a naming conflict
 */

// ---- Button ----
export { Button } from "./Button";
export type { ButtonProps, ButtonVariant, ButtonSize } from "./Button";

// ---- Card ----
export { Card } from "./Card";

// ---- Input ----
export { Input } from "./Input";
export type { InputProps } from "./Input";

// ---- Select ----
export { Select } from "./Select";
export type { SelectProps, SelectOption } from "./Select";

// ---- Textarea ----
export { Textarea } from "./Textarea";
export type { TextareaProps } from "./Textarea";

// ---- Modal ----
export { Modal } from "./Modal";

// ---- Badge ----
export { Badge, PollStatusBadge, BooleanBadge } from "./Badge";

// ---- LoadingSpinner ----
export { LoadingSpinner } from "./LoadingSpinner";

// ---- ErrorMessage ----
export { ErrorMessage } from "./ErrorMessage";

// ---- EmptyState ----
export { EmptyState } from "./EmptyState";

// ---- TransactionToast (rename useToast to avoid conflict with Toast.tsx) ----
export {
  ToastContainer,
  useToast as useTransactionToast,
} from "./TransactionToast";
export type { ToastData, ToastStatus } from "./TransactionToast";

// ---- Tabs ----
export { Tabs, TabsList, TabsTrigger, TabsContent } from "./Tabs";

// ---- Alert ----
export { Alert } from "./Alert";

// ---- Spinner ----
export { Spinner } from "./Spinner";

// ---- Toast (general-purpose toast) ----
export { ToastProvider, useToast } from "./Toast";