// ─── Contract ─────────────────────────────────────────────────────────────────
// Set NEXT_PUBLIC_VEILPACT_CONTRACT_ADDRESS in .env.local after deploying.
// Do NOT hardcode a fallback address here — an empty string will surface a
// clear error at call time rather than silently hitting a stale contract.
export const CONTRACT_ADDRESS =
  (process.env.NEXT_PUBLIC_VEILPACT_CONTRACT_ADDRESS ?? "") as `0x${string}`;

export const GENLAYER_NETWORK =
  process.env.NEXT_PUBLIC_GENLAYER_NETWORK ?? "studionet";

// ─── Pact status ──────────────────────────────────────────────────────────────
export const PACT_STATUS = {
  PENDING_COUNTERPARTY: "PENDING_COUNTERPARTY",
  ACTIVE:               "ACTIVE",
  DISPUTED:             "DISPUTED",
  UNDER_REVIEW:         "UNDER_REVIEW",
  RESOLVED_CONTINUE:    "RESOLVED_CONTINUE",
  RESOLVED_PAUSE:       "RESOLVED_PAUSE",
  RESOLVED_RENEGOTIATE: "RESOLVED_RENEGOTIATE",
  RESOLVED_SETTLE:      "RESOLVED_SETTLE",
  CLOSED:               "CLOSED",
  COMMITTING:           "COMMITTING",
} as const;
export type PactStatus = typeof PACT_STATUS[keyof typeof PACT_STATUS];

// ─── Payment status ────────────────────────────────────────────────────────────
export const PAYMENT_STATUS = {
  NONE:      "NONE",
  UNFUNDED:  "UNFUNDED",
  FUNDED:    "FUNDED",
  LOCKED:    "LOCKED",
  RELEASED:  "RELEASED",
  REFUNDED:  "REFUNDED",
  SPLIT:     "SPLIT",
  PAUSED:    "PAUSED",
  CLAIMABLE: "CLAIMABLE",
  CLAIMED:   "CLAIMED",
} as const;
export type PaymentStatus = typeof PAYMENT_STATUS[keyof typeof PAYMENT_STATUS];

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  NONE:      "No Settlement",
  UNFUNDED:  "Awaiting Funding",
  FUNDED:    "Funded (pre-accept)",
  LOCKED:    "GEN Locked",
  RELEASED:  "Released to Payee",
  REFUNDED:  "Refunded to Payer",
  SPLIT:     "Split Settlement",
  PAUSED:    "Payment Paused",
  CLAIMABLE: "Ready to Claim",
  CLAIMED:   "Claimed",
};

// ─── Payment decision ──────────────────────────────────────────────────────────
export const PAYMENT_DECISION = {
  NO_PAYMENT_ACTION: "NO_PAYMENT_ACTION",
  RELEASE_TO_PAYEE:  "RELEASE_TO_PAYEE",
  REFUND_TO_PAYER:   "REFUND_TO_PAYER",
  SPLIT_PAYMENT:     "SPLIT_PAYMENT",
  PAUSE_PAYMENT:     "PAUSE_PAYMENT",
} as const;
export type PaymentDecision = typeof PAYMENT_DECISION[keyof typeof PAYMENT_DECISION];

// ─── Clause types ─────────────────────────────────────────────────────────────
export const CLAUSE_TYPES = {
  PAYMENT:         "PAYMENT",
  DELIVERY:        "DELIVERY",
  DELIVERABLE:     "DELIVERABLE",
  SCOPE:           "SCOPE",
  TIMELINE:        "TIMELINE",
  CANCELLATION:    "CANCELLATION",
  TERMINATION:     "TERMINATION",
  CONFIDENTIALITY: "CONFIDENTIALITY",
  IP_OWNERSHIP:    "IP_OWNERSHIP",
  REVENUE_SHARE:   "REVENUE_SHARE",
  REMEDY:          "REMEDY",
  CONDUCT:         "CONDUCT",
  PENALTY:         "PENALTY",
  REFUND:          "REFUND",
  CUSTOM:          "CUSTOM",
} as const;
export type ClauseType = typeof CLAUSE_TYPES[keyof typeof CLAUSE_TYPES];

export const REMEDY_PREFERENCES = {
  RENEGOTIATE: "RENEGOTIATE",
  SETTLE:      "SETTLE",
  PAUSE:       "PAUSE",
  CONTINUE:    "CONTINUE",
  DISMISS:     "DISMISS",
} as const;
export type RemedyPreference = typeof REMEDY_PREFERENCES[keyof typeof REMEDY_PREFERENCES];

export const PACT_CATEGORIES = {
  FREELANCE:     "FREELANCE",
  PARTNERSHIP:   "PARTNERSHIP",
  NDA:           "NDA",
  SERVICES:      "SERVICES",
  SETTLEMENT:    "SETTLEMENT",
  CREATIVE:      "CREATIVE",
  CONSULTING:    "CONSULTING",
  REVENUE_SHARE: "REVENUE_SHARE",
  CUSTOM:        "CUSTOM",
} as const;
export type PactCategory = typeof PACT_CATEGORIES[keyof typeof PACT_CATEGORIES];

export const DISPUTE_TYPES = {
  BREACH:           "BREACH",
  NONPAYMENT:       "NONPAYMENT",
  LATE_DELIVERY:    "LATE_DELIVERY",
  SCOPE_CREEP:      "SCOPE_CREEP",
  IP_DISPUTE:       "IP_DISPUTE",
  QUALITY:          "QUALITY",
  MISCOMMUNICATION: "MISCOMMUNICATION",
  CONFIDENTIALITY:  "CONFIDENTIALITY",
  CUSTOM:           "CUSTOM",
} as const;
export type DisputeType = typeof DISPUTE_TYPES[keyof typeof DISPUTE_TYPES];

export const EVIDENCE_TYPES = {
  SCREENSHOT:   "SCREENSHOT",
  MESSAGE_LOG:  "MESSAGE_LOG",
  FILE_HASH:    "FILE_HASH",
  TIMESTAMP:    "TIMESTAMP",
  INVOICE:      "INVOICE",
  CONTRACT_REF: "CONTRACT_REF",
  WITNESS:      "WITNESS",
} as const;
export type EvidenceType = typeof EVIDENCE_TYPES[keyof typeof EVIDENCE_TYPES];

export const RECOMMENDED_ACTIONS = {
  CONTINUE:              "CONTINUE",
  PAUSE:                 "PAUSE",
  RENEGOTIATE:           "RENEGOTIATE",
  SETTLE:                "SETTLE",
  DISMISS:               "DISMISS",
  REQUEST_MORE_EVIDENCE: "REQUEST_MORE_EVIDENCE",
  REQUEST_NARROW_REVEAL: "REQUEST_NARROW_REVEAL",
  REJECTED_UNSAFE:       "REJECTED_UNSAFE",
} as const;
export type RecommendedAction = typeof RECOMMENDED_ACTIONS[keyof typeof RECOMMENDED_ACTIONS];

export const EVIDENCE_STRENGTH = {
  STRONG:       "STRONG",
  MODERATE:     "MODERATE",
  WEAK:         "WEAK",
  INSUFFICIENT: "INSUFFICIENT",
  CONFLICTING:  "CONFLICTING",
} as const;

export const BREACH_LIKELIHOOD = {
  LOW: "LOW", MEDIUM: "MEDIUM", HIGH: "HIGH", UNCLEAR: "UNCLEAR",
} as const;

export const CLAUSE_RELEVANCE = {
  DIRECTLY_RELEVANT:  "DIRECTLY_RELEVANT",
  PARTIALLY_RELEVANT: "PARTIALLY_RELEVANT",
  NOT_RELEVANT:       "NOT_RELEVANT",
} as const;

export const PRIVACY_JUDGEMENT = {
  MINIMAL_REVEAL_SUFFICIENT: "MINIMAL_REVEAL_SUFFICIENT",
  MORE_EVIDENCE_NEEDED:      "MORE_EVIDENCE_NEEDED",
  ADDITIONAL_CLAUSE_NEEDED:  "ADDITIONAL_CLAUSE_NEEDED",
  OVERDISCLOSURE_DETECTED:   "OVERDISCLOSURE_DETECTED",
} as const;

export const SAFETY_LABELS = {
  SAFE_TO_REVIEW:           "SAFE_TO_REVIEW",
  NEEDS_HUMAN_LEGAL_REVIEW: "NEEDS_HUMAN_LEGAL_REVIEW",
  REJECTED_UNSAFE:          "REJECTED_UNSAFE",
  INSUFFICIENT_CONTEXT:     "INSUFFICIENT_CONTEXT",
} as const;

export const EXPLORER_URL = "https://explorer-studio.genlayer.com";
