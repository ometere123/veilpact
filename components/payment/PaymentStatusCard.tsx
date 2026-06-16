"use client";

import { PAYMENT_STATUS_LABEL } from "@/lib/constants";
import type { PactOnChain } from "@/lib/schemas/pact";
import { Coins, Lock, CheckCircle, AlertCircle, ArrowDownLeft, ArrowUpRight, Split } from "lucide-react";

const ICON_MAP: Record<string, React.ElementType> = {
  NONE:      Coins,
  UNFUNDED:  AlertCircle,
  FUNDED:    Coins,
  LOCKED:    Lock,
  RELEASED:  ArrowUpRight,
  REFUNDED:  ArrowDownLeft,
  SPLIT:     Split,
  PAUSED:    AlertCircle,
  CLAIMABLE: CheckCircle,
  CLAIMED:   CheckCircle,
};
const COLOR_MAP: Record<string, string> = {
  NONE:      "rgba(239,228,208,0.3)",
  UNFUNDED:  "#C9A35B",
  FUNDED:    "#C9A35B",
  LOCKED:    "#7D5FFF",
  RELEASED:  "#6E9F7E",
  REFUNDED:  "#6E9F7E",
  SPLIT:     "#7D5FFF",
  PAUSED:    "#C9A35B",
  CLAIMABLE: "#6E9F7E",
  CLAIMED:   "#6E9F7E",
};

interface Props {
  pact: Pick<PactOnChain,
    "paymentStatus" | "payer" | "payee" | "expectedAmount" | "fundedAmount" |
    "payerClaimable" | "payeeClaimable" | "payerClaimed" | "payeeClaimed" | "settlementApplied"
  >;
  connectedAddress?: string;
}

function genLabel(amount: bigint): string {
  if (amount === BigInt(0)) return "0";
  const whole = amount / BigInt("1000000000000000000");
  const frac  = amount % BigInt("1000000000000000000");
  if (frac === BigInt(0)) return `${whole} GEN`;
  return `${whole}.${frac.toString().padStart(18, "0").replace(/0+$/, "")} GEN`;
}

export function PaymentStatusCard({ pact, connectedAddress }: Props) {
  const status = pact.paymentStatus ?? "NONE";
  const color  = COLOR_MAP[status] ?? "rgba(239,228,208,0.3)";
  const Icon   = ICON_MAP[status]  ?? Coins;

  const isNoPayment = status === "NONE";

  return (
    <div style={{
      border: `1px solid ${color}40`,
      backgroundColor: "#14141C",
      borderRadius: 2, padding: 16,
      display: "flex", flexDirection: "column", gap: 14,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Icon size={16} style={{ color }} />
        <div>
          <p style={{ fontFamily: "Bebas Neue, sans-serif", letterSpacing: "0.08em", color, fontSize: "1rem" }}>
            {isNoPayment ? "NO FUNDED SETTLEMENT" : `PAYMENT: ${PAYMENT_STATUS_LABEL[status] ?? status}`}
          </p>
          {pact.settlementApplied && (
            <p style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "0.65rem", color: "rgba(239,228,208,0.4)", marginTop: 2 }}>
              Settlement decision applied
            </p>
          )}
        </div>
      </div>

      {!isNoPayment && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            ["Payer",           pact.payer],
            ["Payee",           pact.payee],
            ["Expected",        genLabel(pact.expectedAmount ?? BigInt(0))],
            ["Funded",          genLabel(pact.fundedAmount   ?? BigInt(0))],
            ["Payer Claimable", genLabel(pact.payerClaimable ?? BigInt(0))],
            ["Payee Claimable", genLabel(pact.payeeClaimable ?? BigInt(0))],
          ].map(([k, v]) => (
            <div key={k}>
              <p style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "0.58rem", color: "rgba(239,228,208,0.35)", textTransform: "uppercase", letterSpacing: "0.12em" }}>{k}</p>
              <p style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "0.7rem", color: "#EFE4D0", wordBreak: "break-all", marginTop: 2 }}>{v}</p>
            </div>
          ))}
        </div>
      )}

      {/* Claim flags */}
      {!isNoPayment && (pact.payerClaimed || pact.payeeClaimed) && (
        <div style={{ display: "flex", gap: 8 }}>
          {pact.payerClaimed && (
            <span style={{ fontSize: "0.65rem", fontFamily: "IBM Plex Mono, monospace", color: "#6E9F7E", border: "1px solid rgba(110,159,126,0.3)", borderRadius: 2, padding: "2px 6px" }}>
              PAYER CLAIMED
            </span>
          )}
          {pact.payeeClaimed && (
            <span style={{ fontSize: "0.65rem", fontFamily: "IBM Plex Mono, monospace", color: "#6E9F7E", border: "1px solid rgba(110,159,126,0.3)", borderRadius: 2, padding: "2px 6px" }}>
              PAYEE CLAIMED
            </span>
          )}
        </div>
      )}

      {/* Role badge */}
      {connectedAddress && !isNoPayment && (
        <p style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "0.65rem", color: "rgba(239,228,208,0.3)" }}>
          You are:{" "}
          {connectedAddress.toLowerCase() === pact.payer?.toLowerCase() ? (
            <span style={{ color: "#C9A35B" }}>PAYER</span>
          ) : connectedAddress.toLowerCase() === pact.payee?.toLowerCase() ? (
            <span style={{ color: "#7D5FFF" }}>PAYEE</span>
          ) : (
            <span>observer</span>
          )}
        </p>
      )}
    </div>
  );
}
