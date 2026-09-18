import { describe, expect, it, vi } from "vitest";

import {
  AVAILABILITY_CAPABILITIES,
  EMPTY_AVAILABILITY_CAPABILITY_PROVIDER,
  evaluateAvailabilityCapability,
  hasAvailabilityCapability,
  type AvailabilityCapabilityGrant,
  type AvailabilityCapabilityProvider,
} from "@/lib/permissions/availability-request";
import {
  availabilitySourceEnabledForCompany,
  hasAvailabilityCapabilityForCompany,
} from "@/lib/permissions/availability-request.server";

const input = {
  companyId: "company-1",
  userId: "user-1",
  capability: "availability.request.create" as const,
  hasActiveCompanyAccess: true,
  sourceEnabled: true,
};
const enabledEnv = {
  OSSUM_DEPLOYMENT_TIER: "development",
  OSSUM_ENABLE_AVAILABILITY_REQUESTS: "true",
  OSSUM_AVAILABILITY_DEV_COMPANY_ID: "company-1",
};

function providerWith(
  grant: AvailabilityCapabilityGrant | null
): AvailabilityCapabilityProvider {
  return { findGrant: vi.fn().mockResolvedValue(grant) };
}

describe("availability request permissions", () => {
  it("preserves exact names and keeps synchronous compatibility hard-denied", async () => {
    expect(AVAILABILITY_CAPABILITIES).toEqual([
      "availability.request.create",
      "availability.request.read",
      "availability.date.correct",
      "availability.pivot.configure",
    ]);
    await expect(
      EMPTY_AVAILABILITY_CAPABILITY_PROVIDER.findGrant(
        input.companyId,
        input.userId,
        input.capability
      )
    ).resolves.toBeNull();
    expect(hasAvailabilityCapability(input.capability)).toBe(false);
    expect(hasAvailabilityCapability(input.companyId, input.userId, input.capability)).toBe(false);
  });

  it("allows only one exact active pure-provider grant", async () => {
    await expect(
      evaluateAvailabilityCapability(input, providerWith({ ...input, active: true }))
    ).resolves.toBe(true);
    for (const grant of [
      { ...input, active: false },
      { ...input, companyId: "company-2", active: true },
      { ...input, userId: "user-2", active: true },
      { ...input, capability: "availability.request.read" as const, active: true },
    ]) {
      await expect(evaluateAvailabilityCapability(input, providerWith(grant))).resolves.toBe(false);
    }
    await expect(
      evaluateAvailabilityCapability({ ...input, capability: "unknown" as never }, providerWith(null))
    ).resolves.toBe(false);
  });

  it("denies disabled access, broad-role-only input, and provider exceptions", async () => {
    const roleOnly = { ...input, hasActiveCompanyAccess: false, role: "admin" };
    const throwing: AvailabilityCapabilityProvider = {
      findGrant: vi.fn().mockRejectedValue(new Error("provider failed")),
    };
    await expect(
      evaluateAvailabilityCapability({ ...input, sourceEnabled: false }, providerWith({ ...input, active: true }))
    ).resolves.toBe(false);
    await expect(
      evaluateAvailabilityCapability(
        roleOnly,
        providerWith({ ...input, active: true })
      )
    ).resolves.toBe(false);
    await expect(evaluateAvailabilityCapability(input, throwing)).resolves.toBe(false);
  });

  it("enables only the exact development toggle and company", () => {
    expect(availabilitySourceEnabledForCompany("company-1", enabledEnv)).toBe(true);
    for (const env of [
      {},
      { ...enabledEnv, OSSUM_DEPLOYMENT_TIER: "production" },
      { ...enabledEnv, OSSUM_DEPLOYMENT_TIER: "Development" },
      { ...enabledEnv, OSSUM_ENABLE_AVAILABILITY_REQUESTS: "TRUE" },
      { ...enabledEnv, OSSUM_AVAILABILITY_DEV_COMPANY_ID: " " },
    ]) {
      expect(availabilitySourceEnabledForCompany("company-1", env)).toBe(false);
    }
    expect(availabilitySourceEnabledForCompany("company-2", enabledEnv)).toBe(false);
  });

  it("revalidates the persisted active grant and denies null or provider failure", async () => {
    const findFirst = vi.fn().mockResolvedValue({ ...input });
    const client = { availabilityCapabilityGrant: { findFirst } } as never;
    await expect(
      hasAvailabilityCapabilityForCompany(client, input.companyId, input.userId, input.capability, enabledEnv)
    ).resolves.toBe(true);
    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        companyId: input.companyId,
        userId: input.userId,
        capability: input.capability,
        isActive: true,
        company: { isActive: true },
        userAccess: { isActive: true, user: { isActive: true } },
      }),
    }));
    findFirst.mockResolvedValueOnce(null).mockRejectedValueOnce(new Error("db unavailable"));
    await expect(
      hasAvailabilityCapabilityForCompany(client, input.companyId, input.userId, input.capability, enabledEnv)
    ).resolves.toBe(false);
    await expect(
      hasAvailabilityCapabilityForCompany(client, input.companyId, input.userId, input.capability, enabledEnv)
    ).resolves.toBe(false);
  });
});
