import { createClient, createAccount } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import { TransactionStatus } from 'genlayer-js/types';

export { studionet, TransactionStatus };

// ── Read client ──────────────────────────────────────────────────────────────
// Throwaway account — only used for view calls that don't need signing.
let _readClient: ReturnType<typeof createClient> | null = null;
export function getReadClient(): ReturnType<typeof createClient> {
  if (!_readClient) {
    _readClient = createClient({ chain: studionet, account: createAccount() });
  }
  return _readClient;
}

// ── Write client (browser wallet) ────────────────────────────────────────────
// Per GenLayer JS docs: pass the wallet ADDRESS as `account`, then call
// client.connect("studionet") before writeContract — MetaMask signs the tx.
// https://docs.genlayer.com/developers/decentralized-applications/writing-data
export function getWriteClient(walletAddress: `0x${string}`): ReturnType<typeof createClient> {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('[VeilPact] No injected wallet provider found.');
  }
  return createClient({ chain: studionet, account: walletAddress, provider: window.ethereum });
}
