"use client"

import React, { useState, useMemo } from "react"
import {
  Bell,
  Sliders,
  Shield,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Info,
  Volume2,
  VolumeX,
  Building,
  User,
} from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useNotificationPolicies } from "@/hooks/useNotifications"
import { cn } from "@/lib/utils"

const DOMAIN_LABELS: Record<string, { label: string; color: string }> = {
  CIRUGIAS: { label: "Cirugías", color: "bg-blue-50 text-blue-700 border-blue-200" },
  LOGISTICA: { label: "Logística", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  STOCK: { label: "Stock & Recepción", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  CONSUMOS: { label: "Consumo & Devolución", color: "bg-teal-50 text-teal-700 border-teal-200" },
  COMPARATIVA: { label: "Comparativa", color: "bg-purple-50 text-purple-700 border-purple-200" },
  COBROS: { label: "Facturación & Cobros", color: "bg-amber-50 text-amber-700 border-amber-200" },
  SISTEMA: { label: "Sistema", color: "bg-gray-50 text-gray-700 border-gray-200" },
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  coordinator: "Coordinador",
  logistics: "Logística / Depósito",
  billing: "Facturación",
  commercial: "Comercial / Ventas",
  technician: "Instrumentador",
  viewer: "Solo lectura",
}

export function NotificacionesConfigView() {
  const {
    isAdmin,
    userRole,
    rolePolicies,
    userPreferences,
    catalog,
    loading,
    error,
    savingKey,
    refresh,
    setRolePolicy,
    setUserPreference,
  } = useNotificationPolicies()

  const [activeTab, setActiveTab] = useState<"preferences" | "policies">("preferences")
  const [selectedRole, setSelectedRole] = useState<string>("coordinator")

  // Group user preferences by domain
  const userPrefsByDomain = useMemo(() => {
    const map = new Map<string, typeof userPreferences>()
    for (const pref of userPreferences) {
      const list = map.get(pref.domain) || []
      list.push(pref)
      map.set(pref.domain, list)
    }
    return map
  }, [userPreferences])

  // Filter role policies for selected role, grouped by domain
  const rolePoliciesByDomain = useMemo(() => {
    const list = rolePolicies.filter((p) => p.role === selectedRole)
    const map = new Map<string, typeof list>()
    for (const policy of list) {
      const group = map.get(policy.domain) || []
      group.push(policy)
      map.set(policy.domain, group)
    }
    return map
  }, [rolePolicies, selectedRole])

  const handleUserToggle = async (notificationType: string, currentMuted: boolean) => {
    try {
      await setUserPreference(notificationType, !currentMuted)
      toast.success(!currentMuted ? "Notificación silenciada" : "Notificación reactivada")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al actualizar preferencia")
    }
  }

  const handleRoleToggle = async (role: string, notificationType: string, currentEnabled: boolean) => {
    try {
      await setRolePolicy(role, notificationType, !currentEnabled)
      toast.success("Política de rol actualizada")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al actualizar política")
    }
  }

  if (loading && userPreferences.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-center">
        <p className="text-sm font-medium text-destructive">{error}</p>
        <Button size="sm" variant="outline" className="mt-3" onClick={refresh}>
          Reintentar
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Notificaciones Internas</h2>
          <p className="text-xs text-muted-foreground">
            Ajustá tus alertas personales y las políticas de distribución de eventos por rol.
          </p>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as "preferences" | "policies")}
          className="w-auto"
        >
          <TabsList className="grid grid-cols-2 h-9">
            <TabsTrigger value="preferences" className="text-xs gap-1.5 px-3">
              <User className="size-3.5" />
              <span>Mis Preferencias</span>
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="policies" className="text-xs gap-1.5 px-3">
                <Building className="size-3.5" />
                <span>Políticas de Empresa</span>
              </TabsTrigger>
            )}
          </TabsList>
        </Tabs>
      </div>

      {activeTab === "preferences" ? (
        <div className="space-y-6">
          <Card className="border-primary/20 bg-primary/[0.02]">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                  <Sliders className="size-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Tus canales y alertas activas</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Tu rol actual es <Badge variant="outline" className="mx-1 text-[11px] font-medium">{ROLE_LABELS[userRole] || userRole}</Badge>.
                    Podés silenciar eventos individuales en la aplicación. Las preferencias no pueden otorgar acceso a eventos no permitidos para tu rol.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {Array.from(userPrefsByDomain.entries()).map(([domain, prefs]) => {
            const domainMeta = DOMAIN_LABELS[domain] || { label: domain, color: "bg-gray-50 text-gray-700" }
            return (
              <Card key={domain}>
                <CardHeader className="py-3 px-5 border-b bg-muted/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{domainMeta.label}</span>
                      <Badge variant="outline" className={cn("text-[10px]", domainMeta.color)}>
                        {prefs.length} tipos
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0 divide-y">
                  {prefs.map((pref) => {
                    const isSaving = savingKey === `user:${pref.notificationType}`
                    return (
                      <div
                        key={pref.notificationType}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 hover:bg-muted/30 transition-colors"
                      >
                        <div className="space-y-0.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">{pref.label}</span>
                            {pref.inAppMuted && (
                              <Badge variant="secondary" className="text-[10px] text-muted-foreground">
                                Silenciada
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{pref.description}</p>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                            {pref.inAppMuted ? (
                              <>
                                <VolumeX className="size-3.5 text-muted-foreground" />
                                <span>Silenciada</span>
                              </>
                            ) : (
                              <>
                                <Volume2 className="size-3.5 text-primary" />
                                <span>Activa</span>
                              </>
                            )}
                          </span>
                          <Switch
                            checked={!pref.inAppMuted}
                            disabled={isSaving}
                            onCheckedChange={() => handleUserToggle(pref.notificationType, pref.inAppMuted)}
                          />
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <div className="space-y-6">
          <Card className="border-amber-200 bg-amber-50/40">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-amber-100 text-amber-800 shrink-0">
                  <Shield className="size-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-amber-900">Políticas por Rol de Empresa</h3>
                  <p className="text-xs text-amber-800/80 mt-0.5">
                    Como administrador podés definir qué roles reciben cada evento en la aplicación por defecto.
                    Los usuarios con ese rol podrán silenciarlo voluntariamente, pero ningún usuario puede recibir eventos de roles no habilitados.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Role selector buttons */}
          <div className="flex flex-wrap gap-1.5 border-b pb-3">
            {Object.entries(ROLE_LABELS).map(([roleKey, label]) => {
              const active = selectedRole === roleKey
              return (
                <Button
                  key={roleKey}
                  type="button"
                  size="sm"
                  variant={active ? "default" : "outline"}
                  className="text-xs h-8"
                  onClick={() => setSelectedRole(roleKey)}
                >
                  <span>{label}</span>
                </Button>
              )
            })}
          </div>

          {Array.from(rolePoliciesByDomain.entries()).map(([domain, policies]) => {
            const domainMeta = DOMAIN_LABELS[domain] || { label: domain, color: "bg-gray-50 text-gray-700" }
            return (
              <Card key={domain}>
                <CardHeader className="py-3 px-5 border-b bg-muted/20">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">{domainMeta.label}</span>
                    <Badge variant="outline" className={cn("text-[10px]", domainMeta.color)}>
                      {ROLE_LABELS[selectedRole]}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0 divide-y">
                  {policies.map((policy) => {
                    const isSaving = savingKey === `role:${selectedRole}:${policy.notificationType}`
                    return (
                      <div
                        key={policy.notificationType}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 hover:bg-muted/30 transition-colors"
                      >
                        <div className="space-y-0.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">{policy.label}</span>
                            {policy.isDefault && (
                              <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">
                                predeterminado
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{policy.description}</p>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                          <span className="text-xs font-medium text-muted-foreground">
                            {policy.inAppEnabled ? "Habilitado" : "Deshabilitado"}
                          </span>
                          <Switch
                            checked={policy.inAppEnabled}
                            disabled={isSaving}
                            onCheckedChange={() =>
                              handleRoleToggle(selectedRole, policy.notificationType, policy.inAppEnabled)
                            }
                          />
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
