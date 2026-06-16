"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useWalletContext } from "@/contexts/WalletContext";
import { SealButton } from "@/components/ui/SealButton";
import { TimelineEvent } from "@/components/dispute/TimelineEvent";
import { syncUserPactsFromChain, type SyncedPact } from "@/lib/genlayer/sync";
import { formatGEN } from "@/lib/utils/format-gen";

function StatCard({ label, value, color, sub }: { label: string; value: string | number; color?: string; sub?: string }) {
  return (
    <div style={{ border: "1px solid rgba(239,228,208,0.18)", backgroundColor: "#14141C", borderRadius: 2, padding: "16px 20px" }}>
      <p style={{ fontSize: "0.65rem", color: "rgba(239,228,208,0.4)", textTransform: "uppercase", letterSpacing: "0.12em", fontFamily: "IBM Plex Mono, monospace" }}>{label}</p>
      <p style={{ fontSize: "1.75rem", fontFamily: "Bebas Neue, sans-serif", color: color ?? "#EFE4D0", marginTop: 4, letterSpacing: "0.05em" }}>{value}</p>
      {sub && <p style={{ fontSize: "0.65rem", fontFamily: "IBM Plex Mono, monospace", color: "rgba(239,228,208,0.25)", marginTop: 2 }}>{sub}</p>}
    </div>
  );
}

export default function OverviewPage() {
  const { address, connected, connect } = useWalletContext();
  const [pacts, setPacts] = useState<SyncedPact[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);

  const syncFromGenLayer = useCallback(async () => {
    if (!address) return;
    setSyncing(true);
    setSyncError(null);
    try {
      setPacts(await syncUserPactsFromChain(address));
      setLastSyncedAt(Date.now());
    } catch (e: unknown) {
      setSyncError(e instanceof Error ? e.message : "Failed to sync from GenLayer");
    } finally {
      setSyncing(false);
    }
  }, [address]);

  useEffect(() => {
    if (!connected) return;
    void Promise.resolve().then(syncFromGenLayer);
  }, [connected, syncFromGenLayer]);

  if (!connected) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <h1 style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "2rem", letterSpacing: "0.1em", color: "#EFE4D0" }}>OVERVIEW</h1>
        <div style={{ border: "1px solid rgba(201,163,91,0.3)", backgroundColor: "#14141C", borderRadius: 2, padding: 32, textAlign: "center" }}>
          <p style={{ color: "rgba(239,228,208,0.64)", marginBottom: 16 }}>Connect your wallet to see your pact activity.</p>
          <SealButton onClick={connect}>Connect Wallet</SealButton>
        </div>
      </div>
    );
  }

  const chainPacts = pacts.filter(p => p.chain);
  const active = chainPacts.filter(p => p.status === "ACTIVE").length;
  const pending = chainPacts.filter(p => p.status === "PENDING_COUNTERPARTY").length;
  const disputed = chainPacts.filter(p => ["DISPUTED", "UNDER_REVIEW"].includes(p.status)).length;
  const totalClauses = chainPacts.reduce((s, p) => s + (p.clauseCount ?? 0), 0);
  const revealed = chainPacts.reduce((s, p) => s + (p.chain?.revealedCount ?? 0), 0);
  const funded = chainPacts.filter(p => (p.chain?.expectedAmount ?? BigInt(0)) > BigInt(0)).length;
  const locked = chainPacts
    .filter(p => p.chain?.paymentStatus === "LOCKED")
    .reduce((s, p) => s + (p.chain?.fundedAmount ?? BigInt(0)), BigInt(0));
  const claimable = chainPacts.reduce(
    (s, p) => s + (p.chain?.payerClaimable ?? BigInt(0)) + (p.chain?.payeeClaimable ?? BigInt(0)),
    BigInt(0),
  );
  const settlements = chainPacts.filter(p => p.chain?.settlementApplied).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "2rem", letterSpacing: "0.1em", color: "#EFE4D0" }}>OVERVIEW</h1>
          <p style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "0.75rem", color: "rgba(239,228,208,0.35)", marginTop: 4 }}>
            {address}
          </p>
          <p style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "0.65rem", color: "rgba(239,228,208,0.28)", marginTop: 4 }}>
            Last synced from GenLayer: {lastSyncedAt ? new Date(lastSyncedAt).toLocaleTimeString() : "not synced"}
          </p>
        </div>
        <SealButton size="sm" variant="outline" loading={syncing} onClick={syncFromGenLayer}>Sync from GenLayer</SealButton>
      </div>

      {syncError && (
        <div style={{ border: "1px solid rgba(201,163,91,0.3)", backgroundColor: "rgba(201,163,91,0.05)", borderRadius: 2, padding: 12 }}>
          <p style={{ color: "#C9A35B", fontSize: "0.8rem" }}>Could not refresh from GenLayer. {syncError}</p>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        <StatCard label="Active Pacts" value={active} color="#6E9F7E" />
        <StatCard label="Pending Acceptance" value={pending} color="#C9A35B" />
        <StatCard label="Open Disputes" value={disputed} color={disputed > 0 ? "#B85C70" : "#EFE4D0"} />
        <StatCard label="On-chain Pacts" value={chainPacts.length} />
        <StatCard label="Private Clauses" value={totalClauses} color="#7D5FFF" />
        <StatCard label="Clauses Revealed" value={revealed} />
      </div>

      <div>
        <p style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "1rem", letterSpacing: "0.1em", color: "rgba(239,228,208,0.4)", marginBottom: 10 }}>
          GEN-BACKED SETTLEMENT
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          <StatCard label="Funded Pacts" value={funded} color="#C9A35B" sub="from GenLayer" />
          <StatCard label="Locked GEN" value={`${formatGEN(locked)} GEN`} color="#7D5FFF" />
          <StatCard label="Claimable GEN" value={`${formatGEN(claimable)} GEN`} color="#6E9F7E" />
          <StatCard label="Settlements Applied" value={settlements} color="#B85C70" />
        </div>
      </div>

      <div style={{ border: "1px solid rgba(239,228,208,0.18)", backgroundColor: "#14141C", borderRadius: 2, padding: 20 }}>
        <p style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "1rem", letterSpacing: "0.1em", color: "#EFE4D0", marginBottom: 16 }}>
          PRIVATE PACT ACTIVITY
        </p>
        {pacts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <p style={{ color: "rgba(239,228,208,0.4)", fontSize: "0.875rem", marginBottom: 16 }}>No pacts found for this wallet.</p>
            <Link href="/new-pact"><SealButton size="sm">Create Your First Pact</SealButton></Link>
          </div>
        ) : (
          pacts.map((p, i) => (
            <TimelineEvent
              key={`${p.availability}-${p.pactId ?? p.local?.id ?? p.agreementRoot}`}
              type="PACT_CREATED"
              label={p.availability === "chain-only" ? "CHAIN_PACT_FOUND" : "PACT_CREATED"}
              description={[p.title, `${p.clauseCount} clauses`, p.status, p.chain?.paymentStatus ?? "no payment"].join(" - ")}
              timestamp={Math.floor(p.createdAt / 1000)}
              last={i === pacts.length - 1}
            />
          ))
        )}
      </div>
    </div>
  );
}
