import { createHash } from "node:crypto"
import type { PrismaClient } from "@prisma/client"

export const WCB06_CONTRACT_IDS = ["ISW-CX07-01", "ISW-CX08-02", "ISW-CX06-01", "ISW-CX12-05"] as const
export const WCB06_ALLOWED_ROLES = ["admin", "operator"] as const

const STATIC = Object.freeze({
  schemaVersion: "C14-CX08-CCT1-AUTHORIZATION-PROOF-V1",
  policyId: "AZP-C14-COMPANY-CX08-CCT1",
  bundleId: "WCB-06",
  contractSetSha256: "4b838af8fc5c64add65d09b381114811d57f92c1f1600da2c412dd86f488baf9",
  bundleSetSha256: "206b1fb502083ddf1fdfa6329ccaa4e0af82751b7d6295f411ce24bfc50898b4",
  writerRegistrySha256: "52f8755d9bc2385f03dc0699c33e41f66e637e64adf6d8f5495d68ec6a4c2c47",
  scannerInputSha256: "69b3458e5d1390ef8ae87f32a0202465276c209b449cd1fc0a24e9f930493d4a",
})

const cj1 = (value: unknown): string => JSON.stringify(value, (_, item) =>
  item && typeof item === "object" && !Array.isArray(item)
    ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)))
    : item)
const hash = (domain: string, value: unknown) => createHash("sha256").update(domain).update("\0").update(cj1(value)).digest("hex")
const approvedProofs = new WeakSet<object>()

export class C14CompanyDeniedError extends Error {
  readonly code = "C14_COMPANY_DENIED"
  readonly httpStatus = 403
  readonly attemptCount = 0
}

export async function authorize(
  prisma: Pick<PrismaClient, "userCompanyAccess">,
  input: { actorId: string; companyId: string; bundleId: "WCB-06"; contractIds: readonly string[] },
) {
  if (!input.actorId || !input.companyId || input.bundleId !== "WCB-06"
    || input.contractIds.length !== WCB06_CONTRACT_IDS.length
    || input.contractIds.some((id, index) => id !== WCB06_CONTRACT_IDS[index])) throw new C14CompanyDeniedError("Company access denied")

  const membership = await prisma.userCompanyAccess.findFirst({
    where: { userId: input.actorId, companyId: input.companyId, isActive: true },
    select: { id: true, role: true, userId: true, companyId: true, isActive: true },
  })
  if (!membership || !(WCB06_ALLOWED_ROLES as readonly string[]).includes(membership.role)) {
    throw new C14CompanyDeniedError("Company access denied")
  }
  const permissionEvidenceSha256 = hash("C14-WCB06-PERMISSION-EVIDENCE-V1", membership)
  const core = Object.freeze({ ...STATIC, actorId: input.actorId, companyId: input.companyId,
    contractIds: [...WCB06_CONTRACT_IDS], decision: "ALLOW" as const, permissionEvidenceSha256 })
  const proof = Object.freeze({ ...core, authorizationProofSha256: hash(STATIC.schemaVersion, core) })
  approvedProofs.add(proof)
  return proof
}

export const isApprovedAuthorizationProof = (proof: unknown): proof is Readonly<Record<string, unknown>> =>
  typeof proof === "object" && proof !== null && approvedProofs.has(proof)
