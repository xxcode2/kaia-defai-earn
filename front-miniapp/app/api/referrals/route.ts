import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

type Claim = {
  user: string;            // address user yang deposit pertama
  referrer: string;        // address referrer (dari ?ref=)
  amountUSDT: number;      // nominal deposit pertama (desimal)
  ts: number;              // timestamp
};

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "referrals.json");

// --- util file store (demo) ---
async function readAll(): Promise<Claim[]> {
  try {
    const buf = await fs.readFile(DATA_FILE, "utf8");
    return JSON.parse(buf);
  } catch {
    return [];
  }
}
async function writeAll(arr: Claim[]) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(arr, null, 2), "utf8");
}

// POST: simpan klaim first deposit
export async function POST(req: Request) {
  try {
    const { user, referrer, amount } = await req.json();

    if (
      !user ||
      !/^0x[a-fA-F0-9]{40}$/.test(user) ||
      !referrer ||
      !/^0x[a-fA-F0-9]{40}$/.test(referrer) ||
      typeof amount !== "number" ||
      amount <= 0
    ) {
      return NextResponse.json({ ok: false, error: "bad-params" }, { status: 400 });
    }

    const u = user.toLowerCase();
    const r = referrer.toLowerCase();

    // muat data
    const all = await readAll();

    // hanya catat sekali per user (first deposit saja)
    if (all.find((c) => c.user === u)) {
      return NextResponse.json({ ok: false, error: "already-claimed" }, { status: 200 });
    }

    all.push({ user: u, referrer: r, amountUSDT: amount, ts: Date.now() });
    await writeAll(all);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/referrals error", e);
    return NextResponse.json({ ok: false, error: "server-error" }, { status: 500 });
  }
}

// GET: kembalikan leaderboard aggregate
//   ?limit=10
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limit = Math.max(1, Math.min(100, Number(url.searchParams.get("limit") || "20")));

    const all = await readAll();

    // aggregate by referrer
    const map = new Map<
      string,
      { invites: number; tvl: number }
    >();

    for (const c of all) {
      const prev = map.get(c.referrer) || { invites: 0, tvl: 0 };
      prev.invites += 1;
      prev.tvl += c.amountUSDT;
      map.set(c.referrer, prev);
    }

    const rows = Array.from(map.entries())
      .map(([referrer, v]) => ({ referrer, invites: v.invites, tvl: v.tvl }))
      .sort((a, b) => b.tvl - a.tvl || b.invites - a.invites)
      .slice(0, limit);

    return NextResponse.json({ ok: true, rows });
  } catch (e) {
    console.error("GET /api/referrals error", e);
    return NextResponse.json({ ok: false, error: "server-error" }, { status: 500 });
  }
}
