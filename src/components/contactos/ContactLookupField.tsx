"use client"

import React, { useEffect, useId, useRef, useState } from "react"
import { Loader2, Search, UserPlus, X } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth/AuthProvider"
import { ContactSearchModal } from "@/components/contactos/ContactSearchModal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { listContacts, updateContactApi } from "@/lib/api/contacts"
import { mapApiContactListToContactos, mapApiContactToContacto } from "@/lib/api/contact-adapter"
import { CONTACT_ROLE_LABELS, type ContactSearchContext, getGroupLabel, V1_ROLE_TO_CONTEXT } from "@/lib/contacts.constants"
import { cn } from "@/lib/utils"
import type { Contacto } from "@/types"

interface ContactLookupFieldProps {
  label: string
  context?: ContactSearchContext
  /** @deprecated Use context instead. */
  legacyRequiredRole?: string
  value: Contacto | null | undefined
  onChange: (contacto: Contacto | null) => void
  placeholder?: string
  disabled?: boolean
  error?: string
}

type Feedback = { type: "error" | "warning"; message: string; contact?: Contacto; missingGroup?: string }

export function ContactLookupField({ label, context, legacyRequiredRole, value, onChange, placeholder = "Código", disabled = false, error }: ContactLookupFieldProps) {
  const { activeCompany } = useAuth()
  const companyId = activeCompany?.id
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const requestRef = useRef(0)
  const effectiveContext: ContactSearchContext = context ?? (legacyRequiredRole ? V1_ROLE_TO_CONTEXT[legacyRequiredRole] : undefined) ?? { title: "Buscar contacto", preferredRoles: [], preferredGroups: [], allowCreate: true }
  const [manualCode, setManualCode] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [lookingUp, setLookingUp] = useState(false)
  const [updatingGroup, setUpdatingGroup] = useState(false)
  const companyIdRef = useRef(companyId)
  const mutationRef = useRef(0)
  const selected = value ?? null
  const code = selected?.codigoContacto ?? manualCode

  useEffect(() => {
    const companyChanged = companyIdRef.current !== companyId
    companyIdRef.current = companyId
    requestRef.current += 1
    mutationRef.current += 1
    if (companyChanged) {
      setManualCode("")
      setFeedback(null)
      setLookingUp(false)
      setUpdatingGroup(false)
      onChange(null)
    }
  }, [companyId])

  const validateContext = (contact: Contacto): Feedback | null => {
    if (contact.estado !== "activo") return { type: "error", message: `El contacto "${contact.nombre}" está inactivo. Reactivalo desde Contactos.` }
    if (effectiveContext.allowedRoles?.length && !contact.roles.some((role) => effectiveContext.allowedRoles?.includes(role))) {
      return { type: "warning", message: `El contacto no tiene rol ${effectiveContext.allowedRoles.map((role) => `"${CONTACT_ROLE_LABELS[role]}"`).join(" o ")}.` }
    }
    if (effectiveContext.allowedGroups?.length && !contact.groups.some((group) => effectiveContext.allowedGroups?.includes(group))) {
      return { type: "warning", message: "El contacto no pertenece a un grupo permitido para este campo." }
    }
    const missingGroup = effectiveContext.preferredGroups.length > 0 && !contact.groups.some((group) => effectiveContext.preferredGroups.includes(group)) ? effectiveContext.preferredGroups[0] : undefined
    return missingGroup ? { type: "warning", message: `El contacto no tiene grupo "${getGroupLabel(missingGroup)}".`, contact, missingGroup } : null
  }

  const lookupByCode = async (rawCode: string) => {
    const requestedCode = rawCode.trim().toUpperCase()
    if (!requestedCode) return
    const requestId = ++requestRef.current
    if (!companyId) { setFeedback({ type: "error", message: "Seleccioná una empresa activa para buscar contactos." }); return }
    const requestCompanyId = companyId
    setLookingUp(true)
    setFeedback(null)
    try {
      const result = mapApiContactListToContactos(await listContacts(requestCompanyId, { search: requestedCode, take: 20 }))
      if (requestId !== requestRef.current || companyIdRef.current !== requestCompanyId) return
      const found = result.find((contact) => contact.codigoContacto.toUpperCase() === requestedCode)
      if (!found) { setFeedback({ type: "error", message: "Código no encontrado." }); return }
      const contextFeedback = validateContext(found)
      if (contextFeedback) { setFeedback(contextFeedback); return }
      setManualCode("")
      onChange(found)
    } catch (cause) {
      if (requestId === requestRef.current) setFeedback({ type: "error", message: cause instanceof Error ? cause.message : "No se pudo buscar el contacto." })
    } finally {
      if (requestId === requestRef.current) setLookingUp(false)
    }
  }

  const addGroup = async () => {
    if (!companyId || !feedback?.contact || !feedback.missingGroup) return
    setUpdatingGroup(true)
    const requestId = ++mutationRef.current
    const requestCompanyId = companyId
    try {
      const response = await updateContactApi(requestCompanyId, feedback.contact.id, { groupSlugs: [...new Set([...feedback.contact.groups, feedback.missingGroup])] })
      if (requestId !== mutationRef.current || companyIdRef.current !== requestCompanyId) return
      const canonical = mapApiContactToContacto(response)
      toast.success(`Grupo "${getGroupLabel(feedback.missingGroup)}" agregado a ${canonical.nombre}`)
      setFeedback(null)
      setManualCode("")
      onChange(canonical)
    } catch (cause) {
      if (requestId !== mutationRef.current || companyIdRef.current !== requestCompanyId) return
      setFeedback({ type: "error", message: cause instanceof Error ? cause.message : "No se pudo actualizar el grupo del contacto." })
    } finally {
      if (requestId === mutationRef.current) setUpdatingGroup(false)
    }
  }

  const clear = () => { requestRef.current += 1; mutationRef.current += 1; setManualCode(""); setFeedback(null); onChange(null); inputRef.current?.focus() }

  return <div className="space-y-1">
    <Label htmlFor={inputId} className={cn("text-xs", error && "text-destructive")}>{label}</Label>
    <div className="flex items-center gap-1.5">
      <div className="relative w-28 shrink-0"><Input id={inputId} ref={inputRef} value={code} onChange={(event) => { if (selected) onChange(null); setManualCode(event.target.value); setFeedback(null) }} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void lookupByCode(code) } }} onBlur={() => { if (code.trim() && !selected && !lookingUp) void lookupByCode(code) }} placeholder={placeholder} disabled={disabled} aria-invalid={Boolean(error || feedback?.type === "error")} aria-describedby={error || feedback ? `${inputId}-feedback` : undefined} className={cn("h-11 font-mono text-sm sm:h-8 sm:text-xs", (error || feedback?.type === "error") && "border-destructive", selected && "bg-muted/40")} />{lookingUp && <Loader2 className="absolute right-2 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-gray-400 motion-reduce:animate-none" />}</div>
      <div className="flex h-11 min-w-0 flex-1 items-center border border-[var(--ossum-line)] bg-white px-2 sm:h-8">{selected ? <><span className="truncate text-sm font-medium sm:text-xs">{selected.nombre}</span>{(selected.cuit || selected.dni) && <span className="ml-2 shrink-0 text-xs text-gray-400">{selected.cuit || selected.dni}</span>}</> : <span className="text-xs text-gray-400">Sin contacto seleccionado</span>}</div>
      <Button type="button" variant="outline" size="icon" className="size-11 shrink-0 sm:size-8" onClick={() => setModalOpen(true)} disabled={disabled || !companyId} aria-label={`Buscar ${label.toLowerCase()}`}><Search className="size-3.5" /></Button>
      {(selected || manualCode) && !disabled && <Button type="button" variant="ghost" size="icon" className="size-11 shrink-0 sm:size-8" onClick={clear} aria-label={`Limpiar ${label.toLowerCase()}`}><X className="size-3.5" /></Button>}
    </div>
    {(feedback || error || !companyId) && <div id={`${inputId}-feedback`} aria-live="polite" className={cn("flex flex-wrap items-center gap-1 text-xs", feedback?.type === "warning" ? "text-amber-700" : "text-destructive")}><span>{error || feedback?.message || "No hay una empresa activa."}</span>{feedback?.contact && feedback.missingGroup && <button type="button" disabled={updatingGroup} onClick={() => void addGroup()} className="inline-flex items-center gap-1 font-medium underline"><UserPlus className="size-3" />{updatingGroup ? "Actualizando…" : `Agregar ${getGroupLabel(feedback.missingGroup)}`}</button>}</div>}
    <ContactSearchModal open={modalOpen} onOpenChange={setModalOpen} context={effectiveContext} onSelect={(contact) => { setManualCode(""); setFeedback(null); onChange(contact) }} />
  </div>
}
