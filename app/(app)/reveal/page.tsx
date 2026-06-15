
"use client";
import { DossierCard } from "@/components/ui/DossierCard";
import { SealButton } from "@/components/ui/SealButton";

export default function RevealConsolePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl text-parchment tracking-widest">REVEAL CONSOLE</h1>
        <p className="text-sm text-muted-parchment mt-1">Selectively reveal a clause for a dispute.</p>
      </div>
      <DossierCard>
        <p className="text-muted-parchment text-sm">
          Choose a dispute and reveal only the relevant clause. Other clauses remain private.
        </p>
      </DossierCard>
    </div>
  );
}
