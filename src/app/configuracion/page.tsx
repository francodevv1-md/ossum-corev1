"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { useOrtoTrackStore } from "@/lib/store"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import {
  Settings, User, Bell, Palette, Database,
  Globe, Save,
} from "lucide-react"

export default function ConfiguracionPage() {
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

  const darkMode = isThemeReady && resolvedTheme === "dark"

  const handleSave = () => {
    toast.success("Configuración guardada exitosamente")
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Configuración</h1>
          <p className="text-sm text-muted-foreground">Ajustes generales del sistema</p>
        </div>
        <Button size="sm" className="gap-1.5 shrink-0" onClick={handleSave}>
          <Save className="size-4" /> Guardar Cambios
        </Button>
      </div>

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
            <div><span className="text-muted-foreground">Base de datos:</span><p className="font-medium">SQLite</p></div>
            <div><span className="text-muted-foreground">Framework:</span><p className="font-medium">Next.js 16</p></div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
