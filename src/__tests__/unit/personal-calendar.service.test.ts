import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {},
  default: {},
}));

import {
  listPersonalCalendarEvents,
  getPersonalCalendarEventById,
  createPersonalCalendarEvent,
  updatePersonalCalendarEvent,
  cancelPersonalCalendarEvent,
} from "@/lib/services/personal-calendar.service";

describe("personal-calendar.service", () => {
  const mockEvent = {
    id: "event-1",
    companyId: "company-1",
    userId: "user-1",
    title: "Visitar al Dr. Colman",
    description: "Reunión de coordinación quirúrgica",
    startDate: new Date("2026-10-15T09:00:00.000Z"),
    endDate: new Date("2026-10-15T10:00:00.000Z"),
    isCancelled: false,
    cancelledAt: null,
    createdAt: new Date("2026-10-01T10:00:00.000Z"),
    updatedAt: new Date("2026-10-01T10:00:00.000Z"),
  };

  it("lists active personal calendar events scoped to company and user", async () => {
    const mockClient = {
      personalCalendarEvent: {
        findMany: vi.fn().mockResolvedValue([mockEvent]),
      },
    };

    const result = await listPersonalCalendarEvents(
      { companyId: "company-1", userId: "user-1" },
      mockClient as any
    );

    expect(mockClient.personalCalendarEvent.findMany).toHaveBeenCalledWith({
      where: {
        companyId: "company-1",
        userId: "user-1",
        isCancelled: false,
      },
      orderBy: {
        startDate: "asc",
      },
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("event-1");
    expect(result[0].title).toBe("Visitar al Dr. Colman");
  });

  it("creates a new personal calendar event", async () => {
    const mockClient = {
      personalCalendarEvent: {
        create: vi.fn().mockResolvedValue(mockEvent),
      },
    };

    const result = await createPersonalCalendarEvent(
      {
        companyId: "company-1",
        userId: "user-1",
        data: {
          title: "Visitar al Dr. Colman",
          description: "Reunión de coordinación quirúrgica",
          startDate: "2026-10-15T09:00:00.000Z",
          endDate: "2026-10-15T10:00:00.000Z",
        },
      },
      mockClient as any
    );

    expect(mockClient.personalCalendarEvent.create).toHaveBeenCalled();
    expect(result.title).toBe("Visitar al Dr. Colman");
  });

  it("updates an existing personal calendar event", async () => {
    const updatedEvent = {
      ...mockEvent,
      title: "Visitar al Dr. Colman (Reprogramado)",
      startDate: new Date("2026-10-15T14:00:00.000Z"),
      endDate: new Date("2026-10-15T15:00:00.000Z"),
    };

    const mockClient = {
      personalCalendarEvent: {
        findFirst: vi.fn().mockResolvedValue(mockEvent),
        update: vi.fn().mockResolvedValue(updatedEvent),
      },
    };

    const result = await updatePersonalCalendarEvent(
      {
        companyId: "company-1",
        userId: "user-1",
        eventId: "event-1",
        data: {
          title: "Visitar al Dr. Colman (Reprogramado)",
          startDate: "2026-10-15T14:00:00.000Z",
          endDate: "2026-10-15T15:00:00.000Z",
        },
      },
      mockClient as any
    );

    expect(mockClient.personalCalendarEvent.findFirst).toHaveBeenCalledWith({
      where: {
        id: "event-1",
        companyId: "company-1",
        userId: "user-1",
      },
    });
    expect(mockClient.personalCalendarEvent.update).toHaveBeenCalled();
    expect(result.title).toBe("Visitar al Dr. Colman (Reprogramado)");
  });

  it.each([
    { endDate: "2026-10-15T08:00:00.000Z" },
    { startDate: "2026-10-15T11:00:00.000Z" },
  ])("rejects an inverted partial interval without writing: %j", async (data) => {
    const mockClient = {
      personalCalendarEvent: {
        findFirst: vi.fn().mockResolvedValue(mockEvent),
        update: vi.fn().mockResolvedValue(mockEvent),
      },
    };

    await expect(updatePersonalCalendarEvent(
      { companyId: "company-1", userId: "user-1", eventId: "event-1", data },
      mockClient as any
    )).rejects.toMatchObject({ status: 400, code: "validation_failed" });
    expect(mockClient.personalCalendarEvent.update).not.toHaveBeenCalled();
  });

  it("preserves valid partial, equal-bound, title-only and cancellation updates", async () => {
    for (const data of [
      { startDate: "2026-10-15T08:00:00.000Z" },
      { endDate: "2026-10-15T11:00:00.000Z" },
      { startDate: mockEvent.endDate.toISOString() },
      { endDate: mockEvent.startDate.toISOString() },
      { title: "Updated title" },
      { isCancelled: true },
    ]) {
      const mockClient = {
        personalCalendarEvent: {
          findFirst: vi.fn().mockResolvedValue(mockEvent),
          update: vi.fn().mockImplementation(({ data: changes }) => Promise.resolve({ ...mockEvent, ...changes })),
        },
      };
      const result = await updatePersonalCalendarEvent(
        { companyId: "company-1", userId: "user-1", eventId: "event-1", data },
        mockClient as any
      );
      expect(mockClient.personalCalendarEvent.update).toHaveBeenCalledOnce();
      expect(new Date(result.endDate).getTime()).toBeGreaterThanOrEqual(new Date(result.startDate).getTime());
      if ("title" in data) expect(result.title).toBe(data.title);
      if ("isCancelled" in data) {
        expect(result.isCancelled).toBe(true);
        expect(result.cancelledAt).not.toBeNull();
      }
    }
  });

  it("cancels a personal calendar event", async () => {
    const cancelledEvent = {
      ...mockEvent,
      isCancelled: true,
      cancelledAt: new Date("2026-10-02T12:00:00.000Z"),
    };

    const mockClient = {
      personalCalendarEvent: {
        findFirst: vi.fn().mockResolvedValue(mockEvent),
        update: vi.fn().mockResolvedValue(cancelledEvent),
      },
    };

    const result = await cancelPersonalCalendarEvent(
      {
        companyId: "company-1",
        userId: "user-1",
        eventId: "event-1",
      },
      mockClient as any
    );

    expect(mockClient.personalCalendarEvent.findFirst).toHaveBeenCalledWith({
      where: {
        id: "event-1",
        companyId: "company-1",
        userId: "user-1",
      },
    });
    expect(mockClient.personalCalendarEvent.update).toHaveBeenCalledWith({
      where: { id: "event-1" },
      data: {
        isCancelled: true,
        cancelledAt: expect.any(Date),
      },
    });
    expect(result.isCancelled).toBe(true);
  });

  it("throws notFound when attempting to access another user's event", async () => {
    const mockClient = {
      personalCalendarEvent: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    };

    await expect(
      getPersonalCalendarEventById(
        { companyId: "company-1", userId: "other-user", eventId: "event-1" },
        mockClient as any
      )
    ).rejects.toThrow();

    await expect(
      updatePersonalCalendarEvent(
        { companyId: "company-1", userId: "other-user", eventId: "event-1", data: { title: "Hack" } },
        mockClient as any
      )
    ).rejects.toThrow();

    await expect(
      cancelPersonalCalendarEvent(
        { companyId: "company-1", userId: "other-user", eventId: "event-1" },
        mockClient as any
      )
    ).rejects.toThrow();
  });
});
