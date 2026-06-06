"use client"

import React, { useState, useMemo, useCallback } from "react"
import { useOrtoTrackStore } from "@/lib/store"
import type { Contacto, ContactRole } from "@/types"
import {
  ContactSearchContext,
  CONTACT_ROLE_LABELS,
  CONTACT_ROLE_BADGE_COLORS,
  ALL_CONTACT_ROLES,
  getGroupLabel,
  getGroupsForRole,
  getGroupById,
  GROUP_BADGE_COLORS,
} from "@/lib/contacts.constants"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { Search, Plus, Check, ChevronDown, ChevronUp } from "lucide-react"
import { ContactoFormDialog } from "./ContactoFormDialog"

// ═══════════════════════════════════════════════════════════════
// Props
// ═══════════════════════════════════════════════════════════════

interface ContactSearchModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Context configuration (DC-CT-017) */
  context: ContactSearchContext
  /** Called when a contact is selected */
  onSelect: (contacto: Contacto) => void
}

// ═══════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════

export function ContactSearchModal({
  open,
  onOpenChange,
  context,
  onSelect,
}: ContactSearchModalProps) {
  const store = useOrtoTrackStore()

  const [searchQuery, setSearchQuery] = useState("")
  const [expandedSearch, setExpandedSearch] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [formKey, setFormKey] = useState(0)
  // CHATZAI-025A.5-fix: Track selected category group for filtering
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string | null>(null)

  // Determine effective roles/groups for filtering
  // CHATZAI-025A.5-fix: selectedGroupFilter overrides preferredGroups when set
  const effectiveRoles = expandedSearch ? undefined : context.allowedRoles
  const effectiveGroups = expandedSearch
    ? undefined
    : selectedGroupFilter
      ? [selectedGroupFilter]
      : context.preferredGroups

  // Search results — prioritize by preferred groups
  const results = useMemo(() => {
    const base = store.searchContactos(searchQuery, effectiveRoles?.[0], effectiveGroups)
    if (!searchQuery.trim() && !effectiveGroups) {
      // No search and no group filter: show all for allowed roles
      return store.searchContactos("", effectiveRoles?.[0])
    }
    return base
  }, [store, searchQuery, effectiveRoles, effectiveGroups, expandedSearch])

  // Sort results: preferred groups first
  const sortedResults = useMemo(() => {
    if (!context.preferredGroups.length) return results
    return [...results].sort((a, b) => {
      const aInPreferred = a.groups.some((g) => context.preferredGroups.includes(g))
      const bInPreferred = b.groups.some((g) => context.preferredGroups.includes(g))
      if (aInPreferred && !bInPreferred) return -1
      if (!aInPreferred && bInPreferred) return 1
      return 0
    })
  }, [results, context.preferredGroups])

  // Available group categories for the context
  const contextGroups = useMemo(() => {
    const roles = context.allowedRoles || ALL_CONTACT_ROLES
    return roles.flatMap((r) => getGroupsForRole(r))
  }, [context.allowedRoles])

  // Reset on open
  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (nextOpen) {
      setSearchQuery("")
      setExpandedSearch(false)
      setSelectedGroupFilter(null) // CHATZAI-025A.5-fix: Reset category filter
    }
    onOpenChange(nextOpen)
  }, [onOpenChange])

  // Handle select
  const handleSelect = (contacto: Contacto) => {
    onSelect(contacto)
    handleOpenChange(false)
  }

  // Handle add group and select (if contact doesn't have preferred group)
  const handleAddGroupAndSelect = (contacto: Contacto, groupId: string) => {
    store.addGroupToContacto(contacto.id, groupId)
    toast.success(`Grupo "${getGroupLabel(groupId)}" agregado a ${contacto.nombre}`)
    const updated = store.getContactoById(contacto.id)
    if (updated) {
      onSelect(updated)
    }
    handleOpenChange(false)
  }

  // Handle create
  const handleCreated = (newContacto: Contacto) => {
    setFormOpen(false)
    onSelect(newContacto)
    handleOpenChange(false)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Search className="size-5" />
              {context.title}
            </DialogTitle>
            <DialogDescription>
              Busque por código, nombre, CUIT o DNI y seleccione un contacto
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                className="h-8 text-sm pl-8"
                placeholder="Buscar por código, nombre, CUIT..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>

            {/* Context group categories */}
            {contextGroups.length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  Categorías
                </p>
                <div className="flex flex-wrap gap-1">
                  {contextGroups.map((group) => (
                    <button
                      key={group.id}
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-medium border transition-colors",
                        GROUP_BADGE_COLORS[group.role],
                        // CHATZAI-025A.5-fix: Highlight the selected group
                        selectedGroupFilter === group.id
                          ? "ring-2 ring-primary/60 bg-primary/10"
                          : context.preferredGroups.includes(group.id)
                            ? "ring-1 ring-primary/40"
                            : ""
                      )}
                      onClick={() => {
                        setSearchQuery("")
                        setExpandedSearch(false)
                        // CHATZAI-025A.5-fix: Toggle group filter — click again to clear
                        setSelectedGroupFilter((prev) => prev === group.id ? null : group.id)
                      }}
                    >
                      {group.nombre}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Expanded search toggle */}
            {context.allowExpandedSearch && context.allowedRoles && context.allowedRoles.length < ALL_CONTACT_ROLES.length && (
              <button
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setExpandedSearch(!expandedSearch)}
              >
                {expandedSearch ? (
                  <><ChevronUp className="size-3" /> Restringir búsqueda a {context.allowedRoles.map((r) => CONTACT_ROLE_LABELS[r]).join(", ")}</>
                ) : (
                  <><ChevronDown className="size-3" /> Ampliar búsqueda a todos los contactos</>
                )}
              </button>
            )}

            {/* Results */}
            <div className="max-h-96 overflow-y-auto space-y-1.5 rounded-md border p-2">
              {sortedResults.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-sm">
                  No se encontraron contactos
                </div>
              ) : (
                sortedResults.map((contacto) => {
                  const isInPreferredGroup = contacto.groups.some((g) => context.preferredGroups.includes(g))
                  const preferredGroupMissing = context.preferredGroups.filter((g) => !contacto.groups.includes(g))
                  return (
                    <div
                      key={contacto.id}
                      className={cn(
                        "rounded-md border bg-card px-3 py-2 hover:bg-accent/50 transition-colors",
                        !isInPreferredGroup && "opacity-75"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-semibold text-primary">
                              {contacto.codigoContacto}
                            </span>
                            <span className="text-sm font-medium truncate">
                              {contacto.nombre}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                            {contacto.cuit && <span>CUIT: {contacto.cuit}</span>}
                            {contacto.dni && <span>DNI: {contacto.dni}</span>}
                            {contacto.localidad && <span>{contacto.localidad}</span>}
                          </div>
                          {/* Roles + Groups badges */}
                          <div className="flex flex-wrap gap-1 mt-1">
                            {contacto.roles.map((role) => (
                              <Badge
                                key={role}
                                variant="outline"
                                className={cn("text-[9px] px-1.5 py-0 h-4", CONTACT_ROLE_BADGE_COLORS[role])}
                              >
                                {CONTACT_ROLE_LABELS[role]}
                              </Badge>
                            ))}
                            {contacto.groups.map((groupId) => {
                              const group = getGroupById(groupId)
                              const badgeRole = group?.role ?? contacto.roles[0] ?? "cliente"
                              return (
                                <Badge
                                  key={groupId}
                                  variant="outline"
                                  className={cn(
                                    "text-[9px] px-1.5 py-0 h-4",
                                    GROUP_BADGE_COLORS[badgeRole]
                                  )}
                                >
                                  {getGroupLabel(groupId)}
                                </Badge>
                              )
                            })}
                          </div>
                        </div>

                        <div className="flex flex-col gap-1 shrink-0">
                          {isInPreferredGroup || context.preferredGroups.length === 0 ? (
                            <Button
                              size="sm"
                              className="h-7 text-[11px] bg-emerald-600 hover:bg-emerald-700"
                              onClick={() => handleSelect(contacto)}
                            >
                              <Check className="size-3 mr-0.5" /> Seleccionar
                            </Button>
                          ) : (
                            <div className="space-y-1 text-right">
                              <p className="text-[10px] text-amber-700">
                                Sin grupo {getGroupLabel(preferredGroupMissing[0])}
                              </p>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-[11px]"
                                onClick={() => handleAddGroupAndSelect(contacto, preferredGroupMissing[0])}
                              >
                                Agregar grupo
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Nuevo contacto button */}
            {context.allowCreate && (
              <div className="flex justify-end pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => { setFormKey((k) => k + 1); setFormOpen(true) }}
                >
                  <Plus className="size-3.5 mr-1" />
                  Nuevo contacto
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create form dialog — with context defaults for alta rápida */}
      <ContactoFormDialog
        key={formKey}
        open={formOpen}
        onOpenChange={setFormOpen}
        onSaved={handleCreated}
        defaultRoles={context.createDefaults?.roles}
        defaultGroups={context.createDefaults?.groups}
      />
    </>
  )
}
