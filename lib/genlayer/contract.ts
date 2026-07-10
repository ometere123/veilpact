// VeilPact contract — all reads/writes go through GenLayer JS SDK.
// Reads:  getReadClient().readContract(...)
// Writes: getWriteClient(address) → client.connect(network) → client.writeContract(...)
//
// NEVER use eth_sendTransaction, sendRawTransaction, or window.ethereum directly.
// For payable methods (fund_pact), pass value as BigInt in the writeContract call.

import { getReadClient, getWriteClient, TransactionStatus } from './client';
import { CONTRACT_ADDRESS } from '@/lib/constants';
import type { PactOnChain, DisputeOnChain } from '@/lib/schemas/pact';

interface GenLayerReadClient {
  readContract(args: { address: string; functionName: string; args: unknown[] }): Promise<unknown>;
  waitForTransactionReceipt(args: {
    hash: string;
    status: TransactionStatus;
    retries: number;
    interval: number;
  }): Promise<GenLayerReceipt>;
}

interface GenLayerWriteClient {
  writeContract(args: { address: string; functionName: string; args: unknown[]; value: bigint }): Promise<string>;
}

interface GenLayerReceipt {
  consensus_data?: {
    leader_receipt?: Array<{
      execution_result?: string;
      stderr?: string;
      genvm_result?: {
        execution_result?: string;
        stderr?: string;
      };
      result?: {
        status?: string;
        payload?: string;
      };
    }>;
  };
}

// ── Guards ─────────────────────────────────────────────────────────────────────
function assertContract() {
  if (!CONTRACT_ADDRESS || !CONTRACT_ADDRESS.startsWith('0x')) {
    throw new Error(
      '[VeilPact] CONTRACT_ADDRESS is not set. ' +
      'Add NEXT_PUBLIC_VEILPACT_CONTRACT_ADDRESS to .env.local and redeploy.'
    );
  }
}

function assertAddress(addr: string, label: string): asserts addr is `0x${string}` {
  if (!addr || !addr.startsWith('0x') || addr.length !== 42) {
    throw new Error(`[VeilPact] Invalid ${label}: "${addr}"`);
  }
}

// ── Read ───────────────────────────────────────────────────────────────────────
async function read<T>(functionName: string, args: unknown[] = []): Promise<T> {
  assertContract();
  console.log('[VeilPact read]', { address: CONTRACT_ADDRESS, functionName, args });
  const client = getReadClient();
  const result = await (client as unknown as GenLayerReadClient).readContract({
    address: CONTRACT_ADDRESS,
    functionName,
    args,
  });
  console.log('[VeilPact read result]', functionName, result);
  return result as T;
}

// ── Write ──────────────────────────────────────────────────────────────────────
async function write(
  walletAddress: `0x${string}`,
  functionName: string,
  args: unknown[],
  value: bigint = BigInt(0),
): Promise<string> {
  assertContract();
  assertAddress(walletAddress, 'walletAddress');
  console.log('[VeilPact write]', { address: CONTRACT_ADDRESS, functionName, args, value: value.toString() });

  const client = getWriteClient(walletAddress, {
    functionName,
    contractAddress: CONTRACT_ADDRESS,
    expectedValue: value,
  });

  const txHash = await (client as unknown as GenLayerWriteClient).writeContract({
    address: CONTRACT_ADDRESS,
    functionName,
    args,
    value,
  });

  console.log('[VeilPact tx]', txHash);
  return txHash as string;
}

async function waitFinalized(txHash: string): Promise<unknown> {
  const client = getReadClient();
  const receipt = await (client as unknown as GenLayerReadClient).waitForTransactionReceipt({
    hash:   txHash,
    status: TransactionStatus.FINALIZED,
    retries: 200,
    interval: 3000,
  });
  const leader = receipt?.consensus_data?.leader_receipt?.[0];
  const executionResult = leader?.execution_result
    ?? leader?.genvm_result?.execution_result
    ?? leader?.result?.status;
  const accepted = ['SUCCESS', 'ACCEPTED', 'success', 'accepted'].includes(String(executionResult));
  if (!accepted) {
    // gl.vm.UserError rolls back with the message in result.payload; raw tracebacks land in stderr.
    const payload = leader?.result?.payload;
    const stderr = leader?.genvm_result?.stderr ?? leader?.stderr;
    const detail = typeof payload === 'string' && payload.length > 0
      ? payload
      : typeof stderr === 'string' && stderr.length > 0
        ? stderr.split('\n').filter(Boolean).slice(-2).join('\n')
        : `execution_result=${String(executionResult ?? 'missing')}`;
    throw new Error(`[VeilPact] Contract write failed\n${detail}`);
  }
  console.log('[VeilPact finalized]', txHash, receipt);
  return receipt;
}

// ── Read methods ───────────────────────────────────────────────────────────────
export const veilpactRead = {
  getHashingSpec:      ()                                        => read('get_hashing_spec',       []),
  getPaymentSpec:      ()                                        => read('get_payment_spec',        []),
  getBalance:          ()                                        => read('get_balance',             []),
  getAdmin:            ()                                        => read('get_admin',               []),
  getResolver:         ()                                        => read('get_resolver',            []),
  getProtocolStats:    ()                                        => read('get_protocol_stats',      []),
  getPrivacyLedger:    ()                                        => read('get_privacy_ledger',      []),
  getPact:             (pactId: number)                          => read<PactOnChain>('get_pact',            [pactId]),
  getClauseCommitment: (pactId: number, clauseIndex: number)     => read('get_clause_commitment',   [pactId, clauseIndex]),
  getDispute:          async (pactId: number, disputeId: number) => {
    const dispute = await read<DisputeOnChain & { openedBy?: string; verdict?: { confidence?: number | string } }>('get_dispute', [pactId, disputeId]);
    if (dispute.openedBy && !dispute.opener) {
      dispute.opener = dispute.openedBy;
    }
    if (dispute.verdict) {
      dispute.verdict.confidence = Number(dispute.verdict.confidence);
    }
    return dispute as DisputeOnChain;
  },
  getReveals:          (pactId: number)                          => read('get_reveals',             [pactId]),
  getUserPacts:        (address: string)                         => read('get_user_pacts',          [address]),
};

// ── Write methods ──────────────────────────────────────────────────────────────
export const veilpactWrite = {

  // Create a new pact. expectedAmount = 0 for no funded settlement.
  createPact: async (
    walletAddress: `0x${string}`,
    counterparty: string,
    agreementRoot: string,
    clauseCommitments: string[],
    metadataHash: string,
    rootSalt: string,
    payer: string,
    payee: string,
    expectedAmount: bigint,
  ) => {
    const txHash = await write(walletAddress, 'create_pact', [
      counterparty, agreementRoot, clauseCommitments,
      metadataHash, rootSalt, payer, payee, expectedAmount,
    ]);
    await waitFinalized(txHash);
    return txHash;
  },

  // Payable — sends GEN to the contract. value must equal expectedAmount.
  fundPact: async (walletAddress: `0x${string}`, pactId: number, value: bigint) => {
    const txHash = await write(walletAddress, 'fund_pact', [pactId], value);
    await waitFinalized(txHash);
    return txHash;
  },

  acceptPact: async (walletAddress: `0x${string}`, pactId: number) => {
    const txHash = await write(walletAddress, 'accept_pact', [pactId]);
    await waitFinalized(txHash);
    return txHash;
  },

  cancelUnacceptedPact: async (walletAddress: `0x${string}`, pactId: number) => {
    const txHash = await write(walletAddress, 'cancel_unaccepted_pact', [pactId]);
    await waitFinalized(txHash);
    return txHash;
  },

  releasePayment: async (walletAddress: `0x${string}`, pactId: number) => {
    const txHash = await write(walletAddress, 'release_payment', [pactId]);
    await waitFinalized(txHash);
    return txHash;
  },

  proposeClose: async (walletAddress: `0x${string}`, pactId: number, payoutTo: string) => {
    const txHash = await write(walletAddress, 'propose_close', [pactId, payoutTo]);
    await waitFinalized(txHash);
    return txHash;
  },

  confirmClose: async (walletAddress: `0x${string}`, pactId: number) => {
    const txHash = await write(walletAddress, 'confirm_close', [pactId]);
    await waitFinalized(txHash);
    return txHash;
  },

  cancelClose: async (walletAddress: `0x${string}`, pactId: number) => {
    const txHash = await write(walletAddress, 'cancel_close', [pactId]);
    await waitFinalized(txHash);
    return txHash;
  },

  openDispute: async (
    walletAddress: `0x${string}`,
    pactId: number,
    clauseIndex: number,
    claim: string,
    requestedOutcome: string,
  ) => {
    const txHash = await write(walletAddress, 'open_dispute', [
      pactId, clauseIndex, claim, requestedOutcome,
    ]);
    await waitFinalized(txHash);
    return txHash;
  },

  respondToDispute: async (
    walletAddress: `0x${string}`,
    pactId: number,
    disputeId: number,
    responseJson: string,
  ) => {
    const txHash = await write(walletAddress, 'respond_to_dispute', [
      pactId, disputeId, responseJson,
    ]);
    await waitFinalized(txHash);
    return txHash;
  },

  revealClauseForDispute: async (
    walletAddress: `0x${string}`,
    pactId: number,
    disputeId: number,
    clauseIndex: number,
    clausePayloadJson: string,
    evidenceBundleJson: string,
  ) => {
    const txHash = await write(walletAddress, 'reveal_clause_for_dispute', [
      pactId, disputeId, clauseIndex, clausePayloadJson, evidenceBundleJson,
    ]);
    await waitFinalized(txHash);
    return txHash;
  },

  applySettlementDecision: async (
    walletAddress: `0x${string}`,
    pactId: number,
    disputeId: number,
  ) => {
    const txHash = await write(walletAddress, 'apply_settlement_decision', [pactId, disputeId]);
    await waitFinalized(txHash);
    return txHash;
  },

  claimPayerRefund: async (walletAddress: `0x${string}`, pactId: number) => {
    const txHash = await write(walletAddress, 'claim_payer_refund', [pactId]);
    await waitFinalized(txHash);
    return txHash;
  },

  claimPayeePayment: async (walletAddress: `0x${string}`, pactId: number) => {
    const txHash = await write(walletAddress, 'claim_payee_payment', [pactId]);
    await waitFinalized(txHash);
    return txHash;
  },

  closeDispute: async (walletAddress: `0x${string}`, pactId: number, disputeId: number) => {
    const txHash = await write(walletAddress, 'close_dispute', [pactId, disputeId]);
    await waitFinalized(txHash);
    return txHash;
  },

  closePact: async (walletAddress: `0x${string}`, pactId: number) => {
    const txHash = await write(walletAddress, 'close_pact', [pactId]);
    await waitFinalized(txHash);
    return txHash;
  },
};
