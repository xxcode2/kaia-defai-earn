// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";


// LiffProvider diexport sebagai named — pakai {}
import { LiffProvider } from "@/components/LiffProvider";

// DappPortalProvider default export — tanpa {}
import DappPortalProvider from "@/components/DappPortalProvider";

export const metadata: Metadata = {
  title: "MORE Earn | Mini Dapp",
  description: "USDT yield vault on Kaia with missions, leaderboard, and Mini Dapp payments.",
  openGraph: {
    title: "MORE Earn | Mini Dapp",
    description: "Earn with USDT on Kaia. Missions, leaderboard, and Mini Dapp.",
    url: process.env.NEXT_PUBLIC_BASE_URL || "https://your-domain.example",
    siteName: "MORE Earn",
    images: ["/brand/more1.png"],
  },
  icons: { icon: "/brand/more.png" },
};

<script
  src="/minidapp-sdk.js" 
  async
  onLoad={() => console.log("MiniDapp SDK loaded")}
  onError={() => console.error("MiniDapp SDK failed to load")}
/>


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
