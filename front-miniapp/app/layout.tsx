export const metadata = { title: "DeFAI Earn — Kaia USDT" };
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en"><body>
      <header className="sticky top-0 z-10 bg-white/85 backdrop-blur border-b border-gray-100">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-4 justify-between">
          <a href="/" className="text-2xl font-extrabold">DeFAI <span className="text-[#12a988]">Earn</span></a>
          <nav className="flex gap-3 text-sm">
            <a className="btn" href="/">Earn</a>
            <a className="btn" href="/missions">Missions</a>
            <a className="btn" href="/activity">Activity</a>
            <a className="btn" href="/profile">Profile</a>
            <a className="btn" href="/leaderboard">Leaderboard</a>
          </nav>
        </div>
      </header>
      {children}
      <footer className="text-center text-sm text-gray-500 py-8">
        Built for <b>Kaia Wave Stablecoin Summer Hackathon</b>
      </footer>
    </body></html>
  );
}

