'use client';

import { useEffect, useMemo, useState } from 'react';
import { useWeb3Modal } from '@web3modal/wagmi/react';
import {
  useAccount,
  useDisconnect,
  useSwitchChain,
  useChains,
  useChainId
} from 'wagmi';
import type { Chain } from 'viem'; // ⬅️ tambahkan tipe Chain

function shortAddr(addr?: string) {
  if (!addr) return '';
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function ConnectWalletButton() {
  const { open } = useWeb3Modal();
  const { address, isConnecting, isConnected, status } = useAccount();
  const { disconnect } = useDisconnect();
  const chains = useChains();                 // ⬅️ bukan { chains }, tapi langsung array
  const chainId = useChainId();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  const [copied, setCopied] = useState(false);

  // cari Kairos (1001)
  const kairos = useMemo(
    () => chains.find((c: Chain) => c.id === 1001), // ⬅️ tipekan c: Chain
    [chains]
  );

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1200);
    return () => clearTimeout(t);
  }, [copied]);

  const handleCopy = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
    } catch {}
  };

  if (!isConnected || !address) {
    return (
      <button
        onClick={() => open()}
        disabled={isConnecting || status === 'reconnecting'}
        className="px-4 py-2 rounded-xl bg-black text-white hover:opacity-90 disabled:opacity-50"
      >
        {isConnecting || status === 'reconnecting' ? 'Connecting…' : 'Connect Wallet'}
      </button>
    );
  }

  const wrongNetwork = kairos && chainId !== kairos.id;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium px-3 py-1 rounded-lg bg-gray-100">
        {shortAddr(address)}
      </span>

      <button
        onClick={handleCopy}
        className="px-3 py-2 rounded-xl border border-gray-300 hover:bg-gray-50"
        title="Copy address"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>

      {kairos && (
        <span
          className={`px-3 py-1 rounded-xl text-sm ${
            wrongNetwork ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
          }`}
          title={wrongNetwork ? `Connected chain ID: ${chainId}, expected: ${kairos.id}` : `Chain: ${kairos.name}`}
        >
          {wrongNetwork ? `Wrong Network (id: ${chainId})` : kairos.name}
        </span>
      )}

      {wrongNetwork && kairos && (
        <button
          onClick={() => switchChain({ chainId: kairos.id })}
          disabled={isSwitching}
          className="px-3 py-2 rounded-xl border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
          title={`Switch to ${kairos.name}`}
        >
          {isSwitching ? 'Switching…' : 'Switch Network'}
        </button>
      )}

      <button
        onClick={() => disconnect()}
        className="px-3 py-2 rounded-xl border border-gray-300 hover:bg-gray-50"
        title="Disconnect (clear session)"
      >
        Disconnect
      </button>
    </div>
  );
}
