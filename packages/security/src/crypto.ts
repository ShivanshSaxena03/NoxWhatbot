import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // Standard for GCM
const AUTH_TAG_LENGTH = 16;

function getMasterKey(): Buffer {
  const masterKey = process.env.VAULT_MASTER_KEY || "default-32-byte-master-key-change-it-0123456789abcdef";
  // Always derive a strict 32-byte key using SHA-256
  return crypto.createHash("sha256").update(masterKey).digest();
}

/**
 * Encrypt plain text using AES-256-GCM.
 * Output format: `iv_hex:auth_tag_hex:encrypted_hex`
 */
export function encryptVaultText(plainText: string): string {
  const key = getMasterKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  
  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");
  
  const authTag = cipher.getAuthTag().toString("hex");
  
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Decrypt AES-256-GCM encrypted string.
 * Expects input format: `iv_hex:auth_tag_hex:encrypted_hex`
 */
export function decryptVaultText(encryptedString: string): string {
  const parts = encryptedString.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted format. Expected iv:authTag:ciphertext");
  }

  const [ivHex, authTagHex, cipherHex] = parts;
  const key = getMasterKey();
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(cipherHex, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

export function hashPassword(plainText: string): string {
  return crypto.createHash("sha256").update(plainText).digest("hex");
}
