export const VEILPACT_VERSION = "1.0";
export const NETWORK_NAME = "studionet";

export const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "";

export const GENLAYER_RPC =
  process.env.NEXT_PUBLIC_GENLAYER_RPC ?? "https://studio.genlayer.com/api";

// Pact status enum
export const PACT_STATUS = {
  DRAFT:                 "DRAFT",
  COMMITTING:            "COMMITTING",
  PENDING_COUNTERPARTY:  "PENDING_COUNTERPARTY",
  ACTIVE:                "ACTIVE",
  DISPUTED:              "DISPUTED",
  UNDER_REVIEW:          "UNDER_REVIEW",
  RESOLVED_CONTINUE:     "RESOLVED_CONTINUE",
  RESOLVED_PAUSE:        "RESOLVED_PAUSE",
  RESOLVED_RENEGOTIATE:  "RESOLVED_RENEGOTIATE",
  RESOLVED_SETTLE:       "RESOLVED_SETTLE",
  CLOSED:                "CLOSED",
} as const;

export type PactStatus = (typeof PACT_STATUS)[keyof typeof PACT_STATUS];

// Clause types
export const CLAUSE_TYPES = [
  "PAYMENT",
  "DELIVERY",
  "SCOPE",
  "TIMELINE",
  "CANCELLATION",
  "CONFIDENTIALITY",
  "QUALITY_STANDARD",
  "COMMUNICATION",
  "DEPENDENCY",
  "ACCEPTANCE_CRITERIA",
  "REFUND_SETTLEMENT",
  "CUSTOM",
] as const;

export type ClauseType = (typeof CLAUSE_TYPES)[number];

// Remedy preferences
export const REMEDY_PREFERENCES = [
  "CONTINUE",
  "RENEGOTIATE_OR_SETTLE",
  "PAUSE",
  "SETTLE",
  "DISMISS",
] as const;

// Pact categories
export const PACT_CATEGORIES = [
  "FREELANCE_SERVICE",
  "CREATOR_COLLABORATION",
  "SUPPLIER_DELIVERY",
  "CONSULTING_WORK",
  "PRIVATE_REPAYMENT",
  "AGENCY_CLIENT_SCOPE",
  "MILESTONE_WORK",
  "CUSTOM_PACT",
] as const;

// Dispute types
export const DISPUTE_TYPES = [
  "BREACH_OF_DELIVERY",
  "PAYMENT_DISAGREEMENT",
  "TIMELINE_FAILURE",
  "QUALITY_DISAGREEMENT",
  "SCOPE_CREEP",
  "CANCELLATION_DISAGREEMENT",
  "CONFIDENTIALITY_CONCERN",
  "ACCEPTANCE_DISPUTE",
  "DEPENDENCY_FAILURE",
  "CUSTOM",
] as const;

// Reveal sensitivity levels
export const REVEAL_SENSITIVITY = ["LOW", "MEDIUM", "HIGH"] as const;

// Evidence types
export const EVIDENCE_TYPES = [
  "TEXT_SUMMARY",
  "URL_REFERENCE",
  "FILE_HASH",
  "SCREENSHOT_HASH",
  "MESSAGE_EXCERPT_HASH",
  "DELIVERY_PROOF_HASH",
  "COUNTERPARTY_RESPONSE_HASH",
] as const;

// GenLayer verdict enums
export const RECOMMENDED_ACTIONS = [
  "CONTINUE",
  "PAUSE",
  "RENEGOTIATE",
  "SETTLE",
  "DISMISS",
  "REQUEST_MORE_EVIDENCE",
  "REQUEST_NARROW_REVEAL",
  "REJECTED_UNSAFE",
] as const;

export const EVIDENCE_STRENGTH = [
  "STRONG", "MODERATE", "WEAK", "INSUFFICIENT", "CONFLICTING",
] as const;

export const BREACH_LIKELIHOOD = ["LOW", "MEDIUM", "HIGH", "UNCLEAR"] as const;

export const CLAUSE_RELEVANCE = [
  "DIRECTLY_RELEVANT", "PARTIALLY_RELEVANT", "NOT_RELEVANT",
] as const;

export const PRIVACY_JUDGEMENT = [
  "MINIMAL_REVEAL_SUFFICIENT",
  "MORE_EVIDENCE_NEEDED",
  "ADDITIONAL_CLAUSE_NEEDED",
  "OVERDISCLOSURE_DETECTED",
] as const;

export const SAFETY_LABELS = [
  "SAFE_TO_REVIEW",
  "NEEDS_HUMAN_LEGAL_REVIEW",
  "REJECTED_UNSAFE",
  "INSUFFICIENT_CONTEXT",
] as const;

// Status badge colours
export const STATUS_COLORS: Record<string, string> = {
  DRAFT:                "text-muted-parchment border-bone-border",
  COMMITTING:           "text-clause-blue border-clause-blue/30",
  PENDING_COUNTERPARTY: "text-sealed-gold border-sealed-gold/30",
  ACTIVE:               "text-verdict-green border-verdict-green/30",
  DISPUTED:             "text-redaction-rose border-redaction-rose/30",
  UNDER_REVIEW:         "text-signal-violet border-signal-violet/30",
  RESOLVED_CONTINUE:    "text-verdict-green border-verdict-green/30",
  RESOLVED_PAUSE:       "text-sealed-gold border-sealed-gold/30",
  RESOLVED_RENEGOTIATE: "text-clause-blue border-clause-blue/30",
  RESOLVED_SETTLE:      "text-muted-parchment border-bone-border",
  CLOSED:               "text-muted-parchment border-bone-border opacity-60",
};
