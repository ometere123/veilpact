import { randomBytes, bytesToHex, hexToBytes } from "./utils";

export interface EncryptedPackage {
  iv:         string;
  ciphertext: string;
  keyHint:    string;
}

export async function generateEncryptionKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
}

export async function exportKeyHex(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey("raw", key);
  return bytesToHex(new Uint8Array(raw));
}

export async function importKeyHex(hex: string): Promise<CryptoKey> {
  const raw = hexToBytes(hex);
  return crypto.subtle.importKey("raw", raw.buffer as ArrayBuffer, { name: "AES-GCM" }, true, ["encrypt", "decrypt"]);
}

export async function encryptPackage(
  payload: object,
  key: CryptoKey,
): Promise<EncryptedPackage> {
  const iv   = randomBytes(12);
  const data = new TextEncoder().encode(JSON.stringify(payload));
  const ct   = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, data as BufferSource);
  return {
    iv:         bytesToHex(iv),
    ciphertext: bytesToHex(new Uint8Array(ct)),
    keyHint:    "AES-GCM-256",
  };
}

export async function decryptPackage(
  pkg: EncryptedPackage,
  key: CryptoKey,
): Promise<unknown> {
  const iv = hexToBytes(pkg.iv);
  const ct = hexToBytes(pkg.ciphertext);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, ct as BufferSource);
  return JSON.parse(new TextDecoder().decode(pt));
}
