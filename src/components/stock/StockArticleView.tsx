"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Package } from "lucide-react"

import { apiFetch } from "@/lib/api/client"
import { useAuth } from "@/components/auth/AuthProvider"
import { StockArticleFicha } from "@/components/stock/StockArticleSheet"
import { mapCanonicalArticleToStockItem, type CanonicalArticle } from "@/lib/stock/article-adapter"

export function StockArticleView({ id }: { id: string }) {
  const { activeCompany } = useAuth()
  const companyId = activeCompany?.id
  const contextKey = `${companyId ?? "no-company"}:${id}`
  const [result, setResult] = useState<{ key: string; item?: ReturnType<typeof mapCanonicalArticleToStockItem>; error?: string }>()

  useEffect(() => {
    let cancelled = false
    if (!companyId) return

    const load = async () => {
      try {
        const apiItem = await apiFetch<CanonicalArticle>(`/api/companies/${encodeURIComponent(companyId)}/articles/${encodeURIComponent(id)}`)
        if (cancelled) return
        setResult({ key: contextKey, item: mapCanonicalArticleToStockItem(apiItem) })
      } catch (error) {
        if (cancelled) return
        setResult({ key: contextKey, error: error instanceof Error ? error.message : "No se pudo cargar el artículo" })
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [companyId, contextKey, id])

  const currentResult = result?.key === contextKey ? result : undefined
  const item = currentResult?.item
  const errorMessage = currentResult?.error
  const loading = Boolean(companyId) && !currentResult

  if (!companyId) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center gap-3 bg-[var(--ossum-surface)] px-5 py-16 text-center">
        <Package className="size-5 text-muted-foreground" />
        <div><p className="font-medium">Artículo no disponible</p><p className="mt-1 text-sm text-muted-foreground">Seleccioná una empresa para consultar el artículo.</p></div>
        <Link href="/stock" className="text-xs font-medium text-[var(--ossum-action)] hover:underline">← Volver a Stock</Link>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center gap-3 bg-[var(--ossum-surface)] px-5 py-16 text-center">
        <Package className="size-5 text-muted-foreground" />
        <p role="status" className="font-medium">Cargando artículo...</p>
        <Link href="/stock" className="text-xs font-medium text-[var(--ossum-action)] hover:underline">← Volver a Stock</Link>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center gap-3 bg-[var(--ossum-surface)] px-5 py-16 text-center">
        <Package className="size-5 text-muted-foreground" />
        <div>
          <p className="font-medium">{errorMessage ? "No pudimos cargar el artículo" : "Artículo no encontrado"}</p>
          <p className="mt-1 text-sm text-muted-foreground">{errorMessage ?? "El artículo que buscás no existe o fue dado de baja."}</p>
        </div>
        <Link href="/stock" className="text-xs font-medium text-[var(--ossum-action)] hover:underline">← Volver a Stock</Link>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--ossum-surface)]">
      <div className="flex h-9 shrink-0 items-center border-b border-[var(--ossum-line)] bg-white px-5">
        <Link href="/stock" className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--ossum-action)] hover:underline">
          <ArrowLeft className="size-3.5" /> Volver a Stock
        </Link>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <StockArticleFicha item={item} />
      </div>
    </div>
  )
}
