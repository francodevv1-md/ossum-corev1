import { Prisma, type PrismaClient } from "@prisma/client";

import { requireCompanyId } from "../tenant";
import {
  normalizeSurgeryViewPreferences,
  SURGERY_VIEW_PREFERENCES_MODULE_KEY,
  type SurgeryViewPreferences,
} from "../validators/surgery-view-preferences.validator";

type SurgeryViewPreferenceEnvelope = {
  moduleKey: string;
  preferences: SurgeryViewPreferences;
  isPersisted: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
};

type SurgeryViewPreferenceContext = {
  companyId: string;
  userId: string;
};

function validateContext(context: SurgeryViewPreferenceContext): SurgeryViewPreferenceContext {
  if (typeof context.userId !== "string" || context.userId.trim().length === 0) {
    throw new Error("userId is required for surgery view preferences");
  }

  return {
    companyId: requireCompanyId(context.companyId),
    userId: context.userId,
  };
}

function toEnvelope(record: {
  preferences: unknown;
  createdAt: Date;
  updatedAt: Date;
} | null): SurgeryViewPreferenceEnvelope {
  return {
    moduleKey: SURGERY_VIEW_PREFERENCES_MODULE_KEY,
    preferences: normalizeSurgeryViewPreferences(record?.preferences),
    isPersisted: Boolean(record),
    createdAt: record?.createdAt ?? null,
    updatedAt: record?.updatedAt ?? null,
  };
}

type SurgeryViewPreferenceRow = {
  preferences: unknown;
  createdAt: Date;
  updatedAt: Date;
};

async function findPreferenceRow(
  prisma: PrismaClient,
  context: SurgeryViewPreferenceContext
): Promise<SurgeryViewPreferenceRow | null> {
  return prisma.userModuleViewPreference.findUnique({
    where: {
      companyId_userId_moduleKey: {
        companyId: context.companyId,
        userId: context.userId,
        moduleKey: SURGERY_VIEW_PREFERENCES_MODULE_KEY,
      },
    },
    select: {
      preferences: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function getSurgeryViewPreferences(
  prisma: PrismaClient,
  context: SurgeryViewPreferenceContext
): Promise<SurgeryViewPreferenceEnvelope> {
  const scopedContext = validateContext(context);

  const preference = await findPreferenceRow(prisma, scopedContext);

  return toEnvelope(preference);
}

export async function saveSurgeryViewPreferences(
  prisma: PrismaClient,
  context: SurgeryViewPreferenceContext,
  preferences: SurgeryViewPreferences
): Promise<SurgeryViewPreferenceEnvelope> {
  const scopedContext = validateContext(context);
  const normalizedPreferences = normalizeSurgeryViewPreferences(preferences);

  const saved = await prisma.userModuleViewPreference.upsert({
    where: {
      companyId_userId_moduleKey: {
        companyId: scopedContext.companyId,
        userId: scopedContext.userId,
        moduleKey: SURGERY_VIEW_PREFERENCES_MODULE_KEY,
      },
    },
    update: {
      preferences: normalizedPreferences as Prisma.InputJsonValue,
    },
    create: {
      companyId: scopedContext.companyId,
      userId: scopedContext.userId,
      moduleKey: SURGERY_VIEW_PREFERENCES_MODULE_KEY,
      preferences: normalizedPreferences as Prisma.InputJsonValue,
    },
    select: {
      preferences: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return toEnvelope(saved);
}
