
"use client";
import { DossierCard } from "@/components/ui/DossierCard";
import { SealButton } from "@/components/ui/SealButton";

export default function GenLayerReviewPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl text-parchment tracking-widest">GENLAYER REVIEW</h1>
        <p className="text-sm text-muted-parchment mt-1">Track GenLayer validator review progress and view verdicts.</p>
      </div>
      <DossierCard>
        <p className="text-muted-parchment text-sm">
          Structured verdict cards from GenLayer validators will appear here.
        </p>
      </DossierCard>
    </div>
  );
}
