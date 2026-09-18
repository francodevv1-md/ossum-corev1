import type { ConsumoState, Surgery } from "@/types"

export type MacroTimelineKey =
  | "sin_autorizar"
  | "autorizado"
  | "pendiente"
  | "transito"
  | "realizada"
  | "finalizada"

export interface MacroTimelineStage {
  key: MacroTimelineKey
  label: string
  done: boolean
  current: boolean
}

export interface MacroTimelineModel {
  activeKey: MacroTimelineKey
  stages: MacroTimelineStage[]
}

const MACRO_STAGE_ORDER: Array<{ key: MacroTimelineKey; label: string }> = [
  { key: "sin_autorizar", label: "Sin autorizar" },
  { key: "autorizado", label: "Autorizado" },
  { key: "pendiente", label: "Pendiente" },
  { key: "transito", label: "Tránsito" },
  { key: "realizada", label: "Realizada" },
  { key: "finalizada", label: "Finalizada" },
]

export interface BuildMacroTimelineInput {
  surgery: Surgery
  consumoState?: ConsumoState
}

export function resolveMacroTimelineKey({ surgery, consumoState }: BuildMacroTimelineInput): MacroTimelineKey {
  const state = surgery.state
  const isAuthorized = surgery.autorizado || state === "Autorizada" || state === "Pendiente" || state === "En tránsito" || state === "Realizada" || state === "Finalizada" || state === "Sin consumo"

  if (state === "Finalizada") return "finalizada"

  if (state === "Realizada" || state === "Sin consumo" || consumoState === "Validado" || consumoState === "Facturado") {
    return "realizada"
  }

  if (state === "En tránsito" || surgery.preparationState === "Entregado") {
    return "transito"
  }

  if (state === "Pendiente" || (isAuthorized && Boolean(surgery.date))) {
    return "pendiente"
  }

  if (isAuthorized) return "autorizado"

  return "sin_autorizar"
}

export function buildMacroTimelineModel(input: BuildMacroTimelineInput): MacroTimelineModel {
  const activeKey = resolveMacroTimelineKey(input)
  const activeIndex = MACRO_STAGE_ORDER.findIndex((stage) => stage.key === activeKey)

  return {
    activeKey,
    stages: MACRO_STAGE_ORDER.map((stage, index) => ({
      ...stage,
      done: index < activeIndex,
      current: index === activeIndex,
    })),
  }
}
