import type { PrismaClient } from "@prisma/client"
import type { MentionLookupUser } from "@/lib/mentions/types"

function normalizeDisplayName(firstName: string, lastName: string, email: string) {
  const displayName = `${firstName} ${lastName}`.trim()
  return displayName || email
}

export async function searchMentionableUsers(
  prisma: PrismaClient,
  companyId: string,
  query: string,
  take = 8
): Promise<MentionLookupUser[]> {
  const normalizedQuery = query.trim()
  const cappedTake = Math.min(Math.max(take, 1), 10)

  const accesses = await prisma.userCompanyAccess.findMany({
    where: {
      companyId,
      isActive: true,
      user: {
        isActive: true,
        ...(normalizedQuery
          ? {
              OR: [
                { firstName: { contains: normalizedQuery, mode: "insensitive" } },
                { lastName: { contains: normalizedQuery, mode: "insensitive" } },
                { email: { contains: normalizedQuery, mode: "insensitive" } },
              ],
            }
          : {}),
      },
    },
    select: {
      role: true,
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
    take: Math.max(cappedTake * 2, cappedTake),
  })

  return accesses
    .map(({ role, user }) => ({
      userId: user.id,
      displayName: normalizeDisplayName(user.firstName, user.lastName, user.email),
      companyId,
      email: user.email,
      role,
    }))
    .sort((left, right) => left.displayName.localeCompare(right.displayName, "es"))
    .slice(0, cappedTake)
}
