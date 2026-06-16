"use client";

import { useState } from "react";
import { SealButton } from "@/components/ui/SealButton";
import { Download, ShieldCheck, HardDrive, AlertTriangle } from "lucide-react";
import type { WizardState } from "@/hooks/usePactWizard";

interface StepEncryptProps { wizard: WizardState; }

export function StepEncrypt({ wizard }: StepEncryptProps) {
  const [encrypted, setEncrypted] = useState(!!wizard.encryptedId);
  const downloaded = wizard.backupDownloaded;

  const handleEncrypt = async () => {
    const ok = await wizard.encryptAndStore();
    setEncrypted(ok || !!wizard.encryptedId);
  };

  const handleDownload = async () => {
    await wizard.downloadBackup();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ border: "1px solid rgba(239,228,208,0.18)", backgroundColor: "#14141C", borderRadius: 2, padding: 20 }}>
        <div style={{ display: "flex", gap: 10, marginBottom: 16, padding: 12, border: "1px solid rgba(184,92,112,0.2)", borderRadius: 2, backgroundColor: "rgba(184,92,112,0.04)" }}>
          <AlertTriangle size={14} style={{ color: "#B85C70", flexShrink: 0, marginTop: 2 }} />
          <p style={{ fontSize: "0.8rem", color: "#B85C70", lineHeight: 1.5 }}>
            This file is your private recovery copy. If you lose it, VeilPact can still show the pact on GenLayer,
            but you may not be able to reveal or review private clauses from this device.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "12px 16px", border: "1px solid rgba(239,228,208,0.18)", borderRadius: 2, opacity: encrypted ? 0.55 : 1 }}>
            <input
              type="checkbox"
              checked={wizard.rememberUnlockKey}
              disabled={encrypted}
              onChange={e => wizard.setRememberUnlockKey(e.target.checked)}
              style={{ marginTop: 2 }}
            />
            <span>
              <span style={{ display: "block", fontSize: "0.875rem", color: "#EFE4D0" }}>Remember unlock key on this device?</span>
              <span style={{ display: "block", fontSize: "0.7rem", color: "rgba(239,228,208,0.45)", lineHeight: 1.5 }}>
                Default is off. IndexedDB stores the encrypted package; the unlock key stays in your .veilpact recovery file unless you opt in.
              </span>
            </span>
          </label>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", border: "1px solid rgba(239,228,208,0.18)", borderRadius: 2 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <ShieldCheck size={16} style={{ color: encrypted ? "#6E9F7E" : "rgba(239,228,208,0.3)" }} />
              <div style={{ marginLeft: 8 }}>
                <p style={{ fontSize: "0.875rem", color: "#EFE4D0" }}>Encrypt Package</p>
                <p style={{ fontSize: "0.7rem", color: "rgba(239,228,208,0.4)" }}>AES-GCM package cached in IndexedDB</p>
              </div>
            </div>
            {encrypted
              ? <span style={{ fontSize: "0.7rem", color: "#6E9F7E", fontFamily: "IBM Plex Mono, monospace" }}>DONE</span>
              : <SealButton size="sm" loading={wizard.busy} onClick={handleEncrypt}>Encrypt</SealButton>
            }
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", border: "1px solid rgba(239,228,208,0.18)", borderRadius: 2, opacity: encrypted ? 1 : 0.4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Download size={16} style={{ color: downloaded ? "#6E9F7E" : "rgba(239,228,208,0.3)" }} />
              <div style={{ marginLeft: 8 }}>
                <p style={{ fontSize: "0.875rem", color: "#EFE4D0" }}>Download .veilpact Backup Required</p>
                <p style={{ fontSize: "0.7rem", color: "rgba(239,228,208,0.4)" }}>Encrypted package + recovery key; store it safely</p>
              </div>
            </div>
            {downloaded
              ? <span style={{ fontSize: "0.7rem", color: "#6E9F7E", fontFamily: "IBM Plex Mono, monospace" }}>SAVED</span>
              : <SealButton size="sm" variant="ghost" disabled={!encrypted} onClick={handleDownload}>Download</SealButton>
            }
          </div>

          <div style={{ display: "flex", alignItems: "center", padding: "12px 16px", border: "1px solid rgba(239,228,208,0.18)", borderRadius: 2, gap: 8 }}>
            <HardDrive size={16} style={{ color: encrypted ? "#6E9F7E" : "rgba(239,228,208,0.3)" }} />
            <div style={{ marginLeft: 8 }}>
              <p style={{ fontSize: "0.875rem", color: "#EFE4D0" }}>Local Storage</p>
              <p style={{ fontSize: "0.7rem", color: encrypted ? "#6E9F7E" : "rgba(239,228,208,0.4)" }}>
                {encrypted
                  ? `Encrypted package stored. Unlock key ${wizard.rememberUnlockKey ? "remembered by request" : "not stored in IndexedDB"}.`
                  : "Waiting for encryption..."}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <SealButton variant="ghost" onClick={wizard.prevStep}>Back</SealButton>
        <SealButton disabled={!encrypted || !downloaded} onClick={wizard.nextStep}>Continue to Submit</SealButton>
      </div>
    </div>
  );
}
