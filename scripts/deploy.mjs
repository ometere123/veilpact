import { readFile } from "node:fs/promises";
import { createClient, createAccount } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";

const privateKey = process.env.PRIVATE_KEY;
if (!privateKey) throw new Error("Set PRIVATE_KEY to a throwaway deployer key");

const code = await readFile(new URL("../contracts/VeilPact.py", import.meta.url), "utf8");
const account = createAccount(privateKey);
const client = createClient({ chain: studionet, account });

console.log("Deployer:", account.address);
const hash = await client.deployContract({ code, args: [] });
console.log("Deployment transaction:", hash);

const transaction = await client.waitForTransactionReceipt({
  hash,
  status: TransactionStatus.FINALIZED,
  retries: 180,
  interval: 5000,
});

const failedValidator = transaction.consensus_data?.validators?.find(
  validator => validator.execution_result === "ERROR",
);
if (failedValidator) {
  throw new Error(failedValidator.genvm_result?.stderr || "Contract deployment failed in GenVM");
}

const contractAddress = transaction.contract_address ?? transaction.to_address;
if (!contractAddress) throw new Error("Finalized deployment did not return a contract address");
console.log("Contract address:", contractAddress);
