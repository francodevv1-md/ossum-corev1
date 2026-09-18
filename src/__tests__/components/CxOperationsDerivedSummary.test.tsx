import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { CxOperationsDerivedSummary } from "@/components/cx-operations/CxOperationsDerivedSummary"

describe("CxOperationsDerivedSummary", () => {
  it("renders advisory action and area copy without an actionable control", () => {
    render(
      <CxOperationsDerivedSummary
        display={{
          nextActionLabel: "Resolver coordinación y fecha",
          responsibleAreaLabel: "Coordinación",
        }}
      />,
    )

    expect(screen.getByLabelText("Próxima acción (derivada): Derivada · Resolver coordinación y fecha")).toHaveTextContent(
      "Derivada · Resolver coordinación y fecha",
    )
    expect(screen.getByLabelText("Área sugerida (derivada): Derivada · Coordinación")).toHaveTextContent("Derivada · Coordinación")
    expect(screen.getByText("Próxima acción (derivada):")).toBeInTheDocument()
    expect(screen.getByText("Área sugerida (derivada):")).toBeInTheDocument()
    expect(screen.getByLabelText("Área sugerida (derivada): Derivada · Coordinación")).toBeInTheDocument()
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })
})
