"use client"

import * as React from "react"
import { AlertCircle, CheckCircle2, Link2, Loader2, PackagePlus, Sparkles, UserPlus } from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { useAuth } from "@/components/auth/AuthProvider"
import { apiFetch, ApiClientError } from "@/lib/api/client"
import { useOrtoTrackStore } from "@/lib/store"
import { matchOcrItemToStock, type ItemMatchResult } from "@/lib/compras-matching"
import {
  mapAiToRemitoProveedor,
  mapAiToFacturaCompra,
  type RemitoProveedorAIResponse,
  type FacturaCompraAIResponse,
  type RemitoProveedorExtracted,
  type FacturaCompraExtracted,
} from "@/lib/validators/compras-document-ai"
import type { Proveedor, StockItem } from "@/types"

export type ComprasOcrTipo = "remito-proveedor" | "factura-compra"

type AnyAIResponse = RemitoProveedorAIResponse | FacturaCompraAIResponse

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  tipo: ComprasOcrTipo
}

type Phase = "upload" | "results"

type ItemRow = {
  codigo: string
  descripcion: string
  cantidad: string
  precio_unitario?: string
  subtotal?: string
  lote?: string
  vencimiento?: string
}

function isRemitoResponse(r: AnyAIResponse): r is RemitoProveedorAIResponse {
  return "looks_like_remito_proveedor" in r
}

function confidenceLevel(c: number): "low" | "medium" | "high" {
  if (c < 0.4) return "low"
  if (c < 0.8) return "medium"
  return "high"
}

export function ComprasOcrWizardDialog({ open, onOpenChange, tipo }: Props) {
  const { activeCompany } = useAuth()
  const store = useOrtoTrackStore()
  const proveedores = store.proveedores.filter((p) => p.active)

  const [phase, setPhase] = React.useState<Phase>("upload")
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [result, setResult] = React.useState<AnyAIResponse | null>(null)

  // Editable fields extracted from IA
  const [proveedorName, setProveedorName] = React.useState("")
  const [cuit, setCuit] = React.useState("")
  const [numero, setNumero] = React.useState("")
  const [fecha, setFecha] = React.useState("")
  const [ordenCompraRef, setOrdenCompraRef] = React.useState("")
  const [tipoFactura, setTipoFactura] = React.useState("")
  const [total, setTotal] = React.useState("")
  const [observaciones, setObservaciones] = React.useState("")
  const [items, setItems] = React.useState<ItemRow[]>([])

  // Provider resolution
  const [proveedorId, setProveedorId] = React.useState<string>("")

  // Item matching against stock catalog
  const [itemMatches, setItemMatches] = React.useState<Record<number, ItemMatchResult>>({})
  const [linkedStockIds, setLinkedStockIds] = React.useState<Record<number, string>>({})
  const [createArticleOpen, setCreateArticleOpen] = React.useState(false)
  const [createArticlePrefill, setCreateArticlePrefill] = React.useState<{
    code?: string
    name?: string
    supplier?: string
    lot?: string
    expiry?: string
    unitPrice?: number
  } | undefined>(undefined)
  const [createArticleForIdx, setCreateArticleForIdx] = React.useState<number | null>(null)

  // Create proveedor modal
  const [createProvOpen, setCreateProvOpen] = React.useState(false)
  const [createProvPrefill, setCreateProvPrefill] = React.useState<{ name?: string; cuit?: string } | undefined>(undefined)

  const stockItems = store.stock

  const titleText = tipo === "remito-proveedor" ? "Cargar remito de proveedor" : "Cargar factura de compra"
  const descText =
    tipo === "remito-proveedor"
      ? "Subí el remito del proveedor (PDF o imagen). Azure lee el texto y la IA propone los campos."
      : "Subí la factura de compra (PDF o imagen). Azure lee el texto y la IA propone los campos."

  const resetState = React.useCallback(() => {
    setPhase("upload")
    setIsProcessing(false)
    setError(null)
    setResult(null)
    setProveedorName("")
    setCuit("")
    setNumero("")
    setFecha("")
    setOrdenCompraRef("")
    setTipoFactura("")
    setTotal("")
    setObservaciones("")
    setItems([])
    setProveedorId("")
    setItemMatches({})
    setLinkedStockIds({})
    setCreateArticleOpen(false)
    setCreateArticlePrefill(undefined)
    setCreateArticleForIdx(null)
    setCreateProvOpen(false)
    setCreateProvPrefill(undefined)
  }, [])

  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      if (!next) resetState()
      onOpenChange(next)
    },
    [onOpenChange, resetState]
  )

  const handleFileSelected = React.useCallback(
    async (file: File) => {
      if (!activeCompany?.id) {
        setError("No se detectó una empresa activa. Verificá la sesión.")
        return
      }

      setIsProcessing(true)
      setError(null)

      try {
        const formData = new FormData()
        formData.append("file", file)
        formData.append("tipo", tipo)

        const data = await apiFetch<AnyAIResponse>(
          `/api/companies/${encodeURIComponent(activeCompany.id)}/compras/ocr-extract`,
          { method: "POST", body: formData }
        )

        setResult(data)

        // Populate editable fields from IA extraction
        const detectedName = isRemitoResponse(data)
          ? data.extracted.proveedor_name
          : (data as FacturaCompraAIResponse).extracted.proveedor_name
        setProveedorName(detectedName)

        if (isRemitoResponse(data)) {
          const ext: RemitoProveedorExtracted = data.extracted
          setCuit(ext.cuit_proveedor)
          setNumero(ext.numero_remito)
          setFecha(ext.fecha_remito)
          setOrdenCompraRef(ext.orden_compra_ref)
          setObservaciones(ext.observaciones)
          setItems(
            ext.items.map((it) => ({
              codigo: it.codigo,
              descripcion: it.descripcion,
              cantidad: it.cantidad,
              lote: it.lote,
              vencimiento: it.vencimiento,
            }))
          )
        } else {
          const ext: FacturaCompraExtracted = (data as FacturaCompraAIResponse).extracted
          setCuit(ext.cuit_proveedor)
          setTipoFactura(ext.tipo_factura)
          setNumero(ext.numero_factura)
          setFecha(ext.fecha_factura)
          setOrdenCompraRef(ext.orden_compra_ref)
          setTotal(ext.total)
          setObservaciones(ext.observaciones)
          setItems(
            ext.items.map((it) => ({
              codigo: it.codigo,
              descripcion: it.descripcion,
              cantidad: it.cantidad,
              precio_unitario: it.precio_unitario,
              subtotal: it.subtotal,
            }))
          )
        }

        // Auto-match proveedor by detected name
        let resolvedProveedorName = detectedName
        if (detectedName) {
          const matchedProv = proveedores.find(
            (p) => p.name.toLowerCase() === detectedName.toLowerCase()
          )
          if (matchedProv) {
            setProveedorId(matchedProv.id)
            resolvedProveedorName = matchedProv.name
          }
        }

        // Match items against stock catalog
        const ocrItems = isRemitoResponse(data)
          ? data.extracted.items.map((it) => ({ code: it.codigo, descripcion: it.descripcion }))
          : (data as FacturaCompraAIResponse).extracted.items.map((it) => ({
              code: it.codigo,
              descripcion: it.descripcion,
            }))

        const matches: Record<number, ItemMatchResult> = {}
        const links: Record<number, string> = {}
        ocrItems.forEach((ocrItem, idx) => {
          const m = matchOcrItemToStock(ocrItem, stockItems, resolvedProveedorName)
          matches[idx] = m
          if (m.match) links[idx] = m.match.id
        })
        setItemMatches(matches)
        setLinkedStockIds(links)

        setPhase("results")
      } catch (caught) {
        if (caught instanceof ApiClientError) {
          setError(caught.message)
        } else if (caught instanceof Error) {
          setError(caught.message)
        } else {
          setError("No se pudo procesar el documento.")
        }
      } finally {
        setIsProcessing(false)
      }
    },
    [activeCompany, tipo, proveedores, stockItems]
  )

  const handleReset = React.useCallback(() => {
    setPhase("upload")
    setResult(null)
    setError(null)
    setItemMatches({})
    setLinkedStockIds({})
  }, [])

  const updateItem = React.useCallback((index: number, patch: Partial<ItemRow>) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)))
  }, [])

  const removeItem = React.useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
    setLinkedStockIds((prev) => {
      const next: Record<number, string> = {}
      Object.entries(prev).forEach(([key, val]) => {
        const idx = Number(key)
        if (idx < index) next[idx] = val
        else if (idx > index) next[idx - 1] = val
      })
      return next
    })
    setItemMatches((prev) => {
      const next: Record<number, ItemMatchResult> = {}
      Object.entries(prev).forEach(([key, val]) => {
        const idx = Number(key)
        if (idx < index) next[idx] = val
        else if (idx > index) next[idx - 1] = val
      })
      return next
    })
  }, [])

  const linkItemToStock = React.useCallback((index: number, stockId: string) => {
    setLinkedStockIds((prev) => ({ ...prev, [index]: stockId }))
  }, [])

  const unlinkItem = React.useCallback((index: number) => {
    setLinkedStockIds((prev) => {
      const next = { ...prev }
      delete next[index]
      return next
    })
  }, [])

  const openCreateArticle = React.useCallback(
    (index: number) => {
      const item = items[index]
      if (!item) return
      const prov = proveedores.find((p) => p.id === proveedorId)
      setCreateArticlePrefill({
        code: item.codigo,
        name: item.descripcion,
        supplier: prov?.name || proveedorName,
        lot: item.lote,
        expiry: item.vencimiento,
        unitPrice: item.precio_unitario ? Number(item.precio_unitario.replace(/[^\d.,]/g, "")) : undefined,
      })
      setCreateArticleForIdx(index)
      setCreateArticleOpen(true)
    },
    [items, proveedores, proveedorId, proveedorName]
  )

  const handleArticleCreated = React.useCallback(
    (stockItem: StockItem) => {
      if (createArticleForIdx !== null) {
        linkItemToStock(createArticleForIdx, stockItem.id)
        // Update match result for this item
        setItemMatches((prev) => ({
          ...prev,
          [createArticleForIdx]: {
            match: stockItem,
            method: "codigo",
            confidence: 1,
            suggestions: [],
          },
        }))
      }
      setCreateArticleForIdx(null)
    },
    [createArticleForIdx, linkItemToStock]
  )

  const openCreateProveedor = React.useCallback(() => {
    setCreateProvPrefill({ name: proveedorName, cuit })
    setCreateProvOpen(true)
  }, [proveedorName, cuit])

  const handleProveedorCreated = React.useCallback(
    (prov: Proveedor) => {
      setProveedorId(prov.id)
      setProveedorName(prov.name)
    },
    []
  )

  const handleConfirm = React.useCallback(() => {
    if (!result) return

    const proveedor = proveedores.find((p) => p.id === proveedorId)
    const resolvedProveedorName = proveedor?.name || proveedorName.trim()

    if (!resolvedProveedorName) {
      toast.error("Indicá el proveedor antes de guardar.")
      return
    }
    if (!numero.trim()) {
      toast.error("Indicá el número del documento antes de guardar.")
      return
    }

    if (tipo === "remito-proveedor") {
      const extracted: RemitoProveedorExtracted = {
        proveedor_name: resolvedProveedorName,
        cuit_proveedor: cuit,
        numero_remito: numero,
        fecha_remito: fecha,
        orden_compra_ref: ordenCompraRef,
        items: items.map((it) => ({
          codigo: it.codigo,
          descripcion: it.descripcion,
          cantidad: it.cantidad,
          lote: it.lote ?? "",
          vencimiento: it.vencimiento ?? "",
        })),
        observaciones,
      }

      const { payload, warnings } = mapAiToRemitoProveedor(extracted, {
        proveedorId: proveedor?.id,
        ordenCompraId: ordenCompraRef.trim() || undefined,
      })

      // Link matched items to stock catalog
      payload.items = payload.items.map((it, idx) => ({
        ...it,
        stockItemId: linkedStockIds[idx] || undefined,
      }))

      store.createRemitoProveedor(payload)
      toast.success(
        `Remito de proveedor guardado.${warnings.length > 0 ? " Revisá las advertencias." : ""}`
      )
      if (warnings.length > 0) {
        warnings.forEach((w) => toast.warning(w))
      }
      handleOpenChange(false)
    } else {
      const extracted: FacturaCompraExtracted = {
        proveedor_name: resolvedProveedorName,
        cuit_proveedor: cuit,
        tipo_factura: tipoFactura,
        numero_factura: numero,
        fecha_factura: fecha,
        orden_compra_ref: ordenCompraRef,
        items: items.map((it) => ({
          codigo: it.codigo,
          descripcion: it.descripcion,
          cantidad: it.cantidad,
          precio_unitario: it.precio_unitario ?? "",
          subtotal: it.subtotal ?? "",
        })),
        total,
        observaciones,
      }

      const { payload, warnings } = mapAiToFacturaCompra(extracted, {
        proveedorId: proveedor?.id,
        ordenCompraId: ordenCompraRef.trim() || undefined,
      })

      // Link matched items to stock catalog
      payload.items = payload.items.map((it, idx) => ({
        ...it,
        stockItemId: linkedStockIds[idx] || undefined,
      }))

      store.createFacturaCompra(payload)
      toast.success(
        `Factura de compra guardada.${warnings.length > 0 ? " Revisá las advertencias." : ""}`
      )
      if (warnings.length > 0) {
        warnings.forEach((w) => toast.warning(w))
      }
      handleOpenChange(false)
    }
  }, [
    result,
    proveedores,
    proveedorId,
    proveedorName,
    numero,
    tipo,
    cuit,
    fecha,
    ordenCompraRef,
    items,
    observaciones,
    tipoFactura,
    total,
    store,
    handleOpenChange,
    linkedStockIds,
  ])

  const looksLike = result
    ? tipo === "remito-proveedor"
      ? (result as RemitoProveedorAIResponse).looks_like_remito_proveedor
      : (result as FacturaCompraAIResponse).looks_like_factura_compra
    : false
  const confidence = result?.confidence ?? 0
  const confLevel = confidenceLevel(confidence)

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="size-4" />
            <DialogTitle>{titleText}</DialogTitle>
            <Badge variant="outline" className="text-[10px]">OCR + IA</Badge>
          </div>
          <DialogDescription>{descText}</DialogDescription>
        </DialogHeader>

        {!activeCompany?.id ? (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertTitle>Sin empresa activa</AlertTitle>
            <AlertDescription>
              No se detectó una empresa activa. Verificá la sesión para usar esta opción.
            </AlertDescription>
          </Alert>
        ) : phase === "upload" || !result ? (
          <AiUploadZone
            isProcessing={isProcessing}
            error={error}
            onFileSelected={handleFileSelected}
          />
        ) : (
          <div className="space-y-4">
            {/* Status badges */}
            <div className="flex flex-wrap items-center gap-2">
              {!looksLike && (
                <Badge variant="warning" className="text-[10px]">
                  Tipo de documento sin confirmar
                </Badge>
              )}
              <span
                title="Revisá los datos detectados antes de aplicarlos."
                className={
                  confLevel === "high"
                    ? "inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                }
              >
                {confLevel !== "high" && <AlertCircle className="size-3" />}
                Confianza {confLevel === "low" ? "baja" : confLevel === "medium" ? "media" : "alta"} · {Math.round(confidence * 100)}%
              </span>
            </div>

            {/* Warnings */}
            {result.warnings.length > 0 && (
              <Alert>
                <AlertCircle />
                <AlertTitle>Advertencias</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {result.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Editable fields */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="prov-select">Proveedor *</Label>
                <div className="flex items-center gap-2">
                  <Select value={proveedorId} onValueChange={setProveedorId}>
                    <SelectTrigger id="prov-select" className="w-full">
                      <SelectValue placeholder="Elegir proveedor existente…" />
                    </SelectTrigger>
                    <SelectContent>
                      {proveedores.map((p: Proveedor) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-1"
                    onClick={openCreateProveedor}
                  >
                    <UserPlus className="size-3.5" />
                    Crear
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Si el proveedor no existe, crealo con los datos detectados por el OCR.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prov-name">Nombre detectado</Label>
                <Input
                  id="prov-name"
                  value={proveedorName}
                  onChange={(e) => setProveedorName(e.target.value)}
                  placeholder={proveedorId ? "Usando proveedor seleccionado" : "Nombre del proveedor"}
                  disabled={!!proveedorId}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cuit">CUIT</Label>
                <Input
                  id="cuit"
                  value={cuit}
                  onChange={(e) => setCuit(e.target.value)}
                  placeholder="CUIT del proveedor"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="numero">Número *</Label>
                <Input
                  id="numero"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  placeholder={tipo === "remito-proveedor" ? "Nº remito" : "Nº factura"}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="fecha">Fecha</Label>
                <Input
                  id="fecha"
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                />
              </div>

              {tipo === "factura-compra" && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="tipo-factura">Tipo factura</Label>
                    <Select value={tipoFactura} onValueChange={setTipoFactura}>
                      <SelectTrigger id="tipo-factura" className="w-full">
                        <SelectValue placeholder="A / B / C" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A">A</SelectItem>
                        <SelectItem value="B">B</SelectItem>
                        <SelectItem value="C">C</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="total">Total</Label>
                    <Input
                      id="total"
                      value={total}
                      onChange={(e) => setTotal(e.target.value)}
                      placeholder="$0,00"
                    />
                  </div>
                </>
              )}

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="oc-ref">Orden de compra (ref)</Label>
                <Input
                  id="oc-ref"
                  value={ordenCompraRef}
                  onChange={(e) => setOrdenCompraRef(e.target.value)}
                  placeholder="Nº de OC si figura en el documento"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="obs">Observaciones</Label>
                <Input
                  id="obs"
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Observaciones del documento"
                />
              </div>
            </div>

            {/* Items table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">
                  Items detectados ({items.length})
                </h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setItems((prev) => [...prev, { codigo: "", descripcion: "", cantidad: "" }])}
                >
                  + Agregar línea
                </Button>
              </div>

              {items.length === 0 ? (
                <p className="text-xs text-muted-foreground py-3">
                  No se detectaron items. Agregalos manualmente.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-2 py-1.5 text-left font-medium">Código</th>
                        <th className="px-2 py-1.5 text-left font-medium">Descripción</th>
                        <th className="px-2 py-1.5 text-right font-medium w-16">Cant.</th>
                        {tipo === "remito-proveedor" ? (
                          <>
                            <th className="px-2 py-1.5 text-left font-medium w-20">Lote</th>
                            <th className="px-2 py-1.5 text-left font-medium w-24">Vto.</th>
                          </>
                        ) : (
                          <>
                            <th className="px-2 py-1.5 text-right font-medium w-20">P.U.</th>
                            <th className="px-2 py-1.5 text-right font-medium w-20">Subt.</th>
                          </>
                        )}
                        <th className="px-2 py-1.5 text-left font-medium w-44">Catálogo</th>
                        <th className="px-2 py-1.5 w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it, idx) => {
                        const matchInfo = itemMatches[idx]
                        const linkedId = linkedStockIds[idx]
                        const linkedStock = linkedId
                          ? stockItems.find((s) => s.id === linkedId)
                          : null

                        return (
                          <tr key={idx} className="border-t">
                            <td className="px-1 py-1">
                              <Input
                                className="h-7 text-xs"
                                value={it.codigo}
                                onChange={(e) => updateItem(idx, { codigo: e.target.value })}
                              />
                            </td>
                            <td className="px-1 py-1">
                              <Input
                                className="h-7 text-xs"
                                value={it.descripcion}
                                onChange={(e) => updateItem(idx, { descripcion: e.target.value })}
                              />
                            </td>
                            <td className="px-1 py-1">
                              <Input
                                className="h-7 text-xs text-right"
                                value={it.cantidad}
                                onChange={(e) => updateItem(idx, { cantidad: e.target.value })}
                              />
                            </td>
                            {tipo === "remito-proveedor" ? (
                              <>
                                <td className="px-1 py-1">
                                  <Input
                                    className="h-7 text-xs"
                                    value={it.lote ?? ""}
                                    onChange={(e) => updateItem(idx, { lote: e.target.value })}
                                  />
                                </td>
                                <td className="px-1 py-1">
                                  <Input
                                    className="h-7 text-xs"
                                    type="date"
                                    value={it.vencimiento ?? ""}
                                    onChange={(e) => updateItem(idx, { vencimiento: e.target.value })}
                                  />
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="px-1 py-1">
                                  <Input
                                    className="h-7 text-xs text-right"
                                    value={it.precio_unitario ?? ""}
                                    onChange={(e) => updateItem(idx, { precio_unitario: e.target.value })}
                                  />
                                </td>
                                <td className="px-1 py-1">
                                  <Input
                                    className="h-7 text-xs text-right"
                                    value={it.subtotal ?? ""}
                                    onChange={(e) => updateItem(idx, { subtotal: e.target.value })}
                                  />
                                </td>
                              </>
                            )}
                            <td className="px-1 py-1">
                              {linkedStock ? (
                                <div className="flex items-center gap-1">
                                  <span
                                    className="inline-flex items-center gap-1 rounded border border-emerald-300 bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                                    title={linkedStock.code}
                                  >
                                    <Link2 className="size-3" />
                                    {linkedStock.name.length > 22
                                      ? linkedStock.name.slice(0, 22) + "…"
                                      : linkedStock.name}
                                  </span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                                    onClick={() => unlinkItem(idx)}
                                    aria-label="Desvincular"
                                  >
                                    ×
                                  </Button>
                                </div>
                              ) : matchInfo && matchInfo.suggestions.length > 0 ? (
                                <Select
                                  value=""
                                  onValueChange={(val) => {
                                    if (val === "__create__") {
                                      openCreateArticle(idx)
                                    } else {
                                      linkItemToStock(idx, val)
                                    }
                                  }}
                                >
                                  <SelectTrigger className="h-7 text-[10px]">
                                    <SelectValue placeholder="Sugerencias…" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {matchInfo.suggestions.map((s) => (
                                      <SelectItem key={s.id} value={s.id}>
                                        {s.code} · {s.name}
                                      </SelectItem>
                                    ))}
                                    <SelectItem value="__create__">
                                      <span className="flex items-center gap-1 text-emerald-600">
                                        <PackagePlus className="size-3" /> Crear artículo…
                                      </span>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-6 text-[10px] gap-1"
                                  onClick={() => openCreateArticle(idx)}
                                >
                                  <PackagePlus className="size-3" />
                                  Crear artículo
                                </Button>
                              )}
                            </td>
                            <td className="px-1 py-1 text-center">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                onClick={() => removeItem(idx)}
                                aria-label="Quitar línea"
                              >
                                ×
                              </Button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <DialogFooter>
          {phase === "results" && result ? (
            <div className="flex w-full items-center justify-between gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={handleReset}>
                Leer otro archivo
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleConfirm}
                disabled={isProcessing}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {isProcessing ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                Confirmar y guardar
              </Button>
            </div>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <CreateArticleModal
      key={`art-${createArticleForIdx ?? "none"}`}
      open={createArticleOpen}
      onOpenChange={setCreateArticleOpen}
      prefill={createArticlePrefill}
      onCreated={handleArticleCreated}
    />
    <CreateProveedorModal
      key={`prov-${createProvPrefill?.name ?? "none"}`}
      open={createProvOpen}
      onOpenChange={setCreateProvOpen}
      prefill={createProvPrefill}
      onCreated={handleProveedorCreated}
    />
    </>
  )
}
