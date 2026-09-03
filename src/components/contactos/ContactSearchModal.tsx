"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import { Check, ChevronDown, ChevronUp, CircleAlert, Loader2, Plus, Search } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth/AuthProvider"
import { ContactoFormDialog } from "@/components/contactos/ContactoFormDialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { listContacts, updateContactApi } from "@/lib/api/contacts"
import { mapApiContactListToContactos, mapApiContactToContacto } from "@/lib/api/contact-adapter"
import {
  ALL_CONTACT_ROLES,
  CONTACT_ROLE_BADGE_COLORS,
  CONTACT_ROLE_LABELS,
  type ContactSearchContext,
  getGroupById,
  getGroupLabel,
  getGroupsForRole,
  GROUP_BADGE_COLORS,
} from "@/lib/contacts.constants"
import { cn } from "@/lib/utils"
import type { Contacto } from "@/types"

interface ContactSearchModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  context: ContactSearchContext
  onSelect: (contacto: Contacto) => void
}

export function ContactSearchModal({ open, onOpenChange, context, onSelect }: ContactSearchModalProps) {
  const { activeCompany } = useAuth()
  const companyId = activeCompany?.id
  const requestRef = useRef(0)
  const mutationRef = useRef(0)
  const companyIdRef = useRef(companyId)
  const openRef = useRef(open)
  const [query, setQuery] = useState("")
  const [contacts, setContacts] = useState<Contacto[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [expanded, setExpanded] = useState(false)
  const [groupFilter, setGroupFilter] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [addingGroupId, setAddingGroupId] = useState<string | null>(null)

  useEffect(() => {
    const companyChanged = companyIdRef.current !== companyId
    companyIdRef.current = companyId
    mutationRef.current += 1
    if (companyChanged) {
      setFormOpen(false)
      setAddingGroupId(null)
    }
  }, [companyId])
  useEffect(() => {
    openRef.current = open
    if (!open) mutationRef.current += 1
  }, [open])

  const load = async (search = query) => {
    const requestId = ++requestRef.current
    if (!companyId) {
      setContacts([])
      setLoading(false)
      setError("Seleccioná una empresa activa para buscar contactos.")
      return
    }
    setLoading(true)
    setError("")
    try {
      const role = !expanded && context.allowedRoles?.length === 1 ? context.allowedRoles[0] : undefined
      const result: Awaited<ReturnType<typeof listContacts>> = []
      for (let skip = 0; ; skip += 100) {
        const page = await listContacts(companyId, { search: search.trim() || undefined, role, take: 100, ...(skip ? { skip } : {}) })
        result.push(...page)
        if (page.length < 100) break
      }
      if (requestId === requestRef.current) setContacts(mapApiContactListToContactos(result))
    } catch (cause) {
      if (requestId === requestRef.current) setError(cause instanceof Error ? cause.message : "No se pudieron cargar los contactos.")
    } finally {
      if (requestId === requestRef.current) setLoading(false)
    }
  }

  useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => { void load(query) }, query ? 220 : 0)
    return () => { window.clearTimeout(timer); requestRef.current += 1 }
    // load intentionally follows the current search/context inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, context.allowedRoles, expanded, open, query])

  const contextGroups = useMemo(() => (context.allowedRoles ?? ALL_CONTACT_ROLES).flatMap(getGroupsForRole), [context.allowedRoles])
  const results = useMemo(() => {
    const allowedRoles = expanded ? undefined : context.allowedRoles
    const allowedGroups = expanded ? undefined : context.allowedGroups
    const filtered = contacts.filter((contact) => {
      if (contact.estado !== "activo") return false
      if (allowedRoles?.length && !contact.roles.some((role) => allowedRoles.includes(role))) return false
      if (allowedGroups?.length && !contact.groups.some((group) => allowedGroups.includes(group))) return false
      if (groupFilter && !contact.groups.includes(groupFilter)) return false
      return true
    })
    return filtered.sort((a, b) => {
      const score = (contact: Contacto) => Number(contact.groups.some((group) => context.preferredGroups.includes(group))) * 2 + Number(contact.roles.some((role) => context.preferredRoles.includes(role)))
      return score(b) - score(a) || a.nombre.localeCompare(b.nombre, "es")
    })
  }, [contacts, context.allowedGroups, context.allowedRoles, context.preferredGroups, context.preferredRoles, expanded, groupFilter])

  const close = () => { requestRef.current += 1; mutationRef.current += 1; setQuery(""); setExpanded(false); setGroupFilter(null); onOpenChange(false) }
  const select = (contact: Contacto) => { onSelect(contact); close() }

  const addGroupAndSelect = async (contact: Contacto, group: string) => {
    if (!companyId) { setError("Seleccioná una empresa activa para actualizar el contacto."); return }
    setAddingGroupId(contact.id)
    const requestId = ++mutationRef.current
    const requestCompanyId = companyId
    try {
      const response = await updateContactApi(requestCompanyId, contact.id, { groupSlugs: [...new Set([...contact.groups, group])] })
      if (requestId !== mutationRef.current || companyIdRef.current !== requestCompanyId || !openRef.current) return
      const canonical = mapApiContactToContacto(response)
      toast.success(`Grupo "${getGroupLabel(group)}" agregado a ${canonical.nombre}`)
      select(canonical)
    } catch (cause) {
      if (requestId !== mutationRef.current || companyIdRef.current !== requestCompanyId || !openRef.current) return
      setError(cause instanceof Error ? cause.message : "No se pudo actualizar el grupo del contacto.")
    } finally {
      if (requestId === mutationRef.current) setAddingGroupId(null)
    }
  }

  return <>
    <Dialog open={open} onOpenChange={(nextOpen) => { if (nextOpen) onOpenChange(true); else close() }}>
      <DialogContent className="flex h-[min(44rem,calc(100dvh-1rem))] w-[calc(100vw-1rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:w-[calc(100vw-2rem)]">
        <DialogHeader className="shrink-0 border-b border-[var(--ossum-line)] bg-white px-4 py-3 sm:px-5">
          <DialogTitle className="text-base text-[var(--ossum-navy)]">{context.title}</DialogTitle>
          <DialogDescription className="text-xs">Buscá en los contactos activos de la empresa seleccionada.</DialogDescription>
        </DialogHeader>

        <div className="shrink-0 space-y-2 border-b border-[var(--ossum-line)] bg-white px-4 py-3">
          <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" /><Input autoFocus aria-label="Buscar contactos" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Código, nombre, CUIT o DNI…" className="h-11 pl-9 text-sm sm:h-8 sm:text-xs" /></div>
          {contextGroups.length > 0 && <div className="flex flex-wrap gap-1">{contextGroups.map((group) => <button key={group.id} type="button" aria-pressed={groupFilter === group.id} onClick={() => setGroupFilter((current) => current === group.id ? null : group.id)} className={cn("h-8 border px-2 text-xs transition-[background-color,border-color,color] motion-reduce:transition-none", groupFilter === group.id ? "border-[var(--ossum-action)] bg-[#eef0ff] text-[var(--ossum-action)]" : "border-[var(--ossum-line)] bg-white text-gray-600 hover:bg-[var(--ossum-surface-2)]")}>{group.nombre}</button>)}</div>}
          {context.allowExpandedSearch && context.allowedRoles?.length && context.allowedRoles.length < ALL_CONTACT_ROLES.length ? <button type="button" onClick={() => setExpanded((value) => !value)} className="inline-flex h-8 items-center gap-1 text-xs text-gray-500 hover:text-gray-800">{expanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}{expanded ? "Restringir al contexto" : "Ampliar a todos los contactos"}</button> : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--ossum-surface)] p-3" aria-live="polite">
          {loading ? <div className="flex h-full items-center justify-center gap-2 text-sm text-gray-500" role="status"><Loader2 className="size-4 animate-spin motion-reduce:animate-none" />Cargando contactos…</div>
            : error ? <div className="flex h-full flex-col items-center justify-center gap-3 text-center" role="alert"><CircleAlert className="size-5 text-destructive" /><div><p className="text-sm font-medium">No se pudieron cargar los contactos</p><p className="mt-1 max-w-sm text-xs text-gray-500">{error}</p></div>{companyId && <Button type="button" variant="outline" size="sm" onClick={() => void load()} className="h-11 sm:h-8">Reintentar</Button>}</div>
            : results.length === 0 ? <div className="flex h-full flex-col items-center justify-center text-center"><p className="text-sm font-medium">No se encontraron contactos</p><p className="mt-1 text-xs text-gray-500">Probá otro texto o ampliá la búsqueda.</p></div>
            : <ul className="divide-y divide-[var(--ossum-line)] border border-[var(--ossum-line)] bg-white">{results.map((contact) => {
              const missingPreferred = context.preferredGroups.length > 0 && !contact.groups.some((group) => context.preferredGroups.includes(group)) ? context.preferredGroups[0] : undefined
              return <li key={contact.id} className="flex items-start justify-between gap-3 px-3 py-2 hover:bg-[var(--ossum-surface-2)]">
                <div className="min-w-0"><div className="flex items-center gap-2"><span className="shrink-0 font-mono text-xs font-semibold text-[var(--ossum-action)]">{contact.codigoContacto}</span><span className="truncate text-sm font-medium">{contact.nombre}</span></div><p className="mt-0.5 text-xs text-gray-500">{contact.cuit || contact.dni || contact.localidad || "Sin documento informado"}</p><div className="mt-1 flex flex-wrap gap-1">{contact.roles.map((role) => <Badge key={role} variant="outline" className={cn("h-4 px-1.5 text-[9px]", CONTACT_ROLE_BADGE_COLORS[role])}>{CONTACT_ROLE_LABELS[role]}</Badge>)}{contact.groups.map((group) => { const role = getGroupById(group)?.role ?? contact.roles[0] ?? "cliente"; return <Badge key={group} variant="outline" className={cn("h-4 px-1.5 text-[9px]", GROUP_BADGE_COLORS[role])}>{getGroupLabel(group)}</Badge> })}</div></div>
                {missingPreferred && !expanded ? <Button type="button" variant="outline" size="sm" disabled={addingGroupId === contact.id} onClick={() => void addGroupAndSelect(contact, missingPreferred)} className="h-11 shrink-0 text-xs sm:h-8">{addingGroupId === contact.id ? "Actualizando…" : `Agregar ${getGroupLabel(missingPreferred)}`}</Button> : <Button type="button" size="sm" onClick={() => select(contact)} className="h-11 shrink-0 bg-[var(--ossum-action)] text-xs text-white hover:bg-[#1830a8] sm:h-8"><Check className="size-3" />Seleccionar</Button>}
              </li>
            })}</ul>}
        </div>

        <footer className="flex shrink-0 items-center justify-between gap-2 border-t border-[var(--ossum-line)] bg-white px-4 py-3"><span className="text-xs text-gray-500">{!loading && !error ? `${results.length} resultado${results.length === 1 ? "" : "s"}` : ""}</span><div className="flex gap-2"><Button type="button" variant="outline" onClick={close} className="h-11 sm:h-8">Cancelar</Button>{context.allowCreate && <Button type="button" disabled={!companyId} onClick={() => setFormOpen(true)} className="h-11 bg-[var(--ossum-action)] text-white hover:bg-[#1830a8] sm:h-8"><Plus className="size-3.5" />Nuevo contacto</Button>}</div></footer>
      </DialogContent>
    </Dialog>

    <ContactoFormDialog open={formOpen} onOpenChange={setFormOpen} defaultRoles={context.createDefaults?.roles} defaultGroups={context.createDefaults?.groups} onSaved={(contact) => { setFormOpen(false); select(contact) }} />
  </>
}
