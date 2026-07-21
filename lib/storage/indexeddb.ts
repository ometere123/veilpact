import { openDB, type IDBPDatabase } from "idb";
import type { PactOnChain, PaymentSetup } from "@/lib/schemas/pact";

export interface StoredPact {
  id:                string;
  encryptedPkg:      object;
  keyHex?:           string;
  keyRemembered?:    boolean;
  agreementRoot:     string;
  metadataHash:      string;
  partyA:            string;
  partyB:            string;
  title:             string;
  clauseCount:       number;
  status:            string;
  onChainId:         number | null;
  createdAt:         number;
  downloaded:        boolean;
  lastBackedUpAt?:   number;
  backupVersion?:    string;
  importedAt?:       number;
  rootSalt:          string;
  clauseCommitments: string[];
  payment:           PaymentSetup | null;
  source?:           "creator" | "accepted-counterparty" | "imported" | "local-cache";
  role?:             "partyA" | "partyB" | "payer" | "payee" | "observer";
  counterparty?:     string;
  localPackageId?:   string;
  lastSyncedAt?:     number;
  chainSnapshot?:    Partial<PactOnChain>;
}

export interface StoredDraft {
  id:        string;
  data:      object;
  updatedAt: number;
}

let _db: IDBPDatabase | null = null;

async function getDB(): Promise<IDBPDatabase> {
  if (_db) return _db;
  _db = await openDB("veilpact", 4, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        const pacts = db.createObjectStore("pacts", { keyPath: "id" });
        pacts.createIndex("partyA",    "partyA");
        pacts.createIndex("partyB",    "partyB");
        pacts.createIndex("createdAt", "createdAt");
        db.createObjectStore("drafts", { keyPath: "id" });
      }
      // v2: rootSalt + clauseCommitments (IDB schemaless — no store change needed)
      // v3: payment setup field added (IDB schemaless — no store change needed)
    },
  });
  return _db;
}

export async function storePact(pact: StoredPact): Promise<void> {
  const db = await getDB();
  await db.put("pacts", pact);
}

export async function getPact(id: string): Promise<StoredPact | undefined> {
  const db = await getDB();
  return db.get("pacts", id);
}

export async function getAllPacts(): Promise<StoredPact[]> {
  const db = await getDB();
  return db.getAll("pacts");
}

export async function getPactByOnChainId(onChainId: number): Promise<StoredPact | undefined> {
  const pacts = await getAllPacts();
  return pacts.find(pact => pact.onChainId === onChainId);
}

export async function getPactByAgreementRoot(agreementRoot: string): Promise<StoredPact | undefined> {
  const pacts = await getAllPacts();
  return pacts.find(pact => pact.agreementRoot?.toLowerCase() === agreementRoot.toLowerCase());
}

export async function updatePactStatus(id: string, status: string, onChainId?: number): Promise<void> {
  const db   = await getDB();
  const pact = await db.get("pacts", id) as StoredPact | undefined;
  if (!pact) return;
  pact.status = status;
  if (onChainId !== undefined) pact.onChainId = onChainId;
  pact.lastSyncedAt = Date.now();
  await db.put("pacts", pact);
}

export async function updatePactBackupStatus(id: string, downloaded = true): Promise<void> {
  const db = await getDB();
  const pact = await db.get("pacts", id) as StoredPact | undefined;
  if (!pact) return;
  pact.downloaded = downloaded;
  pact.lastBackedUpAt = downloaded ? Date.now() : undefined;
  pact.backupVersion = downloaded ? "1.0" : pact.backupVersion;
  await db.put("pacts", pact);
}

export async function importStoredPact(pact: StoredPact): Promise<StoredPact> {
  const db = await getDB();
  const now = Date.now();
  const existing = pact.onChainId !== null && pact.onChainId !== undefined
    ? await getPactByOnChainId(pact.onChainId)
    : await getPactByAgreementRoot(pact.agreementRoot);
  const stored: StoredPact = {
    ...existing,
    ...pact,
    id: existing?.id ?? pact.id,
    downloaded: true,
    lastBackedUpAt: pact.lastBackedUpAt ?? now,
    backupVersion: pact.backupVersion ?? "1.0",
    importedAt: now,
    source: pact.source ?? "imported",
  };
  await db.put("pacts", stored);
  return stored;
}

export async function updatePactChainCache(id: string, chainPact: PactOnChain): Promise<void> {
  const db = await getDB();
  const pact = await db.get("pacts", id) as StoredPact | undefined;
  if (!pact) return;
  pact.status = chainPact.status;
  pact.onChainId = chainPact.pactId;
  pact.lastSyncedAt = Date.now();
  pact.chainSnapshot = {
    pactId: chainPact.pactId,
    status: chainPact.status,
    acceptedAt: chainPact.acceptedAt,
    closedAt: chainPact.closedAt,
    paymentStatus: chainPact.paymentStatus,
    fundedAmount: chainPact.fundedAmount,
    payerClaimable: chainPact.payerClaimable,
    payeeClaimable: chainPact.payeeClaimable,
    payerClaimed: chainPact.payerClaimed,
    payeeClaimed: chainPact.payeeClaimed,
    settlementApplied: chainPact.settlementApplied,
    disputeCount: chainPact.disputeCount,
    revealedCount: chainPact.revealedCount,
  };
  await db.put("pacts", pact);
}

export async function storeDraft(draft: StoredDraft): Promise<void> {
  const db = await getDB();
  await db.put("drafts", draft);
}

export async function getDraft(id: string): Promise<StoredDraft | undefined> {
  const db = await getDB();
  return db.get("drafts", id);
}
