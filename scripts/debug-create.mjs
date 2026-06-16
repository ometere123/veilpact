/**
 * Debug script — tries create_pact with progressively different arg shapes
 * to find what the deployed contract actually accepts.
 */

import { createClient, createAccount } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";
import { createHash } from "node:crypto";

const CONTRACT = "0xFEe7B8D0e25B5bE16cc48350fB09A5657732B641";
const PK1 = process.env.VEILPACT_PK1;
const PK2 = process.env.VEILPACT_PK2;

const acct1 = createAccount(PK1);
const acct2 = createAccount(PK2);
const client1 = createClient({ chain: studionet, account: acct1 });

console.log("A:", acct1.address);
console.log("B:", acct2.address);

function sha256Hex(text) {
  return "0x" + createHash("sha256").update(text).digest("hex");
}
function canon(obj) {
  return JSON.stringify(Object.fromEntries(Object.keys(obj).sort().map(k => [k, obj[k]])));
}

async function tryCreate(label, args, value = 0n) {
  console.log(`\n[${label}]`);
  console.log("  args:", JSON.stringify(args, (_, v) => typeof v === "bigint" ? v.toString() + "n" : v));
  try {
    await client1.initializeConsensusSmartContract();
    const hash = await client1.writeContract({ address: CONTRACT, functionName: "create_pact", args, value });
    console.log("  tx:", hash);
    const receipt = await client1.waitForTransactionReceipt({ hash, status: TransactionStatus.FINALIZED });
    console.log("  finalized:", receipt?.status ?? "ok");

    // Check if pact was actually created
    const stats = await client1.readContract({ address: CONTRACT, functionName: "get_protocol_stats", args: [] });
    console.log("  totalPacts after:", stats?.totalPacts);
    if (stats?.totalPacts > 0) {
      console.log("  ✓ PACT CREATED! totalPacts =", stats.totalPacts);
      return stats.totalPacts;
    } else {
      console.log("  ✗ tx finalized but pact NOT created (silent revert)");
      return null;
    }
  } catch (e) {
    console.log("  ERROR:", e.message?.slice(0, 200));
    return null;
  }
}

async function main() {
  const A = acct1.address;
  const B = acct2.address;
  const Alc = A.toLowerCase();
  const Blc = B.toLowerCase();

  // Attempt 1: 8-arg new API — dummy hashes (no root verification means any hash should work)
  const dummyHash = "0x" + "ab".repeat(32);
  await tryCreate("8-arg dummy hashes", [B, dummyHash, [dummyHash], dummyHash, "salt1", A, B, 0n]);

  // Attempt 2: 8-arg — computed root matching exactly, lowercase parties, rootSalt as plain string
  const clauseSalt = "testclausesalt";
  const clausePayload = canon({
    clauseIndex: 0, clauseSalt, clauseText: "test", clauseTitle: "test", clauseType: "CUSTOM",
    network: "studionet", partyA: Alc, partyB: Blc, remedyPreference: "RENEGOTIATE", version: "1.0",
  });
  const commitment = sha256Hex(clausePayload);

  const metaPayload = canon({ category: "CUSTOM", description: "test", duration: "1d",
    jurisdiction: "none", network: "studionet", title: "Test", version: "1.0" });
  const metaHash = sha256Hex(metaPayload);
  const rootSalt = "testsalt";
  const rootPayload = canon({ clauseCommitments: [commitment], metadataHash: metaHash.toLowerCase(),
    network: "studionet", partyA: Alc, partyB: Blc, rootSalt, version: "VEILPACT_ROOT_V1" });
  const root = sha256Hex(rootPayload);

  await tryCreate("8-arg computed root v1.0 clause", [B, root, [commitment], metaHash, rootSalt, A, B, 0n]);

  // Attempt 3: 8-arg — lowercase addresses passed as counterparty/payer/payee
  await tryCreate("8-arg lowercase addresses", [Blc, root, [commitment], metaHash, rootSalt, Alc, Blc, 0n]);

  // Attempt 4: OLD 5-arg API — in case contract is actually v0.4
  await tryCreate("5-arg (old API — no payment)", [B, dummyHash, [dummyHash], dummyHash, "salt1"]);

  // Attempt 5: 8-arg with VEILPACT_CLAUSE_V1 in clause version
  const clausePayload2 = canon({
    clauseIndex: 0, clauseSalt, clauseText: "test", clauseTitle: "test", clauseType: "CUSTOM",
    network: "studionet", partyA: Alc, partyB: Blc, remedyPreference: "RENEGOTIATE", version: "VEILPACT_CLAUSE_V1",
  });
  const commitment2 = sha256Hex(clausePayload2);
  const rootPayload2 = canon({ clauseCommitments: [commitment2], metadataHash: metaHash.toLowerCase(),
    network: "studionet", partyA: Alc, partyB: Blc, rootSalt, version: "VEILPACT_ROOT_V1" });
  const root2 = sha256Hex(rootPayload2);
  await tryCreate("8-arg VEILPACT_CLAUSE_V1 version", [B, root2, [commitment2], metaHash, rootSalt, A, B, 0n]);

  // Attempt 6: 8-arg with expected_amount as number (not BigInt)
  await tryCreate("8-arg number 0 (not BigInt)", [B, dummyHash, [dummyHash], dummyHash, "salt", A, B, 0]);

  console.log("\n──────────────────────────────────────────");
  const finalStats = await client1.readContract({ address: CONTRACT, functionName: "get_protocol_stats", args: [] });
  console.log("Final stats:", JSON.stringify(finalStats));
}

main().catch(e => { console.error("FATAL:", e); process.exit(1); });
