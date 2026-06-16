"use client";

import { Lock } from "lucide-react";
import { SealButton } from "@/components/ui/SealButton";
import type { Clause } from "@/lib/schemas/pact";
import type { WizardState } from "@/hooks/usePactWizard";

const SENSITIVITY_COLORS: Record<Clause["sensitivity"], string> = {
  PUBLIC: "#6E9F7E",
  PRIVATE: "#C9A35B",
  REDACTED: "#B85C70",
};

interface StepPrivacyProps { wizard: WizardState; }

export function StepPrivacy({ wizard }: StepPrivacyProps) {
  const clauses = wizard.draft.clauses ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ border: "1px solid rgba(239,228,208,0.18)", backgroundColor: "#14141C", borderRadius: 2, padding: 16 }}>
        <p style={{ fontSize: "0.75rem", color: "rgba(239,228,208,0.5)", marginBottom: 12 }}>
          All clause text is encrypted locally. Only commitment hashes go on-chain. Review your sensitivity settings before generating commitments.
        </p>
        {clauses.map((c: Clause, i: number) => (
          <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: i < clauses.length - 1 ? "1px solid rgba(239,228,208,0.08)" : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "0.7rem", color: "rgba(239,228,208,0.35)", marginRight: 10 }}>#{String(i + 1).padStart(2, "0")}</span>
              <div>
                <p style={{ fontSize: "0.875rem", color: "#EFE4D0" }}>{c.title}</p>
                <p style={{ fontSize: "0.7rem", color: "rgba(239,228,208,0.4)", fontFamily: "IBM Plex Mono, monospace", marginTop: 2 }}>{c.type} - public hash only</p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <select
                value={c.sensitivity}
                onChange={e => wizard.updateClause(i, { sensitivity: e.target.value as Clause["sensitivity"] })}
                style={{ backgroundColor: "#0B0B10", border: "1px solid rgba(239,228,208,0.18)", color: SENSITIVITY_COLORS[c.sensitivity], padding: "4px 8px", borderRadius: 2, fontSize: "0.7rem", fontFamily: "IBM Plex Mono, monospace", cursor: "pointer" }}
              >
                {["PUBLIC", "PRIVATE", "REDACTED"].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <Lock size={12} style={{ color: "rgba(239,228,208,0.3)" }} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <SealButton variant="ghost" onClick={wizard.prevStep}>Back</SealButton>
        <SealButton onClick={wizard.nextStep}>Confirm Privacy Settings</SealButton>
      </div>
    </div>
  );
}
