"use client";

import { useState }    from "react";
import { DossierCard } from "@/components/ui/DossierCard";
import { SealButton }  from "@/components/ui/SealButton";
import { veilpactRead } from "@/lib/genlayer/contract";
import { PAYMENT_DECISION } from "@/lib/constants";

interface LedgerEntry {
  entryId:              string;
  pactId:               number;
  disputeId:            number;
  clauseIndex:          number;
  revealedBy:           string;
  verified:             boolean;
  safetyLabel:          string;
  privacyJudgement:     string;
  paymentDecision:      string;
  overdisclosureWarning:boolean;
  timestamp:            number;
}

const DECISION_COLOR: Record<string, string> = {
  NO_PAYMENT_ACTION: "rgba(239,228,208,0.3)",
  RELEASE_TO_PAYEE:  "#6E9F7E",
  REFUND_TO_PAYER:   "#C9A35B",
  SPLIT_PAYMENT:     "#7D5FFF",
  PAUSE_PAYMENT:     "#C9A35B",
};

export default function PrivacyLedgerPage() {
  const [entries,  setEntries]  = useState<LedgerEntry[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [loaded,   setLoaded]   = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await veilpactRead.getPrivacyLedger() as LedgerEntry[];
      setEntries(Array.isArray(data) ? data : []);
      setLoaded(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load privacy ledger");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl text-parchment tracking-widest">PRIVACY LEDGER</h1>
        <p className="text-sm text-muted-parchment mt-1">
          On-chain record of every selective reveal: what was exposed, why, and the payment decision.
        </p>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <SealButton onClick={load} disabled={loading}>{loading ? "Loading…" : "Fetch from Chain"}</SealButton>
        {loaded && <p style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "0.65rem", color: "rgba(239,228,208,0.35)" }}>{entries.length} entries</p>}
      </div>

      {error && (
        <div style={{ border: "1px solid rgba(184,92,112,0.3)", backgroundColor: "rgba(184,92,112,0.05)", borderRadius: 2, padding: 12 }}>
          <p style={{ color: "#B85C70", fontFamily: "IBM Plex Mono, monospace", fontSize: "0.78rem" }}>{error}</p>
        </div>
      )}

      {loaded && entries.length === 0 && (
        <DossierCard>
          <p className="text-muted-parchment text-sm">No reveals recorded yet.</p>
        </DossierCard>
      )}

      {entries.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "IBM Plex Mono, monospace", fontSize: "0.68rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(239,228,208,0.12)" }}>
                {["Pact", "Dispute", "Clause", "Revealed By", "Verified", "Safety", "Privacy", "Payment Decision", "Overdisclosure"].map(h => (
                  <th key={h} style={{ padding: "8px 10px", textAlign: "left", color: "rgba(239,228,208,0.35)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: "normal", whiteSpace: "nowrap" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => (
                <tr key={i} style={{ borderBottom: "1px solid rgba(239,228,208,0.06)" }}>
                  <td style={{ padding: "8px 10px", color: "#EFE4D0" }}>{e.pactId}</td>
                  <td style={{ padding: "8px 10px", color: "#EFE4D0" }}>{e.disputeId}</td>
                  <td style={{ padding: "8px 10px", color: "#EFE4D0" }}>{e.clauseIndex}</td>
                  <td style={{ padding: "8px 10px", color: "rgba(239,228,208,0.5)", maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis" }}>
                    {e.revealedBy?.slice(0, 10)}…
                  </td>
                  <td style={{ padding: "8px 10px", color: e.verified ? "#6E9F7E" : "#B85C70" }}>
                    {e.verified ? "YES" : "NO"}
                  </td>
                  <td style={{ padding: "8px 10px", color: e.safetyLabel === "SAFE_TO_REVIEW" ? "#6E9F7E" : "#B85C70", whiteSpace: "nowrap" }}>
                    {e.safetyLabel}
                  </td>
                  <td style={{ padding: "8px 10px", color: "rgba(239,228,208,0.5)", whiteSpace: "nowrap" }}>
                    {e.privacyJudgement}
                  </td>
                  <td style={{ padding: "8px 10px", color: DECISION_COLOR[e.paymentDecision] ?? "rgba(239,228,208,0.5)", whiteSpace: "nowrap" }}>
                    {e.paymentDecision}
                  </td>
                  <td style={{ padding: "8px 10px", color: e.overdisclosureWarning ? "#B85C70" : "rgba(239,228,208,0.3)" }}>
                    {e.overdisclosureWarning ? "⚠ YES" : "NO"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loaded && !loading && (
        <DossierCard>
          <p className="text-muted-parchment text-sm">
            A complete record of every selective reveal, verified against the agreement root on-chain.
            Hidden clause content is never exposed here.
          </p>
        </DossierCard>
      )}
    </div>
  );
}
