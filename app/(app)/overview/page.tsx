
"use client";
import { DossierCard } from "@/components/ui/DossierCard";
import { SealButton } from "@/components/ui/SealButton";

export default function OverviewPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl text-parchment tracking-widest">OVERVIEW</h1>
        <p className="text-sm text-muted-parchment mt-1">Your private pact activity dashboard.</p>
      </div>
      <DossierCard>
        <p className="text-muted-parchment text-sm">
          Connect your wallet to see active pacts, open disputes, and recent GenLayer verdicts.
        </p>
      </DossierCard>
    </div>
  );
}
