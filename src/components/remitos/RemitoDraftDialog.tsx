"use client"

import React, { useEffect, useId, useMemo, useRef, useState } from "react"
import { CircleAlert, FlaskConical, Loader2, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  REMITO_ORIGINS,
  REMITO_SALIDA_REASONS,
  type CreateRemitoPayload,
  type RemitoApiRow,
  type RemitoOrigin,
  type RemitoDevPreset,
  type RemitoSalidaReason,
  type UpdateRemitoDraftPayload,
} from "@/lib/api/remitos"

type DraftItemForm = {
  /** Immutable source links and item JSON travel with a draft replacement payload. */
  itemId?: string
  sku: string
  description: string
  quantity: string
  unit: string
  boxId?: string
  presupuestoItemId?: string
  lotNumber: string
  serialNumber: string
  expirationDate: string
  metadata?: Record<string, unknown>
}

type DraftFormState = {
  origin: RemitoOrigin
  salidaReason: RemitoSalidaReason
  branchId: string
  issuedBranchId: string
  surgeryId: string
  boxId: string
  presupuestoId: string
  destinatarioContactId: string
  destinatarioNombre: string
  domicilio: string
  localidad: string
  provincia: string
  transporte: string
  packageCount: string
  declaredValue: string
  observaciones: string
  destinatarioSnapshot: Record<string, unknown> | null
  shippingAddressSnapshot: Record<string, unknown> | null
  transportSnapshot: Record<string, unknown> | null
  metadata: Record<string, unknown> | null
  items: DraftItemForm[]
}

/** Explicit values supplied by a caller; the form never infers branch or recipient policy. */
export type RemitoDraftInitialContext = Omit<Partial<DraftFormState>, "items"> & {
  items?: Array<Partial<DraftItemForm>>
}

/** Controlled request contract for /remitos and future Ficha CX callers. */
export type RemitoDraftDialogRequest =
  | { mode: "create"; initialContext?: RemitoDraftInitialContext }
  | { mode: "edit"; remito: RemitoApiRow }

export type RemitoDraftSubmitPayload = CreateRemitoPayload | UpdateRemitoDraftPayload

export type RemitoDraftDialogProps = {
  open: boolean
  request: RemitoDraftDialogRequest | null
  onOpenChange: (open: boolean) => void
  onSubmit: (payload: RemitoDraftSubmitPayload) => Promise<void>
  onSuccess?: (request: RemitoDraftDialogRequest) => void
  loading: boolean
  devPreset?: RemitoDevPreset | null
}

const EMPTY_ITEM: DraftItemForm = {
  sku: "",
  description: "",
  quantity: "1",
  unit: "unidad",
  lotNumber: "",
  serialNumber: "",
  expirationDate: "",
}

const EMPTY_STATE: DraftFormState = {
  origin: "manual",
  salidaReason: "cirugia",
  branchId: "",
  issuedBranchId: "",
  surgeryId: "",
  boxId: "",
  presupuestoId: "",
  destinatarioContactId: "",
  destinatarioNombre: "",
  domicilio: "",
  localidad: "",
  provincia: "",
  transporte: "",
  packageCount: "",
  declaredValue: "",
  observaciones: "",
  destinatarioSnapshot: null,
  shippingAddressSnapshot: null,
  transportSnapshot: null,
  metadata: null,
  items: [{ ...EMPTY_ITEM }],
}

type FormErrors = Record<string, string>

function getInitialState(request: RemitoDraftDialogRequest | null): DraftFormState {
  if (!request || request.mode === "create") {
    const context = request?.initialContext
    return {
      ...EMPTY_STATE,
      ...context,
      items: context?.items?.length ? context.items.map((item) => ({ ...EMPTY_ITEM, ...item })) : [{ ...EMPTY_ITEM }],
    }
  }

  const { remito } = request
  return {
    origin: REMITO_ORIGINS.includes(remito.origin as RemitoOrigin) ? remito.origin as RemitoOrigin : "manual",
    salidaReason: REMITO_SALIDA_REASONS.includes(remito.salidaReason as RemitoSalidaReason) ? remito.salidaReason as RemitoSalidaReason : "cirugia",
    branchId: remito.branchId ?? "",
    issuedBranchId: remito.issuedBranchId ?? remito.branchId ?? "",
    surgeryId: remito.surgeryId ?? "",
    boxId: remito.boxId ?? "",
    presupuestoId: remito.presupuestoId ?? "",
    destinatarioContactId: remito.destinatarioContactId ?? "",
    destinatarioNombre: remito.destinatarioSnapshot?.nombre ?? "",
    domicilio: remito.shippingAddressSnapshot?.domicilio ?? remito.destinatarioSnapshot?.domicilio ?? "",
    localidad: remito.shippingAddressSnapshot?.localidad ?? remito.destinatarioSnapshot?.localidad ?? "",
    provincia: remito.shippingAddressSnapshot?.provincia ?? remito.destinatarioSnapshot?.provincia ?? "",
    transporte: typeof remito.transportSnapshot?.nombre === "string" ? remito.transportSnapshot.nombre : "",
    packageCount: remito.packageCount == null ? "" : String(remito.packageCount),
    declaredValue: remito.declaredValue == null ? "" : String(remito.declaredValue),
    observaciones: typeof remito.metadata?.observaciones === "string" ? remito.metadata.observaciones : "",
    destinatarioSnapshot: remito.destinatarioSnapshot,
    shippingAddressSnapshot: remito.shippingAddressSnapshot,
    transportSnapshot: remito.transportSnapshot,
    metadata: remito.metadata,
    items: remito.items.length ? remito.items.map((item) => ({
      itemId: item.itemId ?? undefined,
      sku: item.sku ?? "",
      description: item.description,
      quantity: String(item.quantity ?? "1"),
      unit: item.unit ?? "unidad",
      boxId: item.boxId ?? undefined,
      presupuestoItemId: item.presupuestoItemId ?? undefined,
      lotNumber: item.lotNumber ?? "",
      serialNumber: item.serialNumber ?? "",
      expirationDate: item.expirationDate?.slice(0, 10) ?? "",
      metadata: item.metadata ?? undefined,
    })) : [{ ...EMPTY_ITEM }],
  }
}

function cleanOptional(value: string) {
  return value.trim() || undefined
}

function cleanNullable(value: string) {
  return cleanOptional(value) ?? null
}

function mergeSnapshot(snapshot: Record<string, unknown> | null, editableValues: Record<string, string | undefined>) {
  const merged = { ...(snapshot ?? {}) }
  for (const [key, value] of Object.entries(editableValues)) {
    if (value === undefined) delete merged[key]
    else merged[key] = value
  }
  return Object.keys(merged).length ? merged : null
}

function buildPayload(state: DraftFormState): CreateRemitoPayload {
  const domicilio = cleanOptional(state.domicilio)
  const localidad = cleanOptional(state.localidad)
  const provincia = cleanOptional(state.provincia)
  const destinatarioNombre = cleanOptional(state.destinatarioNombre)
  const transporte = cleanOptional(state.transporte)
  const observaciones = cleanOptional(state.observaciones)

  return {
    branchId: cleanOptional(state.branchId) ?? "",
    issuedBranchId: cleanOptional(state.issuedBranchId) ?? cleanOptional(state.branchId),
    surgeryId: cleanOptional(state.surgeryId),
    origin: state.origin,
    salidaReason: state.salidaReason,
    boxId: cleanNullable(state.boxId),
    presupuestoId: cleanNullable(state.presupuestoId),
    destinatarioContactId: cleanNullable(state.destinatarioContactId),
    destinatarioSnapshot: mergeSnapshot(state.destinatarioSnapshot, { nombre: destinatarioNombre, domicilio, localidad, provincia }),
    shippingAddressSnapshot: mergeSnapshot(state.shippingAddressSnapshot, { domicilio, localidad, provincia }),
    transportSnapshot: mergeSnapshot(state.transportSnapshot, { nombre: transporte }),
    packageCount: cleanOptional(state.packageCount) ? Number(state.packageCount) : null,
    declaredValue: cleanOptional(state.declaredValue) ? state.declaredValue : null,
    metadata: mergeSnapshot(state.metadata, { observaciones }),
    items: state.items.map((item) => ({
      ...(cleanOptional(item.itemId ?? "") ? { itemId: cleanOptional(item.itemId ?? "") } : {}),
      sku: cleanOptional(item.sku),
      description: item.description.trim(),
      quantity: item.quantity,
      unit: cleanOptional(item.unit),
      ...(cleanOptional(item.boxId ?? "") ? { boxId: cleanOptional(item.boxId ?? "") } : {}),
      ...(cleanOptional(item.presupuestoItemId ?? "") ? { presupuestoItemId: cleanOptional(item.presupuestoItemId ?? "") } : {}),
      lotNumber: cleanOptional(item.lotNumber),
      serialNumber: cleanOptional(item.serialNumber),
      expirationDate: cleanOptional(item.expirationDate),
      ...(item.metadata ? { metadata: item.metadata } : {}),
    })),
  }
}

function validate(state: DraftFormState): FormErrors {
  const errors: FormErrors = {}
  if (!state.branchId.trim()) errors.branchId = "Indicá la sucursal de salida."
  if (!state.origin) errors.origin = "Seleccioná el origen del remito."
  if (!state.salidaReason) errors.salidaReason = "Seleccioná el motivo de salida."
  if (state.packageCount.trim() && (!Number.isFinite(Number(state.packageCount)) || Number(state.packageCount) < 0)) errors.packageCount = "Ingresá una cantidad de bultos válida."
  if (state.declaredValue.trim() && (!Number.isFinite(Number(state.declaredValue)) || Number(state.declaredValue) < 0)) errors.declaredValue = "Ingresá un valor declarado válido."
  if (!state.items.length) errors.items = "Agregá al menos un renglón."
  state.items.forEach((item, index) => {
    if (!item.description.trim()) errors[`item-${index}-description`] = "La descripción es obligatoria."
    if (!Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0) errors[`item-${index}-quantity`] = "La cantidad debe ser mayor que cero."
  })
  return errors
}

const fieldClass = "h-10 rounded-md border-border bg-background text-sm shadow-none transition-[border-color,box-shadow] duration-200 ease-out focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 sm:h-8 sm:text-xs"
const selectClass = "h-10 w-full rounded-md border border-border bg-background px-3 text-sm shadow-none transition-[border-color,box-shadow] duration-200 ease-out focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground sm:h-8 sm:px-2 sm:text-xs"

export function RemitoDraftDialog({ open, request, onOpenChange, onSubmit, onSuccess, loading, devPreset = null }: RemitoDraftDialogProps) {
  const [state, setState] = useState<DraftFormState>(() => getInitialState(request))
  const [errors, setErrors] = useState<FormErrors>({})
  const [status, setStatus] = useState<"draft" | "submitting" | "success" | "error">("draft")
  const [submitError, setSubmitError] = useState("")
  const fieldRefs = useRef<Record<string, HTMLInputElement | HTMLSelectElement | null>>({})
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const branchPresetAppliedRef = useRef(false)
  const [isDirty, setIsDirty] = useState(false)
  const [isBranchSelectionManual, setIsBranchSelectionManual] = useState(false)
  const isEditing = request?.mode === "edit"
  const requestKey = request?.mode === "edit" ? `edit:${request.remito.id}` : "create"
  const isBusy = loading || status === "submitting"
  const itemCount = state.items.length
  const quantityTotal = useMemo(() => state.items.reduce((total, item) => total + (Number.isFinite(Number(item.quantity)) ? Number(item.quantity) : 0), 0), [state.items])
  const hasResolvedDevBranch = !isEditing && !isBranchSelectionManual && devPreset?.available && state.branchId === devPreset.branch.id

  useEffect(() => {
    if (!open) return
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setState(getInitialState(request))
    setErrors({})
    setSubmitError("")
    setStatus("draft")
    setIsDirty(false)
    setIsBranchSelectionManual(false)
    branchPresetAppliedRef.current = false
  }, [open, requestKey])

  useEffect(() => {
    if (!open || isEditing || isDirty || !devPreset?.available || branchPresetAppliedRef.current) return
    branchPresetAppliedRef.current = true
    setState((current) => {
      if (current.branchId) return current
      return {
        ...current,
        branchId: devPreset.branch.id,
        issuedBranchId: current.issuedBranchId || devPreset.branch.id,
      }
    })
  }, [devPreset, isDirty, isEditing, open])

  const setFieldRef = (name: string) => (element: HTMLInputElement | HTMLSelectElement | null) => {
    fieldRefs.current[name] = element
  }

  const updateField = (field: Exclude<keyof DraftFormState, "items">, value: string) => {
    setStatus("draft")
    setIsDirty(true)
    setState((current) => ({ ...current, [field]: value }))
    setErrors((current) => {
      const { [field]: _removed, ...rest } = current
      return rest
    })
  }

  const updateItem = (index: number, field: keyof DraftItemForm, value: string) => {
    const errorKey = `item-${index}-${field}`
    setStatus("draft")
    setIsDirty(true)
    setState((current) => ({ ...current, items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item) }))
    setErrors((current) => {
      const { [errorKey]: _removed, ...rest } = current
      return rest
    })
  }

  const addItem = () => {
    setStatus("draft")
    setIsDirty(true)
    setState((current) => ({ ...current, items: [...current.items, { ...EMPTY_ITEM }] }))
  }

  const removeItem = (index: number) => {
    setStatus("draft")
    setIsDirty(true)
    setState((current) => ({ ...current, items: current.items.filter((_, itemIndex) => itemIndex !== index) }))
    setErrors({})
    requestAnimationFrame(() => fieldRefs.current[`item-${Math.max(0, index - 1)}-description`]?.focus())
  }

  const close = () => {
    if (!isBusy) onOpenChange(false)
  }

  const submit = async () => {
    const nextErrors = validate(state)
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      setStatus("error")
      const firstError = Object.keys(nextErrors)[0]
      requestAnimationFrame(() => fieldRefs.current[firstError]?.focus())
      return
    }

    setErrors({})
    setSubmitError("")
    setStatus("submitting")
    const createPayload = buildPayload(state)
    const payload: RemitoDraftSubmitPayload = isEditing
      ? (() => {
          const { origin: _origin, ...draftPayload } = createPayload
          return draftPayload
        })()
      : createPayload

    try {
      await onSubmit(payload)
      setStatus("success")
      if (request) onSuccess?.(request)
      window.setTimeout(() => onOpenChange(false), 180)
    } catch (error) {
      setStatus("error")
      setSubmitError(error instanceof Error ? error.message : "No se pudo guardar el borrador. Intentá nuevamente.")
    }
  }

  const errorFor = (name: string) => errors[name]
  const title = isEditing ? "Editar borrador de remito" : "Nuevo borrador de remito"
  const applyDevExample = () => {
    if (!devPreset?.available || isEditing) return
    if (isDirty && !window.confirm("Este ejemplo reemplazará los cambios sin guardar. ¿Querés continuar?")) return

    const example = devPreset.example
    setState({
      ...EMPTY_STATE,
      branchId: devPreset.branch.id,
      issuedBranchId: devPreset.branch.id,
      surgeryId: example.surgeryId,
      origin: example.origin,
      salidaReason: example.salidaReason,
      destinatarioNombre: example.recipientSnapshot.nombre ?? "",
      destinatarioSnapshot: example.recipientSnapshot,
      shippingAddressSnapshot: example.shippingAddressSnapshot,
      transportSnapshot: example.transportSnapshot,
      packageCount: example.packageCount == null ? "" : String(example.packageCount),
      declaredValue: example.declaredValue == null ? "" : String(example.declaredValue),
      metadata: example.metadata,
      items: example.items.map((item) => ({ ...EMPTY_ITEM, ...item, quantity: String(item.quantity) })),
    })
    setErrors({})
    setSubmitError("")
    setStatus("draft")
    setIsDirty(true)
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) close() }}>
      <DialogContent
        className="flex h-[calc(100dvh-1rem)] max-h-[52rem] w-[calc(100vw-1rem)] max-w-5xl flex-col gap-0 overflow-hidden rounded-lg border bg-background p-0 shadow-lg sm:h-[calc(100dvh-2rem)] sm:w-[calc(100vw-2rem)]"
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          returnFocusRef.current?.focus()
        }}
      >
        <form noValidate onSubmit={(event) => { event.preventDefault(); void submit() }} className="flex min-h-0 flex-1 flex-col">
        <DialogHeader data-testid="remito-dialog-header" className="shrink-0 border-b bg-card px-4 py-3 sm:px-5">
            <div className="flex min-w-0 flex-col gap-3 pr-8 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <DialogTitle className="truncate text-base font-semibold text-foreground">{title}</DialogTitle>
              <DialogDescription className="sr-only">Formulario operativo para crear o editar un borrador de remito.</DialogDescription>
              <p className="mt-0.5 text-xs text-muted-foreground">{isEditing ? "Borrador existente · el origen se conserva." : "Carga rápida · completá el contexto y los renglones."}</p>
            </div>
            <div className="shrink-0 text-left text-xs text-muted-foreground sm:text-right">
              <b className="block font-medium text-foreground">{itemCount} {itemCount === 1 ? "renglón" : "renglones"}</b>
              <span>Total: {new Intl.NumberFormat("es-AR", { maximumFractionDigits: 4 }).format(quantityTotal)}</span>
            </div>
          </div>
          {!isEditing && devPreset?.available && <div className="mt-3 flex flex-col gap-2 border-t pt-3 sm:flex-row sm:flex-wrap sm:items-center">
            <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground"><FlaskConical className="size-3" /> DEV · solo entorno no productivo</span>
            <Button type="button" variant="outline" size="sm" onClick={applyDevExample} disabled={isBusy} className="h-10 self-start px-3 text-sm transition-[background-color,border-color,color] duration-200 ease-out sm:h-8 sm:self-auto sm:px-2 sm:text-xs">
              Cargar ejemplo DEV
            </Button>
            <span className="min-w-0 text-xs text-muted-foreground sm:truncate">Carga {devPreset.branch.label}; no guarda datos.</span>
          </div>}
        </DialogHeader>

        <div data-testid="remito-dialog-body" className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
           <section aria-labelledby="remito-contexto" className="rounded-md border border-border bg-card">
             <div className="border-b bg-muted/30 px-3 py-2 sm:px-4">
              <h2 id="remito-contexto" className="text-sm font-medium text-foreground">Contexto de salida</h2>
            </div>
            <div className="grid gap-x-3 gap-y-3 p-3 sm:grid-cols-2 lg:grid-cols-4 sm:p-4">
              <Field label="Sucursal de salida" required error={errorFor("branchId")}>
                {hasResolvedDevBranch ? (
                  <div className="flex min-h-10 items-center justify-between gap-3 rounded-md border border-border bg-muted/30 px-3 text-sm sm:min-h-8 sm:px-2 sm:text-xs" aria-label="Sucursal de salida seleccionada">
                    <span className="min-w-0 truncate font-medium text-foreground">{devPreset.branch.label}</span>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setIsBranchSelectionManual(true)} disabled={isBusy} className="h-8 shrink-0 px-2 text-xs">Cambiar</Button>
                  </div>
                ) : (
                  <Input ref={setFieldRef("branchId")} value={state.branchId} onChange={(event) => updateField("branchId", event.target.value)} disabled={isBusy} placeholder="ID de sucursal" className={`${fieldClass} font-mono`} aria-invalid={Boolean(errorFor("branchId"))} />
                )}
              </Field>
               <Field label="Cómo se armó" required error={errorFor("origin")}>
                <select ref={setFieldRef("origin")} value={state.origin} onChange={(event) => updateField("origin", event.target.value)} disabled={isBusy || isEditing} className={selectClass} aria-invalid={Boolean(errorFor("origin"))}>
                   {REMITO_ORIGINS.map((origin) => <option key={origin} value={origin}>{{ box: "Desde caja", presupuesto: "Desde presupuesto", manual: "Carga manual", mixto: "Origen mixto" }[origin]}</option>)}
                </select>
              </Field>
               <Field label="Para qué sale" required error={errorFor("salidaReason")}>
                <select ref={setFieldRef("salidaReason")} value={state.salidaReason} onChange={(event) => updateField("salidaReason", event.target.value)} disabled={isBusy} className={selectClass} aria-invalid={Boolean(errorFor("salidaReason"))}>
                   {REMITO_SALIDA_REASONS.map((reason) => <option key={reason} value={reason}>{{ cirugia: "Cirugía", venta: "Venta", prestamo: "Préstamo", traslado: "Traslado", ajuste: "Ajuste", otro: "Otro" }[reason]}</option>)}
                </select>
              </Field>
              <Field label="Cirugía / expediente">
                <Input value={state.surgeryId} onChange={(event) => updateField("surgeryId", event.target.value)} disabled={isBusy} placeholder="ID opcional" className={`${fieldClass} font-mono`} />
              </Field>
              <Field label="Destinatario">
                <Input value={state.destinatarioNombre} onChange={(event) => updateField("destinatarioNombre", event.target.value)} disabled={isBusy} placeholder="Nombre opcional" className={fieldClass} />
              </Field>
              <Field label="Contacto">
                <Input value={state.destinatarioContactId} onChange={(event) => updateField("destinatarioContactId", event.target.value)} disabled={isBusy} placeholder="ID opcional" className={`${fieldClass} font-mono`} />
              </Field>
              <Field label="Caja / depósito">
                <Input value={state.boxId} onChange={(event) => updateField("boxId", event.target.value)} disabled={isBusy} placeholder="ID opcional" className={`${fieldClass} font-mono`} />
              </Field>
              <Field label="Presupuesto">
                <Input value={state.presupuestoId} onChange={(event) => updateField("presupuestoId", event.target.value)} disabled={isBusy} placeholder="ID opcional" className={`${fieldClass} font-mono`} />
              </Field>
            </div>
          </section>

           <section aria-labelledby="remito-items" className="mt-3 rounded-md border border-border bg-card">
             <div className="flex flex-col gap-2 border-b bg-muted/20 px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:px-4">
              <div>
                <h2 id="remito-items" className="text-sm font-medium text-foreground">Material remitido</h2>
                <p className="text-xs text-muted-foreground">Descripción y cantidad positiva son obligatorias. Lote, serie y vencimiento preservan trazabilidad.</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addItem} disabled={isBusy} className="h-10 self-start px-3 text-sm transition-[background-color,border-color] duration-200 ease-out sm:h-8 sm:self-auto sm:px-2 sm:text-xs">
                <Plus className="size-3.5" /> Agregar renglón
              </Button>
            </div>
            {errorFor("items") && <p role="alert" className="border-b border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{errorFor("items")}</p>}
             <div data-testid="remito-items-scroll" role="region" aria-label="Renglones del remito" tabIndex={0} className="overflow-x-auto overscroll-x-contain bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
              <table className="w-full min-w-[980px] border-collapse text-[12px]">
                 <thead><tr className="bg-muted/60 text-[10px] uppercase tracking-[0.04em] text-muted-foreground"><th className="border-b border-r px-2 py-2 text-left font-medium">SKU</th><th className="border-b border-r px-2 py-2 text-left font-medium">Descripción</th><th className="w-28 border-b border-r px-2 py-2 text-right font-medium">Cantidad</th><th className="w-28 border-b border-r px-2 py-2 text-left font-medium">Unidad</th><th className="w-28 border-b border-r bg-amber-50/50 px-2 py-2 text-left font-medium dark:bg-amber-950/10">Lote</th><th className="w-32 border-b border-r bg-amber-50/50 px-2 py-2 text-left font-medium dark:bg-amber-950/10">Serie / GTIN</th><th className="w-32 border-b border-r bg-amber-50/50 px-2 py-2 text-left font-medium dark:bg-amber-950/10">Vencimiento</th><th className="w-12 border-b" /></tr></thead>
                <tbody>{state.items.map((item, index) => <tr key={index} className="bg-background hover:bg-muted/40">
                  <td className="border-b border-r p-1"><Input value={item.sku} onChange={(event) => updateItem(index, "sku", event.target.value)} disabled={isBusy} placeholder="Opcional" className={fieldClass} aria-label={`SKU del renglón ${index + 1}`} /></td>
                  <td className="border-b border-r p-1"><Input ref={setFieldRef(`item-${index}-description`)} value={item.description} onChange={(event) => updateItem(index, "description", event.target.value)} disabled={isBusy} placeholder="Descripción *" className={fieldClass} aria-label={`Descripción del renglón ${index + 1}`} aria-invalid={Boolean(errorFor(`item-${index}-description`))} />{errorFor(`item-${index}-description`) && <p role="alert" className="px-1 pt-1 text-[10px] text-destructive">{errorFor(`item-${index}-description`)}</p>}</td>
                  <td className="border-b border-r p-1"><Input ref={setFieldRef(`item-${index}-quantity`)} type="number" min={0.0001} step="0.0001" value={item.quantity} onChange={(event) => updateItem(index, "quantity", event.target.value)} disabled={isBusy} className={`${fieldClass} text-right tabular-nums`} aria-label={`Cantidad del renglón ${index + 1}`} aria-invalid={Boolean(errorFor(`item-${index}-quantity`))} />{errorFor(`item-${index}-quantity`) && <p role="alert" className="px-1 pt-1 text-[10px] text-destructive">{errorFor(`item-${index}-quantity`)}</p>}</td>
                  <td className="border-b border-r p-1"><Input value={item.unit} onChange={(event) => updateItem(index, "unit", event.target.value)} disabled={isBusy} className={fieldClass} aria-label={`Unidad del renglón ${index + 1}`} /></td>
                  <td className="border-b border-r p-1"><Input value={item.lotNumber} onChange={(event) => updateItem(index, "lotNumber", event.target.value)} disabled={isBusy} placeholder="Opcional" className={fieldClass} aria-label={`Lote del renglón ${index + 1}`} /></td>
                  <td className="border-b border-r p-1"><Input value={item.serialNumber} onChange={(event) => updateItem(index, "serialNumber", event.target.value)} disabled={isBusy} placeholder="Opcional" className={fieldClass} aria-label={`Serie o GTIN del renglón ${index + 1}`} /></td>
                  <td className="border-b border-r p-1"><Input type="date" value={item.expirationDate} onChange={(event) => updateItem(index, "expirationDate", event.target.value)} disabled={isBusy} className={fieldClass} aria-label={`Vencimiento del renglón ${index + 1}`} /></td>
                  <td className="border-b p-1 text-center"><Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)} disabled={isBusy || itemCount === 1} aria-label={`Quitar renglón ${index + 1}`} className="h-10 w-10 text-destructive transition-[background-color,color] duration-200 ease-out sm:h-8 sm:w-8"><Trash2 className="size-3.5" /></Button></td>
                </tr>)}</tbody>
              </table>
            </div>
          </section>

          <details className="mt-3 rounded-md border bg-card">
            <summary className="cursor-pointer px-3 py-3 text-sm font-medium text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring">Detalle operativo opcional</summary>
            <div className="grid gap-x-3 gap-y-3 border-t p-3 sm:grid-cols-2 lg:grid-cols-4 sm:p-4">
              <Field label="Sucursal emisora">
                {hasResolvedDevBranch && state.issuedBranchId === devPreset.branch.id ? (
                  <div className="flex min-h-10 items-center rounded-md border border-border bg-muted/30 px-3 text-sm sm:min-h-8 sm:px-2 sm:text-xs" aria-label="Sucursal emisora seleccionada">
                    <span className="min-w-0 truncate font-medium text-foreground">{devPreset.branch.label}</span>
                  </div>
                ) : (
                  <Input value={state.issuedBranchId} onChange={(event) => updateField("issuedBranchId", event.target.value)} disabled={isBusy} placeholder="Usa sucursal de salida" className={`${fieldClass} font-mono`} />
                )}
              </Field>
              <Field label="Bultos" error={errorFor("packageCount")}><Input type="number" min={0} value={state.packageCount} onChange={(event) => updateField("packageCount", event.target.value)} disabled={isBusy} className={fieldClass} aria-invalid={Boolean(errorFor("packageCount"))} /></Field>
              <Field label="Valor declarado" error={errorFor("declaredValue")}><Input type="number" min={0} step="0.01" value={state.declaredValue} onChange={(event) => updateField("declaredValue", event.target.value)} disabled={isBusy} className={fieldClass} aria-invalid={Boolean(errorFor("declaredValue"))} /></Field>
              <Field label="Transporte"><Input value={state.transporte} onChange={(event) => updateField("transporte", event.target.value)} disabled={isBusy} placeholder="Opcional" className={fieldClass} /></Field>
              <Field label="Domicilio" className="lg:col-span-2"><Input value={state.domicilio} onChange={(event) => updateField("domicilio", event.target.value)} disabled={isBusy} className={fieldClass} /></Field>
              <Field label="Localidad"><Input value={state.localidad} onChange={(event) => updateField("localidad", event.target.value)} disabled={isBusy} className={fieldClass} /></Field>
              <Field label="Provincia"><Input value={state.provincia} onChange={(event) => updateField("provincia", event.target.value)} disabled={isBusy} className={fieldClass} /></Field>
               <Field label="Observaciones" className="sm:col-span-2 lg:col-span-4"><Textarea value={state.observaciones} onChange={(event) => updateField("observaciones", event.target.value)} disabled={isBusy} className="min-h-20 rounded-md border-border text-sm shadow-none transition-[border-color,box-shadow] duration-200 ease-out focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 sm:min-h-16 sm:text-xs" /></Field>
            </div>
          </details>
        </div>

        <footer data-testid="remito-dialog-footer" className="shrink-0 flex flex-col gap-3 border-t bg-card px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <div aria-live="polite" className="flex min-h-5 items-center gap-1.5 text-xs text-muted-foreground">
            {(status === "submitting" || loading) && <><Loader2 className="size-3 animate-spin motion-reduce:animate-none" /> Guardando borrador…</>}
            {status === "draft" && !loading && "Borrador sin guardar"}
            {status === "success" && <span className="font-medium text-foreground">Borrador guardado. Actualizando listado…</span>}
            {status === "error" && <span className="flex items-center gap-1 text-destructive"><CircleAlert className="size-3" /> {submitError || "Revisá los campos marcados."}</span>}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Button type="button" variant="outline" onClick={close} disabled={isBusy} className="h-11 px-3 text-sm sm:h-8 sm:text-xs">Cancelar</Button>
            <Button type="submit" disabled={isBusy} className="h-11 px-3 text-sm transition-[background-color] duration-200 ease-out sm:h-8 sm:text-xs">{isBusy ? "Guardando…" : isEditing ? "Guardar cambios" : "Guardar borrador"}</Button>
          </div>
        </footer>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, required, error, className, children }: { label: string; required?: boolean; error?: string; className?: string; children: React.ReactNode }) {
  const id = useId()
  const errorId = `${id}-error`
  const control = React.isValidElement<{ id?: string; "aria-describedby"?: string }>(children)
    ? React.cloneElement(children, { id: children.props.id ?? id, "aria-describedby": error ? errorId : children.props["aria-describedby"] })
    : children
  return <div className={`space-y-1 ${className ?? ""}`}><Label htmlFor={id} className="text-xs font-medium text-foreground">{label}{required && " *"}</Label>{control}{error && <p id={errorId} role="alert" className="text-xs text-destructive">{error}</p>}</div>
}
