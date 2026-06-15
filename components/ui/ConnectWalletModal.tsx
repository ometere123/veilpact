"use client";

import { SealButton } from "@/components/ui/SealButton";
import { useWalletContext } from "@/contexts/WalletContext";
import { Wallet, X, AlertTriangle } from "lucide-react";

interface ConnectWalletModalProps {
  open: boolean;
  onClose: () => void;
}

export function ConnectWalletModal({ open, onClose }: ConnectWalletModalProps) {
  const { connect, connecting, error, connected } = useWalletContext();

  if (!open) return null;
  if (connected) { onClose(); return null; }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(11,11,16,0.85)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-sm p-6 relative"
        style={{ backgroundColor: "#14141C", border: "1px solid rgba(201,163,91,0.4)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4"
          style={{ color: "rgba(239,228,208,0.4)" }}
        >
          <X className="w-4 h-4" />
        </button>

        <Wallet className="w-8 h-8 mb-4" style={{ color: "#C9A35B" }} />
        <h2 style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "1.5rem", letterSpacing: "0.1em", color: "#EFE4D0", marginBottom: "0.5rem" }}>
          CONNECT WALLET
        </h2>
        <p className="text-sm mb-6" style={{ color: "rgba(239,228,208,0.64)" }}>
          VeilPact uses your injected wallet for identity and transaction signing.
          No email. No embedded wallet. No Privy.
        </p>

        {error && (
          <div
            className="flex items-start gap-2 text-sm mb-4 p-3 rounded-sm"
            style={{ border: "1px solid rgba(184,92,112,0.3)", color: "#B85C70", backgroundColor: "rgba(184,92,112,0.05)" }}
          >
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <SealButton className="w-full justify-center" loading={connecting} onClick={connect}>
          Connect Injected Wallet
        </SealButton>

        <p className="text-xs mt-4 text-center" style={{ color: "rgba(239,228,208,0.3)" }}>
          MetaMask, Rabby, Frame, or any EIP-1193 wallet
        </p>
      </div>
    </div>
  );
}
