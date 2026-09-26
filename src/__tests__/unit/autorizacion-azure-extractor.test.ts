import { beforeEach, describe, expect, it, vi } from "vitest"

const { readAuthorizationWithAzure, extract, getAIProvider } = vi.hoisted(() => ({
  readAuthorizationWithAzure: vi.fn(),
  extract: vi.fn(),
  getAIProvider: vi.fn(),
}))

vi.mock("@/lib/services/ai/azure-document-intelligence", () => ({ readAuthorizationWithAzure }))
vi.mock("@/lib/services/ai/utils/provider-factory", () => ({ getAIProvider }))

import { extractAutorizacion } from "@/lib/services/ai/autorizacion-extractor"

describe("Azure-first authorization extraction", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    readAuthorizationWithAzure.mockResolvedValue("Paciente: Demo\nAutorización: 123")
    getAIProvider.mockReturnValue({ extract })
    extract.mockResolvedValue({
      provider: "openai",
      rawText: JSON.stringify({
        provider: "untrusted-model-value",
        confidence: 0.9,
        looks_like_authorization: true,
        extracted: { paciente: "Demo", numero_autorizacion: "123" },
      }),
    })
  })

  it("sends only Azure OCR text to the existing structured normalizer", async () => {
    const result = await extractAutorizacion({ buffer: Buffer.from("image"), mimeType: "image/png", fileName: "auth.png", mode: "azure" })

    expect(readAuthorizationWithAzure).toHaveBeenCalledWith({ buffer: expect.any(Buffer), mimeType: "image/png" })
    expect(getAIProvider).toHaveBeenCalledWith("openai")
    expect(extract).toHaveBeenCalledWith(expect.objectContaining({
      file: expect.objectContaining({ mimeType: "text/plain", fileName: "azure-ocr.txt" }),
    }))
    expect(extract.mock.calls[0][0].file.buffer.toString("utf8")).toContain("AZURE DOCUMENT INTELLIGENCE OCR OUTPUT")
    expect(result).toMatchObject({ provider: "azure-document-intelligence+openai", confidence: 0.9, extracted: { paciente: "Demo", numero_autorizacion: "123" } })
  })
})
