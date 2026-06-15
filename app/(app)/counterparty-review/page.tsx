
"use client";
import { DossierCard } from "@/components/ui/DossierCard";
import { SealButton } from "@/components/ui/SealButton";

export default function CounterpartyReviewPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl text-parchment tracking-widest">COUNTERPARTY REVIEW</h1>
        <p className="text-sm text-muted-parchment mt-1">Review and accept a pact invitation.</p>
      </div>
      <DossierCard>
        <p className="text-muted-parchment text-sm">
          Connect your wallet to review the commitment package and accept or reject the pact.
        </p>
      </DossierCard>
    </div>
  );
}
