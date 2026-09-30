import type { PrismaClient } from "@prisma/client";
import { badRequest, conflict, forbidden, notFound } from "../api/errors";
import { createAuditEvent } from "../audit";
import {
  type CanonicalRole,
  assertCanonicalRole,
  resolveCanonicalRole,
} from "../permissions/canonical-roles";
import { isRoleAdmin } from "../permissions/capabilities";

export type MembershipDbClient = Pick<
  PrismaClient,
  "user" | "userCompanyAccess" | "auditEvent"
>;

export interface ManagedMembershipItem {
  id: string;
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  name: string;
  phone: string | null;
  role: string;
  canonicalRole: CanonicalRole;
  isActive: boolean;
  userIsActive: boolean;
  createdAt: string;
  updatedAt: string;
  isSelf: boolean;
  isLastAdmin: boolean;
}

export interface CreateMembershipInput {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  phone?: string | null;
}

export interface UpdateMembershipInput {
  role?: string;
  isActive?: boolean;
  firstName?: string;
  lastName?: string;
  phone?: string | null;
}

function buildFullName(firstName: string | null, lastName: string | null, email: string): string {
  const parts = [firstName?.trim(), lastName?.trim()].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : email.split("@")[0];
}

/**
 * Counts the active administrators in a specific company.
 */
async function countActiveAdmins(prisma: MembershipDbClient, companyId: string): Promise<number> {
  const accesses = await prisma.userCompanyAccess.findMany({
    where: {
      companyId,
      isActive: true,
      user: { isActive: true },
    },
    select: { role: true },
  });

  return accesses.filter((a) => resolveCanonicalRole(a.role) === "admin").length;
}

/**
 * List all company memberships.
 * If actor is admin, returns all company memberships.
 * If actor is not admin, returns only the actor's own membership.
 */
export async function listCompanyMemberships(
  prisma: MembershipDbClient,
  companyId: string,
  actorUserId: string,
  isActorAdmin: boolean
): Promise<{ items: ManagedMembershipItem[]; totalAdmins: number }> {
  const whereClause = isActorAdmin
    ? { companyId }
    : { companyId, userId: actorUserId };

  const [accesses, activeAdminsCount] = await Promise.all([
    prisma.userCompanyAccess.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            isActive: true,
          },
        },
      },
      orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
    }),
    countActiveAdmins(prisma, companyId),
  ]);

  const items: ManagedMembershipItem[] = accesses.map((acc) => {
    const canonicalRole = resolveCanonicalRole(acc.role) ?? "viewer";
    const isThisAdmin = canonicalRole === "admin" && acc.isActive && acc.user.isActive;

    return {
      id: acc.id,
      userId: acc.userId,
      email: acc.user.email,
      firstName: acc.user.firstName,
      lastName: acc.user.lastName,
      name: buildFullName(acc.user.firstName, acc.user.lastName, acc.user.email),
      phone: acc.user.phone,
      role: acc.role,
      canonicalRole,
      isActive: acc.isActive,
      userIsActive: acc.user.isActive,
      createdAt: acc.createdAt.toISOString(),
      updatedAt: acc.updatedAt.toISOString(),
      isSelf: acc.userId === actorUserId,
      isLastAdmin: isThisAdmin && activeAdminsCount <= 1,
    };
  });

  return { items, totalAdmins: activeAdminsCount };
}

/**
 * Create or link a user membership to the company.
 * Only administrators can invoke this.
 */
export async function createCompanyMembership(
  prisma: MembershipDbClient,
  companyId: string,
  actorUserId: string,
  input: CreateMembershipInput
): Promise<ManagedMembershipItem> {
  const canonicalRole = assertCanonicalRole(input.role);
  const normalizedEmail = input.email.trim().toLowerCase();

  // Find or create user
  let user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        phone: input.phone?.trim() || null,
        isActive: true,
      },
    });
  }

  // Check if membership already exists
  const existingAccess = await prisma.userCompanyAccess.findUnique({
    where: {
      userId_companyId: {
        userId: user.id,
        companyId,
      },
    },
  });

  if (existingAccess) {
    if (existingAccess.isActive) {
      throw conflict(
        `El usuario ${normalizedEmail} ya posee una membresía activa en esta empresa.`,
        "membership_already_exists"
      );
    }

    // Reactivate and update role
    const updated = await prisma.userCompanyAccess.update({
      where: { id: existingAccess.id },
      data: {
        role: canonicalRole,
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            isActive: true,
          },
        },
      },
    });

    await createAuditEvent({
      prisma: prisma as any,
      companyId,
      userId: actorUserId,
      action: "MEMBERSHIP_REACTIVATED",
      module: "USERS_ROLES",
      entityType: "UserCompanyAccess",
      entityId: updated.id,
      metadata: {
        targetUserId: user.id,
        targetEmail: user.email,
        assignedRole: canonicalRole,
      },
    });

    const activeAdminsCount = await countActiveAdmins(prisma, companyId);
    return {
      id: updated.id,
      userId: updated.userId,
      email: updated.user.email,
      firstName: updated.user.firstName,
      lastName: updated.user.lastName,
      name: buildFullName(updated.user.firstName, updated.user.lastName, updated.user.email),
      phone: updated.user.phone,
      role: updated.role,
      canonicalRole,
      isActive: updated.isActive,
      userIsActive: updated.user.isActive,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      isSelf: updated.userId === actorUserId,
      isLastAdmin: canonicalRole === "admin" && activeAdminsCount <= 1,
    };
  }

  // Create new membership
  const created = await prisma.userCompanyAccess.create({
    data: {
      userId: user.id,
      companyId,
      role: canonicalRole,
      isActive: true,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          isActive: true,
        },
      },
    },
  });

  await createAuditEvent({
    prisma: prisma as any,
    companyId,
    userId: actorUserId,
    action: "MEMBERSHIP_CREATED",
    module: "USERS_ROLES",
    entityType: "UserCompanyAccess",
    entityId: created.id,
    metadata: {
      targetUserId: user.id,
      targetEmail: user.email,
      assignedRole: canonicalRole,
    },
  });

  const activeAdminsCount = await countActiveAdmins(prisma, companyId);
  return {
    id: created.id,
    userId: created.userId,
    email: created.user.email,
    firstName: created.user.firstName,
    lastName: created.user.lastName,
    name: buildFullName(created.user.firstName, created.user.lastName, created.user.email),
    phone: created.user.phone,
    role: created.role,
    canonicalRole,
    isActive: created.isActive,
    userIsActive: created.user.isActive,
    createdAt: created.createdAt.toISOString(),
    updatedAt: created.updatedAt.toISOString(),
    isSelf: created.userId === actorUserId,
    isLastAdmin: canonicalRole === "admin" && activeAdminsCount <= 1,
  };
}

/**
 * Update a membership role, active status, or user personal details.
 * Prevents deactivating or demoting the last active admin of the company.
 */
export async function updateCompanyMembership(
  prisma: MembershipDbClient,
  companyId: string,
  actorUserId: string,
  membershipId: string,
  input: UpdateMembershipInput
): Promise<ManagedMembershipItem> {
  const access = await prisma.userCompanyAccess.findFirst({
    where: { id: membershipId, companyId },
    include: { user: true },
  });

  if (!access) {
    throw notFound("Membresía no encontrada en esta empresa", "membership_not_found");
  }

  const currentCanonicalRole = resolveCanonicalRole(access.role) ?? "viewer";
  const isCurrentActiveAdmin = currentCanonicalRole === "admin" && access.isActive && access.user.isActive;

  let newCanonicalRole: CanonicalRole | undefined;
  if (input.role !== undefined) {
    newCanonicalRole = assertCanonicalRole(input.role);
  }

  // Admin protection check
  if (isCurrentActiveAdmin) {
    const isDemoting = newCanonicalRole !== undefined && newCanonicalRole !== "admin";
    const isDeactivating = input.isActive === false;

    if (isDemoting || isDeactivating) {
      const activeAdmins = await countActiveAdmins(prisma, companyId);
      if (activeAdmins <= 1) {
        throw badRequest(
          "No es posible degradar ni desactivar al único Administrador activo de la empresa.",
          "last_admin_protected"
        );
      }
    }
  }

  // Update User attributes if supplied
  if (input.firstName !== undefined || input.lastName !== undefined || input.phone !== undefined) {
    await prisma.user.update({
      where: { id: access.userId },
      data: {
        ...(input.firstName !== undefined ? { firstName: input.firstName.trim() } : {}),
        ...(input.lastName !== undefined ? { lastName: input.lastName.trim() } : {}),
        ...(input.phone !== undefined ? { phone: input.phone?.trim() || null } : {}),
      },
    });
  }

  // Update access
  const updated = await prisma.userCompanyAccess.update({
    where: { id: membershipId },
    data: {
      ...(newCanonicalRole !== undefined ? { role: newCanonicalRole } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          isActive: true,
        },
      },
    },
  });

  await createAuditEvent({
    prisma: prisma as any,
    companyId,
    userId: actorUserId,
    action: "MEMBERSHIP_UPDATED",
    module: "USERS_ROLES",
    entityType: "UserCompanyAccess",
    entityId: updated.id,
    metadata: {
      previousRole: access.role,
      newRole: updated.role,
      previousStatus: access.isActive,
      newStatus: updated.isActive,
    },
  });

  const finalCanonicalRole = resolveCanonicalRole(updated.role) ?? "viewer";
  const activeAdminsCount = await countActiveAdmins(prisma, companyId);

  return {
    id: updated.id,
    userId: updated.userId,
    email: updated.user.email,
    firstName: updated.user.firstName,
    lastName: updated.user.lastName,
    name: buildFullName(updated.user.firstName, updated.user.lastName, updated.user.email),
    phone: updated.user.phone,
    role: updated.role,
    canonicalRole: finalCanonicalRole,
    isActive: updated.isActive,
    userIsActive: updated.user.isActive,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
    isSelf: updated.userId === actorUserId,
    isLastAdmin: finalCanonicalRole === "admin" && activeAdminsCount <= 1,
  };
}

/**
 * Remove a membership from the company.
 * Protects the last active admin.
 */
export async function deleteCompanyMembership(
  prisma: MembershipDbClient,
  companyId: string,
  actorUserId: string,
  membershipId: string
): Promise<{ success: boolean; message: string }> {
  const access = await prisma.userCompanyAccess.findFirst({
    where: { id: membershipId, companyId },
    include: { user: true },
  });

  if (!access) {
    throw notFound("Membresía no encontrada en esta empresa", "membership_not_found");
  }

  const currentCanonicalRole = resolveCanonicalRole(access.role) ?? "viewer";
  if (currentCanonicalRole === "admin" && access.isActive && access.user.isActive) {
    const activeAdmins = await countActiveAdmins(prisma, companyId);
    if (activeAdmins <= 1) {
      throw badRequest(
        "No es posible eliminar al único Administrador activo de la empresa.",
        "last_admin_protected"
      );
    }
  }

  await prisma.userCompanyAccess.delete({
    where: { id: membershipId },
  });

  await createAuditEvent({
    prisma: prisma as any,
    companyId,
    userId: actorUserId,
    action: "MEMBERSHIP_DELETED",
    module: "USERS_ROLES",
    entityType: "UserCompanyAccess",
    entityId: membershipId,
    metadata: {
      deletedUserId: access.userId,
      deletedEmail: access.user.email,
      deletedRole: access.role,
    },
  });

  return { success: true, message: `Membresía de ${access.user.email} eliminada.` };
}
