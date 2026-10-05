import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  listPersonalCalendarEvents,
  getPersonalCalendarEventById,
  createPersonalCalendarEvent,
  updatePersonalCalendarEvent,
  cancelPersonalCalendarEvent,
} from "@/lib/services/personal-calendar.service";

describe("personal calendar real PostgreSQL persistence & acceptance", () => {
  let companyId: string;
  let userId: string;
  let createdEventId: string;

  beforeAll(async () => {
    // Find an existing active company and user in DEV DB
    const company = await prisma.company.findFirst({
      where: { isActive: true },
      select: { id: true },
    });
    const user = await prisma.user.findFirst({
      where: { isActive: true },
      select: { id: true },
    });

    if (!company || !user) {
      throw new Error("Missing active company or user for integration test in DEV DB");
    }

    companyId = company.id;
    userId = user.id;
  });

  afterAll(async () => {
    if (createdEventId) {
      // Clean up the created test row directly
      await (prisma as any).personalCalendarEvent.deleteMany({
        where: { id: createdEventId },
      });
    }
  });

  it("completes full acceptance lifecycle: create -> edit -> reload -> cancel 'Visitar al Dr. Colman'", async () => {
    // 1. CREATE "Visitar al Dr. Colman"
    const startDate = new Date("2026-10-15T10:00:00.000Z");
    const endDate = new Date("2026-10-15T11:00:00.000Z");

    const created = await createPersonalCalendarEvent({
      companyId,
      userId,
      data: {
        title: "Visitar al Dr. Colman",
        description: "Coordinación sobre prótesis de cadera",
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    });

    expect(created.id).toBeDefined();
    expect(created.title).toBe("Visitar al Dr. Colman");
    expect(created.isCancelled).toBe(false);
    createdEventId = created.id;

    // 2. RELOAD & LIST (persisted in PostgreSQL)
    const list = await listPersonalCalendarEvents({ companyId, userId });
    const found = list.find((e) => e.id === createdEventId);
    expect(found).toBeDefined();
    expect(found?.title).toBe("Visitar al Dr. Colman");
    expect(found?.description).toBe("Coordinación sobre prótesis de cadera");

    // 3. EDIT / UPDATE
    const updatedStartDate = new Date("2026-10-15T14:00:00.000Z");
    const updatedEndDate = new Date("2026-10-15T15:00:00.000Z");

    const updated = await updatePersonalCalendarEvent({
      companyId,
      userId,
      eventId: createdEventId,
      data: {
        title: "Visitar al Dr. Colman (Reprogramado)",
        startDate: updatedStartDate.toISOString(),
        endDate: updatedEndDate.toISOString(),
      },
    });

    expect(updated.title).toBe("Visitar al Dr. Colman (Reprogramado)");

    // 4. RELOAD after edit
    const reloaded = await getPersonalCalendarEventById({
      companyId,
      userId,
      eventId: createdEventId,
    });
    expect(reloaded.title).toBe("Visitar al Dr. Colman (Reprogramado)");
    expect(new Date(reloaded.startDate).getTime()).toBe(updatedStartDate.getTime());

    // 5. CANCEL
    const cancelled = await cancelPersonalCalendarEvent({
      companyId,
      userId,
      eventId: createdEventId,
    });
    expect(cancelled.isCancelled).toBe(true);
    expect(cancelled.cancelledAt).not.toBeNull();

    // 6. VERIFY list behavior after cancellation
    const activeList = await listPersonalCalendarEvents({ companyId, userId, includeCancelled: false });
    expect(activeList.some((e) => e.id === createdEventId)).toBe(false);

    const allList = await listPersonalCalendarEvents({ companyId, userId, includeCancelled: true });
    const cancelledEntry = allList.find((e) => e.id === createdEventId);
    expect(cancelledEntry?.isCancelled).toBe(true);
  });
});
