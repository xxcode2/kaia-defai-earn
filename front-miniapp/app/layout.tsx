// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import LiffProvider from "@/components/LiffProvider"; // kalau LiffProvider kamu default export
import DappPortalProvider from "@/components/DappPortalProvider"; // default import

export const metadata: Metadata = {
  title: "MORE Earn",
  description: "More Earn – Kaia",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <LiffProvider>
          <DappPortalProvider>
            {children}
          </DappPortalProvider>
        </LiffProvider>
      </body>
    </html>
  );
}
