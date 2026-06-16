"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams }    from "next/navigation";
import { useWalletContext }              from "@/contexts/WalletContext";
import { SealButton }                from "@/components/ui/SealButton";
import { HashRibbon }                from "@/components/ui/HashRibbon";
import { fetchSharedPact, type SharedPactRow } from "@/lib/supabase/shared-pacts";
import { importKeyHex, decryptPackage } from "@/lib/crypto/encryption";
import { veilpactWrite }             from "@/lib/genlayer/contract";
import { syncPactFromChain }         from "@/lib/genlayer/sync";
import { getPactByOnChainId, storePact, type StoredPact } from "@/lib/storage/indexeddb";
import { downloadVeilpactFile }      from "@/lib/storage/veilpact-file";
import { EXPLORER_URL }              from "@/lib/constants";
import type { PactDraft, ClauseCommitment } from "@/lib/schemas/pact";
import { CheckCircle, AlertTriangle, ShieldCheck, Coins } from "lucide-react";

type LoadState = "idle" | "loading" | "ready" | "error";
type TxState   = "idle" | "awaiting" | "done" | "error";

interface DecryptedPkg {
  draft:       PactDraft;
  commitments: ClauseCommitment[];
}

function formatGEN(wei: string | bigint): string {
  try {
    const n = BigInt(wei);
    const whole = n / BigInt(1e18);
    const frac  = n % BigInt(1e18);
    if (frac === BigInt(0)) return whole.toString();
    return `${whole}.${frac.toString().padStart(18, "0").replace(/0+$/, "")}`;
  } catch { return "0"; }
}

function readShareKeyFromFragment(): string {
  if (typeof window === "undefined") return "";
  const fragment = window.location.hash.replace(/^#/, "");
  if (!fragment) return "";
  if (fragment.startsWith("key=")) {
    return new URLSearchParams(fragment).get("key") ?? "";
  }
  return decodeURIComponent(fragment);
}

function CounterpartyReviewInner() {
  const { address, connected, connect } = useWalletContext();
  const searchParams = useSearchParams();
  const router = useRouter();
  const shareId = searchParams.get("id");

  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pkg,       setPkg]       = useState<DecryptedPkg | null>(null);
  const [sharedRow, setSharedRow] = useState<SharedPactRow | null>(null);
  const [keyHex,    setKeyHex]    = useState("");
  const [onChainId, setOnChainId] = useState<number | null>(null);
  const [paymentEnabled, setPaymentEnabled] = useState(false);
  const [rememberUnlockKey, setRememberUnlockKey] = useState(false);

  const [txState,   setTxState]   = useState<TxState>("idle");
  const [txHash,    setTxHash]    = useState<string | null>(null);
  const [txError,   setTxError]   = useState<string | null>(null);

  // Load and decrypt the pact package when the page mounts.
  // The decryption key comes from window.location.hash — it never reaches the server.
  useEffect(() => {
    if (!shareId) return;
    let alive = true;

    async function load() {
      try {
        setLoadState("loading");
        const keyHex = readShareKeyFromFragment();
        if (!keyHex) throw new Error("No decryption key in URL. Make sure you opened the full share link.");

        const row = await fetchSharedPact(shareId!);
        const key = await importKeyHex(keyHex);
        const decrypted = await decryptPackage(row.encrypted_pkg, key) as DecryptedPkg;

        if (!alive) return;
        setPkg(decrypted);
        setSharedRow(row);
        setKeyHex(keyHex);
        setOnChainId(row.on_chain_id);
        setPaymentEnabled(row.payment_enabled);
        setLoadState("ready");
      } catch (e: unknown) {
        if (!alive) return;
        setLoadError(e instanceof Error ? e.message : "Failed to load pact.");
        setLoadState("error");
      }
    }

    void Promise.resolve().then(load);
    return () => {
      alive = false;
    };
  }, [shareId]);

  async function handleAccept() {
    if (!address || onChainId === null || !pkg || !sharedRow || !keyHex) return;
    setTxState("awaiting");
    setTxError(null);
    try {
      const expectedPartyB = (sharedRow.party_b || pkg.draft.partyB).toLowerCase();
      if (address.toLowerCase() !== expectedPartyB) {
        throw new Error(`This share is addressed to ${expectedPartyB}. Switch to that wallet before accepting.`);
      }
      const hash = await veilpactWrite.acceptPact(address as `0x${string}`, onChainId);
      setTxHash(hash);
      const chainPact = await syncPactFromChain(onChainId);
      const existing = await getPactByOnChainId(onChainId);
      const localId = existing?.id ?? `pact-${onChainId}-${address.toLowerCase()}`;
      const localPact: StoredPact = {
        id: localId,
        encryptedPkg: sharedRow.encrypted_pkg,
        keyHex: rememberUnlockKey ? keyHex : undefined,
        keyRemembered: rememberUnlockKey,
        agreementRoot: chainPact.agreementRoot,
        metadataHash: chainPact.metadataHash,
        partyA: chainPact.partyA,
        partyB: chainPact.partyB,
        title: pkg.draft.title || `Pact #${onChainId}`,
        clauseCount: chainPact.clauseCount,
        status: chainPact.status,
        onChainId,
        createdAt: chainPact.createdAt ? chainPact.createdAt * 1000 : Date.now(),
        downloaded: true,
        rootSalt: chainPact.rootSalt || pkg.draft.pactSalt,
        clauseCommitments: chainPact.clauseCommitments ?? pkg.commitments.map(c => c.clauseCommitment),
        payment: pkg.draft.payment ?? null,
        source: "accepted-counterparty",
        role: "partyB",
        counterparty: chainPact.partyA,
        localPackageId: localId,
        lastSyncedAt: Date.now(),
        chainSnapshot: chainPact,
      };
      await storePact(localPact);
      downloadVeilpactFile(localPact, keyHex);
      setTxState("done");
      router.push(`/pacts/${onChainId}`);
    } catch (e: unknown) {
      setTxError(e instanceof Error ? e.message : "Transaction failed");
      setTxState("error");
    }
  }

  // ── Styles ──────────────────────────────────────────────────────────────────
  const card: React.CSSProperties = {
    border: "1px solid rgba(239,228,208,0.18)",
    backgroundColor: "#14141C", borderRadius: 2, padding: 16,
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
  const shareExpiryLabel = sharedRow?.expires_at ? new Date(sharedRow.expires_at).toLocaleString() : null;
  const expectedCounterparty = sharedRow?.party_b ?? pkg?.draft.partyB ?? "";

  // ── Render ──────────────────────────────────────────────────────────────────
  if (!shareId) {
    return (
      <div style={{ maxWidth: 540 }}>
        <h1 style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "2rem", letterSpacing: "0.1em", color: "#EFE4D0", marginBottom: 16 }}>
          COUNTERPARTY REVIEW
        </h1>
        <div style={{ ...card, borderColor: "rgba(184,92,112,0.3)" }}>
          <p style={{ color: "#B85C70", fontSize: "0.875rem" }}>
            No pact share link found. Open the full link your counterparty sent you.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600, display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "2rem", letterSpacing: "0.1em", color: "#EFE4D0" }}>
          COUNTERPARTY REVIEW
        </h1>
        <p style={{ color: "rgba(239,228,208,0.64)", fontSize: "0.875rem", marginTop: 4 }}>
          Review the private pact and accept it on-chain.
        </p>
      </div>

      {/* Privacy notice */}
      <div style={{ border: "1px solid rgba(201,163,91,0.3)", backgroundColor: "rgba(201,163,91,0.05)", borderRadius: 2, padding: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
          <ShieldCheck size={13} style={{ color: "#C9A35B" }} />
          <p style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "0.65rem", color: "#C9A35B" }}>
            DECRYPTED LOCALLY - KEY NEVER SENT TO ANY SERVER
          </p>
        </div>
        <p style={{ fontSize: "0.75rem", color: "rgba(239,228,208,0.55)", lineHeight: 1.5 }}>
          The clause text was decrypted in your browser using the key embedded in the share link.
          Anyone with this full link can decrypt the shared pact package. Only use it from the intended counterparty wallet.
          Supabase only relays the encrypted package for demo sharing. VeilPact state is read from GenLayer, and private terms remain encrypted client-side.
          {shareExpiryLabel ? ` Relay copy expires: ${shareExpiryLabel}.` : ""}
        </p>
      </div>

      {/* Loading state */}
      {loadState === "loading" && (
        <div style={card}>
          <p style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "0.75rem", color: "rgba(239,228,208,0.5)" }}>
            Fetching and decrypting pact…
          </p>
        </div>
      )}

      {loadState === "error" && (
        <div style={{ ...card, borderColor: "rgba(184,92,112,0.3)", backgroundColor: "rgba(184,92,112,0.05)" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <AlertTriangle size={14} style={{ color: "#B85C70", flexShrink: 0, marginTop: 1 }} />
            <p style={{ color: "#B85C70", fontSize: "0.8rem" }}>{loadError}</p>
          </div>
        </div>
      )}

      {loadState === "ready" && pkg && (
        <>
          {/* Pact summary */}
          <div style={card}>
            <p style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "1rem", letterSpacing: "0.1em", color: "#EFE4D0", marginBottom: 14 }}>
              {pkg.draft.title || "UNTITLED PACT"}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><p style={lbl}>Party A (Creator)</p><p style={val}>{pkg.draft.partyA}</p></div>
              <div><p style={lbl}>Party B (Expected Wallet)</p><p style={val}>{expectedCounterparty || pkg.draft.partyB}</p></div>
              <div><p style={lbl}>Category</p><p style={val}>{pkg.draft.category}</p></div>
              <div><p style={lbl}>Jurisdiction</p><p style={val}>{pkg.draft.jurisdiction || "-"}</p></div>
              <div><p style={lbl}>Duration</p><p style={val}>{pkg.draft.duration || "-"}</p></div>
              <div><p style={lbl}>On-chain Pact ID</p><p style={val}>{onChainId ?? "-"}</p></div>
            </div>
            {pkg.draft.description && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(239,228,208,0.1)" }}>
                <p style={lbl}>Description</p>
                <p style={{ fontSize: "0.8rem", color: "rgba(239,228,208,0.7)", lineHeight: 1.6 }}>{pkg.draft.description}</p>
              </div>
            )}
          </div>

          {/* Agreement root */}
          <div style={card}>
            <p style={{ ...lbl, marginBottom: 8 }}>Agreement Root (on-chain)</p>
            <HashRibbon label="Agreement Root" hash={pkg.commitments[0]?.agreementRoot ?? ""} />
          </div>

          {/* Clauses */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ fontFamily: "Bebas Neue, sans-serif", letterSpacing: "0.1em", color: "rgba(239,228,208,0.6)", fontSize: "0.8rem" }}>
              CLAUSES ({pkg.draft.clauses.length})
            </p>
            {pkg.draft.clauses.map((clause, i) => (
              <div key={i} style={card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <p style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "0.75rem", color: "#EFE4D0" }}>
                    {i + 1}. {clause.title || `Clause ${i + 1}`}
                  </p>
                  <div style={{ display: "flex", gap: 6 }}>
                    <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "0.55rem", padding: "2px 6px", borderRadius: 2, backgroundColor: "rgba(110,159,126,0.15)", color: "#6E9F7E" }}>
                      {clause.type}
                    </span>
                    <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "0.55rem", padding: "2px 6px", borderRadius: 2, backgroundColor: "rgba(201,163,91,0.1)", color: "#C9A35B" }}>
                      {clause.sensitivity}
                    </span>
                  </div>
                </div>
                <p style={{ fontSize: "0.8rem", color: "rgba(239,228,208,0.7)", lineHeight: 1.6, marginBottom: 8 }}>
                  {clause.text}
                </p>
                <div>
                  <p style={lbl}>Commitment</p>
                  <HashRibbon label={`Clause ${i + 1}`} hash={pkg.commitments[i]?.clauseCommitment ?? ""} />
                </div>
              </div>
            ))}
          </div>

          {/* Payment */}
          {paymentEnabled && pkg.draft.payment?.enabled && (
            <div style={{ ...card, borderColor: "rgba(201,163,91,0.3)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                <Coins size={14} style={{ color: "#C9A35B" }} />
                <p style={{ fontFamily: "Bebas Neue, sans-serif", letterSpacing: "0.1em", color: "#C9A35B" }}>GEN SETTLEMENT</p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <div><p style={lbl}>Payer</p><p style={val}>{pkg.draft.payment.payer}</p></div>
                <div><p style={lbl}>Payee</p><p style={val}>{pkg.draft.payment.payee}</p></div>
                <div><p style={lbl}>Amount</p><p style={val}>{formatGEN(pkg.draft.payment.expectedAmount)} GEN</p></div>
              </div>
            </div>
          )}

          <label style={{ ...card, display: "flex", gap: 10, alignItems: "flex-start" }}>
            <input
              type="checkbox"
              checked={rememberUnlockKey}
              onChange={e => setRememberUnlockKey(e.target.checked)}
              style={{ marginTop: 2 }}
            />
            <span>
              <span style={{ display: "block", fontSize: "0.875rem", color: "#EFE4D0" }}>Remember unlock key on this device?</span>
              <span style={{ display: "block", fontSize: "0.75rem", color: "rgba(239,228,208,0.55)", lineHeight: 1.5 }}>
                Default is off. After accept, VeilPact downloads a .veilpact recovery file so this browser cache is not your only copy.
              </span>
            </span>
          </label>

          {/* Wallet guard */}
          {!connected && (
            <div style={{ ...card, borderColor: "rgba(201,163,91,0.3)", textAlign: "center" }}>
              <p style={{ color: "rgba(239,228,208,0.64)", fontSize: "0.875rem", marginBottom: 12 }}>
                Connect your wallet to accept this pact.
              </p>
              <SealButton onClick={connect}>Connect Wallet</SealButton>
            </div>
          )}

          {/* Address mismatch warning */}
          {connected && address && (expectedCounterparty || pkg.draft.partyB) &&
            address.toLowerCase() !== (expectedCounterparty || pkg.draft.partyB).toLowerCase() && (
            <div style={{ ...card, borderColor: "rgba(201,163,91,0.4)", backgroundColor: "rgba(201,163,91,0.05)" }}>
              <div style={{ display: "flex", gap: 8 }}>
                <AlertTriangle size={14} style={{ color: "#C9A35B", flexShrink: 0, marginTop: 1 }} />
                <p style={{ color: "#C9A35B", fontSize: "0.8rem" }}>
                  This pact is addressed to <strong>{expectedCounterparty || pkg.draft.partyB}</strong> but your connected wallet is <strong>{address}</strong>.
                  Switch to the correct wallet before accepting.
                </p>
              </div>
            </div>
          )}

          {/* Tx states */}
          {txState === "error" && (
            <div style={{ ...card, borderColor: "rgba(184,92,112,0.3)", backgroundColor: "rgba(184,92,112,0.05)" }}>
              <div style={{ display: "flex", gap: 8 }}>
                <AlertTriangle size={14} style={{ color: "#B85C70", flexShrink: 0, marginTop: 1 }} />
                <p style={{ color: "#B85C70", fontSize: "0.8rem" }}>{txError}</p>
              </div>
            </div>
          )}

          {txState === "done" && (
            <div style={{ ...card, borderColor: "rgba(110,159,126,0.4)", backgroundColor: "rgba(110,159,126,0.05)" }}>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <CheckCircle size={16} style={{ color: "#6E9F7E", flexShrink: 0 }} />
                <div>
                  <p style={{ fontFamily: "Bebas Neue, sans-serif", letterSpacing: "0.1em", color: "#6E9F7E" }}>PACT ACCEPTED</p>
                  <p style={{ fontSize: "0.8rem", color: "rgba(239,228,208,0.64)", marginTop: 4 }}>
                    You are now bound to this pact on GenLayer.
                    {paymentEnabled ? " The pact will activate once funded." : " The pact is now ACTIVE."}
                  </p>
                  {txHash && (
                    <a href={`${EXPLORER_URL}/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
                      style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "0.65rem", color: "#6E9F7E", marginTop: 6, wordBreak: "break-all", display: "block", textDecoration: "underline" }}>
                      {txHash} ↗
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Accept button */}
          {connected && txState !== "done" && (
            <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 4 }}>
              <SealButton
                variant="gold"
                disabled={
                  txState === "awaiting" ||
                  onChainId === null ||
                  (!!address && !!pkg.draft.partyB &&
                    address.toLowerCase() !== (expectedCounterparty || pkg.draft.partyB).toLowerCase())
                }
                loading={txState === "awaiting"}
                onClick={handleAccept}
              >
                {txState === "awaiting" ? "Awaiting Finality…" : "Accept Pact on GenLayer"}
              </SealButton>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function CounterpartyReviewPage() {
  return (
    <Suspense fallback={
      <div style={{ maxWidth: 540 }}>
        <h1 style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "2rem", letterSpacing: "0.1em", color: "#EFE4D0", marginBottom: 16 }}>
          COUNTERPARTY REVIEW
        </h1>
        <p style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "0.75rem", color: "rgba(239,228,208,0.5)" }}>
          Loading…
        </p>
      </div>
    }>
      <CounterpartyReviewInner />
    </Suspense>
  );
}
