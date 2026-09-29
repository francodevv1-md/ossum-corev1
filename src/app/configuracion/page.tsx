"use client"

import React, { Suspense, useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import Link from "next/link"
import { useOrtoTrackStore } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import {
  Settings,
  User,
  Bell,
  Palette,
  Database,
  Globe,
  Save,
  Users,
  Shield,
  ArrowRight,
  UserCheck,
} from "lucide-react"
import { UsuariosRolesView } from "@/components/configuracion/UsuariosRolesView"

function ConfiguracionContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tabParam = searchParams.get("tab")

  const [activeTab, setActiveTab] = useState<string>(
    tabParam === "usuarios" || tabParam === "users" ? "usuarios" : "general"
  )

  const store = useOrtoTrackStore()
  const currentUser = store.users.find((u) => u.id === store.currentUserId) || store.users[0]
  const { resolvedTheme, setTheme } = useTheme()
  const [isThemeReady, setIsThemeReady] = useState(false)

  // Local settings state
  const [companyName, setCompanyName] = useState("OrtoTrack")
  const [companyCuit, setCompanyCuit] = useState("30-71234567-8")
  const [companyAddress, setCompanyAddress] = useState("Av. Corrientes 1234, CABA")
  const [defaultDeposit, setDefaultDeposit] = useState("Depósito Central")
  const [currency, setCurrency] = useState("ARS")
  const [notifExpiry, setNotifExpiry] = useState(true)
  const [notifStock, setNotifStock] = useState(true)
  const [notifSurgery, setNotifSurgery] = useState(true)
  const [expiryWarningDays, setExpiryWarningDays] = useState("90")

  useEffect(() => {
    setIsThemeReady(true)
  }, [])

  useEffect(() => {
    if (tabParam === "usuarios" || tabParam === "users") {
      setActiveTab("usuarios")
    }
  }, [tabParam])

  const darkMode = isThemeReady && resolvedTheme === "dark"

  const handleSave = () => {
    toast.success("Configuración guardada exitosamente")
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    if (value === "usuarios") {
      router.replace("/configuracion?tab=usuarios")
    } else {
      router.replace("/configuracion")
    }
  }

  return (
    <div className="space-y-4">
      {/* Navigation Tabs Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Configuración del Sistema</h1>
          <p className="text-xs text-muted-foreground">
            Ajustes generales, preferencias operativas, usuarios y roles.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-auto">
          <TabsList className="grid grid-cols-2 h-9">
            <TabsTrigger value="general" className="text-xs gap-1.5 px-3">
              <Settings className="size-3.5" />
              <span>General</span>
            </TabsTrigger>
            <TabsTrigger value="usuarios" className="text-xs gap-1.5 px-3">
              <Users className="size-3.5" />
              <span>Usuarios y roles</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {activeTab === "usuarios" ? (
        <UsuariosRolesView embeddedInConfig />
      ) : (
        <div className="space-y-4">
          {/* Action Header for General */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Ajustes Generales</h2>
              <p className="text-xs text-muted-foreground">Parámetros globales de la organización</p>
            </div>
            <Button size="sm" className="gap-1.5 shrink-0 bg-[#1D2FC0] hover:bg-[#18269e] text-white" onClick={handleSave}>
              <Save className="size-4" /> Guardar Cambios
            </Button>
          </div>

          {/* Quick Access to Users and Roles */}
          <Card className="border-primary/20 bg-primary/[0.02] dark:bg-primary/[0.04]">
            <CardContent className="pt-4 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Users className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <span>Usuarios y roles</span>
                      <Badge variant="outline" className="text-[10px] font-normal">
                        Nivel 1
                      </Badge>
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Administrá los miembros del equipo, altas, asignación de roles y estados de acceso.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTabChange("usuarios")}
                    className="text-xs gap-1.5"
                  >
                    <span>Ver usuarios</span>
                    <ArrowRight className="size-3.5" />
                  </Button>
                  <Link href="/roles">
                    <Button variant="ghost" size="sm" className="text-xs gap-1 text-muted-foreground">
                      <Shield className="size-3.5 text-primary" />
                      <span>Roles</span>
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Current User */}
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                  <User className="size-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">{currentUser.name}</p>
                  <p className="text-xs text-muted-foreground">{currentUser.email} • {currentUser.role}</p>
                </div>
                <Badge variant="success" className="text-[10px] ml-auto">Activo</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Company Settings */}
          <Card>
            <CardContent className="pt-4 pb-4 space-y-4">
              <div className="flex items-center gap-2">
                <Globe className="size-4 text-primary" />
                <h3 className="text-sm font-semibold">Datos de la Empresa</h3>
              </div>
              <Separator />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>CUIT</Label>
                  <Input value={companyCuit} onChange={(e) => setCompanyCuit(e.target.value)} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Dirección</Label>
                  <Input value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Operations Settings */}
          <Card>
            <CardContent className="pt-4 pb-4 space-y-4">
              <div className="flex items-center gap-2">
                <Settings className="size-4 text-primary" />
                <h3 className="text-sm font-semibold">Configuración Operativa</h3>
              </div>
              <Separator />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Depósito predeterminado</Label>
                  <Select value={defaultDeposit} onValueChange={setDefaultDeposit}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Depósito Central">Depósito Central</SelectItem>
                      <SelectItem value="Depósito Quirúrgico">Depósito Quirúrgico</SelectItem>
                      <SelectItem value="Depósito Logística">Depósito Logística</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Moneda</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ARS">Pesos Argentinos (ARS)</SelectItem>
                      <SelectItem value="USD">Dólares (USD)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Días aviso vencimiento</Label>
                  <Input
                    type="number"
                    value={expiryWarningDays}
                    onChange={(e) => setExpiryWarningDays(e.target.value)}
                    min={30}
                    max={365}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardContent className="pt-4 pb-4 space-y-4">
              <div className="flex items-center gap-2">
                <Bell className="size-4 text-primary" />
                <h3 className="text-sm font-semibold">Notificaciones</h3>
              </div>
              <Separator />
              <div className="space-y-3">
                <label className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Vencimientos de stock</p>
                    <p className="text-xs text-muted-foreground">Alertar cuando artículos estén próximos a vencer</p>
                  </div>
                  <Switch checked={notifExpiry} onCheckedChange={setNotifExpiry} />
                </label>
                <label className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Stock bajo mínimo</p>
                    <p className="text-xs text-muted-foreground">Alertar cuando el stock esté por debajo del mínimo</p>
                  </div>
                  <Switch checked={notifStock} onCheckedChange={setNotifStock} />
                </label>
                <label className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Cambios en cirugías</p>
                    <p className="text-xs text-muted-foreground">Notificar cambios de estado, fecha o suspensión</p>
                  </div>
                  <Switch checked={notifSurgery} onCheckedChange={setNotifSurgery} />
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Appearance */}
          <Card>
            <CardContent className="pt-4 pb-4 space-y-4">
              <div className="flex items-center gap-2">
                <Palette className="size-4 text-primary" />
                <h3 className="text-sm font-semibold">Apariencia</h3>
              </div>
              <Separator />
              <label className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Modo oscuro</p>
                  <p className="text-xs text-muted-foreground">Cambiar a tema oscuro</p>
                </div>
                <Switch
                  checked={darkMode}
                  onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                  disabled={!isThemeReady}
                />
              </label>
            </CardContent>
          </Card>

          {/* System Info */}
          <Card>
            <CardContent className="pt-4 pb-4 space-y-3">
              <div className="flex items-center gap-2">
                <Database className="size-4 text-primary" />
                <h3 className="text-sm font-semibold">Información del Sistema</h3>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Versión:</span><p className="font-medium">2.2.0</p></div>
                <div><span className="text-muted-foreground">Entorno:</span><p className="font-medium">Producción</p></div>
                <div><span className="text-muted-foreground">Base de datos:</span><p className="font-medium">PostgreSQL</p></div>
                <div><span className="text-muted-foreground">Framework:</span><p className="font-medium">Next.js 16</p></div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

export default function ConfiguracionPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Cargando configuración...</div>}>
      <ConfiguracionContent />
    </Suspense>
  )
}
