import { randomBytes } from "node:crypto"
import { execFile as execFileCallback } from "node:child_process"
import { open, rm, stat } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { promisify } from "node:util"

import type { Prisma, PrismaClient } from "@prisma/client"
import { config as loadEnv } from "dotenv"

import {
  EZEQUIEL_AUTH_INSPECTOR_TARGET,
  authIdentityMatchesTarget,
  evaluateEzequielInspectorProvenance,
  type InspectorAuthIdentity,
  type InspectorSnapshot,
} from "../../src/lib/services/coordination-ezequiel-auth-inspector.service"
import {
  EZEQUIEL_DEV_AUTH_EMAIL,
  EZEQUIEL_DEV_AUTH_FIRST_NAME,
  EZEQUIEL_DEV_AUTH_LAST_NAME,
  EZEQUIEL_DEV_AUTH_ROLE,
  classifyEzequielProvisioningState,
  provisionEzequielDevAuth,
  redactedProvisioningFailure,
} from "../../src/lib/services/coordination-ezequiel-auth-provisioning.service"

loadEnv({ path: ".env.local", override: false, quiet: true })
loadEnv({ path: ".env", override: false, quiet: true })

const execFile = promisify(execFileCallback)
const CREDENTIAL_PATH = "C:\\Users\\franc\\AppData\\Local\\Temp\\opencode\\ossum-ezequiel-dev-credentials.txt"
const CREDENTIAL_PARENT = "C:\\Users\\franc\\AppData\\Local\\Temp\\opencode"

type DatabaseClient = PrismaClient | Prisma.TransactionClient

type AuthAdmin = {
  listUsers: (input: { page: number; perPage: number }) => Promise<{
    data: { users: Array<{
      id: string
      email?: string
      user_metadata?: Record<string, unknown>
    }> }
    error: unknown
  }>
  createUser: (input: {
    email: string
    password: string
    email_confirm: boolean
    user_metadata: Record<string, string>
  }) => Promise<{ data: { user: { id: string } | null }; error: unknown }>
  deleteUser: (id: string) => Promise<{ error: unknown }>
}

function emit(value: unknown): void {
  console.log(JSON.stringify(value))
}

function metadataText(metadata: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = metadata[key]
    if (typeof value === "string" && value.trim()) return value
  }
  return null
}

async function listTargetAuthIdentities(auth: AuthAdmin): Promise<InspectorAuthIdentity[]> {
  const matches: InspectorAuthIdentity[] = []
  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await auth.listUsers({ page, perPage: 1000 })
    if (error) throw new Error("AUTH_READ_FAILED")
    for (const user of data.users) {
      const metadata = user.user_metadata ?? {}
      const identity: InspectorAuthIdentity = {
        id: user.id,
        email: user.email ?? null,
        firstName: metadataText(metadata, ["first_name", "firstName"]),
        lastName: metadataText(metadata, ["last_name", "lastName"]),
        displayName: metadataText(metadata, ["full_name", "name"]),
      }
      if (
        authIdentityMatchesTarget(identity, [EZEQUIEL_DEV_AUTH_EMAIL]) ||
        identity.email?.normalize("NFKC").trim().toLowerCase() === EZEQUIEL_DEV_AUTH_EMAIL
      ) {
        matches.push(identity)
      }
    }
    if (data.users.length < 1000) return matches
  }
  throw new Error("AUTH_PAGE_LIMIT")
}

async function readDbSnapshot(
  db: DatabaseClient,
  companyId: string,
  authIdentities: InspectorAuthIdentity[]
): Promise<InspectorSnapshot> {
  const [company, internalUsers, exactContacts, eligibleCoordinatorContacts, activeSurgeries] = await Promise.all([
    db.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        isActive: true,
        organization: { select: { slug: true, isActive: true } },
      },
    }),
    db.user.findMany({
      where: {
        OR: [
          { email: { equals: EZEQUIEL_DEV_AUTH_EMAIL, mode: "insensitive" } },
          { firstName: EZEQUIEL_DEV_AUTH_FIRST_NAME, lastName: EZEQUIEL_DEV_AUTH_LAST_NAME },
        ],
      },
      select: {
        id: true,
        supabaseAuthId: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        companyAccess: {
          select: { companyId: true, role: true, isActive: true },
        },
      },
    }),
    db.contact.findMany({
      where: { legalName: EZEQUIEL_AUTH_INSPECTOR_TARGET },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        legalName: true,
        isCompany: true,
        isActive: true,
        companyLinks: { select: { companyId: true, role: true, isActive: true } },
      },
    }),
    db.contact.findMany({
      where: {
        isActive: true,
        isCompany: false,
        companyLinks: {
          some: { companyId, isActive: true, role: EZEQUIEL_DEV_AUTH_ROLE, company: { isActive: true } },
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
    }),
    db.surgery.findMany({
      where: { companyId, archivedAt: null },
      select: { id: true },
      orderBy: { id: "asc" },
    }),
  ])

  const exactContactIds = exactContacts.map((contact) => contact.id)
  const assignments = exactContactIds.length === 0
    ? []
    : await db.surgeryContactAssignment.findMany({
      where: {
        contactId: { in: exactContactIds },
        role: EZEQUIEL_DEV_AUTH_ROLE,
        surgery: { companyId, archivedAt: null },
      },
      select: { surgeryId: true, contactId: true, role: true },
    })

  return {
    configuredCompanyId: companyId,
    company,
    authIdentities,
    internalUsers,
    exactContacts,
    eligibleCoordinatorContacts,
    activeSurgeryIds: activeSurgeries.map((surgery) => surgery.id),
    assignments,
  }
}

const hardenAclScript = String.raw`
$ErrorActionPreference = 'Stop'
$path = $env:OSSUM_CREDENTIAL_ACL_PATH
$identity = [System.Security.Principal.WindowsIdentity]::GetCurrent()
$sid = $identity.User
$acl = Get-Acl -LiteralPath $path
$acl.SetAccessRuleProtection($true, $false)
foreach ($existing in @($acl.Access)) { [void]$acl.RemoveAccessRuleSpecific($existing) }
$rule = New-Object System.Security.AccessControl.FileSystemAccessRule(
  $sid,
  [System.Security.AccessControl.FileSystemRights]::FullControl,
  [System.Security.AccessControl.InheritanceFlags]::None,
  [System.Security.AccessControl.PropagationFlags]::None,
  [System.Security.AccessControl.AccessControlType]::Allow
)
[void]$acl.AddAccessRule($rule)
Set-Acl -LiteralPath $path -AclObject $acl
`

const verifyAclScript = String.raw`
$ErrorActionPreference = 'Stop'
$path = $env:OSSUM_CREDENTIAL_ACL_PATH
$sid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value
$acl = Get-Acl -LiteralPath $path
$rules = @($acl.Access)
$valid = $acl.AreAccessRulesProtected -and $rules.Count -eq 1
if ($valid) {
  $rule = $rules[0]
  $ruleSid = $rule.IdentityReference.Translate([System.Security.Principal.SecurityIdentifier]).Value
  $valid = $ruleSid -eq $sid -and
    $rule.AccessControlType -eq [System.Security.AccessControl.AccessControlType]::Allow -and
    -not $rule.IsInherited -and
    (($rule.FileSystemRights -band [System.Security.AccessControl.FileSystemRights]::FullControl) -eq
      [System.Security.AccessControl.FileSystemRights]::FullControl)
}
if (-not $valid) { exit 41 }
'PASS'
`

async function verifyCredentialAcl(): Promise<void> {
  const result = await execFile("powershell.exe", [
    "-NoProfile",
    "-NonInteractive",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    verifyAclScript,
  ], {
    windowsHide: true,
    env: { ...process.env, OSSUM_CREDENTIAL_ACL_PATH: CREDENTIAL_PATH },
  })
  if (result.stdout.trim() !== "PASS") throw new Error("ACL_NOT_PROVEN")
}

async function prepareCredentialFile(password: string): Promise<{ cleanup: () => Promise<void> }> {
  if (resolve(dirname(CREDENTIAL_PATH)) !== resolve(CREDENTIAL_PARENT)) throw new Error("CREDENTIAL_PATH_REJECTED")
  const parent = await stat(CREDENTIAL_PARENT)
  if (!parent.isDirectory()) throw new Error("CREDENTIAL_PARENT_REJECTED")

  const placeholder = await open(CREDENTIAL_PATH, "wx", 0o600)
  await placeholder.close()
  const cleanup = async () => { await rm(CREDENTIAL_PATH, { force: true }) }
  try {
    await execFile("powershell.exe", [
      "-NoProfile",
      "-NonInteractive",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      hardenAclScript,
    ], {
      windowsHide: true,
      env: { ...process.env, OSSUM_CREDENTIAL_ACL_PATH: CREDENTIAL_PATH },
    })
    await verifyCredentialAcl()

    const credential = await open(CREDENTIAL_PATH, "r+")
    try {
      await credential.truncate(0)
      await credential.writeFile([
        `Email: ${EZEQUIEL_DEV_AUTH_EMAIL}`,
        `Temporary password: ${password}`,
        "Delete this file immediately after the first successful login and password change.",
        "Synthetic DEV identity only. Do not reuse this credential.",
        "",
      ].join("\r\n"), { encoding: "utf8" })
      await credential.sync()
    } finally {
      await credential.close()
    }
    await verifyCredentialAcl()
    return { cleanup }
  } catch (error) {
    await cleanup().catch(() => undefined)
    throw error
  }
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

  let prisma: PrismaClient | null = null
  let pool: import("pg").Pool | null = null
  try {
    const [{ createClient }, { PrismaPg }, { PrismaClient: RuntimePrismaClient }, { Pool }] = await Promise.all([
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
    const auth = supabase.auth.admin as unknown as AuthAdmin
    pool = new Pool({ connectionString: process.env.DATABASE_URL! })
    prisma = new RuntimePrismaClient({ adapter: new PrismaPg(pool) })

    const authIdentities = await listTargetAuthIdentities(auth)
    const initialSnapshot = await readDbSnapshot(prisma, companyId, authIdentities)

    const result = await provisionEzequielDevAuth(initialSnapshot, {
      generateTemporaryPassword: () => `Aa1!${randomBytes(32).toString("base64url")}`,
      prepareCredential: prepareCredentialFile,
      createAuthIdentity: async (input) => {
        const { data, error } = await auth.createUser({
          email: input.email,
          password: input.password,
          email_confirm: input.emailConfirmed,
          user_metadata: input.metadata,
        })
        if (error || !data.user) throw new Error("AUTH_CREATE_FAILED")
        return { id: data.user.id }
      },
      createInternalLink: async (authId) => {
        const authIdentity: InspectorAuthIdentity = {
          id: authId,
          email: EZEQUIEL_DEV_AUTH_EMAIL,
          firstName: EZEQUIEL_DEV_AUTH_FIRST_NAME,
          lastName: EZEQUIEL_DEV_AUTH_LAST_NAME,
          displayName: EZEQUIEL_AUTH_INSPECTOR_TARGET,
        }
        await prisma!.$transaction(async (tx) => {
          classifyEzequielProvisioningState(await readDbSnapshot(tx, companyId, []))
          const user = await tx.user.create({
            data: {
              supabaseAuthId: authId,
              email: EZEQUIEL_DEV_AUTH_EMAIL,
              firstName: EZEQUIEL_DEV_AUTH_FIRST_NAME,
              lastName: EZEQUIEL_DEV_AUTH_LAST_NAME,
              isActive: true,
            },
            select: { id: true },
          })
          await tx.userCompanyAccess.create({
            data: {
              userId: user.id,
              companyId,
              role: EZEQUIEL_DEV_AUTH_ROLE,
              isActive: true,
            },
          })
          if (classifyEzequielProvisioningState(
            await readDbSnapshot(tx, companyId, [authIdentity])
          ) !== "provisioned") {
            throw new Error("POSTCONDITION_REJECTED")
          }
        }, { isolationLevel: "Serializable" })
      },
      deleteAuthIdentity: async (authId) => {
        const { error } = await auth.deleteUser(authId)
        if (error) throw new Error("AUTH_COMPENSATION_FAILED")
      },
    })

    emit({
      ...result,
      provenanceGate: "PASS",
      credentialAcl: result.outcome === "created" ? "HARDENED" : "UNCHANGED",
      secretOutput: false,
    })
  } catch (error) {
    emit(redactedProvisioningFailure(error))
    process.exitCode = 1
  } finally {
    if (prisma) await prisma.$disconnect().catch(() => undefined)
    if (pool) await pool.end().catch(() => undefined)
  }
}

void main()
