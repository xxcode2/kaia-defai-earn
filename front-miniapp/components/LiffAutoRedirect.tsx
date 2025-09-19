'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Auto-redirect setelah LIFF login.
 * Jika URL mengandung ?liffRedirectUri=..., kita ganti ke path tujuannya
 * lalu hapus query LIFF (code, state, liffClientId, liffRedirectUri).
 */
export default function LiffAutoRedirect() {
  const router = useRouter();
  const once = useRef(false);

  useEffect(() => {
    if (once.current) return;
    once.current = true;

    // hanya di browser
    if (typeof window === 'undefined') return;

    const url = new URL(window.location.href);
    const redirectRaw = url.searchParams.get('liffRedirectUri');
    const hasLiffParams =
      url.searchParams.has('code') ||
      url.searchParams.has('state') ||
      url.searchParams.has('liffClientId');

    if (!redirectRaw && !hasLiffParams) return;

    // decode target; default ke '/' kalau aneh
    let target = '/';
    try {
      target = decodeURIComponent(redirectRaw || '/');
    } catch {
      target = '/';
    }

    // bersihkan query liff dari URL sekarang (tanpa reload)
    url.searchParams.delete('code');
    url.searchParams.delete('state');
    url.searchParams.delete('liffClientId');
    url.searchParams.delete('liffRedirectUri');
    window.history.replaceState({}, '', url.pathname + url.search + url.hash);

    // kalau sudah di target, tidak perlu push lagi
    if (window.location.pathname === target) return;

    // safe redirect: hanya izinkan path internal
    if (target.startsWith('http')) {
      try {
        const t = new URL(target);
        if (t.origin === window.location.origin) {
          router.replace(t.pathname + t.search + t.hash);
        } else {
          // beda origin – fallback ke root
          router.replace('/');
        }
      } catch {
        router.replace('/');
      }
    } else {
      router.replace(target);
    }
  }, [router]);

  return null;
}
