"use client"

import React, { useState, useRef } from "react"
import { useOrtoTrackStore } from "@/lib/store"
import type { Contacto, ContactRole } from "@/types"
import {
  ContactSearchContext,
  CONTACT_ROLE_LABELS,
  getGroupLabel,
  V1_ROLE_TO_CONTEXT,
} from "@/lib/contacts.constants"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Search, X, UserPlus } from "lucide-react"
import { ContactSearchModal } from "./ContactSearchModal"

// ═══════════════════════════════════════════════════════════════
// Props
// ═══════════════════════════════════════════════════════════════

interface ContactLookupFieldProps {
  label: string
  /** V2: Search context (DC-CT-017). Takes priority over legacyRequiredRole. */
  context?: ContactSearchContext
  /** @deprecated Use context instead. V1 compatibility. */
  legacyRequiredRole?: string
  value: Contacto | null | undefined
  onChange: (contacto: Contacto | null) => void
  placeholder?: string
  disabled?: boolean
  error?: string
}

// ═══════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════

export function ContactLookupField({
  label,
  context,
  legacyRequiredRole,
  value,
  onChange,
  placeholder = "Código",
  disabled = false,
  error,
}: ContactLookupFieldProps) {
  const store = useOrtoTrackStore()
  const codeInputRef = useRef<HTMLInputElement>(null)

  // Resolve effective context
  const effectiveContext: ContactSearchContext = context ?? (
    legacyRequiredRole && V1_ROLE_TO_CONTEXT[legacyRequiredRole]
      ? V1_ROLE_TO_CONTEXT[legacyRequiredRole]
      : {
          title: "Buscar Contacto",
          preferredRoles: [],
          preferredGroups: [],
          allowCreate: true,
        }
  )

  // Derive codeInput from value when value is set; otherwise track independently
  const [manualCode, setManualCode] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [feedback, setFeedback] = useState<{ type: "error" | "warning"; message: string; contacto?: Contacto } | null>(null)

  // If value is set, show its code; otherwise show the manual input
  const codeInput = value ? value.codigoContacto : manualCode

  // ── Handle code lookup on Enter/Tab ──
  const handleCodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault()
      lookupByCode(codeInput.trim())
    }
  }

  const handleCodeBlur = () => {
    if (codeInput.trim() && !value) {
      lookupByCode(codeInput.trim())
    }
  }

  const lookupByCode = (code: string) => {
    if (!code) return

    const foundAny = store.contactos.find((c) => c.codigoContacto === code)

    if (!foundAny) {
      setFeedback({ type: "error", message: "Código no encontrado" })
      return
    }

    if (foundAny.estado === "inactivo") {
      setFeedback({ type: "error", message: `Contacto "${foundAny.nombre}" está inactivo. Reactívelo desde /contactos.` })
      return
    }

    // Check if the contact matches the context's allowed roles/groups
    if (effectiveContext.allowedRoles && effectiveContext.allowedRoles.length > 0) {
      const hasAllowedRole = foundAny.roles.some((r) => effectiveContext.allowedRoles!.includes(r))
      if (!hasAllowedRole) {
        const preferredGroup = effectiveContext.preferredGroups[0]
        setFeedback({
          type: "warning",
          message: `El contacto no tiene rol "${effectiveContext.allowedRoles.map((r) => CONTACT_ROLE_LABELS[r]).join(", ")}"`,
          contacto: foundAny,
        })
        return
      }
    }

    // Check preferred groups
    if (effectiveContext.preferredGroups.length > 0) {
      const isInPreferredGroup = foundAny.groups.some((g) => effectiveContext.preferredGroups.includes(g))
      if (!isInPreferredGroup) {
        const missingGroup = effectiveContext.preferredGroups.find((g) => !foundAny.groups.includes(g))
        if (missingGroup) {
          setFeedback({
            type: "warning",
            message: `El contacto no tiene grupo "${getGroupLabel(missingGroup)}"`,
            contacto: foundAny,
          })
          return
        }
      }
    }

    // Found, active, and matches context
    setFeedback(null)
    setManualCode("")
    onChange(foundAny)
  }

  // ── Add group and select ──
  const handleAddGroup = () => {
    if (!feedback?.contacto) return
    const preferredGroup = effectiveContext.preferredGroups[0]
    if (preferredGroup) {
      store.addGroupToContacto(feedback.contacto.id, preferredGroup)
      toast.success(`Grupo "${getGroupLabel(preferredGroup)}" agregado a ${feedback.contacto.nombre}`)
      const updated = store.getContactoById(feedback.contacto.id)
      if (updated) {
        setFeedback(null)
        setManualCode("")
        onChange(updated)
      }
    }
  }

  // ── Clear selection ──
  const handleClear = () => {
    setManualCode("")
    setFeedback(null)
    onChange(null)
    codeInputRef.current?.focus()
  }

  // ── Select from modal ──
  const handleSelect = (contacto: Contacto) => {
    setManualCode("")
    setFeedback(null)
    onChange(contacto)
  }

  // ── Handle manual code input ──
  const handleCodeChange = (newCode: string) => {
    if (value) {
      onChange(null)
    }
    setManualCode(newCode)
    setFeedback(null)
  }

  return (
    <div className="space-y-1.5">
      <Label className={cn("text-xs", error && "text-destructive")}>
        {label}
      </Label>

      <div className="flex items-center gap-1.5">
        {/* Code input */}
        <Input
          ref={codeInputRef}
          className={cn(
            "h-8 text-sm w-24 font-mono",
            error && "border-destructive",
            value && "bg-muted/50"
          )}
          value={codeInput}
          onChange={(e) => handleCodeChange(e.target.value)}
          onKeyDown={handleCodeKeyDown}
          onBlur={handleCodeBlur}
          placeholder={placeholder}
          disabled={disabled}
        />

        {/* Contact name display */}
        {value ? (
          <div className="flex-1 min-w-0 flex items-center gap-1.5 h-8 rounded-md border bg-muted/30 px-2">
            <span className="text-xs font-medium truncate">{value.nombre}</span>
            {(value.cuit || value.dni) && (
              <span className="text-[10px] text-muted-foreground shrink-0">
                {value.cuit || value.dni}
              </span>
            )}
          </div>
        ) : (
          <div className="flex-1 min-w-0 h-8 rounded-md border bg-muted/20 px-2 flex items-center">
            <span className="text-[11px] text-muted-foreground">Sin contacto</span>
          </div>
        )}

        {/* Search button */}
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-8 shrink-0"
          onClick={() => setModalOpen(true)}
          disabled={disabled}
          aria-label="Buscar contacto"
        >
          <Search className="size-3.5" />
        </Button>

        {/* Clear button */}
        {(value || manualCode) && !disabled && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={handleClear}
            aria-label="Limpiar"
          >
            <X className="size-3.5" />
          </Button>
        )}
      </div>

      {/* Feedback messages */}
      {feedback && (
        <div className={cn(
          "text-[10px] flex items-center gap-1",
          feedback.type === "error" ? "text-red-600" : "text-amber-700"
        )}>
          <span>{feedback.message}</span>
          {feedback.type === "warning" && feedback.contacto && effectiveContext.preferredGroups[0] && (
            <button
              className="underline font-medium hover:opacity-80 flex items-center gap-0.5"
              onClick={handleAddGroup}
            >
              <UserPlus className="size-3" />
              Agregar grupo {getGroupLabel(effectiveContext.preferredGroups[0])}
            </button>
          )}
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="text-[10px] text-destructive">{error}</p>
      )}

      {/* Search modal */}
      <ContactSearchModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        context={effectiveContext}
        onSelect={handleSelect}
      />
    </div>
  )
}
