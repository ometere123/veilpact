"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, FileUp, HardDrive, RefreshCw } from "lucide-react";
import { DossierCard } from "@/components/ui/DossierCard";
import { SealButton } from "@/components/ui/SealButton";
import {
  getAllPacts,
  importStoredPact,
  updatePactBackupStatus,
  type StoredPact,
} from "@/lib/storage/indexeddb";
import { downloadVeilpactFile, importVeilpactFile } from "@/lib/storage/veilpact-file";

function formatDate(value?: number): string {
  if (!value) return "Never";
  return new Date(value).toLocaleString();
}

function backupState(pact: StoredPact): "ready" | "missing-key" | "not-backed-up" {
  if (!pact.keyHex) return "missing-key";
  if (!pact.downloaded && !pact.lastBackedUpAt) return "not-backed-up";
  return "ready";
}

function statusCopy(pact: StoredPact): { label: string; color: string } {
  const state = backupState(pact);
  if (state === "missing-key") return { label: "Needs recovery file key", color: "#C9A35B" };
  if (state === "not-backed-up") return { label: "Backup not confirmed", color: "#B85C70" };
  return { label: "Recoverable", color: "#6E9F7E" };
}

export default function SettingsPage() {
  const [pacts, setPacts] = useState<StoredPact[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    const rows = await getAllPacts();
    setPacts(rows.sort((a, b) => b.createdAt - a.createdAt));
  }, []);

  useEffect(() => {
    void Promise.resolve().then(refresh);
  }, [refresh]);

  async function exportPact(pact: StoredPact) {
    setBusyId(pact.id);
    setError(null);
    setMessage(null);
    try {
      downloadVeilpactFile(pact);
      await updatePactBackupStatus(pact.id, true);
      setMessage(`Backup downloaded for ${pact.title || pact.id}.`);
      await refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Backup download failed.");
    } finally {
      setBusyId(null);
    }
  }

  async function importBackup(file: File) {
    setError(null);
    setMessage(null);
    try {
      const backup = await importVeilpactFile(file);
      const restored = await importStoredPact({
        ...backup.pact,
        keyHex: backup.recoveryKeyHex ?? backup.pact.keyHex,
        keyRemembered: false,
        downloaded: true,
        lastBackedUpAt: backup.exportedAt,
        backupVersion: backup.version,
      });
      setMessage(`Restored local package for ${restored.title || restored.id}.`);
      await refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Backup import failed.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const recoverable = pacts.filter(pact => backupState(pact) === "ready").length;
  const needsAttention = pacts.length - recoverable;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-heading text-3xl text-parchment tracking-widest">SETTINGS</h1>
          <p className="text-sm text-muted-parchment mt-1">Client-side backups for private clause packages.</p>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".veilpact,application/json"
            className="hidden"
            onChange={event => {
              const file = event.target.files?.[0];
              if (file) void importBackup(file);
            }}
          />
          <SealButton size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
            <FileUp size={13} /> Import Backup
          </SealButton>
          <SealButton size="sm" variant="ghost" onClick={refresh}>
            <RefreshCw size={13} /> Refresh
          </SealButton>
        </div>
      </div>

      <DossierCard>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="font-mono text-[0.62rem] uppercase tracking-widest text-muted-parchment/45">Local packages</p>
            <p className="font-heading text-3xl tracking-widest text-parchment">{pacts.length}</p>
          </div>
          <div>
            <p className="font-mono text-[0.62rem] uppercase tracking-widest text-muted-parchment/45">Recoverable</p>
            <p className="font-heading text-3xl tracking-widest text-verdict-green">{recoverable}</p>
          </div>
          <div>
            <p className="font-mono text-[0.62rem] uppercase tracking-widest text-muted-parchment/45">Needs attention</p>
            <p className="font-heading text-3xl tracking-widest text-sealed-gold">{needsAttention}</p>
          </div>
        </div>
      </DossierCard>

      {message && (
        <div className="flex gap-2 rounded-sm border border-verdict-green/35 bg-verdict-green/5 p-3 text-sm text-verdict-green">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="flex gap-2 rounded-sm border border-redaction-rose/35 bg-redaction-rose/5 p-3 text-sm text-redaction-rose">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <section className="space-y-3">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-parchment/45">IndexedDB Clause Store</p>
        {pacts.length === 0 ? (
          <DossierCard>
            <p className="text-sm text-muted-parchment">No local pact packages found in this browser.</p>
          </DossierCard>
        ) : (
          pacts.map(pact => {
            const status = statusCopy(pact);
            const canExport = !!pact.keyHex;
            return (
              <div key={pact.id} className="rounded-sm border border-bone-border bg-obsidian p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-heading text-lg tracking-widest text-parchment">{pact.title || "UNTITLED PACT"}</p>
                      <span
                        className="rounded-sm border px-2 py-0.5 font-mono text-[0.6rem] uppercase"
                        style={{ borderColor: `${status.color}66`, color: status.color }}
                      >
                        {status.label}
                      </span>
                    </div>
                    <p className="mt-1 font-mono text-[0.68rem] text-muted-parchment/40 break-all">
                      {pact.onChainId ? `Pact #${pact.onChainId}` : "Local only"} - {pact.agreementRoot}
                    </p>
                    <div className="mt-3 grid gap-2 text-xs text-muted-parchment md:grid-cols-3">
                      <span className="flex items-center gap-1.5"><HardDrive size={13} /> Last backup: {formatDate(pact.lastBackedUpAt)}</span>
                      <span>Clauses: {pact.clauseCount}</span>
                      <span>Source: {pact.source ?? "local-cache"}</span>
                    </div>
                    {!canExport && (
                      <p className="mt-3 text-xs leading-5 text-sealed-gold">
                        This browser has the encrypted package but not the unlock key. Import the original .veilpact file to restore export/reveal recovery.
                      </p>
                    )}
                  </div>
                  <SealButton
                    size="sm"
                    variant={canExport ? "outline" : "ghost"}
                    disabled={!canExport}
                    loading={busyId === pact.id}
                    onClick={() => void exportPact(pact)}
                  >
                    <Download size={13} /> Download
                  </SealButton>
                </div>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
