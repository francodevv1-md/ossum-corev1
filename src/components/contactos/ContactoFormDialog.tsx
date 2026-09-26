"use client"

import React, { useEffect, useId, useRef, useState } from "react"
import { CircleAlert, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth/AuthProvider"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { InstitutionGeographySection } from "@/components/contactos/InstitutionGeographySection"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createContactApi, updateContactApi } from "@/lib/api/contacts"
import { mapApiContactToContacto, mapContactoToApiPayload } from "@/lib/api/contact-adapter"
import type { ContactAddressGeoInput } from "@/lib/validators/contact"
import { CONTACT_GROUPS, CONTACT_ROLE_LABELS, getGroupsForRole } from "@/lib/contacts.constants"
import type { CondicionIvaCliente, Contacto, ContactRole, TipoPersona } from "@/types"

const ROLE_OPTIONS: ContactRole[] = ["cliente", "proveedor", "interno"]
const VAT_OPTIONS: CondicionIvaCliente[] = ["Responsable Inscripto", "Responsable Monotributo", "Exento", "Consumidor Final", "No Responsable"]
const controlClass = "h-11 text-sm transition-[border-color,box-shadow] duration-150 motion-reduce:transition-none sm:h-8 sm:text-xs"
const selectClass = "h-11 w-full rounded-md border border-[var(--ossum-line)] bg-white px-3 text-sm transition-[border-color,box-shadow] duration-150 focus:outline-none focus:ring-2 focus:ring-[var(--ossum-action)]/30 motion-reduce:transition-none sm:h-8 sm:px-2 sm:text-xs"

export function sanitizeContactoSaveError(error: unknown): string {
  const message = (error instanceof Error ? error.message : String(error || "")).trim()
  if (!message) return "No se pudo guardar el contacto. Revisá los datos e intentá nuevamente."
  const normalized = message.toLowerCase()
  if (normalized.includes("at least one identifiable field is required") || (normalized.includes("firstname") && normalized.includes("documentnumber"))) {
    return "Para guardar el contacto, completá al menos un dato identificable: nombre, email, teléfono, DNI o CUIT."
  }
  if (normalized.includes("failed to fetch") || normalized.includes("networkerror")) return "No se pudo conectar con el servidor. Intentá nuevamente."
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

function Field({ name, label, error, required, className, children }: { name: string; label: string; error?: string; required?: boolean; className?: string; children: React.ReactNode }) {
  const generatedId = useId()
  const id = `contact-${name}-${generatedId.replace(/:/g, "")}`
  const errorId = `${id}-error`
  const control = React.isValidElement<{ id?: string; "aria-describedby"?: string; "aria-invalid"?: boolean }>(children)
    ? React.cloneElement(children, { id, "aria-describedby": error ? errorId : children.props["aria-describedby"], "aria-invalid": Boolean(error) })
    : children
  return <div className={`space-y-1 ${className ?? ""}`}><Label htmlFor={id} className="text-xs font-medium">{label}{required ? " *" : ""}</Label>{control}{error && <p id={errorId} role="alert" className="text-xs text-destructive">{error}</p>}</div>
}

function ContactoFormInner({ contacto, onSaved, onOpenChange, defaultRoles, defaultGroups, initialValues }: Omit<ContactoFormDialogProps, "open">) {
  const { activeCompany, currentAccess } = useAuth()
  const isEditing = Boolean(contacto)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [errors, setErrors] = useState<FormErrors>({})
  const companyIdRef = useRef(activeCompany?.id)
  const mutationRef = useRef(0)
  const nameRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const discountRef = useRef<HTMLInputElement>(null)

  const [tipoPersona, setTipoPersona] = useState<TipoPersona>(contacto?.tipoPersona ?? initialValues?.tipoPersona ?? "fisica")
  const [nombre, setNombre] = useState(contacto?.nombre ?? initialValues?.nombre ?? "")
  const [nombreFantasia, setNombreFantasia] = useState(contacto?.nombreFantasia ?? "")
  const [cuit, setCuit] = useState(contacto?.cuit ?? "")
  const [dni, setDni] = useState(contacto?.dni ?? initialValues?.dni ?? "")
  const [estado, setEstado] = useState<"activo" | "inactivo">(contacto?.estado ?? "activo")
  const [observaciones, setObservaciones] = useState(contacto?.observaciones ?? "")
  const [domicilio, setDomicilio] = useState(contacto?.domicilio ?? "")
  const [provincia, setProvincia] = useState(contacto?.provincia ?? "")
  const [localidad, setLocalidad] = useState(contacto?.localidad ?? "")
  const [codigoPostal, setCodigoPostal] = useState(contacto?.codigoPostal ?? "")
  const [telefono, setTelefono] = useState(contacto?.telefonos?.[0] ?? "")
  const [email, setEmail] = useState(contacto?.email ?? "")
  const [roles, setRoles] = useState<ContactRole[]>(contacto?.roles ? [...contacto.roles] : [...(defaultRoles ?? [])])
  const [groups, setGroups] = useState<string[]>(contacto?.groups ? [...contacto.groups] : [...(defaultGroups ?? [])])
  const [esPagador, setEsPagador] = useState(contacto?.datosClientePagador?.esPagador ?? true)
  const [condicionIva, setCondicionIva] = useState<CondicionIvaCliente>(contacto?.datosClientePagador?.condicionIva ?? "Consumidor Final")
  const [condicionPago, setCondicionPago] = useState(contacto?.datosClientePagador?.condicionPago ?? "")
  const [listaPreciosDefault, setListaPreciosDefault] = useState(contacto?.datosClientePagador?.listaPreciosDefault ?? "")
  const [descuentoHabitual, setDescuentoHabitual] = useState(contacto?.datosClientePagador?.descuentoHabitual?.toString() ?? "")
  const [matricula, setMatricula] = useState(contacto?.datosMedico?.matricula ?? "")
  const [especialidad, setEspecialidad] = useState(contacto?.datosMedico?.especialidad ?? "")
  const [observacionEntrega, setObservacionEntrega] = useState(contacto?.datosInstitucion?.observacionEntrega ?? "")
  const [mainAddressGeo, setMainAddressGeo] = useState<ContactAddressGeoInput | undefined>(contacto?.mainAddressGeo)

  useEffect(() => {
    companyIdRef.current = activeCompany?.id
    mutationRef.current += 1
  }, [activeCompany?.id])
  useEffect(() => () => { mutationRef.current += 1 }, [])

  const clearError = (name: string) => setErrors((current) => { const next = { ...current }; delete next[name]; return next })

  const toggleRole = (role: ContactRole) => {
    setRoles((current) => {
      const next = current.includes(role) ? current.filter((item) => item !== role) : [...current, role]
      const validGroups = new Set(next.flatMap(getGroupsForRole).map((group) => group.id))
      const canonicalGroups = new Set(CONTACT_GROUPS.map((group) => group.id))
      setGroups((currentGroups) => currentGroups.filter((group) => !canonicalGroups.has(group) || validGroups.has(group)))
      return next
    })
  }

  const validate = () => {
    const next: FormErrors = {}
    if (!nombre.trim()) next.nombre = tipoPersona === "juridica" ? "La denominación es obligatoria." : "El nombre es obligatorio."
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) next.email = "Ingresá un email válido."
    if (descuentoHabitual && (!Number.isFinite(Number(descuentoHabitual)) || Number(descuentoHabitual) < 0 || Number(descuentoHabitual) > 100)) next.descuentoHabitual = "Ingresá un porcentaje entre 0 y 100."
    setErrors(next)
    const first = Object.keys(next)[0]
    if (first) requestAnimationFrame(() => ({ nombre: nameRef, email: emailRef, descuentoHabitual: discountRef }[first]?.current?.focus()))
    return !first
  }

  const save = async () => {
    if (!activeCompany?.id) { setSaveError("Seleccioná una empresa activa antes de guardar."); return }
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
      datosClientePagador: roles.includes("cliente") ? { esPagador, condicionIva, condicionPago: condicionPago.trim() || undefined, listaPreciosDefault: listaPreciosDefault.trim() || undefined, descuentoHabitual: descuentoHabitual ? Number(descuentoHabitual) : undefined } : undefined,
      datosMedico: groups.includes("medicos") ? { matricula: matricula.trim() || undefined, especialidad: especialidad.trim() || undefined } : undefined,
      datosInstitucion: groups.includes("instituciones") ? { observacionEntrega: observacionEntrega.trim() || undefined } : undefined,
    }
    const payload = mapContactoToApiPayload(formData, groups.includes("instituciones") ? mainAddressGeo : undefined)
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
      const response = isEditing && contacto
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

  return <form noValidate onSubmit={(event) => { event.preventDefault(); void save() }} className="flex min-h-0 flex-1 flex-col">
    <DialogHeader className="shrink-0 border-b border-[var(--ossum-line)] bg-white px-4 py-3 sm:px-5">
      <DialogTitle className="text-base text-[var(--ossum-navy)]">{isEditing ? "Editar contacto" : "Nuevo contacto"}</DialogTitle>
      <DialogDescription className="text-xs">{isEditing ? <><span className="font-mono">{contacto?.codigoContacto}</span> · el código no se puede modificar.</> : "El código será asignado por el servidor al guardar."}</DialogDescription>
    </DialogHeader>

    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-[var(--ossum-surface)] p-3 sm:p-4">
      <section className="border border-[var(--ossum-line)] bg-white" aria-labelledby="contact-identification">
        <h2 id="contact-identification" className="border-b border-[var(--ossum-line)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ossum-navy)]">Identificación</h2>
        <div className="grid gap-3 p-3 sm:grid-cols-2">
          {isEditing && <Field name="codigo" label="Código"><Input value={contacto?.codigoContacto ?? ""} readOnly className={`${controlClass} bg-muted/40 font-mono`} /></Field>}
          <Field name="tipoPersona" label="Tipo de persona"><select value={tipoPersona} onChange={(event) => setTipoPersona(event.target.value as TipoPersona)} className={selectClass}><option value="fisica">Física</option><option value="juridica">Jurídica</option></select></Field>
          <Field name="nombre" label={tipoPersona === "juridica" ? "Denominación" : "Nombre completo"} required error={errors.nombre}><Input ref={nameRef} value={nombre} onChange={(event) => { setNombre(event.target.value); clearError("nombre") }} className={controlClass} /></Field>
          <Field name="nombreFantasia" label="Nombre de fantasía"><Input value={nombreFantasia} onChange={(event) => setNombreFantasia(event.target.value)} className={controlClass} /></Field>
          <Field name="cuit" label="CUIT"><Input value={cuit} onChange={(event) => setCuit(event.target.value)} className={`${controlClass} font-mono`} /></Field>
          {tipoPersona === "fisica" && <Field name="dni" label="DNI"><Input value={dni} onChange={(event) => setDni(event.target.value)} className={`${controlClass} font-mono`} /></Field>}
          {isEditing && <Field name="estado" label="Estado"><select value={estado} onChange={(event) => setEstado(event.target.value as typeof estado)} className={selectClass}><option value="activo">Activo</option><option value="inactivo">Inactivo</option></select></Field>}
          <Field name="observaciones" label="Observaciones" className="sm:col-span-2"><Textarea value={observaciones} onChange={(event) => setObservaciones(event.target.value)} className="min-h-20 text-sm sm:text-xs" /></Field>
        </div>
      </section>

      <section className="border border-[var(--ossum-line)] bg-white" aria-labelledby="contact-details">
        <h2 id="contact-details" className="border-b border-[var(--ossum-line)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ossum-navy)]">Contacto y dirección principal</h2>
        <div className="grid gap-3 p-3 sm:grid-cols-2">
          <Field name="domicilio" label="Domicilio" className="sm:col-span-2"><Input value={domicilio} onChange={(event) => setDomicilio(event.target.value)} className={controlClass} /></Field>
          <Field name="provincia" label="Provincia"><Input value={provincia} onChange={(event) => setProvincia(event.target.value)} className={controlClass} /></Field>
          <Field name="localidad" label="Localidad"><Input value={localidad} onChange={(event) => setLocalidad(event.target.value)} className={controlClass} /></Field>
          <Field name="codigoPostal" label="Código postal"><Input value={codigoPostal} onChange={(event) => setCodigoPostal(event.target.value)} className={controlClass} /></Field>
          <Field name="telefono" label="Teléfono"><Input type="tel" value={telefono} onChange={(event) => setTelefono(event.target.value)} className={controlClass} /></Field>
          <Field name="email" label="Email" error={errors.email}><Input ref={emailRef} type="email" value={email} onChange={(event) => { setEmail(event.target.value); clearError("email") }} className={controlClass} /></Field>
        </div>
       </section>
       {groups.includes("instituciones") && activeCompany?.id && <InstitutionGeographySection companyId={activeCompany.id} actorRole={currentAccess?.role} address={{ street: domicilio, city: localidad, state: provincia }} value={mainAddressGeo} onChange={setMainAddressGeo} />}

       <section className="border border-[var(--ossum-line)] bg-white" aria-labelledby="contact-classification">
        <h2 id="contact-classification" className="border-b border-[var(--ossum-line)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ossum-navy)]">Roles y grupos</h2>
        <div className="space-y-4 p-3">
          <div className="flex flex-wrap gap-2">{ROLE_OPTIONS.map((role) => <label key={role} className="flex h-11 cursor-pointer items-center gap-2 border border-[var(--ossum-line)] px-3 text-sm sm:h-8 sm:text-xs"><Checkbox checked={roles.includes(role)} onCheckedChange={() => toggleRole(role)} /><span>{CONTACT_ROLE_LABELS[role]}</span></label>)}</div>
          {availableGroups.length > 0 && <div><p className="mb-2 text-xs font-medium text-gray-600">Grupos</p><div className="flex flex-wrap gap-2">{availableGroups.map((group) => <label key={group.id} className="flex h-11 cursor-pointer items-center gap-2 border border-[var(--ossum-line)] px-3 text-sm sm:h-8 sm:text-xs"><Checkbox checked={groups.includes(group.id)} onCheckedChange={() => setGroups((current) => current.includes(group.id) ? current.filter((item) => item !== group.id) : [...current, group.id])} /><span>{group.nombre}</span></label>)}</div></div>}
        </div>
      </section>

      {(roles.includes("cliente") || groups.includes("medicos") || groups.includes("instituciones")) && <section className="border border-[var(--ossum-line)] bg-white" aria-labelledby="contact-profile">
        <h2 id="contact-profile" className="border-b border-[var(--ossum-line)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ossum-navy)]">Datos operativos</h2>
        <div className="grid gap-3 p-3 sm:grid-cols-2">
          {roles.includes("cliente") && <>
            <label className="flex h-11 items-center gap-2 text-sm sm:h-8 sm:text-xs"><Checkbox checked={esPagador} onCheckedChange={(value) => setEsPagador(Boolean(value))} />Es pagador</label>
            <Field name="condicionIva" label="Condición IVA"><select value={condicionIva} onChange={(event) => setCondicionIva(event.target.value as CondicionIvaCliente)} className={selectClass}>{VAT_OPTIONS.map((option) => <option key={option}>{option}</option>)}</select></Field>
            <Field name="condicionPago" label="Condición de pago"><Input value={condicionPago} onChange={(event) => setCondicionPago(event.target.value)} className={controlClass} /></Field>
            <Field name="listaPreciosDefault" label="Lista de precios predeterminada"><Input value={listaPreciosDefault} onChange={(event) => setListaPreciosDefault(event.target.value)} className={controlClass} /></Field>
            <Field name="descuentoHabitual" label="Descuento habitual (%)" error={errors.descuentoHabitual}><Input ref={discountRef} type="number" min={0} max={100} step="0.01" value={descuentoHabitual} onChange={(event) => { setDescuentoHabitual(event.target.value); clearError("descuentoHabitual") }} className={controlClass} /></Field>
          </>}
          {groups.includes("medicos") && <><Field name="matricula" label="Matrícula"><Input value={matricula} onChange={(event) => setMatricula(event.target.value)} className={controlClass} /></Field><Field name="especialidad" label="Especialidad"><Input value={especialidad} onChange={(event) => setEspecialidad(event.target.value)} className={controlClass} /></Field></>}
          {groups.includes("instituciones") && <Field name="observacionEntrega" label="Observación de entrega" className="sm:col-span-2"><Textarea value={observacionEntrega} onChange={(event) => setObservacionEntrega(event.target.value)} className="min-h-16 text-sm sm:text-xs" /></Field>}
        </div>
      </section>}
    </div>

    <footer className="shrink-0 border-t border-[var(--ossum-line)] bg-white px-3 py-3 sm:px-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div aria-live="polite" className="min-h-5 text-xs text-muted-foreground">{saving ? <span className="inline-flex items-center gap-1"><Loader2 className="size-3 animate-spin motion-reduce:animate-none" />Guardando…</span> : saveError ? <span className="inline-flex items-center gap-1 text-destructive"><CircleAlert className="size-3" />{saveError}</span> : !activeCompany?.id ? <span className="text-destructive">No hay una empresa activa.</span> : "Los cambios se guardan en el servidor."}</div>
        <div className="grid grid-cols-2 gap-2 sm:flex"><Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)} className="h-11 sm:h-8">Cancelar</Button><Button type="submit" disabled={saving || !activeCompany?.id} className="h-11 bg-[var(--ossum-action)] text-white transition-[background-color] motion-reduce:transition-none hover:bg-[#1830a8] sm:h-8">{saving ? "Guardando…" : isEditing ? "Guardar cambios" : "Crear contacto"}</Button></div>
      </div>
    </footer>
  </form>
}

export function ContactoFormDialog(props: ContactoFormDialogProps) {
  const formKey = `${props.contacto?.id ?? "new"}:${props.open ? "open" : "closed"}`
  return <Dialog open={props.open} onOpenChange={props.onOpenChange}><DialogContent className="flex h-[calc(100dvh-1rem)] max-h-[52rem] w-[calc(100vw-1rem)] max-w-3xl flex-col gap-0 overflow-hidden p-0 sm:h-[calc(100dvh-2rem)] sm:w-[calc(100vw-2rem)]"><ContactoFormInner key={formKey} {...props} /></DialogContent></Dialog>
}
