"use client";

import { use, useCallback, useEffect, useState } from "react";
import { DossierCard }    from "@/components/ui/DossierCard";
import { HashRibbon }     from "@/components/ui/HashRibbon";
import { TimelineEvent }  from "@/components/dispute/TimelineEvent";
import { PrivacyMeter }   from "@/components/privacy/PrivacyMeter";
import { PaymentStatusCard }    from "@/components/payment/PaymentStatusCard";
import { PaymentActions }       from "@/components/payment/PaymentActions";
import { formatGEN }            from "@/lib/utils/format-gen";
import { SettlementDecisionCard } from "@/components/payment/SettlementDecisionCard";
import { VerdictStamp }         from "@/components/verdict/VerdictStamp";
import { SealButton }           from "@/components/ui/SealButton";
import { useWalletContext }      from "@/contexts/WalletContext";
import { veilpactRead, veilpactWrite } from "@/lib/genlayer/contract";
import { syncPactFromChain }     from "@/lib/genlayer/sync";
import { getPactByOnChainId, type StoredPact } from "@/lib/storage/indexeddb";
import type { PactOnChain, DisputeOnChain } from "@/lib/schemas/pact";
import { cn }              from "@/lib/utils";
import { RefreshCw } from "lucide-react";

const TABS = ["Summary", "Payment", "Clauses", "Commitments", "Disputes", "Timeline", "Privacy"];

export default function PactDetailPage({ params }: { params: Promise<{ pactId: string }> }) {
  const { pactId } = use(params);
  const numId = parseInt(pactId, 10);
  const { address } = useWalletContext();

  const [tab,     setTab]     = useState("Summary");
  const [pact,    setPact]    = useState<PactOnChain | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [disputes, setDisputes] = useState<DisputeOnChain[]>([]);
  const [localPact, setLocalPact] = useState<StoredPact | null>(null);
  const [reveals, setReveals] = useState<unknown[]>([]);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);

  const loadPact = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await syncPactFromChain(numId);
      setPact(data);
      setLastSyncedAt(Date.now());
      setLocalPact(await getPactByOnChainId(numId) ?? null);
      setReveals(await veilpactRead.getReveals(numId) as unknown[]);
      // Load disputes if any
      if (data.disputeCount > 0) {
        const ds = await Promise.all(
          Array.from({ length: data.disputeCount }, (_, i) => veilpactRead.getDispute(numId, i + 1))
        );
        setDisputes(ds);
      } else {
        setDisputes([]);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load pact");
    } finally {
      setLoading(false);
    }
  }, [numId]);

  useEffect(() => {
    void Promise.resolve().then(loadPact);
  }, [loadPact]);

  async function handleAccept() {
    if (!address || !pact) return;
    await veilpactWrite.acceptPact(address as `0x${string}`, numId);
    await loadPact();
  }

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", fontFamily: "IBM Plex Mono, monospace", color: "rgba(239,228,208,0.4)" }}>
        Loading pact #{pactId}…
      </div>
    );
  }

  if (error || !pact) {
    return (
      <div style={{ padding: 40 }}>
        <p style={{ color: "#B85C70", fontFamily: "IBM Plex Mono, monospace" }}>{error ?? "Pact not found"}</p>
        <SealButton onClick={loadPact} style={{ marginTop: 16 }}>Retry</SealButton>
      </div>
    );
  }

  const isPartyB = address?.toLowerCase() === pact.partyB?.toLowerCase();
  const canAccept = isPartyB && pact.status === "PENDING_COUNTERPARTY";

  const latestVerdict = disputes.find(d => d.verdict)?.verdict ?? null;
  const latestDisputeId = disputes.find(d => d.verdict)?.disputeId ?? -1;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-heading text-3xl text-parchment tracking-widest">PACT #{pactId}</h1>
          <p className="text-xs text-muted-parchment mt-1 font-mono">
            Last synced from GenLayer: {lastSyncedAt ? new Date(lastSyncedAt).toLocaleTimeString() : "not synced"}
          </p>
          <p className="text-xs text-muted-parchment mt-1 font-mono">
            {pact.partyA?.slice(0, 10)}… ↔ {pact.partyB?.slice(0, 10)}…
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SealButton size="sm" variant="outline" onClick={loadPact}>
            <RefreshCw size={12} /> Sync from GenLayer
          </SealButton>
          <span style={{
            border: `1px solid ${pact.status === "ACTIVE" ? "rgba(110,159,126,0.4)" : "rgba(239,228,208,0.2)"}`,
            color: pact.status === "ACTIVE" ? "#6E9F7E" : "rgba(239,228,208,0.6)",
          }} className="text-xs font-mono px-2.5 py-1 rounded-sm">
            {pact.status}
          </span>
        </div>
      </div>

      <HashRibbon label="Agreement Root" hash={pact.agreementRoot} color="gold" />

      {canAccept && (
        <div style={{ border: "1px solid rgba(201,163,91,0.3)", backgroundColor: "rgba(201,163,91,0.05)", borderRadius: 2, padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ fontFamily: "Bebas Neue, sans-serif", letterSpacing: "0.08em", color: "#C9A35B" }}>AWAITING YOUR ACCEPTANCE</p>
            <p style={{ fontSize: "0.78rem", color: "rgba(239,228,208,0.64)", marginTop: 2 }}>You are Party B. Accept to activate this pact.</p>
          </div>
          <SealButton variant="gold" onClick={handleAccept}>Accept Pact</SealButton>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-0 border-b border-bone-border overflow-x-auto">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn(
              "px-4 py-2.5 text-xs font-mono uppercase tracking-widest transition-colors border-b-2 -mb-px whitespace-nowrap",
              tab === t ? "border-sealed-gold text-parchment" : "border-transparent text-muted-parchment hover:text-parchment"
            )}>
            {t}
            {t === "Payment" && pact.paymentStatus && pact.paymentStatus !== "NONE" && (
              <span className="ml-1.5 text-sealed-gold">●</span>
            )}
          </button>
        ))}
      </div>

      {tab === "Summary" && (
        <div className="grid grid-cols-2 gap-4">
          <DossierCard><p className="text-xs text-muted-parchment">Party A</p><p className="font-mono text-sm text-parchment mt-1 break-all">{pact.partyA}</p></DossierCard>
          <DossierCard><p className="text-xs text-muted-parchment">Party B</p><p className="font-mono text-sm text-parchment mt-1 break-all">{pact.partyB}</p></DossierCard>
          <DossierCard><p className="text-xs text-muted-parchment">Clauses</p><p className="font-mono text-sm text-parchment mt-1">{pact.clauseCount}</p></DossierCard>
          <DossierCard><p className="text-xs text-muted-parchment">Revealed</p><p className="font-mono text-sm text-parchment mt-1">{pact.revealedCount ?? 0}</p></DossierCard>
          <DossierCard><p className="text-xs text-muted-parchment">Disputes</p><p className="font-mono text-sm text-parchment mt-1">{pact.disputeCount ?? 0}</p></DossierCard>
          <DossierCard><p className="text-xs text-muted-parchment">Created</p><p className="font-mono text-sm text-parchment mt-1">{pact.createdAt ? new Date(pact.createdAt * 1000).toLocaleDateString() : "-"}</p></DossierCard>
          <DossierCard><p className="text-xs text-muted-parchment">Local Private Package</p><p className="font-mono text-sm text-parchment mt-1">{localPact ? "Available in this browser" : "Missing"}</p></DossierCard>
          <DossierCard><p className="text-xs text-muted-parchment">Local Source</p><p className="font-mono text-sm text-parchment mt-1">{localPact?.source ?? "chain-only"}</p></DossierCard>
          <div className="col-span-2">
            <DossierCard>
              <p className="text-xs text-muted-parchment mb-1">Root Salt</p>
              <p className="font-mono text-xs text-muted-parchment/50 break-all">{pact.rootSalt}</p>
            </DossierCard>
          </div>
        </div>
      )}

      {tab === "Payment" && (
        <div className="space-y-4">
          <PaymentStatusCard pact={pact} connectedAddress={address ?? ""} />
          <PaymentActions pact={pact} pactId={numId} address={address ?? ""} onDone={loadPact} />
          {latestVerdict && latestDisputeId >= 0 && (
            <SettlementDecisionCard
              verdict={latestVerdict}
              pact={pact}
              pactId={numId}
              disputeId={latestDisputeId}
              address={address ?? ""}
              onApplied={loadPact}
            />
          )}
        </div>
      )}

      {tab === "Clauses" && (
        <div className="space-y-3">
          {Array.from({ length: pact.clauseCount ?? 0 }).map((_, i) => (
            <DossierCard key={i}>
              <p className="text-xs text-muted-parchment font-mono">CLAUSE #{i} - commitment stored on-chain</p>
              <p className="text-xs text-muted-parchment/50 font-mono mt-1 break-all">
                {pact.clauseCommitments?.[i] ?? "(no commitment data)"}
              </p>
            </DossierCard>
          ))}
        </div>
      )}

      {tab === "Commitments" && (
        <div className="space-y-3">
          <HashRibbon label="Agreement Root" hash={pact.agreementRoot} />
          <DossierCard>
            <p className="text-xs text-muted-parchment mb-1">Metadata Hash</p>
            <p className="font-mono text-xs text-parchment break-all">{pact.metadataHash}</p>
          </DossierCard>
          {(pact.clauseCommitments ?? []).map((h, i) => (
            <HashRibbon key={i} label={`Clause ${i}`} hash={h} />
          ))}
        </div>
      )}

      {tab === "Disputes" && (
        <div className="space-y-4">
          {disputes.length === 0 ? (
            <DossierCard><p className="text-muted-parchment text-sm">No disputes.</p></DossierCard>
          ) : disputes.map(d => (
            <DossierCard key={d.disputeId}>
              <div className="flex justify-between items-start mb-3">
                <p className="font-heading text-lg text-parchment">DISPUTE #{d.disputeId}</p>
                <span className="text-xs font-mono text-muted-parchment border border-bone-border px-2 py-0.5 rounded-sm">{d.status}</span>
              </div>
              <p className="text-xs text-muted-parchment">Clause #{d.clauseIndex} · Opened by {d.opener?.slice(0, 10)}…</p>
              <p className="text-sm text-parchment mt-2">{d.claim}</p>
              {d.verdict && (
                <div className="mt-4">
                  <VerdictStamp
                    action={d.verdict.recommendedAction}
                    verdict={d.verdict}
                    confidence={d.verdict.confidence}
                  />
                </div>
              )}
            </DossierCard>
          ))}
        </div>
      )}

      {tab === "Privacy" && (
        <DossierCard>
          <PrivacyMeter total={pact.clauseCount ?? 0} revealed={pact.revealedCount ?? 0} />
          <p className="text-xs text-muted-parchment mt-3 font-mono">
            Reveal records loaded from GenLayer: {reveals.length}
          </p>
        </DossierCard>
      )}

      {tab === "Timeline" && (
        <DossierCard>
          <div className="space-y-0">
            <TimelineEvent type="PACT_CREATED" label="PACT_CREATED" description="Commitment root stored on GenLayer" timestamp={pact.createdAt} />
            {pact.fundedAmount > BigInt(0) && (
              <TimelineEvent type="PACT_FUNDED" label="PACT_FUNDED" description={`${formatGEN(pact.fundedAmount)} GEN funded`} />
            )}
            {pact.acceptedAt > 0 && (
              <TimelineEvent type="COUNTERPARTY_ACCEPTED" label="COUNTERPARTY_ACCEPTED" timestamp={pact.acceptedAt} />
            )}
            {pact.paymentStatus === "LOCKED" && (
              <TimelineEvent type="PAYMENT_LOCKED" label="PAYMENT_LOCKED" description="GEN locked in contract" />
            )}
            {disputes.map(d => (
              <TimelineEvent key={d.disputeId} type="DISPUTE_OPENED" label="DISPUTE_OPENED" description={`Dispute #${d.disputeId} - clause ${d.clauseIndex}`} timestamp={d.createdAt} />
            ))}
            {latestVerdict && (
              <TimelineEvent type="GENLAYER_REVIEW_COMPLETE" label="GENLAYER_REVIEW_COMPLETE" description={`Verdict: ${latestVerdict.recommendedAction} / ${latestVerdict.paymentDecision}`} />
            )}
            {pact.settlementApplied && (
              <TimelineEvent type="SETTLEMENT_APPLIED" label="SETTLEMENT_APPLIED" description="Settlement decision applied" />
            )}
            {pact.closedAt > 0 && (
              <TimelineEvent type="PACT_CLOSED" label="PACT_CLOSED" timestamp={pact.closedAt} last />
            )}
          </div>
        </DossierCard>
      )}
    </div>
  );
}
