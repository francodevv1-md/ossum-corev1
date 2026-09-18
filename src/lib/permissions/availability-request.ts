export const AVAILABILITY_CAPABILITIES = [
  "availability.request.create",
  "availability.request.read",
  "availability.date.correct",
  "availability.pivot.configure",
] as const;

export type AvailabilityCapability = (typeof AVAILABILITY_CAPABILITIES)[number];

export type AvailabilityCapabilityGrant = {
  companyId: string;
  userId: string;
  capability: AvailabilityCapability;
  active: boolean;
};

export interface AvailabilityCapabilityProvider {
  findGrant(
    companyId: string,
    userId: string,
    capability: AvailabilityCapability
  ): Promise<AvailabilityCapabilityGrant | null>;
}

export const EMPTY_AVAILABILITY_CAPABILITY_PROVIDER: AvailabilityCapabilityProvider = {
  findGrant: async () => null,
};

export type AvailabilityCapabilityEvaluation = {
  companyId: string;
  userId: string;
  capability: AvailabilityCapability;
  hasActiveCompanyAccess: boolean;
  sourceEnabled: boolean;
};

export function isAvailabilityCapability(
  value: unknown
): value is AvailabilityCapability {
  return AVAILABILITY_CAPABILITIES.includes(value as AvailabilityCapability);
}

export async function evaluateAvailabilityCapability(
  input: AvailabilityCapabilityEvaluation,
  provider: AvailabilityCapabilityProvider = EMPTY_AVAILABILITY_CAPABILITY_PROVIDER
): Promise<boolean> {
  if (
    !input.sourceEnabled ||
    !input.hasActiveCompanyAccess ||
    !isAvailabilityCapability(input.capability) ||
    input.companyId.trim().length === 0 ||
    input.userId.trim().length === 0
  ) {
    return false;
  }

  try {
    const grant = await provider.findGrant(
      input.companyId,
      input.userId,
      input.capability
    );

    return Boolean(
      grant?.active &&
        grant.companyId === input.companyId &&
        grant.userId === input.userId &&
        grant.capability === input.capability
    );
  } catch {
    return false;
  }
}

/** @deprecated Temporary WU3 compatibility wrapper. Always denies. */
export function hasAvailabilityCapability(
  capability: AvailabilityCapability
): false;
export function hasAvailabilityCapability(
  companyId: string,
  userId: string,
  capability: AvailabilityCapability
): boolean;
export function hasAvailabilityCapability(
  companyIdOrCapability: string,
  userId?: string,
  capability?: AvailabilityCapability
): boolean {
  void companyIdOrCapability;
  void userId;
  void capability;
  return false;
}
