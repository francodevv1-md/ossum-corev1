import { createHash, randomBytes } from "node:crypto"
import { execFileSync } from "node:child_process"
import { open, readFile, writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import { config } from "dotenv"
import { Prisma, PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"
import { createClient } from "@supabase/supabase-js"
import { validateCxStatus } from "../../src/lib/validators/surgery.validator"
import { parseManifest, assertCompleteSource, manifestSourceHash, ownedId, sourceDate, COMPANY_ID, TASK_ID, evaluateDistricorrProvenance, redactedManifestSummary, type MockManifest } from "./districorr-staff-ten-case-20261002.manifest"

config({ path: ".env.local", override: false, quiet: true })
config({ path: ".env", override: false, quiet: true })
const staff = [
  ["nelson.gonzalez", "Nelson", "Gonzalez", "coordinator"],
  ["cristian.vera", "Cristian", "Vera", "coordinator"],
  ["hernan", "Hernan", "", "logistics"], ["bruno", "Bruno", "", "logistics"],
  ["romina", "Romina", "", "logistics"], ["leticia", "Leticia", "", "logistics"],
  ["maira", "Maira", "", "logistics"], ["maxi", "Maxi", "", "logistics"],
  ["cesar", "Cesar", "", "billing"],
].map(([alias, firstName, lastName, role]) => ({ alias, firstName, lastName, role, email: `${alias}.dev@ossum.local` }))
const credentialPath = "C:/Users/franc/AppData/Local/Temp/opencode/ossum-districorr-staff-ten-case-20261002-credentials.json"
type Journal = { task: string; accounts: Array<{ email: string; password: string; authId?: string }> }
const emit = (data: Record<string, unknown>) => console.log(JSON.stringify(data))
const fail = (code: string): never => { throw new Error(code) }

function secureFile(path: string): void {
  execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", String.raw`
    $ErrorActionPreference='Stop'; $path=$env:OSSUM_CREDENTIAL_ACL_PATH
    $sid=[System.Security.Principal.WindowsIdentity]::GetCurrent().User
    $acl=Get-Acl -LiteralPath $path; $acl.SetAccessRuleProtection($true,$false)
    foreach($rule in @($acl.Access)){[void]$acl.RemoveAccessRuleSpecific($rule)}
    $rule=New-Object System.Security.AccessControl.FileSystemAccessRule($sid,'FullControl','Allow')
    [void]$acl.AddAccessRule($rule); Set-Acl -LiteralPath $path -AclObject $acl
    $check=Get-Acl -LiteralPath $path
    if(-not $check.AreAccessRulesProtected -or @($check.Access).Count -ne 1){exit 41}
    if($check.Access[0].IdentityReference.Translate([System.Security.Principal.SecurityIdentifier]).Value -ne $sid.Value){exit 42}
  `], { env: { ...process.env, OSSUM_CREDENTIAL_ACL_PATH: path }, windowsHide: true, stdio: "pipe" })
}
async function credentialJournal(): Promise<Journal> {
  try {
    secureFile(credentialPath)
    const journal = JSON.parse(await readFile(credentialPath, "utf8")) as Journal
    if (journal.task !== TASK_ID || journal.accounts.length !== 9 || staff.some(s => !journal.accounts.some(a => a.email === s.email && a.password))) fail("CREDENTIAL_OWNER_MISMATCH")
    return journal
  } catch (error) {
    // Only absence allows creation; ACL/ownership/parse errors must stop.
    try { await readFile(credentialPath, "utf8") } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw error
      const file = await open(credentialPath, "wx", 0o600); await file.close()
      secureFile(credentialPath)
      const journal: Journal = { task: TASK_ID, accounts: staff.map(s => ({ email: s.email, password: `Aa1!${randomBytes(32).toString("base64url")}` })) }
      await writeFile(credentialPath, JSON.stringify(journal, null, 2), { mode: 0o600 })
      return journal
    }
    throw error
  }
}

async function main() {
  const args = process.argv.slice(2)
  const mode = args[0] ?? "preflight"
  if (!["preflight", "apply", "verify"].includes(mode) || !args.includes(`--expected-company=${COMPANY_ID}`)) fail("CLI_SCOPE_REQUIRED")
  if (mode === "apply" && !(args.includes("--confirmed-disposable-dev") && args.includes("--allow-source-identities"))) fail("EXPLICIT_APPROVAL_FLAGS_REQUIRED")
  const provenance = evaluateDistricorrProvenance(process.env)
  if (provenance.provenanceGate !== "PASS") { emit({ outcome: "blocked", ...provenance }); process.exitCode = 2; return }
  const manifest = parseManifest(await readFile(resolve("docs/OSSUM_COR_MOCK_10_CIRUGIAS.md"), "utf8"))
  assertCompleteSource(manifest)
  const hash = manifestSourceHash(manifest)
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 15000 })
  const db = new PrismaClient({ adapter: new PrismaPg(pool) })
  const auth = createClient((process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)!.replace(/\/rest\/v1\/?$/, ""), process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
  try {
    const company = await db.company.findUnique({ where: { id: COMPANY_ID }, include: { organization: true } })
    if (!company || company.name !== "Districorr DEV" || !company.isActive || company.organization.slug !== "ossum-dev" || !company.organization.isActive) fail("TARGET_MISMATCH")
    const admin = await db.user.findUnique({ where: { email: "admin.dev@ossum.local" }, include: { companyAccess: { where: { companyId: COMPANY_ID } } } })
    if (!admin || !admin.supabaseAuthId || !admin.isActive || !admin.companyAccess.some(a => a.role === "admin" && a.isActive)) {
      throw new Error("ADMIN_DEV_MISMATCH")
    }
    const identities: Array<{ id: string; email?: string; user_metadata: Record<string, unknown> }> = []
    let adminMatch = false
    for (let page = 1; page <= 100; page++) {
      const result = await auth.auth.admin.listUsers({ page, perPage: 1000 })
      if (result.error) fail("AUTH_READ_FAILED")
      for (const identity of result.data.users) {
        if (identity.id === admin.supabaseAuthId && identity.email === admin.email) adminMatch = true
        if (staff.some(s => s.email === identity.email)) identities.push(identity)
      }
      if (result.data.users.length < 1000) break
      if (page === 100) fail("AUTH_PAGE_LIMIT")
    }
    if (!adminMatch) fail("AUTH_TARGET_MISMATCH")
    const pin = JSON.parse(await readFile("C:/Users/franc/AppData/Local/Temp/opencode/ossum-districorr-approved-dev-target-20261002.json", "utf8"))
    const digest = (value: string) => createHash("sha256").update(value).digest("hex")
    const authUrl = new URL((process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)!.replace(/\/rest\/v1\/?$/, ""))
    const databaseUrl = new URL(process.env.DATABASE_URL!)
    if (pin.task !== TASK_ID || pin.companyId !== COMPANY_ID || pin.authTarget !== digest(authUrl.origin) || pin.databaseTarget !== digest([databaseUrl.hostname, databaseUrl.port, databaseUrl.pathname, databaseUrl.username].join("|")) || pin.adminIdentity !== digest(admin.supabaseAuthId!)) fail("APPROVED_TARGET_DRIFT")
    for (const s of staff) {
      const identity = identities.find(a => a.email === s.email)
      const user = await db.user.findUnique({ where: { email: s.email }, include: { companyAccess: true } })
      if (identity && identity.user_metadata?.ossum_demo_task !== TASK_ID) fail("EXISTING_AUTH_OWNER_CONFLICT")
      if (user && (user.id !== ownedId("user", s.alias) || !user.isActive || (identity && user.supabaseAuthId !== identity.id) || user.companyAccess.some(a => a.companyId !== COMPANY_ID || a.role !== s.role || !a.isActive))) fail("EXISTING_USER_CONFLICT")
    }
    const sourceCases = manifest.surgeries.map(s => ownedId("surgery", s.id))
    const existingCases = await db.surgery.findMany({ where: { OR: [{ id: { in: sourceCases } }, { companyId: COMPANY_ID, visibleNumber: { in: manifest.surgeries.map(s => s.visibleNumber) } }] } })
    if (existingCases.some(s => s.companyId !== COMPANY_ID || !sourceCases.includes(s.id) || s.source !== `${TASK_ID}:${hash}`)) fail("EXISTING_CASE_CONFLICT")
    if (mode === "preflight") {
      emit({ outcome: "preflight_pass", ...redactedManifestSummary(manifest), plannedStaff: 9, existingOwnedCases: existingCases.length, allocation: { nelson: 8, cristian: 2 }, adminDevPreserved: true })
      return
    }
    if (mode === "apply") {
      const journal = await credentialJournal()
      for (const s of staff) {
        const row = journal.accounts.find(a => a.email === s.email)!
        let identity = identities.find(a => a.email === s.email)
        if (!identity) {
          const result = await auth.auth.admin.createUser({ email: s.email, password: row.password, email_confirm: true, user_metadata: { first_name: s.firstName, last_name: s.lastName, full_name: `${s.firstName} ${s.lastName}`.trim(), ossum_demo_task: TASK_ID } })
          if (result.error || !result.data.user) fail("AUTH_CREATE_FAILED")
          const createdUser = result.data.user!
          identity = { id: createdUser.id, email: createdUser.email, user_metadata: (createdUser.user_metadata ?? {}) as Record<string, unknown> }
          identities.push(identity)
        }
        row.authId = identity!.id
        await writeFile(credentialPath, JSON.stringify(journal, null, 2), { mode: 0o600 })
      }
      await db.$transaction(async tx => {
        for (const s of staff) {
          const authId = identities.find(a => a.email === s.email)!.id
          await tx.user.upsert({ where: { id: ownedId("user", s.alias) }, update: {}, create: { id: ownedId("user", s.alias), supabaseAuthId: authId, email: s.email, firstName: s.firstName, lastName: s.lastName, isActive: true } })
          await tx.userCompanyAccess.upsert({ where: { userId_companyId: { userId: ownedId("user", s.alias), companyId: COMPANY_ID } }, update: {}, create: { userId: ownedId("user", s.alias), companyId: COMPANY_ID, role: s.role, isActive: true } })
        }
        for (const [index, s] of staff.slice(0, 2).entries()) {
          const id = ownedId("coordinator", s.alias)
          const current = await tx.contact.findUnique({ where: { id } })
          if (current && (current.legalName !== `${s.firstName} ${s.lastName}` || current.email !== s.email || !current.isActive || current.isCompany)) fail("COORDINATOR_CONTACT_DRIFT")
          const sameName = await tx.contact.findMany({ where: { legalName: `${s.firstName} ${s.lastName}`, id: { not: id } } })
          if (sameName.length) fail("COORDINATOR_IDENTITY_CONFLICT")
          await tx.contact.upsert({ where: { id }, update: {}, create: { id, firstName: s.firstName, lastName: s.lastName, legalName: `${s.firstName} ${s.lastName}`, email: s.email, isCompany: false, contactType: "cliente" } })
          await tx.contactCompanyLink.upsert({ where: { contactId_companyId: { contactId: id, companyId: COMPANY_ID } }, update: {}, create: { contactId: id, companyId: COMPANY_ID, code: `DSC-COORD-${index + 1}`, role: "coordinator", roles: ["coordinator"], isActive: true } })
        }
        for (const [role, contacts] of [["payer", manifest.payers], ["patient", manifest.patients], ["doctor", manifest.doctors]] as const) {
          for (const c of contacts) {
            const id = ownedId("contact", c.id)
            const current = await tx.contact.findUnique({ where: { id } })
            if (current && current.legalName !== c.nombre) fail("SOURCE_CONTACT_CONFLICT")
            await tx.contact.upsert({ where: { id }, update: {}, create: { id, legalName: c.nombre, isCompany: c.tipoPersona === "juridica", email: c.email ?? null, phone: c.telefono ?? null, documentNumber: c.dni ?? c.cuit ?? null, contactType: c.tipoContacto, notes: JSON.stringify({ task: TASK_ID, source: c }) } })
            await tx.contactCompanyLink.upsert({ where: { contactId_companyId: { contactId: id, companyId: COMPANY_ID } }, update: {}, create: { contactId: id, companyId: COMPANY_ID, code: `DSC-${c.id}`, role, roles: [role, c.tipoContacto], isPayer: role === "payer" ? true : null } })
          }
        }
        for (const [index, s] of manifest.surgeries.entries()) {
          const id = ownedId("surgery", s.id)
          const coordinator = staff[index < 8 ? 0 : 1]
          await tx.surgery.upsert({ where: { id }, update: {}, create: { id, companyId: COMPANY_ID, visibleNumber: s.visibleNumber, patientId: ownedId("contact", s.patientContactId), doctorId: ownedId("contact", s.doctorContactId), payerContactId: ownedId("contact", s.payerContactId), institutionId: s.institutionContactId ? ownedId("contact", s.institutionContactId) : null, classification: s.classification, description: s.description, cxStatus: validateCxStatus(s.cxStatus), surgeryDate: sourceDate(s.surgeryDate, s.surgeryTime), source: `${TASK_ID}:${hash}`, createdById: admin.id, notes: JSON.stringify({ training: true, source: s }) } })
          await tx.surgeryContactAssignment.upsert({ where: { surgeryId_contactId_role: { surgeryId: id, contactId: ownedId("coordinator", coordinator.alias), role: "coordinator" } }, update: {}, create: { surgeryId: id, contactId: ownedId("coordinator", coordinator.alias), role: "coordinator", isPrimary: true, notes: TASK_ID } })
          const budget = manifest.presupuestos.find(p => p.surgeryId === s.id)!
          const operator = staff[2 + index % 7]
          const notes = [
            { key: "source", authorId: admin.id, content: `[Entrenamiento] Datos importados del listado autorizado. Estado de fuente: ${s.cxStatus}. Importe presupuestado informado: ${budget.total} ARS. Precios unitarios e IVA no informados; no se generaron comprobantes comerciales.`, snapshot: { surgery: s, presupuesto: budget, facturacion: manifest.facturacion.find(f => f.surgeryId === s.id) } },
            { key: "coordination", authorId: ownedId("user", coordinator.alias), content: "[Entrenamiento] Caso asignado a coordinación. Revisar fecha y referencias de autorización de fuente; no se confirma un documento adjunto ni un despacho físico.", snapshot: { coordinator: coordinator.alias } },
            { key: "operation", authorId: ownedId("user", operator.alias), content: `[Entrenamiento] Interacción de ${operator.firstName}: revisar los datos disponibles del caso antes de continuar. Este comentario no acredita control físico, consumo, facturación ni movimientos de stock.`, snapshot: { role: operator.role } },
          ]
          for (const n of notes) await tx.seguimientoEntry.upsert({ where: { id: ownedId("note", `${s.id}:${n.key}`) }, update: {}, create: { id: ownedId("note", `${s.id}:${n.key}`), surgeryId: id, companyId: COMPANY_ID, authorId: n.authorId, entryType: "note", content: n.content, summary: "[Entrenamiento] Importación y familiarización", evidenceRef: JSON.parse(JSON.stringify({ task: TASK_ID, sourceHash: hash, training: true, ...n.snapshot })) as Prisma.InputJsonValue } })
        }
        await tx.auditEvent.upsert({ where: { id: ownedId("audit", hash) }, update: {}, create: { id: ownedId("audit", hash), companyId: COMPANY_ID, userId: admin.id, entityType: "Company", entityId: COMPANY_ID, action: "staff_ten_case_training_import", module: "DEV_TRAINING", metadata: { task: TASK_ID, sourceHash: hash, accounts: 9, surgeries: 10, sourceNotes: 30 } } })
      }, { timeout: 120000, maxWait: 15000 })
    }
    const users = await db.user.findMany({ where: { id: { in: staff.map(s => ownedId("user", s.alias)) } }, include: { companyAccess: { where: { companyId: COMPANY_ID } } } })
    if (users.length !== 9 || staff.some(s => !users.some(u => u.id === ownedId("user", s.alias) && u.isActive && u.supabaseAuthId === identities.find(a => a.email === s.email)?.id && u.companyAccess.some(a => a.isActive && a.role === s.role)))) fail("STAFF_POSTCONDITION_FAILED")
    const cases = await db.surgery.findMany({ where: { companyId: COMPANY_ID, id: { in: sourceCases } }, include: { contactAssignments: true } })
    if (cases.length !== 10 || cases.some(s => s.source !== `${TASK_ID}:${hash}`)) fail("CASE_POSTCONDITION_FAILED")
    const assignments = [0, 1].map(i => cases.filter(s => s.contactAssignments.some(a => a.role === "coordinator" && a.isPrimary && a.contactId === ownedId("coordinator", staff[i].alias))).length)
    if (assignments[0] !== 8 || assignments[1] !== 2) fail("ASSIGNMENT_POSTCONDITION_FAILED")
    const noteCount = await db.seguimientoEntry.count({ where: { companyId: COMPANY_ID, id: { in: manifest.surgeries.flatMap(s => ["source", "coordination", "operation"].map(k => ownedId("note", `${s.id}:${k}`))) } } })
    if (noteCount !== 30) fail("NOTE_POSTCONDITION_FAILED")
    const afterAdmin = await db.user.findUnique({ where: { id: admin.id }, include: { companyAccess: { where: { companyId: COMPANY_ID } } } })
    if (!afterAdmin || JSON.stringify(afterAdmin) !== JSON.stringify(admin)) fail("ADMIN_CHANGED")
    emit({ outcome: mode === "apply" ? "applied" : "verified", staff: users.length, sourceContacts: 23, surgeries: cases.length, assignments: { nelson: assignments[0], cristian: assignments[1] }, trainingNotes: noteCount, adminDevPreserved: true, sourceHash: hash, credentialPath, secretOutput: false })
  } finally { await db.$disconnect(); await pool.end() }
}

main().catch(error => { const message = error instanceof Error ? error.message : ""; const code = /^[A-Z_]+$/.test(message) ? message : /^P\d{4}$/.test(error?.code) ? error.code : "REDACTED_BOOTSTRAP_FAILURE"; emit({ outcome: "failed", code, recordsNotDeleted: true, credentialsRetainedForResume: true }); process.exitCode = 1 })
