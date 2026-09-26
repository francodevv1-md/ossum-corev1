/**
 * useComprasOcrForm — Hook que encapsula todo el estado y handlers del formulario
 * de carga OCR para remitos de proveedor y facturas de compra.
 *
 * Reutilizable tanto en modal (ComprasOcrWizardDialog) como en página full-screen.
 */

import * as React from "react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth/AuthProvider"
import { apiFetch, ApiClientError } from "@/lib/api/client"
import { useOrtoTrackStore } from "@/lib/store"
import { matchOcrItemToStock, type ItemMatchResult } from "@/lib/compras-matching"
import {
  mapAiToRemitoProveedor,
  mapAiToFacturaCompra,
  parseArgNumber,
  type RemitoProveedorAIResponse,
  type FacturaCompraAIResponse,
  type RemitoProveedorExtracted,
  type FacturaCompraExtracted,
} from "@/lib/validators/compras-document-ai"
import type { FacturaCompra, Proveedor, RemitoProveedor, StockItem } from "@/types"

export type ComprasOcrTipo = "remito-proveedor" | "factura-compra"
export type ProveedorOption = Pick<Proveedor, "id" | "name">

export type Phase = "upload" | "results"

export type ItemRow = {
  codigo: string
  descripcion: string
  cantidad: string
  precio_unitario?: string
  subtotal?: string
  lote?: string
  vencimiento?: string
}

type AnyAIResponse = RemitoProveedorAIResponse | FacturaCompraAIResponse

function isRemitoResponse(r: AnyAIResponse): r is RemitoProveedorAIResponse {
  return "looks_like_remito_proveedor" in r
}

function confidenceLevel(c: number): "low" | "medium" | "high" {
  if (c < 0.4) return "low"
  if (c < 0.8) return "medium"
  return "high"
}

export interface UseComprasOcrFormOptions {
  tipo: ComprasOcrTipo
  supplierOptions?: readonly ProveedorOption[]
  persistToStore?: boolean
  onSuccess?: (payload?: Omit<RemitoProveedor, "id"> | Omit<FacturaCompra, "id">) => void | Promise<void>
  onBackendPersisted?: (payload: Omit<RemitoProveedor, "id"> | Omit<FacturaCompra, "id">) => void | Promise<void>
  onCompleted?: () => void
}

export function useComprasOcrForm({ tipo, supplierOptions, persistToStore = true, onSuccess, onBackendPersisted, onCompleted }: UseComprasOcrFormOptions) {
  const { activeCompany } = useAuth()
  const store = useOrtoTrackStore()
  const proveedores = supplierOptions ?? store.proveedores.filter((p) => p.active)
  const stockItems = store.stock

  const [phase, setPhase] = React.useState<Phase>("upload")
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [result, setResult] = React.useState<AnyAIResponse | null>(null)

  const [proveedorName, setProveedorName] = React.useState("")
  const [cuit, setCuit] = React.useState("")
  const [numero, setNumero] = React.useState("")
  const [fecha, setFecha] = React.useState("")
  const [fechaError, setFechaError] = React.useState<string | null>(null)
  const [ordenCompraRef, setOrdenCompraRef] = React.useState("")
  const [tipoFactura, setTipoFactura] = React.useState("")
  const [total, setTotal] = React.useState("")
  const [observaciones, setObservaciones] = React.useState("")
  const [items, setItems] = React.useState<ItemRow[]>([])

  const [proveedorId, setProveedorId] = React.useState<string>("")

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

  const [createProvOpen, setCreateProvOpen] = React.useState(false)
  const [createProvPrefill, setCreateProvPrefill] = React.useState<{ name?: string; cuit?: string } | undefined>(undefined)

  const resetState = React.useCallback(() => {
    setPhase("upload")
    setIsProcessing(false)
    setError(null)
    setResult(null)
    setProveedorName("")
    setCuit("")
    setNumero("")
    setFecha("")
    setFechaError(null)
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

  const updateFecha = React.useCallback((value: string) => {
    setFecha(value)
    if (value) setFechaError(null)
  }, [])

  const updateItem = React.useCallback((index: number, patch: Partial<ItemRow>) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)))
  }, [])

  const removeItem = React.useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
    // Reindex linkedStockIds and itemMatches to match new array positions
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
        unitPrice: item.precio_unitario
          ? Number(item.precio_unitario.replace(/[^\d.,]/g, ""))
          : undefined,
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

  const handleProveedorCreated = React.useCallback((prov: Proveedor) => {
    setProveedorId(prov.id)
    setProveedorName(prov.name)
  }, [])

  const handleConfirm = React.useCallback(async () => {
    // Allow saving in both IA mode (result exists) and manual mode (no result)
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
    if (!fecha.trim()) {
      const message = "Indicá la fecha del documento antes de guardar."
      setFechaError(message)
      toast.error(message)
      return
    }
    if (!persistToStore && !onBackendPersisted) {
      setError("Se requiere una confirmación de persistencia backend.")
      return
    }
    if (items.length === 0) {
      toast.error("Agregá al menos un item antes de guardar.")
      return
    }
    const invalidQty = items.some((it) => !it.cantidad || parseArgNumber(it.cantidad) <= 0)
    if (invalidQty) {
      toast.error("Todos los items deben tener cantidad mayor a cero.")
      return
    }
    const missingDesc = items.some((it) => !it.descripcion.trim())
    if (missingDesc) {
      toast.error("Todos los items deben tener descripción.")
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

      payload.items = payload.items.map((it, idx) => ({
        ...it,
        stockItemId: linkedStockIds[idx] || undefined,
      }))

      setIsProcessing(true)
      try {
        if (persistToStore) {
          store.createRemitoProveedor(payload)
          try {
            await onSuccess?.(payload)
          } catch {
            toast.warning("El remito se guardó, pero la acción posterior falló.")
          }
        } else {
          await onBackendPersisted?.(payload)
        }
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "No se pudo guardar el remito.")
        return
      } finally {
        setIsProcessing(false)
      }
      toast.success(
        `Remito de proveedor guardado.${warnings.length > 0 ? " Revisá las advertencias." : ""}`
      )
      if (warnings.length > 0) {
        warnings.forEach((w) => toast.warning(w))
      }
      resetState()
      onCompleted?.()
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

      payload.items = payload.items.map((it, idx) => ({
        ...it,
        stockItemId: linkedStockIds[idx] || undefined,
      }))

      setIsProcessing(true)
      try {
        if (persistToStore) {
          store.createFacturaCompra(payload)
          try {
            await onSuccess?.(payload)
          } catch {
            toast.warning("La factura se guardó, pero la acción posterior falló.")
          }
        } else {
          await onBackendPersisted?.(payload)
        }
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "No se pudo guardar la factura.")
        return
      } finally {
        setIsProcessing(false)
      }
      toast.success(
        `Factura de compra guardada.${warnings.length > 0 ? " Revisá las advertencias." : ""}`
      )
      if (warnings.length > 0) {
        warnings.forEach((w) => toast.warning(w))
      }
      resetState()
      onCompleted?.()
    }
  }, [
    proveedores,
    proveedorId,
    proveedorName,
    numero,
    tipo,
    cuit,
    fecha,
    setFechaError,
    ordenCompraRef,
    items,
    observaciones,
    tipoFactura,
    total,
    store,
    linkedStockIds,
    resetState,
    onSuccess,
    onBackendPersisted,
    onCompleted,
    persistToStore,
  ])

  const looksLike = result
    ? tipo === "remito-proveedor"
      ? (result as RemitoProveedorAIResponse).looks_like_remito_proveedor
      : (result as FacturaCompraAIResponse).looks_like_factura_compra
    : false
  const confidence = result?.confidence ?? 0
  const confLevel = confidenceLevel(confidence)

  return {
    // State
    phase,
    isProcessing,
    error,
    result,
    proveedorName,
    cuit,
    numero,
    fecha,
    fechaError,
    ordenCompraRef,
    tipoFactura,
    total,
    observaciones,
    items,
    proveedorId,
    proveedores,
    stockItems,
    itemMatches,
    linkedStockIds,
    createArticleOpen,
    createArticlePrefill,
    createArticleForIdx,
    createProvOpen,
    createProvPrefill,
    looksLike,
    confidence,
    confLevel,
    activeCompany,

    // Setters
    setProveedorName,
    setCuit,
    setNumero,
    setFecha: updateFecha,
    setOrdenCompraRef,
    setTipoFactura,
    setTotal,
    setObservaciones,
    setItems,
    setProveedorId,
    setCreateArticleOpen,
    setCreateProvOpen,
    setPhase,

    // Handlers
    handleFileSelected,
    handleReset,
    updateItem,
    removeItem,
    linkItemToStock,
    unlinkItem,
    openCreateArticle,
    handleArticleCreated,
    openCreateProveedor,
    handleProveedorCreated,
    handleConfirm,
    resetState,
  }
}
