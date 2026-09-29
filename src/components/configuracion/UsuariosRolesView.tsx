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
  EyeOff,
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
  Send,
} from "lucide-react"
import { toast } from "sonner"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
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

export type BasicUserRole = "Administrador" | "Coordinador" | "Operador" | "Solo lectura"
export type UserStatus = "activo" | "inactivo"

export interface ManagedUser {
  id: string
  name: string
  email: string
  role: BasicUserRole
  status: UserStatus
  createdAt: string // YYYY-MM-DD
  lastLogin?: string
  lastPasswordReset?: string
}

export const BASIC_ROLES: Array<{
  role: BasicUserRole
  label: string
  description: string
  badgeVariant: string
  badgeClass: string
  icon: React.ElementType
}> = [
  {
    role: "Administrador",
    label: "Administrador",
    description: "Acceso total y configuración del sistema",
    badgeVariant: "default",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800",
    icon: ShieldAlert,
  },
  {
    role: "Coordinador",
    label: "Coordinador",
    description: "Gestión quirúrgica, expedientes y logística",
    badgeVariant: "info",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800",
    icon: ShieldCheck,
  },
  {
    role: "Operador",
    label: "Operador",
    description: "Operaciones de stock, remitos y consumos",
    badgeVariant: "success",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
    icon: Activity,
  },
  {
    role: "Solo lectura",
    label: "Solo lectura",
    description: "Visualización de tableros y consultas",
    badgeVariant: "secondary",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    icon: Eye,
  },
]

const INITIAL_USERS: ManagedUser[] = [
  {
    id: "USR-001",
    name: "Franco Jr",
    email: "franco.sistemas@districorr.com.ar",
    role: "Administrador",
    status: "activo",
    createdAt: "2026-01-10",
    lastLogin: "Hoy, 14:32",
    lastPasswordReset: "15/08/2026",
  },
  {
    id: "USR-002",
    name: "Nelson González",
    email: "nelson.coordinacion@districorr.com.ar",
    role: "Coordinador",
    status: "activo",
    createdAt: "2026-02-01",
    lastLogin: "Hoy, 11:20",
    lastPasswordReset: "01/02/2026",
  },
  {
    id: "USR-003",
    name: "Lucas Martínez",
    email: "lucas.operaciones@districorr.com.ar",
    role: "Operador",
    status: "activo",
    createdAt: "2026-02-15",
    lastLogin: "Ayer, 18:45",
  },
  {
    id: "USR-004",
    name: "Mariana Sánchez",
    email: "mariana.auditoria@districorr.com.ar",
    role: "Solo lectura",
    status: "activo",
    createdAt: "2026-03-01",
    lastLogin: "26/09/2026",
  },
  {
    id: "USR-005",
    name: "Carlos Depósito",
    email: "carlos.deposito@districorr.com.ar",
    role: "Operador",
    status: "inactivo",
    createdAt: "2026-01-15",
    lastLogin: "10/08/2026",
  },
  {
    id: "USR-006",
    name: "Sofía Logística",
    email: "sofia.logistica@districorr.com.ar",
    role: "Coordinador",
    status: "activo",
    createdAt: "2026-03-12",
    lastLogin: "Hoy, 09:15",
  },
]

function getInitials(name: string): string {
  if (!name) return "U"
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "-"
  const [year, month, day] = dateStr.split("-")
  if (!year || !month || !day) return dateStr
  return `${day}/${month}/${year}`
}

function getRoleMeta(role: BasicUserRole) {
  return (
    BASIC_ROLES.find((r) => r.role === role) || {
      role,
      label: role,
      description: "Rol del sistema",
      badgeClass: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300",
      icon: Shield,
    }
  )
}

function generateRandomPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%"
  let pass = "Ossum#"
  for (let i = 0; i < 6; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return pass
}

interface UsuariosRolesViewProps {
  embeddedInConfig?: boolean
}

export function UsuariosRolesView({ embeddedInConfig = false }: UsuariosRolesViewProps) {
  const [users, setUsers] = useState<ManagedUser[]>(INITIAL_USERS)
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  // Modal create/edit state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null)
  const [formData, setFormData] = useState<{
    name: string
    email: string
    role: BasicUserRole
    status: UserStatus
  }>({
    name: "",
    email: "",
    role: "Operador",
    status: "activo",
  })
  const [formErrors, setFormErrors] = useState<{
    name?: string
    email?: string
  }>({})

  // Delete dialog state
  const [deletingUser, setDeletingUser] = useState<ManagedUser | null>(null)

  // Password reset dialog state
  const [resettingUser, setResettingUser] = useState<ManagedUser | null>(null)
  const [tempPassword, setTempPassword] = useState<string>("")
  const [showPassword, setShowPassword] = useState(false)
  const [copied, setCopied] = useState(false)
  const [resetMethod, setResetMethod] = useState<"email" | "temporary">("email")

  // Metrics
  const stats = useMemo(() => {
    const total = users.length
    const active = users.filter((u) => u.status === "activo").length
    const inactive = users.filter((u) => u.status === "inactivo").length
    const admins = users.filter((u) => u.role === "Administrador" && u.status === "activo").length
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
        user.role.toLowerCase().includes(query)

      const matchesRole = roleFilter === "all" || user.role === roleFilter
      const matchesStatus = statusFilter === "all" || user.status === statusFilter

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
      name: "",
      email: "",
      role: "Operador",
      status: "activo",
    })
    setFormErrors({})
    setIsModalOpen(true)
  }

  // Open modal for editing user
  const handleOpenEdit = (user: ManagedUser) => {
    setEditingUser(user)
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    })
    setFormErrors({})
    setIsModalOpen(true)
  }

  // Open password reset modal
  const handleOpenPasswordReset = (user: ManagedUser) => {
    setResettingUser(user)
    setTempPassword(generateRandomPassword())
    setShowPassword(false)
    setCopied(false)
    setResetMethod("email")
  }

  // Handle password reset execution
  const handleExecutePasswordReset = () => {
    if (!resettingUser) return

    const now = new Date()
    const timeStr = `Hoy, ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`

    setUsers((prev) =>
      prev.map((u) =>
        u.id === resettingUser.id
          ? {
              ...u,
              lastPasswordReset: timeStr,
            }
          : u
      )
    )

    if (resetMethod === "email") {
      toast.success(`Enlace de restablecimiento enviado a ${resettingUser.email}`)
    } else {
      toast.success(`Contraseña provisoria generada para ${resettingUser.name}`)
    }

    setResettingUser(null)
  }

  const handleCopyPassword = () => {
    if (!tempPassword) return
    navigator.clipboard.writeText(tempPassword)
    setCopied(true)
    toast.info("Contraseña temporal copiada al portapapeles")
    setTimeout(() => setCopied(false), 2500)
  }

  // Validate form
  const validateForm = () => {
    const errors: { name?: string; email?: string } = {}
    if (!formData.name.trim()) {
      errors.name = "El nombre completo es requerido"
    } else if (formData.name.trim().length < 3) {
      errors.name = "El nombre debe tener al menos 3 caracteres"
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!formData.email.trim()) {
      errors.email = "El correo electrónico es requerido"
    } else if (!emailRegex.test(formData.email.trim())) {
      errors.email = "Ingresá un formato de email válido (ej: nombre@empresa.com)"
    } else {
      const duplicate = users.find(
        (u) =>
          u.email.toLowerCase() === formData.email.trim().toLowerCase() &&
          (!editingUser || u.id !== editingUser.id)
      )
      if (duplicate) {
        errors.email = "Ya existe un usuario con este correo electrónico"
      }
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Save user (create or update)
  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    if (editingUser) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingUser.id
            ? {
                ...u,
                name: formData.name.trim(),
                email: formData.email.trim().toLowerCase(),
                role: formData.role,
                status: formData.status,
              }
            : u
        )
      )
      toast.success(`Usuario "${formData.name.trim()}" actualizado exitosamente`)
    } else {
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, "0")
      const day = String(now.getDate()).padStart(2, "0")
      const todayStr = `${year}-${month}-${day}`

      const newUser: ManagedUser = {
        id: `USR-${String(users.length + 1).padStart(3, "0")}`,
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        role: formData.role,
        status: formData.status,
        createdAt: todayStr,
        lastLogin: "Pendiente primer ingreso",
      }

      setUsers((prev) => [newUser, ...prev])
      toast.success(`Usuario "${newUser.name}" creado exitosamente`)
    }

    setIsModalOpen(false)
  }

  // Toggle user status directly
  const handleToggleStatus = (user: ManagedUser) => {
    const nextStatus: UserStatus = user.status === "activo" ? "inactivo" : "activo"
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, status: nextStatus } : u))
    )
    toast.info(
      `Usuario "${user.name}" marcado como ${nextStatus === "activo" ? "Activo" : "Inactivo"}`
    )
  }

  // Delete user
  const handleConfirmDelete = () => {
    if (!deletingUser) return
    setUsers((prev) => prev.filter((u) => u.id !== deletingUser.id))
    toast.success(`Usuario "${deletingUser.name}" eliminado`)
    setDeletingUser(null)
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
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gestión de cuentas de usuario, asignación de roles básicos, refresco de claves y accesos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/roles">
            <Button variant="outline" size="sm" className="gap-1.5 shrink-0 text-xs">
              <Shield className="size-3.5 text-primary" />
              <span>Matriz de Permisos</span>
              <ExternalLink className="size-3 text-muted-foreground" />
            </Button>
          </Link>
          <Button
            size="sm"
            className="gap-1.5 shrink-0 bg-[#1D2FC0] hover:bg-[#18269e] text-white"
            onClick={handleOpenCreate}
          >
            <UserPlus className="size-4" />
            <span>Nuevo usuario</span>
          </Button>
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
              <SelectTrigger className="w-full sm:w-[170px] h-9 text-xs bg-background">
                <SelectValue placeholder="Filtrar por rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Todos los roles</SelectItem>
                {BASIC_ROLES.map((r) => (
                  <SelectItem key={r.role} value={r.role} className="text-xs">
                    {r.label}
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

      {/* Users Table (Desktop & Tablet) & Cards (Mobile) */}
      <Card className="border shadow-xs overflow-hidden bg-card">
        {filteredUsers.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-3">
              <Users className="size-6" />
            </div>
            <h3 className="text-base font-semibold text-foreground">No se encontraron usuarios</h3>
            <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">
              {hasActiveFilters
                ? "No hay usuarios que coincidan con los filtros aplicados. Probá modificando el término de búsqueda o limpiá los filtros."
                : "Aún no hay usuarios dados de alta en el sistema."}
            </p>
            {hasActiveFilters ? (
              <Button variant="outline" size="sm" onClick={handleClearFilters} className="text-xs gap-1.5">
                <FilterX className="size-3.5" /> Limpiar filtros
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleOpenCreate}
                className="text-xs gap-1.5 bg-[#1D2FC0] hover:bg-[#18269e] text-white"
              >
                <UserPlus className="size-3.5" /> Crear primer usuario
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-muted/40 text-xs font-semibold text-muted-foreground">
                  <tr>
                    <th className="py-3 px-4">Usuario</th>
                    <th className="py-3 px-4">Correo electrónico</th>
                    <th className="py-3 px-4">Rol asignado</th>
                    <th className="py-3 px-4">Estado</th>
                    <th className="py-3 px-4">Fecha de alta</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredUsers.map((user) => {
                    const roleMeta = getRoleMeta(user.role)
                    const RoleIcon = roleMeta.icon
                    const isActive = user.status === "activo"

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
                              <p className="font-medium text-foreground text-sm truncate">
                                {user.name}
                              </p>
                              <p className="text-[11px] text-muted-foreground font-mono">
                                {user.id}
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
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(user)}
                            className="inline-flex items-center gap-1.5 cursor-pointer group/btn"
                            title="Click para cambiar estado"
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
                        </td>

                        {/* Created At */}
                        <td className="py-3 px-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="size-3.5 text-muted-foreground/60 shrink-0" />
                            <span>{formatDate(user.createdAt)}</span>
                          </div>
                        </td>

                        {/* Actions */}
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
                                  <span>Editar datos</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleOpenPasswordReset(user)}
                                  className="gap-2 cursor-pointer"
                                >
                                  <KeyRound className="size-3.5 text-amber-600" />
                                  <span>Refrescar contraseña</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleToggleStatus(user)}
                                  className="gap-2 cursor-pointer"
                                >
                                  {isActive ? (
                                    <>
                                      <XCircle className="size-3.5 text-amber-600" />
                                      <span>Desactivar cuenta</span>
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle2 className="size-3.5 text-emerald-600" />
                                      <span>Activar cuenta</span>
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setDeletingUser(user)}
                                  className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="size-3.5" />
                                  <span>Eliminar usuario</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List */}
            <div className="md:hidden divide-y divide-border">
              {filteredUsers.map((user) => {
                const roleMeta = getRoleMeta(user.role)
                const RoleIcon = roleMeta.icon
                const isActive = user.status === "activo"

                return (
                  <div key={user.id} className="p-3.5 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                          {getInitials(user.name)}
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-foreground">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-7 text-muted-foreground">
                            <MoreVertical className="size-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52 text-xs">
                          <DropdownMenuItem onClick={() => handleOpenEdit(user)} className="gap-2">
                            <Pencil className="size-3.5" /> Editar datos
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenPasswordReset(user)} className="gap-2">
                            <KeyRound className="size-3.5 text-amber-600" /> Refrescar contraseña
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleStatus(user)} className="gap-2">
                            {isActive ? "Desactivar cuenta" : "Activar cuenta"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeletingUser(user)}
                            className="gap-2 text-destructive"
                          >
                            <Trash2 className="size-3.5" /> Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border ${roleMeta.badgeClass}`}
                      >
                        <RoleIcon className="size-3" />
                        {roleMeta.label}
                      </span>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(user)}
                          className="flex items-center gap-1 font-medium"
                        >
                          <span
                            className={`size-2 rounded-full ${
                              isActive ? "bg-emerald-500" : "bg-slate-400"
                            }`}
                          />
                          <span className={isActive ? "text-emerald-700 dark:text-emerald-400" : ""}>
                            {isActive ? "Activo" : "Inactivo"}
                          </span>
                        </button>
                        <span>•</span>
                        <span>Alta: {formatDate(user.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </Card>

      {/* Create / Edit User Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <UserPlus className="size-5 text-primary" />
              <span>{editingUser ? "Editar usuario" : "Nuevo usuario"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              {editingUser
                ? "Actualizá la información personal, rol y estado de la cuenta."
                : "Completá los datos requeridos para registrar una nueva cuenta de usuario en el sistema."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveUser} className="space-y-4 py-2">
            {/* Full Name */}
            <div className="space-y-1.5">
              <Label htmlFor="user-fullname" className="text-xs font-semibold">
                Nombre completo <span className="text-destructive">*</span>
              </Label>
              <Input
                id="user-fullname"
                placeholder="Ej. Nelson González"
                value={formData.name}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                  if (formErrors.name) setFormErrors((prev) => ({ ...prev, name: undefined }))
                }}
                className={`text-sm ${formErrors.name ? "border-destructive focus-visible:ring-destructive" : ""}`}
              />
              {formErrors.name && (
                <p className="text-[11px] text-destructive flex items-center gap-1">
                  <AlertCircle className="size-3" /> {formErrors.name}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="user-email" className="text-xs font-semibold">
                Correo electrónico <span className="text-destructive">*</span>
              </Label>
              <Input
                id="user-email"
                type="email"
                placeholder="ejemplo@districorr.com.ar"
                value={formData.email}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, email: e.target.value }))
                  if (formErrors.email) setFormErrors((prev) => ({ ...prev, email: undefined }))
                }}
                className={`text-sm ${formErrors.email ? "border-destructive focus-visible:ring-destructive" : ""}`}
              />
              {formErrors.email && (
                <p className="text-[11px] text-destructive flex items-center gap-1">
                  <AlertCircle className="size-3" /> {formErrors.email}
                </p>
              )}
            </div>

            {/* Role selection */}
            <div className="space-y-1.5">
              <Label htmlFor="user-role" className="text-xs font-semibold">
                Rol asignado <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.role}
                onValueChange={(val: BasicUserRole) =>
                  setFormData((prev) => ({ ...prev, role: val }))
                }
              >
                <SelectTrigger id="user-role" className="w-full text-sm">
                  <SelectValue placeholder="Seleccioná un rol" />
                </SelectTrigger>
                <SelectContent>
                  {BASIC_ROLES.map((roleItem) => {
                    const RoleIcon = roleItem.icon
                    return (
                      <SelectItem key={roleItem.role} value={roleItem.role}>
                        <div className="flex items-center gap-2 py-0.5">
                          <RoleIcon className="size-4 text-muted-foreground" />
                          <div className="text-left">
                            <p className="font-medium text-xs leading-none">{roleItem.label}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {roleItem.description}
                            </p>
                          </div>
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Status toggle */}
            <div className="rounded-lg border p-3 bg-muted/20 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="user-status" className="text-xs font-semibold cursor-pointer">
                    Estado de la cuenta
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    {formData.status === "activo"
                      ? "La cuenta estará habilitada para operar en el sistema."
                      : "La cuenta estará suspendida y no podrá iniciar sesión."}
                  </p>
                </div>
                <Switch
                  id="user-status"
                  checked={formData.status === "activo"}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({
                      ...prev,
                      status: checked ? "activo" : "inactivo",
                    }))
                  }
                />
              </div>
            </div>

            {/* Password notice or shortcut */}
            {editingUser ? (
              <div className="flex items-center justify-between p-2.5 rounded-md border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-900/50 text-xs">
                <div className="flex items-center gap-2">
                  <KeyRound className="size-4 text-amber-600 shrink-0" />
                  <span className="text-muted-foreground">Refresco y clave de acceso</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsModalOpen(false)
                    handleOpenPasswordReset(editingUser)
                  }}
                  className="h-7 text-xs gap-1 border-amber-300 text-amber-800 dark:text-amber-300"
                >
                  <RefreshCw className="size-3" />
                  <span>Refrescar clave</span>
                </Button>
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <Mail className="size-3.5 text-primary shrink-0" />
                <span>Se enviará un correo automático para la creación de contraseña inicial.</span>
              </p>
            )}

            <DialogFooter className="pt-2 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-[#1D2FC0] hover:bg-[#18269e] text-white"
              >
                {editingUser ? "Guardar cambios" : "Crear usuario"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Password Reset Dialog */}
      <Dialog open={Boolean(resettingUser)} onOpenChange={(open) => !open && setResettingUser(null)}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <KeyRound className="size-5 text-amber-600" />
              <span>Refrescar contraseña de acceso</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Elegí el método de refresco de credenciales para{" "}
              <strong>{resettingUser?.name}</strong> ({resettingUser?.email}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Method selection */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setResetMethod("email")}
                className={`flex flex-col items-start p-3 rounded-lg border text-left transition-all ${
                  resetMethod === "email"
                    ? "border-[#1D2FC0] bg-[#EEF0FF] text-[#071935] dark:bg-[#1D2FC0]/10 dark:text-foreground ring-1 ring-[#1D2FC0]"
                    : "border-border hover:bg-muted/40 text-muted-foreground"
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold text-xs">
                  <Send className="size-3.5 text-[#1D2FC0]" />
                  <span>Enlace por email</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Envía un correo con link seguro de auto-restablecimiento.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setResetMethod("temporary")}
                className={`flex flex-col items-start p-3 rounded-lg border text-left transition-all ${
                  resetMethod === "temporary"
                    ? "border-[#1D2FC0] bg-[#EEF0FF] text-[#071935] dark:bg-[#1D2FC0]/10 dark:text-foreground ring-1 ring-[#1D2FC0]"
                    : "border-border hover:bg-muted/40 text-muted-foreground"
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold text-xs">
                  <KeyRound className="size-3.5 text-amber-600" />
                  <span>Clave provisoria</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Genera una clave temporal para comunicar al usuario.
                </p>
              </button>
            </div>

            {/* Temporary password preview */}
            {resetMethod === "temporary" && (
              <div className="p-3 rounded-lg border bg-muted/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">Contraseña generada</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setTempPassword(generateRandomPassword())}
                    className="h-6 px-1.5 text-[11px] text-primary gap-1"
                  >
                    <RefreshCw className="size-3" />
                    <span>Regenerar</span>
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={tempPassword}
                      readOnly
                      className="font-mono text-xs pr-9 bg-background"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                    </button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopyPassword}
                    className="shrink-0 text-xs gap-1.5 h-9"
                  >
                    {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                    <span>{copied ? "Copiada" : "Copiar"}</span>
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  El usuario deberá cambiar esta contraseña obligatoriamente en su próximo inicio de sesión.
                </p>
              </div>
            )}

            {/* Email info */}
            {resetMethod === "email" && (
              <div className="p-3 rounded-lg border bg-muted/20 text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">Destinatario:</p>
                <p className="font-mono text-[11px] text-primary">{resettingUser?.email}</p>
                <p className="text-[11px] pt-1">
                  El enlace tendrá una validez de 24 horas y expirará tras su primer uso.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setResettingUser(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleExecutePasswordReset}
              className="bg-[#1D2FC0] hover:bg-[#18269e] text-white gap-1.5"
            >
              {resetMethod === "email" ? (
                <>
                  <Send className="size-3.5" />
                  <span>Enviar enlace</span>
                </>
              ) : (
                <>
                  <Check className="size-3.5" />
                  <span>Confirmar clave temporal</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Alert Dialog */}
      <AlertDialog
        open={Boolean(deletingUser)}
        onOpenChange={(open) => !open && setDeletingUser(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">
              ¿Eliminar al usuario "{deletingUser?.name}"?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Esta acción dará de baja la cuenta{" "}
              <strong>{deletingUser?.email}</strong>. Podés desactivar el usuario en lugar de
              eliminarlo si querés preservar su historial operativo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs"
            >
              Eliminar usuario
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
