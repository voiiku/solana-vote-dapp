/**
 * Navbar.tsx — Top navigation bar
 *
 * Features:
 * 1. Brand (left)
 * 2. Navigation links (center): home, polls, PDA derivation, profile, and admin
 * 3. Wallet connection button (right)
 * 4. Admin badge when the current user is an administrator
 *
 * The admin link is shown only when useIsAdmin() returns true. This is
 * UI-only visibility; on-chain permissions are enforced by the program.
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import dynamic from "next/dynamic";
import { useIsAdmin } from "@/hooks";
import { Badge } from "@/components/ui";

// Dynamically import the wallet button to avoid SSR hydration issues
const WalletMultiButtonDynamic = dynamic(
  async () =>
    (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

/** Navigation link configuration */
interface NavLink {
  href: string;
  label: string;
  /** Whether the link is visible only to administrators */
  adminOnly?: boolean;
}

/** Navigation links, in display order */
const navLinks: NavLink[] = [
  { href: "/", label: "Home" },
  { href: "/polls", label: "Polls" },
  { href: "/pda", label: "PDA Derivation" },
  { href: "/my", label: "My Account" },
  { href: "/admin", label: "Admin", adminOnly: true },
];

export function Navbar() {
  const pathname = usePathname();
  const { connected } = useWallet();
  const isAdmin = useIsAdmin();

  /**
   * Check whether a link is active. The home link matches exactly;
   * other links match by path prefix.
   */
  function isActive(href: string): boolean {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  // Filter visible links (admin links are restricted to administrators)
  const visibleLinks = navLinks.filter((link) => !link.adminOnly || isAdmin);

  return (
    <nav className="sticky top-0 z-40 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">

          {/* ── Left: brand and admin badge ── */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center group-hover:bg-blue-500 transition-colors">
                <svg
                  className="w-4 h-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <span className="text-base font-semibold text-white hidden sm:block">
                Solana Vote
              </span>
            </Link>

            {isAdmin && <Badge color="purple">Admin</Badge>}
          </div>

          {/* ── Center: desktop navigation links ── */}
          <div className="hidden md:flex items-center gap-0.5">
            {visibleLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={[
                  "px-3 py-1.5 rounded-md text-sm transition-colors",
                  isActive(link.href)
                    ? "bg-gray-800 text-white font-medium"
                    : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/40",
                ].join(" ")}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* ── Right: connection status and wallet button ── */}
          <div className="flex items-center gap-3">
            {connected && (
              <span className="hidden sm:flex items-center gap-1.5 text-xs text-gray-500">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Connected
              </span>
            )}
            <WalletMultiButtonDynamic className="!bg-blue-600 !hover:bg-blue-700 !rounded-md !h-9 !text-sm !font-medium" />
          </div>
        </div>
      </div>

      {/* ── Mobile bottom navigation ── */}
      <div className="md:hidden flex items-center justify-around border-t border-gray-800/60 px-2 py-1.5">
        {visibleLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={[
              "flex-1 text-center px-1 py-1.5 rounded text-xs transition-colors",
              isActive(link.href)
                ? "bg-gray-800 text-white font-medium"
                : "text-gray-500 hover:text-gray-300",
            ].join(" ")}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}