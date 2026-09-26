"use client"

import React, { useRef, useState } from "react"
import {
  Boxes,
  CircleDot,
  FileText,
  HelpCircle,
  ImagePlus,
  MoreHorizontal,
  Package,
  Paperclip,
  QrCode,
  ScrollText,
  ShoppingCart,
  Tag,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  ARTICLE_TYPES,
  ARTICLE_TYPE_LABEL,
  getFamilyStyle,
  TRACE_METHODS,
  TRACE_SUGGESTION,
  fmtDate,
  fmtMoney,
  fmtQty,
  isLowStock,
  lastMovement,
  suggestedPrice,
  traceControlLabel,
  traceControlOf,
  traceFlags,
  type StockArticleType,
  type StockItem,
  type TraceMethod,
} from "@/data/stock-mock"
import { FamilyThumb } from "@/components/stock/StockColumns"
import { ExistenciasTable, MovimientosTable } from "@/components/stock/StockArticleTabs"
import { ArticleCodesDialog } from "@/components/stock/ArticleCodesDialog"

// ─── Tabs ─────────────────────────────────────────────────

export type FichaTab =
  | "general" | "identificacion" | "stock" | "compras"
  | "comercial" | "trazabilidad" | "adjuntos" | "historial"

export const FICHA_TABS: Array<{ id: FichaTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: "general", label: "General", icon: Package },
  { id: "identificacion", label: "Identificación", icon: Tag },
  { id: "stock", label: "Stock", icon: Boxes },
  { id: "compras", label: "Compras", icon: ShoppingCart },
  { id: "comercial", label: "Comercial", icon: CircleDot },
  { id: "trazabilidad", label: "Trazabilidad", icon: ScrollText },
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

function ArticleImage({ item, image, onImage }: { item: StockItem; image: string | null; onImage: (url: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const pick = () => inputRef.current?.click()
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onImage(URL.createObjectURL(file))
  }
  return (
    <div className="flex shrink-0 flex-col items-center gap-1">
      <button
        type="button"
        onClick={pick}
        title="Cargar imagen del artículo"
        className="group relative flex size-12 items-center justify-center overflow-hidden rounded-md bg-white ring-1 ring-[var(--ossum-line)] hover:ring-[var(--ossum-action)]"
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element -- vista previa local (blob), sin backend
          <img src={image} alt={item.name} className="size-full object-cover" />
        ) : (
          <FamilyThumb item={item} />
        )}
        <span className="absolute inset-0 hidden items-center justify-center bg-black/40 text-white group-hover:flex">
          <ImagePlus className="size-4" />
        </span>
      </button>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
      <button type="button" onClick={pick} className="inline-flex items-center gap-1 text-[10px] font-medium text-[var(--ossum-action)] hover:underline">
        <ImagePlus className="size-3" /> Cargar imagen
      </button>
    </div>
  )
}

// ─── Ficha context (shared editable state) ────────────────

interface FichaCtx {
  articleType: StockArticleType
  method: TraceMethod
  expiry: boolean
  active: boolean
  setArticleType: (t: StockArticleType) => void
  setMethod: (m: TraceMethod) => void
  setExpiry: (b: boolean) => void
  setActive: (b: boolean) => void
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
          <Field label="Código / SKU" hint="Identificador interno único. Se usa en códigos de barras y búsquedas."><Input defaultValue={item.code} className="h-8 font-mono text-xs" /></Field>
          <Field label="Descripción" className="sm:col-span-2" hint="Nombre completo del artículo en listados y documentos."><Input defaultValue={item.name} className="h-8 text-xs" /></Field>
          <Field label="Descripción corta" hint="Versión abreviada para etiquetas y espacios reducidos."><Input defaultValue={item.shortDesc ?? ""} className="h-8 text-xs" /></Field>
          <Field label="Categoría" hint="Clasificación funcional (Implantes, Descartable, Instrumental…)."><Input defaultValue={item.category} className="h-8 text-xs" /></Field>
          <Field label="Familia" hint="Agrupación por familia o patología (Trauma, Cadera, Rodilla…)."><Input defaultValue={getFamilyStyle(item.family).label} className="h-8 text-xs" /></Field>
          <Field label="Marca" hint="Marca comercial del producto."><Input defaultValue={item.brand} className="h-8 text-xs" /></Field>
          <Field label="Fabricante" hint="Empresa que fabrica el producto."><Input defaultValue={item.manufacturer} className="h-8 text-xs" /></Field>
          <Field label="Unidad base" hint="Unidad de medida de referencia del stock.">
            <select defaultValue={item.unit} className="h-8 w-full rounded-md border border-[var(--ossum-line)] bg-white px-2.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-[var(--ossum-action)]">
              <option value="u">Unidad (u)</option>
              <option value="par">Par</option>
              <option value="caja">Caja</option>
              <option value="set">Set</option>
            </select>
          </Field>
        </div>
      </section>

      {/* 2. Gestión del artículo */}
      <section>
        <SectionTitle>Gestión del artículo</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Tipo de artículo" hint="Clasificación maestra. Gobierna qué campos y apartados se muestran en la ficha.">
            <select
              value={ctx.articleType}
              onChange={(e) => ctx.setArticleType(e.target.value as StockArticleType)}
              className="h-8 w-full rounded-md border border-[var(--ossum-line)] bg-white px-2.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-[var(--ossum-action)]"
            >
              {ARTICLE_TYPES.map((t) => <option key={t} value={t}>{ARTICLE_TYPE_LABEL[t]}</option>)}
            </select>
          </Field>
          <div className="flex items-end gap-2 pb-0.5">
            <div className="flex items-center gap-2">
              <Switch checked={ctx.active} onCheckedChange={ctx.setActive} />
              <div>
                <p className="text-xs font-medium text-gray-800">{ctx.active ? "Activo" : "Inactivo"}</p>
                <p className="text-[10px] text-gray-400">{ctx.active ? "Visible y operativo" : "Oculto en listados"}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-3">
          <p className="mb-1.5 text-[11px] font-medium text-gray-600">Método de trazabilidad</p>
          <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Método de trazabilidad">
            {TRACE_METHODS.map((option) => {
              const selected = ctx.method === option.id
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => ctx.setMethod(option.id)}
                  className={[
                    "rounded-md border px-3 py-2 text-left transition-colors",
                    selected ? "border-[var(--ossum-action)] bg-[#eef0ff] ring-1 ring-[var(--ossum-action)]" : "border-[var(--ossum-line)] bg-white hover:border-gray-300",
                  ].join(" ")}
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
              <p className="text-[10px] text-gray-400">Permite combinar {ctx.method === "serie" ? "Serie" : ctx.method === "lote" ? "Lote" : "Cantidad"} + vencimiento.</p>
            </div>
            <Switch checked={ctx.expiry} onCheckedChange={ctx.setExpiry} />
          </div>
        </div>
      </section>

      {/* 3. Datos secundarios (condicionales por tipo) */}
      {sections.instrumental && (
        <section>
          <SectionTitle hint="Solo para instrumental">Instrumental</SectionTitle>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Mantenimiento" hint="Indicaciones de mantenimiento y esterilización." className="sm:col-span-2"><Input defaultValue={item.maintenance ?? ""} className="h-8 text-xs" /></Field>
          </div>
        </section>
      )}

      {sections.activeFixed && (
        <section>
          <SectionTitle hint="Solo para equipos / bienes de capital">Activo fijo</SectionTitle>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="N° de activo fijo" hint="Número de inventario del bien de capital."><Input defaultValue={item.fixedAsset ?? ""} className="h-8 font-mono text-xs" /></Field>
            <Field label="Vida útil" hint="Vida útil estimada en años."><Input defaultValue={item.usefulLife ?? ""} className="h-8 text-xs" /></Field>
            <Field label="Mantenimiento" className="sm:col-span-2" hint="Plan de mantenimiento o calibración."><Input defaultValue={item.maintenance ?? ""} className="h-8 text-xs" /></Field>
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
          <Field label="PM / Registro ANMAT" hint="Número de registro sanitario ante ANMAT."><Input defaultValue={item.pm} className="h-8 font-mono text-xs" /></Field>
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
  return (
    <div className="space-y-5">
      <section>
        <SectionTitle hint="Las cantidades se derivan de movimientos reales — no son editables">Configuración de stock</SectionTitle>
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

      <section className="rounded-md border border-[var(--ossum-line)] bg-[var(--ossum-surface)] px-4 py-2.5">
        <p className="text-[11px] text-gray-500">
          Disponible, Reservado y En tránsito se calculan automáticamente desde los movimientos reales. Para modificarlos, registrá un movimiento o una reserva.
        </p>
      </section>
    </div>
  )
}

function ComprasTab({ item }: { item: StockItem }) {
  const suppliers = item.suppliers ?? []
  return (
    <div className="space-y-5">
      <section>
        <SectionTitle hint="Último costo / proveedor / fecha se actualizan al registrar compras">Compras</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Proveedor preferencial" hint="Proveedor principal para las compras."><Input defaultValue={item.preferredSupplier} className="h-8 text-xs" /></Field>
          <Field label="Código proveedor" hint="Código del artículo en el sistema del proveedor."><Input defaultValue={item.supplierCode ?? ""} className="h-8 font-mono text-xs" /></Field>
          <Field label="Plazo habitual de entrega" hint="Tiempo estimado entre pedido y recepción."><Input defaultValue={item.leadTime ?? ""} className="h-8 text-xs" /></Field>
          <AutoField label="Último proveedor" value={item.lastSupplier ?? item.preferredSupplier} hint="Proveedor de la última compra registrada." />
          <AutoField label="Último costo" value={fmtMoney(item.lastCost ?? item.cost)} mono hint="Costo de la última compra registrada." />
          <AutoField label="Fecha última compra" value={fmtDate(item.lastPurchaseDate)} hint="Fecha de la última compra registrada." />
        </div>
      </section>

      <section>
        <SectionTitle>Proveedores del artículo</SectionTitle>
        <div className="overflow-hidden rounded-md border border-[var(--ossum-line)]">
          <table className="w-full text-xs">
            <thead className="bg-[var(--ossum-navy)] text-white">
              <tr>
                {["Proveedor", "Código proveedor", "Descripción proveedor"].map((label) => (
                  <th key={label} className="px-3 py-1.5 text-left font-medium">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {suppliers.length === 0 ? (
                <tr><td colSpan={3} className="px-3 py-4 text-center text-gray-400">Sin proveedores registrados.</td></tr>
              ) : suppliers.map((s) => (
                <tr key={s.code} className="border-t border-[var(--ossum-line)]">
                  <td className="px-3 py-1.5 text-gray-800">{s.supplier}</td>
                  <td className="px-3 py-1.5 font-mono text-gray-500">{s.code}</td>
                  <td className="px-3 py-1.5 text-gray-500">{s.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function ComercialTab({ item }: { item: StockItem }) {
  const suggested = suggestedPrice(item)
  const margin = item.marginTarget ?? 40
  const below = item.price < suggested
  return (
    <div className="space-y-5">
      <section>
        <SectionTitle hint="Simple: no es un módulo contable">Comercial</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="IVA" hint="Alicuota de IVA aplicada.">
            <select defaultValue={item.iva ?? "21%"} className="h-8 w-full rounded-md border border-[var(--ossum-line)] bg-white px-2.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-[var(--ossum-action)]">
              <option value="21%">21%</option><option value="10.5%">10.5%</option><option value="0%">0% (Exento)</option>
            </select>
          </Field>
          <Field label="Precio base" hint="Precio de venta de referencia."><Input type="number" defaultValue={item.price} className="h-8 text-xs" /></Field>
          <Field label="Lista" hint="Lista de precios a la que pertenece."><Input defaultValue={item.priceList ?? "Lista 1"} className="h-8 text-xs" /></Field>
          <Field label="Margen objetivo (%)" hint="Margen bruto deseado sobre el costo."><Input type="number" defaultValue={margin} className="h-8 text-xs" /></Field>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5"><span className="text-[11px] text-gray-500">Precio sugerido</span><AutoBadge /><Hint text="Costo × (1 + margen objetivo)." /></div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900">{fmtMoney(suggested)}</span>
              {below && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">precio manual por debajo</span>}
            </div>
            <p className="text-[10px] text-gray-400">Costo × (1 + margen) = {fmtMoney(item.cost)} × {1 + margin / 100}</p>
          </div>
        </div>
      </section>
    </div>
  )
}

function TrazabilidadTab({ item, ctx }: { item: StockItem; ctx: FichaCtx }) {
  const flags = traceFlags(ctx.method, ctx.expiry)
  const mov = lastMovement(item)
  return (
    <div className="space-y-5">
      <section>
        <SectionTitle hint={`Derivado del método de trazabilidad (${traceControlLabel(ctx.method, ctx.expiry)})`}>Requisitos de trazabilidad</SectionTitle>
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
          <ExistenciasTable item={item} />
        </div>
      </section>

      <section>
        <SectionTitle hint="Historial de movimientos reales">Movimientos</SectionTitle>
        <div className="h-60">
          <MovimientosTable item={item} />
        </div>
        <div className="mt-2 text-right">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => toast.info("Trazabilidad completa (próximamente)")}>Ver trazabilidad completa</Button>
        </div>
      </section>

      {mov && (
        <p className="text-[11px] text-gray-400">Último movimiento: {fmtDate(mov.date)} · {mov.type} · {mov.ref} · {mov.user}</p>
      )}
    </div>
  )
}

function AdjuntosTab() {
  return <EmptyState icon={Paperclip} title="Sin adjuntos" hint="Arrastrá certificados, fichas técnicas, imágenes o PDF del artículo." />
}

function HistorialTab({ item }: { item: StockItem }) {
  const mov = lastMovement(item)
  return (
    <div className="space-y-5">
      <section>
        <SectionTitle>Auditoría del artículo</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="ID artículo" hint="Identificador interno de la base de datos."><Input value={item.id} readOnly className="h-8 font-mono text-xs" /></Field>
          <Field label="Creado por" hint="Usuario que dio de alta el artículo."><Input value={item.createdBy ?? "—"} readOnly className="h-8 text-xs" /></Field>
          <Field label="Fecha de alta" hint="Fecha de creación del artículo."><Input value={fmtDate(item.createdAt)} readOnly className="h-8 text-xs" /></Field>
          <AutoField label="Último modificador" value={mov?.user ?? "—"} hint="Usuario del último movimiento registrado." />
          <AutoField label="Último movimiento" value={fmtDate(mov?.date)} hint="Fecha del último movimiento registrado." />
          <AutoField label="Estado operativo" value={item.state} hint="Derivado del stock y las reservas actuales." />
        </div>
      </section>
      <section className="rounded-md border border-[var(--ossum-line)] bg-white px-4 py-2.5">
        <p className="text-xs text-gray-500">
          El usuario modificador, el último movimiento y el estado operativo se derivan automáticamente del historial y los movimientos reales. No son editables.
        </p>
      </section>
    </div>
  )
}

function FichaTabContent({ item, tab, ctx }: { item: StockItem; tab: FichaTab; ctx: FichaCtx }) {
  switch (tab) {
    case "identificacion": return <IdentificacionTab item={item} ctx={ctx} />
    case "stock": return <StockTab item={item} ctx={ctx} />
    case "compras": return <ComprasTab item={item} />
    case "comercial": return <ComercialTab item={item} />
    case "trazabilidad": return <TrazabilidadTab item={item} ctx={ctx} />
    case "adjuntos": return <AdjuntosTab />
    case "historial": return <HistorialTab item={item} />
    default: return <GeneralTab item={item} ctx={ctx} />
  }
}

// ─── Contextual read-only panel ───────────────────────────

function ContextPanel({ item, method, expiry }: { item: StockItem; method: TraceMethod; expiry: boolean }) {
  const low = isLowStock(item)
  const mov = lastMovement(item)
  const rows: Array<{ label: string; value: React.ReactNode; tone?: "red" | "amber" }> = [
    { label: "Disponible", value: fmtQty(item.available), tone: item.available === 0 ? "red" : low ? "amber" : undefined },
    { label: "Reservado", value: fmtQty(item.reserved) },
    { label: "En tránsito", value: fmtQty(item.inTransit) },
    { label: "Stock mínimo", value: fmtQty(item.min) },
    { label: "Depósito principal", value: item.defaultDeposit ?? "—" },
    { label: "Modo de control", value: traceControlLabel(method, expiry) },
    { label: "Último movimiento", value: fmtDate(mov?.date) },
    { label: "Último costo", value: fmtMoney(item.lastCost ?? item.cost) },
    { label: "Último proveedor", value: item.lastSupplier ?? item.preferredSupplier },
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
      <p className="text-[10px] leading-relaxed text-gray-400">Valores derivados de movimientos y reservas reales. No se editan desde esta ficha.</p>
    </aside>
  )
}

// ─── Ficha body (header + tabs + content + footer) ────────

export function StockArticleFicha({ item, initialTab = "general", onCancel }: {
  item: StockItem; initialTab?: FichaTab; onCancel?: () => void
}) {
  const [tab, setTab] = useState<FichaTab>(initialTab)
  const [articleType, setArticleType] = useState<StockArticleType>(item.articleType)
  const initialTrace = traceControlOf(item.control)
  const [method, setMethod] = useState<TraceMethod>(initialTrace.method)
  const [expiry, setExpiry] = useState<boolean>(initialTrace.expiry)
  const [active, setActive] = useState(item.masterStatus === "Activo")
  const [image, setImage] = useState<string | null>(null)
  const [codesOpen, setCodesOpen] = useState(false)

  const ctx: FichaCtx = { articleType, method, expiry, active, setArticleType, setMethod, setExpiry, setActive, setTab }

  const visibleTabs = FICHA_TABS

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      {/* Header fijo */}
      <header className="shrink-0 border-b border-[var(--ossum-line)] px-4 py-2.5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <ArticleImage item={item} image={image} onImage={setImage} />
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold text-[var(--ossum-navy)]">
                <span className="font-mono text-[13px] text-gray-500">{item.code}</span>
                <span className="mx-2 text-gray-300">·</span>
                {item.name}
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-gray-500">
                <MasterStatusBadge active={active} />
                <span>Disponible <b className="tabular-nums text-gray-800">{fmtQty(item.available)}</b></span>
                <span className="text-gray-300">·</span>
                <span>Reservado <b className="tabular-nums text-gray-800">{fmtQty(item.reserved)}</b></span>
                <span className="text-gray-300">·</span>
                <span>En tránsito <b className="tabular-nums text-gray-800">{fmtQty(item.inTransit)}</b></span>
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="size-8" title="Más acciones"><MoreHorizontal className="size-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onSelect={() => toast.info("Duplicar artículo (próximamente)")}>Duplicar</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => toast.info("Cambiar estado (próximamente)")}>Cambiar estado</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => toast.info("Dar de baja (próximamente)")} className="text-red-600">Dar de baja</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
          <ContextPanel item={item} method={method} expiry={expiry} />
        </aside>
      </div>

      {/* Footer sticky */}
      <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-[var(--ossum-line)] bg-white px-4 py-2.5">
        <p className="text-[11px] text-gray-500">Vista de consulta. La edición integral de esta ficha todavía no está conectada.</p>
        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onCancel}>Cerrar</Button>
      </footer>

      <ArticleCodesDialog item={item} open={codesOpen} onOpenChange={setCodesOpen} />
    </div>
  )
}

// ─── Fullscreen sheet (modal) ─────────────────────────────

export function StockArticleSheet({ item, initialTab, open, onOpenChange }: {
  item: StockItem | null; initialTab?: FichaTab; open: boolean; onOpenChange: (v: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex h-[94vh] w-[min(96vw,1200px)] max-w-none flex-col gap-0 overflow-hidden rounded-xl border border-[var(--ossum-line)] p-0 sm:max-w-none"
      >
        <DialogTitle className="sr-only">Ficha del artículo</DialogTitle>
        {item ? (
          <StockArticleFicha item={item} initialTab={initialTab} onCancel={() => onOpenChange(false)} />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
