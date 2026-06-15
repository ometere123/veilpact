import { createClient, createAccount, simplifyTransactionReceipt } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

const hashes = process.argv.slice(2);
if (hashes.length === 0) throw new Error("Pass at least one transaction hash");

const client = createClient({ chain: studionet, account: createAccount() });
const stringify = value => JSON.stringify(value, (_, item) =>
  typeof item === "bigint" ? `${item}n` : item, 2);

for (const hash of hashes) {
  console.log(`\n=== ${hash} ===`);
  const receipt = await client.getTransactionReceipt({ hash });
  console.log("receipt:", stringify(receipt));
  try {
    console.log("simplified:", stringify(simplifyTransactionReceipt(receipt)));
  } catch (error) {
    console.log("simplify error:", error.message);
  }
  try {
    console.log("transaction:", stringify(await client.getTransaction({ hash })));
  } catch (error) {
    console.log("transaction error:", error.message);
  }
}
