import { createHash } from "node:crypto";
import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { privateKeyToAccount } from "viem/accounts";

const CONTRACT = process.env.VEILPACT_CONTRACT_ADDRESS;
const RPC = process.env.GENLAYER_RPC_URL;
const PK1 = process.env.VEILPACT_PK1;
const PK2 = process.env.VEILPACT_PK2;
const missing = [
  ["VEILPACT_CONTRACT_ADDRESS", CONTRACT],
  ["GENLAYER_RPC_URL", RPC],
  ["VEILPACT_PK1", PK1],
  ["VEILPACT_PK2", PK2],
].filter(([, value]) => !value).map(([name]) => name);
if (missing.length) {
  console.error(`Missing required environment variables: ${missing.join(", ")}`);
  process.exit(2);
}

const accounts = [privateKeyToAccount(PK1), privateKeyToAccount(PK2)];
const clients = accounts.map(account => createClient({ chain: studionet, endpoint: RPC, account }));
const readClient = clients[0];
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const sha256 = text => `0x${createHash("sha256").update(text, "utf8").digest("hex")}`;
function sortCanonical(value) {
  if (Array.isArray(value)) return value.map(sortCanonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, sortCanonical(value[key])]));
  }
  return value;
}
const canonical = value => JSON.stringify(sortCanonical(value));
const compact = value => JSON.stringify(value, (_, item) => typeof item === "bigint" ? item.toString() : item);
const assert = (condition, message) => { if (!condition) throw new Error(`ASSERTION: ${message}`); };

function leaderResult(tx) {
  const leader = tx?.consensus_data?.leader_receipt?.[0];
  const result = leader?.execution_result ?? leader?.genvm_result?.execution_result ?? leader?.result?.status;
  // gl.vm.UserError rolls back with the message in result.payload; raw tracebacks land in stderr.
  const stderr = [leader?.result?.payload, leader?.stderr ?? leader?.genvm_result?.stderr]
    .filter(Boolean).join("\n");
  return { result: String(result ?? "MISSING"), stderr, leader };
}

function isSuccess(result) {
  return ["SUCCESS", "ACCEPTED", "success", "accepted"].includes(result);
}

function errorTail(stderr) {
  return String(stderr).split("\n").filter(Boolean).slice(-2).join("\n") || "no on-chain stderr";
}

async function read(functionName, args = []) {
  return readClient.readContract({ address: CONTRACT, functionName, args });
}

async function write(callerIndex, functionName, args = [], value = 0n, expectFailure = false) {
  const caller = accounts[callerIndex].address;
  let last;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const started = Date.now();
    console.log(`→ ${caller} ${functionName}(${compact(args).slice(0, 180)}) attempt=${attempt}`);
    try {
      const hash = await clients[callerIndex].writeContract({ address: CONTRACT, functionName, args, value });
      const receipt = await clients[callerIndex].waitForTransactionReceipt({ hash, retries: 200, interval: 3000 });
      const tx = await clients[callerIndex].getTransaction({ hash });
      const execution = leaderResult(tx);
      const succeeded = isSuccess(execution.result);
      if (expectFailure ? !succeeded : succeeded) {
        console.log(`✓ ${functionName} (${Date.now() - started}ms) tx=${hash} result=${execution.result}`);
        return { hash, receipt, tx, execution };
      }
      const message = expectFailure
        ? `expected on-chain failure but result was ${execution.result}`
        : errorTail(execution.stderr);
      last = Object.assign(new Error(message), { hash, execution });
    } catch (error) {
      last = error;
    }
    if (attempt < 3) await sleep(5000);
  }
  throw last;
}

function pactFixture(label, amount = 0n) {
  const partyA = accounts[0].address.toLowerCase();
  const partyB = accounts[1].address.toLowerCase();
  const clause = {
    clauseIndex: 0,
    clauseSalt: `salt-${label}`,
    clauseText: `Deliver the ${label} milestone as agreed.`,
    clauseTitle: `${label} milestone`,
    clauseType: "DELIVERABLE",
    network: "studionet",
    partyA,
    partyB,
    remedyPreference: "SETTLE",
    version: "1.0",
  };
  const clauseJson = canonical(clause);
  const commitment = sha256(clauseJson);
  const metadataHash = sha256(canonical({ label, version: "VEILPACT_META_V1" }));
  const rootSalt = `root-${label}`;
  const root = sha256(canonical({
    clauseCommitments: [commitment], metadataHash, network: "studionet",
    partyA, partyB, rootSalt, version: "VEILPACT_ROOT_V1",
  }));
  return { amount, clause, clauseJson, commitment, metadataHash, rootSalt, root };
}

async function createPact(fixture) {
  const before = await read("get_user_pacts", [accounts[0].address]);
  const result = await write(0, "create_pact", [
    accounts[1].address, fixture.root, [fixture.commitment], fixture.metadataHash,
    fixture.rootSalt, accounts[0].address, accounts[1].address, fixture.amount,
  ]);
  const after = await read("get_user_pacts", [accounts[0].address]);
  assert(after.length === before.length + 1, "create_pact increments user pact list");
  const pactId = after.at(-1).pactId;
  const pact = await read("get_pact", [pactId]);
  assert(pact.agreementRoot === fixture.root, "agreement root persisted");
  assert(pact.clauseCommitments[0] === fixture.commitment, "commitment persisted");
  return { pactId, pact, tx: result.hash };
}

async function expectRevert({ caller = 0, fn, args, value = 0n, message, state }) {
  const before = await state();
  const result = await write(caller, fn, args, value, true);
  assert(errorTail(result.execution.stderr).includes(message), `${fn} stderr includes "${message}"`);
  const after = await state();
  assert(compact(after) === compact(before), `${fn} revert leaves state unchanged`);
}

const suites = {
  async "happy-unfunded"() {
    const fixture = pactFixture(`unfunded-${Date.now()}`);
    const { pactId } = await createPact(fixture);
    await write(1, "accept_pact", [pactId]);
    const pact = await read("get_pact", [pactId]);
    assert(pact.status === "ACTIVE", "unfunded pact becomes ACTIVE");
    assert(pact.paymentStatus === "NONE", "unfunded payment status is NONE");
  },

  async "happy-funded-release"() {
    const fixture = pactFixture(`funded-${Date.now()}`, 20n);
    const { pactId } = await createPact(fixture);
    await write(0, "fund_pact", [pactId], fixture.amount);
    let pact = await read("get_pact", [pactId]);
    assert(pact.fundedAmount === 20, "funded amount persisted");
    assert(pact.paymentStatus === "FUNDED", "payment status is FUNDED");
    await write(1, "accept_pact", [pactId]);
    pact = await read("get_pact", [pactId]);
    assert(pact.status === "ACTIVE" && pact.paymentStatus === "LOCKED", "funded pact locks on acceptance");
    await write(0, "release_payment", [pactId]);
    pact = await read("get_pact", [pactId]);
    assert(pact.payeeClaimable === 20 && pact.settlementApplied, "release creates payee claim");
    await write(1, "claim_payee_payment", [pactId]);
    pact = await read("get_pact", [pactId]);
    assert(pact.payeeClaimed && pact.status === "CLOSED", "payee claim closes pact");
  },

  async "happy-mutual-close"() {
    const fixture = pactFixture(`close-${Date.now()}`);
    const { pactId } = await createPact(fixture);
    await write(1, "accept_pact", [pactId]);
    await write(0, "propose_close", [pactId, accounts[1].address]);
    let pact = await read("get_pact", [pactId]);
    assert(pact.closeProposalActive, "close proposal persisted");
    await write(1, "confirm_close", [pactId]);
    pact = await read("get_pact", [pactId]);
    assert(pact.status === "RESOLVED_SETTLE" && !pact.closeProposalActive, "mutual close finalized");
  },

  async "revert-create-inputs"() {
    const fixture = pactFixture(`bad-create-${Date.now()}`);
    const state = () => read("get_protocol_stats");
    await expectRevert({ fn: "create_pact", args: [accounts[0].address, fixture.root, [fixture.commitment], fixture.metadataHash, fixture.rootSalt, accounts[0].address, accounts[1].address, 0n], message: "Counterparty cannot be caller", state });
    await expectRevert({ fn: "create_pact", args: [accounts[1].address, fixture.root, [], fixture.metadataHash, fixture.rootSalt, accounts[0].address, accounts[1].address, 0n], message: "No clause commitments provided", state });
    await expectRevert({ fn: "create_pact", args: [accounts[1].address, `0x${"00".repeat(32)}`, [fixture.commitment], fixture.metadataHash, fixture.rootSalt, accounts[0].address, accounts[1].address, 0n], message: "Agreement root does not match", state });
    await expectRevert({ fn: "create_pact", args: [accounts[1].address, fixture.root, [fixture.commitment, fixture.commitment], fixture.metadataHash, fixture.rootSalt, accounts[0].address, accounts[1].address, 0n], message: "Duplicate clause commitment", state });
  },

  async "revert-lifecycle"() {
    const fixture = pactFixture(`reverts-${Date.now()}`, 20n);
    const { pactId } = await createPact(fixture);
    const state = () => read("get_pact", [pactId]);
    await expectRevert({ caller: 1, fn: "fund_pact", args: [pactId], value: 20n, message: "Only payer can fund pact", state });
    await expectRevert({ caller: 0, fn: "fund_pact", args: [pactId], value: 19n, message: "must send exact pact funding amount", state });
    await expectRevert({ caller: 0, fn: "accept_pact", args: [pactId], message: "Only counterparty can accept", state });
    await write(0, "fund_pact", [pactId], 20n);
    await write(1, "accept_pact", [pactId]);
    await expectRevert({ caller: 1, fn: "release_payment", args: [pactId], message: "Only payer can release payment", state });
    await expectRevert({ caller: 0, fn: "open_dispute", args: [pactId, 2, "bad index", "SETTLE"], message: "Clause index out of range", state });
    await expectRevert({ caller: 0, fn: "open_dispute", args: [pactId, 0, "", "SETTLE"], message: "Invalid claim length", state });
    await expectRevert({ caller: 0, fn: "open_dispute", args: [pactId, 0, "claim", "INVALID"], message: "Invalid requested outcome", state });
  },

  async "nondet-dispute-review"() {
    const fixture = pactFixture(`review-${Date.now()}`, 20n);
    const { pactId } = await createPact(fixture);
    await write(0, "fund_pact", [pactId], 20n);
    await write(1, "accept_pact", [pactId]);
    await write(0, "open_dispute", [pactId, 0, "The milestone was not delivered.", "SETTLE"]);
    const evidence = canonical({ claim: "The milestone was not delivered.", requestedOutcome: "SETTLE", notes: ["No delivery received"] });
    const review = await write(0, "reveal_clause_for_dispute", [pactId, 1, 0, fixture.clauseJson, evidence]);
    assert(review.execution.result !== "UNDETERMINED", "review did not become UNDETERMINED");
    const dispute = await read("get_dispute", [pactId, 1]);
    assert(dispute.status === "RESOLVED", "review persisted as RESOLVED");
    const verdict = dispute.verdict;
    assert(verdict && typeof verdict === "object", "verdict persisted");
    verdict.confidence = Number(verdict.confidence);
    const allowed = {
      clauseRelevant: ["DIRECTLY_RELEVANT", "PARTIALLY_RELEVANT", "NOT_RELEVANT"],
      evidenceStrength: ["STRONG", "MODERATE", "WEAK", "INSUFFICIENT", "CONFLICTING"],
      breachLikelihood: ["LOW", "MEDIUM", "HIGH", "UNCLEAR"],
      recommendedAction: ["CONTINUE", "PAUSE", "RENEGOTIATE", "SETTLE", "DISMISS", "REQUEST_MORE_EVIDENCE", "REQUEST_NARROW_REVEAL", "REJECTED_UNSAFE"],
      paymentDecision: ["NO_PAYMENT_ACTION", "RELEASE_TO_PAYEE", "REFUND_TO_PAYER", "SPLIT_PAYMENT", "PAUSE_PAYMENT"],
      privacyJudgement: ["MINIMAL_REVEAL_SUFFICIENT", "MORE_EVIDENCE_NEEDED", "ADDITIONAL_CLAUSE_NEEDED", "OVERDISCLOSURE_DETECTED"],
      safetyLabel: ["SAFE_TO_REVIEW", "NEEDS_HUMAN_LEGAL_REVIEW", "REJECTED_UNSAFE", "INSUFFICIENT_CONTEXT"],
    };
    for (const [field, values] of Object.entries(allowed)) assert(values.includes(verdict[field]), `${field} enum valid`);
    assert(verdict.payerRefundBps >= 0 && verdict.payerRefundBps <= 10000, "payerRefundBps in range");
    assert(verdict.payeeReleaseBps >= 0 && verdict.payeeReleaseBps <= 10000, "payeeReleaseBps in range");
    assert(verdict.confidence >= 0 && verdict.confidence <= 1, "confidence in range");
    assert(typeof verdict.reasoning === "string" && verdict.reasoning.length > 0, "reasoning non-empty");
    assert(Array.isArray(verdict.nextSteps), "nextSteps is an array");
    const reveals = await read("get_reveals", [pactId]);
    assert(reveals.length === 1 && reveals[0].verified, "reveal persisted and verified");
  },
};

async function step0() {
  console.log("\n=== STEP 0: RPC / BALANCES / CONTRACT READ ===");
  for (let index = 0; index < accounts.length; index++) {
    const balance = await clients[index].getBalance({ address: accounts[index].address });
    console.log(`wallet ${index + 1}: ${accounts[index].address} balance=${balance}`);
    assert(balance > 0n, `wallet ${index + 1} has non-zero balance`);
  }
  const spec = await read("get_hashing_spec");
  assert(spec.commitmentHash === "SHA-256", "contract read sanity check passed");
}

const order = ["happy-unfunded", "happy-funded-release", "happy-mutual-close", "revert-create-inputs", "revert-lifecycle", "nondet-dispute-review"];
const filters = process.argv.slice(2);
const selected = filters.length ? order.filter(name => filters.includes(name)) : order;
if (filters.length && selected.length !== filters.length) {
  console.error(`Unknown suite. Available: ${order.join(", ")}`);
  process.exit(2);
}

const summary = [];
try {
  await step0();
  for (const name of selected) {
    const started = Date.now();
    console.log(`\n=== SUITE ${name} ===`);
    await suites[name]();
    const elapsed = Date.now() - started;
    summary.push({ name, status: "PASS", elapsed });
    console.log(`SUMMARY ${name}: PASS ${elapsed}ms`);
  }
  console.log("\n=== FINAL SUMMARY ===");
  for (const item of summary) console.log(`${item.name}: ${item.status} ${item.elapsed}ms`);
  console.log(`contract=${CONTRACT} network=Studionet chainId=61999 rpc=${RPC}`);
} catch (error) {
  const failed = selected[summary.length] ?? "step-0";
  console.error(`\nFAILED suite=${failed}`);
  console.error(`message=${error.message}`);
  if (error.hash) console.error(`tx=${error.hash}`);
  if (error.execution?.stderr) console.error(`on-chain stderr:\n${errorTail(error.execution.stderr)}`);
  process.exit(1);
}
