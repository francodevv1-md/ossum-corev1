import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { KeyValue } from "@/components/pdf/key-value/key-value"
import { PdfcnThemeProvider } from "@/components/pdf/theme-provider"

describe("KeyValue", () => {
  it("supports the legacy single-row label/value API used by document templates", () => {
    render(<PdfcnThemeProvider><KeyValue label="Paciente" value="María López" /></PdfcnThemeProvider>)

    expect(screen.getByText("Paciente")).toBeInTheDocument()
    expect(screen.getByText("María López")).toBeInTheDocument()
  })
})
