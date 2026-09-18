import { config as loadEnv } from "dotenv"

import {
  EZEQUIEL_AUTH_INSPECTOR_TARGET,
  authIdentityMatchesTarget,
  evaluateEzequielInspectorProvenance,
  inspectEzequielAuthSnapshot,
  remoteReadFailureResult,
  type InspectorAuthIdentity,
} from "../../src/lib/services/coordination-ezequiel-auth-inspector.service"

loadEnv({ path: ".env.local", override: false, quiet: true })
loadEnv({ path: ".env", override: false, quiet: true })

function emit(result: ReturnType<typeof evaluateEzequielInspectorProvenance>): void {
  console.log(JSON.stringify(result))
}

function metadataText(metadata: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = metadata[key]
    if (typeof value === "string" && value.trim()) return value
  }
  return null
}

async function main(): Promise<void> {
  const provenance = evaluateEzequielInspectorProvenance({
    OSSUM_DEPLOYMENT_TIER: process.env.OSSUM_DEPLOYMENT_TIER,
    OSSUM_ENABLE_COORDINATOR_PREVIEW: process.env.OSSUM_ENABLE_COORDINATOR_PREVIEW,
    OSSUM_COORDINATION_DEV_PREVIEW_COMPANY_ID: process.env.OSSUM_COORDINATION_DEV_PREVIEW_COMPANY_ID,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    DATABASE_URL: process.env.DATABASE_URL,
  })
  if (provenance.provenanceGate !== "PASS") {
    emit(provenance)
    process.exitCode = 2
    return
  }

  let prisma: import("@prisma/client").PrismaClient | null = null
  let pool: import("pg").Pool | null = null
  try {
    const [{ createClient }, { PrismaPg }, { PrismaClient }, { Pool }] = await Promise.all([
      import("@supabase/supabase-js"),
      import("@prisma/adapter-pg"),
      import("@prisma/client"),
      import("pg"),
    ])
    const companyId = process.env.OSSUM_COORDINATION_DEV_PREVIEW_COMPANY_ID!
    const supabaseUrl = process.env.SUPABASE_URL!.replace(/\/rest\/v1\/?$/, "")
    const supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    })
    pool = new Pool({ connectionString: process.env.DATABASE_URL! })
    prisma = new PrismaClient({ adapter: new PrismaPg(pool) })
    const db = prisma as InstanceType<typeof PrismaClient>

    const internalUsers = await db.user.findMany({
      where: { firstName: "Ezequiel", lastName: "DEV" },
      select: {
        id: true,
        supabaseAuthId: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        companyAccess: {
          where: { companyId },
          select: { companyId: true, role: true, isActive: true },
        },
      },
    })
    const internalEmails = internalUsers.map((user) => user.email)
    const authIdentities: InspectorAuthIdentity[] = []
    for (let page = 1; page <= 100; page += 1) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
      if (error) throw new Error("AUTH_READ_FAILED")
      for (const user of data.users) {
        const metadata = (user.user_metadata ?? {}) as Record<string, unknown>
        const identity: InspectorAuthIdentity = {
          id: user.id,
          email: user.email ?? null,
          firstName: metadataText(metadata, ["first_name", "firstName"]),
          lastName: metadataText(metadata, ["last_name", "lastName"]),
          displayName: metadataText(metadata, ["full_name", "name"]),
        }
        if (authIdentityMatchesTarget(identity, internalEmails)) authIdentities.push(identity)
      }
      if (data.users.length < 1000) break
      if (page === 100) throw new Error("AUTH_PAGE_LIMIT")
    }

    const company = await db.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        isActive: true,
        organization: { select: { slug: true, isActive: true } },
      },
    })
    const exactContacts = await db.contact.findMany({
      where: { legalName: EZEQUIEL_AUTH_INSPECTOR_TARGET },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        legalName: true,
        isCompany: true,
        isActive: true,
        companyLinks: {
          select: { companyId: true, role: true, isActive: true },
        },
      },
    })
    const eligibleCoordinatorContacts = await db.contact.findMany({
      where: {
        isActive: true,
        isCompany: false,
        companyLinks: {
          some: { companyId, isActive: true, role: "coordinator", company: { isActive: true } },
        },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        legalName: true,
        isCompany: true,
        isActive: true,
        companyLinks: {
          where: { companyId },
          select: { companyId: true, role: true, isActive: true },
        },
      },
    })
    const activeSurgeryIds = (await db.surgery.findMany({
      where: { companyId, archivedAt: null },
      select: { id: true },
      orderBy: { id: "asc" },
    })).map((surgery) => surgery.id)
    const exactContactIds = exactContacts.map((contact) => contact.id)
    const assignments = exactContactIds.length === 0
      ? []
      : await db.surgeryContactAssignment.findMany({
        where: {
          contactId: { in: exactContactIds },
          role: "coordinator",
          surgery: { companyId, archivedAt: null },
        },
        select: { surgeryId: true, contactId: true, role: true },
      })

    const result = inspectEzequielAuthSnapshot({
      configuredCompanyId: companyId,
      company,
      authIdentities,
      internalUsers,
      exactContacts,
      eligibleCoordinatorContacts,
      activeSurgeryIds,
      assignments,
    })
    emit(result)
    if (result.decision !== "GO") process.exitCode = 2
  } catch {
    emit(remoteReadFailureResult())
    process.exitCode = 1
  } finally {
    if (prisma) await prisma.$disconnect().catch(() => undefined)
    if (pool) await pool.end().catch(() => undefined)
  }
}

void main()
