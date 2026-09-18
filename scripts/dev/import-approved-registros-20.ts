import { config as loadEnv } from "dotenv"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { Pool } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"
import { Prisma, PrismaClient } from "@prisma/client"

loadEnv({ path: ".env.local", override: false })
loadEnv({ path: ".env", override: false })

const ARTIFACT_PATH = "docs/registros/dev-fixtures-registros-20.v2.json"
const FIXTURE_SOURCE = "dev-fixtures-registros-20-v2"
const LEGACY_FIXTURE_SOURCE = "registros-json-v1"
const LEGACY_FIXTURE_TAG = "DEV_FIXTURE_REGISTROS_20_V1"
const EXPECTED = { fixtureVersion: "2.0.0", fixtureSetKey: "dev-fixtures-registros-20", organizationSlug: "ossum-dev", companyName: "Districorr DEV", supabaseProjectRef: "yywqcdromnmmelijvspi" } as const
const STATUS = new Set(["unauthorized", "authorized", "pending", "scheduled", "performed", "finalized", "suspended", "cancelled"])
const PREPARATION = new Set(["preparing", "frozen", "frozen_with_missing", "shipped", "delivered", "returned"])
const FOLLOW_UP_TYPES = new Set(["general", "urgente", "facturacion", "logistica", "coordinacion"])
const PRIORITIES = new Set(["urgent", "normal", "scheduled"])
const IMPORT_ID_PREFIX = "devfxr20"

type JsonRecord = Record<string, unknown>
type Fixture = {
  fixtureVersion: string; fixtureSetKey: string; syntheticData: boolean
  target: { companyResolution: { organizationSlug: string; companyName: string }; branchResolution: { strategy: string } }
  actors: Array<{ key: string; area: string; firstName: string; lastName: string }>
  contacts: { patients: Array<{ key: string; firstName: string; lastName: string }>; doctors: Array<{ key: string; firstName: string; lastName: string }>; payers: Array<{ key: string; legalName: string }> }
  surgeries: Array<{ key: string; visibleNumber: string; patientKey: string; doctorKey: string; payerKey: string; description: string; priority: string; cxStatus: string; prepStatus: string | null; probableDate?: string; scheduledDate?: string; surgeryDate?: string; cancelledDate?: string; timeline: string[]; novedadKey: string }>
  followUpTemplates: Record<string, { type: string; priority: string; authorKey: string; summary: string; content: string }>
  followUps: Array<{ key: string; surgeryKey: string; templateKey: string; createdAt: string }>
  novedades: Array<{ key: string; surgeryKey: string; authorKey: string; type: "seguimiento_mention"; priority: string; importance: string; title: string; body: string }>
}

function parseArgs(argv: string[]) {
  const supported = new Set(["--apply", "--validate-only"])
  const unsupported = argv.filter((argument) => !supported.has(argument))
  if (unsupported.length) throw new Error(`Unsupported arguments: ${unsupported.join(", ")}. Usage: tsx scripts/dev/import-approved-registros-20.ts [--apply|--validate-only]`)
  if (argv.includes("--apply") && argv.includes("--validate-only")) throw new Error("--apply and --validate-only cannot be used together.")
  return { apply: argv.includes("--apply"), validateOnly: argv.includes("--validate-only") }
}

function asRecord(value: unknown, label: string): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object.`)
  return value as JsonRecord
}

function asFixture(value: unknown): Fixture {
  const artifact = asRecord(value, "Fixture artifact")
  for (const key of ["actors", "surgeries", "followUps", "novedades"]) if (!Array.isArray(artifact[key])) throw new Error(`Fixture artifact.${key} must be an array.`)
  return artifact as unknown as Fixture
}

function fixtureId(kind: "actor" | "contact" | "surgery" | "followUp" | "novedad" | "audit", key: string) {
  const normalized = key.replace(/[^a-z0-9]/gi, "").toLowerCase()
  return `${IMPORT_ID_PREFIX}${kind}${normalized}`.slice(0, 30).padEnd(30, "0")
}

function dateOrNull(value: string | undefined, label: string) {
  if (!value) return null
  const date = new Date(`${value}T12:00:00.000Z`)
  if (Number.isNaN(date.getTime()) || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${label} must be an ISO date.`)
  return date
}

function assertUnique(items: Array<{ key: string }>, label: string) {
  if (new Set(items.map((item) => item.key)).size !== items.length) throw new Error(`${label} has duplicate stable keys.`)
}

function artifactText(artifact: unknown) { return JSON.stringify(artifact) }

function validateArtifact(artifact: Fixture) {
  if (artifact.fixtureVersion !== EXPECTED.fixtureVersion || artifact.fixtureSetKey !== EXPECTED.fixtureSetKey || artifact.syntheticData !== true) throw new Error("Fixture version, set key, or synthetic-data flag is invalid.")
  if (artifact.target?.companyResolution?.organizationSlug !== EXPECTED.organizationSlug || artifact.target?.companyResolution?.companyName !== EXPECTED.companyName || artifact.target?.branchResolution?.strategy !== "none") throw new Error("Fixture target resolution is invalid.")
  if (artifact.surgeries.length !== 20 || artifact.followUps.length !== 70 || artifact.novedades.length !== 20 || artifact.actors.length !== 4) throw new Error(`Unexpected fixture counts: surgeries=${artifact.surgeries.length}, followUps=${artifact.followUps.length}, novedades=${artifact.novedades.length}, actors=${artifact.actors.length}.`)
  const forbidden = /CIRUGIAS_normalizado|fila_origen|expediente|Admin DEV|@|\b\d{7,}\b/i
  if (forbidden.test(artifactText(artifact))) throw new Error("Fixture artifact contains a banned source, placeholder, email, or likely PII identifier.")
  assertUnique(artifact.actors, "actors"); assertUnique(artifact.contacts.patients, "patients"); assertUnique(artifact.contacts.doctors, "doctors"); assertUnique(artifact.contacts.payers, "payers"); assertUnique(artifact.surgeries, "surgeries"); assertUnique(artifact.followUps, "followUps"); assertUnique(artifact.novedades, "novedades")
  const actorKeys = new Set(artifact.actors.map((item) => item.key))
  const patientKeys = new Set(artifact.contacts.patients.map((item) => item.key)); const doctorKeys = new Set(artifact.contacts.doctors.map((item) => item.key)); const payerKeys = new Set(artifact.contacts.payers.map((item) => item.key)); const surgeryKeys = new Set(artifact.surgeries.map((item) => item.key)); const followUpKeys = new Set(artifact.followUps.map((item) => item.key)); const novedadKeys = new Set(artifact.novedades.map((item) => item.key))
  for (const actor of artifact.actors) if (!/^[a-z]+(?:-[a-z]+)*$/.test(actor.key) || !actor.firstName.startsWith("Demo")) throw new Error(`Actor ${actor.key} is not clearly synthetic.`)
  for (const contact of [...artifact.contacts.patients, ...artifact.contacts.doctors]) if (!contact.firstName || !contact.lastName.includes("Demo")) throw new Error(`Contact ${contact.key} is not clearly synthetic.`)
  for (const payer of artifact.contacts.payers) if (!payer.legalName.startsWith("Cobertura Demo")) throw new Error(`Payer ${payer.key} is not clearly synthetic.`)
  for (const surgery of artifact.surgeries) {
    if (!/^CX-00(?:0[6-9]|1\d|2[0-5])$/.test(surgery.visibleNumber) || !patientKeys.has(surgery.patientKey) || !doctorKeys.has(surgery.doctorKey) || !payerKeys.has(surgery.payerKey) || !STATUS.has(surgery.cxStatus) || (surgery.prepStatus !== null && !PREPARATION.has(surgery.prepStatus)) || !PRIORITIES.has(surgery.priority) || !novedadKeys.has(surgery.novedadKey)) throw new Error(`Surgery ${surgery.key} has an invalid reference or lifecycle value.`)
    for (const id of surgery.timeline) if (!followUpKeys.has(id)) throw new Error(`Surgery ${surgery.key} references unknown follow-up ${id}.`)
  }
  for (const [key, template] of Object.entries(artifact.followUpTemplates)) if (!FOLLOW_UP_TYPES.has(template.type) || !PRIORITIES.has(template.priority) || !actorKeys.has(template.authorKey) || !template.summary || !template.content) throw new Error(`Follow-up template ${key} is invalid.`)
  for (const followUp of artifact.followUps) { if (!surgeryKeys.has(followUp.surgeryKey) || !artifact.followUpTemplates[followUp.templateKey] || Number.isNaN(new Date(followUp.createdAt).getTime())) throw new Error(`Follow-up ${followUp.key} has an invalid stable reference.`) }
  for (const novedad of artifact.novedades) { if (!surgeryKeys.has(novedad.surgeryKey) || !actorKeys.has(novedad.authorKey) || novedad.type !== "seguimiento_mention" || !PRIORITIES.has(novedad.priority) || !["informative", "normal", "attention"].includes(novedad.importance)) throw new Error(`Novedad ${novedad.key} is invalid.`) }
  if (new Set(artifact.surgeries.map((item) => item.visibleNumber)).size !== 20 || artifact.followUps.some((item) => !artifact.surgeries.find((surgery) => surgery.key === item.surgeryKey)?.timeline.includes(item.key)) || artifact.novedades.some((item) => artifact.surgeries.find((surgery) => surgery.key === item.surgeryKey)?.novedadKey !== item.key)) throw new Error("Fixture reverse references are incomplete.")
}

function loadArtifact() {
  const raw = JSON.parse(readFileSync(resolve(process.cwd(), ARTIFACT_PATH), "utf8"))
  const artifact = asFixture(raw); validateArtifact(artifact); return artifact
}

function assertDevConnectionTarget(connectionString: string) {
  const url = new URL(connectionString)
  const isDirectHost = url.hostname === `db.${EXPECTED.supabaseProjectRef}.supabase.co`
  const isExpectedPoolerUser = decodeURIComponent(url.username) === `postgres.${EXPECTED.supabaseProjectRef}`
  if (!isDirectHost && !isExpectedPoolerUser) throw new Error(`Refusing import: DIRECT_URL does not prove expected Supabase DEV ref ${EXPECTED.supabaseProjectRef}.`)
  return { ref: EXPECTED.supabaseProjectRef, connectionKind: isDirectHost ? "direct" : "pooler" }
}

async function assertDevTarget(prisma: PrismaClient, fixture: Fixture) {
  const matches = await prisma.company.findMany({ where: { name: fixture.target.companyResolution.companyName, isActive: true, organization: { slug: fixture.target.companyResolution.organizationSlug } }, select: { id: true, name: true, organization: { select: { slug: true } } } })
  if (matches.length !== 1) throw new Error("Refusing import: database is not the uniquely identifiable OSSUM DEV target.")
  return matches[0]
}

async function resolveSurgeryIds(prisma: PrismaClient, companyId: string, fixture: Fixture) {
  const rows = await prisma.surgery.findMany({ where: { companyId, visibleNumber: { in: fixture.surgeries.map((item) => item.visibleNumber) } }, select: { id: true, visibleNumber: true, source: true } })
  const byVisibleNumber = new Map(rows.map((row) => [row.visibleNumber, row]))
  const canonicalIds = fixture.surgeries.map((surgery) => fixtureId("surgery", surgery.key))
  const idCollisions = await prisma.surgery.findMany({ where: { id: { in: canonicalIds }, companyId: { not: companyId } }, select: { id: true, visibleNumber: true } })
  if (idCollisions.length) throw new Error(`Refusing import: canonical fixture IDs are owned by another tenant (${idCollisions.map((row) => row.visibleNumber ?? row.id).join(", ")}).`)
  return new Map(fixture.surgeries.map((surgery) => {
    const current = byVisibleNumber.get(surgery.visibleNumber)
    const canonical = fixtureId("surgery", surgery.key)
    if (!current) return [surgery.key, canonical] as const
    const isCanonical = current.source === FIXTURE_SOURCE
    const isLegacyFixture = current.source === LEGACY_FIXTURE_SOURCE && /^importregistrossurgery[a-z0-9]+$/i.test(current.id)
    if (!isCanonical && !isLegacyFixture) throw new Error(`Refusing import: ${surgery.visibleNumber} belongs to non-fixture data.`)
    return [surgery.key, current.id] as const
  }))
}

async function main() {
  const args = parseArgs(process.argv.slice(2)); const fixture = loadArtifact()
  const summary = { fixtureVersion: fixture.fixtureVersion, artifact: ARTIFACT_PATH, syntheticData: fixture.syntheticData, surgeries: fixture.surgeries.length, followUps: fixture.followUps.length, novedades: fixture.novedades.length, actors: fixture.actors.length, contacts: fixture.contacts.patients.length + fixture.contacts.doctors.length + fixture.contacts.payers.length }
  if (args.validateOnly) { console.log(JSON.stringify({ mode: "validate-only", ...summary, stableReferences: "resolved", piiCheck: "passed" }, null, 2)); return }
  const connectionString = process.env.DIRECT_URL
  if (!connectionString) throw new Error("DIRECT_URL is required for a DEV dry-run or reload.")
  const target = assertDevConnectionTarget(connectionString)
  const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } }); const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })
  try {
    const company = await assertDevTarget(prisma, fixture); const surgeryIds = await resolveSurgeryIds(prisma, company.id, fixture)
    console.log(JSON.stringify({ mode: args.apply ? "apply" : "dry-run", database: { ref: target.ref, connectionKind: target.connectionKind, host: new URL(connectionString).host, name: new URL(connectionString).pathname.slice(1) }, company: { name: company.name, organizationSlug: company.organization.slug }, mutationBoundary: "Only fixture-marked rows for the 20 declared CX records; non-fixture collisions refuse the import.", ...summary, resolvedSurgeryIds: surgeryIds.size, stableReferences: "resolved", piiCheck: "passed" }, null, 2))
    if (!args.apply) return
    await prisma.$transaction(async (tx) => {
      const actorIds = new Map<string, string>()
      for (const actor of fixture.actors) { const id = fixtureId("actor", actor.key); actorIds.set(actor.key, id); const email = `fixture+${actor.key}@dev.ossum.invalid`; await tx.user.upsert({ where: { id }, update: { firstName: actor.firstName, lastName: actor.lastName, email, isActive: true, supabaseAuthId: null }, create: { id, firstName: actor.firstName, lastName: actor.lastName, email, isActive: true } }); await tx.userCompanyAccess.upsert({ where: { userId_companyId: { userId: id, companyId: company.id } }, update: { role: "operator", isActive: true }, create: { userId: id, companyId: company.id, role: "operator", isActive: true } }) }
      const contactIds = new Map<string, string>()
      for (const [role, contacts] of [["patient", fixture.contacts.patients], ["doctor", fixture.contacts.doctors], ["payer", fixture.contacts.payers]] as const) for (const contact of contacts) { const id = fixtureId("contact", contact.key); contactIds.set(contact.key, id); const legalName = "legalName" in contact ? contact.legalName : `${contact.firstName} ${contact.lastName}`; await tx.contact.upsert({ where: { id }, update: { legalName, firstName: "firstName" in contact ? contact.firstName : null, lastName: "lastName" in contact ? contact.lastName : null, contactType: role, isCompany: role === "payer", isActive: true, email: null, phone: null, documentType: null, documentNumber: null }, create: { id, legalName, firstName: "firstName" in contact ? contact.firstName : null, lastName: "lastName" in contact ? contact.lastName : null, contactType: role, isCompany: role === "payer", isActive: true } }); await tx.contactCompanyLink.upsert({ where: { contactId_companyId: { contactId: id, companyId: company.id } }, update: { role, isActive: true }, create: { contactId: id, companyId: company.id, role, isActive: true } }) }
      const legacyIds = [...surgeryIds.values()]
      const oldEntries = await tx.seguimientoEntry.findMany({ where: { companyId: company.id, surgeryId: { in: legacyIds } }, select: { id: true, evidenceRef: true } })
      const deletableEntryIds = oldEntries.filter((entry) => (entry.evidenceRef as JsonRecord | null)?.fixtureTag === LEGACY_FIXTURE_TAG).map((entry) => entry.id)
      if (deletableEntryIds.length) await tx.seguimientoEntry.deleteMany({ where: { id: { in: deletableEntryIds } } })
      await tx.internalNotification.deleteMany({ where: { companyId: company.id, surgeryId: { in: legacyIds }, eventKey: { startsWith: `${LEGACY_FIXTURE_TAG}:` } } })
      for (const surgery of fixture.surgeries) { const id = surgeryIds.get(surgery.key)!; await tx.surgery.upsert({ where: { id }, update: { visibleNumber: surgery.visibleNumber, patientId: contactIds.get(surgery.patientKey)!, doctorId: contactIds.get(surgery.doctorKey)!, payerContactId: contactIds.get(surgery.payerKey)!, description: surgery.description, priority: surgery.priority, cxStatus: surgery.cxStatus, prepStatus: surgery.prepStatus, probableDate: dateOrNull(surgery.probableDate, surgery.key), scheduledDate: dateOrNull(surgery.scheduledDate, surgery.key), surgeryDate: dateOrNull(surgery.surgeryDate, surgery.key), cancelledDate: dateOrNull(surgery.cancelledDate, surgery.key), source: FIXTURE_SOURCE, notes: "Synthetic DEV fixture; portable key stored in fixture artifact." }, create: { id, companyId: company.id, visibleNumber: surgery.visibleNumber, patientId: contactIds.get(surgery.patientKey)!, doctorId: contactIds.get(surgery.doctorKey)!, payerContactId: contactIds.get(surgery.payerKey)!, description: surgery.description, priority: surgery.priority, cxStatus: surgery.cxStatus, prepStatus: surgery.prepStatus, probableDate: dateOrNull(surgery.probableDate, surgery.key), scheduledDate: dateOrNull(surgery.scheduledDate, surgery.key), surgeryDate: dateOrNull(surgery.surgeryDate, surgery.key), cancelledDate: dateOrNull(surgery.cancelledDate, surgery.key), source: FIXTURE_SOURCE, notes: "Synthetic DEV fixture; portable key stored in fixture artifact." } }) }
      for (const followUp of fixture.followUps) { const template = fixture.followUpTemplates[followUp.templateKey]; await tx.seguimientoEntry.upsert({ where: { id: fixtureId("followUp", followUp.key) }, update: { content: template.content, summary: template.summary, authorId: actorIds.get(template.authorKey)!, evidenceRef: { fixtureSetKey: fixture.fixtureSetKey, synthetic: true, followUpKey: followUp.key, type: template.type, priority: template.priority }, createdAt: new Date(followUp.createdAt) }, create: { id: fixtureId("followUp", followUp.key), surgeryId: surgeryIds.get(followUp.surgeryKey)!, companyId: company.id, entryType: "note", content: template.content, summary: template.summary, authorId: actorIds.get(template.authorKey)!, evidenceRef: { fixtureSetKey: fixture.fixtureSetKey, synthetic: true, followUpKey: followUp.key, type: template.type, priority: template.priority }, createdAt: new Date(followUp.createdAt) } }) }
      for (const novedad of fixture.novedades) await tx.internalNotification.upsert({ where: { companyId_eventKey: { companyId: company.id, eventKey: `${FIXTURE_SOURCE}:${novedad.key}` } }, update: { recipientUserId: actorIds.get(novedad.authorKey)!, actorUserId: actorIds.get(novedad.authorKey)!, surgeryId: surgeryIds.get(novedad.surgeryKey)!, sourceEntityId: fixtureId("followUp", fixture.surgeries.find((item) => item.key === novedad.surgeryKey)!.timeline[0]), title: novedad.title, body: novedad.body, metadata: { fixtureSetKey: fixture.fixtureSetKey, synthetic: true, novedadKey: novedad.key, priority: novedad.priority, importance: novedad.importance } }, create: { id: fixtureId("novedad", novedad.key), companyId: company.id, recipientUserId: actorIds.get(novedad.authorKey)!, actorUserId: actorIds.get(novedad.authorKey)!, surgeryId: surgeryIds.get(novedad.surgeryKey)!, sourceEntityId: fixtureId("followUp", fixture.surgeries.find((item) => item.key === novedad.surgeryKey)!.timeline[0]), type: "seguimiento_mention", eventKey: `${FIXTURE_SOURCE}:${novedad.key}`, title: novedad.title, body: novedad.body, metadata: { fixtureSetKey: fixture.fixtureSetKey, synthetic: true, novedadKey: novedad.key, priority: novedad.priority, importance: novedad.importance } } })
      await tx.auditEvent.upsert({ where: { id: fixtureId("audit", fixture.fixtureSetKey) }, update: { userId: actorIds.get("actor-coordination")!, detail: "Synthetic DEV fixture import reconciled idempotently.", metadata: { fixtureSetKey: fixture.fixtureSetKey, fixtureVersion: fixture.fixtureVersion, synthetic: true, source: FIXTURE_SOURCE } }, create: { id: fixtureId("audit", fixture.fixtureSetKey), companyId: company.id, userId: actorIds.get("actor-coordination")!, entityType: "fixture_import", entityId: FIXTURE_SOURCE, action: "reconciled", detail: "Synthetic DEV fixture import reconciled idempotently.", module: "dev-fixtures", metadata: { fixtureSetKey: fixture.fixtureSetKey, fixtureVersion: fixture.fixtureVersion, synthetic: true, source: FIXTURE_SOURCE } } })
    }, { timeout: 30_000 })
    const ids = [...surgeryIds.values()]; const contactIds = [...fixture.contacts.patients, ...fixture.contacts.doctors, ...fixture.contacts.payers].map((item) => fixtureId("contact", item.key)); const actorIds = fixture.actors.map((item) => fixtureId("actor", item.key)); const [surgeries, followUps, novedades, contactLinks, auditEvents, foreignFixtureRows, surgeryRows, notificationRows] = await Promise.all([prisma.surgery.count({ where: { companyId: company.id, id: { in: ids }, source: FIXTURE_SOURCE } }), prisma.seguimientoEntry.count({ where: { companyId: company.id, id: { in: fixture.followUps.map((item) => fixtureId("followUp", item.key)) } } }), prisma.internalNotification.count({ where: { companyId: company.id, eventKey: { startsWith: `${FIXTURE_SOURCE}:` } } }), prisma.contactCompanyLink.count({ where: { companyId: company.id, contactId: { in: contactIds } } }), prisma.auditEvent.count({ where: { id: fixtureId("audit", fixture.fixtureSetKey), companyId: company.id, entityId: FIXTURE_SOURCE } }), prisma.surgery.count({ where: { source: FIXTURE_SOURCE, companyId: { not: company.id } } }), prisma.surgery.findMany({ where: { companyId: company.id, id: { in: ids }, source: FIXTURE_SOURCE }, select: { visibleNumber: true, priority: true } }), prisma.internalNotification.findMany({ where: { companyId: company.id, eventKey: { startsWith: `${FIXTURE_SOURCE}:` } }, select: { recipientUserId: true, actorUserId: true } })])
    const prioritiesCanonical = surgeryRows.length === 20 && surgeryRows.every((row) => !!row.visibleNumber && /^CX-00(?:0[6-9]|1\d|2[0-5])$/.test(row.visibleNumber) && PRIORITIES.has(row.priority ?? ""))
    const notificationsAreSynthetic = notificationRows.every((row) => actorIds.includes(row.recipientUserId) && actorIds.includes(row.actorUserId))
    if (surgeries !== 20 || followUps !== 70 || novedades !== 20 || contactLinks !== 32 || auditEvents !== 1 || foreignFixtureRows !== 0 || !prioritiesCanonical || !notificationsAreSynthetic) throw new Error(`Post-reload verification failed: surgeries=${surgeries}, followUps=${followUps}, novedades=${novedades}, contactLinks=${contactLinks}, auditEvents=${auditEvents}, foreignFixtureRows=${foreignFixtureRows}, prioritiesCanonical=${prioritiesCanonical}, notificationsAreSynthetic=${notificationsAreSynthetic}.`)
    console.log(JSON.stringify({ reloaded: true, surgeries, contacts: contactLinks, followUps, novedades, auditEvents, prioritiesCanonical, tenantIsolation: "passed", notificationsAreSynthetic, idempotentKey: FIXTURE_SOURCE }, null, 2))
  } finally { await prisma.$disconnect(); await pool.end() }
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1 })
