import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto"
import { mkdir, readFile, rename, unlink, writeFile, chmod } from "node:fs/promises"
import path from "node:path"
import { internalError } from "@/lib/api/errors"
import type { GmailTokenPayload } from "./types"

function getRuntimeRoot(): string {
  return process.env.OSSUM_RUNTIME_DIR ?? path.join(process.cwd(), ".runtime")
}

export class EncryptedTokenStore {
  private readonly baseDir: string

  constructor() {
    this.baseDir = path.join(getRuntimeRoot(), "mail-stage1", "gmail-tokens")
  }

  private getKey(): Buffer {
    const hex = process.env.GMAIL_ENCRYPTION_KEY
    if (!hex || hex.length !== 64) {
      throw internalError(
        "GMAIL_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)",
        "mail_gmail_invalid_encryption_key"
      )
    }
    try {
      return Buffer.from(hex, "hex")
    } catch {
      throw internalError("GMAIL_ENCRYPTION_KEY must be valid hex", "mail_gmail_invalid_encryption_key")
    }
  }

  private filePath(companyId: string): string {
    return path.join(this.baseDir, `${this.sanitizeCompanyId(companyId)}.json.enc`)
  }

  private sanitizeCompanyId(companyId: string): string {
    return companyId.replace(/[^a-zA-Z0-9._-]/g, "_")
  }

  // ── Encryption ──────────────────────────────────────────────────
  private encrypt(plaintext: string): string {
    const key = this.getKey()
    const iv = randomBytes(12) // AES-256-GCM recommended IV length
    const cipher = createCipheriv("aes-256-gcm", key, iv)

    const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
    const authTag = cipher.getAuthTag()

    // Format: iv (12 bytes) + ciphertext + authTag (16 bytes)
    const combined = Buffer.concat([iv, encrypted, authTag])
    return combined.toString("hex")
  }

  private decrypt(hexCiphertext: string): string {
    const key = this.getKey()
    const combined = Buffer.from(hexCiphertext, "hex")

    const iv = combined.subarray(0, 12)
    const authTag = combined.subarray(combined.length - 16)
    const ciphertext = combined.subarray(12, combined.length - 16)

    const decipher = createDecipheriv("aes-256-gcm", key, iv)
    decipher.setAuthTag(authTag)

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()])
    return decrypted.toString("utf8")
  }

  // ── Public API ──────────────────────────────────────────────────

  async save(companyId: string, tokens: GmailTokenPayload): Promise<void> {
    const payload: GmailTokenPayload = {
      ...tokens,
      companyId,
      updatedAt: new Date().toISOString(),
    }

    const json = JSON.stringify(payload)
    const encrypted = this.encrypt(json)

    await mkdir(this.baseDir, { recursive: true })

    const targetPath = this.filePath(companyId)
    const tempPath = `${targetPath}.tmp`

    // Atomic write: write to temp, then rename
    await writeFile(tempPath, encrypted, "utf8")
    await rename(tempPath, targetPath)

    // Best-effort: restrict permissions (no-op on Windows)
    try {
      await chmod(targetPath, 0o600)
    } catch {
      // Windows does not support chmod — ignore
    }
  }

  async load(companyId: string): Promise<GmailTokenPayload | null> {
    const targetPath = this.filePath(companyId)

    try {
      const encrypted = await readFile(targetPath, "utf8")
      const json = this.decrypt(encrypted)
      const payload = JSON.parse(json) as GmailTokenPayload

      // Cross-check companyId
      if (payload.companyId !== companyId) {
        throw internalError(
          "Token file companyId mismatch — possible tampering",
          "mail_gmail_token_company_mismatch"
        )
      }

      return payload
    } catch (error: any) {
      if (error?.code === "ENOENT") return null
      throw error
    }
  }

  async delete(companyId: string): Promise<void> {
    const targetPath = this.filePath(companyId)

    try {
      await unlink(targetPath)
    } catch (error: any) {
      if (error?.code === "ENOENT") return // idempotent
      console.warn(
        `[mail-stage1] Failed to delete token file for company ${companyId}: ${error.message}`
      )
    }
  }

  async exists(companyId: string): Promise<boolean> {
    try {
      await readFile(this.filePath(companyId))
      return true
    } catch {
      return false
    }
  }
}
