// OSSUM COR — User service
// User is global (not scoped to a single company).
// Access to companies is via UserCompanyAccess.
// Services receive prisma as dependency injection.

import type { PrismaClient } from "@prisma/client";

// ─── Read ─────────────────────────────────────────────────────────────

export async function getUserById(prisma: PrismaClient, id: string) {
  return prisma.user.findUnique({
    where: { id },
  });
}

export async function getUserByEmail(prisma: PrismaClient, email: string) {
  return prisma.user.findUnique({
    where: { email },
  });
}

export async function getUserBySupabaseAuthId(
  prisma: PrismaClient,
  supabaseAuthId: string
) {
  return prisma.user.findUnique({
    where: { supabaseAuthId },
  });
}

/** List all companies a user has access to, with their roles. */
export async function getUserCompanyAccess(prisma: PrismaClient, userId: string) {
  return prisma.userCompanyAccess.findMany({
    where: { userId, isActive: true },
    include: { company: true },
  });
}

// ─── Create ───────────────────────────────────────────────────────────

export async function createUser(
  prisma: PrismaClient,
  data: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    supabaseAuthId?: string;
  }
) {
  return prisma.user.create({
    data: {
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      supabaseAuthId: data.supabaseAuthId,
    },
  });
}

// ─── Update ────────────────────────────────────────────────────────────

export async function updateUser(
  prisma: PrismaClient,
  id: string,
  data: {
    firstName?: string;
    lastName?: string;
    phone?: string | null;
    supabaseAuthId?: string | null;
  }
) {
  return prisma.user.update({
    where: { id },
    data,
  });
}

// ─── Company access ────────────────────────────────────────────────────

export async function assignUserToCompany(
  prisma: PrismaClient,
  userId: string,
  companyId: string,
  role: string = "operator"
) {
  return prisma.userCompanyAccess.upsert({
    where: {
      userId_companyId: { userId, companyId },
    },
    create: {
      userId,
      companyId,
      role,
      isActive: true,
    },
    update: {
      role,
      isActive: true,
    },
  });
}

// ─── Soft delete ──────────────────────────────────────────────────────

export async function deactivateUser(prisma: PrismaClient, id: string) {
  return prisma.user.update({
    where: { id },
    data: { isActive: false },
  });
}