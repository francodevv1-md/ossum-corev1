import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { readAuthorizationWithAzure } from "@/lib/services/ai/azure-document-intelligence"

describe("Azure Document Intelligence authorization reader", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT = "https://example.cognitiveservices.azure.com"
    process.env.AZURE_DOCUMENT_INTELLIGENCE_API_KEY = "test-key"
    process.env.AZURE_DOCUMENT_INTELLIGENCE_API_VERSION = "2024-11-30"
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it("returns bounded OCR text and serialized layout tables", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(null, { status: 202, headers: { "operation-location": "https://example.cognitiveservices.azure.com/operations/1" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        status: "succeeded",
        analyzeResult: {
          content: "Paciente Demo",
          tables: [{ cells: [
            { rowIndex: 0, columnIndex: 0, content: "Código" },
            { rowIndex: 0, columnIndex: 1, content: "Material" },
            { rowIndex: 1, columnIndex: 0, content: "IMPL-1" },
            { rowIndex: 1, columnIndex: 1, content: "Tornillo" },
          ] }],
        },
      }), { status: 200, headers: { "content-type": "application/json" } }))

    const pending = readAuthorizationWithAzure({ buffer: Buffer.from("%PDF-1"), mimeType: "application/pdf" })
    await vi.advanceTimersByTimeAsync(1_500)

    await expect(pending).resolves.toContain("Paciente Demo\n\nTABLE 1:\nCódigo | Material\nIMPL-1 | Tornillo")
  })

  it("rejects files above the Azure DEV limit before any request", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")
    await expect(readAuthorizationWithAzure({ buffer: Buffer.alloc(4_000_001), mimeType: "application/pdf" })).rejects.toMatchObject({ code: "azure_document_too_large" })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("rejects content that does not match the declared file type", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")
    await expect(readAuthorizationWithAzure({ buffer: Buffer.from("not-a-pdf"), mimeType: "application/pdf" })).rejects.toMatchObject({ code: "azure_invalid_document_signature" })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("rejects an untrusted Azure operation location", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(null, { status: 202, headers: { "operation-location": "https://attacker.example/operations/1" } }))
    await expect(readAuthorizationWithAzure({ buffer: Buffer.from("%PDF-1"), mimeType: "application/pdf" })).rejects.toMatchObject({ code: "azure_untrusted_operation_location" })
  })

  it("rejects an insecure endpoint before sending the API key", async () => {
    process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT = "http://example.cognitiveservices.azure.com"
    const fetchSpy = vi.spyOn(globalThis, "fetch")

    await expect(readAuthorizationWithAzure({ buffer: Buffer.from("%PDF-1"), mimeType: "application/pdf" })).rejects.toMatchObject({ code: "azure_insecure_endpoint" })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("does not forward credentials through redirects", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: "https://attacker.example" } }))

    await expect(readAuthorizationWithAzure({ buffer: Buffer.from("%PDF-1"), mimeType: "application/pdf" })).rejects.toMatchObject({ code: "azure_analysis_failed" })
    expect(fetchSpy).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ redirect: "manual" }))
  })

  it("times out a stalled Azure request", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((_input, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })))
    }))
    const pending = readAuthorizationWithAzure({ buffer: Buffer.from("%PDF-1"), mimeType: "application/pdf" })
    const assertion = expect(pending).rejects.toMatchObject({ code: "azure_request_timeout" })
    await vi.advanceTimersByTimeAsync(15_000)
    await assertion
  })

  it("enforces one absolute deadline across slow polling attempts", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(null, { status: 202, headers: { "operation-location": "https://example.cognitiveservices.azure.com/operations/1" } }))
      .mockImplementation((_input, init) => new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => resolve(new Response(null, { status: 500 })), 14_000)
        init?.signal?.addEventListener("abort", () => {
          clearTimeout(timeoutId)
          reject(Object.assign(new Error("aborted"), { name: "AbortError" }))
        }, { once: true })
      }))

    const pending = readAuthorizationWithAzure({ buffer: Buffer.from("%PDF-1"), mimeType: "application/pdf" })
    const assertion = expect(pending).rejects.toMatchObject({ code: "azure_analysis_timeout" })
    await vi.runAllTimersAsync()
    await assertion
  })
})
