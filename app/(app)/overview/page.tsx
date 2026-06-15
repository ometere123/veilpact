"use client";

import { useWalletContext } from "@/contexts/WalletContext";
import { SealButton }       from "@/components/ui/SealButton";
import { TimelineEvent }    from "@/components/dispute/TimelineEvent";
import { getAllPacts }       from "@/lib/storage/indexeddb";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { StoredPact } from "@/lib/storage/indexeddb";
import { PAYMENT_STATUS_LABEL } from "@/lib/constants";

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
  const [pacts, setPacts] = useState<StoredPact[]>([]);

  useEffect(() => {
    if (connected) getAllPacts().then(setPacts).catch(() => {});
  }, [connected]);

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

  const active       = pacts.filter(p => p.status === "ACTIVE").length;
  const pending      = pacts.filter(p => p.status === "PENDING_COUNTERPARTY").length;
  const disputed     = pacts.filter(p => ["DISPUTED","UNDER_REVIEW"].includes(p.status)).length;
  const totalClauses = pacts.reduce((s, p) => s + (p.clauseCount ?? 0), 0);

  // Payment stats from local storage (indicative — authoritative source is the contract)
  const funded   = pacts.filter(p => p.payment?.enabled && BigInt(p.payment.expectedAmount || "0") > BigInt(0)).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h1 style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "2rem", letterSpacing: "0.1em", color: "#EFE4D0" }}>OVERVIEW</h1>
        <p style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "0.75rem", color: "rgba(239,228,208,0.35)", marginTop: 4 }}>
          {address}
        </p>
      </div>

      {/* Core stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        <StatCard label="Active Pacts"       value={active}       color="#6E9F7E" />
        <StatCard label="Pending Acceptance" value={pending}      color="#C9A35B" />
        <StatCard label="Open Disputes"      value={disputed}     color={disputed > 0 ? "#B85C70" : "#EFE4D0"} />
        <StatCard label="Total Local Pacts"  value={pacts.length} />
        <StatCard label="Private Clauses"    value={totalClauses} color="#7D5FFF" />
        <StatCard label="Clauses Revealed"   value={0} />
      </div>

      {/* Payment stats */}
      <div>
        <p style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "1rem", letterSpacing: "0.1em", color: "rgba(239,228,208,0.4)", marginBottom: 10 }}>
          GEN-BACKED SETTLEMENT
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          <StatCard label="Funded Pacts"    value={funded}   color="#C9A35B" sub="with payment enabled" />
          <StatCard label="Locked GEN"      value="—"        color="#7D5FFF" sub="query chain for live data" />
          <StatCard label="Claimable GEN"   value="—"        color="#6E9F7E" sub="query chain for live data" />
          <StatCard label="Open Settlements" value="—"       color="#B85C70" sub="query chain for live data" />
        </div>
      </div>

      {/* Activity feed */}
      <div style={{ border: "1px solid rgba(239,228,208,0.18)", backgroundColor: "#14141C", borderRadius: 2, padding: 20 }}>
        <p style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "1rem", letterSpacing: "0.1em", color: "#EFE4D0", marginBottom: 16 }}>
          PRIVATE PACT ACTIVITY
        </p>
        {pacts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <p style={{ color: "rgba(239,228,208,0.4)", fontSize: "0.875rem", marginBottom: 16 }}>No pacts yet.</p>
            <Link href="/new-pact"><SealButton size="sm">Create Your First Pact</SealButton></Link>
          </div>
        ) : (
          pacts.map((p, i) => (
            <TimelineEvent
              key={p.id}
              type="PACT_CREATED"
              label="PACT_CREATED"
              description={[
                p.title,
                `${p.clauseCount} clauses`,
                p.status,
                p.payment?.enabled ? `GEN ${p.payment.expectedAmount}` : "no settlement",
              ].join(" · ")}
              timestamp={Math.floor(p.createdAt / 1000)}
              last={i === pacts.length - 1}
            />
          ))
        )}
      </div>
    </div>
  );
}
