"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Coins, RefreshCw } from "lucide-react";
import { useWalletContext } from "@/contexts/WalletContext";
import { SealButton } from "@/components/ui/SealButton";
import { syncUserPactsFromChain, type SyncedPact } from "@/lib/genlayer/sync";
import { formatGEN } from "@/lib/utils/format-gen";

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: "#6E9F7E",
  PENDING_COUNTERPARTY: "#C9A35B",
  DISPUTED: "#B85C70",
  UNDER_REVIEW: "#7D5FFF",
  RESOLVED_SETTLE: "#7D5FFF",
  CLOSED: "rgba(239,228,208,0.3)",
  COMMITTING: "rgba(239,228,208,0.5)",
  LOCAL_ONLY: "rgba(239,228,208,0.5)",
};

function syncedAtLabel(value: number | null): string {
  if (!value) return "not synced";
  return new Date(value).toLocaleTimeString();
}

function roleLabel(item: SyncedPact, address: string): string {
  const lower = address.toLowerCase();
  const payer = item.chain?.payer?.toLowerCase() ?? item.local?.payment?.payer?.toLowerCase();
  const payee = item.chain?.payee?.toLowerCase() ?? item.local?.payment?.payee?.toLowerCase();
  if (payer && payer === lower) return "PAYER";
  if (payee && payee === lower) return "PAYEE";
  if (item.partyA.toLowerCase() === lower) return "PARTY A";
  if (item.partyB.toLowerCase() === lower) return "PARTY B";
  return "GEN";
}

function PactCard({ item, address }: { item: SyncedPact; address: string }) {
  const col = STATUS_COLOR[item.status] ?? "rgba(239,228,208,0.5)";
  const hasPayment = (item.chain?.expectedAmount ?? BigInt(item.local?.payment?.expectedAmount ?? "0")) > BigInt(0);
  const paymentAmount = item.chain?.expectedAmount ?? BigInt(item.local?.payment?.expectedAmount ?? "0");

  return (
    <div style={{ border: "1px solid rgba(239,228,208,0.14)", backgroundColor: "#14141C", borderRadius: 2, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p style={{ fontFamily: "Bebas Neue, sans-serif", letterSpacing: "0.08em", color: "#EFE4D0", fontSize: "1rem" }}>
            {item.title}
          </p>
          <p style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "0.65rem", color: "rgba(239,228,208,0.35)", marginTop: 2 }}>
            {item.clauseCount} clause{item.clauseCount !== 1 ? "s" : ""} - {item.partyB ? `with ${item.partyB.slice(0, 10)}...` : "no counterparty"}
          </p>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
          {hasPayment && (
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontFamily: "IBM Plex Mono, monospace", fontSize: "0.6rem", border: "1px solid rgba(201,163,91,0.3)", color: "#C9A35B", borderRadius: 2, padding: "2px 6px" }}>
              <Coins size={9} />
              {roleLabel(item, address)}
            </span>
          )}
          <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "0.6rem", border: `1px solid ${col}40`, color: col, borderRadius: 2, padding: "2px 6px" }}>
            {item.status}
          </span>
        </div>
      </div>

      {item.availability === "chain-only" && (
        <div style={{ border: "1px solid rgba(201,163,91,0.25)", backgroundColor: "rgba(201,163,91,0.05)", borderRadius: 2, padding: 10, display: "flex", gap: 8 }}>
          <AlertTriangle size={14} style={{ color: "#C9A35B", flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: "0.75rem", color: "#C9A35B", lineHeight: 1.5 }}>
            This pact exists on GenLayer, but the encrypted local package is not available in this browser.
            Import your .veilpact backup or reopen the original share link to enable selective reveal.
          </p>
          <Link href="/settings" style={{ marginLeft: "auto", flexShrink: 0, textDecoration: "none" }}>
            <SealButton size="sm" variant="ghost">Restore</SealButton>
          </Link>
        </div>
      )}

      {item.availability === "local-only" && (
        <div style={{ border: "1px solid rgba(239,228,208,0.12)", backgroundColor: "rgba(239,228,208,0.03)", borderRadius: 2, padding: 10 }}>
          <p style={{ fontSize: "0.75rem", color: "rgba(239,228,208,0.55)" }}>
            Local draft/cache only. Not committed to GenLayer yet.
          </p>
        </div>
      )}

      {hasPayment && (
        <div style={{ display: "flex", gap: 12, borderTop: "1px solid rgba(239,228,208,0.08)", paddingTop: 8 }}>
          <div>
            <p style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "0.58rem", color: "rgba(239,228,208,0.3)", textTransform: "uppercase" }}>Expected</p>
            <p style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "0.7rem", color: "#C9A35B" }}>{formatGEN(paymentAmount)} GEN</p>
          </div>
          {item.chain?.paymentStatus && (
            <div>
              <p style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "0.58rem", color: "rgba(239,228,208,0.3)", textTransform: "uppercase" }}>Payment</p>
              <p style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "0.7rem", color: "#C9A35B" }}>{item.chain.paymentStatus}</p>
            </div>
          )}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 4 }}>
        <p style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "0.6rem", color: "rgba(239,228,208,0.25)" }}>
          Last synced from GenLayer: {syncedAtLabel(item.lastSyncedAt)}
        </p>
        {item.pactId ? (
          <Link href={`/pacts/${item.pactId}`} style={{ textDecoration: "none" }}>
            <SealButton size="sm" variant="ghost">View -&gt;</SealButton>
          </Link>
        ) : (
          <Link href="/new-pact" style={{ textDecoration: "none" }}>
            <SealButton size="sm" variant="ghost">Continue Draft</SealButton>
          </Link>
        )}
      </div>
    </div>
  );
}

function Section({ title, items, address }: { title: string; items: SyncedPact[]; address: string }) {
  if (items.length === 0) return null;
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <p style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "0.7rem", color: "rgba(239,228,208,0.38)", textTransform: "uppercase", letterSpacing: "0.12em" }}>
        {title} ({items.length})
      </p>
      {items.map(item => (
        <PactCard key={`${item.availability}-${item.pactId ?? item.local?.id ?? item.agreementRoot}`} item={item} address={address} />
      ))}
    </section>
  );
}

export default function MyPactsPage() {
  const { address, connected, connect } = useWalletContext();
  const [pacts, setPacts] = useState<SyncedPact[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const syncFromGenLayer = useCallback(async () => {
    if (!address) return;
    setSyncing(true);
    setSyncError(null);
    try {
      setPacts(await syncUserPactsFromChain(address));
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
        <h1 style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "2rem", letterSpacing: "0.1em", color: "#EFE4D0" }}>MY PACTS</h1>
        <div style={{ border: "1px solid rgba(201,163,91,0.3)", backgroundColor: "#14141C", borderRadius: 2, padding: 32, textAlign: "center" }}>
          <p style={{ color: "rgba(239,228,208,0.64)", marginBottom: 16 }}>Connect your wallet to see your pacts.</p>
          <SealButton onClick={connect}>Connect Wallet</SealButton>
        </div>
      </div>
    );
  }

  const full = pacts.filter(p => p.availability === "fully-available");
  const chainOnly = pacts.filter(p => p.availability === "chain-only");
  const localOnly = pacts.filter(p => p.availability === "local-only");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "2rem", letterSpacing: "0.1em", color: "#EFE4D0" }}>MY PACTS</h1>
          <p style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "0.75rem", color: "rgba(239,228,208,0.35)", marginTop: 4 }}>
            GenLayer is the source of truth. IndexedDB stores private encrypted packages.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <SealButton size="sm" variant="outline" loading={syncing} onClick={syncFromGenLayer}>
            <RefreshCw size={12} /> Sync from GenLayer
          </SealButton>
          <Link href="/new-pact" style={{ textDecoration: "none" }}>
            <SealButton size="sm">+ New Pact</SealButton>
          </Link>
        </div>
      </div>

      {syncError && (
        <div style={{ border: "1px solid rgba(201,163,91,0.3)", backgroundColor: "rgba(201,163,91,0.05)", borderRadius: 2, padding: 12 }}>
          <p style={{ color: "#C9A35B", fontSize: "0.8rem" }}>
            Could not refresh from GenLayer. Showing local cache where available. {syncError}
          </p>
        </div>
      )}

      {pacts.length === 0 ? (
        <div style={{ border: "1px solid rgba(239,228,208,0.18)", backgroundColor: "#14141C", borderRadius: 2, padding: 32, textAlign: "center" }}>
          <p style={{ color: "rgba(239,228,208,0.4)", marginBottom: 16 }}>No pacts found for this wallet.</p>
          <Link href="/new-pact"><SealButton>Create Your First Pact</SealButton></Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <Section title="Fully available pacts" items={full} address={address ?? ""} />
          <Section title="On-chain only pacts" items={chainOnly} address={address ?? ""} />
          <Section title="Local draft/cache only" items={localOnly} address={address ?? ""} />
        </div>
      )}
    </div>
  );
}
