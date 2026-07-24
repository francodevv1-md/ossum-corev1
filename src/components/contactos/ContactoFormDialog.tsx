"use client"

import React, { useState } from "react"
import { useOrtoTrackStore } from "@/lib/store"
import type { Contacto, ContactRole, TipoPersona, DatosClientePagador, DatosMedico, DatosInstitucion, CondicionIvaCliente } from "@/types"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { Save, UserPlus, Loader2, Pencil } from "lucide-react"
import { CONTACT_GROUPS, CONTACT_ROLE_LABELS, getGroupsForRole } from "@/lib/contacts.constants"
import { apiFetch } from "@/lib/api/client"
import { useAuth } from "@/components/auth/AuthProvider"
import { mapContactoToApiPayload } from "@/lib/api/contact-adapter"
import {
  isValidContactCodeFormat,
  normalizeContactCode,
} from "@/lib/contact-code"

// ═══════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════

const ROL_OPTIONS: { value: ContactRole; label: string }[] = [
  { value: "cliente", label: "Cliente" },
  { value: "proveedor", label: "Proveedor" },
  { value: "interno", label: "Interno" },
]

const CONDICION_IVA_OPTIONS: { value: CondicionIvaCliente; label: string }[] = [
  { value: "Responsable Inscripto", label: "Responsable Inscripto" },
  { value: "Responsable Monotributo", label: "Responsable Monotributo" },
  { value: "Exento", label: "Exento" },
  { value: "Consumidor Final", label: "Consumidor Final" },
  { value: "No Responsable", label: "No Responsable" },
]

export function sanitizeContactoSaveError(error: unknown): string {
  const rawMessage = error instanceof Error ? error.message : String(error || "")
  const message = rawMessage.trim()

  if (!message) return "No se pudo guardar el contacto. Revisá los datos e intentá nuevamente."

  const normalized = message.toLowerCase()
  const isIdentifiableFieldError =
    normalized.includes("at least one identifiable field is required") ||
    (normalized.includes("firstName") && normalized.includes("lastName") && normalized.includes("documentNumber"))

  if (isIdentifiableFieldError) {
    return "Para guardar el contacto, completá al menos un dato identificable: nombre, email, teléfono, DNI o CUIT."
  }

  if (normalized.includes("failed to fetch") || normalized.includes("networkerror")) {
    return "No se pudo conectar con el servidor. El contacto se guardará localmente si corresponde."
  }

  return message
}

// ═══════════════════════════════════════════════════════════════
// Props
// ═══════════════════════════════════════════════════════════════

interface ContactoFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contacto?: Contacto | null
  onSaved?: (contacto: Contacto) => void
  /** DC-CT-017: Default roles for alta rápida from context */
  defaultRoles?: ContactRole[]
  /** DC-CT-016: Default groups for alta rápida from context */
  defaultGroups?: string[]
  /** Valores iniciales para alta rápida contextual */
  initialValues?: {
    tipoPersona?: TipoPersona
    nombre?: string
    dni?: string
  }
}

// ═══════════════════════════════════════════════════════════════
// Inner form component — state initialized from props,
// remounted via key when contacto changes
// ═══════════════════════════════════════════════════════════════

function ContactoFormInner({
  contacto,
  onSaved,
  onOpenChange,
  defaultRoles,
  defaultGroups,
  initialValues,
}: {
  contacto?: Contacto | null
  onSaved?: (contacto: Contacto) => void
  onOpenChange: (open: boolean) => void
  defaultRoles?: ContactRole[]
  defaultGroups?: string[]
  initialValues?: {
    tipoPersona?: TipoPersona
    nombre?: string
    dni?: string
  }
}) {
  const store = useOrtoTrackStore()
  const { activeCompany } = useAuth()
  const isEditing = !!contacto

  // ── API mutation state ──
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // ── Form state — initialized from contacto prop ──
  // CONTACTO-CODIGO-AUTO-P1 / FR-4: in create mode, pre-fill with the next
  // sequential code from the store (per-company stub). Edit mode keeps the
  // existing code (immutable).
  const [codigoContacto, setCodigoContacto] = useState(
    contacto?.codigoContacto ?? store.getNextContactoCodigo(activeCompany?.id)
  )
  const [tipoPersona, setTipoPersona] = useState<TipoPersona>(contacto?.tipoPersona ?? initialValues?.tipoPersona ?? "fisica")
  const [nombre, setNombre] = useState(contacto?.nombre ?? initialValues?.nombre ?? "")
  const [nombreFantasia, setNombreFantasia] = useState(contacto?.nombreFantasia ?? "")
  const [razonSocial, setRazonSocial] = useState(contacto?.razonSocial ?? "")
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

  const [roles, setRoles] = useState<ContactRole[]>(contacto?.roles ? [...contacto.roles] : (defaultRoles ?? []))
  const [groups, setGroups] = useState<string[]>(contacto?.groups ? [...contacto.groups] : (defaultGroups ?? []))

  const [esPagador, setEsPagador] = useState(contacto?.datosClientePagador?.esPagador ?? true)
  const [condicionIva, setCondicionIva] = useState<CondicionIvaCliente>(contacto?.datosClientePagador?.condicionIva ?? "Consumidor Final")
  const [condicionPago, setCondicionPago] = useState(contacto?.datosClientePagador?.condicionPago ?? "")
  const [listaPreciosDefault, setListaPreciosDefault] = useState(contacto?.datosClientePagador?.listaPreciosDefault ?? "")
  const [descuentoHabitual, setDescuentoHabitual] = useState(contacto?.datosClientePagador?.descuentoHabitual ?? 0)

  const [matricula, setMatricula] = useState(contacto?.datosMedico?.matricula ?? "")
  const [especialidad, setEspecialidad] = useState(contacto?.datosMedico?.especialidad ?? "")

  const [observacionEntrega, setObservacionEntrega] = useState(contacto?.datosInstitucion?.observacionEntrega ?? "")

  const [codigoError, setCodigoError] = useState("")
  const [nombreError, setNombreError] = useState("")
  // CONTACTO-CODIGO-AUTO-P1 / FR-8: in create mode the code is read-only by
  // default with a pencil toggle that enables manual editing.
  const [codigoEditable, setCodigoEditable] = useState(false)

  // ── Toggle role ──
  const toggleRole = (role: ContactRole) => {
    setRoles((prev) => {
      const next = prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
      // Remove groups that are incompatible with the new role set
      setGroups((prevGroups) =>
        prevGroups.filter((g) => {
          const group = CONTACT_GROUPS.find((cg) => cg.id === g)
          return group ? next.includes(group.role) : true
        })
      )
      return next
    })
  }

  // ── Toggle group ──
  const toggleGroup = (groupId: string) => {
    setGroups((prev) =>
      prev.includes(groupId) ? prev.filter((g) => g !== groupId) : [...prev, groupId]
    )
  }

  // ── Validate ──
  const handleCodigoBlur = () => {
    // CONTACTO-CODIGO-AUTO-P1 / FR-3: normalize on blur in create mode only.
    if (isEditing) return // immutable, nothing to normalize
    const trimmed = codigoContacto.trim()
    if (!trimmed) {
      setCodigoContacto("")
      return
    }
    const normalized = normalizeContactCode(trimmed)
    setCodigoContacto(normalized ?? trimmed) // keep raw visible if invalid so user sees input
  }

  const validate = (): boolean => {
    let valid = true

    if (!nombre.trim()) {
      setNombreError("El nombre es obligatorio")
      valid = false
    } else {
      setNombreError("")
    }

    // ── Code validation (CONTACTO-CODIGO-AUTO-P1) ──
    if (isEditing) {
      // FR-10 / FR-14: immutable in edit mode — field is display-only.
      setCodigoError("")
    } else if (!codigoContacto.trim()) {
      setCodigoError("El código es obligatorio")
      valid = false
    } else if (!isValidContactCodeFormat(codigoContacto.trim())) {
      setCodigoError("Formato inválido (usar C-0001)")
      valid = false
    } else if (!store.isCodigoContactoDisponible(codigoContacto.trim(), activeCompany?.id)) {
      setCodigoError("El código ya existe")
      valid = false
    } else {
      setCodigoError("")
    }

    return valid
  }

  // ── Handle save (API first, Zustand fallback) ──
  const handleSave = async () => {
    if (!validate()) return

    setSaving(true)
    setSaveError(null)

    const telefonos = telefono.trim() ? [telefono.trim()] : undefined

    const datosClientePagador: DatosClientePagador | undefined =
      roles.includes("cliente")
        ? {
            esPagador,
            condicionIva,
            condicionPago: condicionPago.trim() || undefined,
            listaPreciosDefault: listaPreciosDefault.trim() || undefined,
            descuentoHabitual: descuentoHabitual || undefined,
          }
        : undefined

    const datosMedico: DatosMedico | undefined =
      groups.includes("medicos")
        ? {
            matricula: matricula.trim() || undefined,
            especialidad: especialidad.trim() || undefined,
          }
        : undefined

    const datosInstitucion: DatosInstitucion | undefined =
      groups.includes("instituciones")
        ? {
            observacionEntrega: observacionEntrega.trim() || undefined,
          }
        : undefined

    // Build form data for API payload mapping
    const formData: Partial<Contacto> = {
      tipoPersona,
      nombre: nombre.trim(),
      razonSocial: razonSocial.trim() || undefined,
      cuit: cuit.trim() || undefined,
      dni: dni.trim() || undefined,
      email: email.trim() || undefined,
      telefonos,
      roles,
      // CONTACTO-CODIGO-AUTO-P1 / FR-13: send codigo to API on create for
      // forward-compat P2 persistence. Omitted in edit mode (FR-14 immutability).
      ...( !isEditing ? { codigoContacto: codigoContacto.trim() } : {} ),
    }

    const apiPayload = mapContactoToApiPayload(formData)

    // Track whether the status changed (for edit)
    const statusChanged = isEditing && contacto && contacto.estado !== estado
    const patchPayload = isEditing && statusChanged
      ? { ...apiPayload, isActive: estado === "activo" }
      : apiPayload

    try {
      if (isEditing && contacto) {
        // ── Edit via PATCH ──
        const url = `/api/companies/${encodeURIComponent(activeCompany?.id ?? "")}/contacts/${encodeURIComponent(contacto.id)}`
        await apiFetch(url, {
          method: "PATCH",
          body: JSON.stringify(patchPayload),
          headers: { "Content-Type": "application/json" },
        })

        // Update Zustand for local fields not persisted by API
        // FR-14 (immutability): codigoContacto is dropped from edit-branch
        // updateContacto here and in the catch fallback — do NOT pass it.
        store.updateContacto(contacto.id, {
          tipoPersona,
          nombre: nombre.trim(),
          nombreFantasia: nombreFantasia.trim() || undefined,
          razonSocial: razonSocial.trim() || undefined,
          cuit: cuit.trim() || undefined,
          dni: dni.trim() || undefined,
          estado,
          observaciones: observaciones.trim() || undefined,
          telefonos,
          email: email.trim() || undefined,
          domicilio: domicilio.trim() || undefined,
          provincia: provincia.trim() || undefined,
          localidad: localidad.trim() || undefined,
          codigoPostal: codigoPostal.trim() || undefined,
          roles,
          groups,
          datosClientePagador,
          datosMedico,
          datosInstitucion,
        })
        const updated = store.getContactoById(contacto.id)
        toast.success(`Contacto ${codigoContacto} actualizado`)
        onSaved?.(updated!)
        onOpenChange(false)
      } else {
        // ── Create via POST ──
        const url = `/api/companies/${encodeURIComponent(activeCompany?.id ?? "")}/contacts`
        await apiFetch(url, {
          method: "POST",
          body: JSON.stringify(apiPayload),
          headers: { "Content-Type": "application/json" },
        })

        // Create in Zustand as well (local fields)
        const created = store.createContacto({
          codigoContacto: codigoContacto.trim(),
          tipoPersona,
          nombre: nombre.trim(),
          nombreFantasia: nombreFantasia.trim() || undefined,
          razonSocial: razonSocial.trim() || undefined,
          cuit: cuit.trim() || undefined,
          dni: dni.trim() || undefined,
          estado,
          observaciones: observaciones.trim() || undefined,
          telefonos,
          email: email.trim() || undefined,
          domicilio: domicilio.trim() || undefined,
          provincia: provincia.trim() || undefined,
          localidad: localidad.trim() || undefined,
          codigoPostal: codigoPostal.trim() || undefined,
          roles,
          groups,
          datosClientePagador,
          datosMedico,
          datosInstitucion,
        })
        toast.success(`Contacto ${codigoContacto} creado`)
        onSaved?.(created)
        onOpenChange(false)
      }
    } catch (err: unknown) {
      const msg = sanitizeContactoSaveError(err)
      setSaveError(msg)
      toast.error(msg)

      // Fallback: save to Zustand only if API fails
      if (isEditing && contacto) {
        // FR-14 (immutability): codigoContacto dropped on edit fallback too.
        store.updateContacto(contacto.id, {
          tipoPersona,
          nombre: nombre.trim(),
          nombreFantasia: nombreFantasia.trim() || undefined,
          razonSocial: razonSocial.trim() || undefined,
          cuit: cuit.trim() || undefined,
          dni: dni.trim() || undefined,
          estado,
          observaciones: observaciones.trim() || undefined,
          telefonos,
          email: email.trim() || undefined,
          domicilio: domicilio.trim() || undefined,
          provincia: provincia.trim() || undefined,
          localidad: localidad.trim() || undefined,
          codigoPostal: codigoPostal.trim() || undefined,
          roles,
          groups,
          datosClientePagador,
          datosMedico,
          datosInstitucion,
        })
      } else {
        store.createContacto({
          codigoContacto: codigoContacto.trim(),
          tipoPersona,
          nombre: nombre.trim(),
          nombreFantasia: nombreFantasia.trim() || undefined,
          razonSocial: razonSocial.trim() || undefined,
          cuit: cuit.trim() || undefined,
          dni: dni.trim() || undefined,
          estado,
          observaciones: observaciones.trim() || undefined,
          telefonos,
          email: email.trim() || undefined,
          domicilio: domicilio.trim() || undefined,
          provincia: provincia.trim() || undefined,
          localidad: localidad.trim() || undefined,
          codigoPostal: codigoPostal.trim() || undefined,
          roles,
          groups,
          datosClientePagador,
          datosMedico,
          datosInstitucion,
        })
      }
    } finally {
      setSaving(false)
    }
  }

  // ── Render ──
  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <UserPlus className="size-5" />
          {isEditing ? `Editar Contacto — ${contacto?.codigoContacto}` : "Nuevo Contacto"}
        </DialogTitle>
        <DialogDescription>
          {isEditing ? "Modifique los datos del contacto" : "Complete los datos del nuevo contacto"}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6 py-2">
        {/* ── A. General ── */}
        <section>
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">General</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Código *</Label>
                {!isEditing && (
                  <button
                    type="button"
                    onClick={() => {
                      setCodigoEditable((v) => !v)
                      setCodigoError("")
                    }}
                    className="text-muted-foreground hover:text-primary"
                    aria-label={codigoEditable ? "Bloquear código sugerido" : "Editar código manualmente"}
                    title={codigoEditable ? "Bloquear" : "Editar manualmente"}
                  >
                    <Pencil className="size-3.5" />
                  </button>
                )}
              </div>
              <Input
                className="h-8 text-sm"
                value={codigoContacto}
                readOnly={isEditing || !codigoEditable}
                onChange={(e) => { setCodigoContacto(e.target.value); setCodigoError("") }}
                onBlur={handleCodigoBlur}
                placeholder="Ej: C-0001"
              />
              <p className="text-[10px] text-muted-foreground">
                {isEditing
                  ? "Inmutable (solo lectura)"
                  : codigoEditable
                    ? "Ingresa el código, se normaliza al salir (ej: 42 → C-0042)"
                    : "Sugerido automáticamente"}
              </p>
              {codigoError && <p className="text-[10px] text-red-600">{codigoError}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Tipo persona</Label>
              <Select value={tipoPersona} onValueChange={(v) => setTipoPersona(v as TipoPersona)}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fisica">Física</SelectItem>
                  <SelectItem value="juridica">Jurídica</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Nombre *</Label>
              <Input
                className="h-8 text-sm"
                value={nombre}
                onChange={(e) => { setNombre(e.target.value); setNombreError("") }}
                placeholder="Nombre completo"
              />
              {nombreError && <p className="text-[10px] text-red-600">{nombreError}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Nombre Fantasía</Label>
              <Input
                className="h-8 text-sm"
                value={nombreFantasia}
                onChange={(e) => setNombreFantasia(e.target.value)}
                placeholder="Nombre de fantasía"
              />
            </div>

            {tipoPersona === "juridica" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Razón Social</Label>
                <Input
                  className="h-8 text-sm"
                  value={razonSocial}
                  onChange={(e) => setRazonSocial(e.target.value)}
                  placeholder="Razón social"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">CUIT</Label>
              <Input
                className="h-8 text-sm"
                value={cuit}
                onChange={(e) => setCuit(e.target.value)}
                placeholder="XX-XXXXXXXX-X"
              />
            </div>

            {tipoPersona === "fisica" && (
              <div className="space-y-1.5">
                <Label className="text-xs">DNI</Label>
                <Input
                  className="h-8 text-sm"
                  value={dni}
                  onChange={(e) => setDni(e.target.value)}
                  placeholder="DNI"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">Estado</Label>
              <Select value={estado} onValueChange={(v) => setEstado(v as "activo" | "inactivo")}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="activo">Activo</SelectItem>
                  <SelectItem value="inactivo">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">Observaciones</Label>
              <Textarea
                className="text-sm min-h-[60px]"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Observaciones generales..."
                rows={2}
              />
            </div>
          </div>
        </section>

        {/* ── B. Contacto / Dirección ── */}
        <section>
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Contacto / Dirección</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">Domicilio</Label>
              <Input
                className="h-8 text-sm"
                value={domicilio}
                onChange={(e) => setDomicilio(e.target.value)}
                placeholder="Domicilio"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Provincia</Label>
              <Input
                className="h-8 text-sm"
                value={provincia}
                onChange={(e) => setProvincia(e.target.value)}
                placeholder="Provincia"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Localidad</Label>
              <Input
                className="h-8 text-sm"
                value={localidad}
                onChange={(e) => setLocalidad(e.target.value)}
                placeholder="Localidad"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Código Postal</Label>
              <Input
                className="h-8 text-sm"
                value={codigoPostal}
                onChange={(e) => setCodigoPostal(e.target.value)}
                placeholder="C.P."
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Teléfono</Label>
              <Input
                className="h-8 text-sm"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="Teléfono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Email</Label>
              <Input
                className="h-8 text-sm"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
              />
            </div>
          </div>
        </section>

        {/* ── C. Roles generales (DC-CT-015) ── */}
        <section>
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Roles generales</h3>
          <div className="flex flex-wrap gap-3">
            {ROL_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={cn(
                  "flex items-center gap-2 rounded-md border px-3 py-1.5 cursor-pointer transition-colors text-sm",
                  roles.includes(opt.value)
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "bg-muted/30 border-border hover:bg-muted/50"
                )}
              >
                <Checkbox
                  checked={roles.includes(opt.value)}
                  onCheckedChange={() => toggleRole(opt.value)}
                />
                <span className="text-xs font-medium">{opt.label}</span>
              </label>
            ))}
          </div>
        </section>

        {/* ── D. Grupos (DC-CT-016) ── */}
        {roles.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Grupos</h3>
            <div className="space-y-2">
              {roles.map((role) => {
                const groupsForRole = getGroupsForRole(role)
                if (groupsForRole.length === 0) return null
                return (
                  <div key={role} className="space-y-1">
                    <p className="text-[10px] font-medium text-muted-foreground">
                      {CONTACT_ROLE_LABELS[role]}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {groupsForRole.map((group) => (
                        <label
                          key={group.id}
                          className={cn(
                            "flex items-center gap-1.5 rounded-md border px-2.5 py-1 cursor-pointer transition-colors text-sm",
                            groups.includes(group.id)
                              ? "bg-primary/10 border-primary/30 text-primary"
                              : "bg-muted/30 border-border hover:bg-muted/50"
                          )}
                        >
                          <Checkbox
                            checked={groups.includes(group.id)}
                            onCheckedChange={() => toggleGroup(group.id)}
                          />
                          <span className="text-[11px] font-medium">{group.nombre}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ── E. Datos según rol/grupo ── */}
        {roles.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Datos según rol / grupo</h3>
            <div className="space-y-4">
              {/* Cliente */}
              {roles.includes("cliente") && (
                <div className="rounded-lg border p-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">Cliente</Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-2 text-xs font-medium">
                        <Checkbox
                          checked={esPagador}
                          onCheckedChange={(v) => setEsPagador(!!v)}
                        />
                        Es Pagador
                      </label>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Condición IVA</Label>
                      <Select value={condicionIva} onValueChange={(v) => setCondicionIva(v as CondicionIvaCliente)}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CONDICION_IVA_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Condición de pago</Label>
                      <Input
                        className="h-8 text-sm"
                        value={condicionPago}
                        onChange={(e) => setCondicionPago(e.target.value)}
                        placeholder="Ej: 30 días"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Lista de precios default</Label>
                      <Input
                        className="h-8 text-sm"
                        value={listaPreciosDefault}
                        onChange={(e) => setListaPreciosDefault(e.target.value)}
                        placeholder="Ej: OSDE"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Descuento habitual (%)</Label>
                      <Input
                        type="number"
                        className="h-8 text-sm"
                        value={descuentoHabitual || ""}
                        onChange={(e) => setDescuentoHabitual(Number(e.target.value) || 0)}
                        placeholder="0"
                        min={0}
                        max={100}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Médico (group-based) */}
              {groups.includes("medicos") && (
                <div className="rounded-lg border p-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">Médico</Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Matrícula</Label>
                      <Input
                        className="h-8 text-sm"
                        value={matricula}
                        onChange={(e) => setMatricula(e.target.value)}
                        placeholder="Ej: MN-78432"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Especialidad</Label>
                      <Input
                        className="h-8 text-sm"
                        value={especialidad}
                        onChange={(e) => setEspecialidad(e.target.value)}
                        placeholder="Ej: Ortopedia y Traumatología"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Institución (group-based) */}
              {groups.includes("instituciones") && (
                <div className="rounded-lg border p-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">Institución</Badge>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Observación de entrega</Label>
                    <Input
                      className="h-8 text-sm"
                      value={observacionEntrega}
                      onChange={(e) => setObservacionEntrega(e.target.value)}
                      placeholder="Instrucciones de entrega"
                    />
                  </div>
                </div>
              )}
            </div>
          </section>
        )}
      </div>

      {saveError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {saveError}
        </div>
      )}

      <DialogFooter className="gap-2 sm:gap-0">
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
        <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
          {saving ? (
            <Loader2 className="size-4 mr-1 animate-spin" />
          ) : (
            <Save className="size-4 mr-1" />
          )}
          {isEditing ? "Guardar Cambios" : "Crear Contacto"}
        </Button>
      </DialogFooter>
    </>
  )
}

// ═══════════════════════════════════════════════════════════════
// Wrapper component — uses key to force remount on contact change
// ═══════════════════════════════════════════════════════════════

export function ContactoFormDialog({
  open,
  onOpenChange,
  contacto,
  onSaved,
  defaultRoles,
  defaultGroups,
  initialValues,
}: ContactoFormDialogProps) {
  // Use contacto id (or "new") as key so form remounts with fresh state
  // when switching between create/edit or between different contacts
  const formKey = contacto?.id ?? "new"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
        <ContactoFormInner
          key={formKey}
          contacto={contacto}
          onSaved={onSaved}
          onOpenChange={onOpenChange}
          defaultRoles={defaultRoles}
          defaultGroups={defaultGroups}
          initialValues={initialValues}
        />
      </DialogContent>
    </Dialog>
  )
}
