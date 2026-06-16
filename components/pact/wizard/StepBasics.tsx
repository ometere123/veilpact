"use client";

import { useState } from "react";
import { SealButton } from "@/components/ui/SealButton";
import { PACT_CATEGORIES } from "@/lib/constants";
import type { WizardState } from "@/hooks/usePactWizard";

const FIELD = (label: string, children: React.ReactNode) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    <label style={{ fontSize: "0.7rem", letterSpacing: "0.12em", color: "rgba(239,228,208,0.5)", textTransform: "uppercase", fontFamily: "IBM Plex Mono, monospace" }}>{label}</label>
    {children}
  </div>
);

const INPUT_STYLE: React.CSSProperties = {
  backgroundColor: "#0B0B10",
  border: "1px solid rgba(239,228,208,0.18)",
  color: "#EFE4D0",
  padding: "10px 14px",
  borderRadius: 2,
  fontSize: "0.875rem",
  outline: "none",
  width: "100%",
};

interface StepBasicsProps { wizard: WizardState; }

export function StepBasics({ wizard }: StepBasicsProps) {
  const d = wizard.draft;
  const [local, setLocal] = useState({
    title:       d.title ?? "",
    partyB:      d.partyB ?? "",
    category:    d.category ?? "FREELANCE_SERVICE",
    description: d.description ?? "",
    duration:    d.duration ?? "",
    jurisdiction:d.jurisdiction ?? "",
  });

  const save = () => {
    wizard.updateBasics(local);
    wizard.nextStep();
  };

  return (
    <div style={{ border: "1px solid rgba(239,228,208,0.18)", backgroundColor: "#14141C", borderRadius: 2, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
      {FIELD("Pact Title", <input style={INPUT_STYLE} placeholder="Website Delivery Agreement" value={local.title} onChange={e => setLocal(p => ({ ...p, title: e.target.value }))} />)}
      {FIELD("Counterparty Address", <input style={INPUT_STYLE} placeholder="0x..." value={local.partyB} onChange={e => setLocal(p => ({ ...p, partyB: e.target.value }))} />)}
      {FIELD("Category",
        <select style={{ ...INPUT_STYLE, cursor: "pointer" }} value={local.category} onChange={e => setLocal(p => ({ ...p, category: e.target.value }))}>
          {Object.values(PACT_CATEGORIES).map(c => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
        </select>
      )}
      {FIELD("Short Description", <textarea style={{ ...INPUT_STYLE, resize: "vertical", minHeight: 72 }} placeholder="Briefly describe this agreement..." value={local.description} onChange={e => setLocal(p => ({ ...p, description: e.target.value }))} />)}
      {FIELD("Expected Duration (optional)", <input style={INPUT_STYLE} placeholder="e.g. 3 months" value={local.duration} onChange={e => setLocal(p => ({ ...p, duration: e.target.value }))} />)}
      {FIELD("Jurisdiction Note (optional)", <input style={INPUT_STYLE} placeholder="e.g. England & Wales" value={local.jurisdiction} onChange={e => setLocal(p => ({ ...p, jurisdiction: e.target.value }))} />)}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
        <SealButton onClick={save} disabled={!local.title || !local.partyB}>Continue</SealButton>
      </div>
    </div>
  );
}
