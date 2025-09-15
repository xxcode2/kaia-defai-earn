// lib/dappPortal.ts
import DappPortalSDK from "@linenext/dapp-portal-sdk";

type InitConfig = {
  clientId?: string;             // ex: process.env.NEXT_PUBLIC_KAIA_CLIENT_ID
  chainId?: string | number;     // "8217" (Kaia mainnet) / "1001" (Kairos testnet)
};

let sdkInstance: any | null = null;

/**
 * Membuat / mengembalikan instance SDK (singleton).
 * Tidak memicu koneksi wallet. Hanya inisialisasi.
 */
function ensureSDK(cfg?: InitConfig) {
  if (sdkInstance) return sdkInstance;

  const clientId =
    cfg?.clientId ?? process.env.NEXT_PUBLIC_KAIA_CLIENT_ID ?? "";
  const chainId =
    String(cfg?.chainId ?? process.env.NEXT_PUBLIC_CHAIN_ID ?? "1001");

  if (!clientId) {
    // Jangan lempar error fatal saat dev; cukup warning agar halaman tetap render.
    console.warn(
      "[DappPortal] Missing clientId. Set NEXT_PUBLIC_KAIA_CLIENT_ID in env."
    );
  }

  sdkInstance = new DappPortalSDK({
    clientId,
    chainId,
  });

  return sdkInstance;
}

/**
 * Panggil ini sekali saat app start (misal di provider useEffect).
 * - Cek kompatibilitas browser (optional).
 * - TIDAK melakukan connect wallet otomatis.
 */
export async function initDappPortal(cfg?: InitConfig) {
  const sdk = ensureSDK(cfg);

  try {
    // Ikuti guideline: tampilkan panduan jika browser tidak didukung.
    if (typeof sdk.isSupportedBrowser === "function" && !sdk.isSupportedBrowser()) {
      await sdk.showUnsupportedBrowserGuide?.();
    }
  } catch (e) {
    // Tidak memblokir UI
    console.warn("[DappPortal] Browser support check failed:", e);
  }

  return sdk;
}

/**
 * Ambil WalletProvider (EIP-1193 compatible) saat dibutuhkan,
 * misalnya ketika user klik tombol "Connect".
 */
export function getWalletProvider() {
  const sdk = ensureSDK();
  return sdk.getWalletProvider?.();
}

/**
 * Ambil PaymentProvider (jika akan pakai fitur pembayaran).
 */
export function getPaymentProvider() {
  const sdk = ensureSDK();
  return sdk.getPaymentProvider?.();
}

/**
 * Utility untuk reset (biasanya tidak perlu, tapi berguna untuk testing HMR).
 */
export function __resetDappPortalForTests() {
  sdkInstance = null;
}
