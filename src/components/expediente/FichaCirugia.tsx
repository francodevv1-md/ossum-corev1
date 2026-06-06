"use client"

import React, { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { Edit, Save, X, History } from "lucide-react"
import { useOrtoTrackStore } from "@/lib/store"
import { formatDate } from "@/lib/formatters"
import { CX_STATE_COLORS, PREP_STATE_COLORS, CLASSIFICATIONS, COORDINADOR_CX_OPTIONS } from "@/lib/cirugias.constants"
import { VENDEDORES_OPTIONS } from "@/lib/shared-constants"
import { PROVINCIAS_ARGENTINA, LOCALIDADES_POR_PROVINCIA } from "@/data/argentina-geography"
import { ReferenciasAdministrativasEditor } from "@/components/cirugias/ReferenciasAdministrativasEditor"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { Surgery, SurgeryClassification, ReferenciaAdministrativa } from "@/types"

interface FichaCirugiaProps {
  surgery: Surgery
}

interface FieldGroupProps {
  title: string
  children: React.ReactNode
}

function FieldGroup({ title, children }: FieldGroupProps) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{title}</h3>
      <div className="grid grid-cols-2 gap-x-6 gap-y-3">{children}</div>
    </div>
  )
}

function ReadonlyField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm">{value || "—"}</p>
    </div>
  )
}

function EditableField({ label, value, onChange, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; type?: string
}) {
  return (
    <div>
      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5 block">{label}</label>
      <Input value={value} onChange={e => onChange(e.target.value)} type={type} className="h-8 text-sm" />
    </div>
  )
}

function SelectField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: string[]
}) {
  return (
    <div>
      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5 block">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none"
      >
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  )
}

export function FichaCirugia({ surgery: initialSurgery }: FichaCirugiaProps) {
  const store = useOrtoTrackStore()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Partial<Surgery>>({})

  // Re-read surgery from store to get latest data
  const surgery = store.getSurgeryById(initialSurgery.id) || initialSurgery

  // Get instrumentadores from store
  const instrumentadores = store.instrumentadores
  const instrumentadorOptions = ["Sin asignar", ...instrumentadores.map(i => i.name)]

  const startEditing = useCallback(() => {
    setForm({
      patient: surgery.patient,
      patientDni: surgery.patientDni,
      surgeon: surgery.surgeon,
      institution: surgery.institution,
      institutionCity: surgery.institutionCity,
      procedure: surgery.procedure,
      date: surgery.date,
      time: surgery.time,
      probableDate: surgery.probableDate,
      client: surgery.client,
      obraSocial: surgery.obraSocial,
      financiador: surgery.financiador,
      classification: surgery.classification,
      provincia: surgery.provincia,
      localidad: surgery.localidad,
      instrumentador: surgery.instrumentador,
      coordinadorCx: surgery.coordinadorCx,
      vendedor: surgery.vendedor,
      titular: surgery.titular,
      tipoGestion: surgery.tipoGestion,
      aQuienRemitir: surgery.aQuienRemitir,
      aQuienFacturar: surgery.aQuienFacturar,
      leyenda: surgery.leyenda,
      leyendaDestacada: surgery.leyendaDestacada,
      notes: surgery.notes,
      prNumber: surgery.prNumber,
      urgente: surgery.urgente,
      fechaEnvioMaterial: surgery.fechaEnvioMaterial,
      referenciasAdministrativas: surgery.referenciasAdministrativas,
    })
    setEditing(true)
  }, [surgery])

  const cancelEditing = useCallback(() => {
    setEditing(false)
    setForm({})
  }, [])

  const saveChanges = useCallback(() => {
    store.updateSurgery(surgery.id, form)
    setEditing(false)
    setForm({})
    toast.success("Ficha actualizada correctamente")
  }, [store, surgery.id, form])

  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const updateRefField = (refs: ReferenciaAdministrativa[]) => {
    setForm(prev => ({ ...prev, referenciasAdministrativas: refs }))
  }

  const displayValue = (field: keyof Surgery): string => {
    if (editing && field in form) return String((form as Record<string, unknown>)[field] ?? surgery[field] ?? "")
    return String(surgery[field] ?? "")
  }

  const cxColorClass = CX_STATE_COLORS[surgery.state] || "bg-gray-400 text-white"
  const prepColorClass = PREP_STATE_COLORS[surgery.preparationState] || "bg-gray-400 text-white"

  // Current provincia for localidad dependency
  const currentProvincia = (editing && form.provincia !== undefined ? form.provincia : surgery.provincia) || ""
  const localidadOptions = currentProvincia && LOCALIDADES_POR_PROVINCIA[currentProvincia]
    ? ["", ...LOCALIDADES_POR_PROVINCIA[currentProvincia]]
    : [""]

  return (
    <div className="space-y-6">
      {/* ── Header bar ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold">Ficha de Cirugía</h2>
          <span className={cn("inline-flex items-center rounded px-2 py-0.5 text-[10px] font-semibold leading-none", cxColorClass)}>{surgery.state}</span>
          <span className={cn("inline-flex items-center rounded px-2 py-0.5 text-[10px] font-semibold leading-none", prepColorClass)}>{surgery.preparationState}</span>
        </div>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={cancelEditing}>
                <X className="size-3.5" /> Cancelar
              </Button>
              <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={saveChanges}>
                <Save className="size-3.5" /> Guardar cambios
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={startEditing}>
                <Edit className="size-3.5" /> Editar
              </Button>
              <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs">
                <History className="size-3.5" /> Ver historial
              </Button>
            </>
          )}
        </div>
      </div>

      <Separator />

      {/* ── Form ── */}
      {editing ? (
        <div className="space-y-6">
          <FieldGroup title="Identificación">
            <ReadonlyField label="Nº cirugía / ID CX" value={<span className="font-mono font-bold text-blue-700">{surgery.id}</span>} />
            <ReadonlyField label="Nº expediente" value={surgery.expedienteNumber || "Sin asignar"} />
            <EditableField label="PR Nº" value={displayValue("prNumber")} onChange={v => updateField("prNumber", v)} />
            <SelectField label="Clasificación" value={displayValue("classification")} onChange={v => updateField("classification", v)} options={CLASSIFICATIONS as unknown as string[]} />
          </FieldGroup>

          <FieldGroup title="Paciente">
            <EditableField label="Paciente" value={displayValue("patient")} onChange={v => updateField("patient", v)} />
            <EditableField label="DNI" value={displayValue("patientDni")} onChange={v => updateField("patientDni", v)} />
            <EditableField label="Obra social" value={displayValue("obraSocial")} onChange={v => updateField("obraSocial", v)} />
            <EditableField label="Cliente / Financiador" value={displayValue("client")} onChange={v => updateField("client", v)} />
          </FieldGroup>

          <FieldGroup title="Médico / Institución">
            <EditableField label="Médico" value={displayValue("surgeon")} onChange={v => updateField("surgeon", v)} />
            <EditableField label="Institución / Hospital" value={displayValue("institution")} onChange={v => updateField("institution", v)} />
            <EditableField label="Ciudad" value={displayValue("institutionCity")} onChange={v => updateField("institutionCity", v)} />
            <SelectField label="Provincia" value={displayValue("provincia")} onChange={v => { updateField("provincia", v); updateField("localidad", "") }} options={["", ...PROVINCIAS_ARGENTINA]} />
            <SelectField label="Localidad" value={displayValue("localidad")} onChange={v => updateField("localidad", v)} options={localidadOptions} />
          </FieldGroup>

          <FieldGroup title="Programación">
            <EditableField label="Fecha cirugía" value={displayValue("date")} onChange={v => updateField("date", v)} type="date" />
            <EditableField label="Hora cirugía" value={displayValue("time")} onChange={v => updateField("time", v)} type="time" />
            <EditableField label="Fecha probable" value={displayValue("probableDate")} onChange={v => updateField("probableDate", v)} type="date" />
            <EditableField label="Fecha envío material" value={displayValue("fechaEnvioMaterial")} onChange={v => updateField("fechaEnvioMaterial", v)} type="date" />
          </FieldGroup>

          <FieldGroup title="Gestión">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={editing && form.urgente !== undefined ? !!form.urgente : surgery.urgente}
                onCheckedChange={(checked) => setForm(prev => ({ ...prev, urgente: !!checked }))}
              />
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Urgente</label>
            </div>
            <SelectField label="Coordinador de CX" value={displayValue("coordinadorCx")} onChange={v => updateField("coordinadorCx", v)} options={[...COORDINADOR_CX_OPTIONS]} />
            <SelectField label="Vendedor" value={displayValue("vendedor")} onChange={v => updateField("vendedor", v)} options={[...VENDEDORES_OPTIONS]} />
            <SelectField label="Instrumentador" value={displayValue("instrumentador")} onChange={v => updateField("instrumentador", v)} options={instrumentadorOptions} />
            <EditableField label="Tipo de gestión" value={displayValue("tipoGestion")} onChange={v => updateField("tipoGestion", v)} />
            <EditableField label="Titular" value={displayValue("titular")} onChange={v => updateField("titular", v)} />
          </FieldGroup>

          <FieldGroup title="Destino y Facturación">
            <EditableField label="A quién remitir" value={displayValue("aQuienRemitir")} onChange={v => updateField("aQuienRemitir", v)} />
            <EditableField label="A quién facturar" value={displayValue("aQuienFacturar")} onChange={v => updateField("aQuienFacturar", v)} />
          </FieldGroup>

          <FieldGroup title="Observaciones">
            <div className="col-span-2">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5 block">Leyenda / Observaciones</label>
              <textarea
                value={displayValue("leyenda")}
                onChange={e => updateField("leyenda", e.target.value)}
                rows={3}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none"
              />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <Checkbox
                checked={editing && form.leyendaDestacada !== undefined ? !!form.leyendaDestacada : surgery.leyendaDestacada}
                onCheckedChange={(checked) => setForm(prev => ({ ...prev, leyendaDestacada: !!checked }))}
              />
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Leyenda destacada</label>
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5 block">Notas internas</label>
              <textarea
                value={displayValue("notes")}
                onChange={e => updateField("notes", e.target.value)}
                rows={2}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none"
              />
            </div>
          </FieldGroup>

          {/* ── Referencias administrativas ── */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Referencias administrativas</h3>
            <ReferenciasAdministrativasEditor
              value={(form.referenciasAdministrativas || surgery.referenciasAdministrativas || []) as ReferenciaAdministrativa[]}
              onChange={updateRefField}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <FieldGroup title="Identificación">
            <ReadonlyField label="Nº cirugía / ID CX" value={<span className="font-mono font-bold text-blue-700">{surgery.id}</span>} />
            <ReadonlyField label="Nº expediente" value={surgery.expedienteNumber || "Sin asignar"} />
            <ReadonlyField label="PR Nº" value={surgery.prNumber || "—"} />
            <ReadonlyField label="Clasificación" value={surgery.classification} />
          </FieldGroup>

          <FieldGroup title="Paciente">
            <ReadonlyField label="Paciente" value={surgery.patient} />
            <ReadonlyField label="DNI" value={surgery.patientDni} />
            <ReadonlyField label="Obra social" value={surgery.obraSocial} />
            <ReadonlyField label="Cliente / Financiador" value={surgery.client || surgery.financiador} />
          </FieldGroup>

          <FieldGroup title="Médico / Institución">
            <ReadonlyField label="Médico" value={surgery.surgeon} />
            <ReadonlyField label="Institución / Hospital" value={surgery.institution} />
            <ReadonlyField label="Ciudad" value={surgery.institutionCity} />
            <ReadonlyField label="Provincia" value={surgery.provincia} />
            <ReadonlyField label="Localidad" value={surgery.localidad} />
          </FieldGroup>

          <FieldGroup title="Programación">
            <ReadonlyField label="Fecha cirugía" value={formatDate(surgery.date)} />
            <ReadonlyField label="Hora cirugía" value={surgery.time || "—"} />
            <ReadonlyField label="Fecha probable" value={surgery.probableDate ? formatDate(surgery.probableDate) : "—"} />
            <ReadonlyField label="Fecha envío material" value={surgery.fechaEnvioMaterial ? formatDate(surgery.fechaEnvioMaterial) : "—"} />
          </FieldGroup>

          <FieldGroup title="Gestión">
            <ReadonlyField
              label="Urgente"
              value={surgery.urgente
                ? <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4">URGENTE</Badge>
                : "No"
              }
            />
            <ReadonlyField label="Coordinador de CX" value={surgery.coordinadorCx || "Sin asignar"} />
            <ReadonlyField label="Vendedor" value={surgery.vendedor} />
            <ReadonlyField label="Instrumentador" value={surgery.instrumentador} />
            <ReadonlyField label="Tipo de gestión" value={surgery.tipoGestion} />
            <ReadonlyField label="Titular" value={surgery.titular} />
          </FieldGroup>

          <FieldGroup title="Destino y Facturación">
            <ReadonlyField label="A quién remitir" value={surgery.aQuienRemitir} />
            <ReadonlyField label="A quién facturar" value={surgery.aQuienFacturar} />
          </FieldGroup>

          <FieldGroup title="Observaciones">
            <div className="col-span-2">
              <ReadonlyField label="Leyenda / Observaciones" value={surgery.leyenda} />
            </div>
            {surgery.leyendaDestacada && surgery.leyenda && (
              <div className="col-span-2">
                <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2">
                  <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider mb-1">Leyenda destacada</p>
                  <p className="text-sm text-amber-900">{surgery.leyenda}</p>
                </div>
              </div>
            )}
            <div className="col-span-2">
              <ReadonlyField label="Notas internas" value={surgery.notes} />
            </div>
          </FieldGroup>

          {/* ── Referencias administrativas (readonly) ── */}
          {surgery.referenciasAdministrativas && surgery.referenciasAdministrativas.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Referencias administrativas</h3>
              <div className="flex flex-wrap gap-2">
                {surgery.referenciasAdministrativas.map((ref) => (
                  <div key={ref.id} className="inline-flex flex-col rounded-md border px-2.5 py-1.5 bg-muted/40">
                    <span className="text-[10px] font-semibold text-muted-foreground">
                      {ref.tipo}
                      {ref.valor ? <span className="text-foreground ml-1 font-normal">{ref.valor}</span> : ""}
                    </span>
                    {ref.observacion && (
                      <span className="text-[10px] text-muted-foreground mt-0.5">{ref.observacion}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
