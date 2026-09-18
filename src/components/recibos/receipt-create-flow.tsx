"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Eye, Link2, ShieldCheck } from "lucide-react"

import { useAuth } from "@/components/auth/AuthProvider"
import { ReceiptVoucherCard } from "@/components/recibos/receipt-voucher-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { ApiClientError } from "@/lib/api/client"
import type { DigitalReceiptSignerRole } from "@/lib/digital-receipts"
import {
  createInternalDigitalReceiptDraft,
  getInternalDigitalReceiptCreateDefaults,
  issueInternalDigitalReceipt,
} from "@/lib/digital-receipts/client"
import { storeDigitalReceiptPublicPreviewToken } from "@/lib/digital-receipts/public-preview-session"
import {
  buildReceiptCreatePreview,
  buildDraftSigners,
  buildReceiptFlowQuery,
  getReceiptFlowContextItems,
  getReceiptFlowSourceLabel,
  mapDigitalReceiptToViewModel,
  RECEIPT_ROLE_LABELS,
  resolveIssueSignerId,
  type ReceiptCreateDefaults,
  type ReceiptFlowContext,
} from "@/lib/digital-receipts/ui"
import { digitalReceiptsMock } from "@/lib/recibos-digitales.mock"

type ReceiptCreateFlowProps = {
  context?: ReceiptFlowContext
}

export function ReceiptCreateFlow({ context }: ReceiptCreateFlowProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { activeCompany, currentUser, currentUserLoading, isLoading } = useAuth()
  const [submitting, setSubmitting] = useState<"draft" | "issue" | null>(null)
  const [draftDefaults, setDraftDefaults] = useState<ReceiptCreateDefaults | null>(null)
  const [draftDefaultsError, setDraftDefaultsError] = useState<string | null>(null)
  const [draftDefaultsLoading, setDraftDefaultsLoading] = useState(false)

  const demoFallbackReceipt = digitalReceiptsMock[0]
  const queryString = useMemo(() => buildReceiptFlowQuery(context), [context])
  const contextItems = useMemo(() => getReceiptFlowContextItems(context), [context])
  const sourceLabel = useMemo(() => getReceiptFlowSourceLabel(context), [context])
  const hasSurgeryContext = Boolean(context?.surgeryId)
  const hasInvoiceContext = Boolean(context?.invoice)

  const contextualFallbackDefaults = useMemo<ReceiptCreateDefaults | null>(() => {
    if (!context?.surgeryId) return null

    return {
      source: "backend_context",
      surgeryId: context.surgeryId,
      companyName: activeCompany?.name ?? "Compañía activa",
      issuerArea: "Backoffice OSSUM COR",
      expedienteLabel: `Cirugía ${context.surgeryId}`,
      patient: {
        name: "Paciente pendiente de carga",
        document: "DNI pendiente",
        relationLabel: "Paciente",
      },
      defaultSignerRole: "patient",
      concept: `Recibo digital interno asociado a la cirugía ${context.surgeryId}`,
      notes:
        "Contexto quirúrgico detectado. Completá el importe real antes de crear el borrador; la constancia no reemplaza comprobantes fiscales.",
      shareChannel: "Internal",
      expiresInHours: 72,
    }
  }, [activeCompany?.name, context?.surgeryId])

  const effectiveDefaults = draftDefaults ?? contextualFallbackDefaults

  const [signerRole, setSignerRole] = useState<DigitalReceiptSignerRole>("patient")
  const [dni, setDni] = useState("")
  const [expiresInHours, setExpiresInHours] = useState(72)
  const [shareChannel, setShareChannel] = useState("Internal")
  const [notes, setNotes] = useState("")
  const [concept, setConcept] = useState("")
  const [amountInput, setAmountInput] = useState("")

  useEffect(() => {
    if (hasSurgeryContext) return

    setDraftDefaults(null)
    setDraftDefaultsError(null)
    setDraftDefaultsLoading(false)
    setSignerRole(demoFallbackReceipt.signerRole)
    setDni(demoFallbackReceipt.signer.document)
    setExpiresInHours(demoFallbackReceipt.expiresInHours)
    setShareChannel(demoFallbackReceipt.shareChannel)
    setNotes(demoFallbackReceipt.notes)
    setConcept(demoFallbackReceipt.concept)
    setAmountInput(String(demoFallbackReceipt.amount))
  }, [demoFallbackReceipt.amount, demoFallbackReceipt.concept, demoFallbackReceipt.expiresInHours, demoFallbackReceipt.notes, demoFallbackReceipt.shareChannel, demoFallbackReceipt.signer.document, demoFallbackReceipt.signerRole, hasSurgeryContext])

  useEffect(() => {
    if (!activeCompany?.id || !context?.surgeryId || isLoading || currentUserLoading) return

    let active = true
    setDraftDefaultsLoading(true)
    setDraftDefaultsError(null)

    getInternalDigitalReceiptCreateDefaults(activeCompany.id, context.surgeryId)
      .then((defaults) => {
        if (!active) return
        setDraftDefaults(defaults)
        setSignerRole(defaults.defaultSignerRole)
        setDni(defaults.patient.document)
        setExpiresInHours(defaults.expiresInHours)
        setShareChannel(defaults.shareChannel)
        setNotes(defaults.notes)
        setConcept(defaults.concept)
        setAmountInput("")
      })
      .catch((error) => {
        if (!active) return
        setDraftDefaults(null)
        setDraftDefaultsError(
          error instanceof ApiClientError
            ? error.message
            : "No se pudieron cargar los datos reales del expediente para prearmar el borrador."
        )
        if (contextualFallbackDefaults) {
          setSignerRole(contextualFallbackDefaults.defaultSignerRole)
          setDni(contextualFallbackDefaults.patient.document)
          setExpiresInHours(contextualFallbackDefaults.expiresInHours)
          setShareChannel(contextualFallbackDefaults.shareChannel)
          setNotes(contextualFallbackDefaults.notes)
          setConcept(contextualFallbackDefaults.concept)
          setAmountInput("")
        }
      })
      .finally(() => {
        if (!active) return
        setDraftDefaultsLoading(false)
      })

    return () => {
      active = false
    }
  }, [activeCompany?.id, context?.surgeryId, contextualFallbackDefaults, currentUserLoading, isLoading])

  useEffect(() => {
    if (signerRole === "authorized_payer" && effectiveDefaults && !effectiveDefaults.payer) {
      setSignerRole("patient")
      setDni(effectiveDefaults.patient.document)
    }
  }, [effectiveDefaults, signerRole])

  const parsedAmount = Number(amountInput.replace(",", "."))
  const hasValidAmount = Number.isFinite(parsedAmount) && parsedAmount > 0
  const normalizedAmount = hasValidAmount ? parsedAmount : 0
  const normalizedConcept = concept.trim()
  const canUseAuthorizedPayer = Boolean(effectiveDefaults?.payer ?? demoFallbackReceipt.payer)

  const previewReceipt = useMemo(() => {
    if (effectiveDefaults) {
      return buildReceiptCreatePreview({
        defaults: effectiveDefaults,
        issuerName: currentUser?.displayName,
        signerRole,
        signerDocument: dni,
        concept: normalizedConcept || effectiveDefaults.concept,
        amount: normalizedAmount,
        expiresInHours,
        notes,
        shareChannel,
      })
    }

    const signer = signerRole === "patient" ? demoFallbackReceipt.patient : demoFallbackReceipt.payer ?? demoFallbackReceipt.signer

    return {
      ...demoFallbackReceipt,
      signerRole,
      concept: normalizedConcept || demoFallbackReceipt.concept,
      amount: normalizedAmount || demoFallbackReceipt.amount,
      signer: {
        ...signer,
        relationLabel: signerRole === "patient" ? "Paciente firmante" : "Pagador autorizado firmante",
        document: dni,
      },
      expiresInHours,
      notes,
      shareChannel,
      demoPublicAvailable: false,
    }
  }, [currentUser?.displayName, demoFallbackReceipt, dni, effectiveDefaults, expiresInHours, normalizedAmount, normalizedConcept, notes, shareChannel, signerRole])

  async function handleSubmit(mode: "draft" | "issue") {
    if (!activeCompany?.id) {
      toast({ variant: "destructive", title: "Sin compañía activa", description: "No se puede crear el recibo interno." })
      return
    }

    if (!hasSurgeryContext) {
      toast({
        variant: "destructive",
        title: "Falta cirugía real",
        description: "Para crear el recibo real entrá desde Expediente o Cobros con una cirugía persistida.",
      })
      return
    }

    if (!normalizedConcept) {
      toast({ variant: "destructive", title: "Concepto incompleto", description: "Completá un concepto operativo antes de crear el recibo." })
      return
    }

    if (!hasValidAmount) {
      toast({ variant: "destructive", title: "Importe incompleto", description: "Ingresá un importe real mayor a 0 para crear el recibo." })
      return
    }

    const patient = effectiveDefaults?.patient ?? demoFallbackReceipt.patient
    const payer = effectiveDefaults?.payer ?? demoFallbackReceipt.payer
    const fallbackSigner = effectiveDefaults ? effectiveDefaults.payer : demoFallbackReceipt.signer

    const signers = buildDraftSigners({
      surgeryId: context?.surgeryId ?? demoFallbackReceipt.surgeryId,
      patient: { ...patient, document: signerRole === "patient" ? dni : patient.document },
      payer: payer ? { ...payer, document: signerRole === "authorized_payer" ? dni : payer.document } : undefined,
      fallbackSigner,
    })

    setSubmitting(mode)

    try {
      const draft = await createInternalDigitalReceiptDraft(activeCompany.id, {
        surgeryId: context?.surgeryId ?? demoFallbackReceipt.surgeryId,
        concept: normalizedConcept,
        amount: parsedAmount,
        currentSignerRole: signerRole,
        signers,
      })

      if (mode === "draft") {
        toast({ title: "Borrador creado", description: "Se generó el recibo interno en estado draft." })
        router.push(`/ventas/recibos/${draft.receipt.receiptId}${queryString}`)
        return
      }

      const issued = await issueInternalDigitalReceipt(activeCompany.id, draft.receipt.receiptId, {
        signerRole,
        signerId: resolveIssueSignerId(signers, signerRole),
        expiresAt: new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString(),
        channel: shareChannel.toLowerCase().includes("whatsapp")
          ? "whatsapp"
          : shareChannel.toLowerCase().includes("email")
            ? "email"
            : shareChannel.toLowerCase().includes("sms")
              ? "sms"
              : "internal",
      })

      storeDigitalReceiptPublicPreviewToken({
        receiptId: issued.detail.receipt.receiptId,
        accessId: issued.access.accessId,
        token: issued.accessToken,
        tokenLastFour: issued.access.tokenLastFour,
      })

      const mapped = mapDigitalReceiptToViewModel(issued.detail)
      toast({
        title: "Recibo creado y emitido",
        description: `Acceso interno activo: ****${issued.access.tokenLastFour ?? "----"}. Preview pública real habilitada en este navegador.`,
      })
      router.push(`/ventas/recibos/${mapped.id}${queryString}`)
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No se pudo crear el recibo",
        description: error instanceof ApiClientError ? error.message : "Falló la integración interna del recibo.",
      })
    } finally {
      setSubmitting(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">
            <ShieldCheck className="size-3.5" />
            Sprint 1 backend interno
          </div>
          {contextItems.length > 0 && <p className="mt-2 text-xs font-medium text-slate-500">{sourceLabel} · {contextItems.join(" · ")}</p>}
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Crear recibo digital</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            {hasSurgeryContext
              ? "La preview usa contexto real de compañía/cirugía cuando está disponible y solo cae a un borrador genérico si ese contexto no pudo cargarse completo. El acceso público pasa a ser real recién después de emitirlo y conservar su token en este navegador."
              : "Sin cirugía persistida este flujo sigue funcionando como demo visual sobre un mock de referencia."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href={`/ventas/recibos${queryString}`}>
              <ArrowLeft className="size-4" />
              Volver al listado
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/ventas/recibos/${demoFallbackReceipt.id}${queryString}`}>
              <Eye className="size-4" />
              Ver mock de referencia
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <CardContent className="space-y-6 p-5 sm:p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Numeración del nuevo draft">
                <Input value={effectiveDefaults ? "Se asigna al crear borrador" : demoFallbackReceipt.receiptNumber} readOnly />
              </Field>
              <Field label="Canal interno estimado">
                <Input value={shareChannel} onChange={(event) => setShareChannel(event.target.value)} />
              </Field>
            </div>

            <Field label="Concepto operativo">
              <Textarea value={concept} onChange={(event) => setConcept(event.target.value)} className="min-h-24" />
              {hasSurgeryContext && (
                <p className="text-xs leading-5 text-slate-500">
                  Opción 1: el concepto sigue siendo manual y genérico sobre la cirugía activa. Si entrás desde una factura, tomala solo como referencia visual y no como prefill canónico.
                </p>
              )}
            </Field>

            <Field label="Importe a registrar">
              <Input type="number" min="0" step="0.01" value={amountInput} onChange={(event) => setAmountInput(event.target.value)} placeholder="Ingresar importe real" />
              {hasInvoiceContext && (
                <p className="text-xs leading-5 text-slate-500">
                  El importe se carga siempre de forma manual en este flujo, aunque la factura quede visible como contexto de referencia.
                </p>
              )}
            </Field>

            {hasInvoiceContext && (
              <div className="rounded-2xl border border-violet-200 bg-violet-50/80 p-4 text-sm text-violet-950">
                <p className="font-medium">Contexto de factura visible solo como referencia</p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <Field label="Factura asociada en la entrada">
                    <Input value={context?.invoice ?? "-"} readOnly />
                  </Field>
                  <Field label="Uso en esta opción">
                    <Input value="Informativo; sin autocompletar importe ni concepto" readOnly />
                  </Field>
                </div>
                <p className="mt-3 text-xs leading-5 text-violet-900">
                  La UI muestra la factura para dar contexto operativo, pero este create flow no asume que ese dato venga validado como fuente canónica de prefill backend.
                </p>
              </div>
            )}

            <div className="space-y-3">
              <Label>Firmante predefinido</Label>
              <RadioGroup value={signerRole} onValueChange={(value) => setSignerRole(value as DigitalReceiptSignerRole)} className="grid gap-3 md:grid-cols-2">
                {(["patient", "authorized_payer"] as DigitalReceiptSignerRole[]).map((role) => {
                  const disabled = role === "authorized_payer" && !canUseAuthorizedPayer

                  return (
                  <label key={role} className={`flex items-start gap-3 rounded-2xl border border-slate-200 p-4 ${disabled ? "cursor-not-allowed bg-slate-100/90 opacity-70" : "cursor-pointer bg-slate-50/80"}`}>
                    <RadioGroupItem value={role} className="mt-0.5" disabled={disabled} />
                    <div>
                      <p className="text-sm font-medium text-slate-950">{RECEIPT_ROLE_LABELS[role]}</p>
                      <p className="text-xs leading-5 text-slate-500">
                        {role === "patient"
                          ? "El paciente queda como firmante del acceso emitido."
                          : canUseAuthorizedPayer
                            ? "El acceso se emite para el pagador autorizado cargado en la cirugía."
                            : "No hay pagador autorizado real disponible en el contexto actual."}
                      </p>
                    </div>
                  </label>
                  )
                })}
              </RadioGroup>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="DNI del firmante de referencia">
                <Input value={dni} onChange={(event) => setDni(event.target.value)} />
              </Field>
              <Field label="Vigencia del acceso interno">
                <div className="grid grid-cols-3 gap-2">
                  {[24, 48, 72].map((hours) => (
                    <Button key={hours} type="button" variant={expiresInHours === hours ? "default" : "outline"} onClick={() => setExpiresInHours(hours)}>
                      {hours} h
                    </Button>
                  ))}
                </div>
              </Field>
            </div>

            <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 p-3">
                <p className="text-sm font-medium text-slate-950">Descarga PDF en este flujo</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Este create flow no configura descarga previa a la firma. Hoy el comportamiento real mantiene la constancia PDF del recibo firmado; cualquier descarga previa sigue fuera de alcance en esta UI.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Checkbox checked id="single-signature" disabled />
                <div>
                  <Label htmlFor="single-signature">Una sola firma por link</Label>
                  <p className="text-xs text-slate-500">La restricción funcional sigue visible, aunque la firma pública productiva no forma parte de esta tarea.</p>
                </div>
              </div>
            </div>

            <Field label="Nota legal / aclaración visual">
              <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="min-h-28" />
            </Field>

            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-dashed border-emerald-300 bg-emerald-50/70 p-4 text-sm text-emerald-900">
              <Badge variant="success">Integración mínima lista</Badge>
              <span>Draft e issue ya pegan al backend interno. Con cirugía real, firmantes/labels/notas salen del contexto persistido; al emitir, la preview pública se vuelve real en este navegador mientras conserve el token del acceso activo.</span>
            </div>

            {hasSurgeryContext && (
              <div className="rounded-2xl border border-sky-200 bg-sky-50/80 p-4 text-sm text-sky-950">
                <p className="font-medium">Borrador contextual {draftDefaults ? "cargado desde backend" : "en modo genérico"}.</p>
                <p className="mt-1 text-xs leading-5 text-sky-900">
                  {draftDefaults
                    ? "La cirugía, la compañía y los firmantes visibles en la preview ya no salen del mock de recibos."
                    : draftDefaultsLoading
                      ? "Estamos cargando datos reales del expediente para completar la preview."
                      : "Si el backend contextual no responde, la UI conserva un fallback genérico ligado a la cirugía activa, sin inventar un recibo histórico mock."}
                </p>
              </div>
            )}

            {draftDefaultsError && (
              <div className="rounded-2xl border border-amber-300 bg-amber-50/80 p-4 text-sm text-amber-950">
                <p className="font-medium">No se pudo completar el contexto real del borrador.</p>
                <p className="mt-1 text-xs leading-5 text-amber-800">{draftDefaultsError}</p>
              </div>
            )}

            {!hasSurgeryContext && (
              <div className="rounded-2xl border border-amber-300 bg-amber-50/80 p-4 text-sm text-amber-950">
                <p className="font-medium">Este acceso sin contexto sigue siendo solo de referencia visual.</p>
                <p className="mt-1 text-xs leading-5 text-amber-800">
                  La creación real requiere una cirugía persistida. Abrí este flujo desde Expediente o Cobros para enviar un `surgeryId` válido.
                </p>
              </div>
            )}

            {(context?.from || context?.surgeryId || context?.invoice) && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-700">
                <p className="font-medium text-slate-950">Contexto de entrada</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{contextItems.join(" · ")}</p>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void handleSubmit("draft")} disabled={submitting !== null || !hasSurgeryContext || !hasValidAmount || normalizedConcept.length === 0}>
                <Link2 className="size-4" />
                {submitting === "draft" ? "Creando borrador..." : "Crear borrador interno"}
              </Button>
              <Button variant="outline" onClick={() => void handleSubmit("issue")} disabled={submitting !== null || !hasSurgeryContext || !hasValidAmount || normalizedConcept.length === 0}>
                <ShieldCheck className="size-4" />
                {submitting === "issue" ? "Creando + emitiendo..." : "Crear y emitir acceso"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <ReceiptVoucherCard receipt={previewReceipt} />
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  )
}
