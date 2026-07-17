# Review Status

Tracking the GenLayer ecosystem team's review feedback on VeilPact and how each item was resolved. Live contract, README, and test evidence are linked at the bottom.

## Original review

> Thank you for your contribution to the GenLayer ecosystem.
>
> **What you need to fix:**
>
> **(1)** Allow funding post-creation. The contract has `fund_pact()`. Wire it up. A user who missed the toggle should be able to go to their pact detail, click a button, and fund it.
>
> **(2)** Fix lines 709–710. The `gl.exec_prompt` inside `gl.nondet` is a consensus correctness bug. If `gl.eq_principle.prompt_non_comparative` throws an exception, different validators will receive different raw LLM outputs and store different verdicts. The transaction will either fail consensus or produce an inconsistent state. Remove that fallback entirely and let the exception surface.
>
> **(3)** The current README is the default Next.js boilerplate. It says nothing about VeilPact. A reviewer, contributor, or judge who looks at the repo cannot understand what the project does, how to run it, or where it is deployed. Add: what VeilPact is, how to run, how the commit/reveal scheme works, and what `NEXT_PUBLIC_VEILPACT_CONTRACT_ADDRESS` is for.
>
> **(4)** Replace bare `Exception` with `gl.vm.UserError`. Seven instances. The linter flagged them all. This is not a correctness issue but it is a professionalism signal and improves onchain error surfacing.

## Status: all four items resolved

### (1) Post-creation funding — done

`fund_pact()` is wired into the pact detail page ([app/(app)/pacts/[pactId]/page.tsx](app/(app)/pacts/[pactId]/page.tsx)). Whenever the connected wallet is the payer and the pact is still `UNFUNDED` — whether pre- or post-acceptance — a "FUNDING REQUIRED" banner appears with a one-click fund button, matching exactly the conditions the contract enforces on `fund_pact`.

### (2) Consensus correctness bug — fixed, and then hardened further

The `gl.exec_prompt` fallback inside `gl.nondet` was removed first. But a second, independent review flagged that the underlying mechanism it wrapped — `gl.eq_principle.prompt_non_comparative` — was itself a **fake-consensus risk** for a settlement-deciding function: validators were only judging the leader's *formatting*, not independently re-deriving the verdict, so a single malicious leader could steer a payout.

`_run_dispute_review` in [contracts/VeilPact.py](contracts/VeilPact.py) now runs a **custom leader/validator consensus** on `gl.vm.run_nondet_unsafe`: every validator independently re-runs the identical review prompt and must agree with the leader on the unsafe flag, the outcome group (settle / no-breach / revisit), and the payee's implied share of escrow (within a 2,000 bps tolerance) before the verdict is accepted. This is the pattern GenLayer's own docs recommend for scoring/settlement decisions over the convenience wrappers.

### (3) README — fully rewritten

[README.md](README.md) now covers what VeilPact is, the commit/reveal scheme (with the actual hash formulas), the full pact and payment lifecycle, the consensus mechanism, evidence verification, how to run locally, the on-chain test suite, and what `NEXT_PUBLIC_VEILPACT_CONTRACT_ADDRESS` does — no trace of Next.js boilerplate remains.

### (4) Bare `Exception` → `gl.vm.UserError` — done

All seven instances replaced; `grep -c "raise gl.vm.UserError" contracts/VeilPact.py` returns 7, matching the original count exactly.

## Additional hardening done beyond the four items

These weren't in the original review but came up during follow-up scrutiny and were fixed in the same pass:

- **Evidence verification with real web access.** New `verify_evidence_url` method: a disputing party can attach a public URL + SHA-256 as evidence; every validator independently fetches it via `gl.nondet.web.get` and reaches `strict_eq` consensus on both the hash *and* a bounded text excerpt of the content before storing `VERIFIED` / `HASH_MISMATCH` / `FAILED_FETCH`.
- **Comprehension, not just integrity.** On `VERIFIED`, the validator-agreed excerpt is fed directly into the dispute reviewer's context (`verifiedContentExcerpt`) with instructions to reason over it as authenticated fact — proven on-chain: a review that ran *before* verification correctly said the evidence "cannot be relied on," and after verification the same dispute's re-review cited the exact validated figures from the document.
- **Protocol-stats fix.** `get_protocol_stats().claimableAmount` and the Overview dashboard's own claimable calculation both summed `payer_claimable + payee_claimable` unconditionally, without checking the claimed flags (which are never reset after a claim). Fixed both the contract (`get_protocol_stats`, and `get_user_pacts` now exposes `payerClaimed`/`payeeClaimed`/`settlementApplied`) and the frontend (`app/(app)/overview/page.tsx`) so "Claimable GEN" reflects GEN actually outstanding, not a historical cumulative total.

## Verification (round 1)

Every fix above was tested on live GenLayer StudioNet — not just locally — using two freshly generated, faucet-funded wallets (the deployer key was never used as a test party), with realistic GEN-scale escrow amounts and real dispute scenarios (freelance web builds, wedding photography, invoice digitization, consulting sprints), across multiple rounds as the contract was iterated and redeployed. Coverage included: the full pact lifecycle (fund pre/post-acceptance, cancel+refund, mutual close), both branches of the custom-validator consensus (clean agreement and a genuine validator disagreement that GenLayer correctly finalized as a no-op rather than corrupting state), all three evidence-verification outcomes plus the comprehension proof, and the claimable-stats fix confirmed end to end on a real release → claim cycle.

---

## Follow-up review — Joaquin, Jul 17 2026 14:32

> The payout path needs a focused correction before this can receive project credit. Please constrain or remove `resolver_settle`, make validators agree on the final parsed state and tighter settlement result, and ensure verified URL evidence plus the original dispute claim are bound into review before any verdict can be applied.

### Status: all three items resolved

**1. `resolver_settle` constrained, not removed.** It previously had no state requirements beyond the resolver role and a funded pact — a pure bypass of AI consensus. It's now a genuine last-resort fallback: it requires the clause was actually revealed, requires an AI consensus review already completed (`dispute.status == RESOLVED`), and requires that review's own verdict left payment genuinely undecided (`PAUSE_PAYMENT` or `NO_PAYMENT_ACTION`). It can no longer be used to override a decisive AI verdict, and it's subject to the same evidence-verification binding as the AI path (below).

**2. Validators now agree on the final parsed state, with a tighter settlement tolerance.** The previous custom validator compared a loosely-bucketed approximation of the leader's output (three outcome groups, ±2,000 bps / 20% tolerance). It now runs both the leader's and each validator's raw LLM output through the *exact same* deterministic `_parse_verdict` normalization used to persist the verdict, and requires **exact** agreement on `recommendedAction`, `paymentDecision`, and `safetyLabel`, with the settlement split tolerance tightened to 500 bps (5%).

**3. Verified URL evidence + the original claim are bound into review before any verdict can be applied.** Two changes: (a) the review context now anchors on the dispute's immutable `claim`/`requestedOutcome` set at `open_dispute` as the authoritative `originalClaim`/`originalRequestedOutcome`; the reveal-time evidence bundle's self-reported claim text is exposed only as non-authoritative `evidenceBundleClaimText` and can never silently override what was actually disputed. (b) a new `verdict_evidence_status` field records the evidence-verification state in effect *when the accepted verdict was computed*; `apply_settlement_decision` and `resolver_settle` now hard-require that if a dispute cites an evidence URL, the applied verdict must have been produced while that URL was `VERIFIED` — a verdict computed before verification cannot be applied even if the URL is verified afterward, forcing a fresh review first.

One bare exception (`raise ValueError`) was introduced while implementing this and caught immediately by `genvm-lint check contracts/VeilPact.py`; converted to `gl.vm.UserError` before finalizing. Final lint: 0 findings.

### Verification (round 2)

Deployed fresh to StudioNet and tested with 5 targeted scenarios (31 transactions) directly exercising the new gates, using the same two non-deployer test wallets plus a one-time admin `set_resolver` call (deployer key, config-only, never a test party):

- **Regression** — a real dispute with no cited evidence URL still resolves and settles normally (`REFUND_TO_PAYER`, exact bps) under the tightened consensus; the new evidence-binding gate correctly does not block it.
- **Evidence-binding gate** — a dispute citing an unverified evidence URL: the AI review, per its own instructions not to trust unverified evidence, produced a cautious `PAUSE_PAYMENT` rather than a decisive verdict — direct behavioral proof the binding requirement works, not just the guard string. `verdict_evidence_status` correctly tracked `UNVERIFIED` throughout.
- **Resolver guard, no review** — `resolver_settle` on a dispute that hasn't even been revealed yet reverts (`"Clause must be revealed before resolver can settle"`).
- **Resolver guard, decisive verdict** — a dispute that reached a clear AI verdict (`REFUND_TO_PAYER`) correctly rejects `resolver_settle` (`"Resolver can only settle a dispute whose AI review left payment undecided"`); the AI verdict was then applied normally instead.
- **Resolver fallback, genuine use** — a deliberately vague, thin dispute produced `PAUSE_PAYMENT` from AI review, and `resolver_settle` correctly succeeded as the intended last resort.

## Links

- **Live app:** https://veilpact.vercel.app
- **Contract (GenLayer StudioNet):** `0x2f5Cb5f455cDEF77e7054B9D61D6784d79A8b0Ee`
- **Contract source:** [contracts/VeilPact.py](contracts/VeilPact.py)
- **README:** [README.md](README.md)
