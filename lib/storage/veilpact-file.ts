import type { StoredPact } from "./indexeddb";

export interface VeilpactFile {
  version:      "1.0";
  exportedAt:   number;
  recoveryKeyHex?: string;
  pact:         StoredPact;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Invalid .veilpact file: missing ${label}.`);
  }
  return value;
}

function validateVeilpactFile(data: unknown): VeilpactFile {
  if (!isRecord(data) || data.version !== "1.0" || !isRecord(data.pact)) {
    throw new Error("Unsupported or invalid .veilpact file.");
  }
  const pact = data.pact;
  requireString(pact.id, "pact id");
  requireString(pact.agreementRoot, "agreement root");
  requireString(pact.metadataHash, "metadata hash");
  requireString(pact.partyA, "party A");
  requireString(pact.partyB, "party B");
  requireString(pact.title, "title");
  if (!isRecord(pact.encryptedPkg)) {
    throw new Error("Invalid .veilpact file: missing encrypted package.");
  }
  if (data.recoveryKeyHex !== undefined && typeof data.recoveryKeyHex !== "string") {
    throw new Error("Invalid .veilpact file: recovery key must be text.");
  }
  return data as unknown as VeilpactFile;
}

export function downloadVeilpactFile(pact: StoredPact, recoveryKeyHex?: string): void {
  const keyHex = recoveryKeyHex ?? pact.keyHex;
  if (!keyHex) {
    throw new Error("Cannot export .veilpact backup without the unlock key.");
  }

  const file: VeilpactFile = {
    version:    "1.0",
    exportedAt: Date.now(),
    recoveryKeyHex: keyHex,
    pact: {
      ...pact,
      keyHex,
      keyRemembered: false,
      downloaded: true,
      lastBackedUpAt: Date.now(),
      backupVersion: "1.0",
    },
  };
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `veilpact-${pact.id.slice(0, 8)}.veilpact`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importVeilpactFile(file: File): Promise<VeilpactFile> {
  const text = await file.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Invalid .veilpact file: file is not valid JSON.");
  }
  return validateVeilpactFile(data);
}
