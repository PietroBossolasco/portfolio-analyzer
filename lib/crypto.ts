// Cifratura applicativa dei dati sensibili a riposo (AES-256-GCM).
// I valori vengono cifrati prima della scrittura su DB e decifrati in lettura.
// La chiave deriva da ENCRYPTION_KEY (qualsiasi passphrase) via SHA-256 (32 byte).
import crypto from "crypto";

const RAW = process.env.ENCRYPTION_KEY ?? "dev-insecure-encryption-key-change-me";
const KEY = crypto.createHash("sha256").update(RAW).digest(); // 32 byte
const ALGO = "aes-256-gcm";

/** Cifra una stringa → base64(iv|tag|ciphertext). Null resta null. */
export function encrypt(plain: string | null | undefined): string | null {
  if (plain == null) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, KEY, iv);
  const enc = Buffer.concat([cipher.update(String(plain), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

/** Decifra base64(iv|tag|ciphertext) → stringa. Null/errore → null. */
export function decrypt(payload: string | null | undefined): string | null {
  if (payload == null) return null;
  try {
    const buf = Buffer.from(payload, "base64");
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const data = buf.subarray(28);
    const d = crypto.createDecipheriv(ALGO, KEY, iv);
    d.setAuthTag(tag);
    return Buffer.concat([d.update(data), d.final()]).toString("utf8");
  } catch {
    return null;
  }
}

/** Cifra un numero (come stringa). */
export function encNum(n: number | null | undefined): string | null {
  return n == null ? null : encrypt(String(n));
}

/** Decifra un numero. */
export function decNum(s: string | null | undefined): number | null {
  const v = decrypt(s);
  if (v == null) return null;
  const n = parseFloat(v);
  return Number.isNaN(n) ? null : n;
}

/** HMAC deterministico per consentire il lookup di un valore cifrato (es. email). */
export function blindIndex(value: string): string {
  return crypto.createHmac("sha256", KEY).update(value.trim().toLowerCase()).digest("hex");
}
