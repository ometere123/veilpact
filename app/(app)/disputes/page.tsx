"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle } from "lucide-react";
import { DossierCard } from "@/components/ui/DossierCard";
import { SealButton } from "@/components/ui/SealButton";
import { useWalletContext } from "@/contexts/WalletContext";
import { veilpactWrite } from "@/lib/genlayer/contract";
import { syncPactFromChain } from "@/lib/genlayer/sync";
import { EXPLORER_URL } from "@/lib/constants";

const OUTCOMES = ["SETTLE", "CONTINUE", "PAUSE", "RENEGOTIATE", "DISMISS"];
type TxState = "idle" | "pending" | "done" | "error";

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#0B0B10",
  border: "1px solid rgba(239,228,208,0.18)",
  borderRadius: 2,
  padding: "10px 12px",
  color: "#EFE4D0",
  fontFamily: "IBM Plex Mono, monospace",
  fontSize: "0.8rem",
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  fontFamily: "IBM Plex Mono, monospace",
  fontSize: "0.65rem",
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  color: "rgba(239,228,208,0.4)",
  marginBottom: 6,
  display: "block",
};

export default function DisputeCenterPage() {
  const { address, connected, connect, connecting } = useWalletContext();
  const [openPactId, setOpenPactId] = useState("");
  const [clauseIndex, setClauseIndex] = useState("0");
  const [claim, setClaim] = useState("");
  const [requestedOutcome, setRequestedOutcome] = useState("SETTLE");
  const [openState, setOpenState] = useState<TxState>("idle");
  const [openHash, setOpenHash] = useState<string | null>(null);
  const [openedDisputeId, setOpenedDisputeId] = useState<number | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);

  const [responsePactId, setResponsePactId] = useState("");
  const [responseDisputeId, setResponseDisputeId] = useState("1");
  const [responseText, setResponseText] = useState("");
  const [responseState, setResponseState] = useState<TxState>("idle");
  const [responseHash, setResponseHash] = useState<string | null>(null);
  const [responseError, setResponseError] = useState<string | null>(null);

  async function handleOpenDispute() {
    if (!address) {
      setOpenError("Connect wallet first.");
      return;
    }
    setOpenState("pending");
    setOpenError(null);
    setOpenHash(null);
    setOpenedDisputeId(null);
    try {
      const pactId = Number(openPactId);
      const clause = Number(clauseIndex);
      if (!Number.isInteger(pactId) || pactId <= 0) throw new Error("Enter a valid pact ID.");
      if (!Number.isInteger(clause) || clause < 0) throw new Error("Enter a valid clause index.");
      if (!claim.trim()) throw new Error("Statement is required.");

      const hash = await veilpactWrite.openDispute(address, pactId, clause, claim.trim(), requestedOutcome);
      setOpenHash(hash);

      const pact = await syncPactFromChain(pactId);
      const disputeId = Number(pact.disputeCount);
      setOpenedDisputeId(disputeId);
      setResponsePactId(String(pactId));
      setResponseDisputeId(String(disputeId));
      setOpenState("done");
    } catch (e: unknown) {
      setOpenError(e instanceof Error ? e.message : "Failed to open dispute");
      setOpenState("error");
    }
  }

  async function handleRespond() {
    if (!address) {
      setResponseError("Connect wallet first.");
      return;
    }
    setResponseState("pending");
    setResponseError(null);
    setResponseHash(null);
    try {
      const pactId = Number(responsePactId);
      const disputeId = Number(responseDisputeId);
      if (!Number.isInteger(pactId) || pactId <= 0) throw new Error("Enter a valid pact ID.");
      if (!Number.isInteger(disputeId) || disputeId <= 0) throw new Error("Enter a valid dispute ID.");
      if (!responseText.trim()) throw new Error("Response is required.");

      const responseJson = JSON.stringify({
        response: responseText.trim(),
        submittedBy: address,
        submittedAt: new Date().toISOString(),
      });
      const hash = await veilpactWrite.respondToDispute(address, pactId, disputeId, responseJson);
      setResponseHash(hash);
      await syncPactFromChain(pactId);
      setResponseState("done");
    } catch (e: unknown) {
      setResponseError(e instanceof Error ? e.message : "Failed to respond to dispute");
      setResponseState("error");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl text-parchment tracking-widest">DISPUTE CENTER</h1>
        <p className="text-sm text-muted-parchment mt-1">Open, respond to, and track disputes.</p>
      </div>

      {!connected && (
        <DossierCard gold>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-heading text-lg text-parchment tracking-widest">CONNECT WALLET</p>
              <p className="text-sm text-muted-parchment mt-1">Dispute actions must be signed by Party A or Party B.</p>
            </div>
            <SealButton onClick={connect} loading={connecting}>Connect Wallet</SealButton>
          </div>
        </DossierCard>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <DossierCard>
          <div className="space-y-4">
            <div>
              <p className="font-heading text-xl text-parchment tracking-widest">OPEN DISPUTE</p>
              <p className="text-xs text-muted-parchment mt-1">For Path 2, Party B opens this after the pact is ACTIVE and payment is LOCKED.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label style={labelStyle}>Pact ID</label>
                <input style={inputStyle} inputMode="numeric" placeholder="11" value={openPactId} onChange={e => setOpenPactId(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Clause Index</label>
                <input style={inputStyle} inputMode="numeric" placeholder="0" value={clauseIndex} onChange={e => setClauseIndex(e.target.value)} />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Requested Outcome</label>
              <select style={inputStyle} value={requestedOutcome} onChange={e => setRequestedOutcome(e.target.value)}>
                {OUTCOMES.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Statement</label>
              <textarea style={{ ...inputStyle, minHeight: 130, resize: "vertical" }} placeholder="I delivered the website on day 18..." value={claim} onChange={e => setClaim(e.target.value)} />
            </div>

            {openError && (
              <div className="flex gap-2 border border-redaction-rose/30 bg-redaction-rose/5 rounded-sm p-3">
                <AlertTriangle size={14} className="text-redaction-rose shrink-0 mt-0.5" />
                <p className="text-sm text-redaction-rose">{openError}</p>
              </div>
            )}

            {openState === "done" && (
              <div className="flex gap-2 border border-verdict-green/30 bg-verdict-green/5 rounded-sm p-3">
                <CheckCircle size={14} className="text-verdict-green shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-verdict-green">Dispute opened. Use Dispute ID {openedDisputeId ?? "latest"} for Respond and Reveal Console.</p>
                  {openHash && <a href={`${EXPLORER_URL}/tx/${openHash}`} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-verdict-green underline break-all">{openHash}</a>}
                </div>
              </div>
            )}

            <SealButton variant="gold" loading={openState === "pending"} disabled={!connected || openState === "pending"} onClick={handleOpenDispute}>Open Dispute</SealButton>
          </div>
        </DossierCard>

        <DossierCard>
          <div className="space-y-4">
            <div>
              <p className="font-heading text-xl text-parchment tracking-widest">RESPOND</p>
              <p className="text-xs text-muted-parchment mt-1">The non-opening party responds. Plain text is wrapped as contract-valid JSON.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label style={labelStyle}>Pact ID</label>
                <input style={inputStyle} inputMode="numeric" placeholder="11" value={responsePactId} onChange={e => setResponsePactId(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Dispute ID</label>
                <input style={inputStyle} inputMode="numeric" placeholder="1" value={responseDisputeId} onChange={e => setResponseDisputeId(e.target.value)} />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Response</label>
              <textarea style={{ ...inputStyle, minHeight: 130, resize: "vertical" }} placeholder="The Contact page form does not submit..." value={responseText} onChange={e => setResponseText(e.target.value)} />
            </div>

            {responseError && (
              <div className="flex gap-2 border border-redaction-rose/30 bg-redaction-rose/5 rounded-sm p-3">
                <AlertTriangle size={14} className="text-redaction-rose shrink-0 mt-0.5" />
                <p className="text-sm text-redaction-rose">{responseError}</p>
              </div>
            )}

            {responseState === "done" && (
              <div className="flex gap-2 border border-verdict-green/30 bg-verdict-green/5 rounded-sm p-3">
                <CheckCircle size={14} className="text-verdict-green shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-verdict-green">Response submitted. Continue in Reveal Console with the same pact/dispute IDs.</p>
                  {responseHash && <a href={`${EXPLORER_URL}/tx/${responseHash}`} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-verdict-green underline break-all">{responseHash}</a>}
                </div>
              </div>
            )}

            <SealButton variant="violet" loading={responseState === "pending"} disabled={!connected || responseState === "pending"} onClick={handleRespond}>Submit Response</SealButton>
          </div>
        </DossierCard>
      </div>

      <DossierCard>
        <p className="text-muted-parchment text-sm">
          After opening and responding, use the Reveal Console to submit clause evidence. Dispute IDs are 1-based, so the first dispute on a pact is Dispute ID 1.
        </p>
      </DossierCard>
    </div>
  );
}
