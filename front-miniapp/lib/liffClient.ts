// lib/liffClient.ts
export async function getLiff() {
  if (typeof window === "undefined") return null;
  const liff = (await import("@line/liff")).default;

  const liffId = process.env.NEXT_PUBLIC_LIFF_ID!;
  if (!liffId) {
    console.warn("NEXT_PUBLIC_LIFF_ID is empty. LIFF will not init.");
    return null;
  }

  // Hindari re-init
  try {
    // @ts-ignore
    if (!liff._my_inited) {
      await liff.init({ liffId });
      // @ts-ignore
      liff._my_inited = true;
    }
  } catch (e) {
    console.error("LIFF init failed:", e);
    return null;
  }
  return liff;
}
