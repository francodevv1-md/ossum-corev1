"use client"

import { useEffect, useState } from "react"

import { useAuth } from "@/components/auth/AuthProvider"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { PresupuestoFormData, PresupuestoFormErrors } from "@/hooks/usePresupuestoForm"
import { fetchPresupuestoCatalogs, type PresupuestoBranchOption, type PresupuestoContactOption } from "@/lib/api/presupuestos"

type Props = {
  formData: PresupuestoFormData
  errors: PresupuestoFormErrors
  updateField: <K extends keyof PresupuestoFormData>(key: K, value: PresupuestoFormData[K]) => void
}

function contactLabel(contact: PresupuestoContactOption) {
  return contact.legalName?.trim()
    || [contact.firstName, contact.lastName].filter(Boolean).join(" ").trim()
    || contact.documentNumber
    || contact.id
}

export function PresupuestoCommercialIdentityFields({ formData, errors, updateField }: Props) {
  const { activeCompany } = useAuth()
  const [branches, setBranches] = useState<PresupuestoBranchOption[]>([])
  const [contacts, setContacts] = useState<PresupuestoContactOption[]>([])
  const [error, setError] = useState("")

  useEffect(() => {
    if (!activeCompany?.id) return
    let active = true
    fetchPresupuestoCatalogs(activeCompany.id)
      .then((catalogs) => {
        if (!active) return
        setBranches(catalogs.branches)
        setContacts(catalogs.contacts)
      })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "No se pudieron cargar sucursales y contactos") })
    return () => { active = false }
  }, [activeCompany?.id])

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <div className="space-y-2">
        <Label className="text-xs">Sucursal <span className="text-destructive">*</span></Label>
        <Select value={formData.branchId} onValueChange={(value) => updateField("branchId", value)}>
          <SelectTrigger aria-label="Sucursal" className={errors.branchId ? "border-destructive" : ""}><SelectValue placeholder="Seleccionar sucursal" /></SelectTrigger>
          <SelectContent>{branches.map((branch) => <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>)}</SelectContent>
        </Select>
        {errors.branchId && <p className="text-[10px] text-destructive">{errors.branchId}</p>}
      </div>
      <div className="space-y-2">
        <Label className="text-xs">Cliente <span className="text-destructive">*</span></Label>
        <Select value={formData.clientContactId} onValueChange={(value) => updateField("clientContactId", value)}>
          <SelectTrigger aria-label="Cliente" className={errors.clientContactId ? "border-destructive" : ""}><SelectValue placeholder="Seleccionar cliente" /></SelectTrigger>
          <SelectContent>{contacts.map((contact) => <SelectItem key={contact.id} value={contact.id}>{contactLabel(contact)}</SelectItem>)}</SelectContent>
        </Select>
        {errors.clientContactId && <p className="text-[10px] text-destructive">{errors.clientContactId}</p>}
      </div>
      <div className="space-y-2">
        <Label className="text-xs">Pagador <span className="text-destructive">*</span></Label>
        <Select value={formData.payerContactId} onValueChange={(value) => updateField("payerContactId", value)}>
          <SelectTrigger aria-label="Pagador" className={errors.payerContactId ? "border-destructive" : ""}><SelectValue placeholder="Seleccionar pagador" /></SelectTrigger>
          <SelectContent>{contacts.map((contact) => <SelectItem key={contact.id} value={contact.id}>{contactLabel(contact)}</SelectItem>)}</SelectContent>
        </Select>
        {errors.payerContactId && <p className="text-[10px] text-destructive">{errors.payerContactId}</p>}
      </div>
      {error && <p className="text-xs text-destructive sm:col-span-3">{error}</p>}
    </div>
  )
}
