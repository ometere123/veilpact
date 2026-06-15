
"use client";
import { DossierCard } from "@/components/ui/DossierCard";
import { SealButton } from "@/components/ui/SealButton";

export default function PrivacyLedgerPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl text-parchment tracking-widest">PRIVACY LEDGER</h1>
        <p className="text-sm text-muted-parchment mt-1">A complete record of what VeilPact has revealed.</p>
      </div>
      <DossierCard>
        <p className="text-muted-parchment text-sm">
          On-chain log of every selective reveal, verified against the agreement root.
        </p>
      </DossierCard>
    </div>
  );
}
