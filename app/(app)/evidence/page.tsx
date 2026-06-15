
"use client";
import { DossierCard } from "@/components/ui/DossierCard";
import { SealButton } from "@/components/ui/SealButton";

export default function EvidenceRoomPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl text-parchment tracking-widest">EVIDENCE ROOM</h1>
        <p className="text-sm text-muted-parchment mt-1">Manage evidence items for disputes.</p>
      </div>
      <DossierCard>
        <p className="text-muted-parchment text-sm">
          Evidence summaries, hashes, and references for active disputes.
        </p>
      </DossierCard>
    </div>
  );
}
