// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { LiffProvider } from "@/components/LiffProvider";
import { DappPortalProvider } from "@/components/DappPortalProvider";

export const metadata: Metadata = {
  title: "MORE Earn",
  description: "Simple USDT yield on Kaia",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white">
        <LiffProvider>
          <DappPortalProvider>{children}</DappPortalProvider>
        </LiffProvider>
      </body>
    </html>
  );
}
