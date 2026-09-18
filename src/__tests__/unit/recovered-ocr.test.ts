import { afterEach, describe, expect, it, vi } from "vitest"
import { readAuthorizationWithAzure } from "@/lib/services/ai/azure-document-intelligence"

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.useRealTimers() })
const input = { buffer: Buffer.from("%PDF-test"), mimeType: "application/pdf" }
function setup() {
  vi.stubEnv("AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT", "https://ocr.example.test")
  vi.stubEnv("AZURE_DOCUMENT_INTELLIGENCE_API_KEY", "synthetic-test-value")
  const fetcher = vi.fn()
  vi.stubGlobal("fetch", fetcher)
  return fetcher
}
describe("recovered Azure OCR transport", () => {
  it("rejects invalid files before network access", async () => {
    const fetcher = setup()
    await expect(readAuthorizationWithAzure({ ...input, buffer: Buffer.from("not-pdf") })).rejects.toMatchObject({ code: "azure_invalid_document_signature" })
    await expect(readAuthorizationWithAzure({ ...input, buffer: Buffer.alloc(4_000_001) })).rejects.toMatchObject({ code: "azure_document_too_large" })
    expect(fetcher).not.toHaveBeenCalled()
  })
  it("rejects cross-origin polling without forwarding credentials", async () => {
    const fetcher = setup().mockResolvedValue(new Response(null, { status: 202, headers: { "operation-location": "https://other.example.test/op" } }))
    await expect(readAuthorizationWithAzure(input)).rejects.toMatchObject({ code: "azure_untrusted_operation_location" })
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
  it("polls and returns OCR text plus ordered table content", async () => {
    vi.useFakeTimers()
    const fetcher = setup()
      .mockResolvedValueOnce(new Response(null, { status: 202, headers: { "operation-location": "https://ocr.example.test/op" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "succeeded", analyzeResult: { content: "Document", tables: [{ cells: [{ rowIndex: 0, columnIndex: 1, content: "B" }, { rowIndex: 0, columnIndex: 0, content: "A" }] }] } })))
    const result = readAuthorizationWithAzure(input)
    await vi.advanceTimersByTimeAsync(1500)
    expect(await result).toBe("Document\n\nTABLE 1:\nA | B")
    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(fetcher.mock.calls[0][1].redirect).toBe("manual")
  })
  it("retries an empty retryable response without parsing its body", async () => {
    vi.useFakeTimers()
    const retryBody = vi.fn()
    setup()
      .mockResolvedValueOnce(new Response(null, { status: 202, headers: { "operation-location": "https://ocr.example.test/op" } }))
      .mockResolvedValueOnce({ status: 429, ok: false, json: retryBody })
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "succeeded", analyzeResult: { content: "Document" } })))
    const result = readAuthorizationWithAzure(input)
    await vi.advanceTimersByTimeAsync(3_000)
    await expect(result).resolves.toBe("Document")
    expect(retryBody).not.toHaveBeenCalled()
  })
  it("rejects non-retryable responses without parsing their body", async () => {
    vi.useFakeTimers()
    const errorBody = vi.fn()
    setup()
      .mockResolvedValueOnce(new Response(null, { status: 202, headers: { "operation-location": "https://ocr.example.test/op" } }))
      .mockResolvedValueOnce({ status: 400, ok: false, json: errorBody })
    const result = readAuthorizationWithAzure(input)
    const rejection = expect(result).rejects.toMatchObject({ code: "azure_polling_failed" })
    await vi.advanceTimersByTimeAsync(1_500)
    await rejection
    expect(errorBody).not.toHaveBeenCalled()
  })
})
