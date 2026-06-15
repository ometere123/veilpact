/**
 * Fetch the contract's schema/ABI from the node.
 */
import { createClient, createAccount } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

const CONTRACT = "0xFEe7B8D0e25B5bE16cc48350fB09A5657732B641";
const PK1 = "0x877603b564a9b320b62d4f0c6a6784e293d6e6f123f01bdae4c1cf13ca6e8cbf";

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
