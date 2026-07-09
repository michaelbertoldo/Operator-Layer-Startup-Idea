/**
 * encryption.ts — AES-256-GCM encryption for credential storage.
 *
 * Credentials are encrypted at rest. The encryption key is derived from
 * an environment variable (OL_ENCRYPTION_KEY). In production, use a proper
 * key management service (AWS KMS, Vault, etc.).
 */

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits

/**
 * Get the encryption key from environment.
 * In production, use a proper KMS or secrets manager.
 */
function getEncryptionKey(): Buffer {
  const key = process.env.OL_ENCRYPTION_KEY;
  if (!key) {
    throw new Error(
      "OL_ENCRYPTION_KEY environment variable is required for credential encryption",
    );
  }

  // Ensure key is exactly 32 bytes (256 bits)
  const keyBuffer = Buffer.from(key, "hex");
  if (keyBuffer.length !== KEY_LENGTH) {
    throw new Error(
      `OL_ENCRYPTION_KEY must be ${KEY_LENGTH * 2} hex characters (${KEY_LENGTH} bytes)`,
    );
  }

  return keyBuffer;
}

/**
 * Encrypt a credential value using AES-256-GCM.
 * Returns the encrypted value and IV as hex strings.
 */
export function encryptCredential(plaintext: string): {
  encryptedValue: string;
  iv: string;
} {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();
  const encryptedValue = encrypted + authTag.toString("hex");

  return {
    encryptedValue,
    iv: iv.toString("hex"),
  };
}

/**
 * Decrypt a credential value using AES-256-GCM.
 */
export function decryptCredential(
  encryptedValue: string,
  iv: string,
): string {
  const key = getEncryptionKey();
  const ivBuffer = Buffer.from(iv, "hex");

  // Extract auth tag from the end of encrypted value
  const authTagHex = encryptedValue.slice(-AUTH_TAG_LENGTH * 2);
  const ciphertextHex = encryptedValue.slice(0, -AUTH_TAG_LENGTH * 2);

  const decipher = createDecipheriv(ALGORITHM, key, ivBuffer);
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

  let decrypted = decipher.update(ciphertextHex, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Generate a random encryption key for initial setup.
 * Run this once to generate OL_ENCRYPTION_KEY.
 */
export function generateEncryptionKey(): string {
  return randomBytes(KEY_LENGTH).toString("hex");
}
