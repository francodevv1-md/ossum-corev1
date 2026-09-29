"use client"

import React, { useRef, useCallback, useState, useEffect } from "react"
import { Plus, Trash2, Search, Link2, Sparkles, MessageSquare, StickyNote, Check } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

import type { InvoiceFormItem, InvoiceFormErrors } from "@/hooks/useInvoiceForm"
import { INVOICE_IVA_OPTIONS, computeLineValues } from "@/hooks/useInvoiceForm"
import { searchArticlesApi, type ArticleApiRow } from "@/lib/api/articles"
import { formatCurrency } from "@/lib/formatters"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { InvoiceArticleSelectorModal } from "@/components/facturacion/InvoiceArticleSelectorModal"

export interface InvoiceItemsTableProps {
  companyId: string
  items: InvoiceFormItem[]
  addItem: (patch?: Partial<InvoiceFormItem>) => void
  removeItem: (idx: number) => void
  updateItem: (idx: number, updates: Partial<InvoiceFormItem>) => void
  errors: InvoiceFormErrors
  workspace?: boolean
}

type CellCol = "code" | "description" | "lote" | "quantity" | "unitPrice" | "discountPercent" | "iva" | "note"

const CELL_INPUT =
  "w-full h-full bg-transparent border-0 outline-none px-2 py-1 text-xs " +
  "hover:bg-emerald-500/10 focus:bg-emerald-500/15 " +
  "focus:ring-1.5 focus:ring-inset focus:ring-emerald-500 dark:focus:ring-emerald-400 transition-colors duration-75 text-foreground"

const CELL_INPUT_NUM =
  "w-full h-full bg-transparent border-0 outline-none px-2 py-1 text-xs text-right tabular-nums font-mono font-medium " +
  "hover:bg-emerald-500/10 focus:bg-emerald-500/15 " +
  "focus:ring-1.5 focus:ring-inset focus:ring-emerald-500 dark:focus:ring-emerald-400 transition-colors duration-75 text-foreground"

const CELL_INPUT_ERROR = "ring-1.5 ring-inset ring-destructive bg-destructive/15 font-medium"

const COL_WIDTHS = {
  code: "90px",
  description: undefined,
  lote: "85px",
  quantity: "55px",
  unitPrice: "115px",
  discountPercent: "60px",
  iva: "75px",
  total: "105px",
  note: "115px",
  delete: "32px",
} as const

function InvoiceArticleAutocomplete({
  companyId,
  idx,
  item,
  updateItem,
  onFocusCell,
  onKeyDown,
  setCellRef,
  hasError,
}: {
  companyId: string
  idx: number
  item: InvoiceFormItem
  updateItem: (idx: number, updates: Partial<InvoiceFormItem>) => void
  onFocusCell: (rowIdx: number, col: CellCol) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, rowIdx: number, col: CellCol) => void
  setCellRef: (rowIdx: number, col: CellCol, el: HTMLInputElement | null) => void
  hasError: boolean
}) {
  const [query, setQuery] = useState(item.description)
  const [isOpen, setIsOpen] = useState(false)
  const [results, setResults] = useState<ArticleApiRow[]>([])
  const [highlightIdx, setHighlightIdx] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const ignoreBlurRef = useRef(false)

  useEffect(() => {
    setQuery(item.description)
  }, [item.description])

  useEffect(() => {
    if (!isOpen || !query.trim() || !companyId) {
      setResults([])
      setHighlightIdx(-1)
      return
    }
    const timer = setTimeout(() => {
      searchArticlesApi(companyId, query, 8)
        .then((rows) => {
          setResults(rows)
          setHighlightIdx(-1)
        })
        .catch(() => setResults([]))
    }, 150)
    return () => clearTimeout(timer)
  }, [query, isOpen, companyId])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const handleSelect = useCallback((match: ArticleApiRow) => {
    ignoreBlurRef.current = true
    updateItem(idx, {
      code: match.sku,
      description: match.description,
      unitPrice: match.unitPrice ?? 0,
      catalogItemId: match.id,
      ivaKey: match.ivaKey || "21",
      isArticuloLibre: false,
      codeResolved: true,
      note: match.stock !== undefined ? `Stock: ${match.stock}u` : item.note,
    })
    setQuery(match.description)
    setIsOpen(false)
    setResults([])
    setHighlightIdx(-1)
    requestAnimationFrame(() => onFocusCell(idx, "quantity"))
  }, [idx, updateItem, onFocusCell, item.note])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    setIsOpen(true)
    updateItem(idx, {
      description: value,
      catalogItemId: "",
      isArticuloLibre: true,
      codeResolved: false,
    })
  }, [idx, updateItem])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isOpen && results.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setHighlightIdx((prev) => Math.min(prev + 1, results.length - 1))
        return
      }
      if (e.key === "ArrowUp") {
        e.preventDefault()
        setHighlightIdx((prev) => Math.max(prev - 1, 0))
        return
      }
      if (e.key === "Enter" && highlightIdx >= 0) {
        e.preventDefault()
        handleSelect(results[highlightIdx])
        return
      }
      if (e.key === "Escape") {
        setIsOpen(false)
        return
      }
    }
    onKeyDown(e, idx, "description")
  }, [isOpen, results, highlightIdx, handleSelect, onKeyDown, idx])

  const handleFocus = useCallback(() => {
    if (query.trim() && !item.codeResolved) setIsOpen(true)
  }, [query, item.codeResolved])

  const handleBlur = useCallback(() => {
    setTimeout(() => {
      if (!ignoreBlurRef.current) setIsOpen(false)
      ignoreBlurRef.current = false
    }, 150)
  }, [])

  return (
    <div ref={containerRef} className="relative w-full h-full flex flex-col justify-center">
      <input
        ref={(el) => {
          inputRef.current = el
          setCellRef(idx, "description", el)
        }}
        value={query}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder="Descripción o buscar en catálogo..."
        className={cn(
          CELL_INPUT,
          "font-medium",
          hasError && CELL_INPUT_ERROR
        )}
      />
      {item.catalogItemId ? (
        <div className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none" title="Artículo vinculado a catálogo">
          <Link2 className="size-3 text-emerald-600 dark:text-emerald-400" />
        </div>
      ) : null}

      {isOpen && results.length > 0 ? (
        <div className="absolute z-50 top-full left-0 w-[360px] bg-popover text-popover-foreground border border-border/80 rounded-md shadow-lg max-h-[220px] overflow-y-auto">
          {results.map((match, i) => (
            <button
              key={match.id}
              type="button"
              className={cn(
                "w-full text-left px-2.5 py-1.5 text-xs flex items-start gap-2 transition-colors border-b last:border-0",
                i === highlightIdx
                  ? "bg-emerald-500/10 text-foreground font-medium"
                  : "hover:bg-muted/60"
              )}
              onMouseDown={() => handleSelect(match)}
              onMouseEnter={() => setHighlightIdx(i)}
            >
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate text-xs">{match.description}</div>
                <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-[10px] bg-muted px-1 rounded">{match.sku}</span>
                  {match.brand ? <span>{match.brand}</span> : null}
                  {match.stock !== undefined ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-[10px]">
                      Stock: {match.stock}u
                    </span>
                  ) : null}
                  {match.unitPrice ? <span>{formatCurrency(match.unitPrice)}</span> : null}
                  <span className="text-primary font-medium text-[10px]">IVA {match.ivaKey || "21"}%</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function InvoiceItemsTable({
  companyId,
  items,
  addItem,
  removeItem,
  updateItem,
  errors,
  workspace = false,
}: InvoiceItemsTableProps) {
  const cellRefs = useRef<Map<string, HTMLInputElement>>(new Map())
  const [modalOpen, setModalOpen] = useState(false)
  const [modalRowIdx, setModalRowIdx] = useState<number>(-1)

  const setCellRef = useCallback((rowIdx: number, col: CellCol, el: HTMLInputElement | null) => {
    const key = `${rowIdx}-${col}`
    if (el) cellRefs.current.set(key, el)
    else cellRefs.current.delete(key)
  }, [])

  const focusCell = useCallback((rowIdx: number, col: CellCol) => {
    requestAnimationFrame(() => {
      const key = `${rowIdx}-${col}`
      const el = cellRefs.current.get(key)
      el?.focus()
      el?.select()
    })
  }, [])

  const handleCodeBlur = useCallback((idx: number, code: string) => {
    const trimmed = code.trim()
    if (!trimmed) {
      updateItem(idx, { codeResolved: false, catalogItemId: "", isArticuloLibre: true })
      return
    }

    if (trimmed.toUpperCase() === "Z") {
      updateItem(idx, {
        code: "Z",
        description: "Artículo flexible",
        catalogItemId: "",
        isArticuloLibre: true,
        codeResolved: false,
      })
      return
    }

    if (companyId) {
      searchArticlesApi(companyId, trimmed, 1)
        .then((matches) => {
          if (matches.length > 0 && matches[0].sku.toLowerCase() === trimmed.toLowerCase()) {
            const match = matches[0]
            updateItem(idx, {
              code: match.sku,
              description: match.description,
              unitPrice: match.unitPrice ?? 0,
              catalogItemId: match.id,
              ivaKey: match.ivaKey || "21",
              isArticuloLibre: false,
              codeResolved: true,
              note: match.stock !== undefined ? `Stock: ${match.stock}u` : items[idx]?.note || "",
            })
          } else {
            updateItem(idx, { codeResolved: false })
          }
        })
        .catch(() => updateItem(idx, { codeResolved: false }))
    }
  }, [companyId, updateItem, items])

  const openArticleSelector = useCallback((idx: number) => {
    setModalRowIdx(idx)
    setModalOpen(true)
  }, [])

  const handleModalSelect = useCallback((match: ArticleApiRow) => {
    if (modalRowIdx < 0) return
    updateItem(modalRowIdx, {
      code: match.sku,
      description: match.description,
      unitPrice: match.unitPrice ?? 0,
      catalogItemId: match.id,
      ivaKey: match.ivaKey || "21",
      isArticuloLibre: false,
      codeResolved: true,
      note: match.stock !== undefined ? `Stock: ${match.stock}u` : items[modalRowIdx]?.note || "",
    })
    requestAnimationFrame(() => focusCell(modalRowIdx, "quantity"))
  }, [modalRowIdx, updateItem, focusCell, items])

  const handleModalSelectFree = useCallback(() => {
    if (modalRowIdx < 0) return
    updateItem(modalRowIdx, {
      code: "Z",
      description: "Línea libre",
      catalogItemId: "",
      isArticuloLibre: true,
      codeResolved: false,
    })
    requestAnimationFrame(() => focusCell(modalRowIdx, "description"))
  }, [modalRowIdx, updateItem, focusCell])

  const handleCellKeyDown = useCallback((
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIdx: number,
    col: CellCol,
  ) => {
    if (e.key === "F2") {
      e.preventDefault()
      openArticleSelector(rowIdx)
      return
    }

    const cols: CellCol[] = ["code", "description", "lote", "quantity", "unitPrice", "discountPercent", "iva", "note"]
    const focusableCols: CellCol[] = ["code", "description", "lote", "quantity", "unitPrice", "discountPercent", "note"]
    const colIdx = cols.indexOf(col)

    const findNextFocusable = (fromIdx: number, direction: 1 | -1): { col: CellCol; idx: number } | null => {
      let i = fromIdx + direction
      while (i >= 0 && i < cols.length) {
        if (focusableCols.includes(cols[i])) return { col: cols[i], idx: i }
        i += direction
      }
      return null
    }

    if (e.key === "Tab" && !e.shiftKey) {
      e.preventDefault()
      const next = findNextFocusable(colIdx, 1)
      if (next) {
        focusCell(rowIdx, next.col)
      } else if (rowIdx < items.length - 1) {
        focusCell(rowIdx + 1, focusableCols[0])
      } else {
        addItem()
        requestAnimationFrame(() => focusCell(items.length, focusableCols[0]))
      }
    } else if (e.key === "Tab" && e.shiftKey) {
      e.preventDefault()
      const prev = findNextFocusable(colIdx, -1)
      if (prev) {
        focusCell(rowIdx, prev.col)
      } else if (rowIdx > 0) {
        focusCell(rowIdx - 1, focusableCols[focusableCols.length - 1])
      }
    } else if (e.key === "Enter") {
      if (col === "code") {
        const input = e.currentTarget as HTMLInputElement
        handleCodeBlur(rowIdx, input.value)
      }
      e.preventDefault()
      if (rowIdx < items.length - 1) {
        const targetCol = focusableCols.includes(col) ? col : focusableCols[0]
        focusCell(rowIdx + 1, targetCol)
      } else {
        addItem()
        const targetCol = focusableCols.includes(col) ? col : focusableCols[0]
        requestAnimationFrame(() => focusCell(items.length, targetCol))
      }
    }
  }, [items.length, addItem, focusCell, handleCodeBlur, openArticleSelector])

  const handleQuickAddFromCatalog = useCallback(() => {
    const lastIdx = items.length - 1
    const lastItem = items[lastIdx]
    if (lastItem && !lastItem.code && !lastItem.description) {
      openArticleSelector(lastIdx)
    } else {
      addItem()
      openArticleSelector(items.length)
    }
  }, [items, addItem, openArticleSelector])

  const handleQuickAddFreeLine = useCallback(() => {
    addItem({
      code: "Z",
      description: "Línea libre",
      isArticuloLibre: true,
      codeResolved: false,
      quantity: 1,
      unitPrice: 0,
      ivaKey: "21",
    })
    requestAnimationFrame(() => focusCell(items.length, "description"))
  }, [items.length, addItem, focusCell])

  const handleRemoveItem = useCallback((idx: number) => {
    const item = items[idx]
    if (!item) return
    if (items.length > 1 && (item.description.trim() || item.unitPrice > 0)) {
      const confirmed = window.confirm(
        `¿Eliminar el ítem${item.description ? ` "${item.description}"` : ""}?`
      )
      if (!confirmed) return
    }
    removeItem(idx)
  }, [items, removeItem])

  return (
    <div className={cn("flex flex-col space-y-2", workspace && "flex-1 min-h-0")}>
      {/* ─── Barra de Acciones Rápidas (Quick Buttons) ─── */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-200/90 dark:bg-slate-800/90 p-1.5 rounded-lg border border-slate-300 dark:border-slate-700/80 shadow-2xs">
        <div className="flex items-center gap-1.5">
          {/* Botón Rápido 1: Abrir Catálogo */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={handleQuickAddFromCatalog}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
            title="Buscar artículo en el catálogo backend (Atajo: tecla F2)"
          >
            <Search className="size-3.5" />
            <span>Buscar en Catálogo</span>
            <kbd className="font-mono bg-emerald-800/60 px-1 py-0.2 rounded text-[9px] text-emerald-100 font-bold ml-0.5">
              F2
            </kbd>
          </motion.button>

          {/* Botón Rápido 2: Agregar Línea Libre */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={handleQuickAddFreeLine}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 shadow-xs transition-colors"
            title="Cargar una fila flexible sin código de stock"
          >
            <Plus className="size-3.5 text-primary" />
            <span>+ Línea Libre</span>
          </motion.button>

          {/* Botón Rápido 3: Agregar Fila Vacía */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={() => {
              addItem()
              requestAnimationFrame(() => focusCell(items.length, "code"))
            }}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-slate-800/80 transition-colors"
            title="Agregar nueva fila en blanco"
          >
            <Plus className="size-3" />
            <span>Fila vacía</span>
          </motion.button>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
          <span className="hidden sm:inline font-medium text-[11px]">Atajos:</span>
          <span className="inline-flex items-center gap-1 font-mono text-[10px] bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700 shadow-2xs">
            <kbd className="font-bold text-slate-900 dark:text-slate-100">F2</kbd> Catálogo
          </span>
          <span className="inline-flex items-center gap-1 font-mono text-[10px] bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700 shadow-2xs">
            <kbd className="font-bold text-slate-900 dark:text-slate-100">Tab</kbd> / <kbd className="font-bold text-slate-900 dark:text-slate-100">Enter</kbd> Siguiente
          </span>
        </div>
      </div>

      {errors.items ? (
        <div className="bg-destructive/10 border border-destructive/30 px-3 py-1.5 rounded text-xs text-destructive font-medium">
          {errors.items}
        </div>
      ) : null}

      <div className="flex flex-col border border-slate-300 dark:border-slate-700/80 rounded-lg overflow-hidden bg-slate-100/70 dark:bg-slate-900/60 shadow-xs">
        <div className="overflow-x-auto max-h-[380px]">
          <table className="w-full border-collapse text-xs table-fixed">
            <thead className="sticky top-0 z-10 bg-slate-200/95 dark:bg-slate-800/95 backdrop-blur-md border-b border-slate-300 dark:border-slate-700 select-none shadow-2xs">
              <tr className="text-slate-800 dark:text-slate-200 font-bold text-[10px] uppercase tracking-wider">
                <th style={{ width: COL_WIDTHS.code }} className="px-2 py-2 text-left border-r border-slate-300 dark:border-slate-700">
                  Código
                </th>
                <th className="px-2.5 py-2 text-left border-r border-slate-300 dark:border-slate-700">
                  Descripción <span className="text-destructive font-bold">*</span>
                </th>
                <th style={{ width: COL_WIDTHS.lote }} className="px-2 py-2 text-left border-r border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                  Lote
                </th>
                <th style={{ width: COL_WIDTHS.quantity }} className="px-2 py-2 text-right border-r border-slate-300 dark:border-slate-700">
                  Cant. <span className="text-destructive font-bold">*</span>
                </th>
                <th style={{ width: COL_WIDTHS.unitPrice }} className="px-2 py-2 text-right border-r border-slate-300 dark:border-slate-700">
                  P. Final (IVA inc.) <span className="text-destructive font-bold">*</span>
                </th>
                <th style={{ width: COL_WIDTHS.discountPercent }} className="px-2 py-2 text-right border-r border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200">
                  Dto.%
                </th>
                <th style={{ width: COL_WIDTHS.iva }} className="px-2 py-2 text-center border-r border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200">
                  IVA
                </th>
                <th style={{ width: COL_WIDTHS.total }} className="px-2.5 py-2 text-right border-r border-slate-300 dark:border-slate-700 bg-primary/10 text-primary font-bold">
                  Total línea
                </th>
                <th style={{ width: COL_WIDTHS.note }} className="px-2 py-2 text-left border-r border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                  Nota
                </th>
                <th style={{ width: COL_WIDTHS.delete }} className="px-1 py-2 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {items.map((item, idx) => {
                const line = computeLineValues(item)
                const descError = Boolean(errors[`items[${idx}].description`])
                const qtyError = Boolean(errors[`items[${idx}].quantity`])
                const priceError = Boolean(errors[`items[${idx}].unitPrice`])
                const isTraceable = Boolean(item.lote || item.catalogItemId)

                return (
                  <tr
                    key={idx}
                    className={cn(
                      "h-8 transition-colors duration-75",
                      idx % 2 === 1 ? "bg-slate-50/80 dark:bg-slate-900/50" : "bg-white dark:bg-slate-950",
                      "hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20"
                    )}
                  >
                    {/* Código / SKU */}
                    <td style={{ width: COL_WIDTHS.code }} className="border-r border-slate-200 dark:border-slate-800 p-0">
                      <div className="flex items-center w-full h-full">
                        <input
                          ref={(el) => setCellRef(idx, "code", el)}
                          value={item.code}
                          onChange={(e) => updateItem(idx, { code: e.target.value, codeResolved: false })}
                          onBlur={(e) => handleCodeBlur(idx, e.target.value)}
                          onKeyDown={(e) => handleCellKeyDown(e, idx, "code")}
                          placeholder="—"
                          className={cn(CELL_INPUT, "font-mono font-medium flex-1 min-w-0")}
                        />
                        <button
                          type="button"
                          className="shrink-0 size-4.5 flex items-center justify-center rounded-xs text-muted-foreground hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-500/10 mr-1 transition-colors"
                          onClick={() => openArticleSelector(idx)}
                          title="Buscar en catálogo (F2)"
                        >
                          <Search className="size-3" />
                        </button>
                      </div>
                    </td>

                    {/* Descripción */}
                    <td className="border-r border-slate-200 dark:border-slate-800 p-0">
                      <InvoiceArticleAutocomplete
                        companyId={companyId}
                        idx={idx}
                        item={item}
                        updateItem={updateItem}
                        onFocusCell={focusCell}
                        onKeyDown={handleCellKeyDown}
                        setCellRef={setCellRef}
                        hasError={descError}
                      />
                    </td>

                    {/* Lote */}
                    <td style={{ width: COL_WIDTHS.lote }} className="border-r border-slate-200 dark:border-slate-800 p-0">
                      <input
                        ref={(el) => setCellRef(idx, "lote", el)}
                        value={item.lote || ""}
                        onChange={(e) => updateItem(idx, { lote: e.target.value })}
                        onKeyDown={(e) => handleCellKeyDown(e, idx, "lote")}
                        placeholder={isTraceable ? "Lote..." : "—"}
                        className={cn(CELL_INPUT, "font-mono text-center", !item.lote && "text-muted-foreground")}
                      />
                    </td>

                    {/* Cantidad */}
                    <td style={{ width: COL_WIDTHS.quantity }} className="border-r border-slate-200 dark:border-slate-800 p-0">
                      <input
                        ref={(el) => setCellRef(idx, "quantity", el)}
                        type="number"
                        min={1}
                        step="1"
                        value={item.quantity || ""}
                        onChange={(e) => updateItem(idx, { quantity: parseFloat(e.target.value) || 0 })}
                        onKeyDown={(e) => handleCellKeyDown(e, idx, "quantity")}
                        className={cn(CELL_INPUT_NUM, qtyError && CELL_INPUT_ERROR)}
                      />
                    </td>

                    {/* Precio unitario final (IVA incluido) */}
                    <td style={{ width: COL_WIDTHS.unitPrice }} className="border-r border-slate-200 dark:border-slate-800 p-0">
                      <div className="flex flex-col justify-center h-full px-1 py-0.5">
                        <input
                          ref={(el) => setCellRef(idx, "unitPrice", el)}
                          type="number"
                          min={0}
                          step="0.01"
                          value={item.unitPrice || ""}
                          onChange={(e) => updateItem(idx, { unitPrice: parseFloat(e.target.value) || 0 })}
                          onKeyDown={(e) => handleCellKeyDown(e, idx, "unitPrice")}
                          placeholder="0.00"
                          className={cn(CELL_INPUT_NUM, "h-6", priceError && CELL_INPUT_ERROR)}
                        />
                        {item.unitPrice > 0 ? (
                          <span
                            className="text-[9px] text-muted-foreground font-mono text-right leading-none pb-0.5 truncate"
                            title={`Neto: ${formatCurrency(line.netSubtotal / (item.quantity || 1))} · IVA ${line.taxRate}%: ${formatCurrency(line.taxAmount / (item.quantity || 1))}`}
                          >
                            Neto: {formatCurrency(line.netSubtotal / (item.quantity || 1))}
                          </span>
                        ) : null}
                      </div>
                    </td>

                    {/* Dto. % (Mejor contraste) */}
                    <td style={{ width: COL_WIDTHS.discountPercent }} className="border-r border-slate-200 dark:border-slate-800 p-0">
                      <input
                        ref={(el) => setCellRef(idx, "discountPercent", el)}
                        type="number"
                        min={0}
                        max={100}
                        value={item.discountPercent || ""}
                        onChange={(e) => {
                          const val = Math.min(Math.max(parseFloat(e.target.value) || 0, 0), 100)
                          updateItem(idx, { discountPercent: val })
                        }}
                        onKeyDown={(e) => handleCellKeyDown(e, idx, "discountPercent")}
                        placeholder="0"
                        className={cn(CELL_INPUT_NUM, "font-semibold text-slate-900 dark:text-slate-100")}
                      />
                    </td>

                    {/* IVA (Mejor contraste) */}
                    <td style={{ width: COL_WIDTHS.iva }} className="border-r border-slate-200 dark:border-slate-800 p-0">
                      <div className="flex items-center justify-center h-full px-0.5">
                        <Select value={item.ivaKey} onValueChange={(v) => updateItem(idx, { ivaKey: v })}>
                          <SelectTrigger className="h-6 text-xs w-full border-0 bg-transparent shadow-none p-0 px-1 hover:bg-emerald-500/10 focus:ring-1.5 focus:ring-emerald-500 text-center font-bold text-foreground">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {INVOICE_IVA_OPTIONS.map((opt) => (
                              <SelectItem key={opt.key} value={opt.key} className="text-xs font-medium">
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </td>

                    {/* Total línea (Destacado) */}
                    <td style={{ width: COL_WIDTHS.total }} className="border-r border-slate-200 dark:border-slate-800 p-0 bg-primary/5 dark:bg-primary/10">
                      <div className="px-2.5 py-1 text-right font-mono font-bold text-xs text-primary dark:text-primary-foreground">
                        {formatCurrency(line.lineTotal)}
                      </div>
                    </td>

                    {/* Nota de línea */}
                    <td style={{ width: COL_WIDTHS.note }} className="border-r border-slate-200 dark:border-slate-800 p-0">
                      <input
                        ref={(el) => setCellRef(idx, "note", el)}
                        value={item.note || ""}
                        onChange={(e) => updateItem(idx, { note: e.target.value })}
                        onKeyDown={(e) => handleCellKeyDown(e, idx, "note")}
                        placeholder="Nota..."
                        title={item.note || "Nota u observación de línea"}
                        className={cn(CELL_INPUT, "text-[11px] truncate font-normal")}
                      />
                    </td>

                    {/* Delete */}
                    <td style={{ width: COL_WIDTHS.delete }} className="p-0">
                      <div className="flex items-center justify-center h-full">
                        <button
                          type="button"
                          className="size-5.5 flex items-center justify-center rounded-xs text-slate-400 hover:text-destructive hover:bg-destructive/10 transition-colors"
                          onClick={() => handleRemoveItem(idx)}
                          title="Eliminar fila"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Quick add row button bar */}
        <div className="border-t border-slate-300 dark:border-slate-700/80 bg-slate-200/70 dark:bg-slate-800/70 px-3 py-1.5 flex items-center justify-between">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors group"
            onClick={() => {
              addItem()
              requestAnimationFrame(() => focusCell(items.length, "code"))
            }}
          >
            <span className="size-4 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <Plus className="size-3" />
            </span>
            <span>Agregar fila</span>
            <span className="text-[10px] font-normal text-slate-500 ml-1">
              (o presioná <kbd className="font-mono bg-white dark:bg-slate-900 px-1 py-0.5 rounded text-[9px] border border-slate-300 dark:border-slate-700 shadow-2xs">Tab</kbd> / <kbd className="font-mono bg-white dark:bg-slate-900 px-1 py-0.5 rounded text-[9px] border border-slate-300 dark:border-slate-700 shadow-2xs">Enter</kbd> al final)
            </span>
          </button>
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            {items.length} {items.length === 1 ? "ítem" : "ítems"}
          </span>
        </div>
      </div>

      <InvoiceArticleSelectorModal
        companyId={companyId}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSelect={handleModalSelect}
        onSelectFree={handleModalSelectFree}
        initialCode={modalRowIdx >= 0 ? items[modalRowIdx]?.code : undefined}
      />
    </div>
  )
}
