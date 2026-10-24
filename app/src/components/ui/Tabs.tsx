/**
 * Tabs.tsx — Tabs component
 *
 * Usage:
 * - Switch between poll details, candidates, and voting in PollDetail
 *
 * React state tracks the active tab, and Context shares it among Tabs,
 * TabsList, TabsTrigger, and TabsContent.
 */
"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
  useCallback,
} from "react";

// ---- Context for sharing the selected tab in the component tree ----
interface TabsContextValue {
  /** Currently active tab */
  activeTab: string;
  /** Select a tab */
  setActiveTab: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

/** Internal hook to safely access the Tabs context */
function useTabsContext(): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (!ctx) {
    throw new Error("Tabs child components must be used inside <Tabs>");
  }
  return ctx;
}

// ---- Main container ----
interface TabsProps {
  /** Tab active by default */
  defaultValue: string;
  /** Child elements (TabsList and TabsContent) */
  children: ReactNode;
  /** Custom class name */
  className?: string;
  /** Callback fired when the tab changes */
  onValueChange?: (value: string) => void;
}

export function Tabs({
  defaultValue,
  children,
  className = "",
  onValueChange,
}: TabsProps) {
  const [activeTab, setActiveTabState] = useState(defaultValue);

  /** Select a tab and fire the callback */
  const setActiveTab = useCallback(
    (value: string) => {
      setActiveTabState(value);
      onValueChange?.(value);
    },
    [onValueChange]
  );

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

// ---- Tab button list container ----
interface TabsListProps {
  children: ReactNode;
  className?: string;
}

export function TabsList({ children, className = "" }: TabsListProps) {
  return (
    <div
      role="tablist"
      className={`flex space-x-1 border-b border-gray-700 pb-1 ${className}`}
    >
      {children}
    </div>
  );
}

// ---- Individual tab button ----
interface TabsTriggerProps {
  /** Unique value for this tab, matching the TabsContent value */
  value: string;
  children: ReactNode;
  className?: string;
  /** Whether the tab is disabled */
  disabled?: boolean;
}

export function TabsTrigger({
  value,
  children,
  className = "",
  disabled = false,
}: TabsTriggerProps) {
  const { activeTab, setActiveTab } = useTabsContext();
  const isActive = activeTab === value;

  return (
    <button
      role="tab"
      aria-selected={isActive}
      disabled={disabled}
      onClick={() => setActiveTab(value)}
      className={`
        px-4 py-2 text-sm font-medium rounded-t-md transition-colors
        ${
          isActive
            ? "bg-gray-800 text-white border-b-2 border-blue-500"
            : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
        }
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        ${className}
      `}
    >
      {children}
    </button>
  );
}

// ---- Tab content panel ----
interface TabsContentProps {
  /** Value of the corresponding tab */
  value: string;
  children: ReactNode;
  className?: string;
}

export function TabsContent({
  value,
  children,
  className = "",
}: TabsContentProps) {
  const { activeTab } = useTabsContext();

  // Do not render inactive tab content to avoid unnecessary DOM and side effects
  if (activeTab !== value) return null;

  return (
    <div role="tabpanel" className={`pt-4 ${className}`}>
      {children}
    </div>
  );
}