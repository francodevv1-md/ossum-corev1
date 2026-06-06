"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { searchCatalogByQuery } from "@/data/mock-catalog"
import { formatCurrency } from "@/lib/formatters"
import type { CatalogMatch } from "@/data/mock-catalog"

interface ArticleSelectorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (match: CatalogMatch) => void
  onSelectFree: () => void
  initialCode?: string
}

export function ArticleSelectorModal({
  open,
  onOpenChange,
  onSelect,
  onSelectFree,
  initialCode,
}: ArticleSelectorModalProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<CatalogMatch[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  // Pre-fill search when opening
  useEffect(() => {
    if (open) {
      const initial = initialCode || ""
      setQuery(initial)
      // Trigger search immediately with initial code
      if (initial.trim()) {
        const matches = searchCatalogByQuery(initial)
        setResults(matches)
      } else {
        setResults([])
      }
      // Focus input after opening
      requestAnimationFrame(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      })
    }
  }, [open, initialCode])

  // Search as user types
  useEffect(() => {
    if (!open) return
    if (!query.trim()) {
      setResults([])
      return
    }
    const matches = searchCatalogByQuery(query)
    setResults(matches)
  }, [query, open])

  const handleSelect = useCallback(
    (match: CatalogMatch) => {
      onSelect(match)
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
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-sm">Buscar artículo en catálogo</DialogTitle>
          <DialogDescription className="text-[11px]">
            Busque por código o nombre. Seleccione un artículo o cargue como libre.
          </DialogDescription>
        </DialogHeader>

        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por código o nombre..."
            className="pl-8 h-8 text-xs"
          />
        </div>

        {/* Results table */}
        <div className="border rounded-md max-h-[320px] overflow-y-auto">
          <table className="w-full border-collapse text-[11px]">
            <thead className="sticky top-0 z-10 bg-gray-100 dark:bg-gray-800">
              <tr>
                <th className="px-2 py-1.5 text-left font-semibold text-[10px] text-muted-foreground uppercase tracking-wider border-b">
                  Código
                </th>
                <th className="px-2 py-1.5 text-left font-semibold text-[10px] text-muted-foreground uppercase tracking-wider border-b">
                  Artículo
                </th>
                <th className="px-2 py-1.5 text-left font-semibold text-[10px] text-muted-foreground uppercase tracking-wider border-b">
                  Sección
                </th>
                <th className="px-2 py-1.5 text-right font-semibold text-[10px] text-muted-foreground uppercase tracking-wider border-b">
                  Precio
                </th>
                <th className="px-2 py-1.5 text-right font-semibold text-[10px] text-muted-foreground uppercase tracking-wider border-b">
                  IVA
                </th>
              </tr>
            </thead>
            <tbody>
              {results.length > 0 ? (
                results.map((match) => (
                  <tr
                    key={match.id}
                    className="cursor-pointer hover:bg-emerald-50/60 dark:hover:bg-emerald-950/20 transition-colors border-b border-gray-100 dark:border-gray-800 last:border-0"
                    onClick={() => handleSelect(match)}
                  >
                    <td className="px-2 py-1.5 font-mono text-[10px]">{match.code}</td>
                    <td className="px-2 py-1.5 font-medium">{match.name}</td>
                    <td className="px-2 py-1.5 text-muted-foreground">{match.section}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{formatCurrency(match.unitPrice)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-emerald-600">{match.ivaKey === "exento" ? "Ex." : match.ivaKey + "%"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-2 py-6 text-center text-muted-foreground text-xs">
                    {query.trim() ? "Sin resultados" : "Escriba un código o nombre para buscar"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Free article link */}
        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            className="text-[11px] text-emerald-700 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-300 font-medium underline underline-offset-2 transition-colors"
            onClick={handleSelectFree}
          >
            Cargar artículo flexible
          </button>
          <span className="text-[9px] text-muted-foreground">
            {results.length} resultado{results.length !== 1 ? "s" : ""}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
