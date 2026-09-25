import { describe, expect, it } from "vitest"
import { CIRUGIAS_COLUMNS, DEFAULT_VISIBLE_COLS, NON_SORTABLE_KEYS } from "@/lib/cirugias.constants"

describe("Cirugías date columns", () => {
  it("replaces the provisional Operativas column with four explicit date columns", () => {
    expect(CIRUGIAS_COLUMNS.map((column) => column.label)).not.toContain("Operativas")
    expect(CIRUGIAS_COLUMNS.find((column) => column.key === "date")?.label).toBe("Fecha CX")
    expect(CIRUGIAS_COLUMNS.find((column) => column.key === "probableDate")?.label).toBe("Fecha probable")
    expect(CIRUGIAS_COLUMNS.find((column) => column.key === "fechaLogistica")?.label).toBe("Fecha logística")
    expect(CIRUGIAS_COLUMNS.find((column) => column.key === "fechaEnvio")?.label).toBe("Fecha envío")
  })

  it("shows primary Fecha CX by default, secondary dates opt-in, and keeps only Fecha CX sortable", () => {
    expect(DEFAULT_VISIBLE_COLS.date).toBe(true)
    expect(DEFAULT_VISIBLE_COLS.probableDate).toBe(false)
    expect(DEFAULT_VISIBLE_COLS.fechaLogistica).toBe(false)
    expect(DEFAULT_VISIBLE_COLS.fechaEnvio).toBe(false)
    expect(NON_SORTABLE_KEYS).toContain("probableDate")
    expect(NON_SORTABLE_KEYS).toContain("fechaLogistica")
    expect(NON_SORTABLE_KEYS).toContain("fechaEnvio")
    expect(NON_SORTABLE_KEYS).not.toContain("date")
  })
})
