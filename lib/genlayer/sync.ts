import { veilpactRead } from "@/lib/genlayer/contract";
import {
  getAllPacts,
  getPactByAgreementRoot,
  getPactByOnChainId,
  updatePactChainCache,
  type StoredPact,
} from "@/lib/storage/indexeddb";
import type { PactOnChain } from "@/lib/schemas/pact";

export type PactAvailability = "fully-available" | "chain-only" | "local-only";

export interface UserPactSummary {
  pactId: number;
  partyA: string;
  partyB: string;
  status: string;
  agreementRoot: string;
  metadataHash: string;
  clauseCount: number;
  createdAt: number;
  acceptedAt: number;
  revealedCount: number;
  disputeCount: number;
  payer: string;
  payee: string;
  expectedAmount: bigint;
  fundedAmount: bigint;
  paymentStatus: string;
  payerClaimable: bigint;
  payeeClaimable: bigint;
  payerClaimed: boolean;
  payeeClaimed: boolean;
  settlementApplied: boolean;
}

export interface SyncedPact {
  availability: PactAvailability;
  pactId: number | null;
  local: StoredPact | null;
  chain: PactOnChain | UserPactSummary | null;
  status: string;
  title: string;
  agreementRoot: string;
  metadataHash: string;
  partyA: string;
  partyB: string;
  clauseCount: number;
  createdAt: number;
  lastSyncedAt: number | null;
  syncError?: string;
}

type RawUserPact = Record<string, unknown>;

function toBigInt(value: unknown): bigint {
  try {
    return BigInt(value as string | number | bigint);
  } catch {
    return BigInt(0);
  }
}

function normalizeUserPact(raw: RawUserPact): UserPactSummary {
  return {
    pactId: Number(raw.pactId),
    partyA: String(raw.partyA ?? ""),
    partyB: String(raw.partyB ?? ""),
    status: String(raw.status ?? ""),
    agreementRoot: String(raw.agreementRoot ?? ""),
    metadataHash: String(raw.metadataHash ?? ""),
    clauseCount: Number(raw.clauseCount ?? 0),
    createdAt: Number(raw.createdAt ?? 0),
    acceptedAt: Number(raw.acceptedAt ?? 0),
    revealedCount: Number(raw.revealedCount ?? 0),
    disputeCount: Number(raw.disputeCount ?? 0),
    payer: String(raw.payer ?? ""),
    payee: String(raw.payee ?? ""),
    expectedAmount: toBigInt(raw.expectedAmount),
    fundedAmount: toBigInt(raw.fundedAmount),
    paymentStatus: String(raw.paymentStatus ?? "NONE"),
    payerClaimable: toBigInt(raw.payerClaimable),
    payeeClaimable: toBigInt(raw.payeeClaimable),
    payerClaimed: Boolean(raw.payerClaimed),
    payeeClaimed: Boolean(raw.payeeClaimed),
    settlementApplied: Boolean(raw.settlementApplied),
  };
}

function localHasPackage(local: StoredPact | null | undefined): local is StoredPact {
  return !!local?.encryptedPkg;
}

function titleFor(local: StoredPact | null, chain: PactOnChain | UserPactSummary | null): string {
  if (local?.title) return local.title;
  if (chain?.agreementRoot) return `Pact ${chain.agreementRoot.slice(0, 10)}...`;
  return "Untitled Pact";
}

function makeSynced(
  local: StoredPact | null,
  chain: PactOnChain | UserPactSummary | null,
  syncError?: string,
): SyncedPact {
  const availability: PactAvailability = chain
    ? (localHasPackage(local) ? "fully-available" : "chain-only")
    : "local-only";
  return {
    availability,
    pactId: chain?.pactId ?? local?.onChainId ?? null,
    local,
    chain,
    status: chain?.status ?? local?.status ?? "LOCAL_ONLY",
    title: titleFor(local, chain),
    agreementRoot: chain?.agreementRoot ?? local?.agreementRoot ?? "",
    metadataHash: chain?.metadataHash ?? local?.metadataHash ?? "",
    partyA: chain?.partyA ?? local?.partyA ?? "",
    partyB: chain?.partyB ?? local?.partyB ?? "",
    clauseCount: chain?.clauseCount ?? local?.clauseCount ?? 0,
    createdAt: chain?.createdAt ? Number(chain.createdAt) * 1000 : local?.createdAt ?? Date.now(),
    lastSyncedAt: chain ? Date.now() : local?.lastSyncedAt ?? null,
    syncError,
  };
}

export async function syncPactFromChain(pactId: number | bigint): Promise<PactOnChain> {
  const id = Number(pactId);
  const chainPact = await veilpactRead.getPact(id);
  const local = await getPactByOnChainId(id) ?? await getPactByAgreementRoot(chainPact.agreementRoot);
  if (local) {
    await updatePactChainCache(local.id, chainPact);
  }
  return chainPact;
}

export async function syncUserPactsFromChain(address: string): Promise<SyncedPact[]> {
  const lowerAddress = address.toLowerCase();
  const localPacts = (await getAllPacts()).filter(local => {
    const candidates = [
      local.partyA,
      local.partyB,
      local.payment?.payer,
      local.payment?.payee,
      local.counterparty,
    ].filter(Boolean).map(value => String(value).toLowerCase());
    return candidates.length === 0 || candidates.includes(lowerAddress);
  });
  const byId = new Map(localPacts.filter(p => p.onChainId).map(p => [p.onChainId as number, p]));
  const byRoot = new Map(localPacts.map(p => [p.agreementRoot.toLowerCase(), p]));

  let chainRows: UserPactSummary[] = [];
  let chainError: string | undefined;
  try {
    const raw = await veilpactRead.getUserPacts(address) as unknown;
    chainRows = Array.isArray(raw) ? raw.map(row => normalizeUserPact(row as RawUserPact)) : [];
  } catch (e: unknown) {
    chainError = e instanceof Error ? e.message : "Failed to sync user pacts from GenLayer";
  }

  for (const row of chainRows) {
    const local = byId.get(row.pactId) ?? byRoot.get(row.agreementRoot.toLowerCase());
    if (local) {
      await updatePactChainCache(local.id, row as unknown as PactOnChain);
    }
  }

  const chainItems = chainRows.map(row => {
    const local = byId.get(row.pactId) ?? byRoot.get(row.agreementRoot.toLowerCase()) ?? null;
    return makeSynced(local, row, chainError);
  });

  const chainIds = new Set(chainRows.map(row => row.pactId));
  const chainRoots = new Set(chainRows.map(row => row.agreementRoot.toLowerCase()));
  const localOnly = localPacts
    .filter(local => !local.onChainId || (!chainIds.has(local.onChainId) && !chainRoots.has(local.agreementRoot.toLowerCase())))
    .map(local => makeSynced(local, null, chainError));

  return [...chainItems, ...localOnly].sort((a, b) => b.createdAt - a.createdAt);
}
