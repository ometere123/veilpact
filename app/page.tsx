
"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { SealButton } from "@/components/ui/SealButton";
import { NetworkBadge } from "@/components/ui/NetworkBadge";
import { HashRibbon } from "@/components/ui/HashRibbon";
import { Shield, Eye, Scale, Lock, AlertTriangle } from "lucide-react";

const HERO_CARD = {
  root: "0x91c7d4b76537b57b9bc36cd01f0dfa5b9b9c7a38...f22a",
  clauses: 12,
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-void-ink text-parchment">
      {/* Top strip */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-bone-border">
        <p className="font-heading text-xl tracking-widest">VEILPACT</p>
        <div className="flex items-center gap-3">
          <NetworkBadge />
          <Link href="/overview">
            <SealButton size="sm">Open App</SealButton>
          </Link>
        </div>
      </div>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-8 py-24 flex flex-col lg:flex-row items-center gap-16">
        <div className="flex-1">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-heading text-6xl lg:text-7xl leading-none text-parchment mb-6"
          >
            PRIVATE AGREEMENTS.<br />
            <span className="text-sealed-gold">PUBLIC FAIRNESS</span><br />
            ONLY WHEN IT MATTERS.
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-muted-parchment text-lg leading-relaxed mb-8 max-w-lg"
          >
            VeilPact lets two parties commit to confidential terms, keep them
            private during normal execution, and reveal only the disputed clause
            if GenLayer needs to resolve a conflict.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex gap-3 flex-wrap"
          >
            <Link href="/new-pact">
              <SealButton size="lg">Create Private Pact</SealButton>
            </Link>
            <Link href="/review">
              <SealButton size="lg" variant="ghost">View Dispute Demo</SealButton>
            </Link>
          </motion.div>
        </div>

        {/* Hero card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, type: "spring" }}
          className="flex-1 max-w-sm w-full border border-sealed-gold/40 bg-obsidian rounded-sm p-6 space-y-4"
        >
          <div className="flex items-center justify-between">
            <p className="font-heading text-lg text-parchment tracking-widest">SEALED AGREEMENT</p>
            <span className="text-xs font-mono border border-verdict-green/30 text-verdict-green px-2 py-0.5 rounded-sm">ACTIVE</span>
          </div>
          <HashRibbon label="Agreement Root" hash={HERO_CARD.root} color="gold" />
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-parchment">
              <span>Visible</span>
              <span>parties, title, status, root</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-parchment">Clauses</span>
              <span className="font-mono text-parchment">{HERO_CARD.clauses} encrypted</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-parchment">Reveal mode</span>
              <span className="font-mono text-verdict-green">dispute-only</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-parchment">GenLayer</span>
              <span className="font-mono text-signal-violet">ready for review</span>
            </div>
          </div>
          <div className="pt-3 border-t border-bone-border">
            <div className="flex flex-col gap-1.5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-5 bg-parchment/80 rounded-[1px] opacity-90" style={{ width: `${60 + i * 10}%` }} />
              ))}
            </div>
            <p className="text-xs text-muted-parchment/50 mt-2 font-mono">████ hidden clause text ████</p>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="border-t border-bone-border py-20">
        <div className="max-w-5xl mx-auto px-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: Lock,
              title: "Why public contracts leak too much",
              body: "Traditional smart contracts expose every term on-chain. Counterparties, competitors, and public observers can read your payment amounts, delivery deadlines, and confidential clauses.",
            },
            {
              icon: Shield,
              title: "How commit/reveal protects terms",
              body: "VeilPact stores only cryptographic commitments on GenLayer. The plaintext stays encrypted locally. Nothing is uploaded. Only the disputed clause is ever revealed.",
            },
            {
              icon: Scale,
              title: "What GenLayer judges",
              body: "When a clause is revealed, GenLayer validators check: Is this clause part of the original agreement? Is the evidence strong enough? What outcome is proportional?",
            },
            {
              icon: Eye,
              title: "Dispute-only disclosure",
              body: "If no dispute arises, the full agreement remains private forever. Only the specific disputed clause — verified by commitment hash — is submitted for GenLayer review.",
            },
            {
              icon: Shield,
              title: "Privacy boundaries",
              body: "VeilPact tracks what has been revealed in an on-chain Privacy Ledger. Overdisclosure warnings prevent parties from revealing more than necessary.",
            },
            {
              icon: AlertTriangle,
              title: "Not legal advice",
              body: "VeilPact is a private agreement coordination and dispute review demo. It is not legal advice and does not replace formal legal contracts, courts, or regulated arbitration.",
              warn: true,
            },
          ].map(({ icon: Icon, title, body, warn }) => (
            <div
              key={title}
              className={`border rounded-sm p-5 bg-obsidian ${warn ? "border-redaction-rose/20" : "border-bone-border"}`}
            >
              <Icon className={`w-5 h-5 mb-3 ${warn ? "text-redaction-rose" : "text-sealed-gold"}`} />
              <h3 className="font-heading text-base tracking-widest text-parchment mb-2">{title.toUpperCase()}</h3>
              <p className="text-sm text-muted-parchment leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-bone-border px-8 py-6 flex items-center justify-between text-xs text-muted-parchment/50">
        <span>VeilPact · GenLayer StudioNet</span>
        <span>Private agreements. Public fairness only when it matters.</span>
      </footer>
    </div>
  );
}
