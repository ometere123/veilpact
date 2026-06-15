"use client";

import { useState } from "react";
import { SealButton } from "@/components/ui/SealButton";
import { PaymentSplitMeter } from "./PaymentSplitMeter";
import { veilpactWrite } from "@/lib/genlayer/contract";
import type { VerdictData, PactOnChain } from "@/lib/schemas/pact";
import { EXPLORER_URL, PAYMENT_DECISION } from "@/lib/constants";
import { Scale, CheckCircle, AlertTriangle, Pause } from "lucide-react";

const DECISION_LABEL: Record<string, string> = {
  NO_PAYMENT_ACTION: "No Payment Action",
  RELEASE_TO_PAYEE:  "Release to Payee",
  REFUND_TO_PAYER:   "Refund to Payer",
  SPLIT_PAYMENT:     "Split Payment",
  PAUSE_PAYMENT:     "Payment Paused",
};

interface Props {
  verdict:   VerdictData;
  pact:      PactOnChain;
  pactId:    number;
  disputeId: number;
  address:   string;
  onApplied?: () => void;
}

export function SettlementDecisionCard({ verdict, pact, pactId, disputeId, address, onApplied }: Props) {
  const [applying, setApplying] = useState(false);
  const [applied,  setApplied]  = useState(false);
  const [txHash,   setTxHash]   = useState<string | null>(null);
  const [txError,  setTxError]  = useState<string | null>(null);

  const isParty = address.toLowerCase() === pact.partyA?.toLowerCase() ||
                  address.toLowerCase() === pact.partyB?.toLowerCase();

  const canApply =
    isParty &&
    !pact.settlementApplied &&
    !applied &&
    (pact.paymentStatus === "LOCKED" || pact.paymentStatus === "PAUSED") &&
    verdict.paymentDecision !== PAYMENT_DECISION.NO_PAYMENT_ACTION &&
    verdict.paymentDecision !== PAYMENT_DECISION.PAUSE_PAYMENT;

  async function handleApply() {
    setApplying(true);
    setTxError(null);
    try {
      const hash = await veilpactWrite.applySettlementDecision(
        address as `0x${string}`,
        pactId,
        disputeId,
      );
      setTxHash(hash);
      setApplied(true);
      onApplied?.();
    } catch (e: unknown) {
      setTxError(e instanceof Error ? e.message : "Failed to apply settlement");
    } finally {
      setApplying(false);
    }
  }

  const decision    = verdict.paymentDecision;
  const isPause     = decision === PAYMENT_DECISION.PAUSE_PAYMENT;
  const isUnsafe    = verdict.safetyLabel === "REJECTED_UNSAFE";
  const isSplit     = decision === PAYMENT_DECISION.SPLIT_PAYMENT;
  const showSplit   = isSplit || (verdict.payerRefundBps > 0 && verdict.payeeReleaseBps > 0);

  return (
    <div style={{ border: "1px solid rgba(125,95,255,0.3)", backgroundColor: "rgba(125,95,255,0.04)", borderRadius: 2, padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Scale size={16} style={{ color: "#7D5FFF" }} />
        <div>
          <p style={{ fontFamily: "Bebas Neue, sans-serif", letterSpacing: "0.08em", color: "#7D5FFF", fontSize: "1rem" }}>
            SETTLEMENT DECISION
          </p>
          <p style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "0.75rem", color: "#EFE4D0", marginTop: 2 }}>
            {DECISION_LABEL[decision] ?? decision}
          </p>
        </div>
      </div>

      {isPause && (
        <div style={{ display: "flex", gap: 8, border: "1px solid rgba(201,163,91,0.3)", backgroundColor: "rgba(201,163,91,0.05)", borderRadius: 2, padding: 10 }}>
          <Pause size={14} style={{ color: "#C9A35B", flexShrink: 0 }} />
          <p style={{ fontSize: "0.78rem", color: "#C9A35B", lineHeight: 1.5 }}>
            Payment paused. More evidence or a narrower selective reveal may be needed before a decision can be made.
          </p>
        </div>
      )}

      {isUnsafe && (
        <div style={{ display: "flex", gap: 8, border: "1px solid rgba(184,92,112,0.3)", backgroundColor: "rgba(184,92,112,0.05)", borderRadius: 2, padding: 10 }}>
          <AlertTriangle size={14} style={{ color: "#B85C70", flexShrink: 0 }} />
          <p style={{ fontSize: "0.78rem", color: "#B85C70", lineHeight: 1.5 }}>
            Unsafe pact rejected. Payer refund applied.
          </p>
        </div>
      )}

      {showSplit && (
        <PaymentSplitMeter
          payerRefundBps={verdict.payerRefundBps}
          payeeReleaseBps={verdict.payeeReleaseBps}
        />
      )}

      {verdict.paymentReasoning && (
        <div>
          <p style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "0.6rem", color: "rgba(239,228,208,0.35)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 4 }}>Payment Reasoning</p>
          <p style={{ fontSize: "0.78rem", color: "rgba(239,228,208,0.7)", lineHeight: 1.6 }}>{verdict.paymentReasoning}</p>
        </div>
      )}

      {txError && (
        <div style={{ display: "flex", gap: 6, border: "1px solid rgba(184,92,112,0.3)", backgroundColor: "rgba(184,92,112,0.05)", borderRadius: 2, padding: 10 }}>
          <AlertTriangle size={12} style={{ color: "#B85C70", flexShrink: 0 }} />
          <p style={{ fontSize: "0.72rem", color: "#B85C70" }}>{txError}</p>
        </div>
      )}

      {applied && txHash && (
        <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
          <CheckCircle size={14} style={{ color: "#6E9F7E", flexShrink: 0 }} />
          <a href={`${EXPLORER_URL}/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
            style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "0.65rem", color: "#6E9F7E", textDecoration: "underline", wordBreak: "break-all" }}>
            Settlement applied: {txHash} ↗
          </a>
        </div>
      )}

      {canApply && !applied && (
        <SealButton variant="gold" disabled={applying} loading={applying} onClick={handleApply}>
          Apply Settlement Decision
        </SealButton>
      )}

      {pact.settlementApplied && !applied && (
        <p style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "0.7rem", color: "#6E9F7E" }}>
          ✓ Settlement already applied. Parties can now claim.
        </p>
      )}
    </div>
  );
}
