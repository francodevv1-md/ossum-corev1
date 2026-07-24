import type { AIExtractionProvider, AIProviderRequest } from "../types";

function buildMockPayload(fileName?: string, mimeType?: string) {
  const safeName = fileName?.trim() || "mock-authorization-document";
  const safeMime = mimeType?.trim() || "application/octet-stream";

  return {
    provider: "mock",
    confidence: 0.92,
    looks_like_authorization: true,
    warnings: [],
    extracted: {
      paciente: "Paciente Mock Demo",
      dni: "30.111.222",
      medico: "Dra. Mariana Test",
      institucion: "Sanatorio Central Demo",
      obra_social: "Obra Social Prueba",
      patologia_sugerida: "Fractura de radio distal",
      numero_autorizacion: "AUT-MOCK-2026-001",
      numero_siniestro: "SIN-MOCK-7788",
      numero_poliza: "POL-MOCK-4455",
      fecha_autorizacion: "2026-06-10",
      fecha_cirugia: "2026-06-18",
      fecha_probable: "2026-06-20",
      provincia_sugerida: "Buenos Aires",
      localidad_sugerida: "La Plata",
      material_autorizado: [
        {
          codigo: "MAT-MOCK-001",
          descripcion: "Placa bloqueada demo 7 orificios",
          cantidad: "1",
          precio_referencia: "125000",
        },
        {
          codigo: "MAT-MOCK-002",
          descripcion: "Tornillo cortical demo 4.5 x 40mm",
          cantidad: "4",
          precio_referencia: "18000",
        },
      ],
      observaciones:
        "Documento ficticio generado por el provider mock para desarrollo y testing interno.",
    },
    raw_text_preview: `MOCK provider response for ${safeName} (${safeMime})`,
  };
}

export const mockProvider: AIExtractionProvider = {
  name: "mock",
  capability: {
    vision: true,
    pdfDirect: true,
    jsonMode: true,
    maxFileSizeMb: 20,
  },
  async extract(request: AIProviderRequest) {
    const payload = buildMockPayload(request.file.fileName, request.file.mimeType);

    return {
      provider: this.name,
      rawText: JSON.stringify(payload),
      durationMs: 0,
      warnings: [],
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      },
    };
  },
};
