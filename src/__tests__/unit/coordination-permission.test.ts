import { describe, expect, it } from "vitest"

import {
  canAccessGlobalCoordination,
  getCoordinationDestination,
} from "@/lib/permissions/coordination"

describe("coordination permissions", () => {
  it.each([
    ["admin", true, "/coordinadores"],
    ["coordinator", true, "/coordinadores"],
    ["operator", false, "/coordinadores/mi-bandeja"],
    ["unknown", false, "/coordinadores/mi-bandeja"],
    [null, false, "/coordinadores/mi-bandeja"],
    [undefined, false, "/coordinadores/mi-bandeja"],
  ])("maps role %s to global=%s and destination %s", (role, allowed, destination) => {
    expect(canAccessGlobalCoordination(role)).toBe(allowed)
    expect(getCoordinationDestination(role)).toBe(destination)
  })
})
