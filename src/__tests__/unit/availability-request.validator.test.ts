import { describe, expect, it } from "vitest";

import {
  AVAILABILITY_CAPABILITIES,
  hasAvailabilityCapability,
} from "@/lib/permissions/availability-request";
import {
  validateAvailabilityId,
  validateAvailabilityIdempotencyKey,
  validateCompleteAvailabilityRequestBody,
  validateCorrectMaterialAvailabilityBody,
  validateCreateAvailabilityRequestBody,
  validateMaterialAvailabilityReadQuery,
  validateSetAvailabilityPivotBody,
} from "@/lib/validators/availability-request.validator";

describe("availability-request.validator", () => {
  it("accepts the closed minimal create body and empty read query", () => {
    expect(validateCreateAvailabilityRequestBody({})).toEqual({});
    expect(validateMaterialAvailabilityReadQuery({})).toEqual({});
  });

  it("accepts and normalizes approved completion, correction, and PÍVOT bodies", () => {
    expect(
      validateCompleteAvailabilityRequestBody({ date: "2026-07-24" })
    ).toEqual({ date: "2026-07-24" });

    expect(
      validateCorrectMaterialAvailabilityBody({
        date: "2026-07-25",
        expectedCurrentDate: "2026-07-24",
        reason: "  Fecha confirmada por logística.  ",
      })
    ).toEqual({
      date: "2026-07-25",
      expectedCurrentDate: "2026-07-24",
      reason: "Fecha confirmada por logística.",
    });

    expect(
      validateSetAvailabilityPivotBody({
        userId: "  user-pivot-1  ",
        expectedVersion: 3,
        reason: "  Reasignación operativa.  ",
      })
    ).toEqual({
      userId: "user-pivot-1",
      expectedVersion: 3,
      reason: "Reasignación operativa.",
    });
  });

  it("validates bounded IDs and exact opaque idempotency keys", () => {
    expect(validateAvailabilityId("  request-1  ")).toBe("request-1");
    expect(validateAvailabilityIdempotencyKey("request-key-0001")).toBe(
      "request-key-0001"
    );

    for (const invalidId of ["", "   ", "x".repeat(201), null]) {
      expect(() => validateAvailabilityId(invalidId)).toThrow();
    }

    for (const invalidKey of [
      "short",
      " key-with-leading-space",
      `key-${"x".repeat(125)}`,
      "key-with-line\nbreak",
      null,
    ]) {
      expect(() => validateAvailabilityIdempotencyKey(invalidKey)).toThrow();
    }
  });

  it("rejects unknown and client-authority keys in every closed input", () => {
    const authorityFields = [
      "actorUserId",
      "companyId",
      "requesterUserId",
      "creatorUserId",
      "pivotUserId",
      "recipientUserIds",
      "recipientReasons",
      "completedByUserId",
      "status",
      "auditUserId",
      "notificationKey",
      "surgeryId",
      "requestId",
    ];

    for (const field of authorityFields) {
      expect(() =>
        validateCreateAvailabilityRequestBody({ [field]: "client-controlled" })
      ).toThrow();
      expect(() =>
        validateCompleteAvailabilityRequestBody({
          date: "2026-07-24",
          [field]: "client-controlled",
        })
      ).toThrow();
      expect(() =>
        validateCorrectMaterialAvailabilityBody({
          date: "2026-07-25",
          expectedCurrentDate: "2026-07-24",
          reason: "Corrección válida.",
          [field]: "client-controlled",
        })
      ).toThrow();
      expect(() =>
        validateSetAvailabilityPivotBody({
          userId: "candidate-user",
          expectedVersion: 1,
          reason: "Reasignación válida.",
          [field]: "client-controlled",
        })
      ).toThrow();
      expect(() =>
        validateMaterialAvailabilityReadQuery({ [field]: "client-controlled" })
      ).toThrow();
    }
  });

  it("rejects invalid date-only representations and impossible dates", () => {
    for (const date of [
      "24/07/2026",
      "2026-07-24T00:00:00Z",
      "2026-07-24+03:00",
      "2026-7-24",
      "2026-02-29",
      "2026-04-31",
      "0000-01-01",
      "",
    ]) {
      expect(() =>
        validateCompleteAvailabilityRequestBody({ date })
      ).toThrow();
    }

    expect(
      validateCompleteAvailabilityRequestBody({ date: "2024-02-29" })
    ).toEqual({ date: "2024-02-29" });
  });

  it("rejects incomplete corrections, invalid reasons, and invalid versions", () => {
    for (const body of [
      { date: "2026-07-25", reason: "Motivo válido" },
      {
        date: "2026-07-25",
        expectedCurrentDate: "2026-02-29",
        reason: "Motivo válido",
      },
      {
        date: "2026-07-25",
        expectedCurrentDate: "2026-07-24",
        reason: "  x ",
      },
      {
        date: "2026-07-25",
        expectedCurrentDate: "2026-07-24",
        reason: "x".repeat(501),
      },
    ]) {
      expect(() => validateCorrectMaterialAvailabilityBody(body)).toThrow();
    }

    for (const expectedVersion of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, "1"]) {
      expect(() =>
        validateSetAvailabilityPivotBody({
          userId: "candidate-user",
          expectedVersion,
          reason: "Reasignación válida.",
        })
      ).toThrow();
    }
  });

  it("keeps every production availability capability hard-denied", () => {
    expect(AVAILABILITY_CAPABILITIES).toEqual([
      "availability.request.create",
      "availability.request.read",
      "availability.date.correct",
      "availability.pivot.configure",
    ]);

    for (const capability of AVAILABILITY_CAPABILITIES) {
      expect(hasAvailabilityCapability(capability)).toBe(false);
    }
  });
});
