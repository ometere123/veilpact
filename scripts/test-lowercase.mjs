/**
 * Test create_pact with fully lowercase counterparty, payer, payee.
 * Hypothesis: Address() in GenLayer Python only accepts lowercase strings.
 */
import { createClient, createAccount } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";
import { createHash } from "node:crypto";

const CONTRACT = process.env.VEILPACT_CONTRACT_ADDRESS ?? "0x25d0c8C70f2B6fbbDf93dA8a0885a54e5785B492";
const PK1 = process.env.VEILPACT_PK1;
const PK2 = process.env.VEILPACT_PK2;

const acct1 = createAccount(PK1);
const acct2 = createAccount(PK2);
const client1 = createClient({ chain: studionet, account: acct1 });

// ALL LOWERCASE
const Alc = acct1.address.toLowerCase();
const Blc = acct2.address.toLowerCase();
console.log("Alc:", Alc);
console.log("Blc:", Blc);

function sha256Hex(text) {
  return "0x" + createHash("sha256").update(text, "utf8").digest("hex");
}
function canonicalJson(obj) {
  const sorted = Object.fromEntries(Object.keys(obj).sort().map(k => [k, obj[k]]));
  return JSON.stringify(sorted);
}

// Build args with ALL lowercase addresses
const clausePayload = canonicalJson({
  clauseIndex: 0, clauseSalt: "0xlcsalt1", clauseText: "lowercase test", clauseTitle: "Test LC",
  clauseType: "DELIVERABLE", network: "studionet", partyA: Alc, partyB: Blc,
  remedyPreference: "RENEGOTIATE", version: "1.0",
});
const commitment = sha256Hex(clausePayload);
const metadataHash = sha256Hex(canonicalJson({
  category: "SERVICES", description: "lc test", duration: "1m",
  jurisdiction: "on-chain", network: "studionet", title: "LC Test", version: "VEILPACT_META_V1",
}));
const rootSalt = "lcsalt";
const agreementRoot = sha256Hex(canonicalJson({
  clauseCommitments: [commitment],
  metadataHash,
  network: "studionet",
  partyA: Alc,
  partyB: Blc,
  rootSalt,
  version: "VEILPACT_ROOT_V1",
}));

console.log("\ncommitment:", commitment);
console.log("metadataHash:", metadataHash);
console.log("agreementRoot:", agreementRoot);

const argsAllLc = [Blc, agreementRoot, [commitment], metadataHash, rootSalt, Alc, Blc, BigInt(0)];
console.log("\nArgs (all lowercase):", JSON.stringify(argsAllLc, (_, v) => typeof v === "bigint" ? v.toString() + "n" : v));

async function tryWrite(label, args) {
  console.log(`\n── ${label} ──`);
  try {
    const txHash = await client1.writeContract({
      address: CONTRACT, functionName: "create_pact", args, value: 0n,
    });
    console.log("  tx:", txHash);
    const receipt = await client1.waitForTransactionReceipt({ hash: txHash, status: TransactionStatus.FINALIZED });
    console.log("  finalized status:", receipt?.status);

    const stats = await client1.readContract({ address: CONTRACT, functionName: "get_protocol_stats", args: [] });
    console.log("  totalPacts:", stats?.totalPacts);

    if (stats?.totalPacts > 0) {
      console.log("  ✓ PACT CREATED!");
      const userPacts = await client1.readContract({ address: CONTRACT, functionName: "get_user_pacts", args: [Alc] });
      console.log("  user_pacts:", JSON.stringify(userPacts));
    } else {
      console.log("  ✗ Silent revert");
    }
  } catch(e) {
    console.log("  ERROR:", e.message?.slice(0, 300));
  }
}

async function main() {
  // Case 1: ALL lowercase
  await tryWrite("all lowercase (counterparty, payer, payee)", argsAllLc);

  // Check stats before any more tests
  const stats = await client1.readContract({ address: CONTRACT, functionName: "get_protocol_stats", args: [] });
  console.log("\nFinal stats:", JSON.stringify(stats));
}

main().catch(e => { console.error("FATAL:", e.message); process.exit(1); });
