"use client";

import Link from "next/link";
import { SealButton } from "@/components/ui/SealButton";
import { NetworkBadge } from "@/components/ui/NetworkBadge";
import { HashRibbon } from "@/components/ui/HashRibbon";
import { Shield, Eye, Scale, Lock, AlertTriangle } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0B0B10", color: "#EFE4D0" }}>
      <div className="flex items-center justify-between px-8 py-4" style={{ borderBottom: "1px solid rgba(239,228,208,0.18)" }}>
        <p style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "1.25rem", letterSpacing: "0.15em", color: "#EFE4D0" }}>VEILPACT</p>
        <div className="flex items-center gap-3">
          <NetworkBadge />
          <Link href="/overview"><SealButton size="sm">Open App</SealButton></Link>
        </div>
      </div>

      <section className="max-w-5xl mx-auto px-8 py-20 flex flex-col lg:flex-row items-center gap-16">
        <div className="flex-1">
          <p style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "clamp(3rem,7vw,5rem)", lineHeight: 1, color: "#EFE4D0", marginBottom: "1.5rem" }}>
            PRIVATE BY DEFAULT.<br/>
            <span style={{ color: "#C9A35B" }}>SELECTIVE REVEAL</span><br/>
            WHEN TRUST BREAKS.
          </p>
          <p style={{ color: "rgba(239,228,208,0.64)", fontSize: "1.1rem", lineHeight: 1.6, marginBottom: "2rem", maxWidth: "28rem" }}>
            VeilPact is a private clause-level pact settlement protocol: commit terms on GenLayer,
            keep plaintext client-side, and reveal only the disputed clause when settlement review is needed.
          </p>
          <div className="flex gap-3 flex-wrap">
            <Link href="/new-pact"><SealButton size="lg">Create Private Pact</SealButton></Link>
            <Link href="/review"><SealButton size="lg" variant="ghost">View Dispute Demo</SealButton></Link>
          </div>
        </div>

        <div className="flex-1 max-w-sm w-full rounded-sm p-6" style={{ border: "1px solid rgba(201,163,91,0.4)", backgroundColor: "#14141C" }}>
          <div className="flex items-center justify-between mb-4">
            <span style={{ fontFamily: "Bebas Neue, sans-serif", letterSpacing: "0.1em", color: "#EFE4D0" }}>SEALED AGREEMENT</span>
            <span className="font-mono text-xs px-2 py-0.5 rounded-sm" style={{ border: "1px solid rgba(110,159,126,0.3)", color: "#6E9F7E" }}>ACTIVE</span>
          </div>
          <HashRibbon label="Agreement Root" hash="0x91c7d4b76537b57b9bc36cd01f0dfa5b9b9c7a38f22a" color="gold" />
          <div className="mt-4 space-y-2 text-xs">
            {[["Visible","parties, title, status, root"],["Clauses","12 encrypted"],["Reveal mode","dispute-only"],["GenLayer","ready for review"]].map(([k,v]) => (
              <div key={k} className="flex justify-between">
                <span style={{ color: "rgba(239,228,208,0.64)" }}>{k}</span>
                <span className="font-mono" style={{ color: k==="GenLayer" ? "#7D5FFF" : k==="Reveal mode" ? "#6E9F7E" : "#EFE4D0" }}>{v}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(239,228,208,0.18)" }}>
            {[80,90,70,60].map((w,i) => <div key={i} className="h-4 rounded-sm mb-1.5" style={{ width: w+"%", backgroundColor: "rgba(239,228,208,0.85)" }} />)}
            <p className="font-mono text-xs mt-2" style={{ color: "rgba(239,228,208,0.25)" }}>---- hidden clause text ----</p>
          </div>
        </div>
      </section>

      <section className="py-20" style={{ borderTop: "1px solid rgba(239,228,208,0.18)" }}>
        <div className="max-w-5xl mx-auto px-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            { icon: Lock,          title: "WHY PUBLIC CONTRACTS LEAK TOO MUCH",  body: "Traditional smart contracts expose every term on-chain. Counterparties and competitors can read your payment amounts, deadlines, and confidential clauses.", warn: false },
            { icon: Shield,        title: "HOW COMMIT/REVEAL PROTECTS TERMS",    body: "VeilPact stores only cryptographic commitments on GenLayer. The plaintext stays encrypted locally. Nothing is uploaded. Only the disputed clause is ever revealed.", warn: false },
            { icon: Scale,         title: "WHAT GENLAYER JUDGES",                body: "When a clause is revealed, validators check: Is this clause part of the original agreement? Is the evidence strong enough? What outcome is proportional?", warn: false },
            { icon: Eye,           title: "DISPUTE-ONLY DISCLOSURE",             body: "If no dispute arises, the full agreement remains private forever. Only the specific disputed clause, verified by hash, is submitted for GenLayer review.", warn: false },
            { icon: Shield,        title: "PRIVACY BOUNDARIES",                  body: "VeilPact tracks what has been revealed in an on-chain Privacy Ledger. Overdisclosure warnings prevent parties from revealing more than necessary.", warn: false },
            { icon: AlertTriangle, title: "NOT LEGAL ADVICE",                    body: "VeilPact is a private clause-level pact settlement demo. It is not legal advice and does not replace formal legal contracts, courts, or regulated arbitration.", warn: true },
          ].map(({ icon: Icon, title, body, warn }) => (
            <div key={title} className="rounded-sm p-5" style={{ border: warn ? "1px solid rgba(184,92,112,0.25)" : "1px solid rgba(239,228,208,0.18)", backgroundColor: "#14141C" }}>
              <Icon className="w-5 h-5 mb-3" style={{ color: warn ? "#B85C70" : "#C9A35B" }} />
              <h3 className="text-sm mb-2" style={{ fontFamily: "Bebas Neue, sans-serif", letterSpacing: "0.08em", color: "#EFE4D0" }}>{title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "rgba(239,228,208,0.64)" }}>{body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="px-8 py-6 flex justify-between text-xs" style={{ borderTop: "1px solid rgba(239,228,208,0.18)", color: "rgba(239,228,208,0.3)" }}>
        <span>VeilPact · GenLayer StudioNet</span>
        <span>Private by default. Selective reveal only when trust breaks.</span>
      </footer>
    </div>
  );
}
