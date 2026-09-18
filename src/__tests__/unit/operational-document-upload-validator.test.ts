import { describe, expect, it } from "vitest"
import { validateOperationalDocument } from "@/lib/validators/operational-document-upload.validator"

function file(bytes: number[], type: string, name = "document.bin") {
  const body = new Uint8Array(bytes)
  return {
    name,
    type,
    size: body.byteLength,
    arrayBuffer: async () => body.buffer,
  } as File
}

describe("operational document upload validator", () => {
  it("accepts a PDF only when its signature matches", async () => {
    const valid = await validateOperationalDocument(file([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31], "application/pdf", "../../case.pdf"))
    expect(valid).toMatchObject({ fileName: "case.pdf", mimeType: "application/pdf", sizeBytes: 6 })

    await expect(validateOperationalDocument(file([1, 2, 3, 4, 5], "application/pdf")))
      .rejects.toMatchObject({ code: "invalid_document_signature", status: 400 })
  })

  it("rejects unsupported content types", async () => {
    await expect(validateOperationalDocument(file([1], "text/plain")))
      .rejects.toMatchObject({ code: "unsupported_document_type", status: 400 })
  })
})
