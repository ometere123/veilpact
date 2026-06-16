/**
 * Use simulateWriteContract to get error details for create_pact failures.
 */
import { createClient, createAccount } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
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

console.log("A:", A, "→", Alc);
console.log("B:", B, "→", Blc);

function sha256Hex(text) {
  return "0x" + createHash("sha256").update(text, "utf8").digest("hex");
}

function canonicalJson(obj) {
  const sorted = Object.fromEntries(Object.keys(obj).sort().map(k => [k, obj[k]]));
  return JSON.stringify(sorted);
}

// Case 1: correct root, checksummed addresses for payer/payee
function buildArgs(partyAForRoot, partyBForRoot, payerArg, payeeArg) {
  const clausePayload = canonicalJson({
    clauseIndex: 0,
    clauseSalt: "0xsalt01",
    clauseText: "test",
    clauseTitle: "Test",
    clauseType: "DELIVERABLE",
    network: "studionet",
    partyA: partyAForRoot,
    partyB: partyBForRoot,
    remedyPreference: "RENEGOTIATE",
    version: "1.0",
  });
  const commitment = sha256Hex(clausePayload);
  const metadataHash = sha256Hex(canonicalJson({
    category: "SERVICES", description: "test", duration: "1m",
    jurisdiction: "on-chain", network: "studionet", title: "T", version: "VEILPACT_META_V1",
  }));
  const rootSalt = "rsalt";
  const agreementRoot = sha256Hex(canonicalJson({
    clauseCommitments: [commitment],
    metadataHash,
    network: "studionet",
    partyA: partyAForRoot,
    partyB: partyBForRoot,
    rootSalt,
    version: "VEILPACT_ROOT_V1",
  }));
  return { args: [B, agreementRoot, [commitment], metadataHash, rootSalt, payerArg, payeeArg, BigInt(0)], agreementRoot, commitment };
}

async function simulate(label, args) {
  console.log(`\n── [${label}] ──`);
  console.log("  payer:", args[5]);
  console.log("  payee:", args[6]);
  console.log("  agreementRoot:", args[1]);
  try {
    const result = await client1.simulateWriteContract({
      address: CONTRACT,
      functionName: "create_pact",
      args,
      value: 0n,
    });
    console.log("  simulate OK result:", JSON.stringify(result));
  } catch(e) {
    console.log("  simulate ERROR:", e.message?.slice(0, 500));
    if (e.cause) console.log("  cause:", JSON.stringify(e.cause)?.slice(0, 500));
  }
}

async function main() {
  // Case 1: lowercase addresses in root, checksummed for payer/payee args
  const c1 = buildArgs(Alc, Blc, A, B);
  await simulate("lowercase in root / checksummed payer+payee", c1.args);

  // Case 2: lowercase everywhere
  const c2 = buildArgs(Alc, Blc, Alc, Blc);
  await simulate("all lowercase", c2.args);

  // Case 3: checksummed in root (wrong root would not match anyway)
  // Just try passing a dummyHash to see if ANY version creates
  const dummyHash = "0x" + "ab".repeat(32);
  await simulate("dummy hash (should fail root check)", [B, dummyHash, [dummyHash], dummyHash, "salt1", A, B, BigInt(0)]);

  // Case 4: payer = B, payee = A (swapped)
  const c4 = buildArgs(Alc, Blc, B, A);
  await simulate("swapped payer/payee (B is payer)", c4.args);
}

main().catch(e => { console.error("FATAL:", e.message); process.exit(1); });
