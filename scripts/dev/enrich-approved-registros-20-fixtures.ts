import { config as loadEnv } from "dotenv"
import { Pool } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"
import { Prisma, PrismaClient } from "@prisma/client"

loadEnv({ path: ".env.local", override: false })
loadEnv({ path: ".env", override: false })

const FIXTURE_SOURCE = "registros-json-v1"
const FIXTURE_TAG = "DEV_FIXTURE_REGISTROS_20_V1"
const EXPECTED_COMPANY = { name: "Districorr DEV", organizationSlug: "ossum-dev" } as const

type FixtureState = {
  expediente: number
  cxStatus: "unauthorized" | "authorized" | "pending" | "scheduled" | "performed" | "finalized" | "suspended" | "cancelled"
  prepStatus: "preparing" | "frozen" | "frozen_with_missing" | "shipped" | "delivered" | "returned" | null
  eventCount: number
}

type FixtureFollowUp = {
  content: string
  summary: string
  noteType: "general" | "urgente" | "facturacion" | "logistica" | "coordinacion"
  priority: "alta" | "media" | "baja"
  area: FixtureActorArea
}

type FixtureActorArea = "coordinacion" | "logistica" | "deposito" | "ingreso"

const FIXTURE_ACTORS = {
  coordinacion: { id: "devfixtureactorcoord000000000", firstName: "Fixture DEV", lastName: "Coordinación", email: "fixture.coordinacion@dev.ossum.invalid" },
  logistica: { id: "devfixtureactorlogist00000000", firstName: "Fixture DEV", lastName: "Logística", email: "fixture.logistica@dev.ossum.invalid" },
  deposito: { id: "devfixtureactordeposito000000", firstName: "Fixture DEV", lastName: "Depósito", email: "fixture.deposito@dev.ossum.invalid" },
  ingreso: { id: "devfixtureactoringreso0000000", firstName: "Fixture DEV", lastName: "Ingreso", email: "fixture.ingreso@dev.ossum.invalid" },
} as const satisfies Record<FixtureActorArea, { id: string; firstName: string; lastName: string; email: string }>

const AREA_BY_NOTE_TYPE: Record<FixtureFollowUp["noteType"], FixtureActorArea> = {
  coordinacion: "coordinacion",
  logistica: "logistica",
  urgente: "deposito",
  general: "ingreso",
  facturacion: "ingreso",
}

// All copy is synthetic and operational only. No clinical, identifying, or fiscal data is introduced.
const FIXTURES: readonly FixtureState[] = [
  { expediente: 6920, cxStatus: "performed", prepStatus: "returned", eventCount: 4 },
  { expediente: 6898, cxStatus: "finalized", prepStatus: "returned", eventCount: 5 },
  { expediente: 6858, cxStatus: "scheduled", prepStatus: "preparing", eventCount: 3 },
  { expediente: 6823, cxStatus: "authorized", prepStatus: "frozen", eventCount: 3 },
  { expediente: 6502, cxStatus: "cancelled", prepStatus: null, eventCount: 3 },
  { expediente: 6270, cxStatus: "pending", prepStatus: null, eventCount: 2 },
  { expediente: 4485, cxStatus: "unauthorized", prepStatus: null, eventCount: 2 },
  { expediente: 6918, cxStatus: "pending", prepStatus: null, eventCount: 2 },
  { expediente: 6914, cxStatus: "authorized", prepStatus: "preparing", eventCount: 3 },
  { expediente: 6909, cxStatus: "scheduled", prepStatus: "delivered", eventCount: 4 },
  { expediente: 6907, cxStatus: "performed", prepStatus: "delivered", eventCount: 4 },
  { expediente: 6902, cxStatus: "finalized", prepStatus: "returned", eventCount: 5 },
  { expediente: 6873, cxStatus: "suspended", prepStatus: "frozen_with_missing", eventCount: 3 },
  { expediente: 5988, cxStatus: "cancelled", prepStatus: null, eventCount: 3 },
  // Source EN TRÁNSITO mapping retained: material dispatched = prepStatus shipped.
  { expediente: 6901, cxStatus: "scheduled", prepStatus: "shipped", eventCount: 4 },
  { expediente: 6897, cxStatus: "scheduled", prepStatus: "shipped", eventCount: 4 },
  { expediente: 6859, cxStatus: "scheduled", prepStatus: "shipped", eventCount: 4 },
  { expediente: 6837, cxStatus: "scheduled", prepStatus: "shipped", eventCount: 4 },
  { expediente: 6819, cxStatus: "scheduled", prepStatus: "shipped", eventCount: 4 },
  { expediente: 6487, cxStatus: "scheduled", prepStatus: "shipped", eventCount: 4 },
] as const

function surgeryId(expediente: number) {
  return `importregistrossurgery${expediente}`.padEnd(30, "0")
}

function fixtureEntryId(expediente: number, sequence: number) {
  return `devfixtureseg${expediente}${sequence}`.padEnd(30, "0")
}

function fixtureNotificationId(expediente: number) {
  return `devfixturenotice${expediente}`.padEnd(30, "0")
}

function visibleNumber(sequence: number) {
  return `CX-${String(sequence).padStart(4, "0")}`
}

function parseArgs(argv: string[]) {
  const unsupported = argv.filter((arg) => arg !== "--apply")
  if (unsupported.length > 0) throw new Error(`Unsupported arguments: ${unsupported.join(", ")}. Usage: tsx scripts/dev/enrich-approved-registros-20-fixtures.ts [--apply]`)
  return { apply: argv.includes("--apply") }
}

function fixtureFollowUps(fixture: FixtureState): FixtureFollowUp[] {
  const followUp = (content: string, summary: string, noteType: FixtureFollowUp["noteType"], priority: FixtureFollowUp["priority"]): FixtureFollowUp => ({ content, summary, noteType, priority, area: AREA_BY_NOTE_TYPE[noteType] })
  const operational: FixtureFollowUp[] = [followUp("Caso incorporado a la agenda operativa para revisar el circuito.", "Caso incorporado", "coordinacion", "baja")]

  if (fixture.cxStatus === "unauthorized" || fixture.cxStatus === "pending") {
    operational.push(followUp("Queda pendiente la confirmación de autorización antes de avanzar con la preparación.", "Autorización pendiente", "coordinacion", "alta"))
  } else if (fixture.cxStatus === "cancelled") {
    operational.push(followUp("La gestión fue cancelada y no se programaron movimientos de material.", "Gestión cancelada", "general", "media"))
  } else if (fixture.cxStatus === "suspended") {
    operational.push(followUp("La preparación quedó detenida por faltantes pendientes de resolver.", "Preparación suspendida", "urgente", "alta"))
  } else {
    operational.push(followUp("La autorización fue validada y el caso quedó habilitado para continuar la coordinación.", "Autorización validada", "coordinacion", "media"))
  }

  if (fixture.cxStatus !== "performed") {
    operational.push(followUp("Se verificó la información disponible y se dejó el caso listo para la siguiente gestión.", "Revisión operativa", "general", "media"))
  }

  if (fixture.prepStatus === "preparing") {
    operational.push(followUp("El material está en preparación; se revisa disponibilidad antes del armado final.", "Material en preparación", "logistica", "media"))
  } else if (fixture.prepStatus === "frozen") {
    operational.push(followUp("La preparación fue congelada y quedó disponible para coordinar la salida.", "Preparación confirmada", "logistica", "media"))
  } else if (fixture.prepStatus === "frozen_with_missing") {
    operational.push(followUp("Se mantiene el armado reservado mientras se completa el material faltante.", "Faltante a resolver", "urgente", "alta"))
  } else if (fixture.prepStatus === "shipped") {
    operational.push(followUp("El material fue despachado y quedó en seguimiento hasta la recepción.", "Material despachado", "logistica", "media"))
  } else if (fixture.prepStatus === "delivered") {
    operational.push(followUp("Se registró la entrega del material y se mantiene el control posterior al procedimiento.", "Material entregado", "logistica", "media"))
  } else if (fixture.prepStatus === "returned") {
    operational.push(followUp("El material regresó y el caso quedó en revisión de cierre operativo.", "Material devuelto", "logistica", "baja"))
  }

  if (fixture.cxStatus === "performed") {
    operational.push(followUp("El procedimiento fue realizado; queda pendiente completar el cierre administrativo.", "Procedimiento realizado", "general", "media"))
  } else if (fixture.cxStatus === "finalized") {
    operational.push(followUp("Circuito operativo finalizado, sin gestiones pendientes en este registro.", "Circuito finalizado", "general", "baja"))
  }

  return operational.slice(0, fixture.eventCount)
}

function syntheticTimeline(fixture: FixtureState) {
  return fixtureFollowUps(fixture).map((followUp, index) => ({
    id: fixtureEntryId(fixture.expediente, index + 1),
    ...followUp,
    createdAt: new Date(Date.UTC(2026, 6, 1 + index, 12, 0, 0)),
  }))
}

async function assertDevTarget(prisma: PrismaClient) {
  const matches = await prisma.company.findMany({
    where: { name: EXPECTED_COMPANY.name, isActive: true, organization: { slug: EXPECTED_COMPANY.organizationSlug } },
    select: { id: true, name: true, organization: { select: { slug: true } } },
  })
  if (matches.length !== 1) throw new Error("Refusing fixture enrichment: database is not the uniquely identifiable OSSUM DEV target.")
  return matches[0]
}

async function assertSelectedFixtureOwnership(prisma: PrismaClient, companyId: string) {
  const expectedIds = FIXTURES.map((fixture) => surgeryId(fixture.expediente))
  const rows = await prisma.surgery.findMany({
    where: { companyId, id: { in: expectedIds } },
    select: { id: true, visibleNumber: true, source: true },
  })
  if (rows.length !== FIXTURES.length) throw new Error(`Refusing enrichment: expected ${FIXTURES.length} imported fixture surgeries, found ${rows.length}. Run the approved importer first.`)
  const foreign = rows.filter((row) => row.source !== FIXTURE_SOURCE || !FIXTURES.some((fixture) => row.id === surgeryId(fixture.expediente)))
  if (foreign.length > 0) throw new Error(`Refusing enrichment: selected surgery is not this fixture source: ${foreign.map((row) => row.visibleNumber ?? row.id).join(", ")}`)
}

async function inspectFixtureActors(prisma: PrismaClient, companyId: string) {
  const definitions = Object.entries(FIXTURE_ACTORS) as Array<[FixtureActorArea, (typeof FIXTURE_ACTORS)[FixtureActorArea]]>
  const users = await prisma.user.findMany({
    where: { OR: [{ id: { in: definitions.map(([, actor]) => actor.id) } }, { email: { in: definitions.map(([, actor]) => actor.email) } }] },
    select: { id: true, email: true, firstName: true, lastName: true, supabaseAuthId: true, companyAccess: { where: { companyId }, select: { isActive: true } } },
  })
  return definitions.map(([area, actor]) => {
    const user = users.find((candidate) => candidate.id === actor.id || candidate.email === actor.email)
    if (user && (user.id !== actor.id || user.email !== actor.email || user.supabaseAuthId !== null)) throw new Error(`Refusing enrichment: fixture actor collision or external auth binding for ${area}.`)
    return { area, ...actor, status: user?.companyAccess.some((access) => access.isActive) ? "reused" : "to-create", hasExternalAuth: user?.supabaseAuthId != null }
  })
}

async function ensureFixtureActors(tx: Prisma.TransactionClient, companyId: string) {
  const inspected = await inspectFixtureActors(tx as unknown as PrismaClient, companyId)
  for (const actor of inspected) {
    await tx.user.upsert({
      where: { id: actor.id },
      update: { firstName: actor.firstName, lastName: actor.lastName, email: actor.email, isActive: true },
      create: { id: actor.id, firstName: actor.firstName, lastName: actor.lastName, email: actor.email, isActive: true },
    })
    await tx.userCompanyAccess.upsert({
      where: { userId_companyId: { userId: actor.id, companyId } },
      update: { role: "operator", isActive: true },
      create: { userId: actor.id, companyId, role: "operator", isActive: true },
    })
  }
  return Object.fromEntries(inspected.map((actor) => [actor.area, actor])) as Record<FixtureActorArea, (typeof inspected)[number]>
}

async function nextFixtureVisibleNumbers(prisma: PrismaClient, companyId: string) {
  const rows = await prisma.$queryRaw<Array<{ maxNumber: bigint | number | null }>>`
    SELECT MAX(CAST(SUBSTRING("visibleNumber" FROM 4) AS INTEGER)) AS "maxNumber"
    FROM "Surgery"
    WHERE "companyId" = ${companyId}
      AND "visibleNumber" ~ '^CX-[0-9]+$'
      AND "id" NOT IN (${Prisma.join(FIXTURES.map((fixture) => surgeryId(fixture.expediente)))})
  `
  const currentMax = rows[0]?.maxNumber == null ? 0 : Number(rows[0].maxNumber)
  if (!Number.isSafeInteger(currentMax) || currentMax < 0) throw new Error("Refusing enrichment: invalid canonical CX sequence on DEV target.")
  return FIXTURES.map((fixture, index) => ({ expediente: fixture.expediente, visibleNumber: visibleNumber(currentMax + index + 1) }))
}

function distribution() {
  return FIXTURES.reduce<Record<string, number>>((counts, fixture) => {
    const key = `${fixture.cxStatus}${fixture.prepStatus ? ` / ${fixture.prepStatus}` : ""}`
    counts[key] = (counts[key] ?? 0) + 1
    return counts
  }, {})
}

async function main() {
  const { apply } = parseArgs(process.argv.slice(2))
  if (FIXTURES.length !== 20 || new Set(FIXTURES.map((fixture) => fixture.expediente)).size !== 20) throw new Error("Fixture list must contain exactly 20 unique expedientes.")
  const connectionString = process.env.DIRECT_URL
  if (!connectionString) throw new Error("DIRECT_URL is required")
  const target = new URL(connectionString)
  const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } })
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

  try {
    const company = await assertDevTarget(prisma)
    await assertSelectedFixtureOwnership(prisma, company.id)
    const actorPlan = await inspectFixtureActors(prisma, company.id)
    const assignments = await nextFixtureVisibleNumbers(prisma, company.id)
    const preview = {
      mode: apply ? "apply" : "dry-run",
      database: { host: target.host, name: target.pathname.slice(1) },
      company: { id: company.id, name: company.name, organizationSlug: company.organization.slug },
      targetCount: FIXTURES.length,
      fixtureActors: actorPlan.map(({ area, firstName, lastName, email, status, hasExternalAuth }) => ({ area, label: `${firstName} ${lastName}`, email, status, hasExternalAuth })),
      canonicalVisibleNumberRange: { first: assignments[0]?.visibleNumber, last: assignments.at(-1)?.visibleNumber },
      mutationBoundary: "Only the 20 stable-id registros-json-v1 DEV fixture surgeries plus their stable-id synthetic SeguimientoEntry/InternalNotification rows.",
      enTransitMapping: "EST-0003 EN TRÁNSITO -> cxStatus=scheduled + prepStatus=shipped; shipped is the existing canonical preparation/logistics value. DEV fixture mapping only; no global business rule change.",
      statusDistribution: distribution(),
      totalSeguimientoEntries: FIXTURES.reduce((sum, fixture) => sum + fixture.eventCount, 0),
      planned: FIXTURES.map((fixture) => ({ expediente: fixture.expediente, visibleNumber: assignments.find((item) => item.expediente === fixture.expediente)?.visibleNumber, cxStatus: fixture.cxStatus, prepStatus: fixture.prepStatus, seguimientoEntries: fixture.eventCount, novedades: 1 })),
    }
    console.log(JSON.stringify(preview, null, 2))
    if (!apply) return

    await prisma.$transaction(async (tx) => {
      const actors = await ensureFixtureActors(tx, company.id)
      for (const [index, fixture] of FIXTURES.entries()) {
        const id = surgeryId(fixture.expediente)
        const assignedVisibleNumber = assignments[index]?.visibleNumber
        if (!assignedVisibleNumber) throw new Error(`Missing CX number for expediente ${fixture.expediente}`)
        // Conditional write keeps a successful rerun fully idempotent, including updatedAt.
        await tx.surgery.updateMany({
          where: {
            id,
            companyId: company.id,
            OR: [
              { cxStatus: { not: fixture.cxStatus } },
              { prepStatus: { not: fixture.prepStatus } },
              { visibleNumber: { not: assignedVisibleNumber } },
            ],
          },
          data: { visibleNumber: assignedVisibleNumber, cxStatus: fixture.cxStatus, prepStatus: fixture.prepStatus },
        })
        for (const entry of syntheticTimeline(fixture)) {
          const actor = actors[entry.area]
          await tx.seguimientoEntry.upsert({
            where: { id: entry.id },
            update: {
              entryType: "note",
              content: entry.content,
              summary: entry.summary,
              authorId: actor.id,
              evidenceRef: { fixtureTag: FIXTURE_TAG, synthetic: true, sourceExpediente: fixture.expediente, noteType: entry.noteType, priority: entry.priority },
              createdAt: entry.createdAt,
            },
            create: {
              id: entry.id,
              surgeryId: id,
              companyId: company.id,
              entryType: "note",
              content: entry.content,
              summary: entry.summary,
              authorId: actor.id,
              evidenceRef: { fixtureTag: FIXTURE_TAG, synthetic: true, sourceExpediente: fixture.expediente, noteType: entry.noteType, priority: entry.priority },
              createdAt: entry.createdAt,
            },
          })
        }
        const notificationArea: FixtureActorArea = fixture.prepStatus ? "logistica" : "coordinacion"
        const notificationActor = actors[notificationArea]
        await tx.internalNotification.upsert({
          where: { companyId_eventKey: { companyId: company.id, eventKey: `${FIXTURE_TAG}:novedad:${fixture.expediente}` } },
            update: {
              recipientUserId: notificationActor.id,
              actorUserId: notificationActor.id,
              surgeryId: id,
              sourceEntityId: fixtureEntryId(fixture.expediente, 1),
              type: "seguimiento_mention",
              title: `Seguimiento operativo · ${assignedVisibleNumber}`,
              body: fixture.cxStatus === "cancelled" ? "Caso cancelado; no requiere preparación ni despacho." : fixture.cxStatus === "pending" || fixture.cxStatus === "unauthorized" ? "Autorización pendiente para continuar la gestión." : fixture.prepStatus === "shipped" ? "Material despachado; controlar recepción." : fixture.cxStatus === "finalized" ? "Circuito finalizado; sin acciones pendientes." : "Hay una actualización operativa para revisar.",
              metadata: { fixtureTag: FIXTURE_TAG, synthetic: true, externalDispatch: false, sourceExpediente: fixture.expediente, category: notificationArea, priority: fixture.cxStatus === "pending" || fixture.cxStatus === "unauthorized" || fixture.cxStatus === "suspended" ? "alta" : "media" },
              createdAt: new Date(Date.UTC(2026, 6, 10, 12, 0, 0)),
            },
            create: {
            id: fixtureNotificationId(fixture.expediente),
            companyId: company.id,
              recipientUserId: notificationActor.id,
              actorUserId: notificationActor.id,
            surgeryId: id,
            sourceEntityId: fixtureEntryId(fixture.expediente, 1),
            type: "seguimiento_mention",
            eventKey: `${FIXTURE_TAG}:novedad:${fixture.expediente}`,
              title: `Seguimiento operativo · ${assignedVisibleNumber}`,
              body: fixture.cxStatus === "cancelled" ? "Caso cancelado; no requiere preparación ni despacho." : fixture.cxStatus === "pending" || fixture.cxStatus === "unauthorized" ? "Autorización pendiente para continuar la gestión." : fixture.prepStatus === "shipped" ? "Material despachado; controlar recepción." : fixture.cxStatus === "finalized" ? "Circuito finalizado; sin acciones pendientes." : "Hay una actualización operativa para revisar.",
              metadata: { fixtureTag: FIXTURE_TAG, synthetic: true, externalDispatch: false, sourceExpediente: fixture.expediente, category: notificationArea, priority: fixture.cxStatus === "pending" || fixture.cxStatus === "unauthorized" || fixture.cxStatus === "suspended" ? "alta" : "media" },
            createdAt: new Date(Date.UTC(2026, 6, 10, 12, 0, 0)),
          },
        })
      }
    }, { timeout: 30_000 })

    const ids = FIXTURES.map((fixture) => surgeryId(fixture.expediente))
    const [surgeries, entries, notifications, actorUsers] = await Promise.all([
      prisma.surgery.findMany({ where: { companyId: company.id, id: { in: ids } }, select: { id: true, visibleNumber: true, cxStatus: true, prepStatus: true, patientId: true, doctorId: true, payerContactId: true }, orderBy: { visibleNumber: "asc" } }),
      prisma.seguimientoEntry.findMany({ where: { companyId: company.id, id: { in: FIXTURES.flatMap((fixture) => syntheticTimeline(fixture).map((entry) => entry.id)) } }, select: { surgeryId: true, id: true, entryType: true, content: true, summary: true, evidenceRef: true, authorId: true, author: { select: { firstName: true, lastName: true } } } }),
      prisma.internalNotification.findMany({ where: { companyId: company.id, eventKey: { startsWith: `${FIXTURE_TAG}:novedad:` } }, select: { surgeryId: true, eventKey: true } }),
      prisma.user.findMany({ where: { id: { in: Object.values(FIXTURE_ACTORS).map((actor) => actor.id) } }, select: { id: true, firstName: true, lastName: true, email: true, supabaseAuthId: true, companyAccess: { where: { companyId: company.id, isActive: true }, select: { id: true } } } }),
    ])
    const expectedEntries = FIXTURES.reduce((sum, fixture) => sum + fixture.eventCount, 0)
    const placeholderPattern = /Admin DEV|Synthetic DEV lifecycle event|\[DEV fixture\]|EXP-\d+/i
    const validEntryMetadata = entries.every((entry) => {
      const evidence = entry.evidenceRef as { noteType?: string; priority?: string } | null
      return entry.entryType === "note" && ["general", "urgente", "facturacion", "logistica", "coordinacion"].includes(evidence?.noteType ?? "") && ["alta", "media", "baja"].includes(evidence?.priority ?? "")
    })
    const expectedActorIds = new Set<string>(Object.values(FIXTURE_ACTORS).map((actor) => actor.id))
    const validFixtureActors = actorUsers.length === 4 && actorUsers.every((actor) => actor.supabaseAuthId === null && actor.companyAccess.length === 1 && expectedActorIds.has(actor.id))
    if (surgeries.length !== 20 || entries.length !== expectedEntries || notifications.length !== 20 || !validFixtureActors || surgeries.some((row) => !row.patientId || !row.doctorId || !row.payerContactId || !/^CX-\d+$/.test(row.visibleNumber ?? "")) || new Set(surgeries.map((row) => row.visibleNumber)).size !== 20 || entries.some((entry) => !expectedActorIds.has(entry.authorId) || placeholderPattern.test(`${entry.content} ${entry.summary ?? ""} ${entry.author.firstName} ${entry.author.lastName}`)) || !validEntryMetadata) throw new Error("Post-enrichment verification failed: fixture scope, DEV actors, canonical CX numbers, natural follow-ups, or valid note metadata is incomplete.")
    console.log(JSON.stringify({ verifiedSurgeryCount: surgeries.length, verifiedSyntheticSeguimientoCount: entries.length, verifiedSyntheticNovedadCount: notifications.length, verifiedFixtureActors: actorUsers.map((actor) => ({ label: `${actor.firstName} ${actor.lastName}`, email: actor.email, externalAuth: actor.supabaseAuthId !== null })), canonicalVisibleNumberRange: { first: assignments[0]?.visibleNumber, last: assignments.at(-1)?.visibleNumber }, statuses: distribution(), perRecordFollowUpCounts: FIXTURES.map((fixture) => ({ expediente: fixture.expediente, seguimientoEntries: fixture.eventCount })), authorDistribution: entries.reduce<Record<string, number>>((counts, entry) => { const key = `${entry.author.firstName} ${entry.author.lastName}`; counts[key] = (counts[key] ?? 0) + 1; return counts }, {}), noteTypePriorityDistribution: entries.reduce<Record<string, number>>((counts, entry) => { const evidence = entry.evidenceRef as { noteType: string; priority: string }; const key = `${evidence.noteType}/${evidence.priority}`; counts[key] = (counts[key] ?? 0) + 1; return counts }, {}), surgeries }, null, 2))
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
