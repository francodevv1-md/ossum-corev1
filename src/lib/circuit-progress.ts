import type { ResumenCobranzaSurgery } from "@/lib/cobros.utils"
import type { Consumo, Presupuesto, Remito, Surgery } from "@/types"

export interface CircuitStage {
  key: "cx" | "pr" | "nr" | "consumo" | "doc" | "fact" | "cobro"
  done: boolean
  current: boolean
}

export function getCircuitProgress(
  surgery: Surgery,
  getPresupuestosBySurgeryId: (id: string) => Presupuesto[],
  getRemitosBySurgeryId: (id: string) => Remito[],
  getConsumoBySurgeryId: (id: string) => Consumo | undefined,
  getDocStatus: (id: string) => string,
  getResumenCobranzaBySurgeryId: (id: string) => ResumenCobranzaSurgery,
): CircuitStage[] {
  const stages: Omit<CircuitStage, "current">[] = [
    { key: "cx", done: true },
    { key: "pr", done: getPresupuestosBySurgeryId(surgery.id).length > 0 },
    { key: "nr", done: getRemitosBySurgeryId(surgery.id).length > 0 },
    { key: "consumo", done: getConsumoBySurgeryId(surgery.id) !== undefined },
    {
      key: "doc",
      done: (() => {
        const status = getDocStatus(surgery.id)
        return status === "Completa" || status === "Apta para facturar"
      })(),
    },
    { key: "fact", done: surgery.facturado === true },
    { key: "cobro", done: getResumenCobranzaBySurgeryId(surgery.id).totalCobrado > 0 },
  ]

  let currentSet = false

  return stages.map((stage) => {
    if (!stage.done && !currentSet) {
      currentSet = true
      return { ...stage, current: true }
    }

    return { ...stage, current: false }
  })
}
