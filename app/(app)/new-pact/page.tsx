"use client";

import { useState } from "react";
import { usePactWizard } from "@/hooks/usePactWizard";
import { useWalletContext } from "@/contexts/WalletContext";
import { StepBasics }      from "@/components/pact/wizard/StepBasics";
import { StepClauses }     from "@/components/pact/wizard/StepClauses";
import { StepPrivacy }     from "@/components/pact/wizard/StepPrivacy";
import { StepCommitments } from "@/components/pact/wizard/StepCommitments";
import { StepEncrypt }     from "@/components/pact/wizard/StepEncrypt";
import { StepPayment }     from "@/components/pact/wizard/StepPayment";
import { StepSubmit }      from "@/components/pact/wizard/StepSubmit";
import { StepFund }        from "@/components/pact/wizard/StepFund";
import { SealButton }      from "@/components/ui/SealButton";
import { Check }           from "lucide-react";

const STEPS = [
  { id: 1, label: "Basics" },
  { id: 2, label: "Clauses" },
  { id: 3, label: "Privacy" },
  { id: 4, label: "Commitments" },
  { id: 5, label: "Encrypt" },
  { id: 6, label: "Payment" },
  { id: 7, label: "Submit" },
  { id: 8, label: "Fund" },
];

export default function NewPactPage() {
  const { address, connected, connect } = useWalletContext();
  const wizard = usePactWizard(address ?? "");
  // Track on-chain pact ID returned after submission (for funding step)
  const [onChainPactId, setOnChainPactId] = useState<number | null>(null);

  if (!connected) {
    return (
      <div style={{ maxWidth: 480 }}>
        <h1 style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "2rem", letterSpacing: "0.1em", color: "#EFE4D0", marginBottom: 16 }}>
          NEW PRIVATE PACT
        </h1>
        <div style={{ border: "1px solid rgba(201,163,91,0.3)", backgroundColor: "#14141C", borderRadius: 2, padding: 24 }}>
          <p style={{ color: "rgba(239,228,208,0.64)", marginBottom: 16 }}>Connect your wallet to create a private pact.</p>
          <SealButton onClick={connect}>Connect Wallet</SealButton>
        </div>
      </div>
    );
  }

  // Funding step is only relevant when payment is enabled and creator is the payer
  const showFundStep = wizard.payment.enabled &&
    BigInt(wizard.payment.expectedAmount || "0") > BigInt(0) &&
    wizard.payment.payer.toLowerCase() === (address ?? "").toLowerCase();

  const visibleSteps = showFundStep ? STEPS : STEPS.filter(s => s.id !== 8);

  return (
    <div style={{ maxWidth: 672, display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h1 style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "2rem", letterSpacing: "0.1em", color: "#EFE4D0" }}>
          NEW PRIVATE PACT
        </h1>
        <p style={{ color: "rgba(239,228,208,0.64)", fontSize: "0.875rem", marginTop: 4 }}>
          Draft terms privately. Commitments go on GenLayer. Plaintext stays local.
          {wizard.payment.enabled && (
            <span style={{ color: "#C9A35B" }}> · GEN-backed settlement enabled.</span>
          )}
        </p>
      </div>

      {/* Step track */}
      <div style={{ display: "flex", alignItems: "center" }}>
        {visibleSteps.map((s, i) => (
          <div key={s.id} style={{ display: "flex", alignItems: "center", flex: 1 }}>
            <button
              onClick={() => s.id < wizard.step && wizard.goToStep(s.id as 1|2|3|4|5|6|7|8)}
              style={{
                width: 26, height: 26, borderRadius: "50%", border: "2px solid",
                borderColor: s.id <= wizard.step ? "#C9A35B" : "rgba(239,228,208,0.18)",
                backgroundColor: s.id < wizard.step ? "#C9A35B" : "transparent",
                color: s.id < wizard.step ? "#0B0B10" : s.id === wizard.step ? "#C9A35B" : "rgba(239,228,208,0.4)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.7rem", fontFamily: "IBM Plex Mono, monospace", flexShrink: 0,
                cursor: s.id < wizard.step ? "pointer" : "default",
              }}
            >
              {s.id < wizard.step ? <Check size={11} /> : s.id}
            </button>
            {i < visibleSteps.length - 1 && (
              <div style={{ flex: 1, height: 1, backgroundColor: s.id < wizard.step ? "rgba(201,163,91,0.4)" : "rgba(239,228,208,0.18)" }} />
            )}
          </div>
        ))}
      </div>

      <div>
        <p style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "0.7rem", letterSpacing: "0.15em", color: "rgba(239,228,208,0.4)" }}>
          STEP {wizard.step} OF {visibleSteps.length}
        </p>
        <p style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "1.5rem", letterSpacing: "0.1em", color: "#EFE4D0" }}>
          {(STEPS.find(s => s.id === wizard.step)?.label ?? "").toUpperCase()}
        </p>
      </div>

      {wizard.error && (
        <div style={{ border: "1px solid rgba(184,92,112,0.3)", backgroundColor: "rgba(184,92,112,0.05)", color: "#B85C70", padding: "12px 16px", borderRadius: 2, fontSize: "0.875rem" }}>
          {wizard.error}
        </div>
      )}

      {wizard.step === 1 && <StepBasics      wizard={wizard} />}
      {wizard.step === 2 && <StepClauses     wizard={wizard} />}
      {wizard.step === 3 && <StepPrivacy     wizard={wizard} />}
      {wizard.step === 4 && <StepCommitments wizard={wizard} />}
      {wizard.step === 5 && <StepEncrypt     wizard={wizard} />}
      {wizard.step === 6 && <StepPayment     wizard={wizard} />}
      {wizard.step === 7 && <StepSubmit      wizard={wizard} address={address ?? ""} onPactCreated={setOnChainPactId} />}
      {wizard.step === 8 && <StepFund        wizard={wizard} address={address ?? ""} onChainPactId={onChainPactId} />}
    </div>
  );
}
