"use client"

import { useCallback } from "react"
import { useAuth } from "@/components/auth/AuthProvider"
import { apiFetch } from "@/lib/api/client"
import { parseGs1DataMatrix } from "@/lib/gs1"
import { ProductIdentifier, type CaptureInput, type IdentificationResult } from "./ProductIdentifier"

type Identifier = { id: string; type: string; value: string }
type Article = { id: string; sku: string; description: string; brand?: string | null; manufacturer?: string | null; identifiers: Identifier[] }
type Resolution = { status: "resolved" | "not_found" | "ambiguous"; candidates: Article[] }

const companyPath = (id: string) => `/api/companies/${encodeURIComponent(id)}`
const ai22ArticleReferenceManufacturer = "BIOPROTECE"
const gs1ParserVersion = "GS1 parser v4"

export function parseArticleScan(rawValue: string) {
  const parsed = parseGs1DataMatrix(rawValue)
  const lookupCandidates = [...new Set([parsed.gtin, parsed.articleCode, parsed.additionalReference, parsed.normalizedValue].filter((candidate): candidate is string => Boolean(candidate)))]
  return {
    rawValue: parsed.rawValue,
    lookup: parsed.gtin ?? parsed.normalizedValue,
    lookupCandidates,
    identifierType: parsed.gtin ? "GTIN_EAN" : undefined,
    gtin: parsed.gtin,
    articleCode: parsed.articleCode,
    additionalReference: parsed.additionalReference,
    lotCode: parsed.lotCode,
    serialNumber: parsed.serialNumber,
    expirationDate: parsed.expirationDate?.toISOString().slice(0, 10),
  }
}

export function scanDetails(rawValue: string) {
  const parsed = parseArticleScan(rawValue)
  return [
    { label: "Versión de lectura", value: gs1ParserVersion },
    { label: "Código leído", value: parsed.rawValue },
    ...(parsed.gtin ? [{ label: "GTIN (AI 01)", value: parsed.gtin }] : []),
    ...(parsed.articleCode ? [{ label: "Dato GS1 (AI 22)", value: parsed.articleCode }] : []),
    ...(parsed.additionalReference ? [{ label: "Referencia adicional (AI 240)", value: parsed.additionalReference }] : []),
    ...(parsed.lotCode ? [{ label: "Lote (AI 10)", value: parsed.lotCode }] : []),
    ...(parsed.serialNumber ? [{ label: "Serie (AI 21)", value: parsed.serialNumber }] : []),
    ...(parsed.expirationDate ? [{ label: "Vencimiento (AI 17)", value: parsed.expirationDate }] : []),
  ]
}

function traceabilityPreset(parsed: ReturnType<typeof parseArticleScan>) {
  if (parsed.serialNumber) return parsed.expirationDate ? "serial-expiry" : "serial"
  if (parsed.lotCode) return parsed.expirationDate ? "lot-expiry" : "lot"
  return "quantity"
}

export function IdentifierTestWorkspace() {
  const { activeCompany } = useAuth()

  const resolve = useCallback(async (captures: CaptureInput[]): Promise<IdentificationResult> => {
    if (!activeCompany) return { status: "not_found" }
    const parsed = captures.map((capture) => ({ capture, parsed: parseArticleScan(capture.rawValue) }))
    const traceability = parsed.reduce<{ lot: string | null; serial: string | null; expirationDate: string | null }>((fields, entry) => ({
      lot: fields.lot ?? entry.parsed.lotCode ?? null,
      serial: fields.serial ?? entry.parsed.serialNumber ?? null,
      expirationDate: fields.expirationDate ?? entry.parsed.expirationDate ?? null,
    }), { lot: null as string | null, serial: null as string | null, expirationDate: null as string | null })
    const matches = new Map<string, Article>()
    for (const entry of parsed) {
      for (const lookup of entry.parsed.lookupCandidates) {
        const params = new URLSearchParams({ identifier: lookup, take: "25" })
        if (entry.parsed.identifierType && lookup === entry.parsed.lookup) params.set("identifierType", entry.parsed.identifierType)
        if (entry.parsed.articleCode && lookup === entry.parsed.articleCode) {
          params.set("identifierType", "GS1_AI_22")
          params.set("manufacturerContext", ai22ArticleReferenceManufacturer)
        }
        const resolution = await apiFetch<Resolution>(`${companyPath(activeCompany.id)}/articles/resolve?${params}`)
        resolution.candidates.forEach((article) => matches.set(article.id, article))
      }
    }
    const candidates = [...matches.values()]
    if (candidates.length !== 1) return candidates.length ? { status: "ambiguous", candidates } : { status: "not_found", rawValue: captures[0]?.rawValue, symbology: captures[0]?.symbology, details: [...(captures[0]?.symbology ? [{ label: "Formato", value: captures[0].symbology }] : []), ...scanDetails(captures[0]?.rawValue ?? "")] }
    return {
      status: "identified",
      item: { id: candidates[0].id, description: candidates[0].description, manufacturer: candidates[0].manufacturer ?? candidates[0].brand },
      ...traceability,
      rawValue: captures[0]?.rawValue,
      symbology: captures[0]?.symbology,
    }
  }, [activeCompany])

  if (!activeCompany) return <p role="alert" className="mx-auto max-w-2xl rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Seleccioná una empresa para identificar productos.</p>
  return <ProductIdentifier resolve={resolve} onContinue={() => undefined} onRegister={(result) => {
    const parsed = parseArticleScan(result.rawValue ?? "")
    const params = new URLSearchParams({ newArticle: "1", raw: parsed.rawValue, trace: traceabilityPreset(parsed) })
    if (parsed.gtin) params.set("gtin", parsed.gtin)
    if (parsed.articleCode) params.set("ai22", parsed.articleCode)
    window.location.assign(`/stock?${params.toString()}`)
  }} />
}
