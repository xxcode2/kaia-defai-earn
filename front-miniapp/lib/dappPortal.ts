// lib/dappPortal.ts
// Pastikan kamu sudah install: npm i @linenext/dapp-portal-sdk
// SDK ini default export, bukan named export.
import DappPortalSDK from "@linenext/dapp-portal-sdk";

let sdkInstance: any | null = null;

/**
 * Inisialisasi SDK — panggil sekali saat app start (mis. di provider).
 * Tidak melakukan auto-connect wallet. Hanya init sesuai guideline.
 */
export async function initDappPortal() {
  if (sdkInstance) return sdkInstance;

  const clientId = process.env.NEXT_PUBLIC_DAPP_CLIENT_ID;
  const chainId = process.env.NEXT_PUBLIC_CHAIN_ID || "1001"; // Kairos default

  if (!clientId) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[DappPortal] Missing NEXT_PUBLIC_DAPP_CLIENT_ID");
    }
    return null;
  }

  // Optional: cek browser support
  try {
    const tmp = new DappPortalSDK({ clientId, chainId });
    if (!tmp.isSupportedBrowser()) {
      // Jangan lempar error — serahkan ke UI untuk menampilkan guide bila perlu
      console.warn("[DappPortal] Unsupported browser. Call showUnsupportedBrowserGuide() in UI if needed.");
    }
    // finalize instance
    sdkInstance = tmp;
    return sdkInstance;
  } catch (e) {
    console.error("[DappPortal] init error:", e);
    return null;
  }
}

/**
 * Getter untuk instance SDK yang sudah di-init.
 * Ini yang kamu butuhkan supaya import { getDappPortal } tidak error.
 */
export function getDappPortal() {
  return sdkInstance;
}

/**
 * Provider EIP-1193 untuk wallet — dipakai saat user klik “Connect”.
 * Pastikan initDappPortal() sudah dipanggil sebelumnya.
 */
export function getWalletProvider() {
  return sdkInstance?.getWalletProvider?.() ?? null;
}

/**
 * Payment provider (kalau kamu pakai fitur payment SDK).
 */
export function getPaymentProvider() {
  return sdkInstance?.getPaymentProvider?.() ?? null;
}

/**
 * Helper opsional bila mau dipakai di UI.
 */
export function isSupportedBrowser(): boolean {
  try {
    // kalau belum init, buat instance sementara hanya untuk cek
    const clientId = process.env.NEXT_PUBLIC_DAPP_CLIENT_ID || "placeholder";
    const chainId = process.env.NEXT_PUBLIC_CHAIN_ID || "1001";
    const inst = sdkInstance ?? new DappPortalSDK({ clientId, chainId });
    return !!inst.isSupportedBrowser();
  } catch {
    return false;
  }
}

export async function showUnsupportedBrowserGuide() {
  try {
    // butuh instance; kalau belum ada, inisialisasi sementara
    if (!sdkInstance) {
      await initDappPortal();
    }
    await sdkInstance?.showUnsupportedBrowserGuide?.();
  } catch (e) {
    console.warn("[DappPortal] showUnsupportedBrowserGuide failed:", e);
  }
}
