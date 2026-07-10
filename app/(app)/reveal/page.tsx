"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle } from "lucide-react";
import { DossierCard } from "@/components/ui/DossierCard";
import { SealButton } from "@/components/ui/SealButton";
import { useWalletContext } from "@/contexts/WalletContext";
import { veilpactWrite } from "@/lib/genlayer/contract";
import { syncPactFromChain, syncUserPactsFromChain, type SyncedPact } from "@/lib/genlayer/sync";
import { decryptPackage, importKeyHex, type EncryptedPackage } from "@/lib/crypto/encryption";
import { canonicalClausePayload } from "@/lib/crypto/commitments";
import { EXPLORER_URL } from "@/lib/constants";
import type { ClauseCommitment, PactDraft } from "@/lib/schemas/pact";

type TxState = "idle" | "pending" | "done" | "error";

interface DecryptedPkg {
  draft: PactDraft;
  commitments: ClauseCommitment[];
}

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

export default function RevealConsolePage() {
  const { address, connected, connect, connecting } = useWalletContext();
  const [pacts, setPacts] = useState<SyncedPact[]>([]);
  const [pactId, setPactId] = useState("");
  const [disputeId, setDisputeId] = useState("1");
  const [clauseIndex, setClauseIndex] = useState("0");
  const [unlockKey, setUnlockKey] = useState("");
  const [evidence, setEvidence] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [evidenceSha256, setEvidenceSha256] = useState("");
  const [hashing, setHashing] = useState(false);
  const [txState, setTxState] = useState<TxState>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const syncPacts = useCallback(async () => {
    if (!address) return;
    setPacts(await syncUserPactsFromChain(address));
  }, [address]);

  useEffect(() => {
    if (!connected) return;
    void Promise.resolve().then(syncPacts).catch(() => {});
  }, [connected, syncPacts]);

  async function handleReveal() {
    if (!address) {
      setError("Connect wallet first.");
      return;
    }
    setTxState("pending");
    setError(null);
    setTxHash(null);
    try {
      const pid = Number(pactId);
      const did = Number(disputeId);
      const cidx = Number(clauseIndex);
      if (!Number.isInteger(pid) || pid <= 0) throw new Error("Enter a valid pact ID.");
      if (!Number.isInteger(did) || did <= 0) throw new Error("Enter a valid dispute ID.");
      if (!Number.isInteger(cidx) || cidx < 0) throw new Error("Enter a valid clause index.");
      if (!evidence.trim()) throw new Error("Evidence is required.");

      const item = pacts.find(p => p.pactId === pid);
      if (!item?.local?.encryptedPkg) {
        throw new Error("Encrypted local package missing. Import your .veilpact backup or reopen the share link first.");
      }
      const keyHex = item.local.keyHex?.trim() || unlockKey.trim();
      if (!keyHex) {
        throw new Error("Unlock key is not remembered on this device. Paste the recovery key from your .veilpact backup or reopen the original share link.");
      }

      const key = await importKeyHex(keyHex);
      const pkg = await decryptPackage(item.local.encryptedPkg as EncryptedPackage, key) as DecryptedPkg;
      const clause = pkg.draft.clauses[cidx];
      if (!clause) throw new Error("Clause index not found in local package.");

      const clausePayloadJson = canonicalClausePayload(pkg.draft, clause, cidx);
      const url = evidenceUrl.trim();
      const urlHash = evidenceSha256.trim().toLowerCase();
      if (url) {
        if (!url.startsWith("https://")) throw new Error("Evidence URL must be https.");
        if (!/^0x[0-9a-f]{64}$/.test(urlHash)) throw new Error("Evidence SHA-256 must be 0x + 64 hex chars. Use Compute Hash or paste the digest.");
      }
      const evidenceBundleJson = JSON.stringify({
        claim: evidence.trim(),
        requestedOutcome: "SETTLE",
        submittedBy: address,
        submittedAt: new Date().toISOString(),
        ...(url ? { evidenceUrl: url, evidenceSha256: urlHash } : {}),
      });

      const hash = await veilpactWrite.revealClauseForDispute(address, pid, did, cidx, clausePayloadJson, evidenceBundleJson);
      setTxHash(hash);
      await syncPactFromChain(pid);
      await syncPacts();
      setTxState("done");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Reveal failed");
      setTxState("error");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl text-parchment tracking-widest">REVEAL CONSOLE</h1>
        <p className="text-sm text-muted-parchment mt-1">Selectively reveal one local clause for a GenLayer dispute.</p>
      </div>

      {!connected && (
        <DossierCard gold>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-heading text-lg text-parchment tracking-widest">CONNECT WALLET</p>
              <p className="text-sm text-muted-parchment mt-1">Reveal must be signed by a pact party.</p>
            </div>
            <SealButton onClick={connect} loading={connecting}>Connect Wallet</SealButton>
          </div>
        </DossierCard>
      )}

      <DossierCard>
        <div className="space-y-4">
          <div className="flex justify-between items-center gap-4">
            <div>
              <p className="font-heading text-xl text-parchment tracking-widest">REVEAL CLAUSE</p>
              <p className="text-xs text-muted-parchment mt-1">The clause payload is rebuilt from IndexedDB and verified against the on-chain commitment.</p>
            </div>
            <SealButton size="sm" variant="outline" onClick={syncPacts} disabled={!connected}>Sync from GenLayer</SealButton>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label style={labelStyle}>Pact ID</label>
              <input style={inputStyle} inputMode="numeric" placeholder="11" value={pactId} onChange={e => setPactId(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Dispute ID</label>
              <input style={inputStyle} inputMode="numeric" placeholder="1" value={disputeId} onChange={e => setDisputeId(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Clause Index</label>
              <input style={inputStyle} inputMode="numeric" placeholder="0" value={clauseIndex} onChange={e => setClauseIndex(e.target.value)} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Recovery / Unlock Key</label>
            <input
              style={inputStyle}
              placeholder="Optional if this browser remembered the key. Otherwise paste 0x..."
              value={unlockKey}
              onChange={e => setUnlockKey(e.target.value)}
            />
            <p className="text-xs text-muted-parchment mt-1">
              This key is used for this reveal only and is not saved unless you explicitly remembered it during create/accept.
            </p>
          </div>

          <div>
            <label style={labelStyle}>Evidence</label>
            <textarea
              style={{ ...inputStyle, minHeight: 150, resize: "vertical" }}
              placeholder="Party B evidence: Deployment timestamp day 18..."
              value={evidence}
              onChange={e => setEvidence(e.target.value)}
            />
          </div>

          <div>
            <label style={labelStyle}>Evidence URL (optional — verified on-chain by GenLayer validators)</label>
            <input
              style={inputStyle}
              placeholder="https://raw.githubusercontent.com/you/repo/<commit>/evidence.pdf"
              value={evidenceUrl}
              onChange={e => setEvidenceUrl(e.target.value)}
            />
            <p className="text-xs text-muted-parchment mt-1">
              Use a commit-pinned URL whose content never changes. Every GenLayer validator fetches it independently and must agree on the SHA-256 before a VERIFIED status is stored.
            </p>
          </div>

          {evidenceUrl.trim() && (
            <div>
              <label style={labelStyle}>Evidence SHA-256</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  style={{ ...inputStyle, flex: 1 }}
                  placeholder="0x… (64 hex chars)"
                  value={evidenceSha256}
                  onChange={e => setEvidenceSha256(e.target.value)}
                />
                <SealButton size="sm" variant="outline" loading={hashing} disabled={hashing} onClick={async () => {
                  setHashing(true);
                  setError(null);
                  try {
                    const res = await fetch(evidenceUrl.trim());
                    if (!res.ok) throw new Error(`Fetch failed: HTTP ${res.status}`);
                    const buf = await res.arrayBuffer();
                    const digest = await crypto.subtle.digest("SHA-256", buf);
                    setEvidenceSha256("0x" + Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join(""));
                  } catch (e: unknown) {
                    setError(e instanceof Error ? `Could not hash URL in browser (CORS?): ${e.message}. Compute the SHA-256 yourself and paste it.` : "Hashing failed");
                  } finally {
                    setHashing(false);
                  }
                }}>
                  Compute Hash
                </SealButton>
              </div>
            </div>
          )}

          {error && (
            <div className="flex gap-2 border border-redaction-rose/30 bg-redaction-rose/5 rounded-sm p-3">
              <AlertTriangle size={14} className="text-redaction-rose shrink-0 mt-0.5" />
              <p className="text-sm text-redaction-rose">{error}</p>
            </div>
          )}

          {txState === "done" && (
            <div className="flex gap-2 border border-verdict-green/30 bg-verdict-green/5 rounded-sm p-3">
              <CheckCircle size={14} className="text-verdict-green shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-verdict-green">Clause revealed and submitted for GenLayer review.</p>
                {txHash && <a href={`${EXPLORER_URL}/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-verdict-green underline break-all">{txHash}</a>}
              </div>
            </div>
          )}

          <SealButton variant="gold" loading={txState === "pending"} disabled={!connected || txState === "pending"} onClick={handleReveal}>
            Reveal Clause for Dispute
          </SealButton>
        </div>
      </DossierCard>

      <DossierCard>
        <p className="text-muted-parchment text-sm">
          GenLayer is the source of truth for dispute state. IndexedDB supplies the private clause payload needed for selective reveal.
        </p>
      </DossierCard>
    </div>
  );
}
