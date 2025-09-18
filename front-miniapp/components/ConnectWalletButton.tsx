import dynamic from 'next/dynamic';

// Komponen ini TIDAK di-SSR. Hook `useWeb3Modal` hanya dievaluasi di client.
const ConnectWalletButton = dynamic(() => import('./ConnectWalletButtonInner'), {
  ssr: false
});

export default ConnectWalletButton;
