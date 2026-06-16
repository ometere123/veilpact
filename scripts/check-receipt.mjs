/**
 * Minimal test: create_pact with properly computed root, print full receipt.
 */
import { createClient, createAccount, simplifyTransactionReceipt } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";
import { createHash } from "node:crypto";

const CONTRACT = process.env.VEILPACT_CONTRACT_ADDRESS ?? "0x25d0c8C70f2B6fbbDf93dA8a0885a54e5785B492";
const PK1 = process.env.VEILPACT_PK1;
const PK2 = process.env.VEILPACT_PK2;

const acct1 = createAccount(PK1);
const acct2 = createAccount(PK2);
const client1 = createClient({ chain: studionet, account: acct1 });

const A = acct1.address;
const B = acct2.address;
const Alc = A.toLowerCase();
const Blc = B.toLowerCase();

console.log("A:", A);
console.log("B:", B);
console.log("Alc:", Alc);
console.log("Blc:", Blc);

function sha256Hex(text) {
  return "0x" + createHash("sha256").update(text, "utf8").digest("hex");
}

function canonicalJson(obj) {
  const sorted = Object.fromEntries(Object.keys(obj).sort().map(k => [k, obj[k]]));
  return JSON.stringify(sorted);
}

// Build a correct clause commitment
const clauseSalt = "0xdeadbeef01";
const clausePayload = canonicalJson({
  clauseIndex: 0,
  clauseSalt,
  clauseText: "test clause text",
  clauseTitle: "Test Clause",
  clauseType: "DELIVERABLE",
  network: "studionet",
  partyA: Alc,
  partyB: Blc,
  remedyPreference: "RENEGOTIATE",
  version: "1.0",
});
const commitment = sha256Hex(clausePayload);
console.log("\nclausePayload:", clausePayload);
console.log("commitment:", commitment);

const metaPayload = canonicalJson({
  category: "SERVICES",
  description: "Test pact",
  duration: "1 month",
  jurisdiction: "on-chain",
  network: "studionet",
  title: "Receipt Test",
  version: "VEILPACT_META_V1",
});
const metadataHash = sha256Hex(metaPayload);
console.log("metadataHash:", metadataHash);

const rootSalt = "testsalt123";
const rootPayload = canonicalJson({
  clauseCommitments: [commitment],
  metadataHash: metadataHash,
  network: "studionet",
  partyA: Alc,
  partyB: Blc,
  rootSalt,
  version: "VEILPACT_ROOT_V1",
});
const agreementRoot = sha256Hex(rootPayload);
console.log("\nrootPayload:", rootPayload);
console.log("agreementRoot:", agreementRoot);

const args = [B, agreementRoot, [commitment], metadataHash, rootSalt, A, B, BigInt(0)];
console.log("\nArgs:", JSON.stringify(args, (_, v) => typeof v === "bigint" ? v.toString() + "n" : v));

async function main() {
  const txHash = await client1.writeContract({
    address: CONTRACT,
    functionName: "create_pact",
    args,
    value: 0n,
  });
  console.log("\ntxHash:", txHash);

  // Wait for ACCEPTED first
  let receipt = await client1.waitForTransactionReceipt({ hash: txHash, status: TransactionStatus.ACCEPTED });
  console.log("\nACCEPTED receipt:", JSON.stringify(receipt, (_, v) => typeof v === "bigint" ? v.toString() + "n" : v, 2));

  // Try to simplify
  try {
    const simplified = simplifyTransactionReceipt(receipt);
    console.log("\nSimplified:", JSON.stringify(simplified, (_, v) => typeof v === "bigint" ? v.toString() + "n" : v, 2));
  } catch(e) {
    console.log("simplify error:", e.message);
  }

  // Also wait for FINALIZED
  receipt = await client1.waitForTransactionReceipt({ hash: txHash, status: TransactionStatus.FINALIZED });
  console.log("\nFINALIZED receipt:", JSON.stringify(receipt, (_, v) => typeof v === "bigint" ? v.toString() + "n" : v, 2));

  const stats = await client1.readContract({ address: CONTRACT, functionName: "get_protocol_stats", args: [] });
  console.log("\nprotocol_stats:", JSON.stringify(stats));
}

main().catch(e => { console.error("FATAL:", e.message ?? e); process.exit(1); });
