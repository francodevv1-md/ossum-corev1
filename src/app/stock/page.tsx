"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Package,
  Plus,
  Search,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { TooltipProvider } from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  ARTICLE_TYPES,
  ARTICLE_TYPE_LABEL,
  BRANDS,
  CATEGORIES,
  FAMILIES,
  FAMILY_STYLE,
  TRACE_METHODS,
  type Family,
  type StockItem,
  type TraceMethod,
} from "@/lib/stock/stock-ui-model"
import {
  ColumnsPanel,
  DEFAULT_VIEW_KEY,
  pinnedOffsets,
  STOCK_COLUMN_BY_KEY,
  STOCK_VIEWS,
  type StockColumn,
  type StockColumnKey,
} from "@/components/stock/StockColumns"
import { StockArticleSheet, type FichaTab } from "@/components/stock/StockArticleSheet"
import { ArticleCodesDialog } from "@/components/stock/ArticleCodesDialog"
import { useAuth } from "@/components/auth/AuthProvider"
import { apiFetch } from "@/lib/api/client"
import { useStock } from "@/hooks/useStock"

// ─── Sort ─────────────────────────────────────────────────

type SortKey = "codigo" | "articulo" | "categoria" | "marca" | "disponible" | "reservado" | "transito" | "estado" | "costo" | "precio"
type SortDir = "asc" | "desc"
type ArticlePrefill = { gtin?: string; ai22?: string; rawValue?: string; trace?: "quantity" | "lot" | "lot-expiry" | "serial" | "serial-expiry" }

function scannedArticlePrefill(): ArticlePrefill | undefined {
  if (typeof window === "undefined") return undefined
  const params = new URLSearchParams(window.location.search)
  if (params.get("newArticle") !== "1") return undefined
  const trace = params.get("trace")
  return { gtin: params.get("gtin") || undefined, ai22: params.get("ai22") || undefined, rawValue: params.get("raw") || undefined, trace: trace === "lot" || trace === "lot-expiry" || trace === "serial" || trace === "serial-expiry" ? trace : "quantity" }
}

const COLUMN_SORT: Partial<Record<StockColumnKey, SortKey>> = {
  code: "codigo",
  name: "articulo",
  category: "categoria",
  brand: "marca",
  available: "disponible",
  reserved: "reservado",
  inTransit: "transito",
  status: "estado",
  cost: "costo",
  price: "precio",
}

function SortHeader({ label, sortKey, current, dir, onChange, align = "left" }: {
  label: string; sortKey: SortKey; current: SortKey | null; dir: SortDir
  onChange: (key: SortKey) => void; align?: "left" | "right"
}) {
  const active = current === sortKey
  const Icon = active ? (dir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown
  const nextDir = active && dir === "asc" ? "descendente" : "ascendente"
  return (
    <button
      type="button"
      onClick={() => onChange(sortKey)}
      aria-label={`Ordenar por ${label}, cambiar a orden ${nextDir}`}
      className={`inline-flex items-center gap-1 rounded-sm text-xs font-medium text-white transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--ossum-navy)] ${align === "right" ? "flex-row-reverse" : ""} ${active ? "opacity-100" : "opacity-80"}`}
    >
      {label}
      <Icon className={`size-3 ${active ? "opacity-100" : "opacity-40"}`} aria-hidden="true" />
    </button>
  )
}

function FilterSelect({ ariaLabel, value, onChange, options }: {
  ariaLabel: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }>
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={ariaLabel}
      className="h-8 rounded-md border border-[var(--ossum-line)] bg-white px-2.5 text-xs text-gray-600 focus:outline-none focus:ring-1 focus:ring-[var(--ossum-action)]"
    >
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  )
}


// ─── Quick filters (compact tokens, not KPIs) ─────────────

type QuickFilter = "" | "bajo" | "sinstock" | "transito"

function QuickFilterRow({ total, bajo, sinstock, transito, active, onSelect }: {
  total: number; bajo: number; sinstock: number; transito: number; active: QuickFilter; onSelect: (f: QuickFilter) => void
}) {
  const chips: Array<{ key: QuickFilter; label: string; value: number }> = [
    { key: "", label: "Total", value: total },
    { key: "bajo", label: "Bajo stock", value: bajo },
    { key: "sinstock", label: "Sin stock", value: sinstock },
    { key: "transito", label: "En tránsito", value: transito },
  ]
  return (
    <div
      role="region"
      aria-label="Filtros rápidos de stock"
      className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-[var(--ossum-line)] bg-white px-4 py-1.5 text-xs"
    >
      {chips.map(({ key, label, value }, idx) => {
        const isActive = active === key
        return (
          <span key={key || "total"} className="inline-flex items-center gap-3">
            {idx > 0 && <span className="text-gray-300" aria-hidden="true">·</span>}
            <button
              type="button"
              onClick={() => onSelect(isActive ? "" : key)}
              aria-pressed={isActive}
              className={`inline-flex min-h-[1.75rem] items-baseline gap-1 rounded px-1 py-0.5 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ossum-action)] ${isActive ? "font-semibold text-[var(--ossum-action)]" : "text-gray-500 hover:text-gray-700"}`}
            >
              <span>{label}</span>
              <span className="tabular-nums font-medium">{value}</span>
            </button>
          </span>
        )
      })}
    </div>
  )
}

// ─── Nuevo artículo modal ─────────────────────────────────

function FormField({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1 ${className}`}>
      <Label className="text-[11px] text-gray-500">{label}</Label>
      {children}
    </div>
  )
}

function NewArticleDialog({ open, onOpenChange, companyId, onCreated, prefill }: { open: boolean; onOpenChange: (v: boolean) => void; companyId?: string; onCreated?: () => void; prefill?: ArticlePrefill }) {
  const [family, setFamily] = useState("")
  const [category, setCategory] = useState("")
  const [pmAnmat, setPmAnmat] = useState("")
  const [isSterile, setIsSterile] = useState(false)
  const [method, setMethod] = useState<TraceMethod>(() => prefill?.trace === "serial" || prefill?.trace === "serial-expiry" ? "serie" : prefill?.trace === "lot" || prefill?.trace === "lot-expiry" ? "lote" : "cantidad")
  const [expiry, setExpiry] = useState(() => prefill?.trace === "serial-expiry" || prefill?.trace === "lot-expiry")
  const [sku, setSku] = useState(() => `ITM-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`)
  const [description, setDescription] = useState("")
  const [articleType, setArticleType] = useState("")
  const [brand, setBrand] = useState("")
  const [manufacturer, setManufacturer] = useState("")
  const [gtin, setGtin] = useState(() => prefill?.gtin ?? "")
  const [identifiers, setIdentifiers] = useState<Array<{ type: "MANUFACTURER_REF" | "GTIN_EAN" | "GS1_AI_22" | "SUPPLIER_CODE" | "ALTERNATIVE_CODE"; value: string; sourcePayload?: string; manufacturerContext?: string; supplierId?: string }>>(() => prefill?.ai22 ? [{ type: "GS1_AI_22", value: prefill.ai22, sourcePayload: prefill.rawValue }] : [])
  const [referenceCost, setReferenceCost] = useState("")
  const [referenceSalePrice, setReferenceSalePrice] = useState("")
  const [priceListCode, setPriceListCode] = useState("")
  const [leadTimeDays, setLeadTimeDays] = useState("")
  const [saving, setSaving] = useState(false)

  const familyStyle = family ? FAMILY_STYLE[family as Family] : null
  const FamilyIcon = familyStyle?.icon

  const save = async () => {
    if (!companyId) return toast.error("No hay una empresa activa")
    if (!description.trim()) return toast.error("La descripción es obligatoria")
    setSaving(true)
    try {
      const hasCommercial = Boolean(
        referenceCost !== "" || referenceSalePrice !== "" || priceListCode.trim() || leadTimeDays !== ""
      )
      const commercialProfile = hasCommercial
        ? {
            referenceCost: referenceCost !== "" ? Math.max(0, Number(referenceCost) || 0) : 0,
            referenceSalePrice: referenceSalePrice !== "" ? Math.max(0, Number(referenceSalePrice) || 0) : 0,
            currency: "ARS" as const,
            priceListCode: priceListCode.trim() || undefined,
            leadTimeDays: leadTimeDays !== "" ? Math.max(0, parseInt(leadTimeDays, 10) || 0) : undefined,
          }
        : undefined

      await apiFetch(`/api/companies/${encodeURIComponent(companyId)}/articles`, {
        method: "POST",
        body: JSON.stringify({
          description,
          sku: sku.trim() || undefined,
          articleType: articleType || undefined,
          category: category.trim() || undefined,
          pmAnmat: pmAnmat.trim() || undefined,
          isSterile,
          brand: brand || undefined,
          manufacturer: manufacturer || undefined,
          family: family || undefined,
          unit: "u",
          traceabilityPolicy: method === "cantidad" ? "NONE" : method === "lote" ? (expiry ? "LOT_EXPIRY" : "LOT") : method === "serie" ? (expiry ? "SERIAL_EXPIRY" : "SERIAL") : "LOT_SERIAL_EXPIRY",
          identifiers: [...(gtin.trim() ? [{ type: "GTIN_EAN" as const, value: gtin }] : []), ...identifiers].filter((item) => item.value.trim()),
          supplierMappings: identifiers.filter((item) => item.type === "SUPPLIER_CODE" && item.supplierId && item.value.trim()).map((item) => ({ supplierId: item.supplierId, supplierCode: item.value })),
          commercialProfile,
        }),
      })
      onOpenChange(false)
      onCreated?.()
      toast.success("Artículo creado")
    } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo crear el artículo") }
    finally { setSaving(false) }
  }

  const selectClass = "h-8 w-full rounded-md border border-[var(--ossum-line)] bg-white px-2.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-[var(--ossum-action)]"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-[var(--ossum-line)] px-6 py-4">
          <DialogTitle className="text-base text-[var(--ossum-navy)]">Nuevo artículo</DialogTitle>
          <DialogDescription className="text-xs">Creá la ficha maestra del producto.</DialogDescription>
        </DialogHeader>

        <div className="max-h-[66vh] space-y-6 overflow-y-auto px-6 py-5">
          {/* Identificación */}
          <section>
            <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--ossum-navy)]">Identificación</h3>
            {prefill?.rawValue && <div className="mb-4 rounded-md border border-[#dbe1ff] bg-[#eef0ff]/60 px-3 py-2 text-xs text-gray-600"><p className="font-medium text-[var(--ossum-navy)]">Datos traídos del escaneo</p><p className="mt-1 break-all font-mono text-[11px]">{prefill.rawValue}</p><p className="mt-1 text-[11px]">El GTIN y la trazabilidad se precompletaron cuando estaban presentes. AI (22) queda como identificador GS1 y requiere el fabricante BIOPROTECE para guardarse.</p></div>}
            <div className="flex gap-4">
              <div className="flex shrink-0 flex-col items-center gap-1.5">
                <div className="flex size-20 items-center justify-center overflow-hidden rounded-md border border-[var(--ossum-line)] bg-white">
                  {familyStyle && FamilyIcon ? (
                    <span className={`flex size-full items-center justify-center ${familyStyle.thumb}`}>
                      <FamilyIcon className="size-8" />
                    </span>
                  ) : (
                    <Package className="size-6 text-gray-300" />
                  )}
                </div>
              </div>

              <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2">
                <FormField label="Código / SKU"><Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="TORN-3.5-COR" className="h-8 font-mono text-xs" /></FormField>
                <FormField label="Descripción" className="sm:col-span-2"><Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Tornillo cortical 3.5 mm x 24 mm" className="h-8 text-xs" /></FormField>
                <FormField label="Tipo de artículo">
                  <select aria-label="Tipo de artículo" className={selectClass} value={articleType} onChange={(e) => setArticleType(e.target.value)}>
                    <option value="">Seleccionar tipo</option>
                    {ARTICLE_TYPES.map((t) => <option key={t} value={t}>{ARTICLE_TYPE_LABEL[t]}</option>)}
                  </select>
                </FormField>
                <FormField label="Marca">
                  <select aria-label="Marca" className={selectClass} value={brand} onChange={(e) => setBrand(e.target.value)}>
                    <option value="">Seleccionar marca</option>
                    {BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </FormField>
                <FormField label="Unidad base">
                  <Input value="u (Unidad)" readOnly className="h-8 text-xs bg-gray-50 text-gray-700" />
                </FormField>
              </div>
            </div>
          </section>

          <hr className="border-[var(--ossum-line)]" />

          {/* Clasificación y registro */}
          <section>
            <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--ossum-navy)]">Clasificación y registro</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <FormField label="Categoría">
                <select aria-label="Categoría" className={selectClass} value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="">Sin categoría</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </FormField>
              <FormField label="Familia / Patología">
                <select aria-label="Familia / Patología" className={selectClass} value={family} onChange={(e) => setFamily(e.target.value)}>
                  <option value="">Sin familia</option>
                  {FAMILIES.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </FormField>
              <FormField label="PM / Registro ANMAT"><Input aria-label="PM / Registro ANMAT" value={pmAnmat} onChange={(e) => setPmAnmat(e.target.value)} placeholder="PM-1182-1" className="h-8 font-mono text-xs" /></FormField>
              <FormField label="Fabricante"><Input value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} placeholder="DePuy Synthes" className="h-8 text-xs" /></FormField>
              <FormField label="GTIN / EAN"><Input value={gtin} onChange={(e) => setGtin(e.target.value)} placeholder="00888867011234" className="h-8 font-mono text-xs" /></FormField>
              <div className="flex items-center justify-between rounded-md border border-[var(--ossum-line)] bg-white px-3 py-2">
                <div>
                  <p className="text-xs font-medium text-gray-800">Producto estéril</p>
                  <p className="text-[10px] text-gray-400">Entrega estéril</p>
                </div>
                <Switch aria-label="Producto estéril" checked={isSterile} onCheckedChange={setIsSterile} />
              </div>
            </div>
          </section>

          <hr className="border-[var(--ossum-line)]" />

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--ossum-navy)]">Identificadores alternativos</h3>
              <Button type="button" variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => setIdentifiers((items) => [...items, { type: "ALTERNATIVE_CODE", value: "" }])}>Agregar código</Button>
            </div>
            <div className="space-y-2">
              {identifiers.map((identifier, index) => (
                <div key={`${index}-${identifier.type}`} className="grid gap-2 sm:grid-cols-[1fr_1.2fr_1fr_auto]">
                  <select aria-label={`Tipo de identificador ${index + 1}`} className={selectClass} value={identifier.type} onChange={(event) => setIdentifiers((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, type: event.target.value as typeof item.type } : item))}>
                    <option value="MANUFACTURER_REF">REF fabricante</option><option value="GTIN_EAN">GTIN / EAN</option><option value="GS1_AI_22">GS1 AI (22)</option><option value="SUPPLIER_CODE">Código proveedor</option><option value="ALTERNATIVE_CODE">Código alternativo</option>
                  </select>
                  <Input aria-label={`Valor de identificador ${index + 1}`} value={identifier.value} onChange={(event) => setIdentifiers((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, value: event.target.value } : item))} placeholder="Código" className="h-8 font-mono text-xs" />
                  <Input aria-label={`Contexto de identificador ${index + 1}`} value={identifier.type === "SUPPLIER_CODE" ? identifier.supplierId ?? "" : identifier.manufacturerContext ?? ""} onChange={(event) => setIdentifiers((items) => items.map((item, itemIndex) => itemIndex === index ? item.type === "SUPPLIER_CODE" ? { ...item, supplierId: event.target.value } : { ...item, manufacturerContext: event.target.value } : item))} placeholder={identifier.type === "SUPPLIER_CODE" ? "ID proveedor" : "Fabricante"} className="h-8 text-xs" />
                  <Button type="button" variant="ghost" size="icon" className="size-8 text-gray-400" aria-label={`Quitar identificador ${index + 1}`} onClick={() => setIdentifiers((items) => items.filter((_, itemIndex) => itemIndex !== index))}><X className="size-3.5" /></Button>
                </div>
              ))}
              {identifiers.length === 0 && <p className="text-[11px] text-gray-400">Sin códigos alternativos cargados.</p>}
            </div>
          </section>

          <hr className="border-[var(--ossum-line)]" />

          {/* Perfil comercial y de compras */}
          <section>
            <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--ossum-navy)]">Perfil comercial y de compras (por empresa)</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <FormField label="Costo de referencia (ARS)">
                <Input
                  type="number"
                  min="0"
                  step="any"
                  aria-label="Costo de referencia"
                  value={referenceCost}
                  onChange={(e) => setReferenceCost(e.target.value)}
                  placeholder="0.00"
                  className="h-8 font-mono text-xs"
                />
              </FormField>
              <FormField label="Precio de venta de referencia (ARS)">
                <Input
                  type="number"
                  min="0"
                  step="any"
                  aria-label="Precio de venta de referencia"
                  value={referenceSalePrice}
                  onChange={(e) => setReferenceSalePrice(e.target.value)}
                  placeholder="0.00"
                  className="h-8 font-mono text-xs"
                />
              </FormField>
              <FormField label="Lista / Código de precio">
                <Input
                  aria-label="Lista de precio"
                  value={priceListCode}
                  onChange={(e) => setPriceListCode(e.target.value)}
                  placeholder="LISTA-A"
                  className="h-8 text-xs"
                />
              </FormField>
              <FormField label="Plazo de entrega (días)">
                <Input
                  type="number"
                  min="0"
                  aria-label="Plazo de entrega"
                  value={leadTimeDays}
                  onChange={(e) => setLeadTimeDays(e.target.value)}
                  placeholder="15"
                  className="h-8 font-mono text-xs"
                />
              </FormField>
            </div>
          </section>

          <hr className="border-[var(--ossum-line)]" />

          {/* Control de inventario */}
          <section>
            <h3 className="mb-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--ossum-navy)]">Control de inventario</h3>
            <p className="mb-3 text-[11px] text-gray-400">Definí cómo se controla el artículo, no qué lote o serie existe hoy.</p>

            <p className="mb-1.5 text-[11px] font-medium text-gray-600">Método de trazabilidad</p>
            <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Método de trazabilidad">
              {TRACE_METHODS.map((option) => {
                const selected = method === option.id
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => { setMethod(option.id); if (option.id === "cantidad") setExpiry(false) }}
                    className={`rounded-md border px-3 py-2 text-left transition-colors ${selected ? "border-[var(--ossum-action)] bg-[#eef0ff] ring-1 ring-[var(--ossum-action)]" : "border-[var(--ossum-line)] bg-white hover:border-gray-300"}`}
                  >
                    <span className={`block text-xs font-medium ${selected ? "text-[var(--ossum-action)]" : "text-gray-800"}`}>{option.label}</span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-gray-400">{option.hint}</span>
                  </button>
                )
              })}
            </div>

            <div className="mt-3 flex items-center justify-between rounded-md border border-[var(--ossum-line)] bg-white px-3 py-2">
              <div>
                <p className="text-xs font-medium text-gray-800">Controlar vencimiento</p>
                <p className="text-[10px] text-gray-400">Permite combinar {method === "serie" ? "Serie" : method === "lote" ? "Lote" : "Cantidad"} + vencimiento.</p>
              </div>
               <Switch checked={expiry} disabled={method === "cantidad"} onCheckedChange={setExpiry} />
            </div>
          </section>
        </div>

        <DialogFooter className="border-t border-[var(--ossum-line)] px-6 py-3">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button size="sm" disabled={saving} className="h-8 bg-[var(--ossum-action)] text-xs text-white hover:bg-[#1830a8]" onClick={save}>{saving ? "Guardando…" : "Guardar artículo"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main page ────────────────────────────────────────────

export default function StockPage() {
  const { activeCompany } = useAuth()
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [familyFilter, setFamilyFilter] = useState("")
  const [brandFilter, setBrandFilter] = useState("")
  const [typeFilter, setTypeFilter] = useState("")
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("")
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(50)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 250)
    return () => clearTimeout(timer)
  }, [search])

  const [viewKey, setViewKey] = useState<string>(DEFAULT_VIEW_KEY)
  const [customColumns, setCustomColumns] = useState<StockColumnKey[]>(STOCK_VIEWS.find((v) => v.key === "operativo")!.columns)

  const [sortKey, setSortKey] = useState<SortKey>("articulo")
  const [sortDir, setSortDir] = useState<SortDir>("asc")

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sheet, setSheet] = useState<{ item: StockItem; tab: FichaTab } | null>(null)
  const [codesItem, setCodesItem] = useState<StockItem | null>(null)
  const [articlePrefill, setArticlePrefill] = useState<ArticlePrefill | undefined>(scannedArticlePrefill)
  const [newOpen, setNewOpen] = useState(() => Boolean(scannedArticlePrefill()))

  const stockQuery = useMemo(() => ({
    search: debouncedSearch || undefined,
    family: familyFilter || undefined,
    brand: brandFilter || undefined,
    articleType: typeFilter || undefined,
    quickFilter,
    sortKey,
    sortDir,
    page,
    limit,
  }), [debouncedSearch, familyFilter, brandFilter, typeFilter, quickFilter, sortKey, sortDir, page, limit])

  const {
    items: stockItems,
    summary,
    facets,
    pagination,
    loading: stockLoading,
    ready: stockReady,
    error: stockError,
    refresh: refreshStock,
  } = useStock(stockQuery)

  const allStockItems = useMemo<StockItem[]>(() => {
    return stockItems.map((article) => ({
      id: article.id,
      code: article.code,
      name: article.name,
      descriptionExtra: "",
      family: (article.family || "Insumos") as Family,
      category: article.category || "",
      rubro: "",
      seccion: "",
      linea: "",
      brand: article.brand || "",
      type: article.articleType || "Otro",
      unit: article.unit || "u",
      unitBuy: article.unit || "u",
      manufacturer: article.manufacturer || "",
      gtin: article.gtin || "",
      pm: article.pmAnmat || "",
      sterile: article.isSterile ?? false,
      preferredSupplier: article.preferredSupplier || "",
      cost: article.cost ?? 0,
      price: article.price ?? 0,
      priceList: article.priceListCode || "",
      leadTime: article.leadTimeDays != null ? `${article.leadTimeDays} días` : "",
      available: article.available,
      reserved: article.reserved,
      inTransit: article.inTransit,
      min: article.min,
      state: (article.state === "Bajo stock" || article.state === "Sin stock" ? "Pendiente" : article.state === "En tránsito" ? "En tránsito" : "Disponible") as StockItem["state"],
      masterStatus: article.masterStatus,
      control: article.control,
      lots: [],
      movements: [],
      articleType: (article.articleType || "Otro") as StockItem["articleType"],
      suppliers: [],
    }))
  }, [stockItems])

  const visibleColumns = useMemo<StockColumn[]>(() => {
    const view = STOCK_VIEWS.find((v) => v.key === viewKey) ?? STOCK_VIEWS[0]
    const keys = viewKey === "personalizada" ? customColumns : view.columns
    return keys.map((k) => STOCK_COLUMN_BY_KEY[k]).filter((c): c is StockColumn => Boolean(c))
  }, [viewKey, customColumns])

  const visibleKeys = useMemo(() => new Set(visibleColumns.map((c) => c.key)), [visibleColumns])
  const stickyLeft = useMemo(() => pinnedOffsets(visibleColumns), [visibleColumns])

  const onSortChange = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir(key === "articulo" || key === "codigo" ? "asc" : "desc")
    }
    setPage(1)
  }

  const clearFilters = () => {
    setSearch("")
    setDebouncedSearch("")
    setFamilyFilter("")
    setBrandFilter("")
    setTypeFilter("")
    setQuickFilter("")
    setPage(1)
  }

  const hasFilters = Boolean(search || familyFilter || brandFilter || typeFilter || quickFilter)

  const selectItem = (item: StockItem) => setSelectedId(item.id)
  const openSheet = (item: StockItem, tab: FichaTab = "general") => setSheet({ item, tab })

  const toggleColumn = (key: StockColumnKey) => {
    const current = visibleColumns.map((c) => c.key)
    const next = current.includes(key) ? current.filter((k) => k !== key) : [...current, key]
    setCustomColumns(next)
    setViewKey("personalizada")
  }

  const onViewChange = (key: string) => {
    setViewKey(key)
    if (key === "personalizada") {
      setCustomColumns((prev) => (prev.length ? prev : [...(STOCK_VIEWS.find((v) => v.key === "operativo")!.columns)]))
    }
  }

  const startRecord = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1
  const endRecord = Math.min(pagination.page * pagination.limit, pagination.total)

  return (
    <TooltipProvider>
      <div className="flex h-full min-h-0 flex-col bg-[var(--ossum-surface)]">
      {/* ── HEADER ── */}
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--ossum-line)] bg-white px-4 py-2">
        <div>
          <h1 className="text-base font-semibold text-[var(--ossum-navy)]">Stock</h1>
          <p className="text-[11px] text-gray-400">
            {pagination.total} artículo{pagination.total !== 1 ? "s" : ""}
            {hasFilters ? " · filtrado" : ""}
          </p>
        </div>
        <Button
          size="sm"
          className="h-8 bg-[var(--ossum-action)] text-xs text-white hover:bg-[#1830a8]"
          onClick={() => setNewOpen(true)}
        >
          <Plus className="size-3.5" /> Nuevo artículo
        </Button>
      </header>

      {/* ── TOOLBAR ── */}
      <div className="shrink-0 border-b border-[var(--ossum-line)] bg-white px-4 py-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-60 md:w-64">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Buscar artículo, SKU, lote o serie…"
              aria-label="Buscar artículo"
              className="h-8 pl-8 text-xs"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("")
                  setDebouncedSearch("")
                  setPage(1)
                }}
                aria-label="Limpiar búsqueda"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ossum-action)]"
              >
                <X className="size-3" />
              </button>
            )}
          </div>
          <FilterSelect
            ariaLabel="Filtrar por familia"
            value={familyFilter}
            onChange={(value) => {
              setFamilyFilter(value)
              setPage(1)
            }}
            options={[
              { value: "", label: "Todas las familias" },
              ...facets.families.map((f) => ({ value: f, label: f })),
            ]}
          />
          <FilterSelect
            ariaLabel="Filtrar por marca"
            value={brandFilter}
            onChange={(value) => {
              setBrandFilter(value)
              setPage(1)
            }}
            options={[
              { value: "", label: "Todas las marcas" },
              ...facets.brands.map((b) => ({ value: b, label: b })),
            ]}
          />
          <FilterSelect
            ariaLabel="Filtrar por tipo"
            value={typeFilter}
            onChange={(value) => {
              setTypeFilter(value)
              setPage(1)
            }}
            options={[
              { value: "", label: "Todos los tipos" },
              ...facets.articleTypes.map((t) => ({ value: t, label: t })),
            ]}
          />
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="rounded px-1.5 py-1 text-xs text-gray-500 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ossum-action)]"
            >
              Limpiar filtros
            </button>
          )}

          <div className="flex w-full items-center justify-between gap-2 pt-1 sm:ml-auto sm:w-auto sm:justify-end sm:pt-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500">Vista:</span>
              <select
                value={viewKey}
                onChange={(e) => onViewChange(e.target.value)}
                aria-label="Seleccionar vista"
                className="h-8 rounded-md border border-[var(--ossum-line)] bg-white px-2.5 text-xs text-gray-600 focus:outline-none focus:ring-1 focus:ring-[var(--ossum-action)]"
              >
                {STOCK_VIEWS.map((v) => (
                  <option key={v.key} value={v.key}>{v.label}</option>
                ))}
              </select>
            </div>
            <ColumnsPanel visibleKeys={visibleKeys} onToggle={toggleColumn} />
          </div>
        </div>
      </div>

      {/* ── QUICK FILTERS ── */}
      <QuickFilterRow
        total={summary.total}
        bajo={summary.bajo}
        sinstock={summary.sinstock}
        transito={summary.transito}
        active={quickFilter}
        onSelect={(f) => {
          setQuickFilter(f)
          setPage(1)
        }}
      />

      {/* ── CONTENT ── */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {allStockItems.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-5 py-10 text-center">
              <Package className="size-5 text-muted-foreground" />
              <div>
                <p className="font-medium">No se encontraron artículos</p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Probá con otro texto o quitá los filtros activos.
                </p>
              </div>
              {hasFilters && (
                <Button type="button" size="sm" variant="outline" onClick={clearFilters}>
                  Limpiar filtros
                </Button>
              )}
            </div>
          ) : (
            <div className="mx-1 my-1 flex-1 overflow-hidden border border-[var(--ossum-line)] bg-white sm:mx-3 sm:my-2">
              <div className="h-full overflow-auto" tabIndex={0} aria-label="Tabla de artículos de stock con desplazamiento">
                <table className="w-full min-w-[1080px] border-separate border-spacing-0 text-xs" aria-label="Catálogo de stock">
                  <thead>
                    <tr>
                      {visibleColumns.map((col) => {
                        const sort = COLUMN_SORT[col.key]
                        const pinned = col.pinned
                        const align = col.align === "right" ? "text-right" : "text-left"
                        return (
                          <th
                            key={col.key}
                            style={pinned ? { left: stickyLeft[col.key] } : undefined}
                            aria-sort={
                              sort
                                ? sortKey === sort
                                  ? sortDir === "asc"
                                    ? "ascending"
                                    : "descending"
                                  : "none"
                                : undefined
                            }
                            className={`sticky top-0 whitespace-nowrap bg-[var(--ossum-navy)] px-3 py-2 font-medium text-white ${align} ${pinned ? "z-20" : "z-10"}`}
                          >
                            {col.key === "thumb" ? (
                              <span className="sr-only">Miniatura</span>
                            ) : sort ? (
                              <SortHeader
                                label={col.label}
                                sortKey={sort}
                                current={sortKey}
                                dir={sortDir}
                                onChange={onSortChange}
                                align={col.align === "right" ? "right" : "left"}
                              />
                            ) : (
                              col.label
                            )}
                          </th>
                        )
                      })}
                      <th className="sticky top-0 z-10 w-11 bg-[var(--ossum-navy)] px-2 py-2 text-right">
                        <span className="sr-only">Acciones</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {allStockItems.map((item) => {
                      const selected = selectedId === item.id
                      return (
                        <tr
                          key={item.id}
                          onClick={() => selectItem(item)}
                          onDoubleClick={() => openSheet(item, "general")}
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              openSheet(item, "general")
                            } else if (e.key === " ") {
                              e.preventDefault()
                              selectItem(item)
                            }
                          }}
                          className={`group cursor-pointer outline-none transition-colors hover:bg-[var(--ossum-surface-2)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--ossum-action)] ${selected ? "bg-[#eef0ff]" : ""}`}
                          aria-selected={selected}
                          title="Doble clic o Enter para abrir la ficha"
                        >
                          {visibleColumns.map((col) => {
                            const pinned = col.pinned
                            const align = col.align === "right" ? "text-right" : "text-left"
                            const pinBg = pinned
                              ? selected
                                ? "bg-[#eef0ff]"
                                : "bg-white group-hover:bg-[var(--ossum-surface-2)]"
                              : ""
                            const accent =
                              pinned && col.key === "thumb" && selected
                                ? "shadow-[inset_3px_0_0_var(--ossum-action)]"
                                : ""
                            return (
                              <td
                                key={col.key}
                                style={pinned ? { left: stickyLeft[col.key] } : undefined}
                                className={`border-b border-[var(--ossum-line)] px-3 py-1.5 ${align} ${pinned ? `sticky z-10 ${pinBg} ${accent}` : ""}`}
                              >
                                {col.render(item)}
                              </td>
                            )
                          })}
                          <td className="border-b border-[var(--ossum-line)] px-2 py-1.5 text-right" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-7 text-gray-400 hover:text-gray-700"
                                  aria-label={`Acciones de ${item.code}`}
                                  title="Más acciones"
                                >
                                  <MoreHorizontal className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-52">
                                <DropdownMenuItem onSelect={() => openSheet(item, "general")}>Ver ficha</DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => openSheet(item, "stock")}>Existencias</DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => openSheet(item, "historial")}>Movimientos</DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => openSheet(item, "trazabilidad")}>Trazabilidad</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onSelect={() => setCodesItem(item)}>Ver códigos</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* ── PAGINATION FOOTER ── */}
        <footer
          aria-label="Paginación de stock"
          className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-[var(--ossum-line)] bg-white px-4 py-2 text-xs text-gray-600"
        >
          <div className="flex items-center gap-1 font-medium">
            {pagination.total === 0 ? (
              <span>Sin artículos para mostrar</span>
            ) : (
              <span>
                Mostrando{" "}
                <strong className="font-semibold text-gray-900">
                  {startRecord}–{endRecord}
                </strong>{" "}
                de{" "}
                <strong className="font-semibold text-gray-900">
                  {pagination.total.toLocaleString("es-AR")}
                </strong>{" "}
                artículo{pagination.total !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-gray-500">Por página:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value))
                  setPage(1)
                }}
                aria-label="Artículos por página"
                disabled={stockLoading}
                className="h-7 rounded border border-[var(--ossum-line)] bg-white px-2 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-[var(--ossum-action)] disabled:opacity-50"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-7"
                disabled={pagination.page <= 1 || stockLoading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Página anterior"
              >
                <ChevronLeft className="size-3.5" />
              </Button>

              <span className="min-w-[5rem] text-center text-xs font-medium text-gray-700">
                Pág. <strong className="text-gray-900">{pagination.page}</strong> de {pagination.totalPages}
              </span>

              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-7"
                disabled={pagination.page >= pagination.totalPages || stockLoading}
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                aria-label="Página siguiente"
              >
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        </footer>
      </div>

      {newOpen && <NewArticleDialog key={articlePrefill?.rawValue ?? "new"} open={newOpen} onOpenChange={(open) => { setNewOpen(open); if (!open && articlePrefill) { setArticlePrefill(undefined); window.history.replaceState(null, "", "/stock") } }} companyId={activeCompany?.id} prefill={articlePrefill} onCreated={() => { setArticlePrefill(undefined); void refreshStock() }} />}
      <StockArticleSheet item={sheet?.item ?? null} initialTab={sheet?.tab} open={Boolean(sheet)} onOpenChange={(v) => { if (!v) setSheet(null) }} />
      <ArticleCodesDialog item={codesItem} open={Boolean(codesItem)} onOpenChange={(v) => { if (!v) setCodesItem(null) }} />
      </div>
    </TooltipProvider>
  )
}
