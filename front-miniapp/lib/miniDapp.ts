// lib/miniDapp.ts
// Shim SDK untuk sementara (agar build jalan di web biasa/LIFF belum aktif).
// Nanti saat paket @dappportal/mini-dapp-sdk sudah tersedia, kita bisa ganti implementasi di sini.

type PaymentResult = { status: "success" | "pending" | "failed"; txHash?: string };

export type MiniDappSDK = {
  ready: () => Promise<void>;
  isInLiff: () => boolean;
  connectWallet: (opts?: any) => Promise<{ address: string }>;
  disconnectWallet: () => Promise<void>;
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

// Web fallback (tidak memanggil fitur LIFF asli, hanya agar UI tidak crash)
const webShim: MiniDappSDK = {
  ready: async () => {},
  isInLiff: () => false,
  connectWallet: async () => {
    alert(
      "Connect wallet (Mini Dapp) aktif di LIFF. Di web biasa silakan pakai tombol Connect wallet yang ada."
    );
    return { address: "" };
  },
  disconnectWallet: async () => {},
  openPayment: async () => {
    alert("Payment demo hanya aktif di LIFF Mini Dapp (testMode).");
    return { status: "failed" };
  },
  openPaymentHistory: async () => alert("Payment History hanya aktif di LIFF."),
  shareToLine: async (t, u) => {
    await navigator.clipboard?.writeText(`${t} ${u ?? ""}`.trim());
    alert("Teks disalin (Share LINE aktif di LIFF).");
  },
};

let _mini: any = null;

/** Inisialisasi sekali (no-op untuk shim, tetap aman dipanggil). */
export async function initMini() {
  if (!instance) {
    // TODO: ketika paket resmi tersedia:
    // const { MiniDapp } = await import("@dappportal/mini-dapp-sdk");
    // instance = new MiniDapp({ clientId: process.env.NEXT_PUBLIC_MINIDAPP_CLIENT_ID, projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID });
    // await instance.ready();
    instance = webShim;
  }
  await instance.ready();
}

/** Alias nyaman */
export function getMini() {
  if (!instance) instance = webShim;
  return instance;
}

/** Nama yang kamu pakai sebelumnya */
export function getMiniDapp() {
  return getMini();
}
export function isLiff(): boolean {
  return typeof window !== "undefined" && !!(window as any).liff;
}