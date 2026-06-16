"use client";

import { useState, useCallback, useEffect } from "react";
import type { PactDraft, Clause, ClauseCommitment, PaymentSetup } from "@/lib/schemas/pact";
import {
  hashClauseCommitment,
  generateAgreementRoot,
  generateMetadataHash,
  canonicalClausePayload,
} from "@/lib/crypto/commitments";
import { generateEncryptionKey, exportKeyHex, encryptPackage } from "@/lib/crypto/encryption";
import { storePact } from "@/lib/storage/indexeddb";
import { downloadVeilpactFile } from "@/lib/storage/veilpact-file";

function randomHex(bytes = 32): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return "0x" + Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("");
}

export type WizardStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface WizardState {
  step:        WizardStep;
  draft:       PactDraft;
  commitments: ClauseCommitment[];
  encryptedId: string | null;
  rootSalt:    string | null;
  payment:     PaymentSetup;
  error:       string | null;
  busy:        boolean;
  updateBasics:        (fields: Partial<PactDraft>) => void;
  addClause:           (formData?: Record<string, string>) => void;
  updateClause:        (index: number, fields: Partial<Clause>) => void;
  removeClause:        (index: number) => void;
  generateCommitments: () => Promise<void>;
  encryptAndStore:     () => Promise<void>;
  downloadBackup:      () => Promise<void>;
  updatePayment:       (fields: Partial<PaymentSetup>) => void;
  nextStep:            () => void;
  prevStep:            () => void;
  goToStep:            (s: WizardStep) => void;
}

function blankClause(): Clause {
  return {
    type:             "DELIVERABLE",
    sensitivity:      "PRIVATE",
    title:            "",
    text:             "",
    remedyPreference: "RENEGOTIATE",
    evidenceTypes:    [],
    salt:             randomHex(16),
  };
}

function blankDraft(partyA: string): PactDraft {
  return {
    title:        "",
    partyA,
    partyB:       "",
    category:     "FREELANCE",
    description:  "",
    duration:     "",
    jurisdiction: "",
    clauses:      [blankClause()],
    pactSalt:     randomHex(16),
    version:      "1.0",
  };
}

function defaultPayment(partyA: string, partyB: string): PaymentSetup {
  return { enabled: false, payer: partyA, payee: partyB, expectedAmount: "0" };
}

export function usePactWizard(address: string): WizardState {
  const [step,        setStep]        = useState<WizardStep>(1);
  const [draft,       setDraft]       = useState<PactDraft>(() => blankDraft(address));
  const [commitments, setCommitments] = useState<ClauseCommitment[]>([]);
  const [encryptedId, setEncryptedId] = useState<string | null>(null);
  const [rootSalt,    setRootSalt]    = useState<string | null>(null);
  const [payment,     setPayment]     = useState<PaymentSetup>(() => defaultPayment(address, ""));
  const [error,       setError]       = useState<string | null>(null);
  const [busy,        setBusy]        = useState(false);

  // Sync partyA with wallet address when address becomes available after initial mount.
  // The contract uses gl.message.sender_address for partyA in the root — they must match.
  useEffect(() => {
    if (!address) return;
    queueMicrotask(() => {
      setDraft(d => d.partyA === address ? d : { ...d, partyA: address });
      setPayment(p => p.payer === "" ? { ...p, payer: address } : p);
    });
  }, [address]);

  const updateBasics = useCallback((fields: Partial<PactDraft>) => {
    setDraft(d => {
      const updated = { ...d, ...fields };
      // keep payment payer/payee in sync with partyA/B when not explicitly overridden
      if (fields.partyA || fields.partyB) {
        setPayment(p => ({
          ...p,
          payer: p.payer === d.partyA ? (fields.partyA ?? p.payer) : p.payer,
          payee: p.payee === d.partyB ? (fields.partyB ?? p.payee) : p.payee,
        }));
      }
      return updated;
    });
  }, []);

  const updatePayment = useCallback((fields: Partial<PaymentSetup>) => {
    setPayment(p => ({ ...p, ...fields }));
  }, []);

  const addClause = useCallback((formData?: Record<string, string>) => {
    const base = blankClause();
    const clause: Clause = formData ? {
      ...base,
      type:             formData.clauseType         ?? formData.type             ?? base.type,
      title:            formData.clauseTitle        ?? formData.title            ?? base.title,
      text:             formData.clauseText         ?? formData.text             ?? base.text,
      remedyPreference: formData.remedyPreference   ?? base.remedyPreference,
      sensitivity:      (formData.revealSensitivity ?? base.sensitivity) as Clause["sensitivity"],
    } : base;
    setDraft(d => ({ ...d, clauses: [...d.clauses, clause] }));
  }, []);

  const updateClause = useCallback((index: number, fields: Partial<Clause>) => {
    setDraft(d => {
      const clauses = [...d.clauses];
      clauses[index] = { ...clauses[index], ...fields };
      return { ...d, clauses };
    });
  }, []);

  const removeClause = useCallback((index: number) => {
    setDraft(d => ({ ...d, clauses: d.clauses.filter((_, i) => i !== index) }));
  }, []);

  const generateCommitments = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const salt = randomHex(16);
      setRootSalt(salt);

      const meta = await generateMetadataHash(draft);

      const results: ClauseCommitment[] = await Promise.all(
        draft.clauses.map(async (clause, i) => {
          const commitment = await hashClauseCommitment(draft, clause, i);
          return {
            clauseIndex:      i,
            clauseCommitment: commitment,
            canonicalPayload: canonicalClausePayload(draft, clause, i),
          };
        })
      );

      const hashes = results.map(r => r.clauseCommitment);
      // Root generation now requires metadataHash (new root spec)
      const root = await generateAgreementRoot(draft, hashes, salt, meta);

      setCommitments(results.map(r => ({ ...r, agreementRoot: root, metadataHash: meta })));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to generate commitments");
    } finally {
      setBusy(false);
    }
  }, [draft]);

  const encryptAndStore = useCallback(async () => {
    if (commitments.length === 0) { setError("Generate commitments first"); return; }
    setBusy(true);
    setError(null);
    try {
      const key    = await generateEncryptionKey();
      const keyHex = await exportKeyHex(key);
      const pkg    = await encryptPackage({ draft, commitments }, key);
      const root   = commitments[0]?.agreementRoot ?? "";
      const meta   = commitments[0]?.metadataHash  ?? "";
      const hashes = commitments.map(c => c.clauseCommitment);

      const id = crypto.randomUUID();
      await storePact({
        id,
        encryptedPkg:      pkg,
        keyHex,
        agreementRoot:     root,
        metadataHash:      meta,
        partyA:            draft.partyA,
        partyB:            draft.partyB,
        title:             draft.title,
        clauseCount:       draft.clauses.length,
        status:            "COMMITTING",
        onChainId:         null,
        createdAt:         Date.now(),
        downloaded:        false,
        rootSalt:          rootSalt ?? "",
        clauseCommitments: hashes,
        payment:           payment,
      });
      setEncryptedId(id);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Encryption failed");
    } finally {
      setBusy(false);
    }
  }, [commitments, draft, rootSalt, payment]);

  const downloadBackup = useCallback(async () => {
    if (!encryptedId) { setError("Encrypt first"); return; }
    const { getPact } = await import("@/lib/storage/indexeddb");
    const stored = await getPact(encryptedId);
    if (stored) downloadVeilpactFile(stored);
  }, [encryptedId]);

  const MAX_STEP = 8 as const;
  const nextStep = useCallback(() => setStep(s => Math.min(MAX_STEP, s + 1) as WizardStep), []);
  const prevStep = useCallback(() => setStep(s => Math.max(1, s - 1) as WizardStep), []);
  const goToStep = useCallback((s: WizardStep) => setStep(s), []);

  return {
    step, draft, commitments, encryptedId, rootSalt, payment, error, busy,
    updateBasics, updatePayment, addClause, updateClause, removeClause,
    generateCommitments, encryptAndStore, downloadBackup,
    nextStep, prevStep, goToStep,
  };
}
