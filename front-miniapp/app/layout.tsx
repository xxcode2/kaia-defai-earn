// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

// LiffProvider diexport sebagai named — pakai {}
import { LiffProvider } from "@/components/LiffProvider";

// DappPortalProvider default export — tanpa {}
import { DappPortalProvider } from "@/components/DappPortalProvider";

export const metadata: Metadata = {
  title: "MORE Earn",
  description: "More Earn – Kaia",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <LiffProvider>
          <DappPortalProvider>{children}</DappPortalProvider>
        </LiffProvider>
      </body>
    </html>
  );
}
