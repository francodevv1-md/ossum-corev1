"use client"

import { CoordinationGlobalAccessBoundary } from "@/components/coordinadores/CoordinationGlobalAccessBoundary"
import { CoordinadoresAdminClient } from "@/components/coordinadores/CoordinadoresAdminClient"

export default function CoordinadoresPage() {
  return (
    <CoordinationGlobalAccessBoundary>
      <CoordinadoresAdminClient />
    </CoordinationGlobalAccessBoundary>
  )
}
