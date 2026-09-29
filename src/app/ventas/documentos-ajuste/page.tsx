"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { DocumentosAjusteWorkspace } from "@/components/documentos-ajuste/DocumentosAjusteWorkspace"

function DocumentosAjustePageContent() {
  const searchParams = useSearchParams()
  const tipoParam = searchParams.get("tipo")
  const facturaOrigen = searchParams.get("facturaOrigen") ?? undefined

  const initialTipo = tipoParam === "credito" ? "CREDITO" : tipoParam === "debito" ? "DEBITO" : undefined
  const initialTab = tipoParam === "credito" ? "credito" : tipoParam === "debito" ? "debito" : "todas"

  return (
    <DocumentosAjusteWorkspace
      initialTab={initialTab}
      initialTipo={initialTipo}
      initialFacturaOrigen={facturaOrigen}
    />
  )
}

export default function DocumentosAjustePage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-muted-foreground">
          Cargando documentos de ajuste...
        </div>
      }
    >
      <DocumentosAjustePageContent />
    </Suspense>
  )
}
