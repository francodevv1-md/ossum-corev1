"use client"

import React, { useState, useMemo } from "react"
import Link from "next/link"
import {
  Users,
  UserPlus,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserX,
  Eye,
  Activity,
  MoreVertical,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  FilterX,
  ExternalLink,
  Calendar,
  Mail,
  AlertCircle,
  KeyRound,
  RefreshCw,
  Copy,
  Check,
  Lock,
  Phone,
  Truck,
  Receipt,
  Briefcase,
  Wrench,
} from "lucide-react"
import { toast } from "sonner"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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

import { useMemberships } from "@/hooks/useMemberships"
import {
  CANONICAL_ROLES,
  CANONICAL_ROLE_METADATA,
  type CanonicalRole,
} from "@/lib/permissions/canonical-roles"
import type { ManagedMembershipItem } from "@/lib/api/memberships"

const ROLE_ICONS: Record<CanonicalRole, React.ElementType> = {
  admin: ShieldAlert,
  coordinator: ShieldCheck,
  logistics: Truck,
  billing: Receipt,
  commercial: Briefcase,
  technician: Wrench,
  viewer: Eye,
}

function getInitials(name: string): string {
  if (!name) return "U"
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "-"
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })
  } catch {
    return dateStr
  }
}

interface UsuariosRolesViewProps {
  embeddedInConfig?: boolean
}

export function UsuariosRolesView({ embeddedInConfig = false }: UsuariosRolesViewProps) {
  const {
    items: users,
    totalAdmins,
    canManage,
    isLoading,
    error,
    isMutating,
    refresh,
    createMembership,
    updateMembership,
    toggleMembershipStatus,
    deleteMembership,
    resetPassword,
  } = useMemberships()

  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  // Modal create/edit state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<ManagedMembershipItem | null>(null)
  const [formData, setFormData] = useState<{
    firstName: string
    lastName: string
    email: string
    phone: string
    role: CanonicalRole
    isActive: boolean
  }>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    role: "coordinator",
    isActive: true,
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Delete dialog state
  const [deletingUser, setDeletingUser] = useState<ManagedMembershipItem | null>(null)

  // Password reset dialog state
  const [resettingUser, setResettingUser] = useState<ManagedMembershipItem | null>(null)
  const [generatedTempPassword, setGeneratedTempPassword] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Metrics
  const stats = useMemo(() => {
    const total = users.length
    const active = users.filter((u) => u.isActive).length
    const inactive = users.filter((u) => !u.isActive).length
    const admins = users.filter((u) => u.canonicalRole === "admin" && u.isActive).length
    return { total, active, inactive, admins }
  }, [users])

  // Filtered users
  const filteredUsers = useMemo(() => {
    const query = searchQuery.toLowerCase().trim()
    return users.filter((user) => {
      const matchesSearch =
        !query ||
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.canonicalRole.toLowerCase().includes(query) ||
        (CANONICAL_ROLE_METADATA[user.canonicalRole]?.label.toLowerCase().includes(query) ?? false)

      const matchesRole = roleFilter === "all" || user.canonicalRole === roleFilter
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "activo" && user.isActive) ||
        (statusFilter === "inactivo" && !user.isActive)

      return matchesSearch && matchesRole && matchesStatus
    })
  }, [users, searchQuery, roleFilter, statusFilter])

  const hasActiveFilters = searchQuery !== "" || roleFilter !== "all" || statusFilter !== "all"

  const handleClearFilters = () => {
    setSearchQuery("")
    setRoleFilter("all")
    setStatusFilter("all")
  }

  // Open modal for new user
  const handleOpenCreate = () => {
    setEditingUser(null)
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      role: "coordinator",
      isActive: true,
    })
    setFormErrors({})
    setIsModalOpen(true)
  }

  // Open modal for editing user
  const handleOpenEdit = (user: ManagedMembershipItem) => {
    setEditingUser(user)
    setFormData({
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
      email: user.email,
      phone: user.phone ?? "",
      role: user.canonicalRole,
      isActive: user.isActive,
    })
    setFormErrors({})
    setIsModalOpen(true)
  }

  // Open password reset modal
  const handleOpenPasswordReset = async (user: ManagedMembershipItem) => {
    setResettingUser(user)
    setGeneratedTempPassword(null)
    setCopied(false)
    try {
      const res = await resetPassword(user.id)
      if (res?.tempPassword) {
        setGeneratedTempPassword(res.tempPassword)
      }
    } catch {
      // handled by hook toast
    }
  }

  const handleCopyPassword = () => {
    if (!generatedTempPassword) return
    navigator.clipboard.writeText(generatedTempPassword)
    setCopied(true)
    toast.info("Contraseña temporal copiada al portapapeles")
    setTimeout(() => setCopied(false), 2500)
  }

  // Validate form
  const validateForm = () => {
    const errors: Record<string, string> = {}
    if (!formData.firstName.trim()) {
      errors.firstName = "El nombre es requerido"
    }
    if (!formData.lastName.trim()) {
      errors.lastName = "El apellido es requerido"
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!formData.email.trim()) {
      errors.email = "El correo electrónico es requerido"
    } else if (!emailRegex.test(formData.email.trim())) {
      errors.email = "Ingresá un formato de email válido (ej: nombre@empresa.com)"
    }

    if (editingUser && editingUser.isLastAdmin) {
      if (formData.role !== "admin") {
        errors.role = "No podés degradar al único Administrador activo de la empresa."
      }
      if (!formData.isActive) {
        errors.isActive = "No podés desactivar al único Administrador activo de la empresa."
      }
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Save user
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    try {
      if (editingUser) {
        await updateMembership(editingUser.id, {
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          phone: formData.phone.trim() || null,
          role: formData.role,
          isActive: formData.isActive,
        })
      } else {
        await createMembership({
          email: formData.email.trim().toLowerCase(),
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          phone: formData.phone.trim() || null,
          role: formData.role,
        })
      }
      setIsModalOpen(false)
    } catch {
      // handled by hook
    }
  }

  // Delete user
  const handleConfirmDelete = async () => {
    if (!deletingUser) return
    try {
      await deleteMembership(deletingUser.id)
      setDeletingUser(null)
    } catch {
      // handled by hook
    }
  }

  return (
    <div className="space-y-4">
      {/* Header & Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight">Usuarios y roles</h1>
            <Badge variant="outline" className="text-[11px] font-medium text-muted-foreground">
              {stats.total} {stats.total === 1 ? "usuario" : "usuarios"}
            </Badge>
            {!canManage && (
              <Badge variant="secondary" className="text-[11px] gap-1">
                <Lock className="size-3" /> Solo lectura
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gestión de membresías de empresa, asignación de roles canónicos y control de acceso backend.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={isLoading || isMutating}
            className="gap-1.5 shrink-0 text-xs"
          >
            <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Actualizar</span>
          </Button>

          {canManage && (
            <Button
              size="sm"
              className="gap-1.5 shrink-0 bg-[#1D2FC0] hover:bg-[#18269e] text-white"
              onClick={handleOpenCreate}
            >
              <UserPlus className="size-4" />
              <span>Nuevo usuario</span>
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <Card className="py-3 px-3.5 border shadow-xs bg-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Usuarios</p>
              <p className="text-xl font-bold tracking-tight text-foreground mt-0.5">{stats.total}</p>
            </div>
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Users className="size-4.5" />
            </div>
          </div>
        </Card>

        <Card className="py-3 px-3.5 border shadow-xs bg-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Activos</p>
              <p className="text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 mt-0.5">
                {stats.active}
              </p>
            </div>
            <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <UserCheck className="size-4.5" />
            </div>
          </div>
        </Card>

        <Card className="py-3 px-3.5 border shadow-xs bg-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Inactivos</p>
              <p className="text-xl font-bold tracking-tight text-slate-600 dark:text-slate-400 mt-0.5">
                {stats.inactive}
              </p>
            </div>
            <div className="flex size-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
              <UserX className="size-4.5" />
            </div>
          </div>
        </Card>

        <Card className="py-3 px-3.5 border shadow-xs bg-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Administradores</p>
              <p className="text-xl font-bold tracking-tight text-purple-600 dark:text-purple-400 mt-0.5">
                {stats.admins}
              </p>
            </div>
            <div className="flex size-9 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
              <ShieldAlert className="size-4.5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-3 border shadow-xs bg-card">
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, email o rol..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-sm h-9 bg-background"
              />
            </div>

            {/* Filter by Role */}
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-[190px] h-9 text-xs bg-background">
                <SelectValue placeholder="Filtrar por rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Todos los roles</SelectItem>
                {CANONICAL_ROLES.map((roleKey) => (
                  <SelectItem key={roleKey} value={roleKey} className="text-xs">
                    {CANONICAL_ROLE_METADATA[roleKey].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filter by Status */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[150px] h-9 text-xs bg-background">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Todos los estados</SelectItem>
                <SelectItem value="activo" className="text-xs">Solo activos</SelectItem>
                <SelectItem value="inactivo" className="text-xs">Solo inactivos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reset button & Result count */}
          <div className="flex items-center justify-between sm:justify-end gap-3 pt-1 sm:pt-0">
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              Mostrando <strong className="text-foreground">{filteredUsers.length}</strong> de {users.length}
            </span>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
              >
                <FilterX className="size-3.5" />
                <span>Limpiar</span>
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Users Table */}
      <Card className="border shadow-xs overflow-hidden bg-card">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <RefreshCw className="size-6 animate-spin text-primary mb-2" />
            <p className="text-xs text-muted-foreground">Cargando usuarios y membresías...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <AlertCircle className="size-8 text-amber-500 mb-2" />
            <h3 className="text-sm font-semibold text-foreground">Error al cargar usuarios</h3>
            <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">{error}</p>
            <Button variant="outline" size="sm" onClick={refresh} className="text-xs gap-1.5">
              <RefreshCw className="size-3.5" /> Reintentar
            </Button>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-3">
              <Users className="size-6" />
            </div>
            <h3 className="text-base font-semibold text-foreground">No se encontraron usuarios</h3>
            <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">
              {hasActiveFilters
                ? "No hay usuarios que coincidan con los filtros aplicados."
                : "Aún no hay usuarios dados de alta en esta empresa."}
            </p>
            {hasActiveFilters ? (
              <Button variant="outline" size="sm" onClick={handleClearFilters} className="text-xs gap-1.5">
                <FilterX className="size-3.5" /> Limpiar filtros
              </Button>
            ) : canManage ? (
              <Button
                size="sm"
                onClick={handleOpenCreate}
                className="text-xs gap-1.5 bg-[#1D2FC0] hover:bg-[#18269e] text-white"
              >
                <UserPlus className="size-3.5" /> Crear primer usuario
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-muted/40 text-xs font-semibold text-muted-foreground">
                <tr>
                  <th className="py-3 px-4">Usuario</th>
                  <th className="py-3 px-4">Correo electrónico</th>
                  <th className="py-3 px-4">Rol asignado</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4">Fecha de alta</th>
                  {canManage && <th className="py-3 px-4 text-right">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredUsers.map((user) => {
                  const roleMeta = CANONICAL_ROLE_METADATA[user.canonicalRole] ?? {
                    role: user.canonicalRole,
                    label: user.role,
                    description: "",
                    badgeClass: "bg-slate-100 text-slate-700",
                  }
                  const RoleIcon = ROLE_ICONS[user.canonicalRole] ?? Shield
                  const isActive = user.isActive

                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-muted/30 transition-colors group"
                    >
                      {/* Name & Avatar */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                            {getInitials(user.name)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="font-medium text-foreground text-sm truncate">
                                {user.name}
                              </p>
                              {user.isSelf && (
                                <Badge variant="outline" className="text-[10px] py-0 px-1 font-normal text-primary border-primary/30">
                                  Tú
                                </Badge>
                              )}
                              {user.isLastAdmin && (
                                <Badge variant="destructive" className="text-[10px] py-0 px-1 font-normal">
                                  Último Admin
                                </Badge>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground font-mono">
                              {user.userId}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-3 px-4 text-xs text-muted-foreground font-medium">
                        <div className="flex items-center gap-1.5">
                          <Mail className="size-3.5 text-muted-foreground/60 shrink-0" />
                          <span className="truncate max-w-[220px]">{user.email}</span>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${roleMeta.badgeClass}`}
                        >
                          <RoleIcon className="size-3.5" />
                          {roleMeta.label}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {canManage ? (
                          <button
                            type="button"
                            onClick={() => toggleMembershipStatus(user)}
                            disabled={user.isLastAdmin && isActive}
                            className={`inline-flex items-center gap-1.5 ${
                              user.isLastAdmin && isActive ? "cursor-not-allowed opacity-80" : "cursor-pointer"
                            }`}
                            title={
                              user.isLastAdmin && isActive
                                ? "No se puede desactivar al único Administrador activo"
                                : "Click para cambiar estado"
                            }
                          >
                            <span
                              className={`flex size-2 rounded-full ${
                                isActive ? "bg-emerald-500 ring-2 ring-emerald-500/20" : "bg-slate-400"
                              }`}
                            />
                            <span
                              className={`text-xs font-medium ${
                                isActive
                                  ? "text-emerald-700 dark:text-emerald-400"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {isActive ? "Activo" : "Inactivo"}
                            </span>
                          </button>
                        ) : (
                          <div className="inline-flex items-center gap-1.5">
                            <span
                              className={`flex size-2 rounded-full ${
                                isActive ? "bg-emerald-500 ring-2 ring-emerald-500/20" : "bg-slate-400"
                              }`}
                            />
                            <span
                              className={`text-xs font-medium ${
                                isActive ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"
                              }`}
                            >
                              {isActive ? "Activo" : "Inactivo"}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Created At */}
                      <td className="py-3 px-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="size-3.5 text-muted-foreground/60 shrink-0" />
                          <span>{formatDate(user.createdAt)}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      {canManage && (
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-muted-foreground hover:text-foreground"
                              onClick={() => handleOpenPasswordReset(user)}
                              title="Refrescar / Restablecer contraseña"
                            >
                              <KeyRound className="size-3.5 text-amber-600" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-muted-foreground hover:text-foreground"
                              onClick={() => handleOpenEdit(user)}
                              title="Editar usuario"
                            >
                              <Pencil className="size-3.5" />
                            </Button>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-8 text-muted-foreground hover:text-foreground"
                                >
                                  <MoreVertical className="size-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-52 text-xs">
                                <DropdownMenuItem
                                  onClick={() => handleOpenEdit(user)}
                                  className="gap-2 cursor-pointer"
                                >
                                  <Pencil className="size-3.5 text-muted-foreground" />
                                  <span>Editar datos y rol</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleOpenPasswordReset(user)}
                                  className="gap-2 cursor-pointer"
                                >
                                  <KeyRound className="size-3.5 text-amber-600" />
                                  <span>Refrescar contraseña</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => toggleMembershipStatus(user)}
                                  disabled={user.isLastAdmin && isActive}
                                  className="gap-2 cursor-pointer"
                                >
                                  {isActive ? (
                                    <>
                                      <XCircle className="size-3.5 text-amber-600" />
                                      <span>Desactivar membresía</span>
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle2 className="size-3.5 text-emerald-600" />
                                      <span>Activar membresía</span>
                                    </>
                                  )}
                                </DropdownMenuItem>
                                {!user.isLastAdmin && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => setDeletingUser(user)}
                                      className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                                    >
                                      <Trash2 className="size-3.5" />
                                      <span>Eliminar membresía</span>
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal Create / Edit User */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <form onSubmit={handleSaveUser}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold">
                {editingUser ? `Editar Usuario — ${editingUser.name}` : "Nuevo Usuario"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {editingUser
                  ? "Modificá los datos personales, el rol canónico o el estado de la membresía."
                  : "Ingresá los datos del nuevo usuario para habilitarle acceso a la empresa."}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3.5 py-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName" className="text-xs font-medium">
                    Nombre <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, firstName: e.target.value }))
                    }
                    placeholder="Ej: Franco"
                    className={`h-9 text-xs ${formErrors.firstName ? "border-destructive" : ""}`}
                  />
                  {formErrors.firstName && (
                    <p className="text-[11px] text-destructive">{formErrors.firstName}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="lastName" className="text-xs font-medium">
                    Apellido <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, lastName: e.target.value }))
                    }
                    placeholder="Ej: González"
                    className={`h-9 text-xs ${formErrors.lastName ? "border-destructive" : ""}`}
                  />
                  {formErrors.lastName && (
                    <p className="text-[11px] text-destructive">{formErrors.lastName}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-medium">
                  Correo electrónico <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  disabled={Boolean(editingUser)}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, email: e.target.value }))
                  }
                  placeholder="usuario@empresa.com"
                  className={`h-9 text-xs ${formErrors.email ? "border-destructive" : ""}`}
                />
                {formErrors.email && (
                  <p className="text-[11px] text-destructive">{formErrors.email}</p>
                )}
                {editingUser && (
                  <p className="text-[10px] text-muted-foreground">
                    El correo electrónico está vinculado a la identidad única y no se puede modificar aquí.
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs font-medium">
                  Teléfono (opcional)
                </Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  placeholder="+54 9 11 ..."
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="role" className="text-xs font-medium">
                  Rol canónico asignado <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.role}
                  onValueChange={(val) =>
                    setFormData((prev) => ({ ...prev, role: val as CanonicalRole }))
                  }
                  disabled={editingUser?.isLastAdmin}
                >
                  <SelectTrigger id="role" className="h-9 text-xs">
                    <SelectValue placeholder="Seleccionar rol" />
                  </SelectTrigger>
                  <SelectContent>
                    {CANONICAL_ROLES.map((roleKey) => {
                      const meta = CANONICAL_ROLE_METADATA[roleKey]
                      const RoleIcon = ROLE_ICONS[roleKey]
                      return (
                        <SelectItem key={roleKey} value={roleKey} className="text-xs">
                          <div className="flex items-center gap-2">
                            <RoleIcon className="size-3.5 text-muted-foreground" />
                            <span className="font-medium">{meta.label}</span>
                            <span className="text-[10px] text-muted-foreground hidden sm:inline">
                              — {meta.description}
                            </span>
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
                {editingUser?.isLastAdmin && (
                  <p className="text-[10px] text-amber-600 dark:text-amber-400">
                    No se puede cambiar el rol del único Administrador activo.
                  </p>
                )}
                {formErrors.role && (
                  <p className="text-[11px] text-destructive">{formErrors.role}</p>
                )}
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isMutating}
                className="text-xs bg-[#1D2FC0] hover:bg-[#18269e] text-white"
              >
                {editingUser ? "Guardar cambios" : "Crear usuario"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={Boolean(resettingUser)} onOpenChange={(open) => !open && setResettingUser(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <KeyRound className="size-4 text-amber-600" />
              <span>Restablecer Contraseña</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Se ha generado una clave temporal para <strong>{resettingUser?.name}</strong> ({resettingUser?.email}).
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 space-y-3">
            {generatedTempPassword ? (
              <div className="p-3 bg-muted rounded-lg border space-y-2">
                <p className="text-xs text-muted-foreground">Contraseña temporal de ingreso:</p>
                <div className="flex items-center justify-between gap-2 bg-background p-2 rounded border font-mono text-sm">
                  <span>{generatedTempPassword}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyPassword}
                    className="h-7 px-2 text-xs gap-1"
                  >
                    {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                    <span>{copied ? "Copiada" : "Copiar"}</span>
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  El usuario podrá usar esta clave provisoria para acceder y se le solicitará actualizarla en su primer inicio de sesión.
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-center py-4">
                <RefreshCw className="size-5 animate-spin text-primary" />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              size="sm"
              onClick={() => setResettingUser(null)}
              className="text-xs"
            >
              Listo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog
        open={Boolean(deletingUser)}
        onOpenChange={(open) => !open && setDeletingUser(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold">
              ¿Eliminar membresía de {deletingUser?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Esta acción revocará todo acceso de <strong>{deletingUser?.email}</strong> a esta empresa.
              No se eliminarán registros históricos creados por el usuario.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar membresía
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
