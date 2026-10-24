import "./polyfills";
import "./globals.css";
import "@solana/wallet-adapter-react-ui/styles.css";

import type { Metadata } from "next";
import Providers from "./providers";
import { MainLayout } from "@/components/layout";
import { ToastProvider } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: "Solana Vote DApp",
  description: "An on-chain voting system built on Solana",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-900 text-white">
        <Providers>
          <ToastProvider>
            <MainLayout>{children}</MainLayout>
          </ToastProvider>
        </Providers>
      </body>
    </html>
  );
}