"use client"

import React, { useRef, useCallback, useState, useEffect, useMemo } from "react"
import { Plus, Trash2, Search, Link2 } from "lucide-react"
import { formatCurrency } from "@/lib/formatters"
import type { FormItem } from "@/hooks/usePresupuestoForm"
import type { PresupuestoFormErrors } from "@/hooks/usePresupuestoForm"
import type { CatalogMatch } from "@/data/mock-catalog"
import { getCatalogByCode, searchCatalogByName } from "@/data/mock-catalog"
import { IVA_OPTIONS } from "@/lib/presupuestos.constants"
import { cn } from "@/lib/utils"
import { calculateNetFromGross, parseVatOptionKey } from "@/lib/commercial/vat"
import { ArticleSelectorModal } from "@/components/presupuestos/ArticleSelectorModal"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

/**
 * CHATZAI-025 — IVA per item + codeResolved + IVA column.
 *
 * Changes from 017O:
 * - IVA column after Dto.% with per-item Select dropdown
 * - codeResolved: when code resolves to a catalog product, Artículo shows plain text
 * - When selecting from catalog/modal, ivaKey is carried from the catalog item
 * - Z article behavior preserved: editable description, editable price, no stock lookup
 */

interface PresupuestoItemsTableProps {
  items: FormItem[]
  addItem: () => void
  removeItem: (idx: number) => void
  updateItem: (idx: number, updates: Partial<FormItem>) => void
  errors: PresupuestoFormErrors
  /** workspace mode — no heading, spreadsheet feel, inline add-row */
  workspace?: boolean
}

// Cell columns for keyboard navigation
// CHATZAI-025A-fix: Added "iva" to navigation so Tab doesn't skip the IVA column
type CellCol = "code" | "name" | "quantity" | "unitPrice" | "discountPercent" | "iva" | "observacion"

// Shared cell input classes — flat, borderless, Excel-cell-like
const CELL_INPUT =
  "w-full h-full bg-transparent border-0 outline-none px-1.5 py-0 text-[11px] " +
  "hover:bg-emerald-50/60 focus:bg-emerald-50/40 focus:ring-1 focus:ring-inset focus:ring-emerald-400 " +
  "transition-colors duration-75"

const CELL_INPUT_NUM =
  "w-full h-full bg-transparent border-0 outline-none px-1.5 py-0 text-[11px] text-right tabular-nums " +
  "hover:bg-emerald-50/60 focus:bg-emerald-50/40 focus:ring-1 focus:ring-inset focus:ring-emerald-400 " +
  "transition-colors duration-75"

const CELL_INPUT_ERROR = "ring-1 ring-inset ring-destructive/50 bg-destructive/5"

// ─── Column widths (CHATZAI-025: added iva column) ───
const COL_WIDTHS = {
  code: "90px",
  name: undefined,      // auto (flex)
  quantity: "52px",
  unitPrice: "115px",
  discountPercent: "56px",
  iva: "80px",          // CHATZAI-025: IVA per item
  subtotal: "100px",
  observacion: undefined, // auto (flex)
  delete: "28px",
} as const

/** Autocomplete dropdown for the Artículo column */
function ArticleAutocomplete({
  idx,
  item,
  updateItem,
  onFocusCell,
  onKeyDown,
  hasError,
}: {
  idx: number
  item: FormItem
  updateItem: (idx: number, updates: Partial<FormItem>) => void
  onFocusCell: (rowIdx: number, col: CellCol) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, rowIdx: number, col: CellCol) => void
  hasError: boolean
}) {
  const [query, setQuery] = useState(item.name)
  const [isOpen, setIsOpen] = useState(false)
  const [results, setResults] = useState<CatalogMatch[]>([])
  const [highlightIdx, setHighlightIdx] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const ignoreBlurRef = useRef(false)

  // Sync query when item.name changes externally (e.g., from code autocomplete)
  useEffect(() => {
    setQuery(item.name)
  }, [item.name])

  // Search catalog as user types
  useEffect(() => {
    if (!isOpen || !query.trim()) {
      setResults([])
      setHighlightIdx(-1)
      return
    }
    const matches = searchCatalogByName(query, 8)
    setResults(matches)
    setHighlightIdx(-1)
  }, [query, isOpen])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const handleSelect = useCallback((match: CatalogMatch) => {
    ignoreBlurRef.current = true
    updateItem(idx, {
      code: match.code,
      name: match.name,
      unitPrice: match.unitPrice,
      catalogItemId: match.id,
      ivaKey: match.ivaKey,
      codeResolved: true,
    })
    setQuery(match.name)
    setIsOpen(false)
    setResults([])
    setHighlightIdx(-1)
    requestAnimationFrame(() => onFocusCell(idx, "quantity"))
  }, [idx, updateItem, onFocusCell])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    setIsOpen(true)
    updateItem(idx, {
      name: value,
      catalogItemId: "", // manual edit breaks catalog link → libre
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
    onKeyDown(e, idx, "name")
  }, [isOpen, results, highlightIdx, handleSelect, onKeyDown, idx])

  const handleFocus = useCallback(() => {
    if (query.trim()) {
      setIsOpen(true)
    }
  }, [query])

  const handleBlur = useCallback(() => {
    setTimeout(() => {
      if (!ignoreBlurRef.current) {
        setIsOpen(false)
      }
      ignoreBlurRef.current = false
    }, 150)
  }, [])

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <input
        ref={inputRef}
        value={query}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder="Buscar artículo..."
        className={cn(
          CELL_INPUT,
          "font-medium",
          !item.name.trim() && hasError && CELL_INPUT_ERROR
        )}
      />
      {/* Catalog linked indicator */}
      {item.catalogItemId && (
        <div className="absolute right-0.5 top-1/2 -translate-y-1/2">
          <Link2 className="size-2.5 text-emerald-600" />
        </div>
      )}
      {/* Dropdown results */}
      {isOpen && results.length > 0 && (
        <div className="absolute z-50 top-full left-0 w-[280px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-[200px] overflow-y-auto">
          {results.map((match, i) => (
            <button
              key={match.id}
              type="button"
              className={cn(
                "w-full text-left px-2 py-1.5 text-[11px] flex items-start gap-2 transition-colors",
                i === highlightIdx
                  ? "bg-emerald-50 dark:bg-emerald-950/30"
                  : "hover:bg-muted/60"
              )}
              onMouseDown={() => handleSelect(match)}
              onMouseEnter={() => setHighlightIdx(i)}
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{match.name}</div>
                <div className="text-[9px] text-muted-foreground flex gap-2">
                  <span>{match.code}</span>
                  <span>{match.section}</span>
                  <span>{formatCurrency(match.unitPrice)}</span>
                  <span className="text-emerald-600">IVA {match.ivaKey === "exento" ? "Ex." : match.ivaKey + "%"}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
      {/* No results message */}
      {isOpen && query.trim() && results.length === 0 && (
        <div className="absolute z-50 top-full left-0 w-[280px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg p-3">
          <p className="text-[10px] text-muted-foreground">
            Sin resultados. Se cargará como artículo flexible
          </p>
        </div>
      )}
    </div>
  )
}

export function PresupuestoItemsTable({
  items,
  addItem,
  removeItem,
  updateItem,
  errors,
  workspace = false,
}: PresupuestoItemsTableProps) {
  // Ref map: `${rowIdx}-${colName}` → HTMLInputElement
  const cellRefs = useRef<Map<string, HTMLInputElement>>(new Map())

  // Modal state for article selector
  const [modalOpen, setModalOpen] = useState(false)
  const [modalRowIdx, setModalRowIdx] = useState<number>(-1)

  const setCellRef = useCallback((rowIdx: number, col: CellCol, el: HTMLInputElement | null) => {
    const key = `${rowIdx}-${col}`
    if (el) cellRefs.current.set(key, el)
    else cellRefs.current.delete(key)
  }, [])

  // Navigate to a specific cell
  const focusCell = useCallback((rowIdx: number, col: CellCol) => {
    requestAnimationFrame(() => {
      const key = `${rowIdx}-${col}`
      const el = cellRefs.current.get(key)
      el?.focus()
      el?.select()
    })
  }, [])

  // CHATZAI-025: Handle code blur — lookup catalog by code + Z detection + codeResolved
  const handleCodeBlur = useCallback((idx: number, code: string) => {
    if (!code.trim()) {
      // Code cleared → reset codeResolved
      updateItem(idx, { codeResolved: false, catalogItemId: "" })
      return
    }

    // CHATZAI-017R: "Z" (case-insensitive) triggers flexible article mode
    if (code.trim().toUpperCase() === "Z") {
      updateItem(idx, {
        code: "Z",
        name: "Artículo flexible",
        catalogItemId: "",
        isArticuloLibre: true,
        codeResolved: false, // Z is not a catalog resolve
      })
      return
    }

    const match = getCatalogByCode(code)
    if (match) {
      updateItem(idx, {
        name: match.name,
        unitPrice: match.unitPrice,
        catalogItemId: match.id,
        code: match.code,
        ivaKey: match.ivaKey,
        codeResolved: true,
      })
    } else {
      // Code changed to unrecognized → clear codeResolved
      updateItem(idx, { codeResolved: false })
    }
  }, [updateItem])

  // Open article selector modal for a given row
  const openArticleSelector = useCallback((idx: number) => {
    setModalRowIdx(idx)
    setModalOpen(true)
  }, [])

  // Handle article selection from modal
  const handleModalSelect = useCallback((match: CatalogMatch) => {
    if (modalRowIdx < 0) return
    updateItem(modalRowIdx, {
      code: match.code,
      name: match.name,
      unitPrice: match.unitPrice,
      catalogItemId: match.id,
      ivaKey: match.ivaKey,
      codeResolved: true,
    })
    // Move focus to quantity after selection
    requestAnimationFrame(() => focusCell(modalRowIdx, "quantity"))
  }, [modalRowIdx, updateItem, focusCell])

  // Handle free article selection from modal
  const handleModalSelectFree = useCallback(() => {
    if (modalRowIdx < 0) return
    updateItem(modalRowIdx, {
      code: "Z",
      name: "Artículo flexible",
      catalogItemId: "",
      codeResolved: false,
    })
    requestAnimationFrame(() => focusCell(modalRowIdx, "name"))
  }, [modalRowIdx, updateItem, focusCell])

  // Tab / Enter navigation between cells
  // CHATZAI-025A-fix: "iva" column is a Select (not an input ref), so skip it during Tab navigation
  const handleCellKeyDown = useCallback((
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIdx: number,
    col: CellCol,
  ) => {
    const cols: CellCol[] = ["code", "name", "quantity", "unitPrice", "discountPercent", "iva", "observacion"]
    // Columns that have focusable input refs
    const focusableCols: CellCol[] = ["code", "name", "quantity", "unitPrice", "discountPercent", "observacion"]
    const colIdx = cols.indexOf(col)

    // Find next/prev focusable column
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
        // Enter moves down within same column; if column is not focusable, find nearest
        const targetCol = focusableCols.includes(col) ? col : focusableCols[0]
        focusCell(rowIdx + 1, targetCol)
      } else {
        addItem()
        const targetCol = focusableCols.includes(col) ? col : focusableCols[0]
        requestAnimationFrame(() => focusCell(items.length, targetCol))
      }
    }
  }, [items.length, addItem, focusCell, handleCodeBlur])

  const handleRemoveItem = useCallback((idx: number) => {
    const item = items[idx]
    if (!item) return
    const hasContent = item.name.trim() || item.unitPrice > 0
    if (hasContent) {
      const confirmed = window.confirm(
        `¿Eliminar el artículo${item.name ? ` "${item.name}"` : ""}? Esta acción no se puede deshacer.`
      )
      if (!confirmed) return
    }
    removeItem(idx)
  }, [items, removeItem])

  return (
    <div className={cn("flex flex-col", workspace && "flex-1 min-h-0")}>
      {!workspace && (
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Artículos</h3>
        </div>
      )}

      {errors.items && (
        <div className="bg-destructive/5 border border-destructive/30 px-2 py-1 mb-1 shrink-0">
          <p className="text-[10px] text-destructive">{errors.items}</p>
        </div>
      )}

      {items.length > 0 ? (
        <div className={cn("flex flex-col border border-gray-300 dark:border-gray-600", workspace && "flex-1 min-h-0")}>
          <div className={cn("overflow-y-auto", workspace ? "flex-1" : "max-h-[400px]")}>
            <table className="w-full border-collapse text-[11px]">
              {/* ─── Sticky header ─── */}
              <thead className="sticky top-0 z-10">
                <tr className="bg-gray-100 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-600 select-none">
                  <th style={{ width: COL_WIDTHS.code }} className="px-2 py-1 text-left font-semibold text-[10px] text-muted-foreground uppercase tracking-wider border-r border-gray-200 dark:border-gray-700">
                    Código
                  </th>
                  <th className="px-2 py-1 text-left font-semibold text-[10px] text-muted-foreground uppercase tracking-wider border-r border-gray-200 dark:border-gray-700">
                    Artículo <span className="text-destructive">*</span>
                  </th>
                  <th style={{ width: COL_WIDTHS.quantity }} className="px-2 py-1 text-right font-semibold text-[10px] text-muted-foreground uppercase tracking-wider border-r border-gray-200 dark:border-gray-700">
                    Cant.
                  </th>
                  <th style={{ width: "115px" }} className="px-2 py-1 text-right font-semibold text-[10px] text-muted-foreground uppercase tracking-wider border-r border-gray-200 dark:border-gray-700">
                    P. Final (IVA inc.) <span className="text-destructive">*</span>
                  </th>
                  <th style={{ width: COL_WIDTHS.discountPercent }} className="px-2 py-1 text-right font-semibold text-[10px] text-muted-foreground uppercase tracking-wider border-r border-gray-200 dark:border-gray-700">
                    Dto. %
                  </th>
                  {/* CHATZAI-025: IVA per item column */}
                  <th style={{ width: COL_WIDTHS.iva }} className="px-2 py-1 text-center font-semibold text-[10px] text-muted-foreground uppercase tracking-wider border-r border-gray-200 dark:border-gray-700">
                    IVA
                  </th>
                  <th style={{ width: COL_WIDTHS.subtotal }} className="px-2 py-1 text-right font-semibold text-[10px] text-muted-foreground uppercase tracking-wider border-r border-gray-200 dark:border-gray-700">
                    Total línea
                  </th>
                  <th className="px-2 py-1 text-left font-semibold text-[10px] text-muted-foreground uppercase tracking-wider border-r border-gray-200 dark:border-gray-700">
                    Observación
                  </th>
                  <th style={{ width: COL_WIDTHS.delete }} className="px-1 py-1"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const isEven = idx % 2 === 0
                  const hasError = (!item.name.trim() || item.unitPrice <= 0) && errors.items
                  const rowBorderClass = idx < items.length - 1
                    ? "border-b border-gray-200 dark:border-gray-700"
                    : ""

                  // CHATZAI-017O: Line subtotal for display
                  const clampedDiscount = Math.min(Math.max(item.discountPercent, 0), 100)
                  const lineSubtotal = item.quantity * item.unitPrice * (1 - clampedDiscount / 100)

                  // Derive net and iva from gross unit price using central engine
                  let netUnit = item.unitPrice
                  let ivaUnit = 0
                  try {
                    const vatParsed = parseVatOptionKey(item.ivaKey || "21")
                    const netCalc = calculateNetFromGross(item.unitPrice, vatParsed.rate, vatParsed.treatment)
                    netUnit = netCalc.netUnitPrice.toNumber()
                    ivaUnit = netCalc.vatUnitPrice.toNumber()
                  } catch {
                    netUnit = item.unitPrice
                  }

                  return (
                    <tr
                      key={idx}
                      className={cn(
                        "h-7",
                        isEven ? "bg-white dark:bg-gray-900" : "bg-gray-50/80 dark:bg-gray-900/50",
                        "hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20",
                        "transition-colors duration-75",
                        rowBorderClass
                      )}
                    >
                      {/* Código — search icon + modal trigger + direct edit */}
                      <td style={{ width: COL_WIDTHS.code }} className="border-r border-gray-200 dark:border-gray-700 p-0">
                        <div className="flex items-center w-full h-full">
                          <input
                            ref={(el) => setCellRef(idx, "code", el)}
                            value={item.code}
                            onChange={(e) => {
                              // CHATZAI-025: When code changes, reset codeResolved
                              updateItem(idx, { code: e.target.value, codeResolved: false })
                            }}
                            onBlur={(e) => handleCodeBlur(idx, e.target.value)}
                            onKeyDown={(e) => handleCellKeyDown(e, idx, "code")}
                            placeholder="—"
                            className={cn(CELL_INPUT, "flex-1 min-w-0")}
                          />
                          <button
                            type="button"
                            className="shrink-0 size-4 flex items-center justify-center rounded-sm text-muted-foreground/50 hover:text-emerald-600 hover:bg-emerald-50/60 transition-colors mr-0.5"
                            onClick={() => openArticleSelector(idx)}
                            title="Buscar en catálogo"
                          >
                            <Search className="size-2.5" />
                          </button>
                          {/* Linked indicator */}
                          {item.catalogItemId && (
                            <Link2 className="size-2.5 text-emerald-600 shrink-0 mr-0.5" />
                          )}
                        </div>
                      </td>

                      {/* Artículo / Nombre — autocomplete or plain text (CHATZAI-025: codeResolved) */}
                      <td className="border-r border-gray-200 dark:border-gray-700 p-0">
                        {item.codeResolved ? (
                          // CHATZAI-025: When code is resolved, show name as read-only plain text
                          <div className="flex items-center w-full h-full px-1.5">
                            <span className="text-[11px] font-medium truncate text-foreground/90">
                              {item.name}
                            </span>
                            {item.catalogItemId && (
                              <Link2 className="size-2.5 text-emerald-600 shrink-0 ml-1" />
                            )}
                          </div>
                        ) : (
                          <ArticleAutocomplete
                            idx={idx}
                            item={item}
                            updateItem={updateItem}
                            onFocusCell={focusCell}
                            onKeyDown={handleCellKeyDown}
                            hasError={!!(!item.name.trim() && hasError)}
                          />
                        )}
                      </td>

                      {/* Cantidad */}
                      <td style={{ width: COL_WIDTHS.quantity }} className="border-r border-gray-200 dark:border-gray-700 p-0">
                        <input
                          ref={(el) => setCellRef(idx, "quantity", el)}
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => updateItem(idx, { quantity: parseInt(e.target.value) || 1 })}
                          onKeyDown={(e) => handleCellKeyDown(e, idx, "quantity")}
                          className={CELL_INPUT_NUM}
                        />
                      </td>

                      {/* Precio unitario final (IVA inc.) */}
                      <td style={{ width: COL_WIDTHS.unitPrice }} className="border-r border-gray-200 dark:border-gray-700 p-0">
                        <div className="flex flex-col justify-center h-full px-1 py-0.5">
                          <input
                            ref={(el) => setCellRef(idx, "unitPrice", el)}
                            type="number"
                            min={0}
                            step="0.01"
                            value={item.unitPrice || ""}
                            onChange={(e) => updateItem(idx, { unitPrice: parseFloat(e.target.value) || 0 })}
                            onKeyDown={(e) => handleCellKeyDown(e, idx, "unitPrice")}
                            placeholder="$0"
                            className={cn(
                              CELL_INPUT_NUM,
                              item.unitPrice <= 0 && hasError && CELL_INPUT_ERROR
                            )}
                          />
                          {item.unitPrice > 0 ? (
                            <span
                              className="text-[9px] text-muted-foreground text-right leading-none pb-0.5 truncate"
                              title={`Neto: ${formatCurrency(netUnit)} · IVA ${item.ivaKey}%: ${formatCurrency(ivaUnit)}`}
                            >
                              Neto: {formatCurrency(netUnit)}
                            </span>
                          ) : null}
                        </div>
                      </td>

                      {/* Dto. % (editable) */}
                      <td style={{ width: COL_WIDTHS.discountPercent }} className="border-r border-gray-200 dark:border-gray-700 p-0">
                        <input
                          ref={(el) => setCellRef(idx, "discountPercent", el)}
                          type="number"
                          min={0}
                          max={100}
                          value={item.discountPercent || ""}
                          onChange={(e) => {
                            let val = parseFloat(e.target.value)
                            if (isNaN(val)) val = 0
                            if (val < 0) val = 0
                            if (val > 100) val = 100
                            updateItem(idx, { discountPercent: val })
                          }}
                          onKeyDown={(e) => handleCellKeyDown(e, idx, "discountPercent")}
                          placeholder="0"
                          className={CELL_INPUT_NUM}
                        />
                      </td>

                      {/* CHATZAI-025: IVA per item — Select dropdown */}
                      <td style={{ width: COL_WIDTHS.iva }} className="border-r border-gray-200 dark:border-gray-700 p-0">
                        <div className="flex items-center justify-center h-full px-0.5">
                          <Select value={item.ivaKey} onValueChange={(v) => updateItem(idx, { ivaKey: v })}>
                            <SelectTrigger className="h-6 text-[10px] w-full border-0 bg-transparent shadow-none p-0 px-1 hover:bg-emerald-50/60 focus:ring-1 focus:ring-emerald-400">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {IVA_OPTIONS.map((opt) => (
                                <SelectItem key={opt.key} value={opt.key} className="text-[11px]">
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </td>

                      {/* Subtotal (computed) */}
                      <td style={{ width: COL_WIDTHS.subtotal }} className="border-r border-gray-200 dark:border-gray-700 p-0">
                        <div className="px-1.5 py-0 text-right font-medium tabular-nums text-foreground/80">
                          {formatCurrency(lineSubtotal)}
                        </div>
                      </td>

                      {/* Observación / desc. libre */}
                      <td className="border-r border-gray-200 dark:border-gray-700 p-0">
                        <input
                          ref={(el) => setCellRef(idx, "observacion", el)}
                          value={item.descripcionLibre || ""}
                          onChange={(e) => updateItem(idx, { descripcionLibre: e.target.value })}
                          onKeyDown={(e) => handleCellKeyDown(e, idx, "observacion")}
                          placeholder="Obs."
                          className={CELL_INPUT}
                        />
                      </td>

                      {/* Delete */}
                      <td style={{ width: COL_WIDTHS.delete }} className="p-0">
                        <div className="flex items-center justify-center h-full">
                          <button
                            type="button"
                            className="size-5 flex items-center justify-center rounded-sm text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors"
                            onClick={() => handleRemoveItem(idx)}
                            title="Eliminar artículo"
                          >
                            <Trash2 className="size-2.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* ─── Quick add-row bar (workspace mode) ─── */}
            {workspace && (
              <div className="border-t border-gray-300 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-900/30">
                <button
                  type="button"
                  className="w-full flex items-center gap-1.5 px-2 py-1 text-[10px] text-muted-foreground hover:text-emerald-700 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/10 transition-colors"
                  onClick={() => {
                    addItem()
                    requestAnimationFrame(() => focusCell(items.length, "code"))
                  }}
                >
                  <Plus className="size-2.5" />
                  <span>Agregar fila</span>
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className={cn(
          "border border-gray-300 dark:border-gray-600 text-center",
          workspace ? "flex-1 flex flex-col items-center justify-center p-8" : "p-8"
        )}>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">
              Sin artículos
            </p>
            <p className="text-[10px] text-muted-foreground/70">
              Use el botón <span className="font-semibold">+ Agregar fila</span> en la toolbar
              {workspace && " o cargue una plantilla"}.
            </p>
          </div>
        </div>
      )}

      {/* Add item button (only in non-workspace mode) */}
      {!workspace && (
        <button
          type="button"
          className="flex items-center gap-1.5 h-7 text-xs mt-2 px-2 border border-gray-300 dark:border-gray-600 rounded-sm hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 text-muted-foreground hover:text-emerald-700 transition-colors"
          onClick={() => {
            addItem()
            requestAnimationFrame(() => focusCell(items.length, "code"))
          }}
        >
          <Plus className="size-3" />
          Agregar artículo
        </button>
      )}

      {/* CHATZAI-017O: Article Selector Modal */}
      <ArticleSelectorModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSelect={handleModalSelect}
        onSelectFree={handleModalSelectFree}
        initialCode={modalRowIdx >= 0 ? items[modalRowIdx]?.code : undefined}
      />
    </div>
  )
}
