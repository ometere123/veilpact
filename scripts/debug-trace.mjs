/**
 * Use getContractSchema + debugTraceTransaction to understand create_pact failures.
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

const A = acct1.address;
const B = acct2.address;
const Alc = A.toLowerCase();
const Blc = B.toLowerCase();

function sha256Hex(text) {
  return "0x" + createHash("sha256").update(text, "utf8").digest("hex");
}
function canonicalJson(obj) {
  const sorted = Object.fromEntries(Object.keys(obj).sort().map(k => [k, obj[k]]));
  return JSON.stringify(sorted);
}

async function main() {
  // 1. Get contract schema
  console.log("── Contract Schema ──");
  try {
    const schema = await client1.getContractSchema({ address: CONTRACT });
    console.log(JSON.stringify(schema, null, 2));
  } catch(e) {
    console.log("getContractSchema error:", e.message?.slice(0, 300));
  }

  // 2. Submit a create_pact and trace it
  console.log("\n── Submitting create_pact for trace ──");
  const clausePayload = canonicalJson({
    clauseIndex: 0, clauseSalt: "0xsalt1", clauseText: "test", clauseTitle: "Test",
    clauseType: "DELIVERABLE", network: "studionet", partyA: Alc, partyB: Blc,
    remedyPreference: "RENEGOTIATE", version: "1.0",
  });
  const commitment = sha256Hex(clausePayload);
  const metadataHash = sha256Hex(canonicalJson({
    category: "SERVICES", description: "test", duration: "1m",
    jurisdiction: "on-chain", network: "studionet", title: "T", version: "VEILPACT_META_V1",
  }));
  const rootSalt = "rsalt1";
  const agreementRoot = sha256Hex(canonicalJson({
    clauseCommitments: [commitment],
    metadataHash,
    network: "studionet",
    partyA: Alc,
    partyB: Blc,
    rootSalt,
    version: "VEILPACT_ROOT_V1",
  }));

  const args = [B, agreementRoot, [commitment], metadataHash, rootSalt, A, B, BigInt(0)];
  console.log("agreementRoot:", agreementRoot);
  console.log("commitment:", commitment);
  console.log("metadataHash:", metadataHash);

  const txHash = await client1.writeContract({
    address: CONTRACT, functionName: "create_pact", args, value: 0n,
  });
  console.log("txHash:", txHash);

  await client1.waitForTransactionReceipt({ hash: txHash, status: TransactionStatus.FINALIZED });
  console.log("Finalized.");

  // 3. Debug trace
  console.log("\n── debugTraceTransaction ──");
  try {
    const trace = await client1.debugTraceTransaction({ hash: txHash });
    console.log(JSON.stringify(trace, (_, v) => typeof v === "bigint" ? v.toString() + "n" : v, 2));
  } catch(e) {
    console.log("debugTrace error:", e.message?.slice(0, 500));
    if (e.cause) console.log("cause:", JSON.stringify(e.cause)?.slice(0, 500));
  }
}

main().catch(e => { console.error("FATAL:", e.message); process.exit(1); });
