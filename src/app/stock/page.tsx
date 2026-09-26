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
  DEPOSITS,
  getFamilyStyle,
  STOCK_CONTROL_OPTIONS,
  STOCK_STATE_OPTIONS,
  STOCK_STATE_ORDER,
  TRACE_METHODS,
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
import { mapCanonicalArticleToStockItem, type CanonicalArticle } from "@/lib/stock/article-adapter"
import { CatalogSelect, type CatalogItem, type CatalogKind } from "@/components/stock/CatalogSelect"

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

type Catalogs = Record<CatalogKind, CatalogItem[]>
const emptyCatalogs: Catalogs = { category: [], "clinical-family": [], brand: [], manufacturer: [], "product-line": [] }

function NewArticleDialog({ open, onOpenChange, companyId, catalogs, catalogsLoading, catalogsError, canQuickCreate, onRetryCatalogs, onCatalogItemsChange, onCreated, prefill }: { open: boolean; onOpenChange: (v: boolean) => void; companyId?: string; catalogs: Catalogs; catalogsLoading: boolean; catalogsError: string | null; canQuickCreate: boolean; onRetryCatalogs: () => void; onCatalogItemsChange: (kind: CatalogKind, items: CatalogItem[]) => void; onCreated?: () => void; prefill?: ArticlePrefill }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [image, setImage] = useState<string | null>(null)
  const [useFamilyImage, setUseFamilyImage] = useState(false)
  const [categoryId, setCategoryId] = useState("")
  const [clinicalFamilyId, setClinicalFamilyId] = useState("")
  const [method, setMethod] = useState<TraceMethod>(() => prefill?.trace === "serial" || prefill?.trace === "serial-expiry" ? "serie" : prefill?.trace === "lot" || prefill?.trace === "lot-expiry" ? "lote" : "cantidad")
  const [expiry, setExpiry] = useState(() => prefill?.trace === "serial-expiry" || prefill?.trace === "lot-expiry")
  const [sterile, setSterile] = useState(true)
  const [sku, setSku] = useState(() => `ITM-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`)
  const [description, setDescription] = useState("")
  const [articleType, setArticleType] = useState("")
  const [brandId, setBrandId] = useState("")
  const [manufacturerId, setManufacturerId] = useState("")
  const [productLineId, setProductLineId] = useState("")
  const [gtin, setGtin] = useState(() => prefill?.gtin ?? "")
  const [identifiers, setIdentifiers] = useState<Array<{ type: "MANUFACTURER_REF" | "GTIN_EAN" | "GS1_AI_22" | "SUPPLIER_CODE" | "ALTERNATIVE_CODE"; value: string; sourcePayload?: string; manufacturerContext?: string; supplierId?: string }>>(() => prefill?.ai22 ? [{ type: "GS1_AI_22", value: prefill.ai22, sourcePayload: prefill.rawValue }] : [])
  const [saving, setSaving] = useState(false)

  const clinicalFamilyName = catalogs["clinical-family"].find((item) => item.id === clinicalFamilyId)?.name
  const familyStyle = clinicalFamilyName ? getFamilyStyle(clinicalFamilyName) : null
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
      await apiFetch(`/api/companies/${encodeURIComponent(companyId)}/articles`, { method: "POST", body: JSON.stringify({ description, sku: sku.trim() || undefined, articleType: articleType || undefined, categoryId: categoryId || null, clinicalFamilyId: clinicalFamilyId || null, brandId: brandId || null, manufacturerId: manufacturerId || null, productLineId: productLineId || null, unit: "u", traceabilityRequirement: method === "cantidad" ? "NONE" : method === "lote" ? "LOT" : method === "serie" ? "SERIAL" : "LOT_AND_SERIAL", expirationRequired: expiry, identifiers: [...(gtin.trim() ? [{ type: "GTIN_EAN" as const, value: gtin }] : []), ...identifiers].filter((item) => item.value.trim()), supplierMappings: identifiers.filter((item) => item.type === "SUPPLIER_CODE" && item.supplierId && item.value.trim()).map((item) => ({ supplierId: item.supplierId, supplierCode: item.value })) }) })
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
                <FormField label="Categoría"><CatalogSelect companyId={companyId} kind="category" label="Categoría" value={categoryId} onChange={setCategoryId} items={catalogs.category} loading={catalogsLoading} error={catalogsError} onRetry={onRetryCatalogs} onItemsChange={(items) => onCatalogItemsChange("category", items)} allowQuickCreate canQuickCreate={canQuickCreate} /></FormField>
                <FormField label="Marca"><CatalogSelect companyId={companyId} kind="brand" label="Marca" value={brandId} onChange={setBrandId} items={catalogs.brand} loading={catalogsLoading} error={catalogsError} onRetry={onRetryCatalogs} onItemsChange={(items) => onCatalogItemsChange("brand", items)} allowQuickCreate canQuickCreate={canQuickCreate} /></FormField>
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
              <FormField label="Familia clínica"><CatalogSelect companyId={companyId} kind="clinical-family" label="Familia clínica" value={clinicalFamilyId} onChange={setClinicalFamilyId} items={catalogs["clinical-family"]} loading={catalogsLoading} error={catalogsError} onRetry={onRetryCatalogs} onItemsChange={(items) => onCatalogItemsChange("clinical-family", items)} allowQuickCreate canQuickCreate={canQuickCreate} /></FormField>
              <FormField label="Fabricante"><CatalogSelect companyId={companyId} kind="manufacturer" label="Fabricante" value={manufacturerId} onChange={setManufacturerId} items={catalogs.manufacturer} loading={catalogsLoading} error={catalogsError} onRetry={onRetryCatalogs} onItemsChange={(items) => onCatalogItemsChange("manufacturer", items)} allowQuickCreate canQuickCreate={canQuickCreate} /></FormField>
              <FormField label="Línea de producto"><CatalogSelect companyId={companyId} kind="product-line" label="Línea de producto" value={productLineId} onChange={setProductLineId} items={catalogs["product-line"]} loading={catalogsLoading} error={catalogsError} onRetry={onRetryCatalogs} onItemsChange={(items) => onCatalogItemsChange("product-line", items)} allowQuickCreate canQuickCreate={canQuickCreate} /></FormField>
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
                     onClick={() => setMethod(option.id)}
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
                 <p className="text-[10px] text-gray-400">Se exige de forma independiente, incluso si el artículo no requiere lote ni serie.</p>
              </div>
                <Switch checked={expiry} onCheckedChange={setExpiry} />
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
  const { activeCompany, currentAccess } = useAuth()
  const activeCompanyId = activeCompany?.id
  const [canonicalArticles, setCanonicalArticles] = useState<CanonicalArticle[]>([])
  const [catalogState, setCatalogState] = useState<{ companyId?: string; items: Catalogs; loading: boolean; error: string | null }>({ companyId: activeCompany?.id, items: emptyCatalogs, loading: Boolean(activeCompany?.id), error: null })
  const catalogsRequestRef = useRef(0)
  const articlesRequestRef = useRef(0)
  const [articlesLoading, setArticlesLoading] = useState(Boolean(activeCompany?.id))
  const [articlesError, setArticlesError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [depositFilter, setDepositFilter] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [brandFilter, setBrandFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [typeFilter, setTypeFilter] = useState("")
  const [lineaFilter, setLineaFilter] = useState("")
  const [familyFilter, setFamilyFilter] = useState("")
  const [fabricanteFilter, setFabricanteFilter] = useState("")
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
    const requestId = ++articlesRequestRef.current
    if (!activeCompanyId) {
      if (requestId === articlesRequestRef.current) {
        setCanonicalArticles([])
        setArticlesLoading(false)
      }
      return
    }
    setArticlesLoading(true)
    setArticlesError(null)
    try {
      const result = await apiFetch<typeof canonicalArticles>(`/api/companies/${encodeURIComponent(activeCompanyId)}/articles?take=100`)
      if (requestId === articlesRequestRef.current) setCanonicalArticles(result)
    } catch (error) {
      if (requestId === articlesRequestRef.current) {
        setCanonicalArticles([])
        setArticlesError(error instanceof Error ? error.message : "No se pudieron cargar los artículos")
      }
    } finally {
      if (requestId === articlesRequestRef.current) setArticlesLoading(false)
    }
  }, [activeCompanyId])

  useEffect(() => {
    let cancelled = false
    const requestId = ++articlesRequestRef.current
    const load = async () => {
      if (!activeCompanyId) {
        setCanonicalArticles([])
        setArticlesLoading(false)
        return
      }
      setCanonicalArticles([])
      setArticlesLoading(true)
      setArticlesError(null)
      try {
        const result = await apiFetch<typeof canonicalArticles>(`/api/companies/${encodeURIComponent(activeCompanyId)}/articles?take=100`)
        if (!cancelled && requestId === articlesRequestRef.current) setCanonicalArticles(result)
      } catch (error) {
        if (!cancelled && requestId === articlesRequestRef.current) setArticlesError(error instanceof Error ? error.message : "No se pudieron cargar los artículos")
      } finally {
        if (!cancelled && requestId === articlesRequestRef.current) setArticlesLoading(false)
      }
    }
    void load()
    return () => { cancelled = true; articlesRequestRef.current += 1 }
  }, [activeCompanyId])

  const loadCatalogs = useCallback(async () => {
    const requestId = ++catalogsRequestRef.current
    if (!activeCompanyId) {
      setCatalogState({ companyId: undefined, items: emptyCatalogs, loading: false, error: null })
      return
    }
    setCatalogState({ companyId: activeCompanyId, items: emptyCatalogs, loading: true, error: null })
    try {
      const entries = await Promise.all((Object.keys(emptyCatalogs) as CatalogKind[]).map(async (kind) => [kind, await apiFetch<CatalogItem[]>(`/api/companies/${encodeURIComponent(activeCompanyId)}/article-catalogs/${kind}`)] as const))
      if (requestId === catalogsRequestRef.current) setCatalogState({ companyId: activeCompanyId, items: Object.fromEntries(entries) as Catalogs, loading: false, error: null })
    } catch (error) {
      if (requestId === catalogsRequestRef.current) setCatalogState({ companyId: activeCompanyId, items: emptyCatalogs, loading: false, error: error instanceof Error ? error.message : "No se pudieron cargar los catálogos" })
    }
  }, [activeCompanyId])

  useEffect(() => {
    void Promise.resolve().then(loadCatalogs)
  }, [loadCatalogs])

  const catalogs = catalogState.companyId === activeCompanyId ? catalogState.items : emptyCatalogs
  const catalogsLoading = catalogState.companyId !== activeCompanyId || catalogState.loading
  const catalogsError = catalogState.companyId === activeCompanyId ? catalogState.error : null
  const updateCatalog = useCallback((kind: CatalogKind, items: CatalogItem[]) => {
    setCatalogState((current) => current.companyId === activeCompanyId ? { ...current, items: { ...current.items, [kind]: items } } : current)
  }, [activeCompanyId])
  const catalogSelectProps = useCallback((kind: CatalogKind) => ({ items: catalogs[kind], loading: catalogsLoading, error: catalogsError, onRetry: () => void loadCatalogs(), onItemsChange: (items: CatalogItem[]) => updateCatalog(kind, items), canQuickCreate: currentAccess?.role === "admin" }), [catalogs, catalogsError, catalogsLoading, currentAccess?.role, loadCatalogs, updateCatalog])

  useEffect(() => {
    if (!activeCompanyId) { queueMicrotask(() => { setCategoryFilter(""); setBrandFilter(""); setLineaFilter(""); setFamilyFilter(""); setFabricanteFilter("") }); return }
    queueMicrotask(() => { setCategoryFilter(""); setBrandFilter(""); setLineaFilter(""); setFamilyFilter(""); setFabricanteFilter("") })
  }, [activeCompanyId])


  const canonicalStockItems = useMemo(() => canonicalArticles.map((article) => ({ ...mapCanonicalArticleToStockItem(article), catalogCategoryId: article.categoryId, catalogClinicalFamilyId: article.clinicalFamilyId, catalogBrandId: article.brandId, catalogManufacturerId: article.manufacturerId, catalogProductLineId: article.productLineId })), [canonicalArticles])
  const allStockItems = canonicalStockItems
  const categoryDescendants = useMemo(() => {
    const ids = new Set<string>()
    const visit = (parentId: string) => catalogs.category.filter((item) => item.parentId === parentId).forEach((item) => { ids.add(item.id); visit(item.id) })
    if (categoryFilter) { ids.add(categoryFilter); visit(categoryFilter) }
    return ids
  }, [catalogs.category, categoryFilter])

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
      if (categoryFilter && !categoryDescendants.has(i.catalogCategoryId ?? "")) return false
      if (brandFilter && i.catalogBrandId !== brandFilter) return false
      if (statusFilter && i.state !== statusFilter) return false
      if (typeFilter && i.type !== typeFilter) return false
      if (lineaFilter && i.catalogProductLineId !== lineaFilter) return false
      if (familyFilter && i.catalogClinicalFamilyId !== familyFilter) return false
      if (fabricanteFilter && i.catalogManufacturerId !== fabricanteFilter) return false
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
  }, [allStockItems, search, depositFilter, categoryFilter, categoryDescendants, brandFilter, statusFilter, typeFilter, lineaFilter, familyFilter, fabricanteFilter, controlFilter, sterileFilter, gtinFilter, pmFilter, quickFilter, sortKey, sortDir])

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
    setStatusFilter(""); setTypeFilter(""); setLineaFilter("")
    setFamilyFilter(""); setFabricanteFilter(""); setControlFilter(""); setSterileFilter("")
    setGtinFilter(""); setPmFilter(""); setQuickFilter("")
  }

  const hasFilters = Boolean(search || depositFilter || categoryFilter || brandFilter || statusFilter || typeFilter || lineaFilter || familyFilter || fabricanteFilter || controlFilter || sterileFilter || gtinFilter || pmFilter || quickFilter)

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
           <div className="w-44"><CatalogSelect companyId={activeCompanyId} kind="category" label="Filtrar por categoría" value={categoryFilter} onChange={setCategoryFilter} placeholder="Todas las categorías" {...catalogSelectProps("category")} /></div>
           <div className="w-40"><CatalogSelect companyId={activeCompanyId} kind="brand" label="Filtrar por marca" value={brandFilter} onChange={setBrandFilter} placeholder="Todas las marcas" {...catalogSelectProps("brand")} /></div>
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
             <FilterSelect ariaLabel="Filtrar por tipo" value={typeFilter} onChange={setTypeFilter} options={[{ value: "", label: "Tipo" }, ...ARTICLE_TYPES.map((t) => ({ value: t, label: t }))]} />
             <div className="w-40"><CatalogSelect companyId={activeCompanyId} kind="product-line" label="Filtrar por línea" value={lineaFilter} onChange={setLineaFilter} placeholder="Línea" {...catalogSelectProps("product-line")} /></div>
             <div className="w-40"><CatalogSelect companyId={activeCompanyId} kind="clinical-family" label="Filtrar por familia clínica" value={familyFilter} onChange={setFamilyFilter} placeholder="Familia clínica" {...catalogSelectProps("clinical-family")} /></div>
             <div className="w-40"><CatalogSelect companyId={activeCompanyId} kind="manufacturer" label="Filtrar por fabricante" value={fabricanteFilter} onChange={setFabricanteFilter} placeholder="Fabricante" {...catalogSelectProps("manufacturer")} /></div>
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
          {articlesLoading ? (
            <div className="flex flex-1 items-center justify-center px-5 py-10 text-sm text-muted-foreground" role="status">Cargando artículos…</div>
          ) : articlesError ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-5 py-10 text-center" role="alert">
              <Package className="size-5 text-muted-foreground" />
              <div><p className="font-medium">No se pudieron cargar los artículos</p><p className="mt-1 max-w-sm text-sm text-muted-foreground">{articlesError}</p></div>
              <Button type="button" size="sm" variant="outline" onClick={() => void loadCanonicalArticles()}>Reintentar</Button>
            </div>
          ) : filtered.length === 0 ? (
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

       {newOpen && <NewArticleDialog key={`${activeCompanyId ?? "none"}:${articlePrefill?.rawValue ?? "new"}`} open={newOpen} onOpenChange={(open) => { setNewOpen(open); if (!open && articlePrefill) { setArticlePrefill(undefined); window.history.replaceState(null, "", "/stock") } }} companyId={activeCompany?.id} catalogs={catalogs} catalogsLoading={catalogsLoading} catalogsError={catalogsError} canQuickCreate={currentAccess?.role === "admin"} onRetryCatalogs={() => void loadCatalogs()} onCatalogItemsChange={updateCatalog} prefill={articlePrefill} onCreated={() => { setArticlePrefill(undefined); void loadCanonicalArticles() }} />}
      <StockArticleSheet item={sheet?.item ?? null} initialTab={sheet?.tab} open={Boolean(sheet)} onOpenChange={(v) => { if (!v) setSheet(null) }} />
      <ArticleCodesDialog item={codesItem} open={Boolean(codesItem)} onOpenChange={(v) => { if (!v) setCodesItem(null) }} />
    </div>
  )
}
