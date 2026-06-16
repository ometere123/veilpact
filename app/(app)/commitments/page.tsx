"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle, RefreshCw } from "lucide-react";
import { DossierCard } from "@/components/ui/DossierCard";
import { SealButton } from "@/components/ui/SealButton";
import { useWalletContext } from "@/contexts/WalletContext";
import { syncUserPactsFromChain, type SyncedPact } from "@/lib/genlayer/sync";

function short(value?: string): string {
  if (!value) return "missing";
  return `${value.slice(0, 10)}...${value.slice(-6)}`;
}

function syncedAt(value: number | null): string {
  return value ? new Date(value).toLocaleString() : "not synced";
}

function chainCommitments(item: SyncedPact): string[] {
  const commitments = item.chain && "clauseCommitments" in item.chain
    ? item.chain.clauseCommitments
    : item.local?.chainSnapshot?.clauseCommitments;
  return Array.isArray(commitments) ? commitments : [];
}

export default function CommitmentsPage() {
  const { address, connected, connect, connecting } = useWalletContext();
  const [pacts, setPacts] = useState<SyncedPact[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const syncFromGenLayer = useCallback(async () => {
    if (!address) return;
    setSyncing(true);
    setError(null);
    try {
      setPacts(await syncUserPactsFromChain(address));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to sync commitments from GenLayer");
    } finally {
      setSyncing(false);
    }
  }, [address]);

  useEffect(() => {
    if (!connected) return;
    void Promise.resolve().then(syncFromGenLayer);
  }, [connected, syncFromGenLayer]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl text-parchment tracking-widest">COMMITMENTS</h1>
          <p className="text-sm text-muted-parchment mt-1">
            Agreement roots and clause fingerprints, refreshed from GenLayer.
          </p>
        </div>
        <SealButton size="sm" variant="outline" loading={syncing} disabled={!connected} onClick={syncFromGenLayer}>
          <RefreshCw size={12} /> Sync from GenLayer
        </SealButton>
      </div>

      {!connected && (
        <DossierCard gold>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-heading text-lg text-parchment tracking-widest">CONNECT WALLET</p>
              <p className="text-sm text-muted-parchment mt-1">Connect to read your pact commitments from GenLayer.</p>
            </div>
            <SealButton onClick={connect} loading={connecting}>Connect Wallet</SealButton>
          </div>
        </DossierCard>
      )}

      {error && (
        <DossierCard gold>
          <div className="flex gap-2 text-sealed-gold text-sm">
            <AlertTriangle size={15} className="shrink-0 mt-0.5" />
            <p>Could not refresh from GenLayer. Showing local cache where available. {error}</p>
          </div>
        </DossierCard>
      )}

      {connected && pacts.length === 0 && (
        <DossierCard>
          <p className="text-muted-parchment text-sm">No pacts found for this wallet.</p>
        </DossierCard>
      )}

      {pacts.map(item => {
        const chainRoot = item.chain?.agreementRoot;
        const localRoot = item.local?.agreementRoot;
        const rootMatches = !!chainRoot && !!localRoot && chainRoot.toLowerCase() === localRoot.toLowerCase();
        const chainClauses = chainCommitments(item);
        const localClauses = item.local?.clauseCommitments ?? [];

        return (
          <DossierCard key={`${item.pactId ?? item.local?.id ?? item.agreementRoot}-commitments`}>
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-heading text-xl text-parchment tracking-widest">{item.title}</p>
                  <p className="font-mono text-xs text-muted-parchment mt-1">
                    Pact {item.pactId ?? "local only"} - {item.status} - synced {syncedAt(item.lastSyncedAt)}
                  </p>
                </div>
                {item.pactId && (
                  <Link href={`/pacts/${item.pactId}`}>
                    <SealButton size="sm" variant="ghost">Open Pact</SealButton>
                  </Link>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <div className="rounded-sm border border-bone-border p-3 bg-void-ink/40">
                  <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-muted-parchment">Agreement Root</p>
                  <p className="font-mono text-sm text-parchment mt-2 break-all">{chainRoot ?? localRoot ?? "missing"}</p>
                  <div className={`flex items-center gap-2 text-xs mt-3 ${rootMatches || !chainRoot || !localRoot ? "text-verdict-green" : "text-redaction-rose"}`}>
                    {rootMatches || !chainRoot || !localRoot ? <CheckCircle size={13} /> : <AlertTriangle size={13} />}
                    {rootMatches ? "Local cache matches GenLayer root" : chainRoot ? "GenLayer root is authoritative" : "Local-only root"}
                  </div>
                </div>

                <div className="rounded-sm border border-bone-border p-3 bg-void-ink/40">
                  <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-muted-parchment">Metadata Hash</p>
                  <p className="font-mono text-sm text-parchment mt-2 break-all">{item.chain?.metadataHash ?? item.local?.metadataHash ?? "missing"}</p>
                  <p className="text-xs text-muted-parchment mt-3">
                    Status/payment/dispute state is read from GenLayer. IndexedDB only keeps the encrypted private package.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-muted-parchment">
                  Clause Commitments ({item.clauseCount})
                </p>
                {Array.from({ length: item.clauseCount }).map((_, index) => {
                  const chainHash = chainClauses[index];
                  const localHash = localClauses[index];
                  const matches = !!chainHash && !!localHash && chainHash.toLowerCase() === localHash.toLowerCase();
                  return (
                    <div key={index} className="grid md:grid-cols-[90px_1fr_auto] gap-3 items-center rounded-sm border border-bone-border p-3">
                      <p className="font-heading text-parchment tracking-widest">Clause {index}</p>
                      <div className="font-mono text-xs text-muted-parchment break-all">
                        <p>GenLayer: {short(chainHash)}</p>
                        <p>Local: {short(localHash)}</p>
                      </div>
                      <span className={`font-mono text-[0.65rem] ${matches ? "text-verdict-green" : chainHash ? "text-sealed-gold" : "text-muted-parchment"}`}>
                        {matches ? "MATCH" : chainHash ? "CHAIN WINS" : "LOCAL ONLY"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </DossierCard>
        );
      })}
    </div>
  );
}
