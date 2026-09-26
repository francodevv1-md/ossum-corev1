"use client"

import React from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { INSTITUTION_OPTIONS } from "@/lib/statusHelpers"
import { VENDEDORES_OPTIONS } from "@/lib/presupuestos.constants"
import { SurgerySelector } from "./SurgerySelector"
import { PresupuestoCommercialIdentityFields } from "./PresupuestoCommercialIdentityFields"
import type { PresupuestoFormData, PresupuestoFormErrors } from "@/hooks/usePresupuestoForm"
import type { Surgery } from "@/types"
import { User, Building2, Briefcase } from "lucide-react"

interface DatosComercialesSectionProps {
  formData: PresupuestoFormData
  updateField: <K extends keyof PresupuestoFormData>(key: K, value: PresupuestoFormData[K]) => void
  errors: PresupuestoFormErrors
  context: "surgery" | "independent"
  surgery?: Surgery
  surgeries?: Surgery[]
  onSurgerySelect?: (surgery: Surgery) => void
}

export function DatosComercialesSection({
  formData,
  updateField,
  errors,
  context,
  surgery,
  surgeries,
  onSurgerySelect,
}: DatosComercialesSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Briefcase className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Datos Comerciales</h3>
      </div>

      {/* Surgery context header */}
      {context === "surgery" && surgery && (
        <div className="rounded-md border bg-muted/30 px-4 py-3 flex flex-wrap items-center gap-3">
          <Badge variant="outline" className="text-xs font-mono">{surgery.id}</Badge>
          <div className="flex items-center gap-1.5 text-xs">
            <User className="size-3 text-muted-foreground" />
            <span className="font-medium">{surgery.patient}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <Building2 className="size-3 text-muted-foreground" />
            <span>{surgery.institution}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            {surgery.client}
          </div>
        </div>
      )}

      {/* Independent context: surgery selector */}
      {context === "independent" && surgeries && onSurgerySelect && (
        <SurgerySelector
          surgeryId={formData.surgeryId}
          onSelect={onSurgerySelect}
          surgeries={surgeries}
        />
      )}

      <PresupuestoCommercialIdentityFields formData={formData} errors={errors} updateField={updateField} />

      {/* Form fields grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Vendedor (required) */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">
            Vendedor <span className="text-destructive">*</span>
          </Label>
          <Select value={formData.vendedor} onValueChange={(v) => updateField("vendedor", v)}>
            <SelectTrigger className={errors.vendedor ? "border-destructive" : ""}>
              <SelectValue placeholder="Seleccionar vendedor" />
            </SelectTrigger>
            <SelectContent>
              {VENDEDORES_OPTIONS.map((v) => (
                <SelectItem key={v} value={v}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.vendedor && <p className="text-[10px] text-destructive">{errors.vendedor}</p>}
        </div>

        {/* Paciente (optional) */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">Paciente</Label>
          <Input
            value={formData.patient}
            onChange={(e) => updateField("patient", e.target.value)}
            placeholder="Nombre del paciente"
            className="h-9 text-sm"
          />
        </div>

        {/* Institución (optional) */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">Institución</Label>
          <Select value={formData.institution} onValueChange={(v) => updateField("institution", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar institución" />
            </SelectTrigger>
            <SelectContent>
              {INSTITUTION_OPTIONS.filter((o) => o.value).map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Obra Social (optional) */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">Obra Social</Label>
          <Input
            value={formData.obraSocial}
            onChange={(e) => updateField("obraSocial", e.target.value)}
            placeholder="Obra social"
            className="h-9 text-sm"
          />
        </div>

        {/* Financiador (optional) */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">Financiador</Label>
          <Input
            value={formData.financiador}
            onChange={(e) => updateField("financiador", e.target.value)}
            placeholder="Financiador"
            className="h-9 text-sm"
          />
        </div>

        {/* Concepto (optional) */}
        <div className="space-y-2 sm:col-span-2">
          <Label className="text-xs font-medium">Concepto</Label>
          <Input
            value={formData.concepto}
            onChange={(e) => updateField("concepto", e.target.value)}
            placeholder="Ej: Prótesis de rodilla, Osteosíntesis..."
            className="h-9 text-sm"
          />
        </div>
      </div>
    </div>
  )
}
