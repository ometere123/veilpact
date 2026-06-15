import { supabase } from "./client";
import type { EncryptedPackage } from "@/lib/crypto/encryption";

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
}

/** Upload the encrypted package and return the Supabase row ID. */
export async function uploadSharedPact(payload: SharePayload): Promise<string> {
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
  return data as SharedPactRow;
}

/** Update the on-chain ID after the pact is confirmed on-chain. */
export async function updateSharedPactOnChainId(id: string, onChainId: number): Promise<void> {
  const { error } = await supabase
    .from("shared_pacts")
    .update({ on_chain_id: onChainId })
    .eq("id", id);
  if (error) console.warn("[VeilPact] Could not update on_chain_id:", error.message);
}
