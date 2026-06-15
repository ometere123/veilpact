/**
 * Minimal test: create_pact with properly computed root, print full receipt.
 */
import { createClient, createAccount, simplifyTransactionReceipt } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";
import { createHash } from "node:crypto";

const CONTRACT = "0xFEe7B8D0e25B5bE16cc48350fB09A5657732B641";
const PK1 = "0x877603b564a9b320b62d4f0c6a6784e293d6e6f123f01bdae4c1cf13ca6e8cbf";
const PK2 = "0x54464e96a83a2db45e60b66d6f115770c994f08c9cf68fbccdf883b033409ee1";

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
