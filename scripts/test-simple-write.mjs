/**
 * Test simple write methods to isolate create_pact vs general write issue.
 */
import { createClient, createAccount } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";

const CONTRACT = process.env.VEILPACT_CONTRACT_ADDRESS ?? "0x25d0c8C70f2B6fbbDf93dA8a0885a54e5785B492";
// Admin was set to whoever deployed. Let's check what admin is:
const PK1 = process.env.VEILPACT_PK1;

const acct1 = createAccount(PK1);
const client1 = createClient({ chain: studionet, account: acct1 });

console.log("Account1:", acct1.address);

async function read(fn, args = []) {
  const r = await client1.readContract({ address: CONTRACT, functionName: fn, args });
  console.log(`  ${fn}:`, JSON.stringify(r));
  return r;
}

async function simWrite(fn, args) {
  console.log(`\n[simulate ${fn}]`);
  try {
    const r = await client1.simulateWriteContract({
      address: CONTRACT, functionName: fn, args, value: 0n,
    });
    console.log("  OK:", JSON.stringify(r));
  } catch(e) {
    console.log("  ERROR:", e.message?.slice(0, 300));
  }
}

async function doWrite(fn, args, value = 0n) {
  console.log(`\n[write ${fn}]`);
  const hash = await client1.writeContract({ address: CONTRACT, functionName: fn, args, value });
  console.log("  tx:", hash);
  const r = await client1.waitForTransactionReceipt({ hash, status: TransactionStatus.FINALIZED });
  console.log("  status:", r?.status);
  return hash;
}

async function main() {
  // First: read who admin is
  const admin = await read("get_admin");
  await read("get_resolver");

  // Simulate set_resolver to see if basic writes work (needs admin caller)
  await simWrite("set_resolver", [acct1.address.toLowerCase()]);

  // Try to actually call set_resolver (only works if account1 is admin)
  console.log("\nIs account1 admin?", admin?.toLowerCase() === acct1.address.toLowerCase());

  if (admin?.toLowerCase() === acct1.address.toLowerCase()) {
    await doWrite("set_resolver", [acct1.address.toLowerCase()]);
    await read("get_resolver");
  } else {
    console.log("Not admin, skipping set_resolver write");
    // Try simulate create_pact with lowercase counterparty
    const Alc = acct1.address.toLowerCase();
    const B2 = "0x773364c1623e46e05ab6ecd39db5c5488950fc03"; // all lowercase B
    const dummyHash = "0x" + "ab".repeat(32);
    await simWrite("create_pact", [B2, dummyHash, [dummyHash], dummyHash, "salt", Alc, B2, BigInt(0)]);
  }
}

main().catch(e => { console.error("FATAL:", e.message); process.exit(1); });
