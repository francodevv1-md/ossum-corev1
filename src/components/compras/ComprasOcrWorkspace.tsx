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
  persistToStore,
  onRemitoConfirmed,
}: {
  tipo: ComprasOcrTipo
  backHref: string
  persistToStore?: boolean
  onRemitoConfirmed?: (remito: any) => Promise<void>
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
            <Badge variant="outline" className="border-white/30 text-white text-[11px] font-mono">
              OCR + Extracción IA
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/70 hidden sm:inline">Modo:</span>
            <div className="inline-flex rounded-[3px] bg-white/10 p-0.5">
              <button
                type="button"
                onClick={() => handleModeChange("ia")}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-[2px] transition-colors",
                  mode === "ia" ? "bg-white text-[var(--ossum-navy)] font-semibold shadow-xs" : "text-white/80 hover:text-white"
                )}
              >
                <Wand2 className="size-3" /> IA
              </button>
              <button
                type="button"
                onClick={() => handleModeChange("manual")}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-[2px] transition-colors",
                  mode === "manual" ? "bg-white text-[var(--ossum-navy)] font-semibold shadow-xs" : "text-white/80 hover:text-white"
                )}
              >
                <FileText className="size-3" /> Manual
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── BODY ── */}
      <main className="mx-auto w-full max-w-[1800px] flex-1 px-4 py-4 sm:px-6">
        {mode === "ia" && form.phase === "upload" && (
          <div className="mx-auto max-w-2xl py-8">
            <div className="mb-4 text-center">
              <h2 className="text-lg font-semibold text-[var(--ossum-navy)]">
                Subir comprobante para extracción automática
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Formatos aceptados: PDF, JPG, PNG, WEBP. Procesamiento inteligente de comprobantes.
              </p>
            </div>
            <AiUploadZone
              onFileSelected={form.handleFileSelected}
              isProcessing={form.isProcessing}
              error={form.error}
            />
          </div>
        )}

        {form.phase === "results" && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            {/* Left Column: Form Fields */}
            <div className="space-y-4 lg:col-span-8">
              {/* Header card */}
              <div className="rounded-[4px] border border-[var(--ossum-line)] bg-white p-4 shadow-xs">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <Label className="text-xs font-medium">Proveedor *</Label>
                    <div className="mt-1 flex gap-1">
                      <Select
                        value={form.proveedorId}
                        onValueChange={form.setProveedorId}
                      >
                        <SelectTrigger className={selectClass}>
                          <SelectValue placeholder="Seleccionar..." />
                        </SelectTrigger>
                        <SelectContent>
                          {form.proveedores.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="size-8 shrink-0"
                        onClick={() => form.setCreateProvOpen(true)}
                      >
                        <UserPlus className="size-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-medium">Número de Comprobante *</Label>
                    <Input
                      className={cn("mt-1", fieldClass)}
                      value={form.numero}
                      onChange={(e) => form.setNumero(e.target.value)}
                      placeholder="0001-00001234"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-medium">Fecha *</Label>
                    <Input
                      type="date"
                      className={cn("mt-1", fieldClass)}
                      value={form.fecha}
                      onChange={(e) => form.setFecha(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Items Table Card */}
              <div className="rounded-[4px] border border-[var(--ossum-line)] bg-white p-4 shadow-xs">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase text-muted-foreground">
                    Artículos del comprobante ({form.items.length})
                  </h3>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1 text-xs"
                    onClick={() => form.setItems((prev) => [...prev, { codigo: "", descripcion: "", cantidad: "1" }])}
                  >
                    <PackagePlus className="size-3" /> Agregar línea
                  </Button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="p-2 text-left">Código</th>
                        <th className="p-2 text-left">Descripción</th>
                        <th className="p-2 text-right">Cantidad</th>
                        {isRemito ? (
                          <>
                            <th className="p-2 text-left">Lote</th>
                            <th className="p-2 text-left">Vencimiento</th>
                          </>
                        ) : (
                          <>
                            <th className="p-2 text-right">Precio Unitario</th>
                            <th className="p-2 text-right">Subtotal</th>
                          </>
                        )}
                        <th className="p-2 text-center w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {form.items.map((it, idx) => (
                        <tr key={idx} className="hover:bg-muted/20">
                          <td className="p-1">
                            <Input
                              className={cellInputClass}
                              value={it.codigo}
                              onChange={(e) => form.updateItem(idx, { codigo: e.target.value })}
                              placeholder="Código"
                            />
                          </td>
                          <td className="p-1">
                            <Input
                              className={cellInputClass}
                              value={it.descripcion}
                              onChange={(e) => form.updateItem(idx, { descripcion: e.target.value })}
                              placeholder="Descripción"
                            />
                          </td>
                          <td className="p-1 text-right">
                            <Input
                              type="number"
                              className={cn(cellInputClass, "text-right w-20 ml-auto")}
                              value={it.cantidad}
                              onChange={(e) => form.updateItem(idx, { cantidad: e.target.value })}
                            />
                          </td>
                          {isRemito ? (
                            <>
                              <td className="p-1">
                                <Input
                                  className={cellInputClass}
                                  value={it.lote || ""}
                                  onChange={(e) => form.updateItem(idx, { lote: e.target.value })}
                                  placeholder="Lote"
                                />
                              </td>
                              <td className="p-1">
                                <Input
                                  type="date"
                                  className={cellInputClass}
                                  value={it.vencimiento || ""}
                                  onChange={(e) => form.updateItem(idx, { vencimiento: e.target.value })}
                                />
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="p-1 text-right">
                                <Input
                                  type="number"
                                  className={cn(cellInputClass, "text-right w-24 ml-auto")}
                                  value={it.precio_unitario || ""}
                                  onChange={(e) => form.updateItem(idx, { precio_unitario: e.target.value })}
                                />
                              </td>
                              <td className="p-1 text-right font-medium">
                                ${(parseFloat(it.cantidad || "0") * parseFloat(it.precio_unitario || "0")).toFixed(2)}
                              </td>
                            </>
                          )}
                          <td className="p-1 text-center">
                            <button
                              type="button"
                              onClick={() => form.removeItem(idx)}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right Column: Actions & Summary */}
            <div className="space-y-4 lg:col-span-4">
              <div className="rounded-[4px] border border-[var(--ossum-line)] bg-white p-4 shadow-xs space-y-3">
                <h3 className="text-xs font-semibold uppercase text-muted-foreground">
                  Confirmación de Comprobante
                </h3>
                <p className="text-xs text-muted-foreground">
                  Al confirmar, los datos se guardarán en el backend con su correspondiente trazabilidad.
                </p>

                <Button
                  type="button"
                  className={cn("w-full gap-2", ACTION)}
                  onClick={async () => {
                    if (onRemitoConfirmed) {
                      await onRemitoConfirmed({
                        number: form.numero,
                        proveedorId: form.proveedorId,
                        proveedorName: form.proveedores.find((p) => p.id === form.proveedorId)?.name || "",
                        date: form.fecha,
                        state: "Recibido",
                        items: form.items.map((it) => ({
                          code: it.codigo,
                          name: it.descripcion,
                          quantity: parseFloat(it.cantidad) || 1,
                          lot: it.lote,
                          expiry: it.vencimiento,
                        })),
                      })
                      router.push(backHref)
                    } else {
                      await form.handleConfirm()
                    }
                  }}
                  disabled={form.isProcessing || !form.proveedorId || !form.numero}
                >
                  {form.isProcessing ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="size-4" />
                  )}
                  {form.isProcessing ? "Guardando..." : "Confirmar e Ingresar"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>

      <CreateProveedorModal
        open={form.createProvOpen}
        onOpenChange={form.setCreateProvOpen}
        prefill={form.createProvPrefill}
        onCreated={(p) => form.setProveedorId(p.id)}
      />
    </div>
  )
}
