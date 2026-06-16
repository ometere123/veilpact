"use client";

import { useState } from "react";
import { SealButton } from "@/components/ui/SealButton";
import { CLAUSE_TYPES, REMEDY_PREFERENCES } from "@/lib/constants";
import { Plus, Trash2, Lock } from "lucide-react";
import type { Clause } from "@/lib/schemas/pact";
import type { WizardState } from "@/hooks/usePactWizard";

const INPUT_STYLE: React.CSSProperties = {
  backgroundColor: "#0B0B10",
  border: "1px solid rgba(239,228,208,0.18)",
  color: "#EFE4D0",
  padding: "8px 12px",
  borderRadius: 2,
  fontSize: "0.8rem",
  outline: "none",
  width: "100%",
};

type ClauseForm = {
  clauseType: string;
  clauseTitle: string;
  clauseText: string;
  remedyPreference: string;
  revealSensitivity: Clause["sensitivity"];
  evidenceExpected: string;
};

const EMPTY_CLAUSE: ClauseForm = {
  clauseType: "DELIVERY",
  clauseTitle: "",
  clauseText: "",
  remedyPreference: "RENEGOTIATE_OR_SETTLE",
  revealSensitivity: "PRIVATE",
  evidenceExpected: "",
};

interface StepClausesProps { wizard: WizardState; }

export function StepClauses({ wizard }: StepClausesProps) {
  const clauses = wizard.draft.clauses ?? [];
  const [form, setForm] = useState<ClauseForm>(EMPTY_CLAUSE);
  const [adding, setAdding] = useState(false);

  const save = () => {
    if (!form.clauseTitle || !form.clauseText) return;
    wizard.addClause(form);
    setForm(EMPTY_CLAUSE);
    setAdding(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {clauses.length === 0 && !adding && (
        <div style={{ border: "1px dashed rgba(239,228,208,0.18)", borderRadius: 2, padding: 32, textAlign: "center", color: "rgba(239,228,208,0.4)", fontSize: "0.875rem" }}>
          No clauses yet. Add at least one clause.
        </div>
      )}

      {clauses.map((c: Clause, i: number) => (
        <div key={i} style={{ border: "1px solid rgba(239,228,208,0.18)", backgroundColor: "#14141C", borderRadius: 2, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "0.7rem", color: "rgba(239,228,208,0.4)" }}>#{String(i + 1).padStart(2, "0")} - {c.type}</span>
              <p style={{ color: "#EFE4D0", fontSize: "0.875rem", fontWeight: 500, marginTop: 2 }}>{c.title}</p>
              <p style={{ color: "rgba(239,228,208,0.6)", fontSize: "0.8rem", marginTop: 4, lineHeight: 1.5 }}>{c.text}</p>
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0, marginLeft: 12 }}>
              <span style={{ fontSize: "0.65rem", border: "1px solid rgba(239,228,208,0.18)", color: "rgba(239,228,208,0.5)", padding: "2px 6px", borderRadius: 2, fontFamily: "IBM Plex Mono, monospace" }}>
                {c.sensitivity}
              </span>
              <Lock size={14} style={{ color: "rgba(239,228,208,0.4)" }} />
              <button onClick={() => wizard.removeClause(i)} style={{ color: "#B85C70", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>
      ))}

      {adding && (
        <div style={{ border: "1px solid rgba(201,163,91,0.3)", backgroundColor: "#14141C", borderRadius: 2, padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: "0.65rem", color: "rgba(239,228,208,0.4)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Type</label>
              <select style={{ ...INPUT_STYLE, marginTop: 4 }} value={form.clauseType} onChange={e => setForm(p => ({ ...p, clauseType: e.target.value }))}>
                {Object.values(CLAUSE_TYPES).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: "0.65rem", color: "rgba(239,228,208,0.4)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Sensitivity</label>
              <select style={{ ...INPUT_STYLE, marginTop: 4 }} value={form.revealSensitivity} onChange={e => setForm(p => ({ ...p, revealSensitivity: e.target.value as Clause["sensitivity"] }))}>
                {["PUBLIC", "PRIVATE", "REDACTED"].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={{ fontSize: "0.65rem", color: "rgba(239,228,208,0.4)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Clause Title</label>
            <input style={{ ...INPUT_STYLE, marginTop: 4 }} placeholder="e.g. Delivery Deadline" value={form.clauseTitle} onChange={e => setForm(p => ({ ...p, clauseTitle: e.target.value }))} />
          </div>
          <div>
            <label style={{ fontSize: "0.65rem", color: "rgba(239,228,208,0.4)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Clause Text</label>
            <textarea style={{ ...INPUT_STYLE, marginTop: 4, resize: "vertical", minHeight: 80 }} placeholder="Write the full clause in plain language..." value={form.clauseText} onChange={e => setForm(p => ({ ...p, clauseText: e.target.value }))} />
          </div>
          <div>
            <label style={{ fontSize: "0.65rem", color: "rgba(239,228,208,0.4)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Remedy Preference</label>
            <select style={{ ...INPUT_STYLE, marginTop: 4 }} value={form.remedyPreference} onChange={e => setForm(p => ({ ...p, remedyPreference: e.target.value }))}>
              {Object.values(REMEDY_PREFERENCES).map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: "0.65rem", color: "rgba(239,228,208,0.4)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Evidence Expected (optional)</label>
            <input style={{ ...INPUT_STYLE, marginTop: 4 }} placeholder="e.g. Delivery confirmation, screenshots" value={form.evidenceExpected} onChange={e => setForm(p => ({ ...p, evidenceExpected: e.target.value }))} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <SealButton onClick={save} disabled={!form.clauseTitle || !form.clauseText}>Add Clause</SealButton>
            <SealButton variant="ghost" onClick={() => setAdding(false)}>Cancel</SealButton>
          </div>
        </div>
      )}

      {!adding && (
        <button
          onClick={() => setAdding(true)}
          style={{ border: "1px dashed rgba(201,163,91,0.3)", borderRadius: 2, padding: "12px 0", color: "#C9A35B", background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: "0.875rem" }}
        >
          <Plus size={14} /> Add Clause
        </button>
      )}

      {clauses.length > 0 && !adding && (
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
          <SealButton variant="ghost" onClick={wizard.prevStep}>Back</SealButton>
          <SealButton onClick={wizard.nextStep}>Continue ({clauses.length} clause{clauses.length !== 1 ? "s" : ""})</SealButton>
        </div>
      )}
    </div>
  );
}
