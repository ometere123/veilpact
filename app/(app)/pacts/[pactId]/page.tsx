
"use client";

import { use } from "react";
import { DossierCard } from "@/components/ui/DossierCard";
import { HashRibbon } from "@/components/ui/HashRibbon";
import { ClauseCard } from "@/components/pact/ClauseCard";
import { TimelineEvent } from "@/components/dispute/TimelineEvent";
import { PrivacyMeter } from "@/components/privacy/PrivacyMeter";
import { cn } from "@/lib/utils";

const TABS = ["Summary", "Clauses", "Commitments", "Evidence", "Disputes", "Timeline", "Privacy"];

const DEMO_CLAUSES = [
  { title: "Payment Terms",    type: "PAYMENT",    sensitivity: "HIGH",   commitment: "0xabc123" },
  { title: "Delivery Scope",   type: "DELIVERY",   sensitivity: "MEDIUM", commitment: "0xdef456" },
  { title: "Timeline",         type: "TIMELINE",   sensitivity: "LOW",    commitment: "0x789abc" },
  { title: "Cancellation",     type: "CANCELLATION",sensitivity: "HIGH",  commitment: "0x012def" },
];

export default function PactDetailPage({ params }: { params: Promise<{ pactId: string }> }) {
  const { pactId } = use(params);
  const [tab, setTab] = (function() {
    const { useState } = require("react");
    return useState("Summary");
  })();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-heading text-3xl text-parchment tracking-widest">PACT #{pactId}</h1>
          <p className="text-sm text-muted-parchment mt-1">Website Delivery Agreement</p>
        </div>
        <span className="border border-verdict-green/30 text-verdict-green text-xs font-mono px-2.5 py-1 rounded-sm">ACTIVE</span>
      </div>

      <HashRibbon label="Agreement Root" hash="0x91c7d4b76537b57b9bc36cd01f0dfa5b9b9c7a38f22a" color="gold" />

      {/* Tabs */}
      <div className="flex gap-0 border-b border-bone-border">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-2.5 text-xs font-mono uppercase tracking-widest transition-colors border-b-2 -mb-px",
              tab === t
                ? "border-sealed-gold text-parchment"
                : "border-transparent text-muted-parchment hover:text-parchment",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Summary" && (
        <div className="grid grid-cols-2 gap-4">
          <DossierCard><p className="text-xs text-muted-parchment">Party A</p><p className="font-mono text-sm text-parchment mt-1">0xA21...88F</p></DossierCard>
          <DossierCard><p className="text-xs text-muted-parchment">Party B</p><p className="font-mono text-sm text-parchment mt-1">0xB34...92C</p></DossierCard>
          <DossierCard><p className="text-xs text-muted-parchment">Clauses</p><p className="font-mono text-sm text-parchment mt-1">4 total</p></DossierCard>
          <DossierCard><p className="text-xs text-muted-parchment">Revealed</p><p className="font-mono text-sm text-parchment mt-1">0</p></DossierCard>
        </div>
      )}

      {tab === "Clauses" && (
        <div className="space-y-3">
          {DEMO_CLAUSES.map((c, i) => (
            <ClauseCard key={i} index={i} {...c} />
          ))}
        </div>
      )}

      {tab === "Privacy" && (
        <DossierCard>
          <PrivacyMeter total={4} revealed={0} />
        </DossierCard>
      )}

      {tab === "Timeline" && (
        <DossierCard>
          <div className="space-y-0">
            <TimelineEvent type="PACT_CREATED" label="PACT_CREATED" description="Commitment root stored on GenLayer" timestamp="2026-06-01 10:00" />
            <TimelineEvent type="COUNTERPARTY_ACCEPTED" label="COUNTERPARTY_ACCEPTED" description="Root acknowledged by counterparty" timestamp="2026-06-02 14:30" last />
          </div>
        </DossierCard>
      )}

      {(tab === "Commitments" || tab === "Evidence" || tab === "Disputes") && (
        <DossierCard>
          <p className="text-muted-parchment text-sm">Built in later phases.</p>
        </DossierCard>
      )}
    </div>
  );
}
