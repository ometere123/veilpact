import { cn } from "@/lib/utils";
import { Lock, Eye } from "lucide-react";

interface PrivacyMeterProps {
  total: number;
  revealed: number;
  className?: string;
  compact?: boolean;
}

export function PrivacyMeter({ total, revealed, className, compact }: PrivacyMeterProps) {
  const pct = total > 0 ? (revealed / total) * 100 : 0;
  const color = pct === 0
    ? "bg-verdict-green"
    : pct < 33
    ? "bg-sealed-gold"
    : "bg-redaction-rose";

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {!compact && (
        <div className="flex items-center justify-between text-xs text-muted-parchment uppercase tracking-widest">
          <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> Privacy</span>
          <span>{revealed}/{total} revealed</span>
        </div>
      )}
      <div className="h-1 bg-bone-border rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-700", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      {!compact && (
        <div className="flex items-center gap-1 text-xs">
          {pct === 0 ? (
            <span className="text-verdict-green flex items-center gap-1"><Lock className="w-3 h-3" /> All clauses private</span>
          ) : (
            <span className="text-redaction-rose flex items-center gap-1"><Eye className="w-3 h-3" /> {revealed} clause{revealed !== 1 ? "s" : ""} revealed</span>
          )}
        </div>
      )}
    </div>
  );
}
