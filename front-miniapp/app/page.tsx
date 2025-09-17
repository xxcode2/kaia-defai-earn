// app/page.tsx
import InitLocale from '@/components/InitLocale';
import HomePage from '@/components/HomePage';

export const metadata = { title: 'Dashboard' }; // "Dashboard | MORE Earn"

export default function Page() {
  return (
    <>
      <InitLocale />
      <HomePage />
    </>
  );
}
