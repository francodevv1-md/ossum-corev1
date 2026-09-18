import { AlertCircle, Building2, FileSearch, Inbox } from "lucide-react"

import { Button } from "@/components/ui/button"

type RemitoStateSurfaceProps =
  | { kind: "loading" }
  | { kind: "blocked" }
  | { kind: "error"; message: string; onRetry: () => void }
  | { kind: "empty" }
  | { kind: "no-match"; onClear: () => void }
  | { kind: "unselected" }

const content = {
  blocked: {
    icon: Building2,
    title: "No hay empresa activa",
    description: "Seleccioná una empresa para consultar y operar sus remitos.",
  },
  empty: {
    icon: Inbox,
    title: "Todavía no hay remitos",
    description: "Los remitos de esta empresa aparecerán en esta grilla.",
  },
  "no-match": {
    icon: FileSearch,
    title: "No hay coincidencias",
    description: "Probá con otro texto o quitá los filtros activos.",
  },
  unselected: {
    icon: FileSearch,
    title: "Seleccioná un remito",
    description: "El detalle, los ítems y las acciones permitidas se muestran acá.",
  },
} as const

export function RemitoStateSurface(props: RemitoStateSurfaceProps) {
  if (props.kind === "loading") {
    return (
      <div className="space-y-3 p-4" aria-label="Cargando remitos" role="status">
        {["one", "two", "three", "four"].map((key) => (
          <div key={key} className="h-12 rounded-md bg-muted" />
        ))}
        <span className="sr-only">Cargando remitos</span>
      </div>
    )
  }

  if (props.kind === "error") {
    return (
      <div className="flex min-h-48 flex-col items-center justify-center gap-3 px-5 py-8 text-center" role="alert">
        <AlertCircle className="size-5 text-destructive" aria-hidden="true" />
        <div>
          <p className="font-medium">No se pudieron cargar los remitos</p>
          <p className="mt-1 text-sm text-muted-foreground">{props.message}</p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={props.onRetry}>Reintentar</Button>
      </div>
    )
  }

  const item = content[props.kind]
  const Icon = item.icon
  return (
    <div className="flex min-h-48 flex-col items-center justify-center gap-3 px-5 py-8 text-center">
      <Icon className="size-5 text-muted-foreground" aria-hidden="true" />
      <div>
        <p className="font-medium">{item.title}</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{item.description}</p>
      </div>
      {props.kind === "no-match" && <Button type="button" size="sm" variant="outline" onClick={props.onClear}>Limpiar filtros</Button>}
    </div>
  )
}
