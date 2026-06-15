import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { privateKeyToAccount } from "viem/accounts";

const required = ["VEILPACT_PK1", "VEILPACT_CONTRACT_ADDRESS", "GENLAYER_RPC_URL"];
for (const name of required) if (!process.env[name]) throw new Error(`Missing ${name}`);

const client = createClient({
  chain: studionet,
  endpoint: process.env.GENLAYER_RPC_URL,
  account: privateKeyToAccount(process.env.VEILPACT_PK1),
});
const pactId = Number(process.argv[2]);
const disputeId = Number(process.argv[3]);
for (let attempt = 1; attempt <= 3; attempt++) {
  try {
    const result = await client.readContract({
      address: process.env.VEILPACT_CONTRACT_ADDRESS,
      functionName: "get_dispute",
      args: [pactId, disputeId],
    });
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (error) {
    console.error(`attempt ${attempt}: ${error.message}`);
    if (attempt < 3) await new Promise(resolve => setTimeout(resolve, 5000));
  }
}
process.exit(1);
