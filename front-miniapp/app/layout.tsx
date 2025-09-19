// app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import WalletProviderHybrid from '@/components/WalletProviderHybrid';

const Web3ModalInit = dynamic(() => import('@/components/Web3ModalInit'), { ssr: false });

export const metadata: Metadata = {
  title: 'MORE Earn',
  description: 'Earn USDT on Kaia',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Web3ModalInit>
          <WalletProviderHybrid>{children}</WalletProviderHybrid>
        </Web3ModalInit>
      </body>
    </html>
  );
}
