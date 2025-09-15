// lib/dappPortal.ts
import { DappPortalSDK } from "@linenext/dapp-portal-sdk";

let sdkInstance: any | null = null;

export async function getDappPortal() {
  if (typeof window === "undefined") return null;

  const clientId = process.env.NEXT_PUBLIC_DAPP_CLIENT_ID || "";
  const chainId = (process.env.NEXT_PUBLIC_CHAIN_ID || "1001").toString();

  if (!clientId) {
    // Belum ada clientId → skip tanpa error
    return null;
  }

  if (sdkInstance) return sdkInstance;

  const DappPortalSDK = (await import("@linenext/dapp-portal-sdk"))
    .default as unknown as typeof DappPortalSDKType;

  // @ts-ignore - jenis konstruktor SDK: new DappPortalSDK({ clientId, chainId })
  const sdk = new DappPortalSDK({ clientId, chainId });

  // Beberapa versi SDK pakai Init() dengan huruf besar
  if (typeof (sdk as any).Init === "function") {
    await (sdk as any).Init();
  } else if (typeof (sdk as any).init === "function") {
    await (sdk as any).init();
  }

  sdkInstance = sdk;
  return sdkInstance;
}
