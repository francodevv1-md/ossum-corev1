import { createHash } from "node:crypto"
import { readFile } from "node:fs/promises"
import { execFileSync } from "node:child_process"
import { resolve } from "node:path"
import { pathToFileURL } from "node:url"
import { config } from "dotenv"
import { Prisma, PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"
import { ownedId, COMPANY_ID } from "./districorr-staff-ten-case-20261002.manifest"
import { geographyFromAddress, markerEligibility } from "../../src/lib/services/logistics-geography"

export const FACILITIES = [
  { key: "hac-formosa", sourceCase: "CX-MOCK-7715", name: 'Hospital de Alta Complejidad "Pte. Juan Domingo Perón"', city: "Formosa", province: "Formosa", street: "Avenida Dr. Néstor Kirchner y Avenida Pantaleón Gómez", number: null, zipCode: "3600", latitude: -26.1815302, longitude: -58.1884300, coordinateType: "CENTROID" as const, osmId: "way/244459542", sourceVersion: "OSM way 244459542 v6 / 2026-05-19", official: "https://www.hacfsa.gob.ar/", note: "Punto de referencia: centroide del predio hospitalario. Identidad y dirección corroboradas con sitio oficial y OSM. No es una entrada vehicular relevada." },
  { key: "sanatorio-norte-corrientes", sourceCase: "CX-MOCK-7713", name: "Sanatorio del Norte SRL", city: "Corrientes", province: "Corrientes", street: "Carlos Pellegrini", number: "1453", zipCode: "3400", latitude: -27.4657713, longitude: -58.8333934, coordinateType: "ADDRESS" as const, osmId: "node/4567644900", sourceVersion: "OSM node 4567644900 v2 / 2020-05-09", official: "https://www.sanatoriodelnorte.com.ar/", note: "Punto de referencia del sanatorio principal en Pellegrini1453, no del policonsultorio externo Córdoba675. Identidad/dirección corroboradas con sitio oficial; nodo OSM2020, sin precisión de entrada relevada." },
]
const TASK = "DISTRICORR-TWO-INSTITUTION-MAP-DEV-001"
const MIGRATION = "20260910120000_contact_address_geography"
const id = (kind: string, key: string) => `dgeo_${kind}_${createHash("sha256").update(`${COMPANY_ID}:${TASK}:${key}`).digest("hex").slice(0, 24)}`
const emit = (value: Record<string, unknown>) => console.log(JSON.stringify(value))
const fail = (code: string): never => { throw new Error(code) }

async function main() {
  config({ path: ".env.local", override: false, quiet: true }); config({ path: ".env", override: false, quiet: true })
  const mode = process.argv[2] ?? "preflight"
  if (!["preflight", "apply", "verify"].includes(mode) || (mode === "apply" && !process.argv.includes("--confirmed-disposable-dev"))) fail("APPROVAL_REQUIRED")
  if (process.env.OSSUM_DEPLOYMENT_TIER !== "development" || !process.env.DATABASE_URL) fail("DEV_CONFIGURATION_REQUIRED")
  const pin = JSON.parse(await readFile("C:/Users/franc/AppData/Local/Temp/opencode/ossum-districorr-approved-dev-target-20261002.json", "utf8"))
    if (!process.env.DATABASE_URL) fail("DATABASE_URL_REQUIRED")
    const target = new URL(process.env.DATABASE_URL!)
    const fingerprint = createHash("sha256").update([target.hostname, target.port, target.pathname, target.username].join("|")).digest("hex")
    if (pin.companyId !== COMPANY_ID || pin.databaseTarget !== fingerprint) fail("TARGET_DRIFT")
    const pool = new Pool({ connectionString: process.env.DATABASE_URL!, connectionTimeoutMillis: 15000 })
    let db = new PrismaClient({ adapter: new PrismaPg(pool) })
    try {
      const company = await db.company.findUnique({ where: { id: COMPANY_ID }, include: { organization: true } })
      const admin = await db.user.findUnique({ where: { email: "admin.dev@ossum.local" }, include: { companyAccess: { where: { companyId: COMPANY_ID } } } })
      if (!company?.isActive || company.name !== "Districorr DEV" || company.organization.slug !== "ossum-dev" || !admin?.isActive || !admin.companyAccess.some(a => a.isActive && a.role === "admin")) fail("TARGET_OR_ADMIN_MISMATCH")
      const expected = FACILITIES.map(f => ownedId("surgery", f.sourceCase))
      const cases = await db.surgery.findMany({ where: { companyId: COMPANY_ID, id: { in: expected } }, select: { id: true, institutionId: true, source: true } })
      if (cases.length !== 2 || cases.some(s => !s.source?.startsWith("DISTRICORR-STAFF-TEN-CASE-DEV-001:"))) fail("CASE_SCOPE_MISMATCH")
      for (const f of FACILITIES) {
        const current = cases.find(s => s.id === ownedId("surgery", f.sourceCase))!
        if (current.institutionId && current.institutionId !== id("contact", f.key)) fail("EXISTING_INSTITUTION_CONFLICT")
      }
      const metadata = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='ContactAddress' AND column_name IN ('latitude','longitude','validationStatus')`)
      if (mode === "preflight") { emit({ outcome: "preflight", verifiedFacilities: 2, targetCases: cases.length, geographyColumnsPresent: metadata.rowCount === 3 }); return }
      if (mode === "apply" && metadata.rowCount === 0) {
        const sql = await readFile(resolve(`prisma/migrations/${MIGRATION}/migration.sql`), "utf8")
        const connection = await pool.connect()
        try { await connection.query("BEGIN"); await connection.query(sql); await connection.query("COMMIT") }
        catch (error) { await connection.query("ROLLBACK"); throw error }
        finally { connection.release() }
        // Resolve only this already executed artifact; never deploy pending migrations.
        execFileSync(process.execPath, [resolve("node_modules/prisma/build/index.js"), "migrate", "resolve", "--applied", MIGRATION], { env: { ...process.env, DIRECT_URL: process.env.DATABASE_URL }, stdio: "pipe", timeout: 60000 })
      } else if (metadata.rowCount !== 3) fail("GEOGRAPHY_SCHEMA_INCOMPLETE")
      if (mode === "apply") {
        await db.$transaction(async tx => {
          for (const [index, f] of FACILITIES.entries()) {
            const contactId = id("contact", f.key)
            const existing = await tx.contact.findUnique({ where: { id: contactId } })
            if (existing && existing.legalName !== f.name) fail("INSTITUTION_CONTACT_DRIFT")
            await tx.contact.upsert({ where: { id: contactId }, update: {}, create: { id: contactId, legalName: f.name, isCompany: true, contactType: "institucion", notes: JSON.stringify({ task: TASK, official: f.official, referencePointOnly: true }) } })
            await tx.contactCompanyLink.upsert({ where: { contactId_companyId: { contactId, companyId: COMPANY_ID } }, update: {}, create: { contactId, companyId: COMPANY_ID, code: `DGEO-INST-${index + 1}`, role: "institution", roles: ["institution", "institucion"], isActive: true } })
            const addressId = id("address", f.key)
            const address = await tx.contactAddress.findUnique({ where: { id: addressId } })
            if (address && (Number(address.latitude) !== f.latitude || Number(address.longitude) !== f.longitude)) fail("EXISTING_GEOGRAPHY_DRIFT")
            await tx.contactAddress.upsert({ where: { id: addressId }, update: {}, create: { id: addressId, contactId, street: f.street, number: f.number, city: f.city, state: f.province, provinceName: f.province, zipCode: f.zipCode, country: "AR", isMain: true, addressType: "institution", entityType: "ADDRESS", latitude: new Prisma.Decimal(f.latitude), longitude: new Prisma.Decimal(f.longitude), coordinateType: f.coordinateType, crs: "EPSG_4326", source: `OpenStreetMap contributors; official institution website; https://www.openstreetmap.org/${f.osmId}`, sourceVersion: f.sourceVersion, sourceRetrievedAt: new Date(), validationStatus: "MANUAL_VERIFIED", validationNotes: `${f.note} Official: ${f.official}. OSM © contributors, ODbL1.0; no clinical data submitted to external sources.` } })
            const surgeryId = ownedId("surgery", f.sourceCase)
            await tx.surgery.updateMany({ where: { id: surgeryId, companyId: COMPANY_ID, OR: [{ institutionId: null }, { institutionId: contactId }] }, data: { institutionId: contactId } })
            await tx.auditEvent.upsert({ where: { id: id("audit", f.key) }, update: {}, create: { id: id("audit", f.key), companyId: COMPANY_ID, userId: admin!.id, entityType: "Surgery", entityId: surgeryId, action: "institution_reference_point_linked", module: "DEV_GEOGRAPHY", metadata: { task: TASK, institutionId: contactId, addressId, official: f.official, osm: f.osmId, referencePointOnly: true } } })
          }
        }, { timeout: 60000 })
      }
    const addresses = await db.contactAddress.findMany({ where: { id: { in: FACILITIES.map(f => id("address", f.key)) } } })
    if (addresses.length !== 2 || addresses.some(a => !markerEligibility(geographyFromAddress(a)).eligible)) fail("MARKER_POSTCONDITION_FAILED")
    const linked = await db.surgery.findMany({ where: { companyId: COMPANY_ID, id: { in: expected } }, select: { id: true, institutionId: true } })
    if (FACILITIES.some(f => !linked.some(s => s.id === ownedId("surgery", f.sourceCase) && s.institutionId === id("contact", f.key)))) fail("LINK_POSTCONDITION_FAILED")
    const other = await db.surgery.count({ where: { companyId: COMPANY_ID, source: { startsWith: "DISTRICORR-STAFF-TEN-CASE-DEV-001:" }, id: { notIn: expected }, institutionId: null } })
    if (other !== 8) fail("OTHER_CASES_CHANGED")
    emit({ outcome: mode === "apply" ? "applied" : "verified", institutions: 2, eligibleMarkers: 2, linkedCases: 2, otherCasesRemainUnlinked: other, referencePointsNotEntrances: true })
  } finally { await db.$disconnect(); await pool.end() }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { const code = /^[A-Z_]+$/.test(error?.message ?? "") ? error.message : "REDACTED_GEOGRAPHY_FAILURE"; emit({ outcome: "failed", code }); process.exitCode = 1 })
}
