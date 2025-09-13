// Mock leaderboard sementara (karena kita blm buat backend/off-chain indexer)
export type LeaderboardEntry = {
  referrer: string;
  totalTVL: number;
};

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  return [
    { referrer: "0x1111...abcd", totalTVL: 5000 },
    { referrer: "0x2222...efgh", totalTVL: 3200 },
    { referrer: "0x3333...ijkl", totalTVL: 1800 },
  ];
}
