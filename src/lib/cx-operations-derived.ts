import {
  getIncidentReasons,
  type CoordinatorCase,
} from "@/components/coordinadores/coordinator-queue.helpers"

export type CxOperationsClosureSignals = {
  documentationIncomplete: boolean
  consumptionAbsent: boolean
  invoiceAbsent: boolean
}

export type CxOperationsDerivedDisplay = {
  attentionReasons: string[]
  nextActionLabel: string
  responsibleAreaLabel: string
}

const UNAVAILABLE_DISPLAY: Omit<CxOperationsDerivedDisplay, "attentionReasons"> = {
  nextActionLabel: "Acción derivada no disponible",
  responsibleAreaLabel: "Área derivada no disponible",
}

/**
 * Produces the Phase-1 advisory operations reading from existing UI inputs.
 * It deliberately has no persistence, API, or store dependency.
 */
export function deriveCxOperationsDisplay(
  entry: CoordinatorCase | null,
  closure: CxOperationsClosureSignals,
): CxOperationsDerivedDisplay {
  if (!entry) {
    return { attentionReasons: [], ...UNAVAILABLE_DISPLAY }
  }

  const attentionReasons = getIncidentReasons(entry)
  const hasCoordinationIncident = attentionReasons.some((reason) =>
    ["SLA vencido", "Próxima a vencer", "Sin asignar"].includes(reason),
  )

  if (hasCoordinationIncident) {
    return {
      attentionReasons,
      nextActionLabel: "Resolver coordinación y fecha",
      responsibleAreaLabel: "Coordinación",
    }
  }

  if (attentionReasons.includes("Sin disponibilidad")) {
    return {
      attentionReasons,
      nextActionLabel: "Definir disponibilidad material",
      responsibleAreaLabel: "Preparación/Logística",
    }
  }

  if (entry.bucket === "autorizado" && (entry.subgroup === null || entry.subgroup === "nueva-asignacion")) {
    return {
      attentionReasons,
      nextActionLabel: "Tomar y coordinar caso",
      responsibleAreaLabel: "Coordinación",
    }
  }

  if (entry.bucket === "autorizado" && entry.subgroup === "pendiente-coordinar") {
    return {
      attentionReasons,
      nextActionLabel: "Coordinar fecha y material",
      responsibleAreaLabel: "Coordinación",
    }
  }

  if (
    entry.bucket === "autorizado" &&
    ["programada-sin-preparar", "congelada", "congelada-con-faltantes"].includes(entry.subgroup ?? "")
  ) {
    return {
      attentionReasons,
      nextActionLabel: "Preparar y confirmar material",
      responsibleAreaLabel: "Preparación/Logística",
    }
  }

  if (entry.bucket === "transito") {
    return {
      attentionReasons,
      nextActionLabel: "Verificar logística y entrega",
      responsibleAreaLabel: "Preparación/Logística",
    }
  }

  if (entry.bucket === "finalizado" && (closure.documentationIncomplete || closure.consumptionAbsent || closure.invoiceAbsent)) {
    return {
      attentionReasons,
      nextActionLabel: "Completar cierre administrativo",
      responsibleAreaLabel: "Administración",
    }
  }

  if (entry.bucket === "finalizado") {
    return {
      attentionReasons,
      nextActionLabel: "Revisar cierre y documentación",
      responsibleAreaLabel: "Administración",
    }
  }

  return {
    attentionReasons,
    nextActionLabel: "Revisar seguimiento del caso",
    responsibleAreaLabel: "Coordinación",
  }
}
