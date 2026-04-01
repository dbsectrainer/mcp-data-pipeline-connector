/**
 * Cybersecurity Operations MCP — Cryptographic Utilities
 * BE EASY ENTERPRISES LLC
 *
 * Secure data handling: hashing, encryption, and token sanitization.
 */

import { createHash, createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const DEFAULT_ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

// ---------------------------------------------------------------------------
// Hashing
// ---------------------------------------------------------------------------

/** Compute a SHA-256 hex digest of arbitrary data. */
export function sha256(data: string | Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

/** Compute a SHA-512 hex digest of arbitrary data. */
export function sha512(data: string | Buffer): string {
  return createHash("sha512").update(data).digest("hex");
}

/** Hash an indicator (IP, domain, etc.) for safe storage / comparison. */
export function hashIndicator(indicator: string): string {
  return sha256(indicator.trim().toLowerCase());
}

// ---------------------------------------------------------------------------
// AES-256-GCM Encryption
// ---------------------------------------------------------------------------

export interface EncryptedPayload {
  ciphertext: string; // hex
  iv: string;         // hex
  authTag: string;    // hex
  algorithm: string;
}

/**
 * Encrypt a plaintext string with AES-256-GCM.
 * @param plaintext - Data to encrypt.
 * @param keyHex   - 256-bit key as a hex string (64 hex chars).
 */
export function encrypt(plaintext: string, keyHex: string): EncryptedPayload {
  validateKeyLength(keyHex);
  const key = Buffer.from(keyHex, "hex");
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(DEFAULT_ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  let ciphertext = cipher.update(plaintext, "utf8", "hex");
  ciphertext += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  return {
    ciphertext,
    iv: iv.toString("hex"),
    authTag,
    algorithm: DEFAULT_ALGORITHM,
  };
}

/**
 * Decrypt a payload previously encrypted with {@link encrypt}.
 */
export function decrypt(payload: EncryptedPayload, keyHex: string): string {
  validateKeyLength(keyHex);
  const key = Buffer.from(keyHex, "hex");
  const iv = Buffer.from(payload.iv, "hex");
  const authTag = Buffer.from(payload.authTag, "hex");
  const decipher = createDecipheriv(DEFAULT_ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);

  let plaintext = decipher.update(payload.ciphertext, "hex", "utf8");
  plaintext += decipher.final("utf8");
  return plaintext;
}

// ---------------------------------------------------------------------------
// Sanitization
// ---------------------------------------------------------------------------

/** Redact secrets from log output — replaces all but last 4 chars with asterisks. */
export function redactSecret(secret: string): string {
  if (secret.length <= 4) return "****";
  return "*".repeat(secret.length - 4) + secret.slice(-4);
}

/** Generate a cryptographically secure random hex string of the given byte length. */
export function secureRandomHex(bytes: number = 32): string {
  return randomBytes(bytes).toString("hex");
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function validateKeyLength(keyHex: string): void {
  if (!/^[0-9a-fA-F]{64}$/.test(keyHex)) {
    throw new Error("Encryption key must be exactly 64 hex characters (256 bits).");
  }
}
