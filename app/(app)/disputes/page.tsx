
"use client";
import { DossierCard } from "@/components/ui/DossierCard";
import { SealButton } from "@/components/ui/SealButton";

export default function DisputeCenterPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl text-parchment tracking-widest">DISPUTE CENTER</h1>
        <p className="text-sm text-muted-parchment mt-1">Open, respond to, and track disputes.</p>
      </div>
      <DossierCard>
        <p className="text-muted-parchment text-sm">
          Open disputes are listed here. Use the Reveal Console to submit clause evidence.
        </p>
      </DossierCard>
    </div>
  );
}
