import { beforeEach, describe, expect, it, vi } from "vitest";
import { conflict, forbidden } from "@/lib/api/errors";
import { POST as reserve } from "@/app/api/companies/[companyId]/cajas/assignments/[assignmentId]/reservation/route";
import { POST as control } from "@/app/api/companies/[companyId]/cajas/assignments/[assignmentId]/control/route";
import { POST as resolve } from "@/app/api/companies/[companyId]/cajas/assignments/[assignmentId]/differences/[differenceId]/resolve/route";
import * as client from "@/lib/api/cajas-assignments";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), access: vi.fn(), reserve: vi.fn(), control: vi.fn(), resolve: vi.fn(), select: vi.fn(), fetch: vi.fn(), db: {} }));
vi.mock("@/lib/api/auth-context", () => ({ getApiAuthContext: mocks.auth }));
vi.mock("@/lib/permissions/article", () => ({ requireArticleMutationAccess: mocks.access }));
vi.mock("@/lib/prisma", () => ({ default: mocks.db }));
vi.mock("@/lib/services/stock-reservation.service", () => ({ reserveAssignedBox: mocks.reserve, releaseAssignedBoxReservation: vi.fn() }));
vi.mock("@/lib/services/cajas-control.service", () => ({ confirmCajasControl: mocks.control }));
vi.mock("@/lib/services/cajas-difference.service", () => ({ resolveCajasDifference: mocks.resolve }));
vi.mock("@/lib/services/cajas-component-selection.service", () => ({ selectCajasComponent: mocks.select }));
vi.mock("@/lib/api/client", () => ({ apiFetch: mocks.fetch }));

const command = { expectedVersion: 7, idempotencyKey: "intent-7", cause: "Verified preparation" };
const resolution = { idempotencyKey: "resolve-2", expectedResolutionSequence: 2, closesDifference: true, explanation: "Checked", supportingReference: "inspection-2", cause: "Verified" };
const context = { params: Promise.resolve({ companyId: "url-company", assignmentId: "assignment", differenceId: "difference", lineId: "line" }) };
function request(body?: unknown) {
  return new Request("https://example.test/api", { method: "POST", ...(body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }) });
}
async function selectionRoute() {
  return import("@/app/api/companies/[companyId]/cajas/preparation-lines/[lineId]/selection/route");
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ companyId: "authorized-company", actorUserId: "actor" });
  for (const service of [mocks.reserve, mocks.control, mocks.resolve, mocks.select]) service.mockResolvedValue({ id: "accepted" });
});

describe("bounded preparation route contracts", () => {
  it("forwards explicit reservation identity and freshness", async () => {
    expect((await reserve(request(command), context)).status).toBe(201);
    expect(mocks.reserve).toHaveBeenCalledWith(mocks.db, "authorized-company", "assignment", "actor", command);
  });
  it("preserves bodyless legacy reservation without inventing client intent", async () => {
    expect((await reserve(request(), context)).status).toBe(201);
    expect(mocks.reserve).toHaveBeenCalledWith(mocks.db, "authorized-company", "assignment", "actor", undefined);
  });
  it.each([{}, { ...command, expectedVersion: 0 }, { ...command, extra: true }])("rejects invalid explicit reservation %j", async (body) => {
    expect((await reserve(request(body), context)).status).toBe(400);
    expect(mocks.reserve).not.toHaveBeenCalled();
  });
  it.each(["control", "recontrol"] as const)("forwards complete %s intent", async (kind) => {
    const input = { ...command, kind };
    expect((await control(request(input), context)).status).toBe(201);
    expect(mocks.control).toHaveBeenCalledWith(mocks.db, "authorized-company", "assignment", input.cause, "actor", input);
  });
  it("rejects legacy incomplete recontrol rather than downgrading it", async () => {
    expect((await control(request({ kind: "recontrol" }), context)).status).toBe(400);
    expect(mocks.control).not.toHaveBeenCalled();
  });
  it("preserves ordinary legacy control", async () => {
    expect((await control(request({ kind: "control", cause: "Inspect" }), context)).status).toBe(201);
    expect(mocks.control).toHaveBeenCalledWith(mocks.db, "authorized-company", "assignment", "Inspect", "actor", undefined);
  });
  it("rejects partially formed explicit control", async () => {
    expect((await control(request({ kind: "control", expectedVersion: 7 }), context)).status).toBe(400);
    expect(mocks.control).not.toHaveBeenCalled();
  });
  it.each([null, { ...command, kind: "unknown" }, { ...command, kind: "control", extra: true }])("rejects invalid control %j without legacy fallback", async (body) => {
    expect((await control(request(body), context)).status).toBe(400);
    expect(mocks.control).not.toHaveBeenCalled();
  });
  it("forwards resolution sequence, preserving the existing difference binding scope", async () => {
    expect((await resolve(request(resolution), context)).status).toBe(200);
    expect(mocks.resolve).toHaveBeenCalledWith(mocks.db, "authorized-company", "difference", resolution, "actor");
  });
  it("rejects resolution without caller sequence", async () => {
    const { expectedResolutionSequence: _sequence, ...legacy } = resolution;
    expect((await resolve(request(legacy), context)).status).toBe(400);
    expect(mocks.resolve).not.toHaveBeenCalled();
  });
  it("reports malformed JSON consistently", async () => {
    for (const route of [reserve, control, resolve]) {
      const response = await route(new Request("https://example.test", { method: "POST", body: "{" }), context);
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("invalid_json_body");
    }
  });
  it.each([{ sourceMovementId: "movement", quantity: 2.5, append: true }, { physicalUnitId: "unit", quantity: 1 }, { remove: true }])("exposes general selection %j", async (allocation) => {
    const { PATCH } = await selectionRoute();
    expect((await PATCH(request({ ...command, ...allocation }), context)).status).toBe(200);
    expect(mocks.select).toHaveBeenCalledWith(mocks.db, "authorized-company", "line", { ...command, remove: false, ...allocation }, "actor");
  });
  it("rejects ambiguous selection before service dispatch", async () => {
    const { PATCH } = await selectionRoute();
    expect((await PATCH(request({ ...command, physicalUnitId: "unit", sourceMovementId: "movement" }), context)).status).toBe(400);
    expect(mocks.select).not.toHaveBeenCalled();
  });
  it("rejects malformed selection JSON", async () => {
    const { PATCH } = await selectionRoute();
    const response = await PATCH(new Request("https://example.test", { method: "PATCH", body: "{" }), context);
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("invalid_json_body");
    expect(mocks.select).not.toHaveBeenCalled();
  });
  it("preserves service stale/idempotency conflicts", async () => {
    for (const code of ["cajas_stale_preparation", "cajas_idempotency_conflict"]) {
      mocks.control.mockRejectedValueOnce(conflict("Rejected", code));
      const response = await control(request({ ...command, kind: "recontrol" }), context);
      expect(response.status).toBe(409);
      expect((await response.json()).error.code).toBe(code);
    }
  });
  it("checks mutation permission before all service dispatch", async () => {
    mocks.access.mockImplementation(() => { throw forbidden("Denied"); });
    const { PATCH } = await selectionRoute();
    for (const route of [reserve, control, resolve, PATCH]) expect((await route(request(command), context)).status).toBe(403);
    for (const service of [mocks.reserve, mocks.control, mocks.resolve, mocks.select]) expect(service).not.toHaveBeenCalled();
  });
});

describe("preparation client contracts", () => {
  it("retains bodyless reservation compatibility", async () => {
    await client.reserveBoxAssignmentApi("company", "assignment");
    expect(mocks.fetch).toHaveBeenCalledWith(expect.any(String), { method: "POST" });
  });
  it("keeps incomplete legacy recontrol visible to server validation", async () => {
    await client.controlBoxAssignmentApi("company", "assignment", undefined, "recontrol");
    expect(mocks.fetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ body: JSON.stringify({ kind: "recontrol" }) }));
  });
  it("never guesses sequence for an incomplete legacy resolution", async () => {
    const { expectedResolutionSequence: _sequence, ...legacy } = resolution;
    await client.resolveCajasDifferenceApi("company", "assignment", "difference", legacy);
    expect(mocks.fetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ body: JSON.stringify(legacy) }));
  });
  it("sends explicit reservation as JSON", async () => {
    await client.reserveBoxAssignmentApi("company/a", "assignment/b", command);
    expect(mocks.fetch).toHaveBeenCalledWith("/api/companies/company%2Fa/cajas/assignments/assignment%2Fb/reservation", expect.objectContaining({ method: "POST", body: JSON.stringify(command) }));
  });
  it("sends complete control as JSON without remapping kind", async () => {
    const input = { ...command, kind: "recontrol" as const };
    await client.controlBoxAssignmentApi("company", "assignment", input);
    expect(mocks.fetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ body: JSON.stringify(input) }));
  });
  it("sends general selection without forcing quantity one", async () => {
    const input = { ...command, sourceMovementId: "movement", quantity: 3.5, append: true };
    await client.selectPreparationLineApi("company/a", "line/b", input);
    expect(mocks.fetch).toHaveBeenCalledWith("/api/companies/company%2Fa/cajas/preparation-lines/line%2Fb/selection", expect.objectContaining({ method: "PATCH", body: JSON.stringify(input) }));
  });
  it("transports the observed resolution sequence unchanged", async () => {
    await client.resolveCajasDifferenceApi("company", "assignment", "difference", resolution);
    expect(mocks.fetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ body: JSON.stringify(resolution) }));
  });
});
