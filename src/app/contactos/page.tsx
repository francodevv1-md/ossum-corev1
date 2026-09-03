"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { CircleAlert, Pencil, Plus, RefreshCw, Search, ToggleLeft, ToggleRight, Users, X } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth/AuthProvider"
import { ContactoFormDialog } from "@/components/contactos/ContactoFormDialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { listContacts, updateContactApi } from "@/lib/api/contacts"
import { mapApiContactListToContactos, mapApiContactToContacto } from "@/lib/api/contact-adapter"
import { CONTACT_GROUPS, CONTACT_ROLE_BADGE_COLORS, CONTACT_ROLE_LABELS, getGroupById, getGroupLabel, GROUP_BADGE_COLORS } from "@/lib/contacts.constants"
import { cn } from "@/lib/utils"
import type { Contacto, ContactRole } from "@/types"

type StatusFilter = "todos" | "activos" | "inactivos"
const ROLE_OPTIONS: Array<{ value: ContactRole | "all"; label: string }> = [{ value: "all", label: "Todos los roles" }, { value: "cliente", label: "Cliente" }, { value: "proveedor", label: "Proveedor" }, { value: "interno", label: "Interno" }]
const selectClass = "h-11 rounded-md border border-[var(--ossum-line)] bg-white px-3 text-sm transition-[border-color,box-shadow] focus:outline-none focus:ring-2 focus:ring-[var(--ossum-action)]/30 motion-reduce:transition-none sm:h-8 sm:px-2 sm:text-xs"

export default function ContactosPage() {
  const { activeCompany } = useAuth()
  const companyId = activeCompany?.id
  const requestRef = useRef(0)
  const statusMutationRef = useRef(0)
  const companyIdRef = useRef(companyId)
  const [contacts, setContacts] = useState<Contacto[]>([])
  const [contactsCompanyId, setContactsCompanyId] = useState(companyId)
  const [loading, setLoading] = useState(Boolean(companyId))
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState("")
  const [query, setQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<ContactRole | "all">("all")
  const [groupFilter, setGroupFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("activos")
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Contacto | null>(null)
  const [confirming, setConfirming] = useState<Contacto | null>(null)
  const [statusSaving, setStatusSaving] = useState(false)

  useEffect(() => {
    const companyChanged = companyIdRef.current !== companyId
    companyIdRef.current = companyId
    statusMutationRef.current += 1
    if (companyChanged) {
      setConfirming(null)
      setStatusSaving(false)
      setEditing(null)
      setFormOpen(false)
    }
  }, [companyId])

  const loadContacts = useCallback(async (clearRows = false) => {
    const requestId = ++requestRef.current
    if (!companyId) {
      setContacts([])
      setContactsCompanyId(undefined)
      setLoading(false)
      setLoaded(false)
      setLoadError("")
      return
    }
    if (clearRows) { setContacts([]); setContactsCompanyId(companyId); setLoaded(false) }
    setLoading(true)
    setLoadError("")
    try {
      const response: Awaited<ReturnType<typeof listContacts>> = []
      for (let skip = 0; ; skip += 500) {
        const page = await listContacts(companyId, { includeInactive: true, take: 500, ...(skip ? { skip } : {}) })
        response.push(...page)
        if (page.length < 500) break
      }
      if (requestId === requestRef.current) { setContacts(mapApiContactListToContactos(response)); setContactsCompanyId(companyId); setLoaded(true) }
    } catch (cause) {
      if (requestId === requestRef.current) { setLoadError(cause instanceof Error ? cause.message : "No se pudieron cargar los contactos."); setLoaded(true) }
    } finally {
      if (requestId === requestRef.current) setLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    void Promise.resolve().then(() => loadContacts(true))
    return () => { requestRef.current += 1; statusMutationRef.current += 1 }
  }, [loadContacts])

  const availableGroups = useMemo(() => CONTACT_GROUPS.filter((group) => group.activo && (roleFilter === "all" || group.role === roleFilter)), [roleFilter])
  const companyContacts = useMemo(() => contactsCompanyId === companyId ? contacts : [], [companyId, contacts, contactsCompanyId])
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return companyContacts.filter((contact) => {
      if (statusFilter === "activos" && contact.estado !== "activo") return false
      if (statusFilter === "inactivos" && contact.estado !== "inactivo") return false
      if (roleFilter !== "all" && !contact.roles.includes(roleFilter)) return false
      if (groupFilter !== "all" && !contact.groups.includes(groupFilter)) return false
      if (normalized && ![contact.codigoContacto, contact.nombre, contact.nombreFantasia, contact.razonSocial, contact.cuit, contact.dni, contact.email].filter(Boolean).some((value) => value?.toLowerCase().includes(normalized))) return false
      return true
    }).sort((a, b) => a.codigoContacto.localeCompare(b.codigoContacto))
  }, [companyContacts, groupFilter, query, roleFilter, statusFilter])
  const hasFilters = Boolean(query || roleFilter !== "all" || groupFilter !== "all" || statusFilter !== "todos")
  const activeCount = companyContacts.filter((contact) => contact.estado === "activo").length
  const inactiveCount = companyContacts.length - activeCount

  const clearFilters = () => { setQuery(""); setRoleFilter("all"); setGroupFilter("all"); setStatusFilter("todos") }
  const handleSaved = (canonical: Contacto) => {
    setContactsCompanyId(companyId)
    setContacts((current) => current.some((contact) => contact.id === canonical.id) ? current.map((contact) => contact.id === canonical.id ? canonical : contact) : [...current, canonical])
    setEditing(null)
    setFormOpen(false)
  }
  const toggleStatus = async () => {
    if (!confirming || !companyId) return
    const requestId = ++statusMutationRef.current
    const requestCompanyId = companyId
    setStatusSaving(true)
    try {
      const response = await updateContactApi(requestCompanyId, confirming.id, { isActive: confirming.estado !== "activo" })
      if (requestId !== statusMutationRef.current || companyIdRef.current !== requestCompanyId) return
      const canonical = mapApiContactToContacto(response)
      setContacts((current) => current.map((contact) => contact.id === canonical.id ? canonical : contact))
      toast.success(`Contacto ${canonical.codigoContacto} ${canonical.estado === "activo" ? "reactivado" : "inactivado"}`)
      setConfirming(null)
    } catch (cause) {
      if (requestId !== statusMutationRef.current || companyIdRef.current !== requestCompanyId) return
      toast.error(cause instanceof Error ? cause.message : "No se pudo cambiar el estado del contacto.")
    } finally {
      if (requestId === statusMutationRef.current) setStatusSaving(false)
    }
  }

  return <div className="flex h-full min-h-0 flex-col bg-[var(--ossum-surface)]">
    <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--ossum-line)] bg-white px-4 py-2">
      <div><h1 className="text-base font-semibold text-[var(--ossum-navy)]">Contactos</h1><p className="text-[11px] text-gray-400">{companyContacts.length} total · {activeCount} activos · {inactiveCount} inactivos</p></div>
      <Button type="button" size="sm" disabled={!companyId} onClick={() => { setEditing(null); setFormOpen(true) }} className="h-11 bg-[var(--ossum-action)] text-sm text-white transition-[background-color] motion-reduce:transition-none hover:bg-[#1830a8] sm:h-8 sm:text-xs"><Plus className="size-3.5" />Nuevo contacto</Button>
    </header>

    <div className="shrink-0 border-b border-[var(--ossum-line)] bg-white px-4 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1 sm:max-w-xs"><Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-gray-400" /><Input aria-label="Buscar contactos" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Código, nombre, CUIT o DNI…" className="h-11 pl-8 pr-8 text-sm sm:h-8 sm:text-xs" />{query && <button type="button" aria-label="Limpiar búsqueda" onClick={() => setQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"><X className="size-3.5" /></button>}</div>
        <select aria-label="Filtrar por rol" value={roleFilter} onChange={(event) => { setRoleFilter(event.target.value as typeof roleFilter); setGroupFilter("all") }} className={selectClass}>{ROLE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
        <select aria-label="Filtrar por grupo" value={groupFilter} onChange={(event) => setGroupFilter(event.target.value)} className={selectClass}><option value="all">Todos los grupos</option>{availableGroups.map((group) => <option key={group.id} value={group.id}>{group.nombre}</option>)}</select>
        <select aria-label="Filtrar por estado" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} className={selectClass}><option value="todos">Todos los estados</option><option value="activos">Activos</option><option value="inactivos">Inactivos</option></select>
        {hasFilters && <Button type="button" variant="ghost" size="sm" onClick={clearFilters} className="h-11 text-xs sm:h-8">Limpiar filtros</Button>}
        <Button type="button" variant="outline" size="sm" disabled={!companyId || loading} onClick={() => void loadContacts(false)} className="ml-auto h-11 text-xs sm:h-8"><RefreshCw className={cn("size-3.5", loading && "animate-spin motion-reduce:animate-none")} />Actualizar</Button>
      </div>
      {loadError && companyContacts.length > 0 && <div role="alert" className="mt-2 flex items-center justify-between gap-3 border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800"><span>No se pudo actualizar: {loadError}. Se mantienen los contactos cargados.</span><button type="button" onClick={() => void loadContacts(false)} className="font-medium underline">Reintentar</button></div>}
    </div>

    <main className="flex min-h-0 flex-1 flex-col">
      {!companyId ? <State icon={Users} title="No hay una empresa activa" detail="Seleccioná una empresa para consultar su maestro de contactos." />
        : loading && !loaded ? <State icon={RefreshCw} title="Cargando contactos…" detail="Consultando el maestro de la empresa activa." loading />
        : loadError && companyContacts.length === 0 ? <State icon={CircleAlert} title="No se pudieron cargar los contactos" detail={loadError} action="Reintentar" onAction={() => void loadContacts(true)} alert />
        : companyContacts.length === 0 ? <State icon={Users} title="Todavía no hay contactos" detail="Creá el primer contacto para esta empresa." action="Nuevo contacto" onAction={() => setFormOpen(true)} />
        : filtered.length === 0 ? <State icon={Search} title="No se encontraron contactos" detail="Probá otro texto o quitá los filtros activos." action="Limpiar filtros" onAction={clearFilters} />
        : <div className="m-3 min-h-0 flex-1 overflow-hidden border border-[var(--ossum-line)] bg-white"><div className="h-full overflow-auto"><table className="w-full min-w-[980px] border-separate border-spacing-0 text-xs"><thead><tr>{["Código", "Nombre / razón social", "CUIT / DNI", "Localidad", "Roles", "Grupos", "Estado", "Acciones"].map((label) => <th key={label} className="sticky top-0 z-10 whitespace-nowrap bg-[var(--ossum-navy)] px-3 py-2 text-left font-medium text-white">{label}</th>)}</tr></thead><tbody>{filtered.map((contact) => <tr key={contact.id} className="group hover:bg-[var(--ossum-surface-2)]"><td className="border-b border-[var(--ossum-line)] px-3 py-1.5 font-mono font-semibold text-[var(--ossum-action)]">{contact.codigoContacto}</td><td className="border-b border-[var(--ossum-line)] px-3 py-1.5"><p className="font-medium text-gray-900">{contact.nombre}</p>{contact.nombreFantasia && <p className="text-[11px] text-gray-400">{contact.nombreFantasia}</p>}</td><td className="border-b border-[var(--ossum-line)] px-3 py-1.5 font-mono text-gray-600">{contact.cuit || contact.dni || "—"}</td><td className="border-b border-[var(--ossum-line)] px-3 py-1.5 text-gray-600">{contact.localidad || "—"}</td><td className="border-b border-[var(--ossum-line)] px-3 py-1.5"><div className="flex flex-wrap gap-1">{contact.roles.map((role) => <Badge key={role} variant="outline" className={cn("h-4 px-1.5 text-[9px]", CONTACT_ROLE_BADGE_COLORS[role])}>{CONTACT_ROLE_LABELS[role]}</Badge>)}</div></td><td className="border-b border-[var(--ossum-line)] px-3 py-1.5"><div className="flex flex-wrap gap-1">{contact.groups.map((group) => { const role = getGroupById(group)?.role ?? contact.roles[0] ?? "cliente"; return <Badge key={group} variant="outline" className={cn("h-4 px-1.5 text-[9px]", GROUP_BADGE_COLORS[role])}>{getGroupLabel(group)}</Badge> })}</div></td><td className="border-b border-[var(--ossum-line)] px-3 py-1.5"><span className="inline-flex items-center gap-1.5"><span className={cn("size-2 rounded-full", contact.estado === "activo" ? "bg-sky-500" : "bg-gray-300")} />{contact.estado === "activo" ? "Activo" : "Inactivo"}</span></td><td className="border-b border-[var(--ossum-line)] px-2 py-1"><div className="flex gap-1"><Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => { setEditing(contact); setFormOpen(true) }} aria-label={`Editar ${contact.nombre}`}><Pencil className="size-3.5" /></Button><Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => setConfirming(contact)} aria-label={`${contact.estado === "activo" ? "Inactivar" : "Reactivar"} ${contact.nombre}`}>{contact.estado === "activo" ? <ToggleLeft className="size-4 text-amber-600" /> : <ToggleRight className="size-4 text-[var(--ossum-action)]" />}</Button></div></td></tr>)}</tbody></table></div></div>}
    </main>

    <ContactoFormDialog open={formOpen} onOpenChange={(open) => { setFormOpen(open); if (!open) setEditing(null) }} contacto={editing} onSaved={handleSaved} />
    <AlertDialog open={Boolean(confirming)} onOpenChange={(open) => { if (!open && !statusSaving) setConfirming(null) }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{confirming?.estado === "activo" ? "Inactivar contacto" : "Reactivar contacto"}</AlertDialogTitle><AlertDialogDescription>{confirming?.estado === "activo" ? `El contacto ${confirming?.nombre} dejará de aparecer en búsquedas activas, pero no será eliminado.` : `El contacto ${confirming?.nombre} volverá a estar disponible en las búsquedas.`}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={statusSaving}>Cancelar</AlertDialogCancel><AlertDialogAction disabled={statusSaving} onClick={(event) => { event.preventDefault(); void toggleStatus() }} className="bg-[var(--ossum-action)] text-white hover:bg-[#1830a8]">{statusSaving ? "Guardando…" : "Confirmar"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>
}

function State({ icon: Icon, title, detail, action, onAction, loading, alert }: { icon: typeof Users; title: string; detail: string; action?: string; onAction?: () => void; loading?: boolean; alert?: boolean }) {
  return <div className="flex flex-1 flex-col items-center justify-center gap-3 px-5 py-10 text-center" role={alert ? "alert" : loading ? "status" : undefined}><Icon className={cn("size-5 text-gray-400", loading && "animate-spin motion-reduce:animate-none", alert && "text-destructive")} /><div><p className="text-sm font-medium">{title}</p><p className="mt-1 max-w-sm text-xs text-gray-500">{detail}</p></div>{action && <Button type="button" variant="outline" size="sm" onClick={onAction} className="h-11 sm:h-8">{action}</Button>}</div>
}
