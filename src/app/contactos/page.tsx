"use client"

import React, { useState, useMemo, useEffect, useCallback } from "react"
import { useOrtoTrackStore } from "@/lib/store"
import type { Contacto, ContactRole } from "@/types"
import { apiFetch } from "@/lib/api/client"
import { useAuth } from "@/components/auth/AuthProvider"
import { mapApiContactListToContactos } from "@/lib/api/contact-adapter"
import {
  CONTACT_ROLE_LABELS,
  CONTACT_ROLE_BADGE_COLORS,
  ALL_CONTACT_ROLES,
  CONTACT_GROUPS,
  getGroupLabel,
  GROUP_BADGE_COLORS,
} from "@/lib/contacts.constants"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import {
  Search,
  Plus,
  Pencil,
  ToggleLeft,
  ToggleRight,
  Users,
} from "lucide-react"
import { ContactoFormDialog } from "@/components/contactos/ContactoFormDialog"

// ═══════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════

const ALL_ROLES_OPTIONS: { value: ContactRole | "all"; label: string }[] = [
  { value: "all", label: "Todos los roles" },
  { value: "cliente", label: "Cliente" },
  { value: "proveedor", label: "Proveedor" },
  { value: "interno", label: "Interno" },
]

type StatusFilter = "todos" | "activos" | "inactivos"

// ═══════════════════════════════════════════════════════════════
// Page
// ═══════════════════════════════════════════════════════════════

export default function ContactosPage() {
  const store = useOrtoTrackStore()
  const { activeCompany } = useAuth()

  // ── API-based contact loading ──
  const [apiContacts, setApiContacts] = useState<Contacto[] | null>(null)
  const [apiLoading, setApiLoading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  const fetchContacts = useCallback(() => {
    if (!activeCompany?.id) return

    setApiLoading(true)
    setApiError(null)

    apiFetch<Array<Record<string, unknown>>>(
      `/api/companies/${encodeURIComponent(activeCompany.id)}/contacts?isActive=true&take=100`
    )
      .then((data) => {
        setApiContacts(mapApiContactListToContactos(data))
        setApiLoading(false)
      })
      .catch((err: unknown) => {
        const msg =
          err instanceof Error ? err.message : "Error loading contacts"
        setApiError(msg)
        setApiLoading(false)
        toast.error(
          "No se pudieron cargar contactos desde el servidor. Mostrando datos locales."
        )
      })
  }, [activeCompany?.id])

  useEffect(() => {
    fetchContacts()
  }, [fetchContacts])

  // ── State ──
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<ContactRole | "all">("all")
  const [groupFilter, setGroupFilter] = useState<string | "all">("all")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("activos")
  const [formOpen, setFormOpen] = useState(false)
  const [editingContacto, setEditingContacto] = useState<Contacto | null>(null)
  const [formKey, setFormKey] = useState(0)

  // Confirm dialog
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{
    contacto: Contacto
    action: "inactivate" | "reactivate"
  } | null>(null)

  // Available groups based on selected role
  const availableGroups = useMemo(() => {
    if (roleFilter === "all") return CONTACT_GROUPS.filter((g) => g.activo)
    return CONTACT_GROUPS.filter((g) => g.role === roleFilter && g.activo)
  }, [roleFilter])

  // ── Contact source (API first, Zustand fallback) ──
  const contactSource = apiContacts ?? store.contactos

  // ── Filtered contacts ──
  const filteredContactos = useMemo(() => {
    let result = contactSource

    // Status filter
    if (statusFilter === "activos") {
      result = result.filter((c) => c.estado === "activo")
    } else if (statusFilter === "inactivos") {
      result = result.filter((c) => c.estado === "inactivo")
    }

    // Role filter
    if (roleFilter !== "all") {
      result = result.filter((c) => c.roles.includes(roleFilter))
    }

    // Group filter
    if (groupFilter !== "all") {
      result = result.filter((c) => c.groups.includes(groupFilter))
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(
        (c) =>
          c.codigoContacto.toLowerCase().includes(q) ||
          c.nombre.toLowerCase().includes(q) ||
          (c.cuit && c.cuit.toLowerCase().includes(q)) ||
          (c.dni && c.dni.toLowerCase().includes(q)) ||
          (c.nombreFantasia && c.nombreFantasia.toLowerCase().includes(q)) ||
          (c.razonSocial && c.razonSocial.toLowerCase().includes(q))
      )
    }

    // Sort by code
    return result.sort((a, b) => a.codigoContacto.localeCompare(b.codigoContacto))
  }, [contactSource, searchQuery, roleFilter, groupFilter, statusFilter])

  // ── Counts ──
  const activeCount = contactSource.filter((c) => c.estado === "activo").length
  const inactiveCount = contactSource.filter((c) => c.estado === "inactivo").length

  // ── Handlers ──
  const handleNewContact = () => {
    setEditingContacto(null)
    setFormKey((k) => k + 1)
    setFormOpen(true)
  }

  const handleEdit = (contacto: Contacto) => {
    setEditingContacto(contacto)
    setFormKey((k) => k + 1)
    setFormOpen(true)
  }

  const handleToggleStatus = (contacto: Contacto) => {
    const action = contacto.estado === "activo" ? "inactivate" : "reactivate"
    setConfirmAction({ contacto, action })
    setConfirmOpen(true)
  }

  const confirmToggleStatus = async () => {
    if (!confirmAction) return

    const { contacto, action } = confirmAction
    const newState = action === "inactivate" ? false : true

    setConfirmOpen(false)
    setConfirmAction(null)

    try {
      const url = `/api/companies/${encodeURIComponent(activeCompany?.id ?? "")}/contacts/${encodeURIComponent(contacto.id)}`
      await apiFetch(url, {
        method: "PATCH",
        body: JSON.stringify({ isActive: newState }),
        headers: { "Content-Type": "application/json" },
      })

      toast.success(
        action === "inactivate"
          ? `Contacto ${contacto.codigoContacto} inactivado`
          : `Contacto ${contacto.codigoContacto} reactivado`
      )
      fetchContacts()
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Error al cambiar estado"

      // Fallback: use Zustand store
      if (action === "inactivate") {
        store.inactivateContacto(contacto.id)
      } else {
        store.reactivateContacto(contacto.id)
      }

      toast.error(msg)
    }
  }

  const handleFormSaved = () => {
    setFormOpen(false)
    setEditingContacto(null)
    fetchContacts()
  }

  // Reset group filter when role changes
  const handleRoleChange = (value: string) => {
    setRoleFilter(value as ContactRole | "all")
    setGroupFilter("all")
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 border-b bg-card/80 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Users className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Maestro de Contactos</h1>
            <p className="text-xs text-muted-foreground">
              {activeCount} activos · {inactiveCount} inactivos · {contactSource.length} total
            </p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="shrink-0 border-b bg-card/50 px-6 py-3">
        {apiLoading && (
          <div className="text-xs text-muted-foreground mb-2 transition-opacity">
            Cargando contactos del servidor…
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              className="h-8 text-sm pl-8"
              placeholder="Buscar por código, nombre, CUIT, DNI..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Role filter */}
          <Select value={roleFilter} onValueChange={handleRoleChange}>
            <SelectTrigger className="h-8 text-sm w-36">
              <SelectValue placeholder="Todos los roles" />
            </SelectTrigger>
            <SelectContent>
              {ALL_ROLES_OPTIONS.map((r) => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Group filter */}
          <Select value={groupFilter} onValueChange={(v) => setGroupFilter(v)}>
            <SelectTrigger className="h-8 text-sm w-48">
              <SelectValue placeholder="Todos los grupos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los grupos</SelectItem>
              {availableGroups.map((g) => (
                <SelectItem key={g.id} value={g.id}>{g.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status filter */}
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="h-8 text-sm w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="activos">Activos</SelectItem>
              <SelectItem value="inactivos">Inactivos</SelectItem>
            </SelectContent>
          </Select>

          {/* New button */}
          <Button
            className="h-8 text-sm ml-auto bg-emerald-600 hover:bg-emerald-700"
            onClick={handleNewContact}
          >
            <Plus className="size-4 mr-1" />
            Nuevo contacto
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[11px] w-20">Código</TableHead>
              <TableHead className="text-[11px]">Nombre / Razón social</TableHead>
              <TableHead className="text-[11px]">CUIT / DNI</TableHead>
              <TableHead className="text-[11px]">Localidad</TableHead>
              <TableHead className="text-[11px]">Roles</TableHead>
              <TableHead className="text-[11px]">Grupos</TableHead>
              <TableHead className="text-[11px] w-20">Estado</TableHead>
              <TableHead className="text-[11px] w-24">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredContactos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground text-sm">
                  No se encontraron contactos
                </TableCell>
              </TableRow>
            ) : (
              filteredContactos.map((contacto) => (
                <TableRow key={contacto.id} className="group">
                  <TableCell className="font-mono text-xs font-semibold text-primary">
                    {contacto.codigoContacto}
                  </TableCell>

                  <TableCell className="text-sm">
                    <div>
                      <span className="font-medium">{contacto.nombre}</span>
                      {contacto.razonSocial && contacto.tipoPersona === "juridica" && (
                        <p className="text-[10px] text-muted-foreground">{contacto.razonSocial}</p>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="text-xs">
                    {contacto.cuit || contacto.dni || "—"}
                  </TableCell>

                  <TableCell className="text-xs text-muted-foreground">
                    {contacto.localidad || "—"}
                  </TableCell>

                  <TableCell>
                    <div className="flex flex-wrap gap-0.5">
                      {contacto.roles.map((role) => (
                        <Badge
                          key={role}
                          variant="outline"
                          className={cn("text-[9px] px-1.5 py-0 h-4", CONTACT_ROLE_BADGE_COLORS[role])}
                        >
                          {CONTACT_ROLE_LABELS[role]}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex flex-wrap gap-0.5">
                      {contacto.groups.map((groupId) => {
                        const group = CONTACT_GROUPS.find((g) => g.id === groupId)
                        return (
                          <Badge
                            key={groupId}
                            variant="outline"
                            className={cn("text-[9px] px-1.5 py-0 h-4", group ? GROUP_BADGE_COLORS[group.role] : "bg-gray-100 text-gray-600 border-gray-200")}
                          >
                            {getGroupLabel(groupId)}
                          </Badge>
                        )
                      })}
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] px-1.5 py-0 h-4",
                        contacto.estado === "activo"
                          ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                          : "bg-gray-100 text-gray-600 border-gray-200"
                      )}
                    >
                      {contacto.estado === "activo" ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-foreground"
                        onClick={() => handleEdit(contacto)}
                        aria-label="Editar"
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "size-7",
                          contacto.estado === "activo"
                            ? "text-amber-600 hover:text-amber-700"
                            : "text-emerald-600 hover:text-emerald-700"
                        )}
                        onClick={() => handleToggleStatus(contacto)}
                        aria-label={contacto.estado === "activo" ? "Inactivar" : "Reactivar"}
                      >
                        {contacto.estado === "activo" ? (
                          <ToggleLeft className="size-4" />
                        ) : (
                          <ToggleRight className="size-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Form dialog */}
      <ContactoFormDialog
        key={formKey}
        open={formOpen}
        onOpenChange={setFormOpen}
        contacto={editingContacto}
        onSaved={handleFormSaved}
      />

      {/* Confirm dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.action === "inactivate"
                ? "Inactivar contacto"
                : "Reactivar contacto"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.action === "inactivate"
                ? `¿Está seguro de inactivar el contacto "${confirmAction?.contacto.nombre}" (${confirmAction?.contacto.codigoContacto})? El contacto no aparecerá en las búsquedas pero no será eliminado.`
                : `¿Está seguro de reactivar el contacto "${confirmAction?.contacto.nombre}" (${confirmAction?.contacto.codigoContacto})?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmToggleStatus}
              className={cn(
                confirmAction?.action === "inactivate"
                  ? "bg-amber-600 hover:bg-amber-700"
                  : "bg-emerald-600 hover:bg-emerald-700"
              )}
            >
              {confirmAction?.action === "inactivate" ? "Inactivar" : "Reactivar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
