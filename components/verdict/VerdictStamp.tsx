import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, AlertCircle, RefreshCw, Pause, MessageSquareDiff, ArrowUpRight, ArrowDownLeft, Split } from "lucide-react";
import { PaymentSplitMeter } from "@/components/payment/PaymentSplitMeter";
import type { VerdictData } from "@/lib/schemas/pact";

const ACTION_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  CONTINUE:             { label: "Continue",              color: "text-verdict-green border-verdict-green",  icon: CheckCircle2 },
  PAUSE:                { label: "Pause",                 color: "text-sealed-gold border-sealed-gold",      icon: Pause },
  RENEGOTIATE:          { label: "Renegotiate",           color: "text-clause-blue border-clause-blue",      icon: RefreshCw },
  SETTLE:               { label: "Settle",                color: "text-muted-parchment border-bone-border",  icon: CheckCircle2 },
  DISMISS:              { label: "Dismiss",               color: "text-muted-parchment border-bone-border",  icon: XCircle },
  REQUEST_MORE_EVIDENCE:{ label: "More Evidence Needed",  color: "text-sealed-gold border-sealed-gold",      icon: AlertCircle },
  REQUEST_NARROW_REVEAL:{ label: "Narrow Reveal Needed",  color: "text-signal-violet border-signal-violet",  icon: MessageSquareDiff },
  REJECTED_UNSAFE:      { label: "Rejected: Unsafe",      color: "text-redaction-rose border-redaction-rose",icon: XCircle },
};

const PAYMENT_DECISION_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  NO_PAYMENT_ACTION: { label: "No Payment Action",  color: "text-muted-parchment", icon: CheckCircle2 },
  RELEASE_TO_PAYEE:  { label: "Release to Payee",   color: "text-verdict-green",   icon: ArrowUpRight },
  REFUND_TO_PAYER:   { label: "Refund to Payer",    color: "text-sealed-gold",     icon: ArrowDownLeft },
  SPLIT_PAYMENT:     { label: "Split Payment",      color: "text-signal-violet",   icon: Split },
  PAUSE_PAYMENT:     { label: "Payment Paused",     color: "text-sealed-gold",     icon: Pause },
};

interface VerdictStampProps {
  action:     string;
  verdict?:   VerdictData;
  confidence?: number;
  reasoning?:  string;
  className?:  string;
}

export function VerdictStamp({ action, verdict, confidence, reasoning, className }: VerdictStampProps) {
  const cfg  = ACTION_CONFIG[action] ?? ACTION_CONFIG["DISMISS"];
  const Icon = cfg.icon;

  const pd      = verdict?.paymentDecision;
  const pdCfg   = pd ? (PAYMENT_DECISION_CONFIG[pd] ?? null) : null;
  const PDIcon  = pdCfg?.icon;

  return (
    <div className={cn("border-2 rounded-sm p-5 relative overflow-hidden space-y-4", cfg.color, className)}>
      <div className={cn("absolute inset-0 opacity-5", cfg.color.includes("green") ? "bg-verdict-green" : "bg-current")} />

      {/* Recommended action */}
      <div className="text-center">
        <Icon className={cn("w-8 h-8 mx-auto mb-3", cfg.color.split(" ")[0])} />
        <p className={cn("font-heading text-2xl tracking-widest uppercase", cfg.color.split(" ")[0])}>
          {cfg.label}
        </p>
        {confidence !== undefined && (
          <p className="text-xs text-muted-parchment mt-1 font-mono">
            Confidence: {Math.round(confidence * 100)}%
          </p>
        )}
      </div>

      {/* Payment decision */}
      {pdCfg && PDIcon && pd !== "NO_PAYMENT_ACTION" && (
        <div className="border-t border-current/20 pt-4">
          <p className="text-xs font-mono text-muted-parchment uppercase tracking-widest mb-2">Payment Decision</p>
          <div className="flex items-center gap-2">
            <PDIcon size={14} className={pdCfg.color} />
            <p className={cn("font-mono text-sm font-bold", pdCfg.color)}>{pdCfg.label}</p>
          </div>
          {verdict && (verdict.payerRefundBps > 0 || verdict.payeeReleaseBps > 0) && (
            <div className="mt-3">
              <PaymentSplitMeter
                payerRefundBps={verdict.payerRefundBps}
                payeeReleaseBps={verdict.payeeReleaseBps}
              />
            </div>
          )}
          {verdict?.paymentReasoning && (
            <p className="text-xs text-muted-parchment mt-3 leading-relaxed opacity-80">
              {verdict.paymentReasoning}
            </p>
          )}
        </div>
      )}

      {/* Clause reasoning */}
      {(reasoning ?? verdict?.reasoning) && (
        <p className="text-xs text-muted-parchment text-left leading-relaxed border-t border-current/20 pt-3 opacity-80">
          {reasoning ?? verdict?.reasoning}
        </p>
      )}

      {/* Next steps */}
      {verdict?.nextSteps && verdict.nextSteps.length > 0 && (
        <div className="border-t border-current/20 pt-3">
          <p className="text-xs font-mono text-muted-parchment uppercase tracking-widest mb-2">Next Steps</p>
          <ul className="space-y-1">
            {verdict.nextSteps.map((s, i) => (
              <li key={i} className="text-xs text-muted-parchment flex gap-2">
                <span className="opacity-40">{i + 1}.</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
