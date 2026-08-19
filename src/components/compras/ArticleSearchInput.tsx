"use client"

import * as React from "react"
import { PackageSearch, X, Link2 } from "lucide-react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useOrtoTrackStore } from "@/lib/store"
import { normalizarDescripcion, similitudDescripcion } from "@/lib/comparativa.utils"
import type { StockItem } from "@/types"

const MAX_RESULTS = 8

export type ArticleSearchInputProps = {
  /** StockItemId seleccionado, si hay. */
  value?: string
  /** Callback cuando se selecciona un artículo. */
  onSelect: (item: StockItem) => void
  /** Callback cuando se desvincula. */
  onClear?: () => void
  /** Nombre del proveedor para narrowing (opcional). */
  proveedorName?: string
  /** Placeholder. */
  placeholder?: string
  /** Texto inicial de búsqueda (ej: descripción del OCR). */
  initialQuery?: string
  /** Tamaño compacto para tablas. */
  compact?: boolean
  /** disabled. */
  disabled?: boolean
}

export function ArticleSearchInput({
  value: selectedId,
  onSelect,
  onClear,
  proveedorName,
  placeholder = "Buscar artículo por código o nombre…",
  initialQuery = "",
  compact = false,
  disabled = false,
}: ArticleSearchInputProps) {
  const stockItems = useOrtoTrackStore((s) => s.stock)

  // ponytail: query reset handled by key={selectedId} on the input — avoids setState-in-effect.
  const [query, setQuery] = React.useState(initialQuery)
  const [open, setOpen] = React.useState(false)
  const [highlight, setHighlight] = React.useState(0)
  const containerRef = React.useRef<HTMLDivElement | null>(null)

  const selected = selectedId ? stockItems.find((s) => s.id === selectedId) : null

  // Cerrar al click fuera
  React.useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  // Filtrar y rankear resultados
  const results = React.useMemo(() => {
    if (!query.trim() || selected) return []
    const q = normalizarDescripcion(query)
    if (!q) return []

    // Narrowing por proveedor
    const provNorm = proveedorName ? normalizarDescripcion(proveedorName) : ""
    const byProveedor = provNorm
      ? stockItems.filter((s) => normalizarDescripcion(s.supplier) === provNorm)
      : null
    const pool = byProveedor && byProveedor.length > 0 ? byProveedor : stockItems

    const scored = pool
      .map((s) => {
        const codeMatch = s.code.toUpperCase().includes(query.toUpperCase())
        const descSim = similitudDescripcion(s.name, query)
        // Boost: código exacto > código parcial > descripción
        const score = codeMatch ? 1 + descSim : descSim
        return { item: s, score }
      })
      .filter((x) => x.score > 0.2)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_RESULTS)

    return scored.map((x) => x.item)
  }, [query, selected, stockItems, proveedorName])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setHighlight((h) => Math.min(h + 1, results.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setHighlight((h) => Math.max(h - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      const item = results[highlight]
      if (item) {
        onSelect(item)
        setOpen(false)
        setQuery("")
      }
    } else if (e.key === "Escape") {
      setOpen(false)
    }
  }

  // Mostrar el artículo seleccionado
  if (selected) {
    return (
      <div
        className={cn(
          "flex items-center gap-1 rounded border border-emerald-300 bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
          compact ? "h-6" : "h-7"
        )}
      >
        <Link2 className="size-3 shrink-0" />
        <span className="truncate" title={selected.code}>
          {selected.name.length > 28 ? selected.name.slice(0, 28) + "…" : selected.name}
        </span>
        {!disabled && onClear && (
          <button
            type="button"
            className="ml-auto shrink-0 text-emerald-700 hover:text-destructive dark:text-emerald-300"
            onClick={onClear}
            aria-label="Desvincular"
          >
            <X className="size-3" />
          </button>
        )}
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <PackageSearch className="pointer-events-none absolute left-1.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          className={cn(
            "pl-7 pr-2",
            compact ? "h-7 text-xs" : "h-9 text-sm",
            disabled && "opacity-50"
          )}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
            setHighlight(0)
          }}
          onFocus={() => query && setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
        />
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-md border bg-popover shadow-lg">
          {results.map((item, idx) => (
            <button
              key={item.id}
              type="button"
              className={cn(
                "flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs transition-colors",
                idx === highlight ? "bg-accent" : "hover:bg-muted/50"
              )}
              onMouseEnter={() => setHighlight(idx)}
              onClick={() => {
                onSelect(item)
                setOpen(false)
                setQuery("")
              }}
            >
              <div className="flex flex-col">
                <span className="font-medium">{item.name}</span>
                <span className="text-[10px] text-muted-foreground">
                  {item.code} · {item.category} · {item.brand}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
