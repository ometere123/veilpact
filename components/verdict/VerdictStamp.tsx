import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, AlertCircle, RefreshCw, Pause, MessageSquareDiff } from "lucide-react";

const ACTION_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  CONTINUE:             { label: "Continue",              color: "text-verdict-green border-verdict-green",  icon: CheckCircle2 },
  PAUSE:                { label: "Pause",                 color: "text-sealed-gold border-sealed-gold",      icon: Pause },
  RENEGOTIATE:          { label: "Renegotiate",           color: "text-clause-blue border-clause-blue",      icon: RefreshCw },
  SETTLE:               { label: "Settle",                color: "text-muted-parchment border-bone-border",  icon: CheckCircle2 },
  DISMISS:              { label: "Dismiss",               color: "text-muted-parchment border-bone-border",  icon: XCircle },
  REQUEST_MORE_EVIDENCE:{ label: "More Evidence Needed",  color: "text-sealed-gold border-sealed-gold",      icon: AlertCircle },
  REQUEST_NARROW_REVEAL:{ label: "Narrow Reveal Needed",  color: "text-signal-violet border-signal-violet",  icon: MessageSquareDiff },
  REJECTED_UNSAFE:      { label: "Rejected — Unsafe",     color: "text-redaction-rose border-redaction-rose",icon: XCircle },
};

interface VerdictStampProps {
  action: string;
  confidence?: number;
  reasoning?: string;
  className?: string;
}

export function VerdictStamp({ action, confidence, reasoning, className }: VerdictStampProps) {
  const cfg = ACTION_CONFIG[action] ?? ACTION_CONFIG["DISMISS"];
  const Icon = cfg.icon;

  return (
    <motion.div
      initial={{ scale: 0.92, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={cn("border-2 rounded-sm p-5 text-center relative overflow-hidden", cfg.color, className)}
    >
      <div className={cn("absolute inset-0 opacity-5", cfg.color.includes("green") ? "bg-verdict-green" : "bg-current")} />
      <Icon className={cn("w-8 h-8 mx-auto mb-3", cfg.color.split(" ")[0])} />
      <p className={cn("font-heading text-2xl tracking-widest uppercase", cfg.color.split(" ")[0])}>
        {cfg.label}
      </p>
      {confidence !== undefined && (
        <p className="text-xs text-muted-parchment mt-1 font-mono">
          Confidence: {Math.round(confidence * 100)}%
        </p>
      )}
      {reasoning && (
        <p className="text-xs text-muted-parchment mt-3 text-left leading-relaxed border-t border-current/20 pt-3 opacity-80">
          {reasoning}
        </p>
      )}
    </motion.div>
  );
}
