"use client"

import React from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { VIGENCIA_OPTIONS, LISTA_PRECIOS_OPTIONS, CONDICION_PAGO_OPTIONS, IVA_OPTIONS } from "@/lib/presupuestos.constants"
import type { PresupuestoFormData, PresupuestoFormErrors } from "@/hooks/usePresupuestoForm"

/**
 * CHATZAI-017E — Ultra-compact conditions strip.
 * 
 * Workspace mode: single flat line with minimal labels, no borders,
 * no background, no visual weight — just data entry controls
 * that blend into the workspace. Like Excel's formula bar.
 */

interface CondicionesSectionProps {
  formData: PresupuestoFormData
  updateField: <K extends keyof PresupuestoFormData>(key: K, value: PresupuestoFormData[K]) => void
  errors: PresupuestoFormErrors
  compact?: boolean
}

export function CondicionesSection({
  formData,
  updateField,
  errors,
  compact = false,
}: CondicionesSectionProps) {
  if (compact) {
    // ─── CHATZAI-017E: Flat conditions strip — zero visual weight ───
    return (
      <div className="space-y-0.5">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          {/* Fecha emisión */}
          <div className="flex items-center gap-1">
            <Label className="text-[9px] text-muted-foreground/80 uppercase tracking-wider shrink-0">
              Emisión<span className="text-destructive ml-0.5">*</span>
            </Label>
            <Input
              type="date"
              value={formData.fechaEmision}
              onChange={(e) => updateField("fechaEmision", e.target.value)}
              className={`h-6 text-[11px] px-1.5 w-[120px] border-0 border-b bg-transparent hover:border-b-input focus:border-b-emerald-500 rounded-none shadow-none ${errors.fechaEmision ? "border-b-destructive" : ""}`}
            />
          </div>

          {/* Vigencia */}
          <div className="flex items-center gap-1">
            <Label className="text-[9px] text-muted-foreground/80 uppercase tracking-wider shrink-0">
              Vigencia<span className="text-destructive ml-0.5">*</span>
            </Label>
            <Select value={formData.vigencia} onValueChange={(v) => updateField("vigencia", v)}>
              <SelectTrigger className={`h-6 text-[11px] w-[110px] border-0 border-b bg-transparent rounded-none shadow-none ${errors.vigencia ? "border-b-destructive" : ""}`}>
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                {VIGENCIA_OPTIONS.map((v) => (
                  <SelectItem key={v} value={v}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Lista de precios */}
          <div className="flex items-center gap-1">
            <Label className="text-[9px] text-muted-foreground/80 uppercase tracking-wider shrink-0">
              Lista<span className="text-destructive ml-0.5">*</span>
            </Label>
            <Select value={formData.listaPrecios} onValueChange={(v) => updateField("listaPrecios", v)}>
              <SelectTrigger className={`h-6 text-[11px] w-[140px] border-0 border-b bg-transparent rounded-none shadow-none ${errors.listaPrecios ? "border-b-destructive" : ""}`}>
                <SelectValue placeholder="Seleccionar LP" />
              </SelectTrigger>
              <SelectContent>
                {LISTA_PRECIOS_OPTIONS.map((v) => (
                  <SelectItem key={v} value={v}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Condición de pago */}
          <div className="flex items-center gap-1">
            <Label className="text-[9px] text-muted-foreground/80 uppercase tracking-wider shrink-0">
              Cond. pago
            </Label>
            <Select value={formData.condicionPago || undefined} onValueChange={(v) => updateField("condicionPago", v === "__none__" ? "" : v)}>
              <SelectTrigger className="h-6 text-[11px] w-[120px] border-0 border-b bg-transparent rounded-none shadow-none">
                <SelectValue placeholder="Sin especificar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sin especificar</SelectItem>
                {CONDICION_PAGO_OPTIONS.map((v) => (
                  <SelectItem key={v} value={v}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Descuento */}
          <div className="flex items-center gap-1">
            <Label className="text-[9px] text-muted-foreground/80 uppercase tracking-wider shrink-0">
              Dto. %
            </Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={formData.descuento || ""}
              onChange={(e) => updateField("descuento", Number(e.target.value) || 0)}
              placeholder="0"
              className={`h-6 text-[11px] w-14 text-right border-0 border-b bg-transparent rounded-none shadow-none ${errors.descuento ? "border-b-destructive" : ""}`}
            />
          </div>

          {/* CHATZAI-017J: IVA selector */}
          <div className="flex items-center gap-1">
            <Label className="text-[9px] text-muted-foreground/80 uppercase tracking-wider shrink-0">
              IVA
            </Label>
            <Select value={formData.iva} onValueChange={(v) => updateField("iva", v)}>
              <SelectTrigger className="h-6 text-[11px] w-[130px] border-0 border-b bg-transparent rounded-none shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {IVA_OPTIONS.map((opt) => (
                  <SelectItem key={opt.key} value={opt.key}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Inline error messages — ultra compact */}
        {(errors.fechaEmision || errors.vigencia || errors.listaPrecios || errors.descuento) && (
          <div className="flex flex-wrap gap-x-3 gap-y-0 text-[9px] text-destructive">
            {errors.fechaEmision && <span>Emisión: {errors.fechaEmision}</span>}
            {errors.vigencia && <span>Vigencia: {errors.vigencia}</span>}
            {errors.listaPrecios && <span>Lista: {errors.listaPrecios}</span>}
            {errors.descuento && <span>Dto.: {errors.descuento}</span>}
          </div>
        )}
      </div>
    )
  }

  // ─── Standard (non-compact) mode: original layout for PresupuestoFormDialog ───
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Label className="text-sm font-semibold">Condiciones</Label>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {/* Fecha emisión (required) */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">
            Fecha emisión <span className="text-destructive">*</span>
          </Label>
          <Input
            type="date"
            value={formData.fechaEmision}
            onChange={(e) => updateField("fechaEmision", e.target.value)}
            className={`h-9 text-sm ${errors.fechaEmision ? "border-destructive" : ""}`}
          />
          {errors.fechaEmision && <p className="text-[10px] text-destructive">{errors.fechaEmision}</p>}
        </div>

        {/* Vigencia (required) */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">
            Vigencia <span className="text-destructive">*</span>
          </Label>
          <Select value={formData.vigencia} onValueChange={(v) => updateField("vigencia", v)}>
            <SelectTrigger className={errors.vigencia ? "border-destructive" : ""}>
              <SelectValue placeholder="Seleccionar vigencia" />
            </SelectTrigger>
            <SelectContent>
              {VIGENCIA_OPTIONS.map((v) => (
                <SelectItem key={v} value={v}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.vigencia && <p className="text-[10px] text-destructive">{errors.vigencia}</p>}
        </div>

        {/* Lista de precios (required) */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">
            Lista de precios <span className="text-destructive">*</span>
          </Label>
          <Select value={formData.listaPrecios} onValueChange={(v) => updateField("listaPrecios", v)}>
            <SelectTrigger className={errors.listaPrecios ? "border-destructive" : ""}>
              <SelectValue placeholder="Seleccionar LP" />
            </SelectTrigger>
            <SelectContent>
              {LISTA_PRECIOS_OPTIONS.map((v) => (
                <SelectItem key={v} value={v}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.listaPrecios && <p className="text-[10px] text-destructive">{errors.listaPrecios}</p>}
        </div>

        {/* Condición de pago (optional) */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">Condición de pago</Label>
          <Select value={formData.condicionPago || undefined} onValueChange={(v) => updateField("condicionPago", v === "__none__" ? "" : v)}>
            <SelectTrigger>
              <SelectValue placeholder="Sin especificar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Sin especificar</SelectItem>
              {CONDICION_PAGO_OPTIONS.map((v) => (
                <SelectItem key={v} value={v}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Descuento general % (optional) */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">Descuento general (%)</Label>
          <Input
            type="number"
            min={0}
            max={100}
            value={formData.descuento || ""}
            onChange={(e) => updateField("descuento", Number(e.target.value) || 0)}
            placeholder="0"
            className={`h-9 text-sm ${errors.descuento ? "border-destructive" : ""}`}
          />
          {errors.descuento && <p className="text-[10px] text-destructive">{errors.descuento}</p>}
        </div>

        {/* CHATZAI-017J: IVA selector */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">IVA</Label>
          <Select value={formData.iva} onValueChange={(v) => updateField("iva", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {IVA_OPTIONS.map((opt) => (
                <SelectItem key={opt.key} value={opt.key}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
