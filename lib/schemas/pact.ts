import { z } from "zod";

// ─── Draft schemas ─────────────────────────────────────────────────────────────
export const ClauseSchema = z.object({
  type:             z.string(),
  sensitivity:      z.enum(["PUBLIC", "PRIVATE", "REDACTED"]).default("PRIVATE"),
  title:            z.string(),
  text:             z.string(),
  remedyPreference: z.string(),
  evidenceTypes:    z.array(z.string()).default([]),
  salt:             z.string(),
});

export const PaymentSetupSchema = z.object({
  enabled:        z.boolean().default(false),
  payer:          z.string().default(""),
  payee:          z.string().default(""),
  expectedAmount: z.string().default("0"), // stored as decimal string to avoid BigInt serialisation issues
});

export const PactDraftSchema = z.object({
  title:        z.string(),
  partyA:       z.string(),
  partyB:       z.string(),
  category:     z.string(),
  description:  z.string(),
  duration:     z.string(),
  jurisdiction: z.string(),
  clauses:      z.array(ClauseSchema),
  pactSalt:     z.string(),
  version:      z.string().default("1.0"),
  payment:      PaymentSetupSchema.optional(),
});

export const ClauseCommitmentSchema = z.object({
  clauseIndex:      z.number(),
  clauseCommitment: z.string(),
  canonicalPayload: z.string(),
  agreementRoot:    z.string().optional(),
  metadataHash:     z.string().optional(),
});

// ─── On-chain pact data ────────────────────────────────────────────────────────
export interface PactOnChain {
  pactId:            number;
  partyA:            string;
  partyB:            string;
  agreementRoot:     string;
  rootSalt:          string;
  metadataHash:      string;
  clauseCommitments: string[];
  clauseCount:       number;
  status:            string;
  createdAt:         number;
  acceptedAt:        number;
  closedAt:          number;
  disputeCount:      number;
  revealedCount:     number;
  // Payment fields
  payer:             string;
  payee:             string;
  expectedAmount:    bigint;
  fundedAmount:      bigint;
  payerClaimable:    bigint;
  payeeClaimable:    bigint;
  payerClaimed:      boolean;
  payeeClaimed:      boolean;
  paymentStatus:     string;
  settlementApplied: boolean;
  // Close proposal
  closeProposalActive: boolean;
  closeProposedBy:    string;
  closeProposedTarget:string;
}

// ─── On-chain dispute / verdict ────────────────────────────────────────────────
export interface VerdictData {
  clauseVerified:    boolean;
  clauseRelevant:    string;
  evidenceStrength:  string;
  breachLikelihood:  string;
  recommendedAction: string;
  paymentDecision:   string;
  payerRefundBps:    number;
  payeeReleaseBps:   number;
  privacyJudgement:  string;
  safetyLabel:       string;
  reasoning:         string;
  paymentReasoning:  string;
  nextSteps:         string[];
  confidence:        number;
}

export interface DisputeOnChain {
  disputeId:        number;
  pactId:           number;
  opener?:          string;
  openedBy?:        string;
  clauseIndex:      number;
  claim:            string;
  requestedOutcome: string;
  status:           string;
  createdAt:        number;
  verdict:          VerdictData | null;
}

// ─── Types ──────────────────────────────────────────────────────────────────────
export type Clause           = z.infer<typeof ClauseSchema>;
export type PaymentSetup     = z.infer<typeof PaymentSetupSchema>;
export type PactDraft        = z.infer<typeof PactDraftSchema>;
export type ClauseCommitment = z.infer<typeof ClauseCommitmentSchema>;
