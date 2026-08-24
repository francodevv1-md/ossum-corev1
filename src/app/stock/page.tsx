"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  ImagePlus,
  MoreHorizontal,
  Package,
  Plus,
  Search,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
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
  DEPOSITS,
  FABRICANTES,
  FAMILIES,
  FAMILY_STYLE,
  LINEAS,
  PROVEEDORES,
  RUBROS,
  SECCIONES,
  STOCK_CONTROL_OPTIONS,
  STOCK_ITEMS,
  STOCK_STATE_OPTIONS,
  STOCK_STATE_ORDER,
  TRACE_METHODS,
  TYPES,
  type Family,
  type StockItem,
  type TraceMethod,
} from "@/data/stock-mock"
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
  return (
    <button
      type="button"
      onClick={() => onChange(sortKey)}
      className={`inline-flex items-center gap-1 text-xs font-medium text-white transition-colors hover:text-white ${align === "right" ? "flex-row-reverse" : ""} ${active ? "opacity-100" : "opacity-80"}`}
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

function TextFilter({ ariaLabel, value, onChange, placeholder }: {
  ariaLabel: string; value: string; onChange: (v: string) => void; placeholder: string
}) {
  return (
    <Input value={value} onChange={(e) => onChange(e.target.value)} aria-label={ariaLabel} placeholder={placeholder} className="h-8 w-40 text-xs" />
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
    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 border-b border-[var(--ossum-line)] bg-white px-4 py-1 text-xs">
      {chips.map(({ key, label, value }, idx) => {
        const isActive = active === key
        return (
          <span key={key || "total"} className="inline-flex items-center gap-3">
            {idx > 0 && <span className="text-gray-300">·</span>}
            <button
              type="button"
              onClick={() => onSelect(isActive ? "" : key)}
              aria-pressed={isActive}
              className={`inline-flex items-baseline gap-1 ${isActive ? "font-semibold text-[var(--ossum-action)]" : "text-gray-500 hover:text-gray-700"}`}
            >
              {label}
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
  const fileRef = useRef<HTMLInputElement>(null)
  const [image, setImage] = useState<string | null>(null)
  const [useFamilyImage, setUseFamilyImage] = useState(false)
  const [family, setFamily] = useState("")
  const [method, setMethod] = useState<TraceMethod>(() => prefill?.trace === "serial" || prefill?.trace === "serial-expiry" ? "serie" : prefill?.trace === "lot" || prefill?.trace === "lot-expiry" ? "lote" : "cantidad")
  const [expiry, setExpiry] = useState(() => prefill?.trace === "serial-expiry" || prefill?.trace === "lot-expiry")
  const [sterile, setSterile] = useState(true)
  const [sku, setSku] = useState(() => `ITM-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`)
  const [description, setDescription] = useState("")
  const [articleType, setArticleType] = useState("")
  const [brand, setBrand] = useState("")
  const [manufacturer, setManufacturer] = useState("")
  const [gtin, setGtin] = useState(() => prefill?.gtin ?? "")
  const [identifiers, setIdentifiers] = useState<Array<{ type: "MANUFACTURER_REF" | "GTIN_EAN" | "GS1_AI_22" | "SUPPLIER_CODE" | "ALTERNATIVE_CODE"; value: string; sourcePayload?: string; manufacturerContext?: string; supplierId?: string }>>(() => prefill?.ai22 ? [{ type: "GS1_AI_22", value: prefill.ai22, sourcePayload: prefill.rawValue }] : [])
  const [saving, setSaving] = useState(false)

  const familyStyle = family ? FAMILY_STYLE[family as Family] : null
  const FamilyIcon = familyStyle?.icon

  const pickImage = () => fileRef.current?.click()
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImage(URL.createObjectURL(file))
      setUseFamilyImage(false)
    }
  }
  const useFamily = () => {
    setImage(null)
    setUseFamilyImage(true)
  }

  const save = async () => {
    if (!companyId) return toast.error("No hay una empresa activa")
    if (!description.trim()) return toast.error("La descripción es obligatoria")
    setSaving(true)
    try {
      await apiFetch(`/api/companies/${encodeURIComponent(companyId)}/articles`, { method: "POST", body: JSON.stringify({ description, sku: sku.trim() || undefined, articleType: articleType || undefined, brand: brand || undefined, manufacturer: manufacturer || undefined, family: family || undefined, unit: "u", traceabilityPolicy: method === "cantidad" ? "NONE" : method === "lote" ? (expiry ? "LOT_EXPIRY" : "LOT") : method === "serie" ? (expiry ? "SERIAL_EXPIRY" : "SERIAL") : "LOT_SERIAL_EXPIRY", identifiers: [...(gtin.trim() ? [{ type: "GTIN_EAN" as const, value: gtin }] : []), ...identifiers].filter((item) => item.value.trim()), supplierMappings: identifiers.filter((item) => item.type === "SUPPLIER_CODE" && item.supplierId && item.value.trim()).map((item) => ({ supplierId: item.supplierId, supplierCode: item.value })) }) })
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
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element -- vista previa local (blob)
                    <img src={image} alt="Imagen del artículo" className="size-full object-cover" />
                  ) : useFamilyImage && familyStyle && FamilyIcon ? (
                    <span className={`flex size-full items-center justify-center ${familyStyle.thumb}`}>
                      <FamilyIcon className="size-8" />
                    </span>
                  ) : (
                    <ImagePlus className="size-6 text-gray-300" />
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
                <div className="flex flex-wrap items-center justify-center gap-1 text-[10px]">
                  <button type="button" onClick={pickImage} className="text-[var(--ossum-action)] hover:underline">Cambiar imagen</button>
                  <span className="text-gray-300">·</span>
                  <button type="button" onClick={useFamily} className="text-[var(--ossum-action)] hover:underline">Usar imagen de familia</button>
                </div>
              </div>

              <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2">
                <FormField label="Código / SKU"><Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="TORN-3.5-COR" className="h-8 font-mono text-xs" /></FormField>
                <FormField label="Descripción" className="sm:col-span-2"><Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Tornillo cortical 3.5 mm x 24 mm" className="h-8 text-xs" /></FormField>
                <FormField label="Categoría">
                  <select className={selectClass} defaultValue="">
                    <option value="" disabled>Seleccionar</option>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </FormField>
                <FormField label="Marca">
                  <select className={selectClass} value={brand} onChange={(e) => setBrand(e.target.value)}>
                    <option value="" disabled>Seleccionar</option>
                    {BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </FormField>
                <FormField label="Tipo de artículo">
                  <select className={selectClass} value={articleType} onChange={(e) => setArticleType(e.target.value)}>
                    <option value="" disabled>Seleccionar</option>
                    {ARTICLE_TYPES.map((t) => <option key={t} value={t}>{ARTICLE_TYPE_LABEL[t]}</option>)}
                  </select>
                </FormField>
                <FormField label="Unidad">
                  <select className={selectClass} defaultValue="u">
                    <option value="u">Unidad (u)</option>
                    <option value="par">Par</option>
                    <option value="caja">Caja</option>
                    <option value="set">Set</option>
                  </select>
                </FormField>
              </div>
            </div>
          </section>

          <hr className="border-[var(--ossum-line)]" />

          {/* Clasificación y registro */}
          <section>
            <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--ossum-navy)]">Clasificación y registro</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <FormField label="Familia / Patología">
                <select className={selectClass} value={family} onChange={(e) => setFamily(e.target.value)}>
                  <option value="">Sin familia</option>
                  {FAMILIES.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </FormField>
                <FormField label="Fabricante"><Input value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} placeholder="DePuy Synthes" className="h-8 text-xs" /></FormField>
                <FormField label="GTIN / EAN"><Input value={gtin} onChange={(e) => setGtin(e.target.value)} placeholder="00888867011234" className="h-8 font-mono text-xs" /></FormField>
              <FormField label="PM / Registro"><Input placeholder="PM-1182-1" className="h-8 font-mono text-xs" /></FormField>
              <div className="flex items-end justify-between gap-3 pb-1">
                <Label className="text-[11px] text-gray-500">Estéril</Label>
                <Switch checked={sterile} onCheckedChange={setSterile} />
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
  const activeCompanyId = activeCompany?.id
  const [canonicalArticles, setCanonicalArticles] = useState<Array<{ id: string; sku: string; description: string; articleType?: string | null; brand?: string | null; manufacturer?: string | null; family?: string | null; unit: string; identifiers: Array<{ type: string; value: string }> }>>([])
  const [search, setSearch] = useState("")
  const [depositFilter, setDepositFilter] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [brandFilter, setBrandFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [typeFilter, setTypeFilter] = useState("")
  const [rubroFilter, setRubroFilter] = useState("")
  const [seccionFilter, setSeccionFilter] = useState("")
  const [lineaFilter, setLineaFilter] = useState("")
  const [familyFilter, setFamilyFilter] = useState("")
  const [fabricanteFilter, setFabricanteFilter] = useState("")
  const [proveedorFilter, setProveedorFilter] = useState("")
  const [controlFilter, setControlFilter] = useState("")
  const [sterileFilter, setSterileFilter] = useState("")
  const [gtinFilter, setGtinFilter] = useState("")
  const [pmFilter, setPmFilter] = useState("")
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("")
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false)

  const [viewKey, setViewKey] = useState<string>(DEFAULT_VIEW_KEY)
  const [customColumns, setCustomColumns] = useState<StockColumnKey[]>(STOCK_VIEWS.find((v) => v.key === "operativo")!.columns)

  const [sortKey, setSortKey] = useState<SortKey>("articulo")
  const [sortDir, setSortDir] = useState<SortDir>("asc")

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sheet, setSheet] = useState<{ item: StockItem; tab: FichaTab } | null>(null)
  const [codesItem, setCodesItem] = useState<StockItem | null>(null)
  const [articlePrefill, setArticlePrefill] = useState<ArticlePrefill | undefined>(scannedArticlePrefill)
  const [newOpen, setNewOpen] = useState(() => Boolean(scannedArticlePrefill()))

  const loadCanonicalArticles = useCallback(async () => {
    if (!activeCompanyId) return
    try {
      const result = await apiFetch<typeof canonicalArticles>(`/api/companies/${encodeURIComponent(activeCompanyId)}/articles?take=100`)
      setCanonicalArticles(result)
    } catch { /* Existing mock list remains usable when API is unavailable. */ }
  }, [activeCompanyId])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!activeCompanyId) return
      try {
        const result = await apiFetch<typeof canonicalArticles>(`/api/companies/${encodeURIComponent(activeCompanyId)}/articles?take=100`)
        if (!cancelled) setCanonicalArticles(result)
      } catch { /* Existing mock list remains usable when API is unavailable. */ }
    }
    void load()
    return () => { cancelled = true }
  }, [activeCompanyId])

  const canonicalStockItems = useMemo<StockItem[]>(() => canonicalArticles.map((article) => ({
    id: article.id, code: article.sku, name: article.description, descriptionExtra: "", family: (article.family || "Insumos") as Family, category: "", rubro: "", seccion: "", linea: "", brand: article.brand || "", type: article.articleType || "Otro", unit: article.unit, unitBuy: article.unit, manufacturer: article.manufacturer || "", gtin: article.identifiers.find((item) => item.type === "GTIN_EAN")?.value || "", pm: "", sterile: false, preferredSupplier: "", cost: 0, price: 0, available: 0, reserved: 0, inTransit: 0, min: 0, state: "Pendiente", masterStatus: "Activo", control: "cantidad", lots: [], movements: [], articleType: (article.articleType || "Otro") as StockItem["articleType"], suppliers: [],
  })), [canonicalArticles])
  const allStockItems = useMemo(() => [...STOCK_ITEMS.filter((item) => !canonicalArticles.some((article) => article.id === item.id)), ...canonicalStockItems], [canonicalArticles, canonicalStockItems])

  const visibleColumns = useMemo<StockColumn[]>(() => {
    const view = STOCK_VIEWS.find((v) => v.key === viewKey) ?? STOCK_VIEWS[0]
    const keys = viewKey === "personalizada" ? customColumns : view.columns
    return keys.map((k) => STOCK_COLUMN_BY_KEY[k]).filter((c): c is StockColumn => Boolean(c))
  }, [viewKey, customColumns])

  const visibleKeys = useMemo(() => new Set(visibleColumns.map((c) => c.key)), [visibleColumns])
  const stickyLeft = useMemo(() => pinnedOffsets(visibleColumns), [visibleColumns])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const data = allStockItems.filter((i) => {
      if (q) {
        const haystack = [i.code, i.name, i.descriptionExtra, i.category, i.rubro, i.seccion, i.linea, i.brand, i.type, i.family, i.manufacturer, i.gtin, i.pm, i.preferredSupplier].filter(Boolean).join(" ").toLowerCase()
        if (!haystack.includes(q)) return false
      }
      if (depositFilter && !i.lots.some((l) => l.deposit === depositFilter)) return false
      if (categoryFilter && i.category !== categoryFilter) return false
      if (brandFilter && i.brand !== brandFilter) return false
      if (statusFilter && i.state !== statusFilter) return false
      if (typeFilter && i.type !== typeFilter) return false
      if (rubroFilter && i.rubro !== rubroFilter) return false
      if (seccionFilter && i.seccion !== seccionFilter) return false
      if (lineaFilter && i.linea !== lineaFilter) return false
      if (familyFilter && i.family !== familyFilter) return false
      if (fabricanteFilter && i.manufacturer !== fabricanteFilter) return false
      if (proveedorFilter && i.preferredSupplier !== proveedorFilter) return false
      if (controlFilter && i.control !== controlFilter) return false
      if (sterileFilter === "si" && !i.sterile) return false
      if (sterileFilter === "no" && i.sterile) return false
      if (gtinFilter && !i.gtin.toLowerCase().includes(gtinFilter.trim().toLowerCase())) return false
      if (pmFilter && !i.pm.toLowerCase().includes(pmFilter.trim().toLowerCase())) return false
      if (quickFilter === "bajo" && !(i.available > 0 && i.available <= i.min)) return false
      if (quickFilter === "sinstock" && i.available !== 0) return false
      if (quickFilter === "transito" && i.inTransit <= 0) return false
      return true
    })

    const dir = sortDir === "asc" ? 1 : -1
    return data.sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case "codigo": cmp = a.code.localeCompare(b.code); break
        case "articulo": cmp = a.name.localeCompare(b.name, "es", { sensitivity: "base" }); break
        case "categoria": cmp = a.category.localeCompare(b.category, "es"); break
        case "marca": cmp = a.brand.localeCompare(b.brand, "es"); break
        case "disponible": cmp = a.available - b.available; break
        case "reservado": cmp = a.reserved - b.reserved; break
        case "transito": cmp = a.inTransit - b.inTransit; break
        case "estado": cmp = STOCK_STATE_ORDER[a.state] - STOCK_STATE_ORDER[b.state]; break
        case "costo": cmp = a.cost - b.cost; break
        case "precio": cmp = a.price - b.price; break
      }
      return cmp * dir
    })
  }, [allStockItems, search, depositFilter, categoryFilter, brandFilter, statusFilter, typeFilter, rubroFilter, seccionFilter, lineaFilter, familyFilter, fabricanteFilter, proveedorFilter, controlFilter, sterileFilter, gtinFilter, pmFilter, quickFilter, sortKey, sortDir])

  const summary = useMemo(() => ({
    total: allStockItems.length,
    bajo: allStockItems.filter((i) => i.available > 0 && i.available <= i.min).length,
    sinstock: allStockItems.filter((i) => i.available === 0).length,
    transito: allStockItems.filter((i) => i.inTransit > 0).length,
  }), [allStockItems])

  const onSortChange = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
      return
    }
    setSortKey(key)
    setSortDir(key === "articulo" || key === "codigo" ? "asc" : "desc")
  }

  const clearFilters = () => {
    setSearch(""); setDepositFilter(""); setCategoryFilter(""); setBrandFilter("")
    setStatusFilter(""); setTypeFilter(""); setRubroFilter(""); setSeccionFilter(""); setLineaFilter("")
    setFamilyFilter(""); setFabricanteFilter(""); setProveedorFilter(""); setControlFilter(""); setSterileFilter("")
    setGtinFilter(""); setPmFilter(""); setQuickFilter("")
  }

  const hasFilters = Boolean(search || depositFilter || categoryFilter || brandFilter || statusFilter || typeFilter || rubroFilter || seccionFilter || lineaFilter || familyFilter || fabricanteFilter || proveedorFilter || controlFilter || sterileFilter || gtinFilter || pmFilter || quickFilter)

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

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--ossum-surface)]">
      {/* ── HEADER ── */}
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--ossum-line)] bg-white px-4 py-2">
        <div>
          <h1 className="text-base font-semibold text-[var(--ossum-navy)]">Stock</h1>
          <p className="text-[11px] text-gray-400">{filtered.length} artículo{filtered.length !== 1 ? "s" : ""}{hasFilters ? " · filtrado" : ""}</p>
        </div>
        <Button size="sm" className="h-8 bg-[var(--ossum-action)] text-xs text-white hover:bg-[#1830a8]" onClick={() => setNewOpen(true)}><Plus className="size-3.5" /> Nuevo artículo</Button>
      </header>

      {/* ── TOOLBAR ── */}
      <div className="shrink-0 border-b border-[var(--ossum-line)] bg-white px-4 py-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-60">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar artículo, SKU, lote o serie…"
              aria-label="Buscar artículo"
              className="h-8 pl-8 text-xs"
            />
            {search && (
              <button onClick={() => setSearch("")} aria-label="Limpiar búsqueda" className="absolute right-2 top-1/2 -translate-y-1/2 rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                <X className="size-3" />
              </button>
            )}
          </div>
          <FilterSelect ariaLabel="Filtrar por depósito" value={depositFilter} onChange={setDepositFilter} options={[{ value: "", label: "Todos los depósitos" }, ...DEPOSITS.map((d) => ({ value: d, label: d }))]} />
          <FilterSelect ariaLabel="Filtrar por categoría" value={categoryFilter} onChange={setCategoryFilter} options={[{ value: "", label: "Todas las categorías" }, ...CATEGORIES.map((c) => ({ value: c, label: c }))]} />
          <FilterSelect ariaLabel="Filtrar por marca" value={brandFilter} onChange={setBrandFilter} options={[{ value: "", label: "Todas las marcas" }, ...BRANDS.map((b) => ({ value: b, label: b }))]} />
          <FilterSelect ariaLabel="Filtrar por estado" value={statusFilter} onChange={setStatusFilter} options={STOCK_STATE_OPTIONS} />
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setMoreFiltersOpen((v) => !v)}>Más filtros <ChevronDown className={`size-3 transition-transform ${moreFiltersOpen ? "rotate-180" : ""}`} /></Button>
          {hasFilters && <button onClick={clearFilters} className="text-xs text-gray-400 hover:text-gray-600">Limpiar filtros</button>}

          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500">Vista:</span>
              <select value={viewKey} onChange={(e) => onViewChange(e.target.value)} aria-label="Seleccionar vista" className="h-8 rounded-md border border-[var(--ossum-line)] bg-white px-2.5 text-xs text-gray-600 focus:outline-none focus:ring-1 focus:ring-[var(--ossum-action)]">
                {STOCK_VIEWS.map((v) => <option key={v.key} value={v.key}>{v.label}</option>)}
              </select>
            </div>
            <ColumnsPanel visibleKeys={visibleKeys} onToggle={toggleColumn} />
          </div>
        </div>
        {moreFiltersOpen && (
          <div className="mt-1.5 flex flex-wrap items-center gap-2 border-t border-[var(--ossum-line)] pt-1.5">
            <FilterSelect ariaLabel="Filtrar por tipo" value={typeFilter} onChange={setTypeFilter} options={[{ value: "", label: "Tipo" }, ...TYPES.map((t) => ({ value: t, label: t }))]} />
            <FilterSelect ariaLabel="Filtrar por rubro" value={rubroFilter} onChange={setRubroFilter} options={[{ value: "", label: "Rubro" }, ...RUBROS.map((r) => ({ value: r, label: r }))]} />
            <FilterSelect ariaLabel="Filtrar por sección" value={seccionFilter} onChange={setSeccionFilter} options={[{ value: "", label: "Sección" }, ...SECCIONES.map((s) => ({ value: s, label: s }))]} />
            <FilterSelect ariaLabel="Filtrar por línea" value={lineaFilter} onChange={setLineaFilter} options={[{ value: "", label: "Línea" }, ...LINEAS.map((l) => ({ value: l, label: l }))]} />
            <FilterSelect ariaLabel="Filtrar por familia" value={familyFilter} onChange={setFamilyFilter} options={[{ value: "", label: "Familia" }, ...FAMILIES.map((f) => ({ value: f, label: f }))]} />
            <FilterSelect ariaLabel="Filtrar por fabricante" value={fabricanteFilter} onChange={setFabricanteFilter} options={[{ value: "", label: "Fabricante" }, ...FABRICANTES.map((f) => ({ value: f, label: f }))]} />
            <FilterSelect ariaLabel="Filtrar por proveedor" value={proveedorFilter} onChange={setProveedorFilter} options={[{ value: "", label: "Proveedor" }, ...PROVEEDORES.map((p) => ({ value: p, label: p }))]} />
            <FilterSelect ariaLabel="Filtrar por control" value={controlFilter} onChange={setControlFilter} options={[{ value: "", label: "Control" }, ...STOCK_CONTROL_OPTIONS.map((c) => ({ value: c.value, label: c.label }))]} />
            <FilterSelect ariaLabel="Filtrar por esterilización" value={sterileFilter} onChange={setSterileFilter} options={[{ value: "", label: "Estéril" }, { value: "si", label: "Solo estériles" }, { value: "no", label: "Solo no estériles" }]} />
             <TextFilter ariaLabel="Filtrar por GTIN/EAN" value={gtinFilter} onChange={setGtinFilter} placeholder="GTIN / EAN" />
            <TextFilter ariaLabel="Filtrar por PM" value={pmFilter} onChange={setPmFilter} placeholder="PM / registro" />
          </div>
        )}
      </div>

      {/* ── QUICK FILTERS ── */}
      <QuickFilterRow
        total={summary.total}
        bajo={summary.bajo}
        sinstock={summary.sinstock}
        transito={summary.transito}
        active={quickFilter}
        onSelect={setQuickFilter}
      />

      {/* ── CONTENT ── */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {filtered.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-5 py-10 text-center">
              <Package className="size-5 text-muted-foreground" />
              <div>
                <p className="font-medium">No se encontraron artículos</p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">Probá con otro texto o quitá los filtros activos.</p>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={clearFilters}>Limpiar filtros</Button>
            </div>
          ) : (
            <div className="mx-3 my-2 flex-1 overflow-hidden border border-[var(--ossum-line)] bg-white">
              <div className="h-full overflow-auto">
                <table className="w-full min-w-[1080px] border-separate border-spacing-0 text-xs">
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
                            aria-sort={sort ? (sortKey === sort ? (sortDir === "asc" ? "ascending" : "descending") : "none") : undefined}
                            className={`sticky top-0 whitespace-nowrap bg-[var(--ossum-navy)] px-3 py-2 font-medium text-white ${align} ${pinned ? "z-20" : "z-10"}`}
                          >
                            {col.key === "thumb" ? <span className="sr-only">Miniatura</span> : sort ? <SortHeader label={col.label} sortKey={sort} current={sortKey} dir={sortDir} onChange={onSortChange} align={col.align === "right" ? "right" : "left"} /> : col.label}
                          </th>
                        )
                      })}
                      <th className="sticky top-0 z-10 w-11 bg-[var(--ossum-navy)] px-2 py-2 text-right"><span className="sr-only">Acciones</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((item) => {
                      const selected = selectedId === item.id
                      return (
                        <tr
                          key={item.id}
                          onClick={() => selectItem(item)}
                          onDoubleClick={() => openSheet(item, "general")}
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectItem(item) }
                            if (e.key === "Enter" && e.shiftKey) { e.preventDefault(); openSheet(item, "general") }
                          }}
                          className={`group cursor-pointer outline-none transition-colors hover:bg-[var(--ossum-surface-2)] ${selected ? "bg-[#eef0ff]" : ""}`}
                          aria-selected={selected}
                          title="Doble clic para abrir la ficha"
                        >
                          {visibleColumns.map((col) => {
                            const pinned = col.pinned
                            const align = col.align === "right" ? "text-right" : "text-left"
                            const pinBg = pinned ? (selected ? "bg-[#eef0ff]" : "bg-white group-hover:bg-[var(--ossum-surface-2)]") : ""
                            const accent = pinned && col.key === "thumb" && selected ? "shadow-[inset_3px_0_0_var(--ossum-action)]" : ""
                            return (
                              <td key={col.key} style={pinned ? { left: stickyLeft[col.key] } : undefined} className={`border-b border-[var(--ossum-line)] px-3 py-1.5 ${align} ${pinned ? `sticky z-10 ${pinBg} ${accent}` : ""}`}>
                                {col.render(item)}
                              </td>
                            )
                          })}
                          <td className="border-b border-[var(--ossum-line)] px-2 py-1.5 text-right" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="size-7 text-gray-400 hover:text-gray-700" aria-label={`Acciones de ${item.code}`} title="Más acciones"><MoreHorizontal className="size-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-52">
                                <DropdownMenuItem onSelect={() => openSheet(item, "general")}>Ver ficha</DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => openSheet(item, "general")}>Editar</DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => openSheet(item, "stock")}>Existencias</DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => openSheet(item, "trazabilidad")}>Movimientos</DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => openSheet(item, "trazabilidad")}>Trazabilidad</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onSelect={() => setCodesItem(item)}>Generar códigos</DropdownMenuItem>
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
      </div>

      {newOpen && <NewArticleDialog key={articlePrefill?.rawValue ?? "new"} open={newOpen} onOpenChange={(open) => { setNewOpen(open); if (!open && articlePrefill) { setArticlePrefill(undefined); window.history.replaceState(null, "", "/stock") } }} companyId={activeCompany?.id} prefill={articlePrefill} onCreated={() => { setArticlePrefill(undefined); void loadCanonicalArticles() }} />}
      <StockArticleSheet item={sheet?.item ?? null} initialTab={sheet?.tab} open={Boolean(sheet)} onOpenChange={(v) => { if (!v) setSheet(null) }} />
      <ArticleCodesDialog item={codesItem} open={Boolean(codesItem)} onOpenChange={(v) => { if (!v) setCodesItem(null) }} />
    </div>
  )
}
