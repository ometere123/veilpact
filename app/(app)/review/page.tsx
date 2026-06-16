"use client";

import { useState }         from "react";
import { DossierCard }      from "@/components/ui/DossierCard";
import { SealButton }       from "@/components/ui/SealButton";
import { VerdictStamp }     from "@/components/verdict/VerdictStamp";
import { SettlementDecisionCard } from "@/components/payment/SettlementDecisionCard";
import { useWalletContext } from "@/contexts/WalletContext";
import { veilpactRead }     from "@/lib/genlayer/contract";
import type { PactOnChain, DisputeOnChain } from "@/lib/schemas/pact";

export default function GenLayerReviewPage() {
  const { address } = useWalletContext();

  const [pactId,    setPactId]    = useState("");
  const [disputeId, setDisputeId] = useState("");
  const [pact,      setPact]      = useState<PactOnChain | null>(null);
  const [dispute,   setDispute]   = useState<DisputeOnChain | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  async function loadDispute() {
    if (!pactId || !disputeId) return;
    setLoading(true);
    setError(null);
    try {
      const [p, d] = await Promise.all([
        veilpactRead.getPact(parseInt(pactId, 10)),
        veilpactRead.getDispute(parseInt(pactId, 10), parseInt(disputeId, 10)),
      ]);
      setPact(p);
      setDispute(d);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  const inp: React.CSSProperties = {
    background: "#0B0B10", border: "1px solid rgba(239,228,208,0.18)",
    borderRadius: 2, padding: "10px 12px", color: "#EFE4D0",
    fontFamily: "IBM Plex Mono, monospace", fontSize: "0.8rem", outline: "none", width: 120,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl text-parchment tracking-widest">GENLAYER REVIEW</h1>
        <p className="text-sm text-muted-parchment mt-1">
          GenLayer validator verdicts and settlement decisions.
        </p>
      </div>

      <DossierCard>
        <p className="text-xs font-mono text-muted-parchment uppercase tracking-widest mb-3">Sync Verdict</p>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
          <div>
            <p style={{ fontSize: "0.6rem", fontFamily: "IBM Plex Mono, monospace", color: "rgba(239,228,208,0.4)", marginBottom: 4 }}>PACT ID</p>
            <input style={inp} type="number" min="0" placeholder="0" value={pactId} onChange={e => setPactId(e.target.value)} />
          </div>
          <div>
            <p style={{ fontSize: "0.6rem", fontFamily: "IBM Plex Mono, monospace", color: "rgba(239,228,208,0.4)", marginBottom: 4 }}>DISPUTE ID</p>
            <input style={inp} type="number" min="0" placeholder="0" value={disputeId} onChange={e => setDisputeId(e.target.value)} />
          </div>
          <SealButton onClick={loadDispute} disabled={loading || !pactId || !disputeId}>
            {loading ? "Syncing..." : "Sync from GenLayer"}
          </SealButton>
        </div>
        {error && <p style={{ color: "#B85C70", fontSize: "0.78rem", marginTop: 10, fontFamily: "IBM Plex Mono, monospace" }}>{error}</p>}
      </DossierCard>

      {dispute && pact && (
        <>
          <DossierCard>
            <div style={{ marginBottom: 12 }}>
              <p className="text-xs font-mono text-muted-parchment uppercase tracking-widest mb-1">Dispute #{dispute.disputeId} - Pact #{dispute.pactId}</p>
              <p className="text-sm text-parchment">{dispute.claim}</p>
              <p className="text-xs text-muted-parchment mt-1">Clause #{dispute.clauseIndex} · Status: {dispute.status}</p>
            </div>
          </DossierCard>

          {dispute.verdict ? (
            <>
              <VerdictStamp
                action={dispute.verdict.recommendedAction}
                verdict={dispute.verdict}
                confidence={dispute.verdict.confidence}
              />

              {dispute.verdict.paymentDecision !== "NO_PAYMENT_ACTION" && (
                <SettlementDecisionCard
                  verdict={dispute.verdict}
                  pact={pact}
                  pactId={parseInt(pactId, 10)}
                  disputeId={parseInt(disputeId, 10)}
                  address={address ?? ""}
                  onApplied={() => loadDispute()}
                />
              )}
            </>
          ) : (
            <DossierCard>
              <p className="text-muted-parchment text-sm">Verdict pending. GenLayer validators are reviewing the revealed clause.</p>
            </DossierCard>
          )}
        </>
      )}

      {!dispute && !loading && (
        <DossierCard>
          <p className="text-muted-parchment text-sm">Enter a pact ID and dispute ID above to sync a verdict from GenLayer.</p>
        </DossierCard>
      )}
    </div>
  );
}
