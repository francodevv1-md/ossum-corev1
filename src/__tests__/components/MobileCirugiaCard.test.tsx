import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { MobileCirugiaCard, type MobileCardPrimaryAction } from "@/components/cirugias/MobileCirugiaCard"
import type { Surgery } from "@/types"

function makeSurgery(overrides: Partial<Surgery> = {}): Surgery {
  return {
    id: "cx-1",
    patient: "Juan Pérez",
    patientDni: "12345678",
    surgeon: "Dra. López",
    institution: "Hospital Central",
    institutionCity: "CABA",
    procedure: "Artroplastia de rodilla",
    date: "2026-10-15",
    time: "08:30",
    state: "Pendiente",
    preparationState: "Sin preparar",
    classification: "Programada",
    client: "OSDE",
    urgente: false,
    autorizado: false,
    facturado: false,
    visibleNumber: "CX-0001",
    referenciasAdministrativas: [],
    ...overrides,
  } as Surgery
}

describe("MobileCirugiaCard", () => {
  it("renders visible number, patient, institution, procedure", () => {
    render(
      <MobileCirugiaCard
        surgery={makeSurgery()}
        onOpen={vi.fn()}
        onOpenActions={vi.fn()}
      />
    )

    expect(screen.getByText("CX-0001")).toBeInTheDocument()
    expect(screen.getByText("Juan Pérez")).toBeInTheDocument()
    expect(screen.getByText("Hospital Central")).toBeInTheDocument()
    expect(screen.getByText("Artroplastia de rodilla")).toBeInTheDocument()
  })

  it("renders state and preparation badges with formatted date", () => {
    render(
      <MobileCirugiaCard
        surgery={makeSurgery()}
        onOpen={vi.fn()}
        onOpenActions={vi.fn()}
      />
    )

    expect(screen.getByText("Pendiente")).toBeInTheDocument()
    expect(screen.getByText("Sin preparar")).toBeInTheDocument()
    expect(screen.getByText("2026-10-15 · 08:30")).toBeInTheDocument()
  })

  it("shows the urgente pill when urgente flag is on", () => {
    render(
      <MobileCirugiaCard
        surgery={makeSurgery({ urgente: true })}
        onOpen={vi.fn()}
        onOpenActions={vi.fn()}
      />
    )

    expect(screen.getByText("Urgente")).toBeInTheDocument()
  })

  it("falls back to expedienteNumber then id slice when visibleNumber missing", () => {
    render(
      <MobileCirugiaCard
        surgery={makeSurgery({
          id: "abcdef1234567890",
          visibleNumber: undefined,
          expedienteNumber: "EXP-42",
        })}
        onOpen={vi.fn()}
        onOpenActions={vi.fn()}
      />
    )
    expect(screen.getByText("EXP-42")).toBeInTheDocument()
  })

  it("calls onOpen with the surgery when the card body is tapped", () => {
    const onOpen = vi.fn()
    const surgery = makeSurgery()
    render(
      <MobileCirugiaCard
        surgery={surgery}
        onOpen={onOpen}
        onOpenActions={vi.fn()}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: /abrir cirugía/i }))
    expect(onOpen).toHaveBeenCalledWith(surgery)
  })

  it("calls onOpenActions without triggering onOpen when the actions button is tapped", () => {
    const onOpen = vi.fn()
    const onOpenActions = vi.fn()
    const surgery = makeSurgery()
    render(
      <MobileCirugiaCard
        surgery={surgery}
        onOpen={onOpen}
        onOpenActions={onOpenActions}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: /acciones para/i }))
    expect(onOpenActions).toHaveBeenCalledWith(surgery)
    expect(onOpen).not.toHaveBeenCalled()
  })

  it("renders the primary action button when provided", () => {
    const onSelect = vi.fn()
    const action: MobileCardPrimaryAction = {
      id: "facturar",
      label: "Facturar",
      onSelect,
    }
    render(
      <MobileCirugiaCard
        surgery={makeSurgery()}
        onOpen={vi.fn()}
        onOpenActions={vi.fn()}
        primaryAction={action}
      />
    )

    const btn = screen.getByRole("button", { name: /facturar para/i })
    fireEvent.click(btn)
    expect(onSelect).toHaveBeenCalled()
  })
})