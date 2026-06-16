"use client";

import { useState, useEffect }       from "react";
import { SealButton }                from "@/components/ui/SealButton";
import { HashRibbon }                from "@/components/ui/HashRibbon";
import { getPact, updatePactStatus } from "@/lib/storage/indexeddb";
import { CONTRACT_ADDRESS, EXPLORER_URL } from "@/lib/constants";
import { veilpactRead, veilpactWrite } from "@/lib/genlayer/contract";
import { uploadSharedPact }          from "@/lib/supabase/shared-pacts";
import type { WizardState }          from "@/hooks/usePactWizard";
import { Eye, EyeOff, CheckCircle, ExternalLink, AlertTriangle, Coins, Copy, Check as CheckIcon } from "lucide-react";

function formatGEN(wei: string): string {
  try {
    const n = BigInt(wei || "0");
    const whole = n / BigInt(1e18);
    const frac  = n % BigInt(1e18);
    if (frac === BigInt(0)) return whole.toString();
    const fracStr = frac.toString().padStart(18, "0").replace(/0+$/, "");
    return `${whole}.${fracStr}`;
  } catch { return "0"; }
}

interface Props { wizard: WizardState; address: string; onPactCreated: (pactId: number) => void; }
type TxState = "idle" | "signing" | "awaiting" | "done" | "error";

export function StepSubmit({ wizard, address, onPactCreated }: Props) {
  const { commitments, draft, encryptedId, rootSalt, payment, nextStep, prevStep } = wizard;
  const [txState, setTxState] = useState<TxState>("idle");
  const [txHash,  setTxHash]  = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);
  const [showKey,   setShowKey]   = useState(false);
  const [keyHex,    setKeyHex]    = useState<string | null>(null);
  const [shareUrl,  setShareUrl]  = useState<string | null>(null);
  const [copied,    setCopied]    = useState(false);

  const root      = commitments[0]?.agreementRoot ?? "";
  const meta      = commitments[0]?.metadataHash  ?? "";
  const hashes    = commitments.map(c => c.clauseCommitment);
  const canSubmit = hashes.length > 0 && !!encryptedId && !!address && txState === "idle";

  useEffect(() => {
    if (!encryptedId) return;
    getPact(encryptedId).then(p => { if (p) setKeyHex(p.keyHex); }).catch(() => {});
  }, [encryptedId]);

  async function handleSubmit() {
    if (!address) { setTxError("Wallet not connected"); return; }
    setTxState("signing");
    setTxError(null);
    try {
      setTxState("awaiting");
      const payer          = payment.enabled && payment.payer  ? payment.payer  : address;
      const payee          = payment.enabled && payment.payee  ? payment.payee  : draft.partyB;
      const expectedAmount = payment.enabled ? BigInt(payment.expectedAmount || "0") : BigInt(0);

      const hash = await veilpactWrite.createPact(
        address as `0x${string}`,
        draft.partyB,
        root,
        hashes,
        meta,
        rootSalt ?? "",
        payer,
        payee,
        expectedAmount,
      );
      setTxHash(hash);
      const userPacts = await veilpactRead.getUserPacts(address) as Array<{
        pactId: number;
        agreementRoot: string;
      }>;
      const created = [...userPacts].reverse().find(
        pact => pact.agreementRoot.toLowerCase() === root.toLowerCase(),
      );
      if (!created) throw new Error("Pact finalized, but its on-chain ID could not be resolved.");
      onPactCreated(created.pactId);
      if (encryptedId) await updatePactStatus(encryptedId, "PENDING_COUNTERPARTY", created.pactId);

      // Upload the encrypted package to Supabase so Party B can receive it via share link.
      // The decryption key is NEVER uploaded — it travels in the URL #fragment only.
      const stored = encryptedId ? await getPact(encryptedId) : null;
      if (stored) {
        const shareId = await uploadSharedPact({
          encryptedPkg:   stored.encryptedPkg as import("@/lib/crypto/encryption").EncryptedPackage,
          agreementRoot:  root,
          metadataHash:   meta,
          onChainId:      created.pactId,
          partyA:         address,
          partyB:         draft.partyB,
          clauseCount:    draft.clauses.length,
          paymentEnabled: payment.enabled,
        });
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        setShareUrl(`${origin}/counterparty-review?id=${shareId}#${stored.keyHex}`);
      }

      setTxState("done");
    } catch (e: unknown) {
      setTxError(e instanceof Error ? e.message : "Transaction failed");
      setTxState("error");
    }
  }

  async function copyShareUrl() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const col: React.CSSProperties = {
    flex: 1, border: "1px solid rgba(239,228,208,0.18)",
    backgroundColor: "#14141C", borderRadius: 2, padding: 16,
    display: "flex", flexDirection: "column", gap: 12,
  };
  const lbl: React.CSSProperties = {
    fontFamily: "IBM Plex Mono, monospace", fontSize: "0.6rem",
    textTransform: "uppercase", letterSpacing: "0.12em",
    color: "rgba(239,228,208,0.4)", marginBottom: 2,
  };
  const val: React.CSSProperties = {
    fontFamily: "IBM Plex Mono, monospace", fontSize: "0.7rem",
    color: "#EFE4D0", wordBreak: "break-all",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      <div style={{ border: "1px solid rgba(201,163,91,0.3)", backgroundColor: "rgba(201,163,91,0.05)", borderRadius: 2, padding: 14 }}>
        <p style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "0.75rem", color: "#C9A35B" }}>
          WHAT GOES ON-CHAIN vs. WHAT STAYS LOCAL
        </p>
        <p style={{ fontSize: "0.8rem", color: "rgba(239,228,208,0.7)", marginTop: 6, lineHeight: 1.6 }}>
          Only cryptographic commitments{payment.enabled ? " and payment config" : ""} go to GenLayer via <code>writeContract</code>.
          Clause text, encryption keys, and evidence never touch the chain.
        </p>
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <div style={col}>
          <p style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "0.9rem", letterSpacing: "0.1em", color: "#6E9F7E" }}>ON-CHAIN (PUBLIC)</p>
          <div><p style={lbl}>Party A</p><p style={val}>{draft.partyA}</p></div>
          <div><p style={lbl}>Party B</p><p style={val}>{draft.partyB}</p></div>
          <div><p style={lbl}>Agreement Root</p><HashRibbon label="Agreement Root" hash={root} /></div>
          <div><p style={lbl}>Metadata Hash</p><HashRibbon label="Metadata Hash" hash={meta} /></div>
          <div><p style={lbl}>Clause Count</p><p style={val}>{draft.clauses.length}</p></div>
          {hashes.map((h, i) => (
            <div key={i}><p style={lbl}>Clause {i + 1} Commitment</p><HashRibbon label={`Clause ${i + 1}`} hash={h} /></div>
          ))}
          {payment.enabled && (
            <>
              <div style={{ borderTop: "1px solid rgba(201,163,91,0.2)", paddingTop: 10, marginTop: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <Coins size={12} style={{ color: "#C9A35B" }} />
                  <p style={{ ...lbl, marginBottom: 0, color: "#C9A35B" }}>PAYMENT</p>
                </div>
                <div><p style={lbl}>Payer</p><p style={val}>{payment.payer}</p></div>
                <div><p style={lbl}>Payee</p><p style={val}>{payment.payee}</p></div>
                <div><p style={lbl}>Expected Amount</p><p style={val}>{formatGEN(payment.expectedAmount)} GEN</p></div>
              </div>
            </>
          )}
        </div>

        <div style={{ ...col, borderColor: "rgba(184,92,112,0.2)" }}>
          <p style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "0.9rem", letterSpacing: "0.1em", color: "#B85C70" }}>LOCAL ONLY (PRIVATE)</p>
          <div><p style={lbl}>Clause Texts</p><p style={{ ...val, color: "rgba(239,228,208,0.35)", fontStyle: "italic" }}>Encrypted in IndexedDB</p></div>
          <div>
            <p style={lbl}>Encryption Key</p>
            <button onClick={() => setShowKey(k => !k)} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "rgba(239,228,208,0.4)", fontSize: "0.7rem", fontFamily: "IBM Plex Mono, monospace", padding: 0 }}>
              {showKey ? <EyeOff size={12} /> : <Eye size={12} />} {showKey ? "hide" : "reveal"}
            </button>
            {showKey && keyHex && <p style={{ ...val, color: "#B85C70", marginTop: 4 }}>{keyHex}</p>}
          </div>
          <div><p style={lbl}>Root Salt</p><p style={{ ...val, color: "rgba(239,228,208,0.35)", fontStyle: "italic" }}>Stored in .veilpact backup</p></div>
          <div><p style={lbl}>Clause Salts</p><p style={{ ...val, color: "rgba(239,228,208,0.35)", fontStyle: "italic" }}>{draft.clauses.length} salts, encrypted</p></div>
          <div><p style={lbl}>Canonical Payloads</p><p style={{ ...val, color: "rgba(239,228,208,0.35)", fontStyle: "italic" }}>In .veilpact file for selective reveal</p></div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <p style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "0.65rem", color: "rgba(239,228,208,0.3)" }}>
          Contract: {CONTRACT_ADDRESS || "(not set: deploy first)"}
        </p>
        {CONTRACT_ADDRESS && (
          <a href={`${EXPLORER_URL}/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noopener noreferrer" style={{ color: "rgba(239,228,208,0.3)" }}>
            <ExternalLink size={10} />
          </a>
        )}
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
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ border: "1px solid rgba(110,159,126,0.4)", backgroundColor: "rgba(110,159,126,0.05)", borderRadius: 2, padding: 12, display: "flex", gap: 8, alignItems: "flex-start" }}>
            <CheckCircle size={16} style={{ color: "#6E9F7E", flexShrink: 0 }} />
            <div>
              <p style={{ fontFamily: "Bebas Neue, sans-serif", letterSpacing: "0.1em", color: "#6E9F7E" }}>PACT COMMITTED ON-CHAIN</p>
              <p style={{ fontSize: "0.8rem", color: "rgba(239,228,208,0.64)", marginTop: 4 }}>
                Commitments are on GenLayer StudioNet.
                {payment.enabled && payment.payer.toLowerCase() === address.toLowerCase()
                  ? " Proceed to fund the pact, then share the link below with your counterparty."
                  : " Share the link below with your counterparty to accept."}
              </p>
              {txHash && (
                <a href={`${EXPLORER_URL}/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
                  style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "0.65rem", color: "#6E9F7E", marginTop: 6, wordBreak: "break-all", display: "block", textDecoration: "underline" }}>
                  {txHash} ↗
                </a>
              )}
            </div>
          </div>

          {shareUrl && (
            <div style={{ border: "1px solid rgba(201,163,91,0.4)", backgroundColor: "rgba(201,163,91,0.05)", borderRadius: 2, padding: 14 }}>
              <p style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "0.8rem", letterSpacing: "0.12em", color: "#C9A35B", marginBottom: 8 }}>
                SHARE WITH COUNTERPARTY
              </p>
              <p style={{ fontSize: "0.75rem", color: "rgba(239,228,208,0.55)", marginBottom: 10, lineHeight: 1.5 }}>
                Send this link to <span style={{ color: "#EFE4D0" }}>{draft.partyB}</span>. The decryption key is embedded in the <code>#fragment</code>. It never reaches any server.
                Supabase is used only as an encrypted handoff relay; VeilPact state is read from GenLayer.
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(0,0,0,0.3)", borderRadius: 2, padding: "8px 12px" }}>
                <p style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "0.62rem", color: "#C9A35B", wordBreak: "break-all", flex: 1 }}>
                  {shareUrl}
                </p>
                <button onClick={copyShareUrl} style={{ flexShrink: 0, background: "none", border: "none", cursor: "pointer", color: copied ? "#6E9F7E" : "#C9A35B", padding: 4 }}>
                  {copied ? <CheckIcon size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {txState === "error" && (
        <div style={{ border: "1px solid rgba(184,92,112,0.3)", backgroundColor: "rgba(184,92,112,0.05)", borderRadius: 2, padding: 12, display: "flex", gap: 8 }}>
          <AlertTriangle size={14} style={{ color: "#B85C70", flexShrink: 0, marginTop: 1 }} />
          <p style={{ color: "#B85C70", fontSize: "0.8rem" }}>{txError ?? "Transaction failed."}</p>
        </div>
      )}

      {!encryptedId && (
        <div style={{ border: "1px solid rgba(201,163,91,0.2)", borderRadius: 2, padding: 12 }}>
          <p style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "0.7rem", color: "rgba(201,163,91,0.7)" }}>
            Go back to Step 5 and encrypt your pact before submitting.
          </p>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8 }}>
        <SealButton variant="ghost" onClick={prevStep}>Back</SealButton>
        {txState !== "done" ? (
          <SealButton variant="gold" disabled={!canSubmit} loading={txState === "signing" || txState === "awaiting"} onClick={handleSubmit}>
            {txState === "awaiting" ? "Awaiting Finality…" : "Submit to GenLayer"}
          </SealButton>
        ) : payment.enabled && payment.payer.toLowerCase() === address.toLowerCase() ? (
          <SealButton variant="gold" onClick={nextStep}>Fund Pact →</SealButton>
        ) : (
          <SealButton variant="ghost" onClick={() => window.location.href = "/overview"}>Go to Overview</SealButton>
        )}
      </div>
    </div>
  );
}
