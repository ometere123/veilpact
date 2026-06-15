// Canonical JSON + SHA-256 — must mirror VeilPact.py contract exactly.
// Contract hashing: hashlib.sha256(json.dumps(obj, sort_keys=True, separators=(',',':')).encode())
// Frontend must produce identical hashes — any field diff = reveal fails.

import type { PactDraft, Clause } from "@/lib/schemas/pact";
import { GENLAYER_NETWORK } from "@/lib/constants";

const ROOT_VERSION   = "VEILPACT_ROOT_V1";
const CLAUSE_VERSION = "1.0";

export async function sha256Hex(text: string): Promise<string> {
  const encoded = new TextEncoder().encode(text);
  const buf     = await crypto.subtle.digest("SHA-256", encoded);
  return "0x" + Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function canonicalJson(obj: Record<string, unknown>): string {
  // Keys sorted alphabetically — matches Python json.dumps(sort_keys=True, separators=(',',':'))
  const sorted = Object.fromEntries(Object.keys(obj).sort().map(k => [k, obj[k]]));
  return JSON.stringify(sorted);
}

// Clause payload — must match contract's _verify_clause_commitment exactly.
// Fields: version, network, partyA, partyB, clauseIndex, clauseType,
//         clauseTitle, clauseText, remedyPreference, clauseSalt
export function canonicalClausePayload(draft: PactDraft, clause: Clause, clauseIndex: number): string {
  const payload: Record<string, unknown> = {
    clauseIndex,
    clauseSalt:       clause.salt,
    clauseText:       clause.text,
    clauseTitle:      clause.title,
    clauseType:       clause.type,
    network:          GENLAYER_NETWORK,
    partyA:           draft.partyA.toLowerCase(),
    partyB:           draft.partyB.toLowerCase(),
    remedyPreference: clause.remedyPreference,
    version:          CLAUSE_VERSION,
  };
  return canonicalJson(payload);
}

export async function hashClauseCommitment(draft: PactDraft, clause: Clause, clauseIndex: number): Promise<string> {
  return sha256Hex(canonicalClausePayload(draft, clause, clauseIndex));
}

// Root payload — must match contract's _verify_agreement_root exactly.
// Fields: version, network, partyA, partyB, metadataHash, clauseCommitments, rootSalt
export function canonicalRootPayload(
  draft: PactDraft,
  commitments: string[],
  rootSalt: string,
  metadataHash: string,
): string {
  const payload: Record<string, unknown> = {
    clauseCommitments: commitments,          // order preserved as-is
    metadataHash:      metadataHash.toLowerCase(),
    network:           GENLAYER_NETWORK,
    partyA:            draft.partyA.toLowerCase(),
    partyB:            draft.partyB.toLowerCase(),
    rootSalt,
    version:           ROOT_VERSION,
  };
  return canonicalJson(payload);
}

export async function generateAgreementRoot(
  draft: PactDraft,
  commitments: string[],
  rootSalt: string,
  metadataHash: string,
): Promise<string> {
  return sha256Hex(canonicalRootPayload(draft, commitments, rootSalt, metadataHash));
}

export async function generateMetadataHash(draft: PactDraft): Promise<string> {
  const payload: Record<string, unknown> = {
    category:    draft.category,
    description: draft.description,
    duration:    draft.duration,
    jurisdiction:draft.jurisdiction,
    network:     GENLAYER_NETWORK,
    title:       draft.title,
    version:     "VEILPACT_META_V1",
  };
  return sha256Hex(canonicalJson(payload));
}
