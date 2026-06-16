"use client";

import { useEffect } from "react";
import { SealButton } from "@/components/ui/SealButton";
import { CommitmentFingerprint } from "@/components/pact/CommitmentFingerprint";
import { CheckCircle2 } from "lucide-react";
import type { ClauseCommitment } from "@/lib/schemas/pact";
import type { WizardState } from "@/hooks/usePactWizard";

interface StepCommitmentsProps { wizard: WizardState; }

export function StepCommitments({ wizard }: StepCommitmentsProps) {
  const done = wizard.commitments.length > 0;
  const agreementRoot = wizard.commitments[0]?.agreementRoot;
  const { busy, generateCommitments } = wizard;

  useEffect(() => {
    if (done || busy) return;
    void Promise.resolve().then(() => generateCommitments());
  }, [busy, done, generateCommitments]);

  if (busy) return (
    <div style={{ border: "1px solid rgba(239,228,208,0.18)", backgroundColor: "#14141C", borderRadius: 2, padding: 40, textAlign: "center" }}>
      <div style={{ width: 28, height: 28, border: "2px solid #C9A35B", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
      <p style={{ color: "rgba(239,228,208,0.6)", fontSize: "0.875rem" }}>Generating clause commitments...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ border: "1px solid rgba(239,228,208,0.18)", backgroundColor: "#14141C", borderRadius: 2, padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
        {wizard.commitments.map((c: ClauseCommitment) => {
          const clause = wizard.draft.clauses[c.clauseIndex];
          return (
            <div key={c.clauseIndex}>
              <p style={{ fontSize: "0.7rem", color: "rgba(239,228,208,0.4)", fontFamily: "IBM Plex Mono, monospace", marginBottom: 6 }}>
                #{String(c.clauseIndex + 1).padStart(2, "0")} - {clause?.title}
              </p>
              <CommitmentFingerprint hash={c.clauseCommitment} verified={true} />
            </div>
          );
        })}

        {agreementRoot && (
          <div style={{ borderTop: "1px solid rgba(239,228,208,0.12)", paddingTop: 16 }}>
            <p style={{ fontSize: "0.7rem", color: "rgba(239,228,208,0.4)", fontFamily: "IBM Plex Mono, monospace", marginBottom: 6 }}>AGREEMENT ROOT</p>
            <CommitmentFingerprint hash={agreementRoot} verified={true} label="Root hash of all commitments" />
          </div>
        )}
      </div>

      {done && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#6E9F7E", fontSize: "0.8rem" }}>
          <CheckCircle2 size={14} />
          {wizard.commitments.length} clause commitment{wizard.commitments.length !== 1 ? "s" : ""} generated
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <SealButton variant="ghost" onClick={wizard.prevStep}>Back</SealButton>
        <SealButton onClick={wizard.nextStep} disabled={!done}>Encrypt Package</SealButton>
      </div>
    </div>
  );
}
