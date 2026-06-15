
"use client";
import { DossierCard } from "@/components/ui/DossierCard";
import { SealButton } from "@/components/ui/SealButton";

export default function MyPactsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl text-parchment tracking-widest">MY PACTS</h1>
        <p className="text-sm text-muted-parchment mt-1">All your private agreements grouped by status.</p>
      </div>
      <DossierCard>
        <p className="text-muted-parchment text-sm">
          Your pacts will appear here once you connect your wallet and create or receive pacts.
        </p>
      </DossierCard>
    </div>
  );
}
