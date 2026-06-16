/**
 * Probe script — diagnose contract state after smoke test run.
 * Checks protocol_stats, tries get_pact(0..5), get_user_pacts with various address formats.
 */

import { createClient, createAccount } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

const CONTRACT = "0xFEe7B8D0e25B5bE16cc48350fB09A5657732B641";
const PK1 = process.env.VEILPACT_PK1;

const acct1  = createAccount(PK1);
const client = createClient({ chain: studionet, account: acct1 });

async function r(fn, args = []) {
  try {
    const result = await client.readContract({ address: CONTRACT, functionName: fn, args });
    console.log(`  ${fn}(${args.map(a => JSON.stringify(a)).join(", ")}) =>`, JSON.stringify(result));
    return result;
  } catch (e) {
    console.log(`  ${fn}(${args.map(a => JSON.stringify(a)).join(", ")}) => ERROR:`, e.message?.slice(0, 120));
    return null;
  }
}

async function main() {
  console.log("Account 1:", acct1.address);
  console.log("Account 1 (lower):", acct1.address.toLowerCase());

  console.log("\n── Protocol stats ──");
  await r("get_protocol_stats");

  console.log("\n── Try get_pact IDs 0..5 ──");
  for (let i = 0; i <= 5; i++) await r("get_pact", [i]);

  console.log("\n── get_user_pacts variants ──");
  await r("get_user_pacts", [acct1.address]);
  await r("get_user_pacts", [acct1.address.toLowerCase()]);

  console.log("\n── hashing_spec ──");
  await r("get_hashing_spec");

  console.log("\n── payment_spec ──");
  await r("get_payment_spec");

  console.log("\n── admin / resolver ──");
  await r("get_admin");
  await r("get_resolver");
}

main().catch(e => { console.error("FATAL:", e); process.exit(1); });
