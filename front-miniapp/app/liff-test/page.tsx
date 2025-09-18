export const dynamic = 'force-dynamic';

import dynamicImport from 'next/dynamic';

// Load seluruh konten halaman client-only, tanpa SSR
const LiffTestClient = dynamicImport(() => import('./LiffTestClient'), {
  ssr: false
});

export default function Page() {
  // Halaman server cuma ngerender shell yang memuat client-only component.
  return <LiffTestClient />;
}
