// components/OpenExternal.ts
import { isAndroid, isIOS } from '@/lib/env';

/**
 * Buka halaman di browser eksternal.
 * - iOS: pake window.open (user pilih Safari)
 * - Android: coba intent:// agar langsung ke Chrome, fallback _blank
 */
export function openExternalBrowser(url: string) {
  if (!url) url = window.location.href;

  try {
    if (isAndroid()) {
      // intent untuk membuka Chrome
      const intent = `intent://${url.replace(/^https?:\/\//, '')}#Intent;package=com.android.chrome;scheme=https;end`;
      // coba intent dulu
      window.location.href = intent;
      // fallback tab baru
      setTimeout(() => window.open(url, '_blank', 'noopener,noreferrer'), 500);
      return;
    }

    // iOS & lainnya
    window.open(url, '_blank', 'noopener,noreferrer');
  } catch {
    // fallback terakhir
    window.location.href = url;
  }
}
