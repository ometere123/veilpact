import type { StoredPact } from "./indexeddb";

export interface VeilpactFile {
  version:      "1.0";
  exportedAt:   number;
  recoveryKeyHex?: string;
  pact:         StoredPact;
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
  const data = JSON.parse(text) as VeilpactFile;
  if (data.version !== "1.0") throw new Error("Unsupported .veilpact file version");
  return data;
}
