"use client"

import { Suspense, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Clock } from "lucide-react"

function NuevaAjusteRedirect() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const qs = searchParams.toString()
    router.replace(`/ventas/documentos-ajuste/nueva/editor${qs ? `?${qs}` : ""}`)
  }, [router, searchParams])

  return (
    <div className="p-12 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
      <Clock className="size-5 animate-spin text-primary" />
      Redirigiendo al editor de documento de ajuste...
    </div>
  )
}

export default function NuevaNotaPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-muted-foreground">
          Cargando...
        </div>
      }
    >
      <NuevaAjusteRedirect />
    </Suspense>
  )
}
