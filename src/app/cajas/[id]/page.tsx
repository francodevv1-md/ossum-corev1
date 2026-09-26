"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { use } from "react"
import { ArrowLeft, Box, Package } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/components/auth/AuthProvider"
import { apiFetch } from "@/lib/api/client"
import { formatDate } from "@/lib/formatters"

type BoxFormulaDetail = {
  id: string
  companyId: string
  boxArticleId: string
  currentVersionId: string | null
  nextVersionNumber: number
  createdAt: string
  updatedAt: string
  boxEligibility: {
    article: {
      id: string
      sku: string
      description: string
      articleType: string | null
      brand: string | null
      manufacturer: string | null
      family: string | null
      unit: string
      isActive: boolean
      identifiers: Array<{ type: string; value: string }>
    }
  }
  currentVersion: {
    id: string
    versionNumber: number
    acceptedAt: string
    cause: string | null
    acceptedBy: { id: string; firstName: string | null; lastName: string | null; email: string } | null
    lines: Array<{
      id: string
      lineNumber: number
      articleId: string
      expectedQuantity: string
      stockUnit: string
      skuSnapshot: string | null
      descriptionSnapshot: string | null
      eligibility: { article: { sku: string; description: string; brand: string | null } }
    }>
  } | null
  versions: Array<{
    id: string
    versionNumber: number
    acceptedAt: string
    cause: string | null
    acceptedBy: { firstName: string | null; lastName: string | null } | null
  }>
}

function identifierLabel(type: string): string {
  return ({
    ALTERNATIVE_CODE: "Código alternativo",
    MANUFACTURER_CODE: "Código del fabricante",
    SUPPLIER_CODE: "Código del proveedor",
    GTIN: "GTIN",
    SERIAL: "Número de serie",
  } as Record<string, string>)[type] ?? type.replaceAll("_", " ").toLocaleLowerCase("es")
}

function revisionCause(versionNumber: number, cause: string | null): string {
  if (cause) return cause
  return versionNumber === 1 ? "Creación del contenido esperado" : "Actualización del contenido esperado"
}

function actorName(actor: { firstName: string | null; lastName: string | null }): string {
  return [actor.firstName, actor.lastName].filter(Boolean).join(" ") || "Usuario"
}

export default function CajaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { activeCompany } = useAuth()
  const companyId = activeCompany?.id
  const contextKey = `${companyId ?? "no-company"}:${id}`
  const [result, setResult] = useState<{ key: string; box: BoxFormulaDetail | null; error: string | null } | null>(null)

  useEffect(() => {
    if (!companyId) return
    let active = true
    apiFetch<BoxFormulaDetail>(`/api/companies/${encodeURIComponent(companyId)}/cajas/${encodeURIComponent(id)}`)
      .then((data) => { if (active) setResult({ key: contextKey, box: data, error: null }) })
      .catch(() => { if (active) setResult({ key: contextKey, box: null, error: "No pudimos cargar la información del modelo. Volvé a intentarlo." }) })
    return () => { active = false }
  }, [companyId, contextKey, id])

  const currentResult = result?.key === contextKey ? result : null
  const loading = Boolean(companyId) && !currentResult
  const box = currentResult?.box ?? null
  const error = currentResult?.error ?? null

  if (!companyId) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center gap-3 bg-[var(--ossum-surface)] px-5 py-16 text-center">
        <Box className="size-5 text-muted-foreground" />
        <div><p className="font-medium">Modelo no disponible</p><p className="mt-1 text-sm text-muted-foreground">Seleccioná una empresa para consultar el modelo.</p></div>
        <Link href="/cajas" className="text-xs font-medium text-[var(--ossum-action)] hover:underline">← Volver a Cajas</Link>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center gap-3 bg-[var(--ossum-surface)] px-5 py-16 text-center">
        <p className="text-sm text-muted-foreground">Cargando modelo de caja…</p>
      </div>
    )
  }

  if (error || !box) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center gap-3 bg-[var(--ossum-surface)] px-5 py-16 text-center">
        <Box className="size-5 text-muted-foreground" />
        <div>
          <p className="font-medium">{error ? "No pudimos cargar el modelo de caja" : "Modelo de caja no encontrado"}</p>
          <p className="mt-1 text-sm text-muted-foreground">{error ?? "El modelo que buscás no existe."}</p>
        </div>
        <Link href="/cajas" className="text-xs font-medium text-[var(--ossum-action)] hover:underline">← Volver a Cajas</Link>
      </div>
    )
  }

  const article = box.boxEligibility.article
  const currentVersion = box.currentVersion
  const lines = currentVersion?.lines ?? []

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--ossum-surface)]">
      <div className="flex h-9 shrink-0 items-center border-b border-[var(--ossum-line)] bg-white px-5">
        <Link href="/cajas" className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--ossum-action)] hover:underline">
          <ArrowLeft className="size-3.5" /> Volver a Cajas
        </Link>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto max-w-[900px] space-y-6 px-5 py-6">
          {/* Header */}
          <section className="overflow-hidden rounded-xl border bg-card">
            <div className="border-b bg-muted/20 px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-xs text-muted-foreground">{article.sku}</p>
                  <h1 className="mt-1 text-xl font-semibold text-[var(--ossum-navy)]">{article.description}</h1>
                </div>
                {currentVersion ? <Badge variant="outline">Contenido · revisión {currentVersion.versionNumber}</Badge> : <Badge variant="secondary">Sin contenido vigente</Badge>}
              </div>
            </div>
            <dl className="grid gap-px bg-[var(--ossum-line)] sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Marca", value: article.brand },
                { label: "Fabricante", value: article.manufacturer },
                { label: "Familia", value: article.family },
                { label: "Unidad de stock", value: article.unit },
                { label: "Estado", value: article.isActive ? "Activo" : "Inactivo" },
                { label: "Contenido esperado", value: `${lines.length} ${lines.length === 1 ? "componente" : "componentes"}` },
                { label: "Registrada", value: formatDate(box.createdAt) },
                { label: "Último cambio", value: formatDate(box.updatedAt) },
              ].map((item) => (
                <div key={item.label} className="bg-card px-5 py-3">
                  <dt className="text-[11px] text-muted-foreground">{item.label}</dt>
                   <dd className="mt-0.5 text-sm font-medium">{item.value || "No informado"}</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* Formula lines */}
          <section className="overflow-hidden rounded-xl border bg-card">
             <div className="flex flex-col gap-2 border-b bg-muted/20 px-5 py-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-[var(--ossum-navy)]">Contenido esperado vigente</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">Se copia en cada nueva preparación sin modificar preparaciones anteriores.</p>
              </div>
              {currentVersion && (
                <span className="text-xs text-muted-foreground">
                  Revisión {currentVersion.versionNumber} · guardada el {formatDate(currentVersion.acceptedAt)}
                  {currentVersion.acceptedBy ? ` · por ${actorName(currentVersion.acceptedBy)}` : ""}
                </span>
              )}
            </div>
            {lines.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <caption className="sr-only">Componentes del contenido esperado vigente</caption>
                  <thead>
                    <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                      <th scope="col" className="px-4 py-2.5 text-left font-medium">#</th>
                      <th scope="col" className="px-3 py-2.5 text-left font-medium">Código</th>
                      <th scope="col" className="px-3 py-2.5 text-left font-medium">Descripción</th>
                      <th scope="col" className="px-3 py-2.5 text-left font-medium">Marca</th>
                      <th scope="col" className="px-4 py-2.5 text-right font-medium">Cantidad esperada</th>
                      <th scope="col" className="px-4 py-2.5 text-left font-medium">Unidad de stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {lines.map((line) => (
                      <tr key={line.id} className="transition-colors hover:bg-muted/20">
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{line.lineNumber}</td>
                        <td className="px-3 py-3 font-mono text-xs">{line.skuSnapshot ?? line.eligibility.article.sku}</td>
                        <td className="px-3 py-3">{line.descriptionSnapshot ?? line.eligibility.article.description}</td>
                        <td className="px-3 py-3 text-xs">{line.eligibility.article.brand || "—"}</td>
                        <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums">{Number(line.expectedQuantity)}</td>
                        <td className="px-4 py-3 text-xs">{line.stockUnit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-5 py-10 text-center">
                <Package className="mx-auto size-5 text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">Este modelo no tiene componentes en su contenido esperado vigente.</p>
              </div>
            )}
          </section>

          {/* Version history */}
          {box.versions.length > 0 && (
            <section className="overflow-hidden rounded-xl border bg-card">
              <div className="border-b bg-muted/20 px-5 py-3">
                 <h2 className="text-sm font-semibold text-[var(--ossum-navy)]">Cambios del contenido esperado</h2>
              </div>
              <div className="divide-y">
                {box.versions.map((v) => (
                   <div key={v.id} className="flex flex-col gap-2 px-5 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                     <div className="flex flex-wrap items-center gap-3">
                       <Badge variant="outline">Revisión {v.versionNumber}</Badge>
                       <span className="text-muted-foreground">Guardada el {formatDate(v.acceptedAt)}</span>
                       {v.acceptedBy && <span className="text-xs text-muted-foreground">por {actorName(v.acceptedBy)}</span>}
                     </div>
                     <span className="text-xs text-muted-foreground">{revisionCause(v.versionNumber, v.cause)}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Identifiers */}
          {article.identifiers.length > 0 && (
            <section className="overflow-hidden rounded-xl border bg-card">
              <div className="border-b bg-muted/20 px-5 py-3">
                <h2 className="text-sm font-semibold text-[var(--ossum-navy)]">Códigos de identificación</h2>
              </div>
              <div className="divide-y">
                {article.identifiers.map((id, index) => (
                  <div key={index} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
                    <span className="text-xs text-muted-foreground">{identifierLabel(id.type)}</span>
                    <span className="font-mono text-xs">{id.value}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
