
"use client";

import { WalletStatusPill } from "@/components/ui/WalletStatusPill";
import { NetworkBadge } from "@/components/ui/NetworkBadge";
import { Lock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface TopBarProps {
  address?: string;
  connected?: boolean;
  activePacts?: number;
  openDisputes?: number;
  revealMode?: "locked" | "selective" | "open";
}

const REVEAL_MODE_CONFIG = {
  locked:    { label: "Locked",    color: "text-verdict-green" },
  selective: { label: "Selective", color: "text-sealed-gold" },
  open:      { label: "Open",      color: "text-redaction-rose" },
};

export function TopBar({
  address,
  connected = false,
  activePacts = 0,
  openDisputes = 0,
  revealMode = "locked",
}: TopBarProps) {
  const rm = REVEAL_MODE_CONFIG[revealMode];

  return (
    <header className="fixed top-0 left-56 right-0 h-14 bg-obsidian border-b border-bone-border flex items-center px-6 gap-4 z-30">
      <WalletStatusPill address={address} connected={connected} />
      <NetworkBadge />

      <div className="flex items-center gap-1.5 text-xs text-muted-parchment border border-bone-border px-2.5 py-1 rounded-sm">
        <span>Active pacts</span>
        <span className="text-parchment font-mono">{activePacts}</span>
      </div>

      {openDisputes > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-redaction-rose border border-redaction-rose/30 bg-redaction-rose/5 px-2.5 py-1 rounded-sm">
          <AlertTriangle className="w-3 h-3" />
          <span>{openDisputes} dispute{openDisputes !== 1 ? "s" : ""}</span>
        </div>
      )}

      <div className="ml-auto flex items-center gap-1.5 text-xs">
        <Lock className={cn("w-3 h-3", rm.color)} />
        <span className="text-muted-parchment">Reveal mode:</span>
        <span className={cn("font-mono", rm.color)}>{rm.label}</span>
      </div>
    </header>
  );
}
