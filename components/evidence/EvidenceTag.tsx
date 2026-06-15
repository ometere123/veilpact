import { cn } from "@/lib/utils";
import { FileText, Link2, Hash, Image, MessageSquare, Truck, Reply } from "lucide-react";

const TYPE_CONFIG: Record<string, { label: string; icon: typeof FileText; color: string }> = {
  TEXT_SUMMARY:              { label: "Text Summary",              icon: FileText,      color: "text-clause-blue" },
  URL_REFERENCE:             { label: "URL Reference",             icon: Link2,         color: "text-sealed-gold" },
  FILE_HASH:                 { label: "File Hash",                 icon: Hash,          color: "text-muted-parchment" },
  SCREENSHOT_HASH:           { label: "Screenshot Hash",           icon: Image,         color: "text-signal-violet" },
  MESSAGE_EXCERPT_HASH:      { label: "Message Excerpt Hash",      icon: MessageSquare, color: "text-clause-blue" },
  DELIVERY_PROOF_HASH:       { label: "Delivery Proof Hash",       icon: Truck,         color: "text-verdict-green" },
  COUNTERPARTY_RESPONSE_HASH:{ label: "Counterparty Response Hash",icon: Reply,         color: "text-sealed-gold" },
};

interface EvidenceTagProps {
  type: string;
  strength?: string;
  hash?: string;
  visibility?: string;
  className?: string;
}

export function EvidenceTag({ type, strength, hash, visibility, className }: EvidenceTagProps) {
  const cfg = TYPE_CONFIG[type] ?? { label: type, icon: FileText, color: "text-muted-parchment" };
  const Icon = cfg.icon;

  return (
    <div className={cn("border border-bone-border rounded-sm p-3 bg-obsidian flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between">
        <div className={cn("flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest", cfg.color)}>
          <Icon className="w-3 h-3" />
          {cfg.label}
        </div>
        {strength && (
          <span className="text-xs text-muted-parchment uppercase tracking-widest border border-bone-border px-1.5 py-0.5 rounded-sm">
            {strength}
          </span>
        )}
      </div>
      {hash && (
        <p className="font-mono text-xs text-muted-parchment">{hash.slice(0, 16)}...{hash.slice(-6)}</p>
      )}
      {visibility && (
        <p className="text-xs text-muted-parchment/60">{visibility}</p>
      )}
    </div>
  );
}
