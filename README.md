<p align="center">
  <img src="https://raw.githubusercontent.com/ometere123/veilpact/master/public/logo.svg" alt="VEILPACT" width="180" />
</p>

# VEILPACT - Private Pacts with Selective Reveal

**Private by default. Committed on GenLayer. AI-arbitrated when trust breaks.**
Two parties seal an agreement whose clauses never touch the chain - only SHA-256 commitments do. If a dispute arises, one party reveals a single clause plus evidence, GenLayer's validator network reviews it under AI consensus, and the verdict can settle a GEN escrow on-chain. No lawyer, no platform database reading your contract.

[Live app - veilpact.vercel.app](https://veilpact.vercel.app)

---

## What it is

Connect your wallet and create a pact with a counterparty: each clause is hashed locally in your browser and only the commitments plus a binding agreement root are stored on-chain. The full clause text stays in your browser (IndexedDB) and is shared with the counterparty out of band. Optionally, one party escrows GEN against the pact. When a dispute is opened, the disputing party reveals exactly one clause; the contract verifies it against the stored commitment, then GenLayer validators review the claim, response, and evidence and reach AI consensus on a structured verdict - which can release, refund, or split the escrow.

- **Clause-level privacy** - agreements are committed as per-clause SHA-256 hashes; clause text never goes on-chain until a dispute requires it
- **Selective reveal** - a dispute exposes only the single disputed clause, never the whole agreement
- **Commit-verified reveals** - a revealed clause must re-hash to the exact stored commitment and re-derive the agreement root, so nobody can swap terms after signing
- **AI consensus arbitration** - a custom leader/validator pattern (`gl.vm.run_nondet_unsafe`): every validator independently re-runs the review and must agree on the recommended action, the safety label, and the economic outcome (payee share within 20% of escrow) before a verdict is stored - a single malicious leader cannot steer the settlement
- **On-chain evidence verification, read by the reviewer** - a disputing party can attach a public evidence URL and its SHA-256; validators independently fetch the URL with `gl.nondet.web.get` and reach strict-equality consensus on both the digest and a text excerpt of the content, so a `VERIFIED` status is validator consensus on integrity - and the exact verified content is then handed to the AI dispute reviewer to actually read and reason over, not just cite as "linked"
- **Optional GEN escrow** - fund at creation or any time before activation; verdicts settle in basis points via pull-payment claims
- **Privacy ledger** - every reveal is recorded on-chain with an over-disclosure warning flag, so disclosure itself is auditable

---

## How it works

**Creating a pact**

1. Draft clauses in the wizard - each clause gets a title, type, text, remedy preference, and a random salt
2. The browser canonicalizes each clause to JSON and hashes it (SHA-256) - these commitments are all the chain ever sees
3. An agreement root binds both parties, the metadata hash, every clause commitment, and a root salt into one hash; the contract recomputes and verifies it at creation
4. Optionally declare payer, payee, and an expected GEN amount for escrow
5. Share the private clause package with your counterparty; they accept on-chain to activate the pact

**Funding (optional)**

- The payer can fund during the creation wizard, or later from the pact detail page - a *Fund Pact* banner appears whenever the pact is still unfunded and fundable
- `fund_pact` is payable and requires the exact expected amount; once the counterparty accepts, the escrow is `LOCKED`
- From `LOCKED`, funds move only through payer release, mutual close, an applied dispute verdict, or a resolver settlement - always into claimable balances (pull payments), never direct pushes

**Disputing**

1. Either party opens a dispute against one clause with a claim and requested outcome (`CONTINUE`, `PAUSE`, `RENEGOTIATE`, `SETTLE`, `DISMISS`)
2. The counterparty may submit a structured JSON response
3. A party reveals the disputed clause with its original salt plus an evidence bundle; the contract re-canonicalizes, re-hashes, and requires an exact match with the stored commitment and the agreement root
4. GenLayer validators review the verified clause, claim, response, and evidence, and reach consensus on a structured verdict: recommended action, evidence strength, breach likelihood, payment decision in basis points, privacy judgement, and safety label
5. If the pact is funded, either party applies the verdict - claimable balances are computed from the verdict's basis points and each side withdraws its share

---

## Commit / reveal scheme

Clause commitment:

```
commitment = sha256(canonical_json({
  version, network, partyA, partyB,
  clauseIndex, clauseSalt, clauseTitle,
  clauseType, clauseText, remedyPreference
}))
```

Agreement root:

```
root = sha256(canonical_json({
  version: "VEILPACT_ROOT_V1", network,
  partyA, partyB, metadataHash,
  clauseCommitments[], rootSalt
}))
```

Canonical JSON is `json.dumps(sort_keys=True, separators=(",", ":"), ensure_ascii=False)` - the frontend and contract produce byte-identical serializations, so hashes always match. Per-clause salts make brute-forcing clause contents infeasible; revealing clause *k* discloses nothing about any other clause.

---

## Pact lifecycle

```
PENDING_COUNTERPARTY -> ACCEPTED -> ACTIVE -> DISPUTED -> UNDER_REVIEW -> RESOLVED_* -> CLOSED
```

| Status | What happens |
| --- | --- |
| PENDING_COUNTERPARTY | Creator committed the pact; waiting for Party B |
| ACCEPTED | Party B accepted but escrow not yet funded |
| ACTIVE | Pact live (escrow `LOCKED` if funded) |
| DISPUTED | A party opened a dispute against one clause |
| UNDER_REVIEW | Clause revealed and verified; GenLayer consensus reviewing |
| RESOLVED_CONTINUE / PAUSE / RENEGOTIATE / SETTLE | Verdict recorded on-chain |
| CLOSED | Pact ended; all claims withdrawn |

Payment status runs in parallel: `UNFUNDED -> FUNDED -> LOCKED -> CLAIMABLE -> CLAIMED` (or `REFUNDED` / `SPLIT` / `PAUSED`).

---

## GenLayer consensus functions

| Function | What GenLayer does |
| --- | --- |
| `reveal_clause_for_dispute(...)` | Deterministically verifies the reveal against the stored commitment and agreement root, then triggers validator LLM review of clause + claim + response + evidence |
| `respond_to_dispute(...)` | Stores the counterparty response; re-runs consensus review if the clause is already revealed |
| `apply_settlement_decision(...)` | Converts the consensus verdict's basis points into claimable escrow balances |

The review runs through a custom leader/validator consensus built on `gl.vm.run_nondet_unsafe`. The leader's LLM proposes the verdict JSON; each validator independently re-runs the identical prompt and compares the decision fields deterministically - the unsafe flag must match exactly, the recommended action must fall in the same outcome group (settle / no-breach / revisit), and the implied payee share of the escrow must agree within 2,000 basis points. Formatting-only validation of the leader's output is not consensus; here a biased leader gets voted down and the network rotates leaders. The accepted verdict is then re-validated inside the contract - enums are whitelisted, basis points clamped and forced consistent with the payment decision, weak-evidence settlements downgraded, and a deterministic prohibited-content screen can override the outcome to `REJECTED_UNSAFE` with a full refund. All contract errors raise `gl.vm.UserError` for clean on-chain surfacing.

---

## Evidence verification

When revealing a clause for a dispute, a party can optionally attach a public evidence URL and its SHA-256 hash in the evidence bundle (`evidenceUrl`, `evidenceSha256`). Any party can then call **`verify_evidence_url`**: every GenLayer validator independently fetches the URL with `gl.nondet.web.get`, then computes both the SHA-256 of the raw response body and a bounded text excerpt of it. `gl.eq_principle.strict_eq` packs both into one canonical value and requires every validator to agree on it exactly before anything is written to state - so the excerpt that ends up on-chain is content every validator independently confirmed, not a self-reported summary.

Outcomes stored on-chain:

| Status | Meaning |
| --- | --- |
| `UNVERIFIED` | An evidence URL was submitted but verification has not run yet |
| `VERIFIED` | Validators fetched the URL, the SHA-256 matches the claimed hash, and the verified excerpt is stored |
| `HASH_MISMATCH` | Validators fetched successfully but the hash does not match the claim |
| `FAILED_FETCH` | The URL could not be fetched at all |

Integrity and comprehension are separate guarantees, and only `VERIFIED` gets both: the `verifiedContentExcerpt` is fed directly into the dispute reviewer's context, so the AI arbitrator actually reads the authenticated document text when judging evidence strength and breach likelihood - it isn't just told a link "checked out." Anything other than `VERIFIED` is explicitly excluded from the reviewer's reasoning.

Use commit-pinned URLs (raw GitHub with a commit hash, not a branch name) so the content is byte-identical across every validator's independent fetch.

---

## Contract

| Field | Value |
| --- | --- |
| Network | GenLayer Studionet |
| Chain ID | 61999 |
| RPC | https://studio.genlayer.com/api |
| Explorer | https://explorer-studio.genlayer.com |
| Contract | `0x093B04671cc13daA80ddD6190275b18c7718132f` |
| Source | `contracts/VeilPact.py` |

Key methods:

| Method | Description |
| --- | --- |
| `create_pact` | Store agreement root + clause commitments; optionally declare payer/payee/amount |
| `fund_pact` | Payable; payer escrows the exact expected amount (at creation or post-creation) |
| `accept_pact` | Counterparty activates the pact; locks escrow if funded |
| `cancel_unaccepted_pact` | Creator/payer backs out before activation; escrow becomes refundable |
| `release_payment` | Payer voluntarily releases the full escrow to the payee |
| `propose_close` / `confirm_close` / `cancel_close` | Two-signature mutual close with a chosen payout target |
| `open_dispute` / `respond_to_dispute` | Raise a claim against one clause; counterparty replies |
| `reveal_clause_for_dispute` | Commit-verified selective reveal; triggers consensus review |
| `verify_evidence_url` | Validators independently fetch and hash the dispute's evidence URL |
| `apply_settlement_decision` | Apply the AI verdict to the escrow |
| `resolver_settle` | Resolver fallback settlement for stuck escrows |
| `claim_payer_refund` / `claim_payee_payment` | Pull-payment withdrawals |
| `get_pact` / `get_dispute` / `get_reveals` / `get_privacy_ledger` / `get_protocol_stats` | Transparency views |

---

## Tech stack

| Layer | Tech |
| --- | --- |
| Intelligent contract | GenLayer Python (py-genlayer v0.2.18) - `gl.vm.run_nondet_unsafe` custom validator, `gl.nondet.web.get` + `gl.eq_principle.strict_eq` evidence verification, `@gl.public.write.payable`, `gl.vm.UserError` |
| Frontend | Next.js 16 App Router · React 19 · TypeScript · Tailwind CSS 4 |
| Web3 | GenLayer JS SDK (`genlayer-js` 1.1.8) · Viem |
| Private clause storage | Browser IndexedDB (`idb`) - clause text never leaves the client until a reveal |
| Validation | Zod schemas on every contract read |

---

## Repository

```
contracts/
  VeilPact.py         GenLayer intelligent contract - all on-chain logic

app/
  (app)/
    overview/          Protocol stats dashboard
    new-pact/          Pact creation wizard (clauses -> commitments -> payment -> fund)
    pacts/             My pacts list
    pacts/[pactId]/    Pact detail - accept, fund, payment, disputes, timeline, privacy
    disputes/          Dispute console
    evidence/          Evidence room
    reveal/            Selective reveal console
    review/            GenLayer review viewer
    privacy-ledger/    On-chain disclosure audit trail
    counterparty-review/  Private package import + counterparty acceptance
    settings/          Wallet + network settings

components/           UI components (pact wizard, payment, dispute, verdict, privacy)
lib/genlayer/         Contract read/write wrappers over genlayer-js
lib/crypto/           Canonical JSON + SHA-256 commitment / root builders
lib/storage/          IndexedDB private package store
scripts/              On-chain test suites (test-all.mjs, smoke-test.mjs)
```

---

## Getting started

```bash
npm install
cp .env.example .env.local
# set NEXT_PUBLIC_VEILPACT_CONTRACT_ADDRESS (see below)
npm run dev
```

Open http://localhost:3000.

### Environment variables

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_VEILPACT_CONTRACT_ADDRESS` | Address of the deployed `VeilPact.py` contract. Every frontend read and write is sent to this address; if unset the app throws a clear error instead of silently hitting a stale contract. |
| `NEXT_PUBLIC_GENLAYER_NETWORK` | `studionet` (default), `localnet`, or `testnet-asimov` |
| `GENLAYER_RPC_URL` | RPC endpoint used by the test scripts |
| `VEILPACT_CONTRACT_ADDRESS`, `VEILPACT_PK1`, `VEILPACT_PK2` | Test-script-only variables. Never commit real private keys. |

### Running the on-chain test suite

```bash
VEILPACT_CONTRACT_ADDRESS=0x... \
GENLAYER_RPC_URL=https://studio.genlayer.com/api \
VEILPACT_PK1=0x... VEILPACT_PK2=0x... \
npm run test:contract
```

Covers the unfunded and funded happy paths, mutual close, input/lifecycle revert cases, and a full nondeterministic dispute review with verdict schema validation.

---

## Safety

Prohibited content (illegal, coercive, exploitative agreements) is screened twice: a deterministic keyword filter at reveal time and the validator LLM safety label. Unsafe pacts are refused enforcement and the escrow is returned to the payer.

VeilPact provides decentralised private-agreement arbitration. It is not legal advice, and verdicts are advisory recommendations unless adopted by the parties.
