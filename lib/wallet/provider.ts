import { createPublicClient, createWalletClient, custom, http } from 'viem';
import { studionet } from '@/lib/genlayer/chains';

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, cb: (...args: unknown[]) => void) => void;
      removeListener: (event: string, cb: (...args: unknown[]) => void) => void;
      isMetaMask?: boolean;
    };
  }
}

export function hasInjectedWallet(): boolean {
  return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
}

export async function requestAccounts(): Promise<`0x${string}`[]> {
  if (!hasInjectedWallet()) {
    throw new Error('No injected wallet found. Please install MetaMask or a compatible wallet.');
  }
  return window.ethereum!.request({ method: 'eth_requestAccounts' }) as Promise<`0x${string}`[]>;
}

export function getWalletClient() {
  if (!hasInjectedWallet()) return null;
  return createWalletClient({ chain: studionet, transport: custom(window.ethereum!) });
}

export function getPublicClient() {
  return createPublicClient({ chain: studionet, transport: http() });
}
