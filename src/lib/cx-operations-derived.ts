import {
  getIncidentReasons,
  hasAssignedCoordinator,
  hasScheduledDate,
  type CoordinatorCase,
} from "@/components/coordinadores/coordinator-queue.helpers"
import type { Surgery } from "@/types"

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

export type CoordinationAdvisoryContext = {
  situation: "Fuera de plazo" | "Falta información" | "Hay un problema" | "Necesita definición" | "Avanzando normalmente"
  missing: string
  actor: string
  next: string
}

/** Advisory UI projection only; it is not persisted workflow authority. */
export function deriveCoordinatorCaseAdvisory(entry: CoordinatorCase): CoordinationAdvisoryContext {
  if (entry.bucket === "finalizado") {
    return { situation: "Avanzando normalmente", missing: "Caso finalizado", actor: "Sin intervención pendiente", next: "Consultar el historial si hace falta" }
  }
  if (entry.bucket === "autorizado" && entry.sla.tone === "overdue") {
    return { situation: "Fuera de plazo", missing: "Resolver el pendiente de coordinación", actor: "Coordinación", next: "Actualizar el caso y registrar la novedad" }
  }

  const hasCoordinator = hasAssignedCoordinator(entry.surgery)
  if (!hasCoordinator || !entry.materialAvailabilityDefined) {
    if (!hasCoordinator && !entry.materialAvailabilityDefined) {
      return { situation: "Falta información", missing: "Asignar coordinación y confirmar disponibilidad", actor: "Coordinación", next: "Completar responsables y disponibilidad del material" }
    }
    return !hasCoordinator
      ? { situation: "Falta información", missing: "Asignar coordinación", actor: "Coordinación", next: "Asignar una persona responsable" }
      : { situation: "Falta información", missing: "Confirmar disponibilidad del material", actor: "Gestión de Implantes", next: "Confirmar disponibilidad antes de preparación" }
  }

  if (entry.subgroup === "congelada-con-faltantes" || entry.surgery.preparationState === "Congelado con faltantes") {
    return { situation: "Hay un problema", missing: "Resolver faltantes de preparación", actor: "Preparación", next: "Confirmar material completo" }
  }
  if (entry.surgery.urgente) {
    return { situation: "Hay un problema", missing: "Revisar prioridad urgente", actor: "Coordinación", next: "Confirmar el próximo paso del caso urgente" }
  }
  if (!hasScheduledDate(entry.surgery)) {
    return { situation: "Necesita definición", missing: "Confirmar fecha de cirugía", actor: "Coordinación", next: "Definir fecha con médico o institución" }
  }
  if (entry.bucket === "transito") {
    return { situation: "Avanzando normalmente", missing: "Sin faltantes detectados", actor: "Logística", next: "Verificar entrega y seguimiento" }
  }
  return { situation: "Avanzando normalmente", missing: "Sin pendientes detectados", actor: "Coordinación", next: "Continuar seguimiento" }
}

/** Advisory projection for tracking surfaces that only receive Surgery fields. */
export function deriveSurgeryTrackingAdvisory(surgery: Pick<Surgery, "date" | "fechaEnvioMaterial" | "preparationState" | "state">) {
  if (["Realizada", "Finalizada", "Suspendida", "Cancelada", "Sin consumo"].includes(surgery.state)) {
    return { missing: "Sin intervención operativa pendiente", actor: "Sin asignación sugerida", next: "Consultar el historial si hace falta." }
  }
  if (surgery.preparationState === "Congelado con faltantes") {
    return { missing: "Resolver faltantes de preparación", actor: "Preparación", next: "Confirmar el material completo." }
  }
  const hasDate = Boolean(surgery.date?.trim())
  const hasShippingDate = Boolean(surgery.fechaEnvioMaterial?.trim())
  const isPrepared = surgery.preparationState !== "Sin preparar"
  const isShipped = surgery.state === "En tránsito" || ["Enviado", "Entregado"].includes(surgery.preparationState)

  if (!hasDate) return { missing: "Confirmar fecha de cirugía", actor: "Coordinación", next: "Confirmar la fecha del caso." }
  if (!isPrepared) return { missing: "Iniciar preparación del material", actor: "Preparación", next: "Preparar el material confirmado." }
  if (!hasShippingDate) return { missing: "Coordinar el envío del material", actor: "Logística", next: "Definir fecha de envío y transporte." }
  if (!isShipped) return { missing: "Coordinar el envío", actor: "Logística", next: "Definir despacho y transporte." }
  return { missing: "Sin pendientes detectados", actor: "Sin intervención sugerida", next: "Continuar seguimiento del caso." }
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
