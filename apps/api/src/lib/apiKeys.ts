import crypto from "crypto";

// Public API key generation + hashing for tenant authentication.
// Keys are high-entropy, so a fast sha256 hash is used for an O(1) @unique
// lookup. Only the hash + a display prefix are persisted; the plaintext is
// shown to the caller exactly once at creation time.

export interface GeneratedApiKey {
  plaintext: string;
  prefix: string;
  hash: string;
}

export function hashApiKey(plaintext: string): string {
  return crypto.createHash("sha256").update(plaintext).digest("hex");
}

export function generateApiKey(): GeneratedApiKey {
  const plaintext = `sk_live_${crypto.randomBytes(24).toString("hex")}`;
  return {
    plaintext,
    prefix: plaintext.slice(0, 16),
    hash: hashApiKey(plaintext),
  };
}
