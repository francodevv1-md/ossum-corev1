"use client"

import React, { useState } from "react"
import {
  Boxes,
  CircleDot,
  Container,
  FileText,
  HelpCircle,
  Loader2,
  Package,
  Paperclip,
  QrCode,
  ScrollText,
  ShoppingCart,
  Tag,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth/AuthProvider"
import { updateArticleVatApi, updateArticleCommercialProfileApi, type ArticleCommercialProfilePayload } from "@/lib/api/articles"
import {
  listPriceListsApi,
  createPriceListApi,
  getArticlePriceHistoryApi,
  addArticlePriceVersionApi,
  type PriceListRow,
  type ArticlePriceVersionRow,
} from "@/lib/api/price-lists"
import { CheckCircle2, Plus } from "lucide-react"
import { parseVatOptionKey, getVatKeyFromTreatmentAndRate, type VatTreatment } from "@/lib/commercial/vat"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  ARTICLE_TYPES,
  ARTICLE_TYPE_LABEL,
  FAMILY_STYLE,
  TRACE_METHODS,
  TRACE_SUGGESTION,
  fmtDate,
  fmtMoney,
  fmtQty,
  lastMovement,

  traceControlLabel,
  traceControlOf,
  traceFlags,
  type StockArticleType,
  type StockItem,
  type TraceMethod,
} from "@/lib/stock/stock-ui-model"
import { FamilyThumb } from "@/components/stock/StockColumns"
import { ExistenciasTable, MovimientosTable } from "@/components/stock/StockArticleTabs"
import { ArticleCodesDialog } from "@/components/stock/ArticleCodesDialog"
import { CajasFormulaSection } from "@/components/stock/CajasFormulaSection"
import { CajasPhysicalUnitsSection } from "@/components/stock/CajasPhysicalUnitsSection"
import { useArticleStockDetail } from "@/hooks/useStock"
import type { ArticleStockDetailResponse } from "@/lib/api/stock"

// ─── Tabs ─────────────────────────────────────────────────

export type FichaTab =
  | "general" | "identificacion" | "stock" | "compras"
  | "comercial" | "trazabilidad" | "cajas" | "adjuntos" | "historial"

export const FICHA_TABS: Array<{ id: FichaTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: "general", label: "General", icon: Package },
  { id: "identificacion", label: "Identificación", icon: Tag },
  { id: "stock", label: "Stock", icon: Boxes },
  { id: "compras", label: "Compras", icon: ShoppingCart },
  { id: "comercial", label: "Comercial", icon: CircleDot },
  { id: "trazabilidad", label: "Trazabilidad", icon: ScrollText },
  { id: "cajas", label: "Cajas", icon: Container },
  { id: "adjuntos", label: "Adjuntos", icon: Paperclip },
  { id: "historial", label: "Historial", icon: FileText },
]

// ─── Dynamic sections per article type ────────────────────

interface FichaSections {
  /** Activo fijo / equipamiento — solo Equipos. */
  activeFixed: boolean
  /** Caja asociada + mantenimiento — solo Instrumental. */
  instrumental: boolean
  /** Dimensiones y peso — Equipos / bienes de capital. */
  dimensions: boolean
}

function fichaSections(type: StockArticleType): FichaSections {
  return {
    activeFixed: type === "Equipo",
    instrumental: type === "Instrumental",
    dimensions: type === "Equipo",
  }
}

// ─── Small primitives ─────────────────────────────────────

function AutoBadge() {
  return (
    <span
      className="inline-flex items-center rounded bg-gray-100 px-1 py-px text-[9px] font-medium uppercase tracking-wide text-gray-500"
      title="Calculado por el sistema"
    >
      Automático
    </span>
  )
}

function Hint({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          tabIndex={-1}
          aria-label="Ayuda"
          className="inline-flex text-gray-300 transition-colors hover:text-[var(--ossum-action)]"
        >
          <HelpCircle className="size-3" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[260px] bg-[var(--ossum-navy)] text-white">
        {text}
      </TooltipContent>
    </Tooltip>
  )
}

function Field({ label, children, className = "", hint }: { label: string; children: React.ReactNode; className?: string; hint?: string }) {
  return (
    <div className={`min-w-0 space-y-1 ${className}`}>
      <span className="flex items-center gap-1 text-[11px] text-gray-500">
        {label}
        {hint && <Hint text={hint} />}
      </span>
      {children}
    </div>
  )
}

function AutoField({ label, value, mono, hint }: { label: string; value: React.ReactNode; mono?: boolean; hint?: string }) {
  return (
    <div className="min-w-0 space-y-1">
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] text-gray-500">{label}</span>
        <AutoBadge />
        {hint && <Hint text={hint} />}
      </div>
      <div className={`text-sm font-medium text-gray-800 ${mono ? "font-mono text-[13px]" : ""}`}>{value}</div>
    </div>
  )
}

function SectionTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-2.5 flex items-baseline gap-2">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--ossum-navy)]">{children}</h3>
      {hint && <span className="text-[10px] text-gray-400">{hint}</span>}
    </div>
  )
}

function EmptyState({ icon: Icon, title, hint }: { icon: React.ComponentType<{ className?: string }>; title: string; hint: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
      <Icon className="size-6 text-gray-300" />
      <p className="text-sm font-medium text-gray-600">{title}</p>
      <p className="max-w-sm text-xs text-gray-400">{hint}</p>
    </div>
  )
}

function MasterStatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${active ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-500"}`}>
      {active ? "Activo" : "Inactivo"}
    </span>
  )
}

function ArticleImage({ item }: { item: StockItem }) {
  return (
    <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white ring-1 ring-[var(--ossum-line)]">
      <FamilyThumb item={item} />
    </div>
  )
}

// ─── Stock Adjustment Dialog ──────────────────────────────

function StockAdjustmentDialog({
  open,
  onOpenChange,
  articleCode,
  articleName,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  articleCode: string
  articleName: string
  onConfirm: (input: { quantity: string; reason: string; lotCode?: string; serialNumber?: string; expirationDate?: string; location?: string }) => Promise<void>
}) {
  const [quantity, setQuantity] = useState("")
  const [reason, setReason] = useState("")
  const [lotCode, setLotCode] = useState("")
  const [serialNumber, setSerialNumber] = useState("")
  const [expirationDate, setExpirationDate] = useState("")
  const [location, setLocation] = useState("")
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quantity || Number(quantity) === 0) {
      toast.error("Ingresá una cantidad distinta de 0 (+ para ingreso, - para egreso)")
      return
    }
    if (!reason.trim()) {
      toast.error("El motivo del ajuste es obligatorio para auditoría")
      return
    }
    setSaving(true)
    try {
      await onConfirm({
        quantity,
        reason: reason.trim(),
        lotCode: lotCode.trim() || undefined,
        serialNumber: serialNumber.trim() || undefined,
        expirationDate: expirationDate || undefined,
        location: location.trim() || undefined,
      })
      toast.success("Ajuste de inventario registrado en el ledger")
      onOpenChange(false)
      setQuantity("")
      setReason("")
      setLotCode("")
      setSerialNumber("")
      setExpirationDate("")
      setLocation("")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al registrar ajuste")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogTitle className="text-base text-[var(--ossum-navy)]">Ajuste de inventario</DialogTitle>
        <p className="text-xs text-gray-500">
          Registrá un movimiento de ajuste auditado en el ledger para {articleCode} · {articleName}.
        </p>
        <form onSubmit={handleSubmit} className="space-y-3 pt-2">
          <div className="space-y-1">
            <span className="text-[11px] font-medium text-gray-700">Cantidad (+ ingreso / - egreso)</span>
            <Input
              type="number"
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Ej: 5 o -2"
              className="h-8 text-xs"
              required
            />
          </div>
          <div className="space-y-1">
            <span className="text-[11px] font-medium text-gray-700">Motivo del ajuste (auditoría)</span>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: Conteo físico mensual, merma, rotura"
              className="h-8 text-xs"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-gray-700">Lote (opcional)</span>
              <Input
                value={lotCode}
                onChange={(e) => setLotCode(e.target.value)}
                placeholder="Lote"
                className="h-8 font-mono text-xs"
              />
            </div>
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-gray-700">Serie (opcional)</span>
              <Input
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder="Serie"
                className="h-8 font-mono text-xs"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-gray-700">Vencimiento (opcional)</span>
              <Input
                type="date"
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-gray-700">Ubicación (opcional)</span>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Depósito Central"
                className="h-8 text-xs"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={saving} className="bg-[var(--ossum-action)] text-white hover:bg-[#1830a8]">
              {saving ? "Registrando..." : "Confirmar ajuste"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Ficha context (shared editable state) ────────────────

export interface FichaCtx {
  companyId: string
  articleType: StockArticleType
  method: TraceMethod
  expiry: boolean
  active: boolean
  vatOption: string
  savedVatOption: string
  canonicalArticleId: string | null
  isSavingVat: boolean
  vatSaveStatus: "idle" | "saving" | "saved" | "error"
  vatSaveError: string | null
  referenceCost: number | string
  referenceSalePrice: number | string
  priceListCode: string
  preferredSupplierId: string
  leadTimeDays: number | string
  minStock: number | string
  savedCommercial: {
    referenceCost: number | string
    referenceSalePrice: number | string
    priceListCode: string
    preferredSupplierId: string
    leadTimeDays: number | string
    minStock: number | string
  }
  isSavingCommercial: boolean
  commercialSaveStatus: "idle" | "saving" | "saved" | "error"
  commercialSaveError: string | null
  liveDetail: ArticleStockDetailResponse | null
  isLiveLoading: boolean
  onOpenAdjustment: () => void
  setArticleType: (t: StockArticleType) => void
  setMethod: (m: TraceMethod) => void
  setExpiry: (b: boolean) => void
  setActive: (b: boolean) => void
  setVatOption: (v: string) => void
  handleSaveVat: () => Promise<void>
  setReferenceCost: (v: number | string) => void
  setReferenceSalePrice: (v: number | string) => void
  setPriceListCode: (v: string) => void
  setPreferredSupplierId: (v: string) => void
  setLeadTimeDays: (v: number | string) => void
  setMinStock: (v: number | string) => void
  handleSaveCommercial: () => Promise<void>
  setTab: (t: FichaTab) => void
}

// ─── Tab panels ───────────────────────────────────────────

function GeneralTab({ item, ctx }: { item: StockItem; ctx: FichaCtx }) {
  const sections = fichaSections(ctx.articleType)
  return (
    <div className="space-y-5">
      {/* 1. Datos principales */}
      <section>
        <SectionTitle>Datos principales</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Código / SKU" hint="Identificador interno único."><Input value={item.code} readOnly className="h-8 font-mono text-xs bg-gray-50 text-gray-700" /></Field>
          <Field label="Descripción" className="sm:col-span-2" hint="Nombre completo del artículo."><Input value={item.name} readOnly className="h-8 text-xs bg-gray-50 text-gray-700" /></Field>
          <Field label="Descripción corta" hint="Versión abreviada para etiquetas y espacios reducidos."><Input value={item.shortDesc || "—"} readOnly className="h-8 text-xs bg-gray-50 text-gray-700" /></Field>
          <Field label="Categoría" hint="Clasificación funcional."><Input value={item.category || "—"} readOnly className="h-8 text-xs bg-gray-50 text-gray-700" /></Field>
          <Field label="Familia" hint="Agrupación por familia o patología."><Input value={FAMILY_STYLE[item.family]?.label || item.family} readOnly className="h-8 text-xs bg-gray-50 text-gray-700" /></Field>
          <Field label="Marca" hint="Marca comercial del producto."><Input value={item.brand || "—"} readOnly className="h-8 text-xs bg-gray-50 text-gray-700" /></Field>
          <Field label="Fabricante" hint="Empresa que fabrica el producto."><Input value={item.manufacturer || "—"} readOnly className="h-8 text-xs bg-gray-50 text-gray-700" /></Field>
          <Field label="PM / Registro ANMAT" hint="Registro sanitario ANMAT respaldado en backend."><Input value={item.pm || "—"} readOnly className="h-8 font-mono text-xs bg-gray-50 text-gray-700" /></Field>
          <Field label="Estéril" hint="Condición de entrega estéril de fábrica."><Input value={item.sterile ? "Sí (Estéril)" : "No (No estéril)"} readOnly className="h-8 text-xs bg-gray-50 text-gray-700" /></Field>
          <Field label="Unidad base" hint="Unidad de medida de referencia del stock."><Input value={item.unit || "u"} readOnly className="h-8 text-xs bg-gray-50 text-gray-700" /></Field>
        </div>
      </section>

      {/* 2. Gestión del artículo */}
      <section>
        <SectionTitle>Gestión del artículo</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Tipo de artículo" hint="Clasificación maestra de catálogo.">
            <Input value={ARTICLE_TYPE_LABEL[item.articleType] || item.articleType} readOnly className="h-8 text-xs bg-gray-50 text-gray-700" />
          </Field>
          <Field label="Estado" hint="Estado operativo en catálogo (lectura).">
            <Input value={ctx.active ? "Activo (Operativo)" : "Inactivo"} readOnly className="h-8 text-xs bg-gray-50 text-gray-700" />
          </Field>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Método de trazabilidad" hint="Método asignado al artículo (lectura).">
            <Input value={TRACE_METHODS.find((m) => m.id === ctx.method)?.label || ctx.method} readOnly className="h-8 text-xs bg-gray-50 text-gray-700" />
          </Field>
          <Field label="Control de vencimiento" hint="Configuración de vencimiento (lectura).">
            <Input value={ctx.expiry ? "Habilitado" : "Deshabilitado"} readOnly className="h-8 text-xs bg-gray-50 text-gray-700" />
          </Field>
        </div>
      </section>

      {/* 3. Datos secundarios (condicionales por tipo) */}
      {sections.instrumental && (
        <section>
          <SectionTitle hint="Solo para instrumental">Instrumental</SectionTitle>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Mantenimiento" hint="Indicaciones de mantenimiento y esterilización." className="sm:col-span-2">
              <Input value={item.maintenance || "—"} readOnly className="h-8 text-xs bg-gray-50 text-gray-700" />
            </Field>
          </div>
        </section>
      )}

      {sections.activeFixed && (
        <section>
          <SectionTitle hint="Solo para equipos / bienes de capital">Activo fijo</SectionTitle>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="N° de activo fijo" hint="Número de inventario del bien de capital.">
              <Input value={item.fixedAsset || "—"} readOnly className="h-8 font-mono text-xs bg-gray-50 text-gray-700" />
            </Field>
            <Field label="Vida útil" hint="Vida útil estimada en años.">
              <Input value={item.usefulLife ? String(item.usefulLife) : "—"} readOnly className="h-8 text-xs bg-gray-50 text-gray-700" />
            </Field>
            <Field label="Mantenimiento" className="sm:col-span-2" hint="Plan de mantenimiento o calibración.">
              <Input value={item.maintenance || "—"} readOnly className="h-8 text-xs bg-gray-50 text-gray-700" />
            </Field>
          </div>
        </section>
      )}
    </div>
  )
}

function IdentificacionTab({ item, ctx }: { item: StockItem; ctx: FichaCtx }) {
  return (
    <div className="space-y-5">
      <section>
        <SectionTitle>Códigos y registros</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="GTIN / EAN" hint="Identificador global del producto."><Input defaultValue={item.gtin} className="h-8 font-mono text-xs" /></Field>
          <Field label="Código EAN / barras" hint="Código de barras de punto de venta."><Input defaultValue={item.ean ?? ""} className="h-8 font-mono text-xs" /></Field>
          <Field label="Código fabricante" hint="Referencia interna que usa el fabricante."><Input defaultValue={item.manufacturerCode ?? ""} className="h-8 font-mono text-xs" /></Field>
          <Field label="PM / Registro ANMAT" hint="Número de registro sanitario ante ANMAT."><Input value={item.pm || "—"} readOnly className="h-8 font-mono text-xs bg-gray-50 text-gray-700" /></Field>
          <Field label="Código importación" hint="Código de importación aduanera, si corresponde."><Input defaultValue={item.importCode ?? ""} className="h-8 font-mono text-xs" /></Field>
          <Field label="Códigos alternativos" hint="Códigos extra para búsqueda o equivalencias (separados por coma)."><Input defaultValue={(item.altCodes ?? []).join(", ")} placeholder="Separados por coma" className="h-8 font-mono text-xs" /></Field>
        </div>
      </section>

      <section className="rounded-md border border-[#dbe1ff] bg-[#eef0ff]/60 px-4 py-2.5">
        <div className="flex items-start gap-2">
          <Tag className="mt-0.5 size-4 shrink-0 text-[var(--ossum-action)]" />
          <div>
            <p className="text-xs font-medium text-[var(--ossum-navy)]">Trazabilidad sugerida según tipo ({ARTICLE_TYPE_LABEL[ctx.articleType]})</p>
            <p className="mt-0.5 text-[11px] text-gray-500">{TRACE_SUGGESTION[ctx.articleType]}</p>
          </div>
        </div>
      </section>
    </div>
  )
}

function StockTab({ item, ctx }: { item: StockItem; ctx: FichaCtx }) {
  const sections = fichaSections(ctx.articleType)
  const summary = ctx.liveDetail?.summary

  return (
    <div className="space-y-5">
      {/* Disponibilidad en tiempo real */}
      <section className="rounded-md border border-[var(--ossum-line)] bg-white p-4">
        <div className="flex items-center justify-between gap-2 border-b border-[var(--ossum-line)] pb-3">
          <div>
            <SectionTitle hint="Ledger y disponibilidad en tiempo real">Estado y existencias de stock</SectionTitle>
            <p className="text-xs text-gray-500">
              Disponibilidad calculada a partir de recepciones, consumos, devoluciones y ajustes auditados.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 text-xs border-[var(--ossum-action)] text-[var(--ossum-action)] hover:bg-[#eef0ff]"
            onClick={ctx.onOpenAdjustment}
          >
            Ajustar inventario
          </Button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-md bg-gray-50 p-2.5">
            <span className="text-[11px] text-gray-500">Stock físico total</span>
            <p className="text-base font-semibold text-gray-900">{fmtQty(summary?.physical ?? item.available)}</p>
          </div>
          <div className="rounded-md bg-gray-50 p-2.5">
            <span className="text-[11px] text-gray-500">Reservado (Cirugías)</span>
            <p className="text-base font-semibold text-amber-700">{fmtQty(summary?.reserved ?? item.reserved)}</p>
          </div>
          <div className="rounded-md bg-gray-50 p-2.5">
            <span className="text-[11px] text-gray-500">En tránsito (Remitos)</span>
            <p className="text-base font-semibold text-blue-700">{fmtQty(summary?.inTransit ?? item.inTransit)}</p>
          </div>
          <div className="rounded-md bg-[#eef0ff] p-2.5">
            <span className="text-[11px] font-medium text-[var(--ossum-action)]">Disponible real</span>
            <p className="text-base font-bold text-[var(--ossum-action)]">{fmtQty(summary?.available ?? item.available)}</p>
          </div>
        </div>
      </section>

      <section>
        <SectionTitle hint="Parámetros de control">Configuración de stock</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Unidad de stock" hint="Unidad en la que se mide el stock disponible.">
            <select defaultValue={item.unit} className="h-8 w-full rounded-md border border-[var(--ossum-line)] bg-white px-2.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-[var(--ossum-action)]">
              <option value="u">Unidad (u)</option><option value="par">Par</option><option value="caja">Caja</option><option value="set">Set</option>
            </select>
          </Field>
          <Field label="Unidad de compra" hint="Unidad en la que se compra al proveedor."><Input defaultValue={item.unitBuy} className="h-8 text-xs" /></Field>
          <Field label="Conversión" hint="Relación entre unidad de compra y unidad de stock (ej. 1 caja = 10 u)."><Input defaultValue={item.conversion ?? ""} className="h-8 text-xs" /></Field>
          <Field label="Stock mínimo" hint="Nivel por debajo del cual el artículo está en riesgo."><Input type="number" defaultValue={item.min} className="h-8 text-xs" /></Field>
          <Field label="Stock objetivo" hint="Cantidad deseada al reponer."><Input type="number" defaultValue={item.targetStock ?? ""} className="h-8 text-xs" /></Field>
          <Field label="Punto de reposición" hint="Nivel que dispara la alerta de compra."><Input type="number" defaultValue={item.reorderPoint ?? ""} className="h-8 text-xs" /></Field>
          <Field label="Depósito por defecto" hint="Depósito donde se asigna el artículo por defecto."><Input defaultValue={item.defaultDeposit ?? ""} className="h-8 text-xs" /></Field>
          <Field label="Ubicación por defecto" hint="Ubicación física dentro del depósito."><Input defaultValue={item.defaultLocation ?? ""} className="h-8 font-mono text-xs" /></Field>
          {sections.dimensions && (
            <>
              <Field label="Peso" hint="Peso unitario del artículo."><Input defaultValue={item.weight ?? ""} className="h-8 text-xs" /></Field>
              <Field label="Dimensiones" className="sm:col-span-2" hint="Medidas físicas (largo × ancho × alto)."><Input defaultValue={item.dimensions ?? ""} className="h-8 text-xs" /></Field>
            </>
          )}
        </div>
      </section>
    </div>
  )
}

function ComprasTab({ item, ctx }: { item: StockItem; ctx: FichaCtx }) {
  const liveArticle = ctx.liveDetail?.article
  const preferredSupplierDisplay = liveArticle?.commercialProfile?.preferredSupplierName
    ?? liveArticle?.preferredSupplier
    ?? item.preferredSupplier
    ?? "—"
  const leadTimeDisplay = liveArticle?.commercialProfile?.leadTimeDays != null
    ? `${liveArticle.commercialProfile.leadTimeDays} días`
    : liveArticle?.leadTimeDays != null
    ? `${liveArticle.leadTimeDays} días`
    : (item.leadTime || "—")
  const costDisplay = liveArticle?.commercialProfile?.referenceCost != null
    ? fmtMoney(liveArticle.commercialProfile.referenceCost)
    : (liveArticle?.cost != null ? fmtMoney(liveArticle.cost) : (item.cost ? fmtMoney(item.cost) : "—"))

  return (
    <div className="space-y-5">
      <section>
        <SectionTitle hint="Valores comerciales y de compras registrados para esta empresa">Compras (por empresa)</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Proveedor preferencial" hint="Proveedor principal configurado para esta empresa (lectura).">
            <Input value={preferredSupplierDisplay || "—"} readOnly className="h-8 text-xs bg-gray-50 text-gray-700" />
          </Field>
          <Field label="Código proveedor" hint="Código del artículo según proveedor (lectura).">
            <Input value={item.supplierCode || "—"} readOnly className="h-8 font-mono text-xs bg-gray-50 text-gray-700" />
          </Field>
          <Field label="Plazo habitual de entrega" hint="Tiempo estimado entre pedido y recepción (lectura).">
            <Input value={leadTimeDisplay || "—"} readOnly className="h-8 text-xs bg-gray-50 text-gray-700" />
          </Field>
          <AutoField label="Costo de referencia" value={costDisplay} mono hint="Costo unitario de referencia por empresa." />
          <AutoField label="Último proveedor" value={item.lastSupplier ?? preferredSupplierDisplay} hint="Proveedor de la última compra registrada." />
          <AutoField label="Último costo" value={item.lastCost ?? (item.cost ? fmtMoney(item.cost) : "—")} mono hint="Costo de la última compra registrada." />
          <AutoField label="Fecha última compra" value={item.lastPurchaseDate ? fmtDate(item.lastPurchaseDate) : "—"} hint="Fecha de la última compra registrada." />
        </div>
      </section>

      <section>
        <SectionTitle hint="Proveedores asignados al artículo">Proveedores vinculados</SectionTitle>
        {liveArticle?.suppliers && liveArticle.suppliers.length > 0 ? (
          <div className="rounded-md border border-[var(--ossum-line)] bg-white divide-y divide-[var(--ossum-line)]">
            {liveArticle.suppliers.map((s) => (
              <div key={s.id} className="flex items-center justify-between px-3 py-2 text-xs">
                <span className="font-medium text-gray-800">Proveedor ID: {s.supplierId}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-[var(--ossum-line)] bg-gray-50 p-4 text-center">
            <p className="text-xs text-gray-500">No hay múltiples proveedores vinculados para este artículo en backend DEV.</p>
          </div>
        )}
      </section>
    </div>
  )
}

function ComercialTab({ item, ctx }: { item: StockItem; ctx: FichaCtx }) {
  const isCanonical = Boolean(ctx.canonicalArticleId)
  const hasVatChanges = isCanonical && ctx.vatOption !== ctx.savedVatOption
  const hasCommercialChanges = isCanonical && (
    Number(ctx.referenceCost) !== Number(ctx.savedCommercial.referenceCost) ||
    Number(ctx.referenceSalePrice) !== Number(ctx.savedCommercial.referenceSalePrice) ||
    ctx.priceListCode !== ctx.savedCommercial.priceListCode ||
    ctx.preferredSupplierId !== ctx.savedCommercial.preferredSupplierId ||
    String(ctx.leadTimeDays) !== String(ctx.savedCommercial.leadTimeDays) ||
    Number(ctx.minStock) !== Number(ctx.savedCommercial.minStock)
  )

  const numCost = Number(ctx.referenceCost) || 0
  const numPrice = Number(ctx.referenceSalePrice) || 0
  const marginPercent = numPrice > 0 ? ((numPrice - numCost) / numPrice) * 100 : null
  const markupPercent = numCost > 0 ? ((numPrice - numCost) / numCost) * 100 : null

  return (
    <div className="space-y-6">
      {/* ── Sección Perfil Comercial por Empresa ── */}
      <section className="rounded-md border border-[var(--ossum-line)] bg-white p-4">
        <div className="flex items-center justify-between gap-2 border-b border-[var(--ossum-line)] pb-3">
          <div>
            <SectionTitle hint="Valores de referencia específicos de esta empresa (moneda: ARS)">
              Perfil comercial y precios (por empresa)
            </SectionTitle>
            <p className="text-xs text-gray-500">
              Costos y precios de referencia operativos propios de la empresa activa. No se comparten con otras empresas.
            </p>
          </div>
          {isCanonical ? (
            <div className="flex items-center gap-2">
              {ctx.commercialSaveStatus === "saved" && !hasCommercialChanges && (
                <span className="text-[11px] font-medium text-emerald-600" aria-live="polite">
                  ✓ Comercial guardado
                </span>
              )}
              {ctx.commercialSaveStatus === "saving" && (
                <span className="flex items-center gap-1 text-[11px] font-medium text-gray-500" aria-live="polite">
                  <Loader2 className="size-3 animate-spin" /> Guardando...
                </span>
              )}
              <Button
                size="sm"
                variant="outline"
                disabled={!hasCommercialChanges || ctx.isSavingCommercial}
                onClick={ctx.handleSaveCommercial}
                className="h-8 text-xs border-[var(--ossum-action)] text-[var(--ossum-action)] hover:bg-[#eef0ff]"
              >
                Guardar comercial
              </Button>
            </div>
          ) : (
            <span className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
              Sin perfil canónico disponible
            </span>
          )}
        </div>

        {ctx.commercialSaveStatus === "error" && ctx.commercialSaveError && (
          <div role="alert" className="mt-3 rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
            {ctx.commercialSaveError}
          </div>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Costo de referencia (ARS)" hint="Costo unitario de referencia para esta empresa (>= 0).">
            <Input
              type="number"
              min="0"
              step="any"
              aria-label="Costo de referencia"
              value={ctx.referenceCost}
              disabled={!isCanonical || ctx.isSavingCommercial}
              onChange={(e) => ctx.setReferenceCost(e.target.value)}
              className="h-8 text-xs font-mono"
            />
          </Field>
          <Field label="Precio de venta de referencia (ARS)" hint="Precio de venta sugerido u operativo (>= 0).">
            <Input
              type="number"
              min="0"
              step="any"
              aria-label="Precio de venta de referencia"
              value={ctx.referenceSalePrice}
              disabled={!isCanonical || ctx.isSavingCommercial}
              onChange={(e) => ctx.setReferenceSalePrice(e.target.value)}
              className="h-8 text-xs font-mono"
            />
          </Field>
          <Field label="Lista / Código de precio" hint="Código de lista o referencia comercial interna.">
            <Input
              aria-label="Lista o código de precio"
              value={ctx.priceListCode}
              disabled={!isCanonical || ctx.isSavingCommercial}
              onChange={(e) => ctx.setPriceListCode(e.target.value)}
              placeholder="Ej. LISTA-A"
              className="h-8 text-xs"
            />
          </Field>
          <Field label="Plazo habitual de entrega (días)" hint="Plazo estimado en días para reposición.">
            <Input
              type="number"
              min="0"
              aria-label="Plazo habitual de entrega"
              value={ctx.leadTimeDays}
              disabled={!isCanonical || ctx.isSavingCommercial}
              onChange={(e) => ctx.setLeadTimeDays(e.target.value)}
              placeholder="Ej. 15"
              className="h-8 text-xs font-mono"
            />
          </Field>
          <Field label="Stock mínimo de seguridad" hint="Mínimo operativo para alertas y forecast de reposición (>= 0).">
            <Input
              type="number"
              min="0"
              step="any"
              aria-label="Stock mínimo de seguridad"
              value={ctx.minStock}
              disabled={!isCanonical || ctx.isSavingCommercial}
              onChange={(e) => ctx.setMinStock(e.target.value)}
              placeholder="Ej. 10"
              className="h-8 text-xs font-mono"
            />
          </Field>
          <Field label="Moneda" hint="Moneda base V1 fija en ARS.">
            <Input value="ARS (Pesos argentinos)" readOnly className="h-8 text-xs bg-gray-50 text-gray-700" />
          </Field>
        </div>

        {/* Resumen de rentabilidad de referencia */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 rounded-md bg-gray-50 p-3">
          <div>
            <span className="text-[11px] text-gray-500">Costo ref.</span>
            <p className="text-sm font-semibold text-gray-900">{fmtMoney(numCost)}</p>
          </div>
          <div>
            <span className="text-[11px] text-gray-500">Precio ref.</span>
            <p className="text-sm font-semibold text-gray-900">{fmtMoney(numPrice)}</p>
          </div>
          <div>
            <span className="text-[11px] text-gray-500">Margen s/ venta</span>
            <p className={`text-sm font-semibold ${marginPercent != null && marginPercent < 0 ? "text-red-600" : "text-emerald-700"}`}>
              {marginPercent != null ? `${marginPercent.toFixed(1)}%` : "—"}
            </p>
          </div>
          <div>
            <span className="text-[11px] text-gray-500">Markup s/ costo</span>
            <p className={`text-sm font-semibold ${markupPercent != null && markupPercent < 0 ? "text-red-600" : "text-blue-700"}`}>
              {markupPercent != null ? `${markupPercent.toFixed(1)}%` : "—"}
            </p>
          </div>
        </div>
      </section>

      {/* ── Sección Listas de precios e historial de vigencia ── */}
      <PriceListsAndHistorySection
        companyId={ctx.companyId}
        articleId={ctx.canonicalArticleId}
        isCanonical={isCanonical}
      />

      {/* ── Sección Alícuota de IVA (independiente) ── */}
      <section className="rounded-md border border-[var(--ossum-line)] bg-white p-4">
        <div className="flex items-center justify-between gap-2 border-b border-[var(--ossum-line)] pb-3">
          <div>
            <SectionTitle hint="Persistencia de alícuota en catálogo maestro de artículos">
              Alícuota de IVA
            </SectionTitle>
            <p className="text-xs text-gray-500">
              Tratamiento y tasa de IVA del catálogo maestro. Se gestiona de forma independiente.
            </p>
          </div>
          {isCanonical ? (
            <div className="flex items-center gap-2">
              {ctx.vatSaveStatus === "saved" && !hasVatChanges && (
                <span className="text-[11px] font-medium text-emerald-600" aria-live="polite">
                  ✓ IVA guardado
                </span>
              )}
              {ctx.vatSaveStatus === "saving" && (
                <span className="flex items-center gap-1 text-[11px] font-medium text-gray-500" aria-live="polite">
                  <Loader2 className="size-3 animate-spin" /> Guardando...
                </span>
              )}
              <Button
                size="sm"
                variant="outline"
                disabled={!hasVatChanges || ctx.isSavingVat}
                onClick={ctx.handleSaveVat}
                className="h-8 text-xs"
              >
                Guardar IVA
              </Button>
            </div>
          ) : (
            <span className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
              Sin artículo canónico vinculado
            </span>
          )}
        </div>

        {ctx.vatSaveStatus === "error" && ctx.vatSaveError && (
          <div role="alert" className="mt-3 rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
            {ctx.vatSaveError}
          </div>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field
            label="Alícuota IVA"
            hint={isCanonical ? "Alícuota persistida en el catálogo maestro." : "Lectura: sin artículo canónico vinculado."}
          >
            <select
              aria-label="Alícuota de IVA"
              value={ctx.vatOption}
              disabled={!isCanonical || ctx.isSavingVat}
              onChange={(e) => ctx.setVatOption(e.target.value)}
              className="h-8 w-full rounded-md border border-[var(--ossum-line)] bg-white px-2.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-[var(--ossum-action)] disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
            >
              <option value="21%">21%</option>
              <option value="10.5%">10.5%</option>
              <option value="27%">27%</option>
              <option value="0%">0%</option>
              <option value="exento">Exento</option>
              <option value="no_gravado">No gravado</option>
            </select>
          </Field>
        </div>
      </section>
    </div>
  )
}

function PriceListsAndHistorySection({
  companyId,
  articleId,
  isCanonical,
}: {
  companyId: string
  articleId: string | null
  isCanonical: boolean
}) {
  const [priceLists, setPriceLists] = useState<PriceListRow[]>([])
  const [selectedListId, setSelectedListId] = useState<string>("")
  const [isLoadingLists, setIsLoadingLists] = useState(false)
  const [priceHistory, setPriceHistory] = useState<ArticlePriceVersionRow[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  // New version state
  const [newPrice, setNewPrice] = useState<string>("")
  const [newEffectiveAt, setNewEffectiveAt] = useState<string>(
    new Date().toISOString().slice(0, 10),
  )
  const [newNotes, setNewNotes] = useState<string>("")
  const [isAddingVersion, setIsAddingVersion] = useState(false)
  const [addVersionError, setAddVersionError] = useState<string | null>(null)
  const [addVersionSuccess, setAddVersionSuccess] = useState(false)

  // Create list modal state
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newListCode, setNewListCode] = useState("")
  const [newListName, setNewListName] = useState("")
  const [newListDesc, setNewListDesc] = useState("")
  const [isCreatingList, setIsCreatingList] = useState(false)
  const [createListError, setCreateListError] = useState<string | null>(null)

  const loadLists = React.useCallback(async () => {
    if (!companyId) return
    setIsLoadingLists(true)
    try {
      const lists = await listPriceListsApi(companyId)
      if (Array.isArray(lists)) {
        setPriceLists(lists)
        setSelectedListId((prev) => {
          if (prev && lists.some((l) => l.id === prev)) return prev
          return lists.length > 0 ? lists[0].id : ""
        })
      }
    } catch (err) {
      console.error("Error loading price lists", err)
    } finally {
      setIsLoadingLists(false)
    }
  }, [companyId])

  React.useEffect(() => {
    loadLists()
  }, [loadLists])

  const loadHistory = React.useCallback(async () => {
    if (!companyId || !articleId || !selectedListId) {
      setPriceHistory([])
      return
    }
    setIsLoadingHistory(true)
    try {
      const history = await getArticlePriceHistoryApi(companyId, articleId, selectedListId)
      if (Array.isArray(history)) {
        setPriceHistory(history)
      }
    } catch (err) {
      console.error("Error loading price history", err)
    } finally {
      setIsLoadingHistory(false)
    }
  }, [companyId, articleId, selectedListId])

  React.useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const selectedList = priceLists.find((l) => l.id === selectedListId)
  const now = new Date()
  const effectiveVersion = priceHistory.find((v) => new Date(v.effectiveAt) <= now)

  const handleAddVersion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!companyId || !articleId || !selectedListId) return
    const numPrice = Number(newPrice)
    if (newPrice.trim() === "" || Number.isNaN(numPrice) || numPrice < 0) {
      setAddVersionError("El importe debe ser mayor o igual a 0")
      return
    }
    if (!newEffectiveAt) {
      setAddVersionError("La fecha de vigencia es obligatoria")
      return
    }

    setIsAddingVersion(true)
    setAddVersionError(null)
    setAddVersionSuccess(false)
    try {
      await addArticlePriceVersionApi(companyId, articleId, {
        priceListId: selectedListId,
        price: numPrice,
        currency: "ARS",
        effectiveAt: new Date(newEffectiveAt).toISOString(),
        notes: newNotes.trim() || undefined,
      })
      setAddVersionSuccess(true)
      setNewPrice("")
      setNewNotes("")
      toast.success("Nuevo precio registrado en el historial")
      await loadHistory()
      setTimeout(() => setAddVersionSuccess(false), 3000)
    } catch (err) {
      setAddVersionError(err instanceof Error ? err.message : "Error al registrar precio")
    } finally {
      setIsAddingVersion(false)
    }
  }

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!companyId) return
    if (!newListCode.trim()) {
      setCreateListError("El código de lista es obligatorio")
      return
    }
    if (!newListName.trim()) {
      setCreateListError("El nombre de la lista es obligatorio")
      return
    }

    setIsCreatingList(true)
    setCreateListError(null)
    try {
      const created = await createPriceListApi(companyId, {
        code: newListCode.trim(),
        name: newListName.trim(),
        description: newListDesc.trim() || undefined,
        currency: "ARS",
      })
      if (created && created.id) {
        toast.success(`Lista de precios "${created.name}" creada`)
        setShowCreateDialog(false)
        setNewListCode("")
        setNewListName("")
        setNewListDesc("")
        await loadLists()
        setSelectedListId(created.id)
      }
    } catch (err) {
      setCreateListError(err instanceof Error ? err.message : "Error al crear lista")
    } finally {
      setIsCreatingList(false)
    }
  }

  return (
    <section className="rounded-md border border-[var(--ossum-line)] bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--ossum-line)] pb-3">
        <div>
          <SectionTitle hint="Listas de precios comerciales e historial inmutable por vigencia">
            Listas de precios e historial de vigencia (ARS por empresa)
          </SectionTitle>
          <p className="text-xs text-gray-500">
            Precios comerciales por lista de la empresa activa. Cada cambio crea una nueva versión histórica sin sobrescribir el pasado.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowCreateDialog(true)}
          className="h-8 text-xs border-[var(--ossum-line)] hover:bg-gray-50"
        >
          <Plus className="mr-1 size-3.5" /> Nueva lista
        </Button>
      </div>

      {!isCanonical ? (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
          Sin artículo canónico vinculado. Las listas e historial de precios requieren un artículo registrado en backend.
        </div>
      ) : isLoadingLists ? (
        <div className="flex items-center gap-2 py-6 text-xs text-gray-500">
          <Loader2 className="size-4 animate-spin text-[var(--ossum-action)]" /> Cargando listas de precios...
        </div>
      ) : priceLists.length === 0 ? (
        <div className="mt-4 rounded-md border border-dashed border-gray-300 p-6 text-center">
          <p className="text-xs text-gray-500">No hay listas de precios creadas para esta empresa.</p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowCreateDialog(true)}
            className="mt-3 h-8 text-xs border-[var(--ossum-action)] text-[var(--ossum-action)] hover:bg-[#eef0ff]"
          >
            <Plus className="mr-1 size-3.5" /> Crear primera lista de precios
          </Button>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {/* Selector de lista + info de lista */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-gray-50 p-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-700">Lista:</span>
              <select
                aria-label="Seleccionar lista de precios"
                value={selectedListId}
                onChange={(e) => setSelectedListId(e.target.value)}
                className="h-8 rounded-md border border-[var(--ossum-line)] bg-white px-2.5 text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-[var(--ossum-action)]"
              >
                {priceLists.map((pl) => (
                  <option key={pl.id} value={pl.id}>
                    {pl.code} — {pl.name} {!pl.isActive ? "(Inactiva)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-500">Precio vigente hoy:</span>
              {effectiveVersion ? (
                <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 font-mono font-semibold text-emerald-800">
                  {fmtMoney(effectiveVersion.price)} ARS
                  <span className="text-[10px] font-normal text-emerald-700">
                    (desde {fmtDate(effectiveVersion.effectiveAt)})
                  </span>
                </span>
              ) : (
                <span className="rounded bg-gray-200 px-2 py-0.5 text-gray-600 font-mono">
                  Sin precio fijado
                </span>
              )}
            </div>
          </div>

          {/* Formulario para registrar nuevo precio en la lista activa */}
          <form onSubmit={handleAddVersion} className="rounded-md border border-[var(--ossum-line)] p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--ossum-navy)]">
                Registrar nuevo precio en lista {selectedList?.code}
              </span>
              {addVersionSuccess && (
                <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="size-3.5" /> Precio guardado
                </span>
              )}
            </div>

            {addVersionError && (
              <div role="alert" className="rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                {addVersionError}
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Nuevo precio (ARS)" hint="Precio unitario para esta lista (>= 0).">
                <Input
                  type="number"
                  min="0"
                  step="any"
                  required
                  placeholder="0.00"
                  aria-label="Nuevo precio de lista"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  disabled={isAddingVersion}
                  className="h-8 text-xs font-mono"
                />
              </Field>
              <Field label="Vigencia desde" hint="Fecha a partir de la cual entra en vigor.">
                <Input
                  type="date"
                  required
                  aria-label="Fecha de vigencia"
                  value={newEffectiveAt}
                  onChange={(e) => setNewEffectiveAt(e.target.value)}
                  disabled={isAddingVersion}
                  className="h-8 text-xs font-mono"
                />
              </Field>
              <Field label="Notas / Motivo" hint="Opcional: motivo del cambio de precio.">
                <Input
                  placeholder="Ej. Actualización trimestral"
                  aria-label="Notas del cambio"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  disabled={isAddingVersion}
                  className="h-8 text-xs"
                />
              </Field>
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                size="sm"
                disabled={isAddingVersion || !newPrice.trim()}
                className="h-8 text-xs bg-[var(--ossum-action)] text-white hover:bg-[var(--ossum-action-dark)]"
              >
                {isAddingVersion && <Loader2 className="mr-1 size-3 animate-spin" />}
                Registrar precio
              </Button>
            </div>
          </form>

          {/* Tabla de historial inmutable */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--ossum-navy)]">
                Historial de precios ({selectedList?.code})
              </span>
              <span className="text-[11px] text-gray-400">
                {priceHistory.length} {priceHistory.length === 1 ? "versión" : "versiones"}
              </span>
            </div>

            {isLoadingHistory ? (
              <div className="flex items-center gap-2 py-4 text-xs text-gray-500">
                <Loader2 className="size-3.5 animate-spin text-[var(--ossum-action)]" /> Cargando historial...
              </div>
            ) : priceHistory.length === 0 ? (
              <div className="rounded border border-dashed border-gray-200 p-4 text-center text-xs text-gray-400">
                No hay versiones de precio registradas en esta lista.
              </div>
            ) : (
              <div className="max-h-48 overflow-auto rounded border border-[var(--ossum-line)]">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 border-b border-[var(--ossum-line)] bg-gray-50 text-[11px] font-semibold text-gray-600">
                    <tr>
                      <th className="px-3 py-2">Vigencia desde</th>
                      <th className="px-3 py-2">Precio (ARS)</th>
                      <th className="px-3 py-2">Estado</th>
                      <th className="px-3 py-2">Notas</th>
                      <th className="px-3 py-2">Registrado por</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--ossum-line)]">
                    {priceHistory.map((v) => {
                      const isCurrent = effectiveVersion?.id === v.id
                      const isFuture = new Date(v.effectiveAt) > now
                      return (
                        <tr key={v.id} className={isCurrent ? "bg-emerald-50/40" : ""}>
                          <td className="px-3 py-2 font-mono text-gray-700">{fmtDate(v.effectiveAt)}</td>
                          <td className="px-3 py-2 font-mono font-semibold text-gray-900">{fmtMoney(v.price)}</td>
                          <td className="px-3 py-2">
                            {isCurrent ? (
                              <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800">
                                Vigente
                              </span>
                            ) : isFuture ? (
                              <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-800">
                                Programado
                              </span>
                            ) : (
                              <span className="text-[11px] text-gray-400">Histórico</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-gray-600">{v.notes || "—"}</td>
                          <td className="px-3 py-2 text-gray-500 text-[11px]">{v.createdByName || "Sistema"}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Diálogo crear lista de precios */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogTitle className="text-base text-[var(--ossum-navy)]">Nueva lista de precios</DialogTitle>
          <p className="text-xs text-gray-500">
            Creá una lista de precios para la empresa activa. El código es único por empresa.
          </p>

          <form onSubmit={handleCreateList} className="space-y-3 pt-2">
            {createListError && (
              <div role="alert" className="rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                {createListError}
              </div>
            )}

            <Field label="Código de lista" hint="Identificador único (ej: MAYORISTA, PUBLICO, OS-SWISS).">
              <Input
                required
                aria-label="Código de lista"
                placeholder="Ej. MAYORISTA"
                value={newListCode}
                onChange={(e) => setNewListCode(e.target.value.toUpperCase())}
                disabled={isCreatingList}
                className="h-8 text-xs font-mono uppercase"
              />
            </Field>

            <Field label="Nombre de la lista" hint="Nombre descriptivo para la UI.">
              <Input
                required
                aria-label="Nombre de lista"
                placeholder="Ej. Lista Mayorista Distribuidores"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                disabled={isCreatingList}
                className="h-8 text-xs"
              />
            </Field>

            <Field label="Descripción (opcional)" hint="Alcance o notas de la lista.">
              <Input
                placeholder="Ej. Para distribuidores del interior"
                aria-label="Descripción de lista"
                value={newListDesc}
                onChange={(e) => setNewListDesc(e.target.value)}
                disabled={isCreatingList}
                className="h-8 text-xs"
              />
            </Field>

            <Field label="Moneda">
              <Input value="ARS (Pesos argentinos)" readOnly className="h-8 text-xs bg-gray-50 text-gray-700" />
            </Field>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowCreateDialog(false)}
                disabled={isCreatingList}
                className="h-8 text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isCreatingList || !newListCode.trim() || !newListName.trim()}
                className="h-8 text-xs bg-[var(--ossum-action)] text-white hover:bg-[var(--ossum-action-dark)]"
              >
                {isCreatingList && <Loader2 className="mr-1 size-3 animate-spin" />}
                Crear lista
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  )
}

function TrazabilidadTab({ item, ctx }: { item: StockItem; ctx: FichaCtx }) {
  const flags = traceFlags(ctx.method, ctx.expiry)
  const movements = ctx.liveDetail?.movements ?? []
  const lots = ctx.liveDetail?.lots ?? []
  const mov = movements.length > 0 ? movements[0] : null
  return (
    <div className="space-y-5">
      <section>
        <div className="flex items-center justify-between gap-2">
          <SectionTitle hint={`Derivado del método de trazabilidad (${traceControlLabel(ctx.method, ctx.expiry)})`}>Requisitos de trazabilidad</SectionTitle>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 text-xs border-[var(--ossum-action)] text-[var(--ossum-action)] hover:bg-[#eef0ff]"
            onClick={ctx.onOpenAdjustment}
          >
            Ajuste de inventario
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {[
            { label: "Requiere lote", on: flags.lot },
            { label: "Requiere serie", on: flags.serial },
            { label: "Requiere vencimiento", on: flags.expiry },
            { label: "Estéril", on: item.sterile },
          ].map((f) => (
            <span key={f.label} className={`rounded px-2 py-1 text-xs font-medium ${f.on ? "bg-[#eef0ff] text-[var(--ossum-action)]" : "bg-gray-100 text-gray-400"}`}>
              {f.on ? "●" : "○"} {f.label}
            </span>
          ))}
          <span className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">PM / ANMAT: <span className="font-mono">{item.pm || "—"}</span></span>
        </div>
      </section>

      <section>
        <SectionTitle hint="Registros reales por lote / serie">Existencias trazables</SectionTitle>
        <div className="h-52">
          <ExistenciasTable item={item} liveLots={lots} />
        </div>
      </section>

      <section>
        <SectionTitle hint="Historial de movimientos reales en el ledger inmutable">Movimientos (Ledger)</SectionTitle>
        <div className="h-60">
          <MovimientosTable item={item} liveMovements={movements} />
        </div>
      </section>

      {ctx.isLiveLoading ? (
        <p className="flex items-center gap-1.5 text-[11px] text-gray-400">
          <Loader2 className="size-3 animate-spin text-[var(--ossum-action)]" /> Cargando último movimiento...
        </p>
      ) : mov ? (
        <p className="text-[11px] text-gray-400">Último movimiento: {fmtDate(mov.date)} · {mov.type} · {mov.ref || "—"} · {mov.user}</p>
      ) : (
        <p className="text-[11px] text-gray-400">Último movimiento: —</p>
      )}
    </div>
  )
}

function CajasTab({ item, ctx }: { item: StockItem; ctx: FichaCtx }) {
  const articleId = ctx.canonicalArticleId || item.articleId || item.id
  const isBox = item.articleType?.trim().toLowerCase() === "caja"
  return <div className="space-y-6">{isBox && articleId ? <CajasPhysicalUnitsSection companyId={ctx.companyId} articleId={articleId} /> : null}<CajasFormulaSection item={item} ctx={ctx} /></div>
}

function AdjuntosTab() {
  return <EmptyState icon={Paperclip} title="Sin adjuntos" hint="Arrastrá certificados, fichas técnicas, imágenes o PDF del artículo." />
}

function HistorialTab({ item, ctx }: { item: StockItem; ctx: FichaCtx }) {
  if (ctx.isLiveLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
        <Loader2 className="size-6 animate-spin text-[var(--ossum-action)]" />
        <p className="text-xs font-medium text-gray-600">Cargando historial del ledger...</p>
      </div>
    )
  }

  const movements = ctx.liveDetail?.movements
  if (!movements || movements.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="Sin movimientos registrados"
        hint="Este artículo aún no registra movimientos auditados en el ledger backend."
      />
    )
  }

  const lastMov = movements[0]

  return (
    <div className="space-y-5">
      <section>
        <SectionTitle hint="Derivado de transacciones reales del ledger">Auditoría del artículo</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <AutoField label="Último modificador" value={lastMov.user || "—"} hint="Usuario del último movimiento registrado." />
          <AutoField label="Último movimiento" value={fmtDate(lastMov.date)} hint="Fecha del último movimiento registrado." />
          <AutoField label="Tipo de operación" value={lastMov.type} hint="Naturaleza de la última transacción." />
          <AutoField label="Referencia" value={lastMov.ref || "—"} mono hint="Comprobante o identificador vinculado." />
        </div>
      </section>

      <section>
        <SectionTitle hint="Historial completo de movimientos auditados">Movimientos del Ledger</SectionTitle>
        <div className="h-64">
          <MovimientosTable item={item} liveMovements={movements} />
        </div>
      </section>

      <section className="rounded-md border border-[var(--ossum-line)] bg-white px-4 py-2.5">
        <p className="text-xs text-gray-500">
          El historial, las fechas y los usuarios modificadores se obtienen exclusivamente del ledger inmutable del backend. No se utilizan valores simulados.
        </p>
      </section>
    </div>
  )
}

function FichaTabContent({ item, tab, ctx }: { item: StockItem; tab: FichaTab; ctx: FichaCtx }) {
  switch (tab) {
    case "identificacion": return <IdentificacionTab item={item} ctx={ctx} />
    case "stock": return <StockTab item={item} ctx={ctx} />
    case "compras": return <ComprasTab item={item} ctx={ctx} />
    case "comercial": return <ComercialTab item={item} ctx={ctx} />
    case "trazabilidad": return <TrazabilidadTab item={item} ctx={ctx} />
    case "cajas": return <CajasTab item={item} ctx={ctx} />
    case "adjuntos": return <AdjuntosTab />
    case "historial": return <HistorialTab item={item} ctx={ctx} />
    default: return <GeneralTab item={item} ctx={ctx} />
  }
}

// ─── Contextual read-only panel ───────────────────────────

function ContextPanel({
  item,
  method,
  expiry,
  liveDetail,
  isLiveLoading,
}: {
  item: StockItem
  method: TraceMethod
  expiry: boolean
  liveDetail?: ArticleStockDetailResponse | null
  isLiveLoading: boolean
}) {
  const mov = liveDetail?.movements[0]
  const available = liveDetail?.summary.available
  const reserved = liveDetail?.summary.reserved
  const inTransit = liveDetail?.summary.inTransit
  const operationalValue = (value: number | undefined) => {
    if (isLiveLoading) return "…"
    return value === undefined ? "—" : fmtQty(value)
  }
  const low = available !== undefined && available <= item.min

    const commCost = liveDetail?.article?.commercialProfile?.referenceCost ?? liveDetail?.article?.cost
    const commPrice = liveDetail?.article?.commercialProfile?.referenceSalePrice ?? liveDetail?.article?.price
    const commSupplier = liveDetail?.article?.commercialProfile?.preferredSupplierName ?? liveDetail?.article?.preferredSupplier

    const rows: Array<{ label: string; value: React.ReactNode; tone?: "red" | "amber" }> = [
      { label: "Disponible", value: operationalValue(available), tone: available === 0 ? "red" : low ? "amber" : undefined },
      { label: "Reservado", value: operationalValue(reserved) },
      { label: "En tránsito", value: operationalValue(inTransit) },
      { label: "Stock mínimo", value: fmtQty(item.min) },
      { label: "Depósito principal", value: item.defaultDeposit ?? "—" },
      { label: "Modo de control", value: traceControlLabel(method, expiry) },
      { label: "Último movimiento", value: mov ? fmtDate(mov.date) : isLiveLoading ? "…" : "—" },
      { label: "Costo de ref.", value: commCost ? fmtMoney(commCost) : "—" },
      { label: "Precio de ref.", value: commPrice ? fmtMoney(commPrice) : "—" },
      { label: "Proveedor pref.", value: commSupplier || "—" },
    ]
  return (
    <aside className="space-y-3">
      <div className="flex items-center gap-1.5">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--ossum-navy)]">Resumen</h3>
        <AutoBadge />
      </div>
      <dl className="divide-y divide-[var(--ossum-line)] overflow-hidden rounded-md border border-[var(--ossum-line)] bg-white">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-2 px-3 py-1.5">
            <dt className="text-[11px] text-gray-500">{r.label}</dt>
            <dd className={`text-xs font-medium tabular-nums ${r.tone === "red" ? "text-red-600" : r.tone === "amber" ? "text-amber-600" : "text-gray-800"}`}>{r.value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-[10px] leading-relaxed text-gray-400">Valores operativos derivados del ledger backend. Los datos sin respaldo en el detalle no se muestran.</p>
    </aside>
  )
}

// ─── Ficha body (header + tabs + content + footer) ────────

export function StockArticleFicha({
  item,
  initialTab = "general",
  onCancel,
  companyId: explicitCompanyId,
  onItemUpdated,
}: {
  item: StockItem
  initialTab?: FichaTab
  onCancel?: () => void
  companyId?: string
  onItemUpdated?: (updated: StockItem) => void
}) {
  const { activeCompany } = useAuth()
  const companyId = explicitCompanyId ?? activeCompany?.id ?? ""

  const canonicalArticleId = item.articleId ?? (item.id && !item.id.startsWith("stock-") && !item.id.startsWith("mock-") ? item.id : null)

  const [tab, setTab] = useState<FichaTab>(initialTab)
  const [articleType, setArticleType] = useState<StockArticleType>(item.articleType)
  const initialTrace = traceControlOf(item.control)
  const [method, setMethod] = useState<TraceMethod>(initialTrace.method)
  const [expiry, setExpiry] = useState<boolean>(initialTrace.expiry)
  const [active, setActive] = useState(item.masterStatus === "Activo")
  const initialVatOption = item.vatTreatment === "EXENTO"
    ? "exento"
    : item.vatTreatment === "NO_GRAVADO"
    ? "no_gravado"
    : item.vatRate !== undefined
    ? `${item.vatRate}%`
    : (item.iva ?? "21%")
  const [vatOption, setVatOption] = useState<string>(initialVatOption)
  const [savedVatOption, setSavedVatOption] = useState<string>(initialVatOption)
  const [isSavingVat, setIsSavingVat] = useState(false)
  const [vatSaveStatus, setVatSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [vatSaveError, setVatSaveError] = useState<string | null>(null)
  const [codesOpen, setCodesOpen] = useState(false)
  const [adjustmentOpen, setAdjustmentOpen] = useState(false)

  const {
    data: liveDetail,
    loading: isLiveLoading,
    recordAdjustment,
    refresh: refreshLiveDetail,
  } = useArticleStockDetail(canonicalArticleId || item.id)

  const [referenceCost, setReferenceCost] = useState<number | string>(item.cost ?? 0)
  const [referenceSalePrice, setReferenceSalePrice] = useState<number | string>(item.price ?? 0)
  const [priceListCode, setPriceListCode] = useState<string>(item.priceList ?? "")
  const [preferredSupplierId, setPreferredSupplierId] = useState<string>("")
  const [leadTimeDays, setLeadTimeDays] = useState<number | string>(item.leadTime ? parseInt(item.leadTime, 10) || "" : "")
  const [minStock, setMinStock] = useState<number | string>((item as any).minStock ?? (item as any).min ?? 0)

  const [savedCommercial, setSavedCommercial] = useState<{
    referenceCost: number | string
    referenceSalePrice: number | string
    priceListCode: string
    preferredSupplierId: string
    leadTimeDays: number | string
    minStock: number | string
  }>({
    referenceCost: item.cost ?? 0,
    referenceSalePrice: item.price ?? 0,
    priceListCode: item.priceList ?? "",
    preferredSupplierId: "",
    leadTimeDays: item.leadTime ? parseInt(item.leadTime, 10) || "" : "",
    minStock: (item as any).minStock ?? (item as any).min ?? 0,
  })
  const [isSavingCommercial, setIsSavingCommercial] = useState(false)
  const [commercialSaveStatus, setCommercialSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [commercialSaveError, setCommercialSaveError] = useState<string | null>(null)

  // Sync live commercial profile when detail loads
  React.useEffect(() => {
    if (liveDetail?.article) {
      const commProfile = liveDetail.article.commercialProfile
      const cost = commProfile?.referenceCost ?? liveDetail.article.cost ?? item.cost ?? 0
      const price = commProfile?.referenceSalePrice ?? liveDetail.article.price ?? item.price ?? 0
      const list = commProfile?.priceListCode ?? liveDetail.article.priceListCode ?? item.priceList ?? ""
      const prefId = commProfile?.preferredSupplierId ?? liveDetail.article.preferredSupplierId ?? ""
      const lead = commProfile?.leadTimeDays ?? liveDetail.article.leadTimeDays ?? (item.leadTime ? parseInt(item.leadTime, 10) || "" : "")
      const minStk = commProfile?.minStock ?? liveDetail.article.minStock ?? (item as any).minStock ?? (item as any).min ?? 0

      setReferenceCost(cost)
      setReferenceSalePrice(price)
      setPriceListCode(list)
      setPreferredSupplierId(prefId)
      setLeadTimeDays(lead != null ? lead : "")
      setMinStock(minStk)
      setSavedCommercial({
        referenceCost: cost,
        referenceSalePrice: price,
        priceListCode: list,
        preferredSupplierId: prefId,
        leadTimeDays: lead != null ? lead : "",
        minStock: minStk,
      })
    }
  }, [liveDetail?.article])

  const handleSaveVat = async () => {
    if (!canonicalArticleId) {
      toast.error("Sin artículo canónico vinculado")
      return
    }
    if (!companyId) {
      setVatSaveStatus("error")
      setVatSaveError("No hay empresa activa seleccionada")
      toast.error("No hay empresa activa seleccionada")
      return
    }
    if (isSavingVat) return // Block double submit

    setIsSavingVat(true)
    setVatSaveStatus("saving")
    setVatSaveError(null)

    try {
      const { treatment, rate } = parseVatOptionKey(vatOption)
      const res = await updateArticleVatApi(companyId, canonicalArticleId, {
        vatTreatment: treatment,
        vatRate: rate,
      })

      const nextKey = getVatKeyFromTreatmentAndRate(
        (res.vatTreatment as VatTreatment) ?? treatment,
        res.vatRate ?? rate
      )
      const nextOption = nextKey === "exento" || nextKey === "no_gravado" ? nextKey : `${nextKey}%`
      setVatOption(nextOption)
      setSavedVatOption(nextOption)
      setVatSaveStatus("saved")
      toast.success("IVA del artículo actualizado correctamente")
      onItemUpdated?.({
        ...item,
        vatTreatment: (res.vatTreatment as VatTreatment) ?? treatment,
        vatRate: res.vatRate ?? rate,
        iva: nextOption,
        ivaKey: nextKey,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al guardar el IVA del artículo"
      setVatSaveStatus("error")
      setVatSaveError(msg)
      toast.error(msg)
    } finally {
      setIsSavingVat(false)
    }
  }

  const handleSaveCommercial = async () => {
    if (!canonicalArticleId) {
      toast.error("Sin artículo canónico vinculado")
      return
    }
    if (!companyId) {
      setCommercialSaveStatus("error")
      setCommercialSaveError("No hay empresa activa seleccionada")
      toast.error("No hay empresa activa seleccionada")
      return
    }
    if (isSavingCommercial) return

    setIsSavingCommercial(true)
    setCommercialSaveStatus("saving")
    setCommercialSaveError(null)

    try {
      const parsedCost = referenceCost !== "" ? Math.max(0, Number(referenceCost) || 0) : 0
      const parsedPrice = referenceSalePrice !== "" ? Math.max(0, Number(referenceSalePrice) || 0) : 0
      const parsedLead = leadTimeDays !== "" ? Math.max(0, parseInt(String(leadTimeDays), 10) || 0) : null
      const parsedList = priceListCode.trim() || null
      const parsedPref = preferredSupplierId.trim() || null

      const parsedMinStock = minStock !== "" ? Math.max(0, Number(minStock) || 0) : 0

      const res = await updateArticleCommercialProfileApi(companyId, canonicalArticleId, {
        referenceCost: parsedCost,
        referenceSalePrice: parsedPrice,
        currency: "ARS",
        priceListCode: parsedList,
        preferredSupplierId: parsedPref,
        leadTimeDays: parsedLead,
        minStock: parsedMinStock,
      })

      const commProf = (res as any).commercialProfile
      setSavedCommercial({
        referenceCost: commProf?.referenceCost ?? parsedCost,
        referenceSalePrice: commProf?.referenceSalePrice ?? parsedPrice,
        priceListCode: commProf?.priceListCode ?? parsedList ?? "",
        preferredSupplierId: commProf?.preferredSupplierId ?? parsedPref ?? "",
        leadTimeDays: commProf?.leadTimeDays ?? parsedLead ?? "",
        minStock: commProf?.minStock ?? parsedMinStock,
      })
      setCommercialSaveStatus("saved")
      toast.success("Perfil comercial actualizado correctamente")
      await refreshLiveDetail()
      onItemUpdated?.({
        ...item,
        cost: commProf?.referenceCost ?? parsedCost,
        price: commProf?.referenceSalePrice ?? parsedPrice,
        priceList: commProf?.priceListCode ?? parsedList ?? "",
        preferredSupplier: commProf?.preferredSupplierName ?? item.preferredSupplier ?? "",
        leadTime: commProf?.leadTimeDays != null ? `${commProf.leadTimeDays} días` : (parsedLead != null ? `${parsedLead} días` : item.leadTime),
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al guardar el perfil comercial"
      setCommercialSaveStatus("error")
      setCommercialSaveError(msg)
      toast.error(msg)
    } finally {
      setIsSavingCommercial(false)
    }
  }

  const ctx: FichaCtx = {
    companyId,
    articleType,
    method,
    expiry,
    active,
    vatOption,
    savedVatOption,
    canonicalArticleId,
    isSavingVat,
    vatSaveStatus,
    vatSaveError,
    referenceCost,
    referenceSalePrice,
    priceListCode,
    preferredSupplierId,
    leadTimeDays,
    minStock,
    savedCommercial,
    isSavingCommercial,
    commercialSaveStatus,
    commercialSaveError,
    liveDetail,
    isLiveLoading,
    onOpenAdjustment: () => setAdjustmentOpen(true),
    setArticleType,
    setMethod,
    setExpiry,
    setActive,
    setVatOption,
    handleSaveVat,
    setReferenceCost,
    setReferenceSalePrice,
    setPriceListCode,
    setPreferredSupplierId,
    setLeadTimeDays,
    setMinStock,
    handleSaveCommercial,
    setTab,
  }

  const visibleTabs = FICHA_TABS

  const headerOperationalValue = (value: number | undefined) => {
    if (isLiveLoading) return "…"
    return value === undefined ? "—" : fmtQty(value)
  }
  const availableDisplay = headerOperationalValue(liveDetail?.summary.available)
  const reservedDisplay = headerOperationalValue(liveDetail?.summary.reserved)
  const inTransitDisplay = headerOperationalValue(liveDetail?.summary.inTransit)

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      {/* Header fijo */}
      <header className="shrink-0 border-b border-[var(--ossum-line)] px-4 py-2.5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <ArticleImage item={item} />
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold text-[var(--ossum-navy)]">
                <span className="font-mono text-[13px] text-gray-500">{item.code}</span>
                <span className="mx-2 text-gray-300">·</span>
                {item.name}
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-gray-500">
                <MasterStatusBadge active={active} />
                <span>Disponible <b className="tabular-nums text-gray-800">{availableDisplay}</b></span>
                <span className="text-gray-300">·</span>
                <span>Reservado <b className="tabular-nums text-gray-800">{reservedDisplay}</b></span>
                <span className="text-gray-300">·</span>
                <span>En tránsito <b className="tabular-nums text-gray-800">{inTransitDisplay}</b></span>
                <span className="text-gray-300">·</span>
                <span>{item.category}</span>
                <span className="text-gray-300">·</span>
                <span>{item.brand}</span>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setCodesOpen(true)}>
              <QrCode className="size-3.5" /> Códigos
            </Button>

            <Button variant="ghost" size="icon" className="size-8" aria-label="Cerrar ficha" onClick={onCancel}><X className="size-4" /></Button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <nav className="flex h-9 shrink-0 items-end gap-4 overflow-x-auto border-b border-[var(--ossum-line)] bg-white px-4" aria-label="Secciones de la ficha">
        {visibleTabs.map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-1 text-xs font-medium ${tab === t.id ? "border-[var(--ossum-action)] text-[var(--ossum-action)]" : "border-transparent text-gray-500 hover:text-gray-800"}`}
            >
              <Icon className="size-3.5" />
              {t.label}
            </button>
          )
        })}
      </nav>

      {/* Content + contextual panel */}
      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1 overflow-y-auto px-4 py-3">
          <FichaTabContent item={item} tab={tab} ctx={ctx} />
        </div>
        <aside className="hidden w-[256px] shrink-0 overflow-y-auto border-l border-[var(--ossum-line)] bg-[var(--ossum-surface)] px-3.5 py-3 lg:block">
          <ContextPanel item={item} method={method} expiry={expiry} liveDetail={liveDetail} isLiveLoading={isLiveLoading} />
        </aside>
      </div>

      {/* Footer sticky */}
      <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-[var(--ossum-line)] bg-white px-4 py-2.5">
        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onCancel}>Cerrar</Button>
      </footer>

      <ArticleCodesDialog item={item} open={codesOpen} onOpenChange={setCodesOpen} />
      {adjustmentOpen && (
        <StockAdjustmentDialog
          open={adjustmentOpen}
          onOpenChange={setAdjustmentOpen}
          articleCode={item.code}
          articleName={item.name}
          onConfirm={async (input) => {
            await recordAdjustment(input)
            await refreshLiveDetail()
          }}
        />
      )}
    </div>
  )
}

// ─── Fullscreen sheet (modal) ─────────────────────────────

export function StockArticleSheet({ item, initialTab, open, onOpenChange, companyId, onItemUpdated }: {
  item: StockItem | null; initialTab?: FichaTab; open: boolean; onOpenChange: (v: boolean) => void; companyId?: string; onItemUpdated?: (updated: StockItem) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex h-[94vh] w-[min(96vw,1200px)] max-w-none flex-col gap-0 overflow-hidden rounded-xl border border-[var(--ossum-line)] p-0 sm:max-w-none"
      >
        <DialogTitle className="sr-only">Ficha del artículo</DialogTitle>
        {item ? (
          <StockArticleFicha
            item={item}
            initialTab={initialTab}
            onCancel={() => onOpenChange(false)}
            companyId={companyId}
            onItemUpdated={onItemUpdated}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
