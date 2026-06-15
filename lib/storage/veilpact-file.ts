import type { StoredPact } from "./indexeddb";

export interface VeilpactFile {
  version:      "1.0";
  exportedAt:   number;
  pact:         StoredPact;
}

export function downloadVeilpactFile(pact: StoredPact): void {
  const file: VeilpactFile = {
    version:    "1.0",
    exportedAt: Date.now(),
    pact,
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
