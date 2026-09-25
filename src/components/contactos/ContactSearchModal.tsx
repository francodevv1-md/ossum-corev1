import React, { useEffect, useMemo, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Check, ChevronDown, ChevronUp, CircleAlert, Loader2, Pencil, Plus, Search, X, User } from "lucide-react"
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
  const [editingContact, setEditingContact] = useState<Contacto | null>(null)
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
      <DialogContent
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        className="flex h-[min(44rem,calc(100dvh-1rem))] w-[calc(100vw-1rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:w-[calc(100vw-2rem)] border-slate-200/90 shadow-2xl dark:border-slate-800"
      >
        <DialogHeader className="shrink-0 border-b border-slate-200/90 bg-white/95 px-4 py-3 sm:px-5 dark:border-slate-800 dark:bg-slate-950/95 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">{context.title}</DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">Buscá en los contactos activos de la empresa seleccionada.</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="shrink-0 space-y-2.5 border-b border-slate-200/90 bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              autoFocus
              aria-label="Buscar contactos"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Código, nombre, CUIT o DNI…"
              className="h-10 pl-9 pr-8 text-sm sm:h-8 sm:text-xs rounded-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-2xs focus-visible:ring-1 focus-visible:ring-blue-500"
            />
            {query.trim() && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                title="Limpiar búsqueda"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {contextGroups.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {contextGroups.map((group) => {
                const isActive = groupFilter === group.id
                return (
                  <motion.button
                    key={group.id}
                    type="button"
                    whileTap={{ scale: 0.95 }}
                    aria-pressed={isActive}
                    onClick={() => setGroupFilter((current) => current === group.id ? null : group.id)}
                    className={cn(
                      "relative h-7 rounded-full border px-2.5 text-xs font-medium transition-all select-none",
                      isActive
                        ? "border-blue-600 bg-blue-50 text-blue-700 font-semibold shadow-2xs dark:border-blue-500 dark:bg-blue-950/50 dark:text-blue-300"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                    )}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="active-contact-group-pill"
                        className="absolute inset-0 rounded-full bg-blue-500/10 pointer-events-none"
                        transition={{ type: "spring", stiffness: 450, damping: 35 }}
                      />
                    )}
                    <span className="relative z-10">{group.nombre}</span>
                  </motion.button>
                )
              })}
            </div>
          )}

          {context.allowExpandedSearch && context.allowedRoles?.length && context.allowedRoles.length < ALL_CONTACT_ROLES.length ? (
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              className="inline-flex h-6 items-center gap-1 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
            >
              {expanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
              {expanded ? "Restringir al contexto" : "Ampliar a todos los contactos"}
            </button>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-100/50 p-3 dark:bg-slate-950/70" aria-live="polite">
          {loading ? (
            <div className="flex h-full items-center justify-center gap-2 text-sm text-slate-500" role="status">
              <Loader2 className="size-4 animate-spin text-blue-600" />
              Cargando contactos…
            </div>
          ) : error ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center" role="alert">
              <CircleAlert className="size-5 text-destructive" />
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">No se pudieron cargar los contactos</p>
                <p className="mt-1 max-w-sm text-xs text-slate-500">{error}</p>
              </div>
              {companyId && (
                <Button type="button" variant="outline" size="sm" onClick={() => void load()} className="h-8">
                  Reintentar
                </Button>
              )}
            </div>
          ) : results.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <User className="size-8 text-slate-300 dark:text-slate-700 mb-2" />
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">No se encontraron contactos</p>
              <p className="mt-1 text-xs text-slate-500">Probá otro texto o ampliá la búsqueda.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-200/90 rounded-md border border-slate-200/90 bg-white shadow-2xs dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
              <AnimatePresence mode="popLayout">
                {results.map((contact) => {
                  const missingPreferred = context.preferredGroups.length > 0 && !contact.groups.some((group) => context.preferredGroups.includes(group)) ? context.preferredGroups[0] : undefined
                  return (
                    <motion.li
                      key={contact.id}
                      layout
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.12 }}
                      className="flex items-start justify-between gap-3 px-3.5 py-2.5 transition-colors hover:bg-slate-50/90 dark:hover:bg-slate-800/60"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="shrink-0 font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
                            {contact.codigoContacto}
                          </span>
                          <span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {contact.nombre}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          {contact.cuit || contact.dni || contact.localidad || "Sin documento informado"}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {contact.roles.map((role) => (
                            <Badge key={role} variant="outline" className={cn("h-4 px-1.5 text-[9px] rounded-sm", CONTACT_ROLE_BADGE_COLORS[role])}>
                              {CONTACT_ROLE_LABELS[role]}
                            </Badge>
                          ))}
                          {contact.groups.map((group) => {
                            const role = getGroupById(group)?.role ?? contact.roles[0] ?? "cliente"
                            return (
                              <Badge key={group} variant="outline" className={cn("h-4 px-1.5 text-[9px] rounded-sm", GROUP_BADGE_COLORS[role])}>
                                {getGroupLabel(group)}
                              </Badge>
                            )
                          })}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-label={`Editar ${contact.nombre}`}
                          title="Editar contacto"
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingContact(contact)
                            setFormOpen(true)
                          }}
                          className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50"
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        {missingPreferred && !expanded ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={addingGroupId === contact.id}
                            onClick={() => void addGroupAndSelect(contact, missingPreferred)}
                            className="h-8 shrink-0 text-xs font-medium border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                          >
                            {addingGroupId === contact.id ? "Actualizando…" : `Agregar ${getGroupLabel(missingPreferred)}`}
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => select(contact)}
                            className="h-8 shrink-0 bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700 shadow-xs"
                          >
                            <Check className="size-3.5 mr-1" />
                            Seleccionar
                          </Button>
                        )}
                      </div>
                    </motion.li>
                  )
                })}
              </AnimatePresence>
            </ul>
          )}
        </div>

        <footer className="flex shrink-0 items-center justify-between gap-2 border-t border-slate-200/90 bg-white px-4 py-2.5 dark:border-slate-800 dark:bg-slate-950">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {!loading && !error ? `${results.length} resultado${results.length === 1 ? "" : "s"}` : ""}
          </span>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={close} className="h-8">
              Cancelar
            </Button>
            {context.allowCreate && (
              <Button
                type="button"
                size="sm"
                disabled={!companyId}
                onClick={() => {
                  setEditingContact(null)
                  setFormOpen(true)
                }}
                className="h-8 bg-blue-600 text-white hover:bg-blue-700 shadow-xs"
              >
                <Plus className="size-3.5 mr-1" />
                Nuevo contacto
              </Button>
            )}
          </div>
        </footer>
      </DialogContent>
    </Dialog>

    <ContactoFormDialog
      open={formOpen}
      onOpenChange={(isOpen) => {
        setFormOpen(isOpen)
        if (!isOpen) setEditingContact(null)
      }}
      contacto={editingContact}
      defaultRoles={context.createDefaults?.roles}
      defaultGroups={context.createDefaults?.groups}
      onSaved={(contact) => {
        setFormOpen(false)
        setEditingContact(null)
        setContacts((prev) => {
          const idx = prev.findIndex((c) => c.id === contact.id)
          if (idx >= 0) {
            const next = [...prev]
            next[idx] = contact
            return next
          }
          return [contact, ...prev]
        })
        select(contact)
      }}
    />
  </>
}

