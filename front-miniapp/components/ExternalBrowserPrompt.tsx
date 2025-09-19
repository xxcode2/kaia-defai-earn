// front-miniapp/components/ExternalBrowserPrompt.tsx
'use client';
import React from 'react';
export default function ExternalBrowserPrompt({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="p-6 text-center">
      <h3 className="text-xl font-semibold mb-3">Buka di Browser Eksternal</h3>
      <p className="text-sm mb-6">Untuk menghubungkan wallet, silakan buka halaman ini di Chrome (Android) atau Safari (iOS).</p>
      <button onClick={onOpen} className="px-6 py-3 rounded-full bg-emerald-600 text-white">Buka di Browser</button>
    </div>
  );
}
