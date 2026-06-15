"use client";

interface Props {
  payerRefundBps:  number;
  payeeReleaseBps: number;
  totalBps?:       number; // default 10000
}

export function PaymentSplitMeter({ payerRefundBps, payeeReleaseBps, totalBps = 10000 }: Props) {
  const payerPct  = (payerRefundBps  / totalBps) * 100;
  const payeePct  = (payeeReleaseBps / totalBps) * 100;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "0.65rem", color: "#C9A35B" }}>
          PAYER REFUND {payerPct.toFixed(0)}% ({payerRefundBps} bps)
        </span>
        <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "0.65rem", color: "#7D5FFF" }}>
          PAYEE RELEASE {payeePct.toFixed(0)}% ({payeeReleaseBps} bps)
        </span>
      </div>
      <div style={{ height: 10, borderRadius: 2, backgroundColor: "rgba(239,228,208,0.08)", overflow: "hidden", display: "flex" }}>
        <div style={{ width: `${payerPct}%`, backgroundColor: "#C9A35B", transition: "width 0.4s" }} />
        <div style={{ width: `${payeePct}%`, backgroundColor: "#7D5FFF", transition: "width 0.4s" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: "0.65rem", fontFamily: "IBM Plex Mono, monospace", color: "rgba(239,228,208,0.35)" }}>
          {payerRefundBps} bps → payer
        </span>
        <span style={{ fontSize: "0.65rem", fontFamily: "IBM Plex Mono, monospace", color: "rgba(239,228,208,0.35)" }}>
          payee ← {payeeReleaseBps} bps
        </span>
      </div>
    </div>
  );
}
