/**
 * MissingFieldsBar.test.tsx — NUEVA-CIRUGIA-IA-UX-P1 (Phase A, AC-01)
 *
 * Validates the pure presentational Critical Missing Bar:
 * - null when errors is empty
 * - one chip per present error key, in visual form order
 *   client → patient → surgeon → institution → classification
 * - chip click focuses the matching [data-step0-field] target (no state mutation)
 * - onFocusField override is the single source of the focus side-effect when provided
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"

import { MissingFieldsBar, type MissingFieldTarget } from "@/components/cirugias/MissingFieldsBar"
import type { Step0ErrorKey, Step0Errors } from "@/components/cirugias/dialogs/NewSurgeryDialog"

const FIELDS: Record<Step0ErrorKey, MissingFieldTarget> = {
  patient: { label: "Paciente", focusSelector: '[data-step0-field="patient"]' },
  surgeon: { label: "Médico", focusSelector: '[data-step0-field="surgeon"]' },
  institution: { label: "Institución", focusSelector: '[data-step0-field="institution"]' },
  client: { label: "Cliente / Pagador", focusSelector: '[data-step0-field="client"]' },
  classification: { label: "Clasificación", focusSelector: '[data-step0-field="classification"]' },
}

describe("MissingFieldsBar — NUEVA-CIRUGIA-IA-UX-P1", () => {
  beforeEach(() => {
    // jsdom does not implement scrollIntoView; polyfill as a no-op so the
    // internal focus path (scrollIntoView on the focused input) does not throw.
    if (typeof Element.prototype.scrollIntoView !== "function") {
      Element.prototype.scrollIntoView = function () {}
    }
  })

  it("renders nothing when there are no errors", () => {
    const { container } = render(<MissingFieldsBar errors={{}} fields={FIELDS} />)
    expect(container.firstChild).toBeNull()
  })

  it("renders one chip per present error key in visual form order", () => {
    // Deliberately pass errors in a non-visual key order to assert output order.
    const errors: Step0Errors = {
      classification: "Clasificación es obligatoria",
      client: "Cliente / Pagador es obligatorio",
      patient: "Paciente es obligatorio",
    }
    render(<MissingFieldsBar errors={errors} fields={FIELDS} />)

    const chips = screen.getAllByRole("button")
    expect(chips).toHaveLength(3)
    // Visual form order: client → patient → surgeon → institution → classification
    expect(chips[0]).toHaveTextContent("Cliente / Pagador")
    expect(chips[1]).toHaveTextContent("Paciente")
    expect(chips[2]).toHaveTextContent("Clasificación")
  })

  it("renders all five chips when every key is present", () => {
    const errors: Step0Errors = {
      patient: "x",
      surgeon: "x",
      institution: "x",
      client: "x",
      classification: "x",
    }
    render(<MissingFieldsBar errors={errors} fields={FIELDS} />)
    const chips = screen.getAllByRole("button")
    expect(chips).toHaveLength(5)
    expect(chips[0]).toHaveTextContent("Cliente / Pagador")
    expect(chips[1]).toHaveTextContent("Paciente")
    expect(chips[2]).toHaveTextContent("Médico")
    expect(chips[3]).toHaveTextContent("Institución")
    expect(chips[4]).toHaveTextContent("Clasificación")
  })

  it("renders the introductory 'Faltan datos obligatorios:' label", () => {
    render(<MissingFieldsBar errors={{ patient: "x" }} fields={FIELDS} />)
    expect(screen.getByText("Faltan datos obligatorios:")).toBeInTheDocument()
  })

  it("focuses the matching [data-step0-field] input on chip click (no state mutation)", () => {
    const errors: Step0Errors = { patient: "Paciente es obligatorio" }
    render(
      <div>
        {/* Sibling stubs carrying the data-step0-field wrappers (DESIGN §5.1). */}
        <div data-step0-field="patient">
          <input type="text" data-testid="patient-input" />
        </div>
        <div data-step0-field="surgeon">
          <input type="text" data-testid="surgeon-input" />
        </div>
        <MissingFieldsBar errors={errors} fields={FIELDS} />
      </div>
    )

    const chip = screen.getByRole("button", { name: "Paciente" })
    fireEvent.click(chip)

    const patientInput = screen.getByTestId("patient-input")
    expect(document.activeElement).toBe(patientInput)
  })

  it("delegates focus to onFocusField when provided and does not touch the DOM focus itself", () => {
    const onFocusField = vi.fn()
    const errors: Step0Errors = { patient: "x", surgeon: "x" }
    render(
      <div>
        <div data-step0-field="patient">
          <input type="text" data-testid="patient-input" />
        </div>
        <MissingFieldsBar errors={errors} fields={FIELDS} onFocusField={onFocusField} />
      </div>
    )

    const chip = screen.getByRole("button", { name: "Paciente" })
    fireEvent.click(chip)

    expect(onFocusField).toHaveBeenCalledTimes(1)
    expect(onFocusField).toHaveBeenCalledWith("patient", '[data-step0-field="patient"]')
    // Because onFocusField was provided, the bar must NOT perform the internal DOM focus.
    const patientInput = screen.getByTestId("patient-input")
    expect(document.activeElement).not.toBe(patientInput)
  })

  it("chips are type=button (no form submit) and bar uses amber token classes (AC-07)", () => {
    const errors: Step0Errors = { patient: "x" }
    const { container } = render(<MissingFieldsBar errors={errors} fields={FIELDS} />)
    const chip = screen.getByRole("button", { name: "Paciente" })
    expect(chip).toHaveAttribute("type", "button")
    // Amber token check — bar container uses the amber Alert token set (DESIGN §7.1).
    const bar = container.firstChild as HTMLElement
    expect(bar.className).toContain("border-amber-300")
    expect(bar.className).toContain("bg-amber-50")
    expect(chip.className).toContain("text-amber-700")
  })
})
