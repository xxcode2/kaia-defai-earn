// lib/dappPortal.ts
import DappPortalSDK from "@linenext/dapp-portal-sdk";

let sdkInstance: any | null = null;

/**
 * Init Dapp Portal SDK sekali saat app start.
 * Wajib pakai DappPortalSDK.Init(...) — constructor-nya private.
 */
export async function initDappPortal(opts?: { clientId?: string; chainId?: string }) {
  const clientId =
    opts?.clientId ?? process.env.NEXT_PUBLIC_DAPPPORTAL_CLIENT_ID ?? "";
  const chainId =
    String(opts?.chainId ?? process.env.NEXT_PUBLIC_CHAIN_ID ?? "1001");

  if (!clientId) {
    console.warn(
      "[DappPortal] Missing clientId. Set NEXT_PUBLIC_DAPPPORTAL_CLIENT_ID in .env.local."
    );
    sdkInstance = null;
    return null;
  }

  try {
    // Proper way: gunakan static Init
    const sdk = await DappPortalSDK.init({ clientId, chainId });
    sdkInstance = sdk;
    return sdkInstance;
  } catch (err) {
    console.error("[DappPortal] Init failed:", err);
    sdkInstance = null;
    return null;
  }
}

/** Ambil instance yang sudah di-init */
export function getDappPortal() {
  return sdkInstance;
}

/** Helper ambil wallet provider (EIP-1193 compatible) */
export function getWalletProvider() {
  return sdkInstance?.getWalletProvider?.() ?? null;
}

/** Helper ambil payment provider */
export function getPaymentProvider() {
  return sdkInstance?.getPaymentProvider?.() ?? null;
}

/** Opsional: cek dukungan browser, tampilkan guide kalau tidak didukung */
export async function ensureSupportedBrowser() {
  if (!sdkInstance) return;
  try {
    const ok = sdkInstance.isSupportedBrowser?.();
    if (ok === false) {
      await sdkInstance.showUnsupportedBrowserGuide?.();
    }
  } catch (e) {
    console.warn("[DappPortal] Browser support check failed:", e);
  }
}
