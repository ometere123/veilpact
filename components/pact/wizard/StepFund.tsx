"use client";

import { useState } from "react";
import { SealButton } from "@/components/ui/SealButton";
import { veilpactWrite } from "@/lib/genlayer/contract";
import type { WizardState } from "@/hooks/usePactWizard";
import { Coins, CheckCircle, AlertTriangle, ExternalLink } from "lucide-react";
import { EXPLORER_URL } from "@/lib/constants";

interface Props { wizard: WizardState; address: string; onChainPactId: number | null; }
type TxState = "idle" | "signing" | "awaiting" | "done" | "error";

export function StepFund({ wizard, address, onChainPactId }: Props) {
  const { payment } = wizard;
  const [txState, setTxState] = useState<TxState>("idle");
  const [txHash,  setTxHash]  = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

  const isPayer    = address.toLowerCase() === payment.payer.toLowerCase();
  const needsFund  = payment.enabled && BigInt(payment.expectedAmount || "0") > BigInt(0);
  const canFund    = isPayer && !!onChainPactId && txState === "idle";
  const amountBase = BigInt(payment.expectedAmount || "0");
  const genBase = BigInt("1000000000000000000");
  const amountGen = `${amountBase / genBase}.${(amountBase % genBase).toString().padStart(18, "0")}`
    .replace(/\.0+$/, "")
    .replace(/(\.\d*?)0+$/, "$1");

  async function handleFund() {
    if (!onChainPactId) { setTxError("No on-chain pact ID. Submit the pact first."); return; }
    setTxState("signing");
    setTxError(null);
    try {
      setTxState("awaiting");
      const hash = await veilpactWrite.fundPact(
        address as `0x${string}`,
        onChainPactId,
        BigInt(payment.expectedAmount),
      );
      setTxHash(hash);
      setTxState("done");
    } catch (e: unknown) {
      setTxError(e instanceof Error ? e.message : "Fund transaction failed");
      setTxState("error");
    }
  }

  if (!needsFund) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ border: "1px solid rgba(110,159,126,0.3)", backgroundColor: "rgba(110,159,126,0.05)", borderRadius: 2, padding: 16 }}>
          <p style={{ fontFamily: "Bebas Neue, sans-serif", letterSpacing: "0.1em", color: "#6E9F7E" }}>NO FUNDING REQUIRED</p>
          <p style={{ fontSize: "0.8rem", color: "rgba(239,228,208,0.6)", marginTop: 6 }}>
            This pact has no GEN-backed settlement. Share it with your counterparty to accept.
          </p>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <SealButton variant="ghost" onClick={() => window.location.href = "/overview"}>Go to Overview</SealButton>
        </div>
      </div>
    );
  }

  if (!isPayer) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ border: "1px solid rgba(201,163,91,0.3)", backgroundColor: "rgba(201,163,91,0.05)", borderRadius: 2, padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Coins size={16} style={{ color: "#C9A35B" }} />
            <p style={{ fontFamily: "Bebas Neue, sans-serif", letterSpacing: "0.1em", color: "#C9A35B" }}>WAITING FOR PAYER TO FUND</p>
          </div>
          <p style={{ fontSize: "0.8rem", color: "rgba(239,228,208,0.64)", lineHeight: 1.6 }}>
            The payer (<span style={{ fontFamily: "IBM Plex Mono, monospace", color: "#EFE4D0" }}>{payment.payer}</span>)
            must fund the pact with {amountGen} GEN before the counterparty can accept.
          </p>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <SealButton variant="ghost" onClick={() => window.location.href = "/overview"}>Go to Overview</SealButton>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      <div style={{ border: "1px solid rgba(201,163,91,0.3)", backgroundColor: "rgba(201,163,91,0.05)", borderRadius: 2, padding: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <Coins size={16} style={{ color: "#C9A35B" }} />
          <p style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "0.75rem", color: "#C9A35B" }}>FUND THIS PACT</p>
        </div>
        <p style={{ fontSize: "0.8rem", color: "rgba(239,228,208,0.7)", lineHeight: 1.6 }}>
          As the payer you must send <strong style={{ color: "#EFE4D0" }}>{amountGen} GEN</strong> to the contract.
          GEN stays locked until both parties agree to release or a settlement is applied.
        </p>
      </div>
      {/* Wallet transaction guard */}
      <div style={{ border: "1px solid rgba(110,159,126,0.3)", backgroundColor: "rgba(110,159,126,0.05)", borderRadius: 2, padding: 12 }}>
        <p style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "0.65rem", color: "#6E9F7E", marginBottom: 4 }}>WALLET VALUE GUARD</p>
        <p style={{ fontSize: "0.78rem", color: "rgba(239,228,208,0.6)", lineHeight: 1.6 }}>
          Before the wallet popup opens, VeilPact checks the raw transaction payload from GenLayer.
          If the native value is not exactly <strong style={{ color: "#EFE4D0" }}>{amountGen} GEN</strong>,
          the app aborts the transaction before you can sign.
        </p>
        <p style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "1rem", color: "#C9A35B", marginTop: 8, textAlign: "center", letterSpacing: "0.05em" }}>
          {amountGen} GEN
        </p>
        <p style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "0.6rem", color: "rgba(239,228,208,0.25)", textAlign: "center", marginTop: 2 }}>
          = {payment.expectedAmount} wei
        </p>
      </div>

      <div style={{ border: "1px solid rgba(239,228,208,0.18)", backgroundColor: "#14141C", borderRadius: 2, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        {[
          ["Pact ID", onChainPactId ?? "pending"],
          ["Payer",  payment.payer],
          ["Payee",  payment.payee],
          ["Amount", `${amountGen} GEN`],
        ].map(([k, v]) => (
          <div key={String(k)}>
            <p style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "0.6rem", color: "rgba(239,228,208,0.4)", textTransform: "uppercase", letterSpacing: "0.12em" }}>{k}</p>
            <p style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "0.75rem", color: "#EFE4D0", wordBreak: "break-all" }}>{String(v)}</p>
          </div>
        ))}
      </div>

      {txState === "awaiting" && (
        <div style={{ border: "1px solid rgba(201,163,91,0.3)", backgroundColor: "rgba(201,163,91,0.05)", borderRadius: 2, padding: 12 }}>
          <p style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "0.7rem", color: "#C9A35B" }}>
            AWAITING FINALITY - GenLayer consensus in progress…
          </p>
          {txHash && (
            <a href={`${EXPLORER_URL}/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
              style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "0.65rem", color: "#C9A35B", marginTop: 4, wordBreak: "break-all", display: "block", textDecoration: "underline" }}>
              {txHash} ↗
            </a>
          )}
        </div>
      )}

      {txState === "done" && (
        <div style={{ border: "1px solid rgba(110,159,126,0.4)", backgroundColor: "rgba(110,159,126,0.05)", borderRadius: 2, padding: 12, display: "flex", gap: 8 }}>
          <CheckCircle size={16} style={{ color: "#6E9F7E", flexShrink: 0 }} />
          <div>
            <p style={{ fontFamily: "Bebas Neue, sans-serif", letterSpacing: "0.1em", color: "#6E9F7E" }}>PACT FUNDED</p>
            <p style={{ fontSize: "0.8rem", color: "rgba(239,228,208,0.64)", marginTop: 4 }}>
              GEN is held by the contract. The counterparty can now accept. Once accepted, GEN becomes LOCKED.
            </p>
            {txHash && (
              <a href={`${EXPLORER_URL}/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
                style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "0.65rem", color: "#6E9F7E", marginTop: 6, wordBreak: "break-all", display: "block", textDecoration: "underline" }}>
                {txHash} <ExternalLink size={10} style={{ display: "inline" }} />
              </a>
            )}
          </div>
        </div>
      )}

      {txState === "error" && (
        <div style={{ border: "1px solid rgba(184,92,112,0.3)", backgroundColor: "rgba(184,92,112,0.05)", borderRadius: 2, padding: 12, display: "flex", gap: 8 }}>
          <AlertTriangle size={14} style={{ color: "#B85C70", flexShrink: 0, marginTop: 1 }} />
          <p style={{ color: "#B85C70", fontSize: "0.8rem" }}>{txError ?? "Fund transaction failed."}</p>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8 }}>
        {txState !== "done" ? (
          <>
            <SealButton variant="ghost" onClick={() => window.location.href = "/overview"}>Skip, Fund Later</SealButton>
            <SealButton variant="gold" disabled={!canFund} loading={txState === "signing" || txState === "awaiting"} onClick={handleFund}>
              {txState === "awaiting" ? "Awaiting Finality…" : `Fund ${amountGen} GEN`}
            </SealButton>
          </>
        ) : (
          <SealButton variant="ghost" onClick={() => window.location.href = "/overview"}>Go to Overview</SealButton>
        )}
      </div>
    </div>
  );
}
