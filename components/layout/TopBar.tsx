"use client";

import { WalletStatusPill } from "@/components/ui/WalletStatusPill";
import { NetworkBadge } from "@/components/ui/NetworkBadge";
import { SealButton } from "@/components/ui/SealButton";
import { Lock, AlertTriangle } from "lucide-react";
import { useWalletContext } from "@/contexts/WalletContext";

interface TopBarProps {
  activePacts?: number;
  openDisputes?: number;
  revealMode?: "locked" | "selective" | "open";
}

const REVEAL_MODE: Record<string, { label: string; color: string }> = {
  locked:    { label: "Locked",    color: "#6E9F7E" },
  selective: { label: "Selective", color: "#C9A35B" },
  open:      { label: "Open",      color: "#B85C70" },
};

export function TopBar({ activePacts = 0, openDisputes = 0, revealMode = "locked" }: TopBarProps) {
  const { address, connected, connecting, connect } = useWalletContext();
  const rm = REVEAL_MODE[revealMode];

  return (
    <header
      className="fixed top-0 flex items-center px-6 gap-4 z-30"
      style={{
        left: 224,
        right: 0,
        height: 56,
        backgroundColor: "#14141C",
        borderBottom: "1px solid rgba(239,228,208,0.18)",
      }}
    >
      {connected ? (
        <WalletStatusPill address={address ?? undefined} connected={connected} />
      ) : (
        <SealButton size="sm" variant="outline" loading={connecting} onClick={connect}>
          Connect Wallet
        </SealButton>
      )}

      <NetworkBadge />

      <div
        className="flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-sm"
        style={{ border: "1px solid rgba(239,228,208,0.18)", color: "rgba(239,228,208,0.64)" }}
      >
        <span>Pacts</span>
        <span style={{ color: "#EFE4D0" }}>{activePacts}</span>
      </div>

      {openDisputes > 0 && (
        <div
          className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-sm"
          style={{ border: "1px solid rgba(184,92,112,0.3)", color: "#B85C70", backgroundColor: "rgba(184,92,112,0.05)" }}
        >
          <AlertTriangle className="w-3 h-3" />
          {openDisputes} dispute{openDisputes !== 1 ? "s" : ""}
        </div>
      )}

      <div className="ml-auto flex items-center gap-1.5 text-xs">
        <Lock className="w-3 h-3" style={{ color: rm.color }} />
        <span style={{ color: "rgba(239,228,208,0.64)" }}>Reveal:</span>
        <span className="font-mono" style={{ color: rm.color }}>{rm.label}</span>
      </div>
    </header>
  );
}
