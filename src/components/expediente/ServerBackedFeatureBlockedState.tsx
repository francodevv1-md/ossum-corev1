"use client"

import { Database, Loader2, Lock } from "lucide-react"
import { Badge } from "@/components/ui/badge"

type ServerBackedFeatureBlockedStateProps = {
  featureLabel: string
  isLegacyMockSurgery?: boolean
  state?: "blocked" | "verifying"
}

export function ServerBackedFeatureBlockedState({
  featureLabel,
  isLegacyMockSurgery = false,
  state = "blocked",
}: ServerBackedFeatureBlockedStateProps) {
  if (state === "verifying") {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700">
            <Loader2 className="size-5 animate-spin" />
          </div>
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="bg-slate-100 text-slate-900 hover:bg-slate-100">
                {featureLabel}
              </Badge>
              <Badge variant="outline" className="border-slate-300 bg-white/70 text-slate-800">
                <Database className="mr-1 size-3" />
                Verificando backend
              </Badge>
            </div>

            <div className="space-y-1.5">
              <h2 className="text-sm font-semibold text-slate-950">Verificando disponibilidad backend</h2>
              <p className="text-sm leading-6 text-slate-700">
                Estamos validando si esta cirugía ya existe en backend para habilitar {featureLabel}.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <Database className="size-5" />
        </div>
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="bg-amber-100 text-amber-900 hover:bg-amber-100">
              {featureLabel}
            </Badge>
            <Badge variant="outline" className="border-amber-300 bg-white/70 text-amber-800">
              <Lock className="mr-1 size-3" />
              Requiere backend
            </Badge>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-sm font-semibold text-amber-950">Función no disponible para esta cirugía</h2>
            <p className="text-sm leading-6 text-amber-900/90">
              Esta cirugía todavía no tiene registro persistido en backend.
              Por eso {featureLabel} y sus cargas asociadas quedan bloqueados para evitar errores del servidor.
            </p>
            {isLegacyMockSurgery ? (
              <p className="text-xs text-amber-800/90">
                La cirugía proviene del store/mock legacy y no se sincroniza automáticamente en DEV.
              </p>
            ) : (
              <p className="text-xs text-amber-800/90">
                Disponible únicamente para cirugías nuevas o ya persistidas en backend.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
