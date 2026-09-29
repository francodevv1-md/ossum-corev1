"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Loader2,
  PackagePlus,
  Sparkles,
  UserPlus,
  Wand2,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AiUploadZone } from "@/components/cirugias/AiUploadZone"
import { CreateArticleModal } from "@/components/compras/CreateArticleModal"
import { CreateProveedorModal } from "@/components/compras/CreateProveedorModal"
import { ArticleSearchInput } from "@/components/compras/ArticleSearchInput"
import { useComprasOcrForm, type ComprasOcrTipo } from "@/hooks/useComprasOcrForm"
import { cn } from "@/lib/utils"

// ─── OSSUM brand surface (scoped) ────────────────────────────────────────────
const NAVY = "bg-[var(--ossum-navy)] text-white"
const NAVY_SOFT = "bg-[var(--ossum-navy-soft)] text-white"
const ACTION = "bg-[var(--ossum-action)] text-white hover:bg-[var(--ossum-action-hover)]"
const LINE = "border-[var(--ossum-line)]"
const OSSUM_SCOPE_STYLE = {
  "--ossum-navy": "#071935",
  "--ossum-navy-soft": "#0f2748",
  "--ossum-action": "#1D2FC0",
  "--ossum-action-hover": "#1830a8",
  "--ossum-danger": "#D02F28",
  "--ossum-surface": "#FBFBFB",
  "--ossum-surface-2": "#F3F3F3",
  "--ossum-line": "#e6e8eb",
  background: "#FBFBFB",
} as React.CSSProperties

const fieldClass =
  "h-8 bg-white text-sm border border-[var(--ossum-line)] rounded-[3px] px-2 focus-visible:outline-none focus-visible:border-[var(--ossum-action)] focus-visible:ring-1 focus-visible:ring-[var(--ossum-action)]"
const cellInputClass =
  "h-7 w-full bg-transparent text-xs px-1.5 focus-visible:outline-none focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-[var(--ossum-action)] rounded-[2px] border border-transparent focus-visible:border-[var(--ossum-action)]"
const selectClass =
  "h-8 w-full rounded-[3px] border border-[var(--ossum-line)] bg-white px-2 text-sm focus-visible:outline-none focus-visible:border-[var(--ossum-action)] focus-visible:ring-1 focus-visible:ring-[var(--ossum-action)]"

type Mode = "ia" | "manual"

export function ComprasOcrWorkspace({
  tipo,
  backHref,
}: {
  tipo: ComprasOcrTipo
  backHref: string
}) {
  const router = useRouter()
  const form = useComprasOcrForm({
    tipo,
    onSuccess: () => router.push(backHref),
  })

  const [mode, setMode] = React.useState<Mode>("ia")

  // When switching to manual, ensure we're in results phase with empty data
  const handleModeChange = React.useCallback(
    (next: Mode) => {
      if (next === "manual" && form.phase === "upload") {
        // Pre-fill empty items so the form is ready
        form.setItems([{ codigo: "", descripcion: "", cantidad: "1" }])
        form.setPhase("results")
      }
      setMode(next)
    },
    [form]
  )

  const titleText =
    tipo === "remito-proveedor" ? "Nuevo remito de proveedor" : "Nueva factura de compra"
  const isRemito = tipo === "remito-proveedor"

  return (
    <div className="flex min-h-full flex-col" style={OSSUM_SCOPE_STYLE}>
      {/* ── HEADER ── */}
      <header className={cn("sticky top-0 z-30 border-b border-[var(--ossum-navy)]", NAVY)}>
        <div className="mx-auto flex max-w-[1800px] items-center justify-between gap-3 px-4 py-2 sm:px-6">
          <div className="flex min-w-0 items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 text-white/80 hover:bg-white/10 hover:text-white"
              onClick={() => router.push(backHref)}
            >
              <ArrowLeft className="size-4" /> Volver
            </Button>
          </div>
          <div className="flex min-w-0 items-center gap-3">
            <h1 className="truncate text-base font-semibold text-white">{titleText}</h1>
            <span className="rounded-[3px] bg-white/10 px-2 py-0.5 text-[11px] font-medium text-white/70">
              {form.phase === "upload" && mode === "ia"
                ? "Sin documento cargado"
                : form.isProcessing
                  ? "Procesando…"
                  : "Editando datos"}
            </span>
          </div>
        </div>
      </header>

      {/* ── MAIN ── */}
      <main className="mx-auto w-full max-w-[1800px] flex-1 px-4 py-4 sm:px-6">
        {!form.activeCompany?.id ? (
          <div className="rounded-md border border-[var(--ossum-line)] bg-white p-6">
            <h2 className="text-base font-semibold text-[var(--ossum-navy)]">
              Sin empresa activa
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              No se detectó una empresa activa. Verificá la sesión.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* ── MODE SELECTOR ── */}
            <div className="flex items-center gap-2 rounded-md border border-[var(--ossum-line)] bg-white p-1.5">
              <ModeButton
                active={mode === "ia"}
                onClick={() => handleModeChange("ia")}
                icon={<Sparkles className="size-4" />}
                label="Cargar por IA"
                sublabel="Subí PDF o imagen — Azure + IA extraen los datos"
              />
              <ModeButton
                active={mode === "manual"}
                onClick={() => handleModeChange("manual")}
                icon={<FileText className="size-4" />}
                label="Carga manual"
                sublabel="Completá los campos a mano"
              />
            </div>

            {/* ── UPLOAD (IA mode only) ── */}
            {mode === "ia" && (form.phase === "upload" || !form.result) ? (
              <Section label="Cargar documento">
                <AiUploadZone
                  isProcessing={form.isProcessing}
                  error={form.error}
                  onFileSelected={form.handleFileSelected}
                />
              </Section>
            ) : (
              <>
                {/* ── STATUS BADGES ── */}
                {form.result && (
                  <div className="flex flex-wrap items-center gap-2">
                    {!form.looksLike && (
                      <Badge variant="warning" className="text-[10px]">
                        Tipo de documento sin confirmar
                      </Badge>
                    )}
                    <span
                      className={
                        form.confLevel === "high"
                          ? "inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                          : "inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                      }
                    >
                      Confianza{" "}
                      {form.confLevel === "low"
                        ? "baja"
                        : form.confLevel === "medium"
                          ? "media"
                          : "alta"}{" "}
                      · {Math.round(form.confidence * 100)}%
                    </span>
                    {mode === "ia" && (
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <Wand2 className="size-3" />
                        Extraído por IA
                      </Badge>
                    )}
                  </div>
                )}

                {/* ── WARNINGS ── */}
                {form.result?.warnings.length ? (
                  <Alert>
                    <AlertTitle>Advertencias</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc pl-4 space-y-0.5">
                        {form.result.warnings.map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                ) : null}

                {/* ── SECTION: Datos del documento ── */}
                <Section label="Datos del documento">
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-3 lg:grid-cols-4">
                    {/* Proveedor */}
                    <div className="col-span-2 sm:col-span-2 lg:col-span-2">
                      <Label className="mb-0.5 block text-[11px] font-medium text-gray-500">
                        Proveedor *
                      </Label>
                      <div className="flex items-center gap-2">
                        <Select
                          value={form.proveedorId}
                          onValueChange={form.setProveedorId}
                        >
                          <SelectTrigger className={selectClass}>
                            <SelectValue placeholder="Elegir proveedor…" />
                          </SelectTrigger>
                          <SelectContent>
                            {form.proveedores.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {isRemito && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 shrink-0 gap-1 border-[var(--ossum-line)]"
                            onClick={form.openCreateProveedor}
                          >
                            <UserPlus className="size-3.5" />
                            Crear
                          </Button>
                        )}
                      </div>
                    </div>

                    <CompactField label="Nombre detectado">
                      <Input
                        value={form.proveedorName}
                        onChange={(e) => form.setProveedorName(e.target.value)}
                        className={fieldClass}
                        placeholder="Nombre del proveedor"
                        disabled={!!form.proveedorId}
                      />
                    </CompactField>

                    <CompactField label="CUIT">
                      <Input
                        value={form.cuit}
                        onChange={(e) => form.setCuit(e.target.value)}
                        className={fieldClass}
                        placeholder="30-71234567-3"
                      />
                    </CompactField>

                    <CompactField label={isRemito ? "Número remito *" : "Número factura *"}>
                      <Input
                        value={form.numero}
                        onChange={(e) => form.setNumero(e.target.value)}
                        className={fieldClass}
                        placeholder={isRemito ? "Nº remito" : "Nº factura"}
                      />
                    </CompactField>

                    <CompactField label="Fecha">
                      <Input
                        type="date"
                        value={form.fecha}
                        onChange={(e) => form.setFecha(e.target.value)}
                        className={fieldClass}
                      />
                    </CompactField>

                    {!isRemito && (
                      <>
                        <CompactField label="Tipo factura">
                          <Select
                            value={form.tipoFactura}
                            onValueChange={form.setTipoFactura}
                          >
                            <SelectTrigger className={selectClass}>
                              <SelectValue placeholder="A / B / C" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="A">A</SelectItem>
                              <SelectItem value="B">B</SelectItem>
                              <SelectItem value="C">C</SelectItem>
                            </SelectContent>
                          </Select>
                        </CompactField>

                        <CompactField label="Total">
                          <Input
                            value={form.total}
                            onChange={(e) => form.setTotal(e.target.value)}
                            className={fieldClass}
                            placeholder="$0,00"
                          />
                        </CompactField>
                      </>
                    )}

                    <CompactField label="Orden de compra (ref)" className="col-span-2">
                      <Input
                        value={form.ordenCompraRef}
                        onChange={(e) => form.setOrdenCompraRef(e.target.value)}
                        className={fieldClass}
                        placeholder="Nº de OC si figura en el documento"
                      />
                    </CompactField>

                    <CompactField label="Observaciones" className="col-span-2">
                      <Input
                        value={form.observaciones}
                        onChange={(e) => form.setObservaciones(e.target.value)}
                        className={fieldClass}
                        placeholder="Observaciones"
                      />
                    </CompactField>
                  </div>
                </Section>

                {/* ── SECTION: Items ── */}
                <Section
                  label={`Items (${form.items.length})`}
                  action={
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1 border-[var(--ossum-line)] text-xs"
                      onClick={() =>
                        form.setItems((prev) => [
                          ...prev,
                          { codigo: "", descripcion: "", cantidad: "1" },
                        ])
                      }
                    >
                      <PackagePlus className="size-3" />
                      Agregar línea
                    </Button>
                  }
                >
                  {form.items.length === 0 ? (
                    <p className="py-4 text-center text-xs text-gray-400">
                      No hay items. Agregá una línea para empezar.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-[var(--ossum-line)] text-left text-[11px] text-gray-400">
                            <th className="w-8 px-1 py-1 text-right font-medium">#</th>
                            <th className="px-1 py-1 font-medium">Código</th>
                            <th className="px-1 py-1 font-medium">Descripción</th>
                            <th className="w-16 px-1 py-1 text-right font-medium">Cant.</th>
                            {isRemito ? (
                              <>
                                <th className="w-24 px-1 py-1 font-medium">Lote</th>
                                <th className="w-28 px-1 py-1 font-medium">Vto.</th>
                              </>
                            ) : (
                              <>
                                <th className="w-24 px-1 py-1 text-right font-medium">P.U.</th>
                                <th className="w-24 px-1 py-1 text-right font-medium">Subt.</th>
                              </>
                            )}
                            <th className="w-48 px-1 py-1 font-medium">Catálogo</th>
                            <th className="w-8 px-1 py-1"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {form.items.map((it, idx) => (
                            <tr
                              key={idx}
                              className="border-b border-[var(--ossum-line)] last:border-0 hover:bg-[var(--ossum-surface-2)]/60"
                            >
                              <td className="px-1 py-0.5 text-right text-[11px] text-gray-400 tabular-nums">
                                {idx + 1}
                              </td>
                              <td className="px-0.5 py-0.5">
                                <Input
                                  className={cellInputClass}
                                  value={it.codigo}
                                  onChange={(e) =>
                                    form.updateItem(idx, { codigo: e.target.value })
                                  }
                                />
                              </td>
                              <td className="px-0.5 py-0.5">
                                <Input
                                  className={cellInputClass}
                                  value={it.descripcion}
                                  onChange={(e) =>
                                    form.updateItem(idx, { descripcion: e.target.value })
                                  }
                                />
                              </td>
                              <td className="px-0.5 py-0.5">
                                <Input
                                  className={cn(cellInputClass, "text-right tabular-nums font-medium")}
                                  value={it.cantidad}
                                  onChange={(e) =>
                                    form.updateItem(idx, { cantidad: e.target.value })
                                  }
                                />
                              </td>
                              {isRemito ? (
                                <>
                                  <td className="px-0.5 py-0.5">
                                    <Input
                                      className={cellInputClass}
                                      value={it.lote ?? ""}
                                      onChange={(e) =>
                                        form.updateItem(idx, { lote: e.target.value })
                                      }
                                    />
                                  </td>
                                  <td className="px-0.5 py-0.5">
                                    <Input
                                      type="date"
                                      className={cellInputClass}
                                      value={it.vencimiento ?? ""}
                                      onChange={(e) =>
                                        form.updateItem(idx, { vencimiento: e.target.value })
                                      }
                                    />
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className="px-0.5 py-0.5">
                                    <Input
                                      className={cn(cellInputClass, "text-right tabular-nums")}
                                      value={it.precio_unitario ?? ""}
                                      onChange={(e) =>
                                        form.updateItem(idx, {
                                          precio_unitario: e.target.value,
                                        })
                                      }
                                    />
                                  </td>
                                  <td className="px-0.5 py-0.5">
                                    <Input
                                      className={cn(cellInputClass, "text-right tabular-nums")}
                                      value={it.subtotal ?? ""}
                                      onChange={(e) =>
                                        form.updateItem(idx, { subtotal: e.target.value })
                                      }
                                    />
                                  </td>
                                </>
                              )}
                              <td className="px-1 py-0.5">
                                <ArticleSearchInput
                                  compact
                                  value={form.linkedStockIds[idx]}
                                  onSelect={(item) => form.linkItemToStock(idx, item.id)}
                                  onClear={() => form.unlinkItem(idx)}
                                  proveedorName={form.proveedorName}
                                  companyId={isRemito ? undefined : form.activeCompany?.id}
                                  initialQuery={it.descripcion}
                                />
                              </td>
                              <td className="px-0.5 py-0.5 text-right">
                                <button
                                  type="button"
                                  onClick={() => form.removeItem(idx)}
                                  aria-label={`Quitar renglón ${idx + 1}`}
                                  className="rounded p-1 text-gray-300 hover:bg-[var(--ossum-danger)]/10 hover:text-[var(--ossum-danger)]"
                                >
                                  ×
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Section>

                {/* ── ERROR ── */}
                {form.error && (
                  <Alert variant="destructive">
                    <AlertDescription>{form.error}</AlertDescription>
                  </Alert>
                )}

                {/* ── ACTIONS ── */}
                <div className="flex items-center justify-between gap-2 pb-4">
                  <div className="flex items-center gap-2">
                    {mode === "ia" && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 text-gray-500"
                        onClick={form.handleReset}
                      >
                        Leer otro archivo
                      </Button>
                    )}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={form.handleConfirm}
                    disabled={form.isProcessing}
                    className={cn("h-9 gap-1.5", ACTION)}
                  >
                    {form.isProcessing ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="size-4" />
                    )}
                    Confirmar y guardar
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {/* ── MODALS ── */}
      {isRemito && (
        <>
          <CreateArticleModal
            key={`art-${form.createArticleForIdx ?? "none"}`}
            open={form.createArticleOpen}
            onOpenChange={form.setCreateArticleOpen}
            prefill={form.createArticlePrefill}
            onCreated={form.handleArticleCreated}
          />
          <CreateProveedorModal
            key={`prov-${form.createProvPrefill?.name ?? "none"}`}
            open={form.createProvOpen}
            onOpenChange={form.setCreateProvOpen}
            prefill={form.createProvPrefill}
            onCreated={form.handleProveedorCreated}
          />
        </>
      )}
    </div>
  )
}

// ─── Presentational components ───────────────────────────────────────────────

function Section({
  label,
  action,
  children,
}: {
  label: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className={cn("rounded-md border bg-white", LINE)}>
      <div
        className={cn(
          "flex items-center justify-between gap-2 border-b border-[var(--ossum-line)] px-3 py-1.5",
          NAVY_SOFT
        )}
      >
        <h2 className="text-xs font-semibold uppercase tracking-wide text-white/90">{label}</h2>
        {action}
      </div>
      <div className="p-3">{children}</div>
    </section>
  )
}

function CompactField({
  label,
  className,
  children,
}: {
  label: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={className}>
      <Label className="mb-0.5 block text-[11px] font-medium text-gray-500">{label}</Label>
      {children}
    </div>
  )
}

function ModeButton({
  active,
  onClick,
  icon,
  label,
  sublabel,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  sublabel: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center gap-3 rounded-[5px] px-3 py-2 text-left transition-all",
        active
          ? "bg-[var(--ossum-action)]/8 ring-1 ring-[var(--ossum-action)]/30"
          : "hover:bg-[var(--ossum-surface-2)]"
      )}
    >
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-md transition-colors",
          active
            ? "bg-[var(--ossum-action)] text-white"
            : "bg-[var(--ossum-surface-2)] text-gray-400"
        )}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p
          className={cn(
            "text-sm font-semibold",
            active ? "text-[var(--ossum-navy-soft)]" : "text-gray-600"
          )}
        >
          {label}
        </p>
        <p className="truncate text-[11px] text-gray-400">{sublabel}</p>
      </div>
    </button>
  )
}
