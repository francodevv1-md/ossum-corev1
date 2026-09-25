/* eslint-disable @typescript-eslint/no-explicit-any */
import { Prisma } from "@prisma/client"
import { badRequest } from "@/lib/api/errors"

type Db = any
type Actor = Readonly<{ actorUserId: string; role: string }>
type Query = ReturnType<typeof import("@/lib/validators/logistics-global-inbox-read").validateLogisticsGlobalInboxQuery>

const iso = (value: unknown) => (value instanceof Date ? value.toISOString() : value == null ? null : String(value))
const name = (contact: any) =>
  contact
    ? [contact.firstName, contact.lastName].filter(Boolean).join(" ") || contact.legalName || contact.tradeName || null
    : null

export async function getLogisticsGlobalInbox(db: Db, companyId: string, actor: Actor, query: Query) {
  // Build Prisma where filter
  const where: any = {
    companyId,
    archivedAt: null,
  }

  if (query.branchId) where.branchId = query.branchId
  if (query.institutionId) where.institutionId = query.institutionId
  if (query.cxStatus) where.cxStatus = query.cxStatus
  if (query.prepStatus) where.prepStatus = query.prepStatus
  if (query.priority) where.priority = query.priority

  if (query.from || query.to) {
    where.OR = [
      {
        surgeryDate: {
          ...(query.from ? { gte: new Date(query.from) } : {}),
          ...(query.to ? { lte: new Date(query.to) } : {}),
        },
      },
      {
        scheduledDate: {
          ...(query.from ? { gte: new Date(query.from) } : {}),
          ...(query.to ? { lte: new Date(query.to) } : {}),
        },
      },
    ]
  }

  if (query.q) {
    const term = query.q.trim()
    where.AND = [
      {
        OR: [
          { visibleNumber: { equals: isNaN(Number(term)) ? undefined : Number(term) } },
          { patient: { is: { firstName: { contains: term, mode: "insensitive" } } } },
          { patient: { is: { lastName: { contains: term, mode: "insensitive" } } } },
          { doctor: { is: { lastName: { contains: term, mode: "insensitive" } } } },
          { institution: { is: { legalName: { contains: term, mode: "insensitive" } } } },
          { institution: { is: { tradeName: { contains: term, mode: "insensitive" } } } },
        ].filter(Boolean),
      },
    ]
  }

  // Fetch surgeries with relations
  const [totalCount, rawSurgeries] = await Promise.all([
    db.surgery.count({ where }).catch(() => 0),
    db.surgery.findMany({
      where,
      take: (query.limit || 25) + 1,
      orderBy: [{ surgeryDate: "desc" }, { scheduledDate: "desc" }, { createdAt: "desc" }],
      include: {
        patient: true,
        doctor: true,
        payer: true,
        institution: {
          include: {
            addresses: {
              where: { isMain: true },
              take: 1,
            },
          },
        },
        remitos: {
          where: { salidaReason: "cirugia" },
          orderBy: { createdAt: "desc" },
        },
      },
    }).catch(() => []),
  ])

  const hasMore = rawSurgeries.length > (query.limit || 25)
  const surgeries = hasMore ? rawSurgeries.slice(0, query.limit || 25) : rawSurgeries

  let urgentCount = 0
  let exceptionsCount = 0
  let newsCount = 0

  const items = surgeries.map((surgery: any) => {
    const isUrgent =
      surgery.priority === "urgent" ||
      surgery.priority === "URGENTE" ||
      surgery.priority === "Alta"
    if (isUrgent) urgentCount++

    const remitos = surgery.remitos || []
    const remitoStates = Array.from(new Set(remitos.map((r: any) => r.state)))
    const logisticsStatus =
      remitos.length === 0
        ? "pending"
        : remitoStates.length === 1
        ? String(remitoStates[0]).toLowerCase()
        : "mixed"

    const blockers: string[] = []
    if (remitos.length === 0 && (surgery.prepStatus === "Lista" || surgery.prepStatus === "ready")) {
      blockers.push("Sin remito emitido")
    }

    if (blockers.length > 0) exceptionsCount++

    const nextAction =
      remitos.length === 0
        ? { label: "Generar remito de salida" }
        : logisticsStatus === "emitido"
        ? { label: "Asignar chofer y despachar" }
        : logisticsStatus === "en_transito"
        ? { label: "Confirmar entrega en quirófano" }
        : { label: "Verificar consumo y devoluciones" }

    const address = surgery.institution?.addresses?.[0]
    const locality = address?.city || address?.state || null

    return {
      surgery: {
        id: surgery.id,
        reference: surgery.visibleNumber
          ? String(surgery.visibleNumber).startsWith("CX-")
            ? String(surgery.visibleNumber)
            : `CX-${surgery.visibleNumber}`
          : "Sin ref",
        date: iso(surgery.surgeryDate ?? surgery.scheduledDate),
        patient: name(surgery.patient),
        doctor: name(surgery.doctor),
        client: name(surgery.payer),
        institution: name(surgery.institution),
        institutionId: surgery.institution?.id ?? null,
        locality,
        surgeryStatus: surgery.cxStatus ?? "Programada",
        preparationStatus: surgery.prepStatus ?? "Pendiente",
        logisticsStatus,
        priority: surgery.priority ?? (isUrgent ? "urgent" : "normal"),
      },
      logistics: {
        stages: remitos.length > 0 ? ["dispatch"] : ["prepare"],
        cajas: "unavailable",
        materials: { count: 0, availability: "available" },
        quantities: {
          expected: "0",
          assigned: "0",
          dispatched: "0",
          consumed: "0",
          returned: "0",
          pending: "0",
          quarantine: "0",
        },
        availability: "available" as const,
        blockers: {
          count: blockers.length,
          highest: blockers[0] ?? null,
        },
        differences: { open: 0, closed: 0 },
        alerts: { count: 0, highest: null },
        exceptions: {
          count: blockers.length,
          highest: blockers[0] ? "blocker" : null,
        },
        lastNovelty: null,
        nextAction,
        indicators: {
          prepare: "ready",
          dispatch: remitos.length ? "ready" : "pending",
          receive: "unavailable",
          return: "unavailable",
          reconcile: "unavailable",
        },
        capabilities: {
          prepare: "available",
          dispatch: "available",
          receive: "unavailable",
          return: "unavailable",
          reconcile: "unavailable",
        },
      },
      transition: null,
    }
  })

  return {
    generatedAt: new Date().toISOString(),
    counts: {
      news: newsCount,
      urgent: urgentCount,
      overdue: null,
      exceptions: exceptionsCount,
    },
    availability: { overdue: "unavailable" as const },
    items,
    page: {
      nextCursor: null,
      hasMore,
    },
  }
}
