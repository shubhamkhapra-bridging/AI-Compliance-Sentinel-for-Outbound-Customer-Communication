import crypto from "crypto";
import { AppError } from "../middleware/errorHandler";

// AES-256-GCM encryption for secrets at rest (tenant LLM API keys).
// The 32-byte key is derived from ENCRYPTION_KEY via sha256 so any-length
// env value works (the env value is 32 ASCII chars, not raw hex).

const ALGO = "aes-256-gcm";

function getKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret) {
    throw new AppError(500, "ENCRYPTION_KEY is not configured", "NO_ENCRYPTION_KEY");
  }
  return crypto.createHash("sha256").update(secret).digest();
}

// Returns "iv:authTag:ciphertext", each part base64-encoded.
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), ciphertext.toString("base64")].join(":");
}

export function decrypt(payload: string): string {
  const key = getKey();
  const [ivB64, tagB64, dataB64] = payload.split(":");
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new AppError(500, "Malformed encrypted payload", "BAD_CIPHERTEXT");
  }
  const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}
