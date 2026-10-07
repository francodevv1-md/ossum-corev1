import React from "react"
import { describe, expect, it, vi } from "vitest"
import { render, screen, cleanup, within } from "@testing-library/react"
import { ALL_STATES, CX_STATE_VISUALS, getCxStateVisual } from "@/lib/cirugias.constants"
import { CX_STATE_COLORS, getCxStateColorKey } from "@/lib/shared-constants"
import { CirugiaStatusCell } from "@/components/cirugias/CirugiaStatusCell"
import { MobileCirugiaCard } from "@/components/cirugias/MobileCirugiaCard"
import { ColorReferenceDialog } from "@/components/cirugias/view-customization/ColorReferenceDialog"
import { ChangeStateDialog } from "@/components/cirugias/dialogs/ChangeStateDialog"
import { ExpedienteHeader } from "@/components/expediente/ExpedienteHeader"
import { buildExpedienteHeaderModel } from "@/components/expediente/expediente-header.model"
import type { Surgery } from "@/types"

function makeTestSurgery(overrides: Partial<Surgery> = {}): Surgery {
  return {
    id: "cx-test-1",
    state: "Autorizada",
    date: "",
    time: "08:00",
    patient: "Juan Perez",
    institution: "Sanatorio Central",
    client: "OSDE",
    surgeon: "Dr. Gomez",
    classification: "Osteosíntesis",
    preparationState: "Sin preparar",
    urgente: false,
    ...overrides,
  } as Surgery
}

function renderTestHeader(surgery: Surgery) {
  const model = buildExpedienteHeaderModel({
    surgery,
    docStatus: "Incompleta",
    presupuestoId: "PR-1",
    facturacionStatus: "pending",
    cobrosTotal: 0,
    pendiente: { text: "Sin pendientes", color: "" },
  })
  return render(
    <ExpedienteHeader
      surgery={surgery}
      docStatus="Incompleta"
      presupuestoId="PR-1"
      model={model}
      onEditFicha={vi.fn()}
      onViewPR={vi.fn()}
      onGeneratePR={vi.fn()}
      onViewDocumentacion={vi.fn()}
      onViewRemitos={vi.fn()}
      onViewConsumo={vi.fn()}
      onSetDialogSurgery={vi.fn()}
      onSetFacturarDialogOpen={vi.fn()}
      onAddNoteToSeguimiento={vi.fn()}
      onSetSuspendDialogOpen={vi.fn()}
      onSetCancelDialogOpen={vi.fn()}
      onSetChangeStateDialogOpen={vi.fn()}
      onSetChangeDateDialogOpen={vi.fn()}
      onSetNewState={vi.fn()}
      onRecover={vi.fn()}
    />
  )
}

describe("requested surgery presentation palette", () => {
  it("retains existing states in the requested visual order, without the deferred category", () => {
    expect(ALL_STATES).toEqual([
      "Sin autorizar", "Pendiente", "Autorizada",
      "En tránsito", "Realizada", "Finalizada", "Suspendida",
      "Cancelada", "Sin consumo",
    ])
    expect(Object.keys(CX_STATE_VISUALS).sort()).toEqual([...ALL_STATES, "Sin fecha"].sort())
    expect(Object.keys(CX_STATE_COLORS).sort()).toEqual([...ALL_STATES, "Sin fecha"].sort())
  })

  it("maps the state colors consistently across badges and table visuals", () => {
    const cases = [
      ["Sin autorizar", "bg-white", "#FFFFFF"], ["Sin fecha", "bg-white", "#FFFFFF"],
      ["Pendiente", "bg-yellow-400", "#FACC15"], ["Autorizada", "bg-emerald-500", "#10B981"],
      ["En tránsito", "bg-sky-300", "#7DD3FC"], ["Realizada", "bg-emerald-700", "#047857"],
      ["Finalizada", "bg-blue-800", "#1E40AF"], ["Suspendida", "bg-violet-600", "#7C3AED"],
      ["Cancelada", "bg-rose-900", "#881337"], ["Sin consumo", "bg-gray-600", "#4B5563"],
    ]
    for (const [state, bg, hex] of cases) {
      expect(CX_STATE_COLORS[state]).toContain(bg)
      expect(CX_STATE_VISUALS[state].strongClass).toContain(bg)
      expect(CX_STATE_VISUALS[state].strong).toBe(hex)
    }
  })

  it("colors undated Autorizada and Pendiente white without changing stored labels (F2)", () => {
    for (const date of [null, "", "   "]) {
      expect(getCxStateColorKey("Autorizada", date)).toBe("Sin fecha")
      expect(getCxStateVisual("Autorizada", date).strong).toBe("#FFFFFF")
      expect(getCxStateColorKey("Pendiente", date)).toBe("Sin fecha")
      expect(getCxStateVisual("Pendiente", date).strong).toBe("#FFFFFF")
    }

    expect(getCxStateVisual("Autorizada", "2026-10-05").strong).toBe("#10B981")
    expect(getCxStateVisual("Pendiente", "2026-10-05").strong).toBe("#FACC15")

    // Static fallback for undefined date (options in dropdowns/selectors)
    expect(getCxStateColorKey("Autorizada")).toBe("Autorizada")
    expect(getCxStateColorKey("Pendiente")).toBe("Pendiente")

    for (const state of ALL_STATES.filter((state) => state !== "Autorizada" && state !== "Pendiente")) {
      expect(getCxStateColorKey(state, "")).toBe(state)
    }

    // Label preserved for Autorizada
    render(<CirugiaStatusCell state="Autorizada" date="" variant="a" asCell={false} />)
    expect(screen.getByText("Autorizada")).toHaveClass("text-slate-900", "bg-white")
    cleanup()

    // Label preserved for Pendiente
    render(<CirugiaStatusCell state="Pendiente" date="" variant="a" asCell={false} />)
    expect(screen.getByText("Pendiente")).toHaveClass("text-slate-900", "bg-white")
    cleanup()
  })

  it("keeps white and yellow solid status labels readable for both variants a and d", () => {
    for (const state of ["Sin autorizar", "Pendiente", "Autorizada", "En tránsito"]) {
      for (const variant of ["a", "d"] as const) {
        render(<CirugiaStatusCell state={state} variant={variant} asCell={false} />)
        expect(screen.getByText(state)).toHaveClass("text-slate-900")
        expect(screen.getByText(state)).not.toHaveClass("text-white")
        cleanup()
      }
    }
  })

  it("renders the color guide with explicit evidence caveats and ordered badges (F1)", () => {
    render(<ColorReferenceDialog open onOpenChange={() => {}} />)

    // Rendered warning / caveat banner
    expect(
      screen.getByText(/Los colores reflejan el estado operativo de la cirugía y no verifican por sí solos comprobantes de consumo ni facturas emitidas/i)
    ).toBeInTheDocument()

    // Realizada caveat
    expect(
      screen.getByText(/Estado Realizada\. El color no confirma por sí solo la existencia de consumo registrado\./i)
    ).toBeInTheDocument()

    // Finalizada caveat
    expect(
      screen.getByText(/Estado Finalizada\. El color no acredita por sí solo una factura emitida\./i)
    ).toBeInTheDocument()

    // Order check
    const labels = ALL_STATES.map((state) => screen.getByText(state))
    expect(labels).toHaveLength(9)
    for (let i = 1; i < labels.length; i++) {
      expect(labels[i - 1].compareDocumentPosition(labels[i]) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0)
    }
    expect(screen.getByText("Sin autorizar")).toHaveClass("bg-white", "text-slate-900")
    expect(screen.getByText("Autorizada")).toHaveClass("bg-emerald-500")
    expect(screen.getByText(/Estado Autorizada: verde con fecha quirúrgica; blanco sin fecha/)).toBeInTheDocument()
    expect(screen.queryByText("Sin autorizar / Sin fecha")).not.toBeInTheDocument()
    expect(screen.queryByText("Sin fecha", { exact: true })).not.toBeInTheDocument()
    expect(screen.getByText(/pendiente de autorización\. También puede no tener fecha quirúrgica; la ausencia de fecha no es un estado de cirugía/)).toBeInTheDocument()
    cleanup()
  })

  it("renders date-aware current and new state badges in ChangeStateDialog (F3)", () => {
    // 1. Undated case: current Autorizada undated and new Pendiente undated -> both white with border
    const { unmount: unmount1 } = render(
      <ChangeStateDialog
        open={true}
        onOpenChange={vi.fn()}
        dialogSurgery={{ id: "cx-1", state: "Autorizada", date: "" }}
        newState="Pendiente"
        setNewState={vi.fn()}
        onConfirm={vi.fn()}
      />
    )
    const currentBadge = within(screen.getByText("Estado Actual").parentElement!).getByText("Autorizada")
    const newBadge = within(screen.getByText("Nuevo Estado").parentElement!).getByText("Pendiente")
    expect(currentBadge).toHaveClass("bg-white", "text-slate-900", "border-slate-300")
    expect(newBadge).toHaveClass("bg-white", "text-slate-900", "border-slate-300")
    unmount1()

    // 2. Dated case: authorized is green; pending remains yellow.
    const { unmount: unmount2 } = render(
      <ChangeStateDialog
        open={true}
        onOpenChange={vi.fn()}
        dialogSurgery={{ id: "cx-2", state: "Autorizada", date: "2026-10-06" }}
        newState="Pendiente"
        setNewState={vi.fn()}
        onConfirm={vi.fn()}
      />
    )
    const currentBadgeDated = within(screen.getByText("Estado Actual").parentElement!).getByText("Autorizada")
    const newBadgeDated = within(screen.getByText("Nuevo Estado").parentElement!).getByText("Pendiente")
    expect(currentBadgeDated).toHaveClass("bg-emerald-500", "text-slate-900")
    expect(newBadgeDated).toHaveClass("bg-yellow-400", "text-slate-900")
    unmount2()
  })

  it("renders white Ficha status button with visible boundary border (Defect 4)", () => {
    // Undated Autorizada -> white with border
    const { unmount: unmount1 } = renderTestHeader(makeTestSurgery({ state: "Autorizada", date: "" }))
    const whiteButton = screen.getByRole("button", { name: /Estado CX/i })
    expect(whiteButton).toHaveClass("bg-white", "text-slate-900", "border-slate-300")
    unmount1()

    // Dated Autorizada -> green without border-slate-300
    const { unmount: unmount2 } = renderTestHeader(makeTestSurgery({ state: "Autorizada", date: "2026-10-06" }))
    const greenButton = screen.getByRole("button", { name: /Estado CX/i })
    expect(greenButton).toHaveClass("bg-emerald-500", "text-slate-900")
    expect(greenButton).not.toHaveClass("border-slate-300")
    unmount2()
  })

  it("distinguishes authorized and pending in every status variant and mobile without changing labels", () => {
    for (const state of ["Autorizada", "Pendiente"] as const) {
      const bg = state === "Autorizada" ? "bg-emerald-500" : "bg-yellow-400"
      const hex = state === "Autorizada" ? "#10B981" : "#FACC15"
      for (const variant of ["a", "b", "c", "d"] as const) {
        const { container, unmount } = render(
          <CirugiaStatusCell state={state} date="2026-10-07" variant={variant} asCell={false} />
        )
        expect(screen.getByText(state)).toBeInTheDocument()
        expect(container.querySelector(`.${bg}`)).not.toBeNull()
        if (variant === "b" || variant === "c") {
          expect(container.querySelector(`.${bg}`)).toHaveStyle({ backgroundColor: hex })
        }
        unmount()
      }
      const { unmount } = render(
        <MobileCirugiaCard surgery={makeTestSurgery({ state, date: "2026-10-07" })}
          onOpen={vi.fn()} onOpenActions={vi.fn()} />
      )
      expect(screen.getByText(state)).toHaveClass(bg, "text-slate-900")
      unmount()
    }
    const colors = ALL_STATES.map((state) => CX_STATE_VISUALS[state].strong)
    expect(new Set(colors).size).toBe(ALL_STATES.length)
  })
})
