import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

type EventType =
  | "PACT_CREATED"
  | "COUNTERPARTY_ACCEPTED"
  | "DISPUTE_OPENED"
  | "CLAUSE_REVEALED"
  | "GENLAYER_REVIEW"
  | "VERDICT"
  | "PACT_CLOSED";

const EVENT_COLORS: Record<EventType, string> = {
  PACT_CREATED:          "bg-clause-blue",
  COUNTERPARTY_ACCEPTED: "bg-verdict-green",
  DISPUTE_OPENED:        "bg-redaction-rose",
  CLAUSE_REVEALED:       "bg-sealed-gold",
  GENLAYER_REVIEW:       "bg-signal-violet",
  VERDICT:               "bg-verdict-green",
  PACT_CLOSED:           "bg-muted-parchment",
};

interface TimelineEventProps {
  type: EventType | string;
  label: string;
  timestamp?: string | number;
  description?: string;
  last?: boolean;
  children?: ReactNode;
}

export function TimelineEvent({ type, label, timestamp, description, last, children }: TimelineEventProps) {
  const dot = EVENT_COLORS[type as EventType] ?? "bg-muted-parchment";

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1", dot)} />
        {!last && <div className="w-px flex-1 bg-bone-border mt-1 mb-0" />}
      </div>
      <div className={cn("pb-5", last && "pb-0")}>
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-mono text-muted-parchment uppercase tracking-widest">[{label}]</span>
          {timestamp && (
            <span className="text-xs text-muted-parchment/50 font-mono">
              {typeof timestamp === "number"
                ? new Date(timestamp * 1000).toLocaleString()
                : timestamp}
            </span>
          )}
        </div>
        {description && (
          <p className="text-xs text-muted-parchment/70 mt-1">{description}</p>
        )}
        {children}
      </div>
    </div>
  );
}
