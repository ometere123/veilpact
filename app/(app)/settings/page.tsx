
"use client";
import { DossierCard } from "@/components/ui/DossierCard";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl text-parchment tracking-widest">SETTINGS</h1>
        <p className="text-sm text-muted-parchment mt-1">Local preferences and data management.</p>
      </div>
      <DossierCard>
        <p className="text-muted-parchment text-sm">
          Configure default pact privacy, evidence reminders, and local data management.
        </p>
      </DossierCard>
    </div>
  );
}
