"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { useTheme } from "next-themes"
import { toast } from "sonner"
import {
  User,
  Shield,
  KeyRound,
  Building2,
  Mail,
  Smartphone,
  Save,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Laptop,
  Sun,
  Moon,
  Lock,
  Layers,
  Check,
  Eye,
  EyeOff,
  ArrowLeft,
  BellRing,
  BadgeCheck,
  RefreshCw,
  Palette,
  Dice5,
  Smile,
} from "lucide-react"
import { useAuth } from "@/components/auth/AuthProvider"
import { supabaseBrowserClient } from "@/lib/auth/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { UserAvatar } from "@/components/ui/user-avatar"
import { Blobatar } from "@blobatar/react"

const AVATAR_PRESETS = [
  "ossum-cor",
  "cirugia-master",
  "quirurgico-dev",
  "logistica-pro",
  "biomedica-99",
  "ortopedia-central",
  "medtech-innovator",
  "traumatologia-vip",
]

export default function PerfilUsuarioPage() {
  const { user, currentUser, currentAccess, activeCompany, signOut } = useAuth()
  const { theme, setTheme } = useTheme()

  // Form State
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [phone, setPhone] = useState("+54 11 4567-8900")

  // Avatar customization state (Blobatar)
  const [avatarSeed, setAvatarSeed] = useState("")
  const [avatarBg, setAvatarBg] = useState<"squircle" | "circle" | "square" | "none">("squircle")
  const [avatarAnimate, setAvatarAnimate] = useState<"hover" | "always" | "none">("hover")

  // Password state
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)

  // Notification Preferences
  const [notifySurgeries, setNotifySurgeries] = useState(true)
  const [notifyUrgent, setNotifyUrgent] = useState(true)
  const [notifyLogistics, setNotifyLogistics] = useState(false)
  const [notifyEmailSummary, setNotifyEmailSummary] = useState(true)

  // Loading / saving
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  // Sync initial state when user loads
  useEffect(() => {
    // Load local stored avatar seed preference if exists
    const storedSeed = typeof window !== "undefined" ? localStorage.getItem("ossum_avatar_seed") : null
    const storedBg = typeof window !== "undefined" ? localStorage.getItem("ossum_avatar_bg") : null

    if (storedSeed) setAvatarSeed(storedSeed)
    if (storedBg && (storedBg === "squircle" || storedBg === "circle" || storedBg === "square" || storedBg === "none")) {
      setAvatarBg(storedBg as any)
    }

    if (currentUser) {
      setFirstName(currentUser.firstName || "")
      setLastName(currentUser.lastName || "")
      setDisplayName(currentUser.displayName || "")
      if (!storedSeed) {
        setAvatarSeed(currentUser.email || currentUser.displayName || "ossum-user")
      }
    } else if (user?.email) {
      const fallbackName = user.email.split("@")[0] || ""
      setDisplayName(fallbackName)
      if (!storedSeed) {
        setAvatarSeed(user.email)
      }
    }
  }, [currentUser, user])

  const effectiveEmail = user?.email || currentUser?.email || "usuario@ossumcor.com"
  const effectiveRole = currentAccess?.role || "Administrador"
  const effectiveCompany = activeCompany?.name || "OSSUM Distribuidora Quirúrgica"
  const currentEffectiveSeed = avatarSeed.trim() || effectiveEmail

  const handleRandomizeAvatar = () => {
    const randomSuffix = Math.floor(Math.random() * 9000 + 1000)
    const baseName = (displayName || firstName || "usuario").toLowerCase().replace(/[^a-z0-9]/g, "")
    const newSeed = `${baseName}-${randomSuffix}`
    setAvatarSeed(newSeed)
    toast.info("Nuevo avatar generado", {
      description: `Semilla activa: ${newSeed}`,
    })
  }

  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setIsSavingProfile(true)
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("ossum_avatar_seed", currentEffectiveSeed)
        localStorage.setItem("ossum_avatar_bg", avatarBg)
        localStorage.setItem("ossum_avatar_animate", avatarAnimate)
        window.dispatchEvent(new Event("ossum_avatar_changed"))
      }

      if (user) {
        await supabaseBrowserClient.auth.updateUser({
          data: {
            first_name: firstName,
            last_name: lastName,
            display_name: displayName,
            avatar_seed: currentEffectiveSeed,
            avatar_bg: avatarBg,
          },
        })
      }
      toast.success("Perfil y avatar guardados con éxito", {
        description: "Tu avatar Blobatar personalizado se aplicó en toda la plataforma.",
      })
    } catch (err) {
      toast.error("No se pudo actualizar el perfil", {
        description: err instanceof Error ? err.message : "Error desconocido",
      })
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPassword || newPassword.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres")
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error("Las contraseñas no coinciden")
      return
    }

    setIsUpdatingPassword(true)
    try {
      const { error } = await supabaseBrowserClient.auth.updateUser({
        password: newPassword,
      })
      if (error) throw error
      toast.success("Contraseña actualizada correctamente")
      setNewPassword("")
      setConfirmPassword("")
    } catch (err) {
      toast.error("Error al actualizar la contraseña", {
        description: err instanceof Error ? err.message : "Error de autenticación",
      })
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  const roleCapabilities: Record<string, string[]> = {
    admin: [
      "Control integral de Cirugías y Expedientes",
      "Autorizaciones médicas y comerciales",
      "Facturación, cobranzas y anulación de comprobantes",
      "Gestión de Stock, Cajas y Remitos",
      "Configuración multiempresa y roles",
    ],
    coordinador: [
      "Coordinación y agenda de Cirugías",
      "Gestión de solicitudes y materiales",
      "Seguimiento y trazabilidad logística",
      "Gestión de documentación quirúrgica",
    ],
    instrumentador: [
      "Consulta de cirugías asignadas",
      "Carga de consumo y planilla quirúrgica",
      "Control de sets y cajas en quirófano",
    ],
  }

  const activeCapabilities =
    roleCapabilities[effectiveRole.toLowerCase()] || roleCapabilities["admin"]

  return (
    <div className="container mx-auto max-w-5xl space-y-6 pb-12 pt-2 sm:pt-4">
      {/* ── BREADCRUMB & VOLVER ── */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link
            href="/cirugias"
            className="flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            Volver al Módulo Principal
          </Link>
          <span>/</span>
          <span className="font-semibold text-foreground">Perfil de Usuario</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void signOut()}
            className="h-8 gap-1.5 border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/30 text-xs"
          >
            <LogOut className="size-3.5" />
            Cerrar Sesión
          </Button>
          <Button
            size="sm"
            onClick={() => void handleSaveProfile()}
            disabled={isSavingProfile}
            className="h-8 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 text-xs"
          >
            <Save className="size-3.5" />
            {isSavingProfile ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </div>
      </div>

      {/* ── HERO BANNER DE PERFIL CON BLOBATAR ── */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 p-6 text-white shadow-md dark:border-slate-800">
        <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Blobatar Avatar Display */}
            <div className="relative group cursor-pointer" onClick={handleRandomizeAvatar} title="Clic para generar un nuevo avatar Blobatar">
              <UserAvatar
                seed={currentEffectiveSeed}
                size={84}
                background={avatarBg === "none" ? false : avatarBg}
                animate={avatarAnimate === "none" ? undefined : avatarAnimate}
                className="ring-4 ring-white/20 shadow-xl bg-slate-950/60 transition-transform group-hover:scale-105"
              />
              <span className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full bg-blue-600 text-white shadow-md border-2 border-slate-900 group-hover:bg-blue-500">
                <Dice5 className="size-3.5" />
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  {displayName || `${firstName} ${lastName}` || "Usuario OSSUM COR"}
                </h1>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] uppercase tracking-wider font-semibold">
                  <span className="mr-1 size-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                  Activo
                </Badge>
              </div>
              <p className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-300">
                <Mail className="size-3.5 text-slate-400" />
                {effectiveEmail}
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-0.5 text-[11px] font-medium text-slate-200 backdrop-blur-xs">
                  <Building2 className="size-3 text-blue-300" />
                  {effectiveCompany}
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/20 px-2 py-0.5 text-[11px] font-medium text-blue-200 border border-blue-400/20">
                  <Shield className="size-3 text-blue-400" />
                  Rol: {effectiveRole}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-xs text-xs sm:text-right">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Avatar & Sesión
            </span>
            <span className="font-mono text-[11px] text-slate-200">
              Semilla: {currentEffectiveSeed.slice(0, 16)}
            </span>
            <span className="text-[10px] text-emerald-400 flex items-center sm:justify-end gap-1">
              <BadgeCheck className="size-3.5" /> Generado con Blobatar React
            </span>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -right-16 -top-16 size-64 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 size-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
      </div>

      {/* ── TABS PRINCIPALES DE GESTIÓN ── */}
      <Tabs defaultValue="avatar" className="w-full space-y-4">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 h-10 p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <TabsTrigger value="avatar" className="gap-1.5 text-xs font-medium">
            <Smile className="size-3.5" />
            Avatar Blobatar
          </TabsTrigger>
          <TabsTrigger value="general" className="gap-1.5 text-xs font-medium">
            <User className="size-3.5" />
            General
          </TabsTrigger>
          <TabsTrigger value="seguridad" className="gap-1.5 text-xs font-medium">
            <Lock className="size-3.5" />
            Seguridad
          </TabsTrigger>
          <TabsTrigger value="preferencias" className="gap-1.5 text-xs font-medium">
            <Sparkles className="size-3.5" />
            Preferencias
          </TabsTrigger>
          <TabsTrigger value="permisos" className="gap-1.5 text-xs font-medium">
            <Layers className="size-3.5" />
            Permisos
          </TabsTrigger>
        </TabsList>

        {/* ── TAB 0: PERSONALIZADOR BLOBATAR ── */}
        <TabsContent value="avatar" className="space-y-4 outline-hidden">
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Palette className="size-4 text-blue-600 dark:text-blue-400" />
                Creador de Avatar Blobatar
              </CardTitle>
              <CardDescription className="text-xs">
                Generá un avatar geométrico determinístico único e interactivo para tu cuenta.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Preview Grid */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-6 dark:border-slate-800 dark:bg-slate-900/40">
                <div className="flex flex-col items-center sm:items-start gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Vista previa en vivo
                  </span>
                  <div className="flex items-center gap-4 pt-1">
                    <UserAvatar
                      seed={currentEffectiveSeed}
                      size={96}
                      background={avatarBg === "none" ? false : avatarBg}
                      animate={avatarAnimate === "none" ? undefined : avatarAnimate}
                      className="border border-slate-200 dark:border-slate-700 shadow-md bg-white dark:bg-slate-950"
                    />
                    <div className="flex flex-col gap-2">
                      <UserAvatar
                        seed={currentEffectiveSeed}
                        size={48}
                        background={avatarBg === "none" ? false : avatarBg}
                        animate={avatarAnimate === "none" ? undefined : avatarAnimate}
                        className="border border-slate-200 dark:border-slate-700 shadow-xs bg-white dark:bg-slate-950"
                      />
                      <UserAvatar
                        seed={currentEffectiveSeed}
                        size={32}
                        background={avatarBg === "none" ? false : avatarBg}
                        animate={avatarAnimate === "none" ? undefined : avatarAnimate}
                        className="border border-slate-200 dark:border-slate-700 shadow-2xs bg-white dark:bg-slate-950"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground pt-2">
                    Pasa el cursor sobre el avatar para ver la animación en acción.
                  </p>
                </div>

                <div className="flex flex-col gap-2 w-full sm:w-auto">
                  <Button
                    type="button"
                    onClick={handleRandomizeAvatar}
                    variant="outline"
                    className="gap-2 text-xs border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-950/40"
                  >
                    <Dice5 className="size-4 text-blue-600 dark:text-blue-400" />
                    Generar Avatar Aleatorio
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setAvatarSeed(effectiveEmail)}
                    variant="ghost"
                    size="sm"
                    className="text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    Restablecer a mi Email
                  </Button>
                </div>
              </div>

              {/* Controls */}
              <div className="grid gap-6 sm:grid-cols-2">
                {/* Seed input */}
                <div className="space-y-2">
                  <Label htmlFor="avatarSeedInput" className="text-xs font-semibold">
                    Semilla / Nombre Clave
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="avatarSeedInput"
                      value={avatarSeed}
                      onChange={(e) => setAvatarSeed(e.target.value)}
                      placeholder={effectiveEmail}
                      className="text-xs font-mono"
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={handleRandomizeAvatar}
                      title="Aleatorio"
                      className="shrink-0 size-9"
                    >
                      <RefreshCw className="size-3.5" />
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Cualquier palabra o frase genera una forma y expresión geométrica única e irrepetible.
                  </p>
                </div>

                {/* Shape / Background */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Forma del Fondo</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: "squircle", label: "Squircle" },
                      { id: "circle", label: "Círculo" },
                      { id: "square", label: "Cuadrado" },
                      { id: "none", label: "Sin fondo" },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setAvatarBg(item.id as any)}
                        className={`rounded-lg border px-2 py-1.5 text-center text-xs font-medium transition-all ${
                          avatarBg === item.id
                            ? "border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 font-bold"
                            : "border-slate-200 hover:border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Presets */}
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-xs font-semibold">Sugerencias y Estilos Predefinidos</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {AVATAR_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setAvatarSeed(preset)}
                        className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-all ${
                          avatarSeed === preset
                            ? "border-blue-600 bg-blue-600 text-white font-semibold shadow-2xs"
                            : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        <UserAvatar seed={preset} size={16} background={false} />
                        <span>{preset}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="button"
                  onClick={() => void handleSaveProfile()}
                  disabled={isSavingProfile}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5"
                >
                  <Save className="size-3.5" />
                  {isSavingProfile ? "Guardando..." : "Guardar este Avatar"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB 1: GENERAL ── */}
        <TabsContent value="general" className="space-y-4 outline-hidden">
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <User className="size-4 text-blue-600 dark:text-blue-400" />
                Información Personal
              </CardTitle>
              <CardDescription className="text-xs">
                Actualizá tus datos de contacto y el nombre visible en la plataforma.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="firstName" className="text-xs font-semibold">
                      Nombre
                    </Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Ej: Franco"
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lastName" className="text-xs font-semibold">
                      Apellido
                    </Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Ej: Dev"
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="displayName" className="text-xs font-semibold">
                      Nombre para mostrar (Alias)
                    </Label>
                    <Input
                      id="displayName"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Ej: Franco (Administración)"
                      className="text-xs"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Este es el nombre visible en comentarios, novedades y el encabezado superior.
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-semibold">
                      Correo Electrónico
                    </Label>
                    <div className="relative">
                      <Input
                        id="email"
                        value={effectiveEmail}
                        disabled
                        className="text-xs bg-slate-50 dark:bg-slate-900 pr-20 text-muted-foreground font-mono"
                      />
                      <Badge
                        variant="outline"
                        className="absolute right-2 top-1.5 text-[9px] bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800"
                      >
                        Verificado
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-xs font-semibold">
                      Teléfono de Contacto
                    </Label>
                    <div className="relative">
                      <Smartphone className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                      <Input
                        id="phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+54 9 11 ..."
                        className="pl-8 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    disabled={isSavingProfile}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5"
                  >
                    <Save className="size-3.5" />
                    {isSavingProfile ? "Guardando..." : "Guardar Cambios"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB 2: SEGURIDAD ── */}
        <TabsContent value="seguridad" className="space-y-4 outline-hidden">
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <KeyRound className="size-4 text-blue-600 dark:text-blue-400" />
                Actualizar Contraseña
              </CardTitle>
              <CardDescription className="text-xs">
                Modificá tu clave de acceso a OSSUM COR. Se recomienda utilizar más de 8 caracteres con números y símbolos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-xl">
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="newPassword" className="text-xs font-semibold">
                      Nueva Contraseña
                    </Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Ingresá tu nueva clave"
                        className="pr-9 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="confirmPassword" className="text-xs font-semibold">
                      Confirmar Nueva Contraseña
                    </Label>
                    <Input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repetí la nueva clave"
                      className="text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    disabled={isUpdatingPassword || !newPassword}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5"
                  >
                    <KeyRound className="size-3.5" />
                    {isUpdatingPassword ? "Actualizando..." : "Cambiar Contraseña"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Clock className="size-4 text-slate-600 dark:text-slate-400" />
                Sesiones & Conectividad
              </CardTitle>
              <CardDescription className="text-xs">
                Información de auditoría de tu sesión actual.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-800 p-3">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <Laptop className="size-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      Navegador Web Actual (Sesión Activa)
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Conectado a la empresa {effectiveCompany}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-emerald-600 border-emerald-300 dark:border-emerald-800 text-[10px]">
                  En Línea
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB 3: PREFERENCIAS ── */}
        <TabsContent value="preferencias" className="space-y-4 outline-hidden">
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Sparkles className="size-4 text-blue-600 dark:text-blue-400" />
                Apariencia & Tema Visual
              </CardTitle>
              <CardDescription className="text-xs">
                Elegí cómo querés ver la interfaz de OSSUM COR en este dispositivo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => setTheme("light")}
                  className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all ${
                    theme === "light"
                      ? "border-blue-600 bg-blue-50/50 shadow-xs dark:bg-blue-950/20"
                      : "border-slate-200 hover:border-slate-300 dark:border-slate-800"
                  }`}
                >
                  <div className="flex size-10 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                    <Sun className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold">Modo Claro</p>
                    <p className="text-[10px] text-muted-foreground">Fondo blanco nítido</p>
                  </div>
                  {theme === "light" && (
                    <Check className="size-4 text-blue-600 dark:text-blue-400 mt-1" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setTheme("dark")}
                  className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all ${
                    theme === "dark"
                      ? "border-blue-600 bg-blue-50/50 shadow-xs dark:bg-blue-950/20"
                      : "border-slate-200 hover:border-slate-300 dark:border-slate-800"
                  }`}
                >
                  <div className="flex size-10 items-center justify-center rounded-full bg-slate-900 text-slate-100">
                    <Moon className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold">Modo Oscuro</p>
                    <p className="text-[10px] text-muted-foreground">Paleta slate profunda</p>
                  </div>
                  {theme === "dark" && (
                    <Check className="size-4 text-blue-600 dark:text-blue-400 mt-1" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setTheme("system")}
                  className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all ${
                    theme === "system"
                      ? "border-blue-600 bg-blue-50/50 shadow-xs dark:bg-blue-950/20"
                      : "border-slate-200 hover:border-slate-300 dark:border-slate-800"
                  }`}
                >
                  <div className="flex size-10 items-center justify-center rounded-full bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    <Laptop className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold">Automático (Sistema)</p>
                    <p className="text-[10px] text-muted-foreground">Según tu sistema operativo</p>
                  </div>
                  {theme === "system" && (
                    <Check className="size-4 text-blue-600 dark:text-blue-400 mt-1" />
                  )}
                </button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <BellRing className="size-4 text-blue-600 dark:text-blue-400" />
                Notificaciones Operativas
              </CardTitle>
              <CardDescription className="text-xs">
                Configurá qué tipo de avisos deseás recibir en tiempo real.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-1.5">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">Cirugías Urgentes</p>
                  <p className="text-[11px] text-muted-foreground">Alertas inmediatas de casos marcados como urgentes.</p>
                </div>
                <Switch checked={notifyUrgent} onCheckedChange={setNotifyUrgent} />
              </div>
              <Separator />
              <div className="flex items-center justify-between py-1.5">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">Cambios de Estado en Cirugías</p>
                  <p className="text-[11px] text-muted-foreground">Notificar cuando una cirugía se autoriza o despacha.</p>
                </div>
                <Switch checked={notifySurgeries} onCheckedChange={setNotifySurgeries} />
              </div>
              <Separator />
              <div className="flex items-center justify-between py-1.5">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">Despachos y Remitos (Logística)</p>
                  <p className="text-[11px] text-muted-foreground">Avisos de remito generado y salida de chofer.</p>
                </div>
                <Switch checked={notifyLogistics} onCheckedChange={setNotifyLogistics} />
              </div>
              <Separator />
              <div className="flex items-center justify-between py-1.5">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">Resumen Diario por Email</p>
                  <p className="text-[11px] text-muted-foreground">Recibir cada mañana el cronograma de cirugías del día.</p>
                </div>
                <Switch checked={notifyEmailSummary} onCheckedChange={setNotifyEmailSummary} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB 4: PERMISOS ── */}
        <TabsContent value="permisos" className="space-y-4 outline-hidden">
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Shield className="size-4 text-blue-600 dark:text-blue-400" />
                Alcance y Capacidades del Rol
              </CardTitle>
              <CardDescription className="text-xs">
                Detalle de permisos operativos otorgados a tu cuenta bajo el rol{" "}
                <strong className="text-foreground">{effectiveRole}</strong>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2.5 sm:grid-cols-2">
                {activeCapabilities.map((cap, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2.5 rounded-xl border border-slate-200/80 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/50 text-xs"
                  >
                    <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span className="font-medium text-slate-800 dark:text-slate-200">{cap}</span>
                  </div>
                ))}
              </div>

              <Alert className="bg-blue-50/60 border-blue-200 text-blue-900 dark:bg-blue-950/20 dark:border-blue-900/50 dark:text-blue-200 mt-4">
                <AlertCircle className="size-4 text-blue-600 dark:text-blue-400" />
                <AlertTitle className="text-xs font-bold">Seguridad Multiempresa</AlertTitle>
                <AlertDescription className="text-[11px] leading-relaxed">
                  Tus permisos y acceso a cirugías, remitos y facturación están aislados de forma segura dentro de{" "}
                  <strong>{effectiveCompany}</strong>. Si necesitás cambiar de sucursal o solicitar permisos adicionales, contactá al Administrador del Sistema.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
