import { describe, expect, it } from "vitest"
import { formatContextualDate, formatDate } from "@/lib/formatters"

function toIsoDate(offsetDays: number) {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + offsetDays)
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, "0")
  const day = `${date.getDate()}`.padStart(2, "0")
  return `${year}-${month}-${day}`
}

describe("formatContextualDate", () => {
  it("formats today, tomorrow, and yesterday", () => {
    expect(formatContextualDate(toIsoDate(0))).toEqual({ text: "Hoy", variant: "today" })
    expect(formatContextualDate(toIsoDate(1))).toEqual({ text: "Mañana", variant: "tomorrow" })
    expect(formatContextualDate(toIsoDate(-1))).toEqual({ text: "Ayer", variant: "yesterday" })
  })

  it("formats overdue and soon dates", () => {
    expect(formatContextualDate(toIsoDate(-2))).toEqual({ text: "Hace 2d", variant: "overdue" })
    expect(formatContextualDate(toIsoDate(-8))).toEqual({ text: "Vencida hace 8d", variant: "overdue" })
    expect(formatContextualDate(toIsoDate(2))).toEqual({ text: "En 2d", variant: "soon" })
  })

  it("falls back to the exact formatted date for neutral future dates", () => {
    const futureDate = toIsoDate(10)
    expect(formatContextualDate(futureDate)).toEqual({ text: formatDate(futureDate), variant: "neutral" })
  })

  it("handles empty and invalid dates gracefully", () => {
    expect(formatContextualDate("")).toEqual({ text: "—", variant: "neutral" })
    expect(formatContextualDate("not-a-date")).toEqual({ text: "—", variant: "neutral" })
  })
})
