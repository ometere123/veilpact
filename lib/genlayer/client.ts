import { createClient, createAccount } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import { TransactionStatus } from 'genlayer-js/types';

export { studionet, TransactionStatus };

type WalletProvider = {
  request: (payload: { method: string; params?: unknown[] }) => Promise<unknown>;
};

export type WalletTxGuard = {
  functionName: string;
  contractAddress: `0x${string}`;
  expectedValue: bigint;
};

const GEN_BASE = BigInt('1000000000000000000');

function formatGEN(value: bigint): string {
  const whole = value / GEN_BASE;
  const fraction = value % GEN_BASE;
  if (fraction === BigInt(0)) return whole.toString();
  return `${whole}.${fraction.toString().padStart(18, '0').replace(/0+$/, '')}`;
}

function parseRpcQuantity(value: unknown): bigint {
  if (typeof value !== 'string' || value.length === 0) return BigInt(0);
  return BigInt(value);
}

function guardWalletProvider(provider: WalletProvider, guard?: WalletTxGuard): WalletProvider {
  const consensusAddress = studionet.consensusMainContract?.address?.toLowerCase();

  return new Proxy(provider, {
    get(target, prop, receiver) {
      if (prop !== 'request') {
        const value = Reflect.get(target, prop, receiver);
        return typeof value === 'function' ? value.bind(target) : value;
      }

      return async (payload: { method: string; params?: unknown[] }) => {
        if (payload?.method === 'eth_sendTransaction') {
          const tx = payload.params?.[0] as Record<string, unknown> | undefined;
          if (!tx) throw new Error('[VeilPact] Wallet transaction payload is missing.');

          const actualValue = parseRpcQuantity(tx.value);
          const to = typeof tx.to === 'string' ? tx.to.toLowerCase() : '';

          if (guard) {
            if (actualValue !== guard.expectedValue) {
              throw new Error(
                `[VeilPact] Refusing wallet transaction: native value is ${formatGEN(actualValue)} GEN ` +
                `(${actualValue.toString()} wei), expected ${formatGEN(guard.expectedValue)} GEN ` +
                `(${guard.expectedValue.toString()} wei).`
              );
            }
            if (consensusAddress && to !== consensusAddress) {
              throw new Error(
                `[VeilPact] Refusing wallet transaction: target ${String(tx.to)} is not GenLayer consensus ${studionet.consensusMainContract?.address}.`
              );
            }
          }

          console.info('[VeilPact wallet tx guard]', {
            functionName: guard?.functionName ?? 'unknown',
            veilpactContract: guard?.contractAddress,
            consensusContract: studionet.consensusMainContract?.address,
            from: tx.from,
            to: tx.to,
            valueHex: tx.value ?? '0x0',
            valueWei: actualValue.toString(),
            valueGEN: formatGEN(actualValue),
            dataBytes: typeof tx.data === 'string' ? Math.max(0, (tx.data.length - 2) / 2) : 0,
          });
        }

        return target.request.call(target, payload);
      };
    },
  });
}

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
export function getWriteClient(walletAddress: `0x${string}`, txGuard?: WalletTxGuard): ReturnType<typeof createClient> {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('[VeilPact] No injected wallet provider found.');
  }
  const provider = guardWalletProvider(window.ethereum as WalletProvider, txGuard);
  return createClient({ chain: studionet, account: walletAddress, provider });
}
