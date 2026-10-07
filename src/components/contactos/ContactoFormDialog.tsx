"use client"

import React, { useEffect, useId, useMemo, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Briefcase, Building2, Check, CircleAlert, IdCard, Loader2, Mail, MapPin, Phone, User, UserCheck, UserPlus, Users } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth/AuthProvider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createContactApi, updateContactApi, cuitLookupApi, type CuitLookupResult } from "@/lib/api/contacts"
import { validateCuitFormat, normalizeCuit } from "@/lib/utils/cuit-validation"
import { mapApiContactToContacto, mapContactoToApiPayload } from "@/lib/api/contact-adapter"
import { CONTACT_GROUPS, CONTACT_ROLE_LABELS, getGroupsForRole } from "@/lib/contacts.constants"
import { cn } from "@/lib/utils"
import type { CondicionIvaCliente, Contacto, ContactRole, TipoPersona } from "@/types"

const ROLE_OPTIONS: ContactRole[] = ["cliente", "proveedor", "interno"]
const VAT_OPTIONS: CondicionIvaCliente[] = [
  "Responsable Inscripto",
  "Responsable Monotributo",
  "Exento",
  "Consumidor Final",
  "No Responsable",
]

const controlClass =
  "h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-900 transition-all duration-150 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:ring-blue-400/20 shadow-2xs"

const selectClass =
  "h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-900 transition-all duration-150 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:ring-blue-400/20 shadow-2xs"

export function sanitizeContactoSaveError(error: unknown): string {
  const message = (error instanceof Error ? error.message : String(error || "")).trim()
  if (!message) return "No se pudo guardar el contacto. Revisá los datos e intentá nuevamente."
  const normalized = message.toLowerCase()
  if (
    normalized.includes("at least one identifiable field is required") ||
    (normalized.includes("firstname") && normalized.includes("documentnumber"))
  ) {
    return "Para guardar el contacto, completá al menos un dato identificable: nombre, email, teléfono, DNI o CUIT."
  }
  if (normalized.includes("failed to fetch") || normalized.includes("networkerror")) {
    return "No se pudo conectar con el servidor. Intentá nuevamente."
  }
  return message
}

interface ContactoFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contacto?: Contacto | null
  onSaved?: (contacto: Contacto) => void
  defaultRoles?: ContactRole[]
  defaultGroups?: string[]
  initialValues?: { tipoPersona?: TipoPersona; nombre?: string; dni?: string }
}

type FormErrors = Record<string, string>

function Field({
  name,
  label,
  error,
  required,
  className,
  children,
}: {
  name: string
  label: string
  error?: string
  required?: boolean
  className?: string
  children: React.ReactNode
}) {
  const generatedId = useId()
  const id = `contact-${name}-${generatedId.replace(/:/g, "")}`
  const errorId = `${id}-error`
  const control = React.isValidElement<{ id?: string; "aria-describedby"?: string; "aria-invalid"?: boolean }>(children)
    ? React.cloneElement(children, {
        id,
        "aria-describedby": error ? errorId : children.props["aria-describedby"],
        "aria-invalid": Boolean(error),
      })
    : children
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id} className="text-xs font-medium text-slate-700 dark:text-slate-300">
        {label}
        {required ? <span className="text-destructive ml-0.5">*</span> : ""}
      </Label>
      {control}
      {error && (
        <p id={errorId} role="alert" className="text-[11px] font-medium text-destructive animate-in fade-in-50">
          {error}
        </p>
      )}
    </div>
  )
}

function ContactoFormInner({
  contacto,
  onSaved,
  onOpenChange,
  defaultRoles,
  defaultGroups,
  initialValues,
}: Omit<ContactoFormDialogProps, "open">) {
  const { activeCompany } = useAuth()
  const isEditing = Boolean(contacto)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [errors, setErrors] = useState<FormErrors>({})
  const companyIdRef = useRef(activeCompany?.id)
  const mutationRef = useRef(0)
  const nameRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const discountRef = useRef<HTMLInputElement>(null)

  const [tipoPersona, setTipoPersona] = useState<TipoPersona>(
    contacto?.tipoPersona ?? initialValues?.tipoPersona ?? "fisica"
  )
  const [nombre, setNombre] = useState(contacto?.nombre ?? initialValues?.nombre ?? "")
  const [nombreFantasia, setNombreFantasia] = useState(contacto?.nombreFantasia ?? "")
  const [cuit, setCuit] = useState(contacto?.cuit ?? "")
  const [cuitResult, setCuitResult] = useState<CuitLookupResult | null>(null)
  const [cuitLookupError, setCuitLookupError] = useState("")
  const [cuitLookupLoading, setCuitLookupLoading] = useState(false)
  const [cuitSuggestion, setCuitSuggestion] = useState<Record<string, boolean>>({})
  const cuitLookupInFlightRef = useRef(false)

  const handleCuitLookup = async () => {
    if (cuitLookupInFlightRef.current) return
    const clean = normalizeCuit(cuit)
    if (!validateCuitFormat(clean)) return
    if (!activeCompany?.id) return
    cuitLookupInFlightRef.current = true
    setCuitLookupLoading(true)
    setCuitLookupError("")
    setCuitResult(null)
    try {
      const result = await cuitLookupApi(activeCompany.id, clean)
      setCuitResult(result)
      if (result.found) {
        setCuitSuggestion({ legalName: true, vatCondition: true, mainAddress: true })
      }
    } catch (err) {
      setCuitLookupError(err instanceof Error ? err.message : "No se pudo consultar el CUIT.")
    } finally {
      cuitLookupInFlightRef.current = false
      setCuitLookupLoading(false)
    }
  }

  const applyCuitSuggestion = () => {
    if (!cuitResult?.found) return
    if (cuitSuggestion.legalName && cuitResult.legalName) setNombre(cuitResult.legalName)
    if (cuitSuggestion.vatCondition && cuitResult.vatCondition) {
      const map: Record<string, CondicionIvaCliente> = {
        "Responsable Inscripto": "Responsable Inscripto",
        "Monotributo": "Responsable Monotributo",
        "Exento": "Exento",
        "Consumidor Final": "Consumidor Final",
      }
      setCondicionIva(map[cuitResult.vatCondition] ?? "Consumidor Final")
    }
    if (cuitSuggestion.mainAddress && cuitResult.mainAddress) {
      const addr = cuitResult.mainAddress
      if (addr.street) setDomicilio(addr.street)
      if (addr.city) setLocalidad(addr.city)
      if (addr.state) setProvincia(addr.state)
      if (addr.zipCode) setCodigoPostal(addr.zipCode)
    }
    setCuitResult(null)
    setCuitSuggestion({})
    setCuitLookupError("")
  }

  const discardCuitSuggestion = () => {
    setCuitResult(null)
    setCuitSuggestion({})
    setCuitLookupError("")
  }
  const [dni, setDni] = useState(contacto?.dni ?? initialValues?.dni ?? "")
  const [estado, setEstado] = useState<"activo" | "inactivo">(contacto?.estado ?? "activo")
  const [observaciones, setObservaciones] = useState(contacto?.observaciones ?? "")
  const [domicilio, setDomicilio] = useState(contacto?.domicilio ?? "")
  const [provincia, setProvincia] = useState(contacto?.provincia ?? "")
  const [localidad, setLocalidad] = useState(contacto?.localidad ?? "")
  const [codigoPostal, setCodigoPostal] = useState(contacto?.codigoPostal ?? "")
  const [telefono, setTelefono] = useState(contacto?.telefonos?.[0] ?? "")
  const [email, setEmail] = useState(contacto?.email ?? "")
  const [roles, setRoles] = useState<ContactRole[]>(
    contacto?.roles ? [...contacto.roles] : [...(defaultRoles ?? [])]
  )
  const [groups, setGroups] = useState<string[]>(
    contacto?.groups ? [...contacto.groups] : [...(defaultGroups ?? [])]
  )
  const [esPagador, setEsPagador] = useState(contacto?.datosClientePagador?.esPagador ?? true)
  const [condicionIva, setCondicionIva] = useState<CondicionIvaCliente>(
    contacto?.datosClientePagador?.condicionIva ?? "Consumidor Final"
  )
  const [condicionPago, setCondicionPago] = useState(contacto?.datosClientePagador?.condicionPago ?? "")
  const [listaPreciosDefault, setListaPreciosDefault] = useState(
    contacto?.datosClientePagador?.listaPreciosDefault ?? ""
  )
  const [descuentoHabitual, setDescuentoHabitual] = useState(
    contacto?.datosClientePagador?.descuentoHabitual?.toString() ?? ""
  )
  const [matricula, setMatricula] = useState(contacto?.datosMedico?.matricula ?? "")
  const [especialidad, setEspecialidad] = useState(contacto?.datosMedico?.especialidad ?? "")
  const [observacionEntrega, setObservacionEntrega] = useState(
    contacto?.datosInstitucion?.observacionEntrega ?? ""
  )

  useEffect(() => {
    companyIdRef.current = activeCompany?.id
    mutationRef.current += 1
  }, [activeCompany?.id])
  useEffect(() => () => {
    mutationRef.current += 1
  }, [])

  const clearError = (name: string) =>
    setErrors((current) => {
      const next = { ...current }
      delete next[name]
      return next
    })

  const toggleRole = (role: ContactRole) => {
    setRoles((current) => {
      const next = current.includes(role) ? current.filter((item) => item !== role) : [...current, role]
      const validGroups = new Set(next.flatMap(getGroupsForRole).map((group) => group.id))
      const canonicalGroups = new Set(CONTACT_GROUPS.map((group) => group.id))
      setGroups((currentGroups) =>
        currentGroups.filter((group) => !canonicalGroups.has(group) || validGroups.has(group))
      )
      return next
    })
  }

  const validate = () => {
    const next: FormErrors = {}
    if (!nombre.trim()) {
      next.nombre = tipoPersona === "juridica" ? "La denominación es obligatoria." : "El nombre es obligatorio."
    }
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) {
      next.email = "Ingresá un email válido."
    }
    if (
      descuentoHabitual &&
      (!Number.isFinite(Number(descuentoHabitual)) ||
        Number(descuentoHabitual) < 0 ||
        Number(descuentoHabitual) > 100)
    ) {
      next.descuentoHabitual = "Ingresá un porcentaje entre 0 y 100."
    }
    setErrors(next)
    const first = Object.keys(next)[0]
    if (first) {
      requestAnimationFrame(() =>
        ({ nombre: nameRef, email: emailRef, descuentoHabitual: discountRef })[first]?.current?.focus()
      )
    }
    return !first
  }

  const save = async () => {
    if (!activeCompany?.id) {
      setSaveError("Seleccioná una empresa activa antes de guardar.")
      return
    }
    if (!validate()) return
    setSaving(true)
    setSaveError("")
    const formData: Partial<Contacto> = {
      tipoPersona,
      nombre: nombre.trim(),
      nombreFantasia: nombreFantasia.trim() || undefined,
      cuit: cuit.trim() || undefined,
      dni: dni.trim() || undefined,
      estado,
      observaciones: observaciones.trim() || undefined,
      domicilio: domicilio.trim() || undefined,
      provincia: provincia.trim() || undefined,
      localidad: localidad.trim() || undefined,
      codigoPostal: codigoPostal.trim() || undefined,
      telefonos: telefono.trim() ? [telefono.trim()] : undefined,
      email: email.trim() || undefined,
      roles,
      groups,
      datosClientePagador: roles.includes("cliente")
        ? {
            esPagador,
            condicionIva,
            condicionPago: condicionPago.trim() || undefined,
            listaPreciosDefault: listaPreciosDefault.trim() || undefined,
            descuentoHabitual: descuentoHabitual ? Number(descuentoHabitual) : undefined,
          }
        : undefined,
      datosMedico: groups.includes("medicos")
        ? { matricula: matricula.trim() || undefined, especialidad: especialidad.trim() || undefined }
        : undefined,
      datosInstitucion: groups.includes("instituciones")
        ? { observacionEntrega: observacionEntrega.trim() || undefined }
        : undefined,
    }
    const payload = mapContactoToApiPayload(formData)
    if (isEditing) {
      payload.isActive = estado === "activo"
      if (tipoPersona === "juridica") {
        payload.firstName = null
        payload.lastName = null
      } else {
        payload.legalName = null
        if (!nombre.trim().includes(" ")) payload.lastName = null
      }
    }
    const requestId = ++mutationRef.current
    const requestCompanyId = activeCompany.id
    try {
      const response =
        isEditing && contacto
          ? await updateContactApi(requestCompanyId, contacto.id, payload)
          : await createContactApi(requestCompanyId, payload)
      if (requestId !== mutationRef.current || companyIdRef.current !== requestCompanyId) return
      const canonical = mapApiContactToContacto(response)
      toast.success(`Contacto ${canonical.codigoContacto} ${isEditing ? "actualizado" : "creado"}`)
      onSaved?.(canonical)
      onOpenChange(false)
    } catch (error) {
      if (requestId !== mutationRef.current || companyIdRef.current !== requestCompanyId) return
      const message = sanitizeContactoSaveError(error)
      setSaveError(message)
      toast.error(message)
    } finally {
      if (requestId === mutationRef.current) setSaving(false)
    }
  }

  const availableGroups = roles.flatMap(getGroupsForRole)

  return (
    <form noValidate onSubmit={(event) => { event.preventDefault(); void save() }} className="flex min-h-0 flex-1 flex-col">
      <DialogHeader className="shrink-0 border-b border-slate-200/90 bg-white/95 px-4 py-3.5 sm:px-5 dark:border-slate-800 dark:bg-slate-950/95 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-900">
            {isEditing ? <UserCheck className="size-4.5" /> : <UserPlus className="size-4.5" />}
          </div>
          <div>
            <DialogTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {isEditing ? "Editar contacto" : "Nuevo contacto"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isEditing ? (
                <span className="inline-flex items-center gap-1.5">
                  <span className="font-mono font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200/80 text-[11px] dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800">
                    {contacto?.codigoContacto}
                  </span>
                  <span>· el código no se puede modificar.</span>
                </span>
              ) : (
                "El código será asignado por el servidor al guardar."
              )}
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div className="min-h-0 flex-1 space-y-3.5 overflow-y-auto bg-slate-50/70 p-3.5 sm:p-4.5 dark:bg-slate-950/60">
        {/* IDENTIFICACIÓN */}
        <section
          className="rounded-lg border border-slate-200/90 bg-white shadow-2xs overflow-hidden dark:border-slate-800 dark:bg-slate-900"
          aria-labelledby="contact-identification"
        >
          <div className="flex items-center gap-2 border-b border-slate-200/80 bg-slate-50/60 px-3.5 py-2 dark:border-slate-800 dark:bg-slate-800/40">
            <IdCard className="size-3.5 text-blue-600 dark:text-blue-400" />
            <h2 id="contact-identification" className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Identificación
            </h2>
          </div>
          <div className="grid gap-3 p-3.5 sm:grid-cols-2">
            {isEditing && (
              <Field name="codigo" label="Código">
                <Input value={contacto?.codigoContacto ?? ""} readOnly className={cn(controlClass, "bg-slate-50 font-mono font-semibold text-slate-600 dark:bg-slate-800/60 dark:text-slate-400 cursor-not-allowed")} />
              </Field>
            )}
            <Field name="tipoPersona" label="Tipo de persona">
              <select value={tipoPersona} onChange={(event) => setTipoPersona(event.target.value as TipoPersona)} className={selectClass}>
                <option value="fisica">Física</option>
                <option value="juridica">Jurídica</option>
              </select>
            </Field>
            <Field name="nombre" label={tipoPersona === "juridica" ? "Denominación" : "Nombre completo"} required error={errors.nombre} className="sm:col-span-2">
              <Input ref={nameRef} value={nombre} onChange={(event) => { setNombre(event.target.value); clearError("nombre") }} placeholder={tipoPersona === "juridica" ? "Razón social o denominación..." : "Nombre y apellido..."} className={controlClass} />
            </Field>
            <Field name="nombreFantasia" label="Nombre de fantasía">
              <Input value={nombreFantasia} onChange={(event) => setNombreFantasia(event.target.value)} placeholder="Opcional..." className={controlClass} />
            </Field>
            <Field name="cuit" label="CUIT">
              <div className="flex gap-2">
                <Input value={cuit} onChange={(event) => setCuit(event.target.value)} placeholder="00-00000000-0" className={cn(controlClass, "font-mono")} />
                <button
                  type="button"
                  data-testid="contact-cuit-lookup-btn"
                  disabled={!validateCuitFormat(normalizeCuit(cuit)) || cuitLookupLoading}
                  onClick={() => void handleCuitLookup()}
                  className="shrink-0 rounded-md border border-blue-300 bg-blue-50 px-3 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed dark:border-blue-700 dark:bg-blue-950 dark:text-blue-300"
                >
                  {cuitLookupLoading ? "Buscando…" : "Buscar por CUIT"}
                </button>
              </div>
            </Field>
            {cuitLookupError && (
              <div data-testid="contact-cuit-lookup-error" className="sm:col-span-2 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                {cuitLookupError}
              </div>
            )}
            {cuitResult?.found && (
              <div data-testid="contact-cuit-lookup-diff" className="sm:col-span-2 rounded-md border border-blue-200 bg-blue-50 p-3 space-y-2 dark:border-blue-800 dark:bg-blue-950">
                <p className="text-xs font-semibold text-blue-800 dark:text-blue-200">Sugerencia desde ARCA — confirmá los campos a aplicar:</p>
                {cuitResult.legalName && (
                  <label data-testid="contact-cuit-lookup-row-legalName" className="flex items-center gap-2 text-xs">
                    <input type="checkbox" checked={cuitSuggestion.legalName ?? false} onChange={(e) => setCuitSuggestion((s) => ({ ...s, legalName: e.target.checked }))} />
                    <span className="font-medium">Razón social:</span>
                    <span className="text-gray-600 dark:text-gray-300">{cuitResult.legalName}</span>
                  </label>
                )}
                {cuitResult.vatCondition && (
                  <label data-testid="contact-cuit-lookup-row-vatCondition" className="flex items-center gap-2 text-xs">
                    <input type="checkbox" checked={cuitSuggestion.vatCondition ?? false} onChange={(e) => setCuitSuggestion((s) => ({ ...s, vatCondition: e.target.checked }))} />
                    <span className="font-medium">Condición IVA:</span>
                    <span className="text-gray-600 dark:text-gray-300">{cuitResult.vatCondition}</span>
                  </label>
                )}
                {cuitResult.mainAddress && (
                  <label data-testid="contact-cuit-lookup-row-mainAddress" className="flex items-center gap-2 text-xs">
                    <input type="checkbox" checked={cuitSuggestion.mainAddress ?? false} onChange={(e) => setCuitSuggestion((s) => ({ ...s, mainAddress: e.target.checked }))} />
                    <span className="font-medium">Domicilio:</span>
                    <span className="text-gray-600 dark:text-gray-300">
                      {[cuitResult.mainAddress.street, cuitResult.mainAddress.city, cuitResult.mainAddress.state, cuitResult.mainAddress.zipCode].filter(Boolean).join(", ")}
                    </span>
                  </label>
                )}
                <div className="flex gap-2 pt-1">
                  <button type="button" data-testid="contact-cuit-lookup-apply" onClick={applyCuitSuggestion} className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700">Aplicar seleccionados</button>
                  <button type="button" data-testid="contact-cuit-lookup-discard" onClick={discardCuitSuggestion} className="rounded-md border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300">Cerrar</button>
                </div>
              </div>
            )}
            {tipoPersona === "fisica" && (
              <Field name="dni" label="DNI">
                <Input value={dni} onChange={(event) => setDni(event.target.value)} placeholder="Documento..." className={cn(controlClass, "font-mono")} />
              </Field>
            )}
            {isEditing && (
              <Field name="estado" label="Estado">
                <select value={estado} onChange={(event) => setEstado(event.target.value as typeof estado)} className={selectClass}>
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                </select>
              </Field>
            )}
            <Field name="observaciones" label="Observaciones" className="sm:col-span-2">
              <Textarea value={observaciones} onChange={(event) => setObservaciones(event.target.value)} placeholder="Notas o detalles adicionales..." className="min-h-16 text-xs rounded-md border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xs resize-y" />
            </Field>
          </div>
        </section>

        {/* CONTACTO Y DIRECCIÓN */}
        <section
          className="rounded-lg border border-slate-200/90 bg-white shadow-2xs overflow-hidden dark:border-slate-800 dark:bg-slate-900"
          aria-labelledby="contact-details"
        >
          <div className="flex items-center gap-2 border-b border-slate-200/80 bg-slate-50/60 px-3.5 py-2 dark:border-slate-800 dark:bg-slate-800/40">
            <MapPin className="size-3.5 text-blue-600 dark:text-blue-400" />
            <h2 id="contact-details" className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Contacto y dirección principal
            </h2>
          </div>
          <div className="grid gap-3 p-3.5 sm:grid-cols-2">
            <Field name="domicilio" label="Domicilio" className="sm:col-span-2">
              <Input value={domicilio} onChange={(event) => setDomicilio(event.target.value)} placeholder="Calle y número..." className={controlClass} />
            </Field>
            <Field name="provincia" label="Provincia">
              <Input value={provincia} onChange={(event) => setProvincia(event.target.value)} placeholder="Provincia..." className={controlClass} />
            </Field>
            <Field name="localidad" label="Localidad">
              <Input value={localidad} onChange={(event) => setLocalidad(event.target.value)} placeholder="Ciudad o localidad..." className={controlClass} />
            </Field>
            <Field name="codigoPostal" label="Código postal">
              <Input value={codigoPostal} onChange={(event) => setCodigoPostal(event.target.value)} placeholder="CP..." className={controlClass} />
            </Field>
            <Field name="telefono" label="Teléfono">
              <Input type="tel" value={telefono} onChange={(event) => setTelefono(event.target.value)} placeholder="+54 9..." className={controlClass} />
            </Field>
            <Field name="email" label="Email" error={errors.email} className="sm:col-span-2">
              <Input ref={emailRef} type="email" value={email} onChange={(event) => { setEmail(event.target.value); clearError("email") }} placeholder="ejemplo@correo.com" className={controlClass} />
            </Field>
          </div>
        </section>

        {/* ROLES Y GRUPOS */}
        <section
          className="rounded-lg border border-slate-200/90 bg-white shadow-2xs overflow-hidden dark:border-slate-800 dark:bg-slate-900"
          aria-labelledby="contact-classification"
        >
          <div className="flex items-center gap-2 border-b border-slate-200/80 bg-slate-50/60 px-3.5 py-2 dark:border-slate-800 dark:bg-slate-800/40">
            <Users className="size-3.5 text-blue-600 dark:text-blue-400" />
            <h2 id="contact-classification" className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Roles y grupos
            </h2>
          </div>
          <div className="space-y-3.5 p-3.5">
            <div>
              <p className="mb-2 text-xs font-medium text-slate-600 dark:text-slate-400">Roles</p>
              <div className="flex flex-wrap gap-2">
                {ROLE_OPTIONS.map((role) => {
                  const isChecked = roles.includes(role)
                  return (
                    <label
                      key={role}
                      className={cn(
                        "flex h-8 cursor-pointer items-center gap-2 rounded-md border px-3 text-xs font-medium transition-all select-none shadow-2xs",
                        isChecked
                          ? "border-blue-500 bg-blue-50 text-blue-700 font-semibold dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-300"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                      )}
                    >
                      <Checkbox checked={isChecked} onCheckedChange={() => toggleRole(role)} />
                      <span>{CONTACT_ROLE_LABELS[role]}</span>
                    </label>
                  )
                })}
              </div>
            </div>

            {availableGroups.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium text-slate-600 dark:text-slate-400">Grupos asociados</p>
                <div className="flex flex-wrap gap-2">
                  {availableGroups.map((group) => {
                    const isChecked = groups.includes(group.id)
                    return (
                      <label
                        key={group.id}
                        className={cn(
                          "flex h-8 cursor-pointer items-center gap-2 rounded-md border px-3 text-xs font-medium transition-all select-none shadow-2xs",
                          isChecked
                            ? "border-emerald-500 bg-emerald-50 text-emerald-700 font-semibold dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                        )}
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() =>
                            setGroups((current) =>
                              current.includes(group.id) ? current.filter((item) => item !== group.id) : [...current, group.id]
                            )
                          }
                        />
                        <span>{group.nombre}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* DATOS OPERATIVOS */}
        {(roles.includes("cliente") || groups.includes("medicos") || groups.includes("instituciones")) && (
          <section
            className="rounded-lg border border-slate-200/90 bg-white shadow-2xs overflow-hidden dark:border-slate-800 dark:bg-slate-900"
            aria-labelledby="contact-profile"
          >
            <div className="flex items-center gap-2 border-b border-slate-200/80 bg-slate-50/60 px-3.5 py-2 dark:border-slate-800 dark:bg-slate-800/40">
              <Briefcase className="size-3.5 text-blue-600 dark:text-blue-400" />
              <h2 id="contact-profile" className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Datos operativos
              </h2>
            </div>
            <div className="grid gap-3 p-3.5 sm:grid-cols-2">
              {roles.includes("cliente") && (
                <>
                  <label className="flex h-9 cursor-pointer items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 sm:col-span-2">
                    <Checkbox checked={esPagador} onCheckedChange={(value) => setEsPagador(Boolean(value))} />
                    <span>Es pagador habitual</span>
                  </label>
                  <Field name="condicionIva" label="Condición IVA">
                    <select value={condicionIva} onChange={(event) => setCondicionIva(event.target.value as CondicionIvaCliente)} className={selectClass}>
                      {VAT_OPTIONS.map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  </Field>
                  <Field name="condicionPago" label="Condición de pago">
                    <Input value={condicionPago} onChange={(event) => setCondicionPago(event.target.value)} placeholder="Ej: 30 días..." className={controlClass} />
                  </Field>
                  <Field name="listaPreciosDefault" label="Lista de precios predeterminada">
                    <Input value={listaPreciosDefault} onChange={(event) => setListaPreciosDefault(event.target.value)} placeholder="Lista de precios..." className={controlClass} />
                  </Field>
                  <Field name="descuentoHabitual" label="Descuento habitual (%)" error={errors.descuentoHabitual}>
                    <Input ref={discountRef} type="number" min={0} max={100} step="0.01" value={descuentoHabitual} onChange={(event) => { setDescuentoHabitual(event.target.value); clearError("descuentoHabitual") }} placeholder="0.00" className={controlClass} />
                  </Field>
                </>
              )}
              {groups.includes("medicos") && (
                <>
                  <Field name="matricula" label="Matrícula">
                    <Input value={matricula} onChange={(event) => setMatricula(event.target.value)} placeholder="MP / MN..." className={controlClass} />
                  </Field>
                  <Field name="especialidad" label="Especialidad">
                    <Input value={especialidad} onChange={(event) => setEspecialidad(event.target.value)} placeholder="Especialidad médica..." className={controlClass} />
                  </Field>
                </>
              )}
              {groups.includes("instituciones") && (
                <Field name="observacionEntrega" label="Observación de entrega" className="sm:col-span-2">
                  <Textarea value={observacionEntrega} onChange={(event) => setObservacionEntrega(event.target.value)} placeholder="Horarios de recepción, pabellón, indicaciones..." className="min-h-16 text-xs rounded-md border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xs resize-y" />
                </Field>
              )}
            </div>
          </section>
        )}
      </div>

      <footer className="shrink-0 border-t border-slate-200/90 bg-white px-4 py-3 sm:px-5 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div aria-live="polite" className="min-h-5 text-xs text-slate-500 dark:text-slate-400">
            {saving ? (
              <span className="inline-flex items-center gap-1.5 font-medium text-blue-600 dark:text-blue-400">
                <Loader2 className="size-3.5 animate-spin" /> Guardando…
              </span>
            ) : saveError ? (
              <span className="inline-flex items-center gap-1.5 font-medium text-destructive">
                <CircleAlert className="size-3.5" /> {saveError}
              </span>
            ) : !activeCompany?.id ? (
              <span className="text-destructive font-medium">No hay una empresa activa.</span>
            ) : (
              "Los cambios se guardan directamente en el servidor."
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Button type="button" variant="outline" size="sm" disabled={saving} onClick={() => onOpenChange(false)} className="h-8">
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={saving || !activeCompany?.id}
              className="h-8 bg-blue-600 text-white hover:bg-blue-700 shadow-xs active:scale-[0.98] transition-all font-semibold"
            >
              {saving ? "Guardando…" : isEditing ? "Guardar cambios" : "Crear contacto"}
            </Button>
          </div>
        </div>
      </footer>
    </form>
  )
}

export function ContactoFormDialog(props: ContactoFormDialogProps) {
  const formKey = `${props.contacto?.id ?? "new"}:${props.open ? "open" : "closed"}`
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        className="flex h-[min(48rem,calc(100dvh-1rem))] w-[calc(100vw-1rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:w-[calc(100vw-2rem)] border-slate-200/90 shadow-2xl dark:border-slate-800"
      >
        <ContactoFormInner key={formKey} {...props} />
      </DialogContent>
    </Dialog>
  )
}

