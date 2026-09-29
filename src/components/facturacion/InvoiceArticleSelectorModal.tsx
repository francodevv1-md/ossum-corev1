"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import { Search, Loader2, Package, Sparkles } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { searchArticlesApi, type ArticleApiRow } from "@/lib/api/articles"
import { formatCurrency } from "@/lib/formatters"

interface InvoiceArticleSelectorModalProps {
  companyId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (article: ArticleApiRow) => void
  onSelectFree: () => void
  initialCode?: string
}

export function InvoiceArticleSelectorModal({
  companyId,
  open,
  onOpenChange,
  onSelect,
  onSelectFree,
  initialCode,
}: InvoiceArticleSelectorModalProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<ArticleApiRow[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      const initial = initialCode || ""
      setQuery(initial)
      if (companyId) {
        setLoading(true)
        searchArticlesApi(companyId, initial, 30)
          .then((rows) => setResults(rows))
          .catch(() => setResults([]))
          .finally(() => setLoading(false))
      }
      requestAnimationFrame(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      })
    }
  }, [open, initialCode, companyId])

  useEffect(() => {
    if (!open || !companyId) return
    const timer = setTimeout(() => {
      setLoading(true)
      searchArticlesApi(companyId, query, 30)
        .then((rows) => setResults(rows))
        .catch(() => setResults([]))
        .finally(() => setLoading(false))
    }, 200)
    return () => clearTimeout(timer)
  }, [query, open, companyId])

  const handleSelect = useCallback(
    (article: ArticleApiRow) => {
      onSelect(article)
      onOpenChange(false)
    },
    [onSelect, onOpenChange]
  )

  const handleSelectFree = useCallback(() => {
    onSelectFree()
    onOpenChange(false)
  }, [onSelectFree, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] sm:max-w-2xl flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold flex items-center gap-2">
            <Package className="size-4 text-primary" />
            Buscar artículo en catálogo backend
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Buscá por código SKU, descripción o identificador. Seleccioná un artículo o cargá una línea flexible.
          </DialogDescription>
        </DialogHeader>

        {/* Search input */}
        <div className="relative my-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por SKU, descripción o marca..."
            className="pl-8 h-9 text-xs"
          />
          {loading ? (
            <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 animate-spin text-muted-foreground" />
          ) : null}
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto max-h-[350px] space-y-1 pr-1">
          {loading && results.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              <Loader2 className="size-5 animate-spin mx-auto mb-2 text-primary" />
              Buscando artículos en catálogo…
            </div>
          ) : results.length > 0 ? (
            results.map((art) => (
              <button
                key={art.id}
                type="button"
                className="w-full text-left p-2 rounded-md border border-border/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 hover:border-emerald-400 transition-colors flex items-start justify-between gap-3 text-xs"
                onClick={() => handleSelect(art)}
              >
                <div className="space-y-0.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-bold text-foreground">{art.sku}</span>
                    {art.brand ? (
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                        {art.brand}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="font-medium text-foreground/90 truncate">{art.description}</p>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>Unidad: {art.unit}</span>
                    {art.family ? <span>Familia: {art.family}</span> : null}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="font-mono font-semibold text-foreground">
                    {art.unitPrice ? formatCurrency(art.unitPrice) : "Precio s/d"}
                  </div>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                    IVA {art.ivaKey ? `${art.ivaKey}%` : "21%"}
                  </span>
                </div>
              </button>
            ))
          ) : (
            <div className="py-8 text-center space-y-2 border border-dashed rounded-lg p-4">
              <p className="text-xs text-muted-foreground">
                No se encontraron artículos en el catálogo para &quot;{query}&quot;.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs gap-1.5"
                onClick={handleSelectFree}
              >
                <Sparkles className="size-3 text-amber-600" />
                Cargar como línea libre / personalizada
              </Button>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="pt-3 border-t flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={handleSelectFree}
          >
            + Línea libre sin catálogo
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => onOpenChange(false)}
          >
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
