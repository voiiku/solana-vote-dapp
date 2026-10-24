/**
 * providers.tsx — Global providers (client component)
 *
 * Provider hierarchy (outer to inner):
 * 1. QueryClientProvider — React Query cache
 * 2. ConnectionProvider — Solana RPC connection
 * 3. WalletProvider — wallet adapter (manages connect/disconnect/switch)
 * 4. WalletModalProvider — wallet selection modal UI
 * 5. WalletChangeWatcher — detects wallet changes and reloads the page
 */

"use client";

import { useMemo, useEffect, type ReactNode } from "react";

// ---- Solana wallet adapters ----
import {
  ConnectionProvider,
  WalletProvider,
  useWallet,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";

// Wallet UI styles
import "@solana/wallet-adapter-react-ui/styles.css";

// ---- React Query ----
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ============================================================
// 1. React Query client
// ============================================================

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,       // Data is fresh for 30 seconds
      gcTime: 5 * 60 * 1000,      // Keep cached data for 5 minutes
      retry: 2,                    // Retry failures twice
      refetchOnWindowFocus: false, // Do not refetch when returning to the tab
    },
  },
});

// ============================================================
// 2. Wallet change watcher (uses sessionStorage)
// ============================================================

/** Key for the connected wallet address in sessionStorage */
const WALLET_STORAGE_KEY = "__connected_wallet";

/**
 * WalletChangeWatcher — detect wallet changes and reload the page
 *
 * How it works:
 * 1. Store the wallet address in sessionStorage when a wallet connects.
 * 2. On the next connection, compare the stored address with the current one.
 * 3. Reload the page if the address changed.
 *
 * Why sessionStorage instead of useRef?
 * - React Strict Mode may mount a component twice and cause useRef state issues.
 * - sessionStorage persists in the same tab, including across page reloads.
 * - Each tab has separate storage.
 *
 * Does not reload in these cases:
 * - First connection (no stored address; the current one is saved)
 * - autoConnect restores the same wallet
 * - autoConnect reconnects the same wallet after a manual page reload
 *
 * Reloads in these cases:
 * - Switching from wallet A to wallet B
 * - Disconnecting wallet A and connecting wallet B (A's address remains stored)
 */
function WalletChangeWatcher({ children }: { children: ReactNode }) {
  const { publicKey, connected } = useWallet();

  useEffect(() => {
    // Check only when a wallet is connected and has a public key
    if (!connected || !publicKey) return;

    const currentKey = publicKey.toBase58();

    try {
      const storedKey = sessionStorage.getItem(WALLET_STORAGE_KEY);

      if (storedKey !== null && storedKey !== currentKey) {
        // Wallet address changed: update the stored address and reload
        console.log(
          `[WalletWatcher] Wallet changed: ${storedKey.slice(0, 8)}... → ${currentKey.slice(0, 8)}... → reloading page`
        );
        sessionStorage.setItem(WALLET_STORAGE_KEY, currentKey);
        window.location.reload();
        return;
      }

      // Store the current wallet address (first connection, autoConnect, or unchanged address)
      sessionStorage.setItem(WALLET_STORAGE_KEY, currentKey);
    } catch {
      // sessionStorage may be unavailable in some environments, such as private browsing.
      // Fail silently so the app continues to work.
    }
  }, [publicKey, connected]);

  return <>{children}</>;
}

// ============================================================
// 3. Providers component
// ============================================================

export default function Providers({ children }: { children: ReactNode }) {
  // RPC endpoint
  const endpoint = useMemo(
    () => process.env.NEXT_PUBLIC_RPC_URL!,
    []
  );

  // Supported wallets
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ConnectionProvider
        endpoint={endpoint}
        config={{ commitment: "confirmed" }}
      >
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>
            {/* WalletChangeWatcher must be inside WalletProvider to access
                wallet state through useWallet(). */}
            <WalletChangeWatcher>
              {children}
            </WalletChangeWatcher>
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </QueryClientProvider>
  );
}