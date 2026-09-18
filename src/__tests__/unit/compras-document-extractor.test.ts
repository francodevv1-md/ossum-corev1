import { beforeEach, describe, expect, it, vi } from "vitest"

const { readAuthorizationWithAzure, extract, getAIProvider } = vi.hoisted(() => ({
  readAuthorizationWithAzure: vi.fn(),
  extract: vi.fn(),
  getAIProvider: vi.fn(),
}))

vi.mock("@/lib/services/ai/azure-document-intelligence", () => ({ readAuthorizationWithAzure }))
vi.mock("@/lib/services/ai/utils/provider-factory", () => ({ getAIProvider }))

import { extractComprasDocument } from "@/lib/services/ai/compras-document-extractor"

describe("Compras document extraction (Azure + OpenAI)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    readAuthorizationWithAzure.mockResolvedValue("Remito proveedor\nSynthes\nRP-001")
    getAIProvider.mockReturnValue({ extract })
  })

  it("extracts a remito de proveedor and returns a RemitoProveedorAIResponse", async () => {
    extract.mockResolvedValue({
      provider: "openai",
      rawText: JSON.stringify({
        provider: "azure-document-intelligence+openai",
        confidence: 0.88,
        looks_like_remito_proveedor: true,
        extracted: {
          proveedor_name: "Synthes Argentina",
          cuit_proveedor: "30-71234567-3",
          numero_remito: "RP-001",
          fecha_remito: "2026-05-08",
          orden_compra_ref: "OC-0002",
          items: [{ codigo: "IMP-OST-003", descripcion: "Placa LCP", cantidad: "4", lote: "L1", vencimiento: "2029-03-01" }],
          observaciones: "",
        },
      }),
    })

    const result = await extractComprasDocument({
      tipo: "remito-proveedor",
      buffer: Buffer.from("remito"),
      mimeType: "application/pdf",
    })

    expect(readAuthorizationWithAzure).toHaveBeenCalledWith({ buffer: expect.any(Buffer), mimeType: "application/pdf" })
    expect(getAIProvider).toHaveBeenCalledWith("openai")
    expect(extract.mock.calls[0][0].file.buffer.toString("utf8")).toContain("AZURE DOCUMENT INTELLIGENCE OCR OUTPUT")
    expect(result.provider).toBe("azure-document-intelligence+openai")
    expect(result.confidence).toBe(0.88)
    expect((result as { looks_like_remito_proveedor?: boolean }).looks_like_remito_proveedor).toBe(true)
    expect(result.extracted.proveedor_name).toBe("Synthes Argentina")
    expect(result.extracted.items).toHaveLength(1)
  })

  it("extracts a factura de compra and returns a FacturaCompraAIResponse", async () => {
    extract.mockResolvedValue({
      provider: "openai",
      rawText: JSON.stringify({
        provider: "azure-document-intelligence+openai",
        confidence: 0.91,
        looks_like_factura_compra: true,
        extracted: {
          proveedor_name: "Arthrex Argentina",
          cuit_proveedor: "30712345673",
          tipo_factura: "A",
          numero_factura: "FC-001",
          fecha_factura: "2026-05-02",
          orden_compra_ref: "",
          items: [{ codigo: "DES-ART-008", descripcion: "Kit artroscopía", cantidad: "10", precio_unitario: "95000", subtotal: "950000" }],
          total: "950000",
          observaciones: "",
        },
      }),
    })

    const result = await extractComprasDocument({
      tipo: "factura-compra",
      buffer: Buffer.from("factura"),
      mimeType: "image/png",
    })

    expect((result as { looks_like_factura_compra?: boolean }).looks_like_factura_compra).toBe(true)
    expect(result.extracted.proveedor_name).toBe("Arthrex Argentina")
    expect((result.extracted as { tipo_factura: string }).tipo_factura).toBe("A")
    expect((result.extracted as { total: string }).total).toBe("950000")
  })

  it("includes Azure OCR warning in the response warnings", async () => {
    extract.mockResolvedValue({
      provider: "openai",
      rawText: JSON.stringify({
        confidence: 0.5,
        looks_like_remito_proveedor: true,
        extracted: { proveedor_name: "X", items: [] },
      }),
    })

    const result = await extractComprasDocument({
      tipo: "remito-proveedor",
      buffer: Buffer.from("x"),
      mimeType: "application/pdf",
    })

    expect(result.warnings.some((w) => w.includes("Azure Document Intelligence"))).toBe(true)
  })

  it("throws when AI provider returns unparseable JSON", async () => {
    extract.mockResolvedValue({ provider: "openai", rawText: "not json" })

    await expect(
      extractComprasDocument({ tipo: "remito-proveedor", buffer: Buffer.from("x"), mimeType: "application/pdf" })
    ).rejects.toMatchObject({ code: "invalid_ai_provider_payload" })
  })
})
