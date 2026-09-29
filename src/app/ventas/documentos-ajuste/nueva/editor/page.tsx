import { Suspense } from "react"
import type { Metadata } from "next"
import { Clock } from "lucide-react"
import { AdjustmentWorkspace } from "@/components/documentos-ajuste/AdjustmentWorkspace"

export const metadata: Metadata = {
  title: "Editor de Documento de Ajuste | OSSUM COR",
  description: "Carga y edición de notas de crédito y débito vinculadas a comprobantes emitidos.",
}

export default function EditorAjustePage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-xs text-muted-foreground flex flex-col items-center gap-3">
          <Clock className="size-6 animate-spin text-primary" />
          Cargando editor de documento de ajuste...
        </div>
      }
    >
      <AdjustmentWorkspace />
    </Suspense>
  )
}
