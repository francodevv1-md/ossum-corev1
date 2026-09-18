import { mkdir, readFile, rename, writeFile } from "node:fs/promises"
import path from "node:path"
import type { MailAttachmentRecord, MailStage1CompanyDocument } from "./types"
import { mailEvidenceStore } from "./evidence-store"

function runtimeRoot() {
  return process.env.OSSUM_RUNTIME_DIR ?? path.join(process.cwd(), ".runtime")
}

function sanitizeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_")
}

function createEmptyCompanyDocument(companyId: string): MailStage1CompanyDocument {
  return {
    version: 1,
    companyId,
    conversations: {},
    links: {},
  }
}

export class FileSystemMailStage1Repository {
  private readonly baseDir = path.join(runtimeRoot(), "mail-stage1")

  private companyFilePath(companyId: string) {
    return path.join(this.baseDir, "companies", `${sanitizeSegment(companyId)}.json`)
  }

  async getCompanyDocument(companyId: string): Promise<MailStage1CompanyDocument> {
    const filePath = this.companyFilePath(companyId)

    try {
      const raw = await readFile(filePath, "utf8")
      return JSON.parse(raw) as MailStage1CompanyDocument
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code === "ENOENT") {
        return createEmptyCompanyDocument(companyId)
      }

      throw error
    }
  }

  async saveCompanyDocument(companyId: string, document: MailStage1CompanyDocument) {
    const filePath = this.companyFilePath(companyId)
    const dir = path.dirname(filePath)
    await mkdir(dir, { recursive: true })

    const tempPath = `${filePath}.tmp`
    await writeFile(tempPath, JSON.stringify(document, null, 2), "utf8")
    await rename(tempPath, filePath)
  }

  /**
   * Persist an attachment binary to the configured evidence store.
   *
   * The returned storage ref is backend-prefixed (`fs:` or `r2:`) so the
   * download route can resolve the proper backend later.
   */
  async persistAttachmentBinary(input: {
    companyId: string
    surgeryId: string
    conversationId: string
    conversationKey: string
    attachment: MailAttachmentRecord
    buffer: Buffer
  }) {
    return mailEvidenceStore.persist({
      companyId: input.companyId,
      surgeryId: input.surgeryId,
      conversationId: input.conversationId,
      attachment: input.attachment,
      buffer: input.buffer,
    })
  }
}

export const mailStage1Repository = new FileSystemMailStage1Repository()
