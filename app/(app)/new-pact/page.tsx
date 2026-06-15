
"use client";

import { useState } from "react";
import { DossierCard } from "@/components/ui/DossierCard";
import { SealButton } from "@/components/ui/SealButton";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

const STEPS = [
  { id: 1, label: "Basics",          description: "Title, parties, and category" },
  { id: 2, label: "Clauses",         description: "Add and edit agreement clauses" },
  { id: 3, label: "Privacy",         description: "Set reveal sensitivity per clause" },
  { id: 4, label: "Commitments",     description: "Generate clause commitments and root" },
  { id: 5, label: "Encrypt",         description: "Encrypt and download your pact package" },
  { id: 6, label: "Submit",          description: "Write commitment root to GenLayer" },
];

export default function NewPactPage() {
  const [step, setStep] = useState(1);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-heading text-3xl text-parchment tracking-widest">NEW PRIVATE PACT</h1>
        <p className="text-sm text-muted-parchment mt-1">
          Draft terms privately. Commitments go on GenLayer. Plaintext stays local.
        </p>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-0">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center flex-1">
            <button
              onClick={() => setStep(s.id)}
              className={cn(
                "w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-mono transition-all flex-shrink-0",
                s.id < step  ? "border-sealed-gold bg-sealed-gold text-void-ink" :
                s.id === step ? "border-sealed-gold text-sealed-gold bg-sealed-gold/10" :
                "border-bone-border text-muted-parchment",
              )}
            >
              {s.id < step ? <Check className="w-3 h-3" /> : s.id}
            </button>
            {i < STEPS.length - 1 && (
              <div className={cn("flex-1 h-px", s.id < step ? "bg-sealed-gold/40" : "bg-bone-border")} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <DossierCard>
        <p className="font-heading text-xl text-parchment tracking-widest mb-1">
          STEP {step} — {STEPS[step - 1].label.toUpperCase()}
        </p>
        <p className="text-sm text-muted-parchment mb-6">{STEPS[step - 1].description}</p>
        <div className="h-48 flex items-center justify-center border border-bone-border rounded-sm text-muted-parchment text-sm">
          Step {step} UI — built in Phase 3
        </div>
      </DossierCard>

      {/* Navigation */}
      <div className="flex justify-between">
        <SealButton
          variant="ghost"
          disabled={step === 1}
          onClick={() => setStep(s => Math.max(1, s - 1))}
        >
          Back
        </SealButton>
        <SealButton
          onClick={() => setStep(s => Math.min(STEPS.length, s + 1))}
          disabled={step === STEPS.length}
        >
          {step === STEPS.length ? "Submit to GenLayer" : "Continue"}
        </SealButton>
      </div>
    </div>
  );
}
