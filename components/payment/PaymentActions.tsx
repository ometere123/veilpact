"use client";

import { useState } from "react";
import { SealButton } from "@/components/ui/SealButton";
import { veilpactWrite } from "@/lib/genlayer/contract";
import type { PactOnChain } from "@/lib/schemas/pact";
import { EXPLORER_URL } from "@/lib/constants";
import { CheckCircle, AlertTriangle } from "lucide-react";
import { formatGEN } from "@/lib/utils/format-gen";

interface Props {
  pact:     PactOnChain;
  pactId:   number;
  address:  string;
  onDone?:  () => void;
}

type TxKey = "release" | "claimPayee" | "claimPayer" | "fund";
type TxState = "idle" | "pending" | "done" | "error";

export function PaymentActions({ pact, pactId, address, onDone }: Props) {
  const [txState, setTxState] = useState<Record<TxKey, TxState>>({
    release: "idle", claimPayee: "idle", claimPayer: "idle", fund: "idle",
  });
  const [txHash,  setTxHash]  = useState<Partial<Record<TxKey, string>>>({});
  const [txError, setTxError] = useState<Partial<Record<TxKey, string>>>({});

  const addr = address.toLowerCase();
  const isPayer  = addr === pact.payer?.toLowerCase();
  const isPayee  = addr === pact.payee?.toLowerCase();
  const isParty  = isPayer || isPayee;
  const status   = pact.paymentStatus;

  async function run(key: TxKey, fn: () => Promise<string>) {
    setTxState(s => ({ ...s, [key]: "pending" }));
    setTxError(e => ({ ...e, [key]: undefined }));
    try {
      const hash = await fn();
      setTxHash(h => ({ ...h, [key]: hash }));
      setTxState(s => ({ ...s, [key]: "done" }));
      onDone?.();
    } catch (e: unknown) {
      setTxError(er => ({ ...er, [key]: e instanceof Error ? e.message : "Failed" }));
      setTxState(s => ({ ...s, [key]: "error" }));
    }
  }

  const actions: Array<{
    key:   TxKey;
    label: string;
    show:  boolean;
    fn:    () => Promise<string>;
    color: "gold" | "ghost";
  }> = [
    {
      key:   "fund",
      label: `Fund Pact (${formatGEN(pact.expectedAmount)} GEN)`,
      show:  isPayer && status === "UNFUNDED",
      fn:    () => veilpactWrite.fundPact(address as `0x${string}`, pactId, pact.expectedAmount ?? BigInt(0)),
      color: "gold",
    },
    {
      key:   "release",
      label: "Release Payment to Payee",
      show:  isPayer && status === "LOCKED",
      fn:    () => veilpactWrite.releasePayment(address as `0x${string}`, pactId),
      color: "gold",
    },
    {
      key:   "claimPayee",
      label: "Claim Payment",
      show:  isPayee && (pact.payeeClaimable ?? BigInt(0)) > BigInt(0) && !pact.payeeClaimed,
      fn:    () => veilpactWrite.claimPayeePayment(address as `0x${string}`, pactId),
      color: "gold",
    },
    {
      key:   "claimPayer",
      label: "Claim Refund",
      show:  isPayer && (pact.payerClaimable ?? BigInt(0)) > BigInt(0) && !pact.payerClaimed,
      fn:    () => veilpactWrite.claimPayerRefund(address as `0x${string}`, pactId),
      color: "ghost",
    },
  ];

  const visible = actions.filter(a => a.show);
  if (visible.length === 0 || !isParty) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {visible.map(({ key, label, fn, color }) => (
        <div key={key}>
          <SealButton
            variant={color}
            disabled={txState[key] !== "idle"}
            loading={txState[key] === "pending"}
            onClick={() => run(key, fn)}
          >
            {txState[key] === "done" ? "Done" : label}
          </SealButton>
          {txState[key] === "done" && txHash[key] && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
              <CheckCircle size={12} style={{ color: "#6E9F7E" }} />
              <a href={`${EXPLORER_URL}/tx/${txHash[key]}`} target="_blank" rel="noopener noreferrer"
                style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "0.65rem", color: "#6E9F7E", textDecoration: "underline", wordBreak: "break-all" }}>
                {txHash[key]} ↗
              </a>
            </div>
          )}
          {txState[key] === "error" && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
              <AlertTriangle size={12} style={{ color: "#B85C70" }} />
              <p style={{ fontSize: "0.72rem", color: "#B85C70", fontFamily: "IBM Plex Mono, monospace" }}>{txError[key]}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
