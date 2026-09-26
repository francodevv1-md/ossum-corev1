export type PublicVerificationMetricResult = "valid" | "revoked" | "replaced"

export async function recordPublicVerificationMetric(
  prisma: {
    remitoVerificationDailyMetric: { upsert(input: unknown): Promise<unknown> }
  },
  input: { companyId: string; checkedAt: Date; result: PublicVerificationMetricResult },
): Promise<void> {
  const day = new Date(`${input.checkedAt.toISOString().slice(0, 10)}T00:00:00.000Z`)
  await prisma.remitoVerificationDailyMetric.upsert({
    where: { companyId_day_channel_result: {
      companyId: input.companyId, day, channel: "public_qr", result: input.result,
    } },
    create: { companyId: input.companyId, day, channel: "public_qr", result: input.result, count: 1 },
    update: { count: { increment: 1 } },
  })
}
