"use client";

import { useState } from "react";
import { SealButton } from "@/components/ui/SealButton";
import type { WizardState } from "@/hooks/usePactWizard";
import { Coins, AlertTriangle, ArrowRightLeft } from "lucide-react";

function weiToGenDisplay(wei: string): string {
  if (!wei || wei === "0") return "";
  try {
    const n = BigInt(wei);
    const whole = n / BigInt("1000000000000000000");
    const frac  = n % BigInt("1000000000000000000");
    if (frac === BigInt(0)) return whole.toString();
    return `${whole}.${frac.toString().padStart(18, "0").replace(/0+$/, "")}`;
  } catch { return ""; }
}

function genToWei(gen: string): string {
  if (!gen) return "0";
  try {
    const [whole, frac = ""] = gen.split(".");
    const fracPadded = frac.slice(0, 18).padEnd(18, "0");
    return (BigInt(whole || "0") * BigInt("1000000000000000000") + BigInt(fracPadded)).toString();
  } catch { return "0"; }
}

interface Props { wizard: WizardState; }

const inp: React.CSSProperties = {
  width: "100%", background: "#0B0B10", border: "1px solid rgba(239,228,208,0.18)",
  borderRadius: 2, padding: "10px 12px", color: "#EFE4D0",
  fontFamily: "IBM Plex Mono, monospace", fontSize: "0.8rem", outline: "none",
};
const lbl: React.CSSProperties = {
  fontFamily: "IBM Plex Mono, monospace", fontSize: "0.65rem",
  textTransform: "uppercase", letterSpacing: "0.12em",
  color: "rgba(239,228,208,0.4)", marginBottom: 6, display: "block",
};
const row: React.CSSProperties = {
  display: "flex", flexDirection: "column", gap: 6,
};

export function StepPayment({ wizard }: Props) {
  const { payment, updatePayment, draft, nextStep, prevStep } = wizard;
  const [genInput, setGenInput] = useState(() => weiToGenDisplay(payment.expectedAmount));

  function swapRoles() {
    updatePayment({ payer: payment.payee, payee: payment.payer });
  }

  const canContinue = !payment.enabled || (
    !!payment.payer && !!payment.payee &&
    payment.payer !== payment.payee &&
    BigInt(payment.expectedAmount || "0") > BigInt(0)
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Info banner */}
      <div style={{ border: "1px solid rgba(201,163,91,0.25)", backgroundColor: "rgba(201,163,91,0.04)", borderRadius: 2, padding: 14 }}>
        <p style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "0.7rem", color: "#C9A35B", marginBottom: 6 }}>
          OPTIONAL GEN-BACKED SETTLEMENT
        </p>
        <p style={{ fontSize: "0.8rem", color: "rgba(239,228,208,0.64)", lineHeight: 1.6 }}>
          Payment amount and settlement state are <strong style={{ color: "#EFE4D0" }}>public on GenLayer</strong>.
          Your private pact clauses remain local unless selectively revealed during a dispute.
        </p>
      </div>

      {/* Toggle */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", border: "1px solid rgba(239,228,208,0.18)", borderRadius: 2, padding: "14px 16px", backgroundColor: "#14141C" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Coins size={16} style={{ color: payment.enabled ? "#C9A35B" : "rgba(239,228,208,0.3)" }} />
          <div>
            <p style={{ fontFamily: "Bebas Neue, sans-serif", letterSpacing: "0.08em", color: payment.enabled ? "#EFE4D0" : "rgba(239,228,208,0.5)" }}>
              {payment.enabled ? "GEN-BACKED SETTLEMENT ENABLED" : "NO FUNDED SETTLEMENT"}
            </p>
            <p style={{ fontSize: "0.72rem", color: "rgba(239,228,208,0.4)", marginTop: 2 }}>
              {payment.enabled ? "GEN will be locked on GenLayer until the pact closes." : "Pact proceeds without on-chain funds."}
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            updatePayment({
              enabled: !payment.enabled,
              payer:   payment.payer || draft.partyA,
              payee:   payment.payee || draft.partyB,
            });
          }}
          style={{
            width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
            backgroundColor: payment.enabled ? "#C9A35B" : "rgba(239,228,208,0.12)",
            position: "relative", transition: "background-color 0.2s", flexShrink: 0,
          }}
        >
          <span style={{
            position: "absolute", top: 3, left: payment.enabled ? 23 : 3,
            width: 18, height: 18, borderRadius: "50%", backgroundColor: "#EFE4D0",
            transition: "left 0.2s",
          }} />
        </button>
      </div>

      {payment.enabled && (
        <>
          {/* Payer / Payee */}
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
            <div style={{ ...row, flex: 1 }}>
              <label style={lbl}>Payer Address</label>
              <input
                style={inp}
                placeholder="0x… address that funds the pact"
                value={payment.payer}
                onChange={e => updatePayment({ payer: e.target.value })}
              />
            </div>
            <button
              onClick={swapRoles}
              title="Swap payer/payee"
              style={{ padding: 10, background: "rgba(239,228,208,0.06)", border: "1px solid rgba(239,228,208,0.18)", borderRadius: 2, cursor: "pointer", color: "rgba(239,228,208,0.5)", marginBottom: 1 }}
            >
              <ArrowRightLeft size={14} />
            </button>
            <div style={{ ...row, flex: 1 }}>
              <label style={lbl}>Payee Address</label>
              <input
                style={inp}
                placeholder="0x… address that receives GEN"
                value={payment.payee}
                onChange={e => updatePayment({ payee: e.target.value })}
              />
            </div>
          </div>

          <div style={row}>
            <label style={lbl}>Expected Amount (GEN)</label>
            <div style={{ position: "relative" }}>
              <input
                style={{ ...inp, paddingRight: 52 }}
                type="text"
                inputMode="decimal"
                placeholder="e.g. 20"
                value={genInput}
                onChange={e => {
                  const v = e.target.value;
                  if (v !== "" && !/^\d*\.?\d*$/.test(v)) return;
                  setGenInput(v);
                  updatePayment({ expectedAmount: genToWei(v) });
                }}
              />
              <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontFamily: "IBM Plex Mono, monospace", fontSize: "0.75rem", color: "rgba(239,228,208,0.4)", pointerEvents: "none" }}>GEN</span>
            </div>
            {payment.expectedAmount && payment.expectedAmount !== "0" && (
              <p style={{ fontSize: "0.65rem", color: "rgba(239,228,208,0.25)", fontFamily: "IBM Plex Mono, monospace" }}>
                = {payment.expectedAmount} wei (sent to contract)
              </p>
            )}
          </div>

          {payment.payer === payment.payee && payment.payer && (
            <div style={{ display: "flex", gap: 8, border: "1px solid rgba(184,92,112,0.3)", backgroundColor: "rgba(184,92,112,0.05)", borderRadius: 2, padding: 12 }}>
              <AlertTriangle size={14} style={{ color: "#B85C70", flexShrink: 0, marginTop: 1 }} />
              <p style={{ color: "#B85C70", fontSize: "0.78rem" }}>Payer and payee cannot be the same address.</p>
            </div>
          )}

          <div style={{ border: "1px solid rgba(239,228,208,0.1)", borderRadius: 2, padding: 12, backgroundColor: "#0B0B10" }}>
            <p style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "0.65rem", color: "rgba(239,228,208,0.3)", lineHeight: 1.8 }}>
              PAYER funds the pact after creation via <code>fund_pact()</code>.<br />
              GEN is locked when the counterparty accepts.<br />
              Payee claims after PAYER releases, or after settlement.<br />
              If pact is cancelled before acceptance, payer is fully refunded.
            </p>
          </div>
        </>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8 }}>
        <SealButton variant="ghost" onClick={prevStep}>Back</SealButton>
        <SealButton variant="gold" disabled={!canContinue} onClick={nextStep}>Continue</SealButton>
      </div>
    </div>
  );
}
