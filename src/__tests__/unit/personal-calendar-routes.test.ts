import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getApiAuthContext,
  requireCompanyReadAccess,
  listPersonalCalendarEvents,
  createPersonalCalendarEvent,
  getPersonalCalendarEventById,
  updatePersonalCalendarEvent,
  cancelPersonalCalendarEvent,
} = vi.hoisted(() => ({
  getApiAuthContext: vi.fn(),
  requireCompanyReadAccess: vi.fn(),
  listPersonalCalendarEvents: vi.fn(),
  createPersonalCalendarEvent: vi.fn(),
  getPersonalCalendarEventById: vi.fn(),
  updatePersonalCalendarEvent: vi.fn(),
  cancelPersonalCalendarEvent: vi.fn(),
}));

vi.mock("@/lib/api/auth-context", () => ({ getApiAuthContext }));
vi.mock("@/lib/api/guards", () => ({ requireCompanyReadAccess }));
vi.mock("@/lib/services/personal-calendar.service", () => ({
  listPersonalCalendarEvents,
  createPersonalCalendarEvent,
  getPersonalCalendarEventById,
  updatePersonalCalendarEvent,
  cancelPersonalCalendarEvent,
}));

import {
  GET as listGet,
  POST as listPost,
} from "@/app/api/companies/[companyId]/personal-events/route";
import {
  GET as itemGet,
  PATCH as itemPatch,
  DELETE as itemDelete,
} from "@/app/api/companies/[companyId]/personal-events/[eventId]/route";

const companyId = "company-1";
const collectionParams = { params: Promise.resolve({ companyId }) };
const itemParams = { params: Promise.resolve({ companyId, eventId: "event-1" }) };

describe("personal calendar API routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getApiAuthContext.mockResolvedValue({ companyId, actorUserId: "user-1", role: "admin" });
  });

  describe("GET /api/companies/:companyId/personal-events", () => {
    it("returns events list for authenticated user and company", async () => {
      const mockEvents = [
        {
          id: "event-1",
          companyId,
          userId: "user-1",
          title: "Visitar al Dr. Colman",
          startDate: "2026-10-15T09:00:00.000Z",
          endDate: "2026-10-15T10:00:00.000Z",
          isCancelled: false,
        },
      ];
      listPersonalCalendarEvents.mockResolvedValue(mockEvents);

      const request = new Request("http://localhost/api/companies/company-1/personal-events");
      const response = await listGet(request, collectionParams);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.data.events).toEqual(mockEvents);
      expect(listPersonalCalendarEvents).toHaveBeenCalledWith({
        companyId,
        userId: "user-1",
        from: undefined,
        to: undefined,
        includeCancelled: false,
      });
    });
  });

  describe("POST /api/companies/:companyId/personal-events", () => {
    it("creates an event for authenticated user", async () => {
      const createdEvent = {
        id: "event-1",
        companyId,
        userId: "user-1",
        title: "Visitar al Dr. Colman",
        startDate: "2026-10-15T09:00:00.000Z",
        endDate: "2026-10-15T10:00:00.000Z",
        isCancelled: false,
      };
      createPersonalCalendarEvent.mockResolvedValue(createdEvent);

      const payload = {
        title: "Visitar al Dr. Colman",
        startDate: "2026-10-15T09:00:00.000Z",
        endDate: "2026-10-15T10:00:00.000Z",
      };
      const request = new Request("http://localhost/api/companies/company-1/personal-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const response = await listPost(request, collectionParams);
      expect(response.status).toBe(201);
      const json = await response.json();
      expect(json.data.event).toEqual(createdEvent);
      expect(createPersonalCalendarEvent).toHaveBeenCalledWith({
        companyId,
        userId: "user-1",
        data: payload,
      });
    });
  });

  describe("PATCH & DELETE /api/companies/:companyId/personal-events/:eventId", () => {
    it("updates event via PATCH", async () => {
      const updatedEvent = {
        id: "event-1",
        companyId,
        userId: "user-1",
        title: "Visitar al Dr. Colman (Reprogramado)",
      };
      updatePersonalCalendarEvent.mockResolvedValue(updatedEvent);

      const payload = { title: "Visitar al Dr. Colman (Reprogramado)" };
      const request = new Request("http://localhost/api/companies/company-1/personal-events/event-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const response = await itemPatch(request, itemParams);
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.data.event).toEqual(updatedEvent);
    });

    it("cancels event via DELETE", async () => {
      const cancelledEvent = {
        id: "event-1",
        companyId,
        userId: "user-1",
        isCancelled: true,
      };
      cancelPersonalCalendarEvent.mockResolvedValue(cancelledEvent);

      const request = new Request("http://localhost/api/companies/company-1/personal-events/event-1", {
        method: "DELETE",
      });

      const response = await itemDelete(request, itemParams);
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.data.event).toEqual(cancelledEvent);
    });
  });
});
