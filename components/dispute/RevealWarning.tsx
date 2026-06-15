import { AlertTriangle, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

type Risk = "LOW" | "MEDIUM" | "HIGH";

interface RevealWarningProps {
  risk?: Risk;
  message?: string;
  className?: string;
}

const riskConfig: Record<Risk, { color: string; icon: typeof AlertTriangle }> = {
  LOW:    { color: "border-verdict-green/30 bg-verdict-green/5 text-verdict-green", icon: ShieldAlert },
  MEDIUM: { color: "border-sealed-gold/30 bg-sealed-gold/5 text-sealed-gold", icon: AlertTriangle },
  HIGH:   { color: "border-redaction-rose/30 bg-redaction-rose/5 text-redaction-rose", icon: AlertTriangle },
};

export function RevealWarning({ risk = "LOW", message, className }: RevealWarningProps) {
  const cfg = riskConfig[risk];
  const Icon = cfg.icon;

  return (
    <div className={cn("border rounded-sm p-4 flex gap-3", cfg.color, className)}>
      <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-xs uppercase tracking-widest font-heading mb-1">
          Reveal Risk: {risk}
        </p>
        <p className="text-xs opacity-80">
          {message ?? "You are revealing only this clause and its evidence. Other clauses remain hidden. Do not paste unrelated private agreement text into evidence."}
        </p>
      </div>
    </div>
  );
}
