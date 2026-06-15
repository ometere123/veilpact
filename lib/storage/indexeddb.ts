import { openDB, type IDBPDatabase } from "idb";
import type { PaymentSetup } from "@/lib/schemas/pact";

export interface StoredPact {
  id:                string;
  encryptedPkg:      object;
  keyHex:            string;
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
  rootSalt:          string;
  clauseCommitments: string[];
  payment:           PaymentSetup | null;
}

export interface StoredDraft {
  id:        string;
  data:      object;
  updatedAt: number;
}

let _db: IDBPDatabase | null = null;

async function getDB(): Promise<IDBPDatabase> {
  if (_db) return _db;
  _db = await openDB("veilpact", 3, {
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

export async function updatePactStatus(id: string, status: string, onChainId?: number): Promise<void> {
  const db   = await getDB();
  const pact = await db.get("pacts", id) as StoredPact | undefined;
  if (!pact) return;
  pact.status = status;
  if (onChainId !== undefined) pact.onChainId = onChainId;
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
