/**
 * Fetch the contract's schema/ABI from the node.
 */
import { createClient, createAccount } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

const CONTRACT = process.env.VEILPACT_CONTRACT_ADDRESS ?? "0x25d0c8C70f2B6fbbDf93dA8a0885a54e5785B492";
const PK1 = process.env.VEILPACT_PK1;

const acct1 = createAccount(PK1);
const client1 = createClient({ chain: studionet, account: acct1 });

async function main() {
  // Direct RPC call to get contract schema
  try {
    const schema = await client1.request({
      method: "gen_getContractSchemaForAddress",
      params: [CONTRACT],
    });
    console.log("Schema:", JSON.stringify(schema, null, 2));
  } catch(e) {
    console.log("gen_getContractSchemaForAddress error:", e.message?.slice(0, 300));
  }

  // Try alternative method names
  try {
    const schema = await client1.request({
      method: "gen_getContractSchema",
      params: [{ address: CONTRACT }],
    });
    console.log("Schema2:", JSON.stringify(schema, null, 2));
  } catch(e) {
    console.log("gen_getContractSchema error:", e.message?.slice(0, 300));
  }

  // Also print what methods the client has
  console.log("\nClient keys:", Object.keys(client1).filter(k => typeof client1[k] === 'function'));
}

main().catch(e => { console.error("FATAL:", e.message); process.exit(1); });
