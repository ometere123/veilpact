"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { DossierCard } from "@/components/ui/DossierCard";
import { SealButton } from "@/components/ui/SealButton";
import { useWalletContext } from "@/contexts/WalletContext";
import { veilpactRead } from "@/lib/genlayer/contract";
import { syncUserPactsFromChain, type SyncedPact } from "@/lib/genlayer/sync";
import type { DisputeOnChain } from "@/lib/schemas/pact";

interface EvidencePact {
  item: SyncedPact;
  disputes: DisputeOnChain[];
  reveals: unknown[];
}

function safeJson(value: unknown): string {
  return JSON.stringify(value, (_, nested) => typeof nested === "bigint" ? nested.toString() : nested, 2);
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export default function EvidenceRoomPage() {
  const { address, connected, connect, connecting } = useWalletContext();
  const [rows, setRows] = useState<EvidencePact[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const syncEvidence = useCallback(async () => {
    if (!address) return;
    setSyncing(true);
    setError(null);
    try {
      const synced = await syncUserPactsFromChain(address);
      const chainRows = synced.filter(item => item.chain && item.pactId);
      const hydrated: EvidencePact[] = [];

      for (const item of chainRows) {
        const pactId = item.pactId as number;
        const disputeCount = Number(item.chain?.disputeCount ?? 0);
        const disputes: DisputeOnChain[] = [];
        for (let id = 1; id <= disputeCount; id += 1) {
          try {
            disputes.push(await veilpactRead.getDispute(pactId, id));
          } catch {
            // A missing dispute should not hide the pact row; the sync banner reports the broader state.
          }
        }

        let reveals: unknown[] = [];
        try {
          reveals = asArray(await veilpactRead.getReveals(pactId));
        } catch {
          reveals = [];
        }

        if (disputes.length > 0 || reveals.length > 0) {
          hydrated.push({ item, disputes, reveals });
        }
      }

      setRows(hydrated);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to sync evidence from GenLayer");
    } finally {
      setSyncing(false);
    }
  }, [address]);

  useEffect(() => {
    if (!connected) return;
    void Promise.resolve().then(syncEvidence);
  }, [connected, syncEvidence]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl text-parchment tracking-widest">EVIDENCE ROOM</h1>
          <p className="text-sm text-muted-parchment mt-1">
            Dispute claims, responses, verdict context, and selective reveal records from GenLayer.
          </p>
        </div>
        <SealButton size="sm" variant="outline" loading={syncing} disabled={!connected} onClick={syncEvidence}>
          <RefreshCw size={12} /> Sync from GenLayer
        </SealButton>
      </div>

      {!connected && (
        <DossierCard gold>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-heading text-lg text-parchment tracking-widest">CONNECT WALLET</p>
              <p className="text-sm text-muted-parchment mt-1">Connect to read dispute evidence from GenLayer.</p>
            </div>
            <SealButton onClick={connect} loading={connecting}>Connect Wallet</SealButton>
          </div>
        </DossierCard>
      )}

      {error && (
        <DossierCard gold>
          <div className="flex gap-2 text-sealed-gold text-sm">
            <AlertTriangle size={15} className="shrink-0 mt-0.5" />
            <p>Could not refresh from GenLayer. {error}</p>
          </div>
        </DossierCard>
      )}

      {connected && rows.length === 0 && (
        <DossierCard>
          <div className="flex items-center justify-between gap-4">
            <p className="text-muted-parchment text-sm">
              No GenLayer dispute evidence found for this wallet yet.
            </p>
            <Link href="/disputes">
              <SealButton size="sm" variant="ghost">Open Dispute</SealButton>
            </Link>
          </div>
        </DossierCard>
      )}

      {rows.map(({ item, disputes, reveals }) => (
        <DossierCard key={`${item.pactId}-evidence`}>
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-heading text-xl text-parchment tracking-widest">{item.title}</p>
                <p className="font-mono text-xs text-muted-parchment mt-1">
                  Pact {item.pactId} - {item.status} - disputes {disputes.length} - reveals {reveals.length}
                </p>
              </div>
              <div className="flex gap-2">
                <Link href={`/pacts/${item.pactId}`}>
                  <SealButton size="sm" variant="ghost">Open Pact</SealButton>
                </Link>
                <Link href="/reveal">
                  <SealButton size="sm" variant="outline">Reveal Clause</SealButton>
                </Link>
              </div>
            </div>

            <div className="space-y-3">
              {disputes.map(dispute => (
                <div key={dispute.disputeId} className="rounded-sm border border-bone-border p-3 bg-void-ink/40">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-heading text-parchment tracking-widest">Dispute #{dispute.disputeId}</p>
                    <span className="font-mono text-[0.65rem] text-sealed-gold">{dispute.status}</span>
                  </div>
                  <div className="grid md:grid-cols-2 gap-3 mt-3">
                    <div>
                      <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-muted-parchment">Claim</p>
                      <p className="text-sm text-parchment mt-1 whitespace-pre-wrap">{dispute.claim}</p>
                    </div>
                    <div>
                      <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-muted-parchment">Requested Outcome</p>
                      <p className="text-sm text-parchment mt-1">{dispute.requestedOutcome}</p>
                      <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-muted-parchment mt-3">Clause</p>
                      <p className="text-sm text-parchment mt-1">{dispute.clauseIndex}</p>
                    </div>
                  </div>
                  {dispute.verdict && (
                    <div className="mt-3 rounded-sm border border-sealed-gold/25 bg-sealed-gold/5 p-3">
                      <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-sealed-gold">AI Verdict</p>
                      <p className="text-sm text-parchment mt-1">
                        {dispute.verdict.paymentDecision} - confidence {dispute.verdict.confidence}
                      </p>
                      <p className="text-xs text-muted-parchment mt-2 whitespace-pre-wrap">{dispute.verdict.reasoning}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {reveals.length > 0 && (
              <div className="rounded-sm border border-bone-border p-3">
                <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-muted-parchment mb-2">
                  Reveal Records
                </p>
                <pre className="font-mono text-[0.68rem] text-muted-parchment whitespace-pre-wrap overflow-auto max-h-80">
                  {safeJson(reveals)}
                </pre>
              </div>
            )}
          </div>
        </DossierCard>
      ))}
    </div>
  );
}
