import { prisma } from '@/lib/prisma';
import { badRequest, notFound } from '@/lib/api/errors';
import {
  CreatePersonalCalendarEventInput,
  UpdatePersonalCalendarEventInput,
  createPersonalCalendarEventSchema,
  updatePersonalCalendarEventSchema,
} from '@/lib/validators/personal-calendar.validator';

export type ListPersonalCalendarEventsParams = {
  companyId: string;
  userId: string;
  from?: Date | string;
  to?: Date | string;
  includeCancelled?: boolean;
};

export type PersonalCalendarEventDto = {
  id: string;
  companyId: string;
  userId: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  isCancelled: boolean;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function toDto(event: {
  id: string;
  companyId: string;
  userId: string;
  title: string;
  description: string | null;
  startDate: Date;
  endDate: Date;
  isCancelled: boolean;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): PersonalCalendarEventDto {
  return {
    id: event.id,
    companyId: event.companyId,
    userId: event.userId,
    title: event.title,
    description: event.description,
    startDate: event.startDate.toISOString(),
    endDate: event.endDate.toISOString(),
    isCancelled: event.isCancelled,
    cancelledAt: event.cancelledAt ? event.cancelledAt.toISOString() : null,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
  };
}

export async function listPersonalCalendarEvents(
  params: ListPersonalCalendarEventsParams,
  client = prisma
): Promise<PersonalCalendarEventDto[]> {
  const { companyId, userId, from, to, includeCancelled = false } = params;

  const where: any = {
    companyId,
    userId,
  };

  if (!includeCancelled) {
    where.isCancelled = false;
  }

  if (from || to) {
    where.startDate = {};
    if (from) {
      where.startDate.gte = new Date(from);
    }
    if (to) {
      where.startDate.lte = new Date(to);
    }
  }

  const events = await (client as any).personalCalendarEvent.findMany({
    where,
    orderBy: {
      startDate: 'asc',
    },
  });

  return events.map(toDto);
}

export async function getPersonalCalendarEventById(
  params: { companyId: string; userId: string; eventId: string },
  client = prisma
): Promise<PersonalCalendarEventDto> {
  const { companyId, userId, eventId } = params;

  const event = await (client as any).personalCalendarEvent.findFirst({
    where: {
      id: eventId,
      companyId,
      userId,
    },
  });

  if (!event) {
    throw notFound('Evento de calendario no encontrado');
  }

  return toDto(event);
}

export async function createPersonalCalendarEvent(
  params: { companyId: string; userId: string; data: CreatePersonalCalendarEventInput },
  client = prisma
): Promise<PersonalCalendarEventDto> {
  const { companyId, userId, data } = params;
  const validated = createPersonalCalendarEventSchema.parse(data);

  const event = await (client as any).personalCalendarEvent.create({
    data: {
      companyId,
      userId,
      title: validated.title,
      description: validated.description ?? null,
      startDate: new Date(validated.startDate),
      endDate: new Date(validated.endDate),
    },
  });

  return toDto(event);
}

export async function updatePersonalCalendarEvent(
  params: { companyId: string; userId: string; eventId: string; data: UpdatePersonalCalendarEventInput },
  client = prisma
): Promise<PersonalCalendarEventDto> {
  const { companyId, userId, eventId, data } = params;
  const validated = updatePersonalCalendarEventSchema.parse(data);

  const existing = await (client as any).personalCalendarEvent.findFirst({
    where: {
      id: eventId,
      companyId,
      userId,
    },
  });

  if (!existing) {
    throw notFound('Evento de calendario no encontrado');
  }

  const startDate = new Date(validated.startDate ?? existing.startDate);
  const endDate = new Date(validated.endDate ?? existing.endDate);
  if (endDate.getTime() < startDate.getTime()) {
    throw badRequest('La fecha de fin debe ser posterior o igual a la fecha de inicio', 'validation_failed');
  }

  const updateData: any = {};
  if (validated.title !== undefined) updateData.title = validated.title;
  if (validated.description !== undefined) updateData.description = validated.description;
  if (validated.startDate !== undefined) updateData.startDate = new Date(validated.startDate);
  if (validated.endDate !== undefined) updateData.endDate = new Date(validated.endDate);
  if (validated.isCancelled !== undefined) {
    updateData.isCancelled = validated.isCancelled;
    updateData.cancelledAt = validated.isCancelled ? new Date() : null;
  }

  const updated = await (client as any).personalCalendarEvent.update({
    where: { id: eventId },
    data: updateData,
  });

  return toDto(updated);
}

export async function cancelPersonalCalendarEvent(
  params: { companyId: string; userId: string; eventId: string },
  client = prisma
): Promise<PersonalCalendarEventDto> {
  const { companyId, userId, eventId } = params;

  const existing = await (client as any).personalCalendarEvent.findFirst({
    where: {
      id: eventId,
      companyId,
      userId,
    },
  });

  if (!existing) {
    throw notFound('Evento de calendario no encontrado');
  }

  const updated = await (client as any).personalCalendarEvent.update({
    where: { id: eventId },
    data: {
      isCancelled: true,
      cancelledAt: new Date(),
    },
  });

  return toDto(updated);
}
