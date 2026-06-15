"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useWalletContext } from "@/contexts/WalletContext";
import { SealButton }       from "@/components/ui/SealButton";
import { getAllPacts }       from "@/lib/storage/indexeddb";
import type { StoredPact }  from "@/lib/storage/indexeddb";
import { PAYMENT_STATUS_LABEL } from "@/lib/constants";
import { Coins, Lock, CheckCircle } from "lucide-react";

const STATUS_COLOR: Record<string, string> = {
  ACTIVE:               "#6E9F7E",
  PENDING_COUNTERPARTY: "#C9A35B",
  DISPUTED:             "#B85C70",
  UNDER_REVIEW:         "#7D5FFF",
  CLOSED:               "rgba(239,228,208,0.3)",
  COMMITTING:           "rgba(239,228,208,0.5)",
};

function PactCard({ pact, address }: { pact: StoredPact; address: string }) {
  const col = STATUS_COLOR[pact.status] ?? "rgba(239,228,208,0.5)";
  const pay = pact.payment;
  const hasPayment = pay?.enabled && BigInt(pay.expectedAmount || "0") > BigInt(0);

  const isPayer = hasPayment && pay?.payer?.toLowerCase() === address.toLowerCase();
  const isPayee = hasPayment && pay?.payee?.toLowerCase() === address.toLowerCase();

  return (
    <div style={{ border: "1px solid rgba(239,228,208,0.14)", backgroundColor: "#14141C", borderRadius: 2, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p style={{ fontFamily: "Bebas Neue, sans-serif", letterSpacing: "0.08em", color: "#EFE4D0", fontSize: "1rem" }}>
            {pact.title || "(untitled)"}
          </p>
          <p style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "0.65rem", color: "rgba(239,228,208,0.35)", marginTop: 2 }}>
            {pact.clauseCount} clause{pact.clauseCount !== 1 ? "s" : ""} · {pact.partyB ? `with ${pact.partyB.slice(0,10)}…` : ""}
          </p>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
          {hasPayment && (
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontFamily: "IBM Plex Mono, monospace", fontSize: "0.6rem", border: "1px solid rgba(201,163,91,0.3)", color: "#C9A35B", borderRadius: 2, padding: "2px 6px" }}>
              <Coins size={9} />
              {isPayer ? "PAYER" : isPayee ? "PAYEE" : "GEN"}
            </span>
          )}
          <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "0.6rem", border: `1px solid ${col}40`, color: col, borderRadius: 2, padding: "2px 6px" }}>
            {pact.status}
          </span>
        </div>
      </div>

      {hasPayment && pay && (
        <div style={{ display: "flex", gap: 12, borderTop: "1px solid rgba(239,228,208,0.08)", paddingTop: 8 }}>
          <div>
            <p style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "0.58rem", color: "rgba(239,228,208,0.3)", textTransform: "uppercase" }}>Expected</p>
            <p style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "0.7rem", color: "#C9A35B" }}>{pay.expectedAmount}</p>
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 4 }}>
        <p style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "0.6rem", color: "rgba(239,228,208,0.25)" }}>
          {new Date(pact.createdAt).toLocaleDateString()}
        </p>
        {pact.onChainId ? (
          <Link href={`/pacts/${pact.onChainId}`} style={{ textDecoration: "none" }}>
            <SealButton size="sm" variant="ghost">View →</SealButton>
          </Link>
        ) : (
          <p style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "0.6rem", color: "rgba(239,228,208,0.25)" }}>no chain ID yet</p>
        )}
      </div>
    </div>
  );
}

export default function MyPactsPage() {
  const { address, connected, connect } = useWalletContext();
  const [pacts, setPacts] = useState<StoredPact[]>([]);

  useEffect(() => {
    if (connected) getAllPacts().then(p => setPacts([...p].sort((a, b) => b.createdAt - a.createdAt))).catch(() => {});
  }, [connected]);

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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "2rem", letterSpacing: "0.1em", color: "#EFE4D0" }}>MY PACTS</h1>
          <p style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "0.75rem", color: "rgba(239,228,208,0.35)", marginTop: 4 }}>
            {pacts.length} pact{pacts.length !== 1 ? "s" : ""} stored locally
          </p>
        </div>
        <Link href="/new-pact" style={{ textDecoration: "none" }}>
          <SealButton size="sm">+ New Pact</SealButton>
        </Link>
      </div>

      {pacts.length === 0 ? (
        <div style={{ border: "1px solid rgba(239,228,208,0.18)", backgroundColor: "#14141C", borderRadius: 2, padding: 32, textAlign: "center" }}>
          <p style={{ color: "rgba(239,228,208,0.4)", marginBottom: 16 }}>No pacts yet.</p>
          <Link href="/new-pact"><SealButton>Create Your First Pact</SealButton></Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {pacts.map(p => <PactCard key={p.id} pact={p} address={address ?? ""} />)}
        </div>
      )}
    </div>
  );
}
