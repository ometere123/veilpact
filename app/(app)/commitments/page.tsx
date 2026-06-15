
"use client";
import { DossierCard } from "@/components/ui/DossierCard";
import { SealButton } from "@/components/ui/SealButton";

export default function CommitmentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl text-parchment tracking-widest">COMMITMENTS</h1>
        <p className="text-sm text-muted-parchment mt-1">Clause commitment fingerprints and agreement roots.</p>
      </div>
      <DossierCard>
        <p className="text-muted-parchment text-sm">
          Cryptographic commitments for all your active pacts.
        </p>
      </DossierCard>
    </div>
  );
}
