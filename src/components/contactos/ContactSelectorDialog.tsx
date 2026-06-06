"use client"

import React, { useState, useMemo, useCallback } from "react"
import { useOrtoTrackStore } from "@/lib/store"
import type { Contacto, ContactRole } from "@/types"
import {
  CONTACT_ROLE_LABELS,
  CONTACT_ROLE_BADGE_COLORS,
  V1_ROLE_TO_CONTEXT,
} from "@/lib/contacts.constants"
import { cn } from "@/lib/utils"
import { Search, Plus, Check, UserPlus } from "lucide-react"
import { ContactSearchModal } from "./ContactSearchModal"

// ═══════════════════════════════════════════════════════════════
// Props — backward compatible wrapper
// ═══════════════════════════════════════════════════════════════

interface ContactSelectorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** @deprecated Use ContactSearchModal with context instead. V1 compatibility. */
  requiredRole?: string
  onSelect: (contacto: Contacto) => void
  allowCreate?: boolean
}

/**
 * ContactSelectorDialog — V1 backward-compatible wrapper.
 * Delegates to ContactSearchModal with a resolved context.
 * @deprecated Prefer ContactSearchModal with explicit ContactSearchContext.
 */
export function ContactSelectorDialog({
  open,
  onOpenChange,
  requiredRole,
  onSelect,
  allowCreate = false,
}: ContactSelectorDialogProps) {
  // Resolve V1 requiredRole to V2 context
  const context = requiredRole && V1_ROLE_TO_CONTEXT[requiredRole]
    ? { ...V1_ROLE_TO_CONTEXT[requiredRole], allowCreate }
    : {
        title: "Buscar Contacto",
        preferredRoles: [],
        preferredGroups: [],
        allowCreate,
      }

  return (
    <ContactSearchModal
      open={open}
      onOpenChange={onOpenChange}
      context={context}
      onSelect={onSelect}
    />
  )
}
