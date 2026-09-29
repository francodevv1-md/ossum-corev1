"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function NotasCreditoRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/ventas/documentos-ajuste?tipo=credito")
  }, [router])

  return (
    <div className="p-8 text-center text-xs text-muted-foreground">
      Redirigiendo a Documentos de ajuste (Notas de crédito)...
    </div>
  )
}
