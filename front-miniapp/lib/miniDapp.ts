// lib/miniDapp.ts
// Wrapper Mini Dapp SDK + fallback shim.
// Tujuan: biar build jalan di web biasa, tapi kalau di LIFF/SDK tersedia → langsung bisa dipakai.

type PaymentResult = {
  status: "success" | "pending" | "failed";
  txHash?: string;
};

export type MiniDappSDK = {
  ready: () => Promise<void>;
  isInLiff: () => boolean;
  connectWallet: (opts?: any) => Promise<{ address: string }>;
  disconnectWallet: () => Promise<void>;
  getAddress?: () => Promise<string | undefined>;
  getAvailableWallets?: () => Promise<Array<{ id: string; name: string }>>;
  openPayment: (p: {
    itemId: string;
    itemName: string;
    fiatPrice?: number;
    cryptoPrice?: { symbol: string; amount: string };
    testMode?: boolean;
  }) => Promise<PaymentResult>;
  openPaymentHistory: () => Promise<void>;
  shareToLine?: (text: string, url?: string) => Promise<void>;
};

let instance: MiniDappSDK | null = null;

// ===== Web fallback (shim) =====
const webShim: MiniDappSDK = {
  ready: async () => {},
  isInLiff: () => false,
  connectWallet: async () => {
    alert(
      "Connect wallet (Mini Dapp) hanya aktif di LIFF. Di web biasa, silakan gunakan tombol connect wallet umum."
    );
    return { address: "" };
  },
  disconnectWallet: async () => {},
  getAddress: async () => "",
  openPayment: async () => {
    alert("Payment demo hanya aktif di LIFF Mini Dapp (testMode).");
    return { status: "failed" };
  },
  openPaymentHistory: async () =>
    alert("Payment History hanya aktif di LIFF Mini Dapp."),
  shareToLine: async (t, u) => {
    await navigator.clipboard?.writeText(`${t} ${u ?? ""}`.trim());
    alert("Teks disalin (Share LINE aktif di LIFF).");
  },
};

// ===== Init & accessor =====
export async function initMini() {
  if (!instance) {
    try {
      // TODO: uncomment jika @dappportal/mini-dapp-sdk sudah ada di npm
      // const { MiniDapp } = await import("@dappportal/mini-dapp-sdk");
      // instance = new MiniDapp({
      //   clientId: process.env.NEXT_PUBLIC_MINIDAPP_CLIENT_ID,
      //   projectId: process.env.NEXT_PUBLIC_REOWN_PROJECT_ID,
      // });
      // await instance.ready();

      // Untuk sekarang fallback ke shim
      instance = webShim;
    } catch (e) {
      console.warn("MiniDapp init failed, fallback ke shim:", e);
      instance = webShim;
    }
  }
  await instance.ready();
}

export function getMini() {
  if (!instance) instance = webShim;
  return instance;
}

export function getMiniDapp() {
  return getMini();
}

// ===== Helper tambahan =====
/** Deteksi environment LIFF (LINE In-App Browser) */
export function isLiff(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as any;
  if (w?.liff?.isInClient?.()) return true;
  return /(^|\.)liff\.line\.me$/.test(location.host);
}

/**
 * Pastikan wallet terkoneksi.
 * - Cek Reown ProjectId (untuk domain verification)
 * - Panggil connectWallet jika belum ada address
 */
export async function ensureWalletConnected(): Promise<string> {
  const sdk = getMiniDapp();
  await sdk.ready();

  // Guard domain verification
  if (!process.env.NEXT_PUBLIC_REOWN_PROJECT_ID) {
    throw new Error(
      "Domain belum diverifikasi di Reown. Tambahkan domain di dashboard Reown & isi NEXT_PUBLIC_REOWN_PROJECT_ID."
    );
  }

  let addr = (await sdk.getAddress?.()) || "";
  if (!addr) {
    const res = await sdk.connectWallet();
    addr = res.address;
  }
  if (!addr) {
    throw new Error("Gagal connect wallet. Pastikan Bitget/Wallet kompatibel tersedia di LIFF.");
  }
  return addr;
}
