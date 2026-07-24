import { notFound } from "@/lib/api/errors"
import prisma from "@/lib/prisma"

export type ResolvedCompanySurgery = {
  id: string
  visibleNumber: string | null
}

/**
 * Resolves a surgery reference scoped to a company.
 * Accepts either the persisted Prisma `id` or the human-readable `visibleNumber`.
 */
export async function resolveCompanySurgery(
  companyId: string,
  surgeryIdOrVisibleNumber: string
): Promise<ResolvedCompanySurgery> {
  const surgery = await prisma.surgery.findFirst({
    where: {
      companyId,
      OR: [
        { id: surgeryIdOrVisibleNumber },
        { visibleNumber: surgeryIdOrVisibleNumber },
      ],
    },
    select: {
      id: true,
      visibleNumber: true,
    },
  })

  if (!surgery) {
    throw notFound("Surgery not found", "surgery_not_found")
  }

  return surgery
}
