"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle } from "lucide-react";
import { DossierCard } from "@/components/ui/DossierCard";
import { SealButton } from "@/components/ui/SealButton";
import { useWalletContext } from "@/contexts/WalletContext";
import { veilpactRead, veilpactWrite } from "@/lib/genlayer/contract";
import { EXPLORER_URL } from "@/lib/constants";

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

export default function AdminPage() {
  const { address, connected, connect, connecting } = useWalletContext();
  const [loading, setLoading] = useState(true);
  const [admin, setAdmin] = useState<string | null>(null);
  const [resolver, setResolver] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [resolverInput, setResolverInput] = useState("");
  const [resolverTx, setResolverTx] = useState<TxState>("idle");
  const [resolverHash, setResolverHash] = useState<string | null>(null);
  const [resolverError, setResolverError] = useState<string | null>(null);

  const [adminInput, setAdminInput] = useState("");
  const [adminConfirm, setAdminConfirm] = useState("");
  const [adminTx, setAdminTx] = useState<TxState>("idle");
  const [adminHash, setAdminHash] = useState<string | null>(null);
  const [adminError, setAdminError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [a, r] = await Promise.all([veilpactRead.getAdmin(), veilpactRead.getResolver()]);
      setAdmin(String(a));
      setResolver(String(r));
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : "Failed to load admin/resolver");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const isAdmin = connected && address && admin && address.toLowerCase() === admin.toLowerCase();

  async function handleSetResolver() {
    if (!address) return;
    const target = resolverInput.trim();
    if (!target || !target.startsWith("0x") || target.length !== 42) {
      setResolverError("Enter a valid 0x address.");
      setResolverTx("error");
      return;
    }
    setResolverTx("pending");
    setResolverError(null);
    try {
      const hash = await veilpactWrite.setResolver(address as `0x${string}`, target);
      setResolverHash(hash);
      setResolverTx("done");
      await load();
    } catch (e: unknown) {
      setResolverError(e instanceof Error ? e.message : "Failed to set resolver");
      setResolverTx("error");
    }
  }

  async function handleSetAdmin() {
    if (!address) return;
    const target = adminInput.trim();
    if (!target || !target.startsWith("0x") || target.length !== 42) {
      setAdminError("Enter a valid 0x address.");
      setAdminTx("error");
      return;
    }
    if (adminConfirm.trim().toLowerCase() !== target.toLowerCase()) {
      setAdminError("Confirmation address does not match. Retype it exactly to proceed.");
      setAdminTx("error");
      return;
    }
    setAdminTx("pending");
    setAdminError(null);
    try {
      const hash = await veilpactWrite.setAdmin(address as `0x${string}`, target);
      setAdminHash(hash);
      setAdminTx("done");
      await load();
    } catch (e: unknown) {
      setAdminError(e instanceof Error ? e.message : "Failed to set admin");
      setAdminTx("error");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl text-parchment tracking-widest">ADMIN</h1>
        <p className="text-sm text-muted-parchment mt-1">Contract-level roles. Admin only.</p>
      </div>

      {!connected && (
        <DossierCard gold>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-heading text-lg text-parchment tracking-widest">CONNECT WALLET</p>
              <p className="text-sm text-muted-parchment mt-1">Admin actions must be signed by the contract admin.</p>
            </div>
            <SealButton onClick={connect} loading={connecting}>Connect Wallet</SealButton>
          </div>
        </DossierCard>
      )}

      <DossierCard>
        <p className="text-xs text-muted-parchment font-mono uppercase tracking-widest mb-3">Current roles</p>
        {loading ? (
          <p className="text-sm text-muted-parchment">Loading…</p>
        ) : loadError ? (
          <p className="text-sm text-redaction-rose">{loadError}</p>
        ) : (
          <div className="space-y-2">
            <div>
              <p className="text-xs text-muted-parchment">Admin</p>
              <p className="font-mono text-sm text-parchment break-all">{admin}</p>
            </div>
            <div>
              <p className="text-xs text-muted-parchment">Resolver</p>
              <p className="font-mono text-sm text-parchment break-all">{resolver}</p>
            </div>
          </div>
        )}
      </DossierCard>

      {connected && !isAdmin && !loading && !loadError && (
        <DossierCard>
          <div className="flex gap-2">
            <AlertTriangle size={14} className="text-redaction-rose shrink-0 mt-0.5" />
            <p className="text-sm text-redaction-rose">
              Connected wallet is not the contract admin. Admin actions are hidden.
            </p>
          </div>
        </DossierCard>
      )}

      {isAdmin && (
        <>
          <DossierCard>
            <p className="font-heading text-xl text-parchment tracking-widest mb-1">SET RESOLVER</p>
            <p className="text-xs text-muted-parchment mb-4">
              The resolver can call <code>resolver_settle</code> as a last-resort fallback — only for disputes where
              an AI consensus review has already run and left payment undecided (PAUSE_PAYMENT or NO_PAYMENT_ACTION).
              It cannot override a decisive AI verdict.
            </p>
            <label style={labelStyle}>New Resolver Address</label>
            <input style={inputStyle} placeholder="0x..." value={resolverInput} onChange={e => setResolverInput(e.target.value)} />
            <div className="mt-3">
              <SealButton variant="gold" loading={resolverTx === "pending"} disabled={resolverTx === "pending"} onClick={handleSetResolver}>
                Update Resolver
              </SealButton>
            </div>
            {resolverTx === "error" && resolverError && (
              <div className="flex gap-2 mt-3">
                <AlertTriangle size={14} className="text-redaction-rose shrink-0 mt-0.5" />
                <p className="text-sm text-redaction-rose">{resolverError}</p>
              </div>
            )}
            {resolverTx === "done" && resolverHash && (
              <div className="flex items-center gap-2 mt-3">
                <CheckCircle size={14} className="text-verdict-green shrink-0" />
                <a href={`${EXPLORER_URL}/tx/${resolverHash}`} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-verdict-green underline break-all">
                  {resolverHash} ↗
                </a>
              </div>
            )}
          </DossierCard>

          <DossierCard>
            <p className="font-heading text-xl text-parchment tracking-widest mb-1" style={{ color: "#B85C70" }}>SET ADMIN</p>
            <p className="text-xs text-muted-parchment mb-4">
              This transfers admin control itself. If you lose access to the new address, nobody can change the
              admin or resolver again. Retype the address to confirm.
            </p>
            <label style={labelStyle}>New Admin Address</label>
            <input style={inputStyle} placeholder="0x..." value={adminInput} onChange={e => setAdminInput(e.target.value)} />
            <label style={{ ...labelStyle, marginTop: 12 }}>Retype to Confirm</label>
            <input style={inputStyle} placeholder="0x..." value={adminConfirm} onChange={e => setAdminConfirm(e.target.value)} />
            <div className="mt-3">
              <SealButton variant="danger" loading={adminTx === "pending"} disabled={adminTx === "pending"} onClick={handleSetAdmin}>
                Transfer Admin
              </SealButton>
            </div>
            {adminTx === "error" && adminError && (
              <div className="flex gap-2 mt-3">
                <AlertTriangle size={14} className="text-redaction-rose shrink-0 mt-0.5" />
                <p className="text-sm text-redaction-rose">{adminError}</p>
              </div>
            )}
            {adminTx === "done" && adminHash && (
              <div className="flex items-center gap-2 mt-3">
                <CheckCircle size={14} className="text-verdict-green shrink-0" />
                <a href={`${EXPLORER_URL}/tx/${adminHash}`} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-verdict-green underline break-all">
                  {adminHash} ↗
                </a>
              </div>
            )}
          </DossierCard>
        </>
      )}
    </div>
  );
}
