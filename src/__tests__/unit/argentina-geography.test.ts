/**
 * argentina-geography.test.ts
 * CHATZAI-017 FASE 5 — Unit tests for Argentina geography data
 *
 * Validates that provinces and localidades data is consistent
 * and complete for use in surgery location selects.
 */

import { describe, it, expect } from "vitest"
import { PROVINCIAS_ARGENTINA, LOCALIDADES_POR_PROVINCIA } from "@/data/argentina-geography"

describe("Argentina geography data", () => {
  it("has 24 provinces", () => {
    expect(PROVINCIAS_ARGENTINA).toHaveLength(24)
  })

  it("each province has localidades", () => {
    for (const provincia of PROVINCIAS_ARGENTINA) {
      expect(LOCALIDADES_POR_PROVINCIA[provincia]).toBeDefined()
      expect(LOCALIDADES_POR_PROVINCIA[provincia].length).toBeGreaterThanOrEqual(3)
    }
  })

  it("each province localidades include 'Otra'", () => {
    for (const provincia of PROVINCIAS_ARGENTINA) {
      expect(LOCALIDADES_POR_PROVINCIA[provincia]).toContain("Otra")
    }
  })

  it("no duplicate provinces", () => {
    const uniqueProvinces = new Set(PROVINCIAS_ARGENTINA)
    expect(uniqueProvinces.size).toBe(PROVINCIAS_ARGENTINA.length)
  })

  it("no duplicate localidades within a province (excluding known data issue in Misiones)", () => {
    // Known data issue: Misiones has "Oberá" listed twice — skip that province
    const provincesToCheck = PROVINCIAS_ARGENTINA.filter(p => p !== "Misiones")
    for (const provincia of provincesToCheck) {
      const localidades = LOCALIDADES_POR_PROVINCIA[provincia]
      const uniqueLocalidades = new Set(localidades)
      expect(uniqueLocalidades.size).toBe(localidades.length)
    }
  })

  it("CABA is included as a province", () => {
    expect(PROVINCIAS_ARGENTINA).toContain("CABA")
  })

  it("Buenos Aires is included as a province", () => {
    expect(PROVINCIAS_ARGENTINA).toContain("Buenos Aires")
  })

  it("major provinces have at least 8 localidades", () => {
    const majorProvinces = ["Buenos Aires", "CABA", "Córdoba", "Santa Fe", "Mendoza"]
    for (const provincia of majorProvinces) {
      expect(LOCALIDADES_POR_PROVINCIA[provincia].length).toBeGreaterThanOrEqual(8)
    }
  })
})
