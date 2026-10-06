import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { DefineDateModal } from "@/components/coordinadores/modal/DefineDateModal"
import { CaseDetailModal } from "@/components/coordinadores/modal/CaseDetailModal"
import type { Surgery } from "@/types"

vi.mock("@/components/auth/AuthProvider", () => ({ useAuth: () => ({ activeCompany: { id: "company-1" } }) }))
vi.mock("@/components/shared/mentions/MentionComposer", () => ({ MentionComposer: () => null }))
vi.mock("@/components/coordinadores/modal/CaseDetailModalHeader", () => ({ CaseDetailModalHeader: () => null }))
vi.mock("@/components/coordinadores/modal/TabPaneGestion", () => ({ TabPaneGestion: () => null }))
vi.mock("@/components/coordinadores/modal/TabPaneAdjuntos", () => ({ TabPaneAdjuntos: () => null }))
vi.mock("@/components/coordinadores/modal/TabPaneComprobantes", () => ({ TabPaneComprobantes: () => null }))
vi.mock("@/components/coordinadores/modal/TabPaneReportes", () => ({ TabPaneReportes: () => null }))
vi.mock("@/components/expediente/NovedadesTabContent", () => ({ NovedadesTabContent: () => null }))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
const surgery = { id: "cx-1", backendId: "backend-1", date: "2026-10-06", time: "", patient: "Synthetic patient" } as Surgery

describe.each(["define", "gestion"])("%s rescheduling form", (kind) => {
  function form(onSave: () => Promise<void>, onClose: () => void, open = true) {
    return kind === "define" ? <DefineDateModal surgery={surgery} isOpen={open} onClose={onClose} onSave={onSave} /> : <CaseDetailModal surgery={surgery} isOpen={open} onClose={onClose} onSaveGestion={onSave} onAddNote={vi.fn()} history={[]} coordinators={[]} />
  }
  const save = () => screen.getByRole("button", { name: kind === "define" ? /Guardar y Programar/ : /Guardar Cambios/ })
  it("awaits save and prevents repeated submissions", async () => {
    let resolve!: () => void
    const onSave = vi.fn(() => new Promise<void>((done) => { resolve = done }))
    const onClose = vi.fn()
    render(form(onSave, onClose))
    fireEvent.click(save()); fireEvent.click(save())
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onClose).not.toHaveBeenCalled()
    expect(save()).toBeDisabled()
    await act(async () => resolve())
    expect(onClose).toHaveBeenCalledTimes(1)
  })
  it("retains the draft and reports save errors", async () => {
    const onClose = vi.fn()
    render(form(vi.fn().mockRejectedValue(new Error("Offline")), onClose))
    if (kind === "define") fireEvent.change(screen.getByLabelText(/Fecha de Cirugía/), { target: { value: "2026-10-07" } })
    fireEvent.click(save())
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Offline"))
    expect(onClose).not.toHaveBeenCalled()
    if (kind === "define") expect(screen.getByLabelText(/Fecha de Cirugía/)).toHaveValue("2026-10-07")
  })
  it("does not close a same-case reopened dialog from an old response", async () => {
    let resolve!: () => void
    const onSave = vi.fn(() => new Promise<void>((done) => { resolve = done }))
    const onClose = vi.fn()
    const view = render(form(onSave, onClose))
    fireEvent.click(save())
    view.rerender(form(onSave, onClose, false))
    view.rerender(form(onSave, onClose, true))
    await act(async () => resolve())
    expect(onClose).not.toHaveBeenCalled()
  })
})
