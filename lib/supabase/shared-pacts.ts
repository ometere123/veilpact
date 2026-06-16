import { supabase } from "./client";
import type { EncryptedPackage } from "@/lib/crypto/encryption";

const DEFAULT_SHARE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface SharedPactRow {
  id:              string;
  encrypted_pkg:   EncryptedPackage;
  agreement_root:  string;
  metadata_hash:   string;
  on_chain_id:     number | null;
  party_a:         string;
  party_b:         string;
  clause_count:    number;
  payment_enabled: boolean;
  expires_at:      string | null;
  used_at:         string | null;
  created_at:      string;
}

export interface SharePayload {
  encryptedPkg:   EncryptedPackage;
  agreementRoot:  string;
  metadataHash:   string;
  onChainId:      number | null;
  partyA:         string;
  partyB:         string;
  clauseCount:    number;
  paymentEnabled: boolean;
  expiresAt?:     string | null;
}

/** Upload the encrypted package and return the Supabase row ID. */
export async function uploadSharedPact(payload: SharePayload): Promise<string> {
  const expiresAt = payload.expiresAt ?? new Date(Date.now() + DEFAULT_SHARE_TTL_MS).toISOString();
  const { data, error } = await supabase
    .from("shared_pacts")
    .insert({
      encrypted_pkg:   payload.encryptedPkg,
      agreement_root:  payload.agreementRoot,
      metadata_hash:   payload.metadataHash,
      on_chain_id:     payload.onChainId,
      party_a:         payload.partyA.toLowerCase(),
      party_b:         payload.partyB.toLowerCase(),
      clause_count:    payload.clauseCount,
      payment_enabled: payload.paymentEnabled,
      expires_at:      expiresAt,
    })
    .select("id")
    .single();

  if (error) throw new Error(`Supabase upload failed: ${error.message}`);
  return (data as { id: string }).id;
}

/** Fetch a shared pact by its Supabase row ID. */
export async function fetchSharedPact(id: string): Promise<SharedPactRow> {
  const { data, error } = await supabase
    .from("shared_pacts")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw new Error(`Supabase fetch failed: ${error.message}`);
  const row = data as SharedPactRow;
  if (row.expires_at && Date.now() > Date.parse(row.expires_at)) {
    throw new Error("This share link has expired. Ask the creator to send a fresh encrypted share link.");
  }
  return row;
}
