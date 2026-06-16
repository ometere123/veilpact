"use client";

import { useState, useEffect, useCallback } from 'react';
import { hasInjectedWallet, requestAccounts } from '@/lib/wallet/provider';

const CHAIN_ID     = 61999;
const CHAIN_ID_HEX = '0x' + CHAIN_ID.toString(16);

async function switchToGenLayer(): Promise<void> {
  if (!hasInjectedWallet()) return;
  try {
    await window.ethereum!.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: CHAIN_ID_HEX }],
    });
  } catch (err: unknown) {
    const code = typeof err === "object" && err !== null && "code" in err
      ? Number((err as { code?: unknown }).code)
      : null;
    if (code === 4902 || code === -32603) {
      await window.ethereum!.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: CHAIN_ID_HEX,
          chainName: 'GenLayer StudioNet',
          nativeCurrency: { name: 'GEN', symbol: 'GEN', decimals: 18 },
          rpcUrls: ['https://studio.genlayer.com/api'],
        }],
      });
    }
  }
}

export interface WalletState {
  address:    `0x${string}` | null;
  connected:  boolean;
  connecting: boolean;
  chainId:    number | null;
  error:      string | null;
  connect:    () => Promise<void>;
  disconnect: () => void;
}

export function useWallet(): WalletState {
  const [address,    setAddress]    = useState<`0x${string}` | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [chainId,    setChainId]    = useState<number | null>(null);
  const [error,      setError]      = useState<string | null>(null);

  useEffect(() => {
    if (!hasInjectedWallet()) return;

    (window.ethereum!.request({ method: 'eth_accounts' }) as Promise<`0x${string}`[]>)
      .then(async (list) => {
        if (list.length > 0) {
          setAddress(list[0]);
          await switchToGenLayer();
          const cid = await window.ethereum!.request({ method: 'eth_chainId' }) as string;
          setChainId(parseInt(cid, 16));
        }
      }).catch(() => {});

    const onAccounts = (a: unknown) => {
      const list = a as `0x${string}`[];
      setAddress(list.length > 0 ? list[0] : null);
    };
    const onChain = (cid: unknown) => setChainId(parseInt(cid as string, 16));

    window.ethereum!.on('accountsChanged', onAccounts);
    window.ethereum!.on('chainChanged', onChain);
    return () => {
      window.ethereum!.removeListener('accountsChanged', onAccounts);
      window.ethereum!.removeListener('chainChanged', onChain);
    };
  }, []);

  const connect = useCallback(async () => {
    setError(null);
    if (!hasInjectedWallet()) {
      setError('No injected wallet found. Please install MetaMask or a compatible wallet.');
      return;
    }
    setConnecting(true);
    try {
      const accounts = await requestAccounts();
      setAddress(accounts[0] ?? null);
      await switchToGenLayer();
      const cid = await window.ethereum!.request({ method: 'eth_chainId' }) as string;
      setChainId(parseInt(cid, 16));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Connection failed');
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => setAddress(null), []);

  return { address, connected: !!address, connecting, chainId, error, connect, disconnect };
}
