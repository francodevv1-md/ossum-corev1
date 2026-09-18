import type { Prisma, PrismaClient } from "@prisma/client";
import {
  evaluateAvailabilityCapability,
  isAvailabilityCapability,
  type AvailabilityCapability,
  type AvailabilityCapabilityProvider,
} from "./availability-request";
type AvailabilityPrismaClient = PrismaClient | Prisma.TransactionClient;
type AvailabilityEnvironment = Readonly<Record<string, string | undefined>>;
export function availabilitySourceEnabledForCompany(
  companyId: string,
  env: AvailabilityEnvironment = process.env
): boolean {
  const configuredCompanyId = env.OSSUM_AVAILABILITY_DEV_COMPANY_ID;
  return (
    env.OSSUM_DEPLOYMENT_TIER === "development" &&
    env.OSSUM_ENABLE_AVAILABILITY_REQUESTS === "true" &&
    typeof configuredCompanyId === "string" &&
    configuredCompanyId.trim().length > 0 &&
    companyId.length > 0 &&
    companyId === configuredCompanyId
  );
}
export function createPrismaAvailabilityCapabilityProvider(
  client: AvailabilityPrismaClient
): AvailabilityCapabilityProvider {
  return {
    async findGrant(companyId, userId, capability) {
      if (!isAvailabilityCapability(capability)) return null;
      const grant = await client.availabilityCapabilityGrant.findFirst({
        where: {
          companyId,
          userId,
          capability,
          isActive: true,
          company: { isActive: true },
          userAccess: { isActive: true, user: { isActive: true } },
        },
        select: { companyId: true, userId: true, capability: true },
      });
      if (
        !grant ||
        grant.companyId !== companyId ||
        grant.userId !== userId ||
        grant.capability !== capability
      ) {
        return null;
      }
      return { companyId, userId, capability, active: true };
    },
  };
}
export async function hasAvailabilityCapabilityForCompany(
  client: AvailabilityPrismaClient,
  companyId: string,
  userId: string,
  capability: AvailabilityCapability,
  env: AvailabilityEnvironment = process.env
): Promise<boolean> {
  return evaluateAvailabilityCapability(
    {
      companyId,
      userId,
      capability,
      hasActiveCompanyAccess: true,
      sourceEnabled: availabilitySourceEnabledForCompany(companyId, env),
    },
    createPrismaAvailabilityCapabilityProvider(client)
  );
}
