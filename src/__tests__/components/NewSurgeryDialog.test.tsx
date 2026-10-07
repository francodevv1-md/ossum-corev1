/**
 * NewSurgeryDialog.test.tsx — NUEVA-CIRUGIA-IA-UX-P1 (Phase A, DESIGN §8.5)
 *
 * Focused render test (NOT a full snapshot of the 1710-line component).
 * Mocks the heavy dependencies (store, auth, AI hook, lookup field, selector,
 * presupuesto children) to thin stubs and verifies the Phase A integration:
 * - MissingFieldsBar mounts on Paso 0 with the right chips after Siguiente click
 * - MissingCountText renders "Faltan N obligatorios" in the footer
 * - "Siguiente" stays enabled regardless of the error count (AC-04)
 * - clicking the Paciente chip focuses the [data-step0-field="patient"] input (AC-01)
 *
 * The real MissingFieldsBar and MissingCountText sub-components are exercised
 * here (only the surrounding heavy children/hooks are mocked).
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react"
import { useState } from "react"

import { NewSurgeryDialog } from "@/components/cirugias/dialogs/NewSurgeryDialog"
import { findContactCandidates, scoreContactMatch } from "@/components/cirugias/dialogs/NewSurgeryDialog"
import { EMPTY_NEW_FORM } from "@/lib/cirugias.types"
import type { NewSurgeryForm } from "@/lib/cirugias.types"
import type { Contacto } from "@/types"
import type { SurgeryIntakeResult } from "@/hooks/useCirugiaActions"
import { ApiClientError } from "@/lib/api/client"

const { apiFetchMock, toastSuccessMock, toastErrorMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(), toastSuccessMock: vi.fn(), toastErrorMock: vi.fn(),
}))
let mockCompanyId = "test-co"
vi.mock("@/lib/api/client", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/api/client")>(), apiFetch: apiFetchMock,
}))
vi.mock("sonner", () => ({ toast: { success: toastSuccessMock, error: toastErrorMock } }))

// ─── Mocks: heavy dependencies are stubbed to keep the focused render stable ───

const initialLookupCallbacks = new Map<string, (contacto: unknown) => void>()
const latestLookupCallbacks = new Map<string, (contacto: unknown) => void>()
let mockAiHookState: {
  extract: ReturnType<typeof vi.fn>
  result: unknown
  error: string | null
  isProcessing: boolean
  reset: ReturnType<typeof vi.fn>
}

const mockStore = {
  surgeries: [] as { id: string; backendId?: string }[],
  contactos: [] as Contacto[],
  classifications: [] as string[],
  getContactoById: (id: string) => mockStore.contactos.find((contacto) => contacto.id === id),
}

vi.mock("@/lib/store", () => ({
  useOrtoTrackStore: () => mockStore,
}))

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({ activeCompany: { id: mockCompanyId } }),
}))

vi.mock("@/hooks/useAiExtraction", () => ({
  useAiExtraction: () => mockAiHookState,
}))

// ContactLookupField stub: renders an <input> inside the data-step0-field wrapper
// so MissingFieldsBar's focus logic (querySelector('input, button, select, textarea'))
// resolves to a focusable element.
vi.mock("@/components/contactos/ContactLookupField", () => ({
  ContactLookupField: ({
    label,
    error,
    value,
    onChange,
  }: {
    label?: string
    error?: string
    value?: Contacto | null
    onChange?: (contacto: unknown) => void
  }) => {
    if (label && onChange) {
      if (!initialLookupCallbacks.has(label)) {
        initialLookupCallbacks.set(label, onChange)
      }
      latestLookupCallbacks.set(label, onChange)
    }

    return (
      <div>
        {label && <label>{label}</label>}
        <input type="text" data-testid={`clf-${label}`} />
        <div data-testid={`clf-value-${label}`}>{value?.nombre || "Sin contacto"}</div>
        {error && <p data-testid="clf-error">{error}</p>}
      </div>
    )
  },
}))

// ClasificacionSelectorModal stub: renders the trigger child (a <button>) so the
// data-step0-field="classification" wrapper's querySelector('button') resolves.
vi.mock("@/components/presupuestos/ClasificacionSelectorModal", () => ({
  ClasificacionSelectorModal: ({ children }: { children: (open: () => void) => React.ReactNode }) => (
    <>{children(() => {})}</>
  ),
}))

// Presupuesto / post-creation / contact-form children are not exercised on Paso 0;
// stub them to null to avoid loading their dependency trees.
vi.mock("@/components/presupuestos/CondicionesSection", () => ({ CondicionesSection: () => null }))
vi.mock("@/components/presupuestos/PresupuestoItemsTable", () => ({ PresupuestoItemsTable: () => null }))
vi.mock("@/components/presupuestos/TotalesSection", () => ({ TotalesSection: () => null }))
vi.mock("@/components/presupuestos/TemplateSelector", () => ({ TemplateSelector: () => null }))
vi.mock("@/components/presupuestos/ImportSubmodal", () => ({ ImportSubmodal: () => null }))
vi.mock("@/components/presupuestos/LeyendaPresupuestoSection", () => ({ LeyendaPresupuestoSection: () => null }))
vi.mock("@/components/contactos/ContactoFormDialog", () => ({ ContactoFormDialog: () => null }))
vi.mock("@/components/cirugias/AiResultsPanel", () => ({ AiResultsPanel: () => null }))
vi.mock("@/components/cirugias/AiUploadZone", () => ({ AiUploadZone: () => null }))

// ─── Helpers ───

type DialogProps = Parameters<typeof NewSurgeryDialog>[0]

function buildPrFormStub(): DialogProps["prForm"] {
  return {
    formData: {} as DialogProps["prForm"]["formData"],
    updateField: vi.fn(),
    items: [],
    addItem: vi.fn(),
    removeItem: vi.fn(),
    updateItem: vi.fn(),
    errors: {} as DialogProps["prForm"]["errors"],
    validate: vi.fn(() => true),
    subtotal: 0,
    descuento: 0,
    descuentoMonto: 0,
    iva: "21",
    ivaPercentage: 21,
    ivaMonto: 0,
    ivaDesglose: {},
    descuentoLineasMonto: 0,
    total: 0,
    articuloZCount: 0,
    articuloLibreCount: 0,
    resetForm: vi.fn(),
    loadTemplate: vi.fn(),
    addItems: vi.fn(),
  } as unknown as DialogProps["prForm"]
}

function renderDialog(initialForm: NewSurgeryForm = EMPTY_NEW_FORM) {
  const setWizardStep = vi.fn()
  const onOpenChange = vi.fn()
  const onConfirm = vi.fn()

  function Wrapper() {
    const [newForm, setNewForm] = useState<NewSurgeryForm>(initialForm)
    const [createPRNow, setCreatePRNow] = useState(false)
    return (
      <>
        <NewSurgeryDialog
          open
          onOpenChange={onOpenChange}
          wizardStep={0}
          setWizardStep={setWizardStep}
          newForm={newForm}
          setNewForm={setNewForm}
          createPRNow={createPRNow}
          setCreatePRNow={setCreatePRNow}
          prForm={buildPrFormStub()}
          onConfirm={onConfirm}
          instrumentadores={[]}
        />
        <pre data-testid="form-state">{JSON.stringify(newForm)}</pre>
      </>
    )
  }

  return { ...render(<Wrapper />), setWizardStep, onOpenChange, onConfirm }
}

function renderDialogWithFormControls(initialForm: NewSurgeryForm = EMPTY_NEW_FORM) {
  const setWizardStep = vi.fn()
  const onOpenChange = vi.fn()
  const onConfirm = vi.fn()

  function Wrapper() {
    const [newForm, setNewForm] = useState<NewSurgeryForm>(initialForm)
    const [createPRNow, setCreatePRNow] = useState(false)

    return (
      <>
        <button
          type="button"
          data-testid="set-provincia"
          onClick={() => setNewForm((prev) => ({ ...prev, provincia: "Buenos Aires" }))}
        >
          Set provincia
        </button>
        <button
          type="button"
          data-testid="set-localidad"
          onClick={() => setNewForm((prev) => ({ ...prev, provincia: "Buenos Aires", localidad: "La Plata" }))}
        >
          Set localidad
        </button>
        <NewSurgeryDialog
          open
          onOpenChange={onOpenChange}
          wizardStep={0}
          setWizardStep={setWizardStep}
          newForm={newForm}
          setNewForm={setNewForm}
          createPRNow={createPRNow}
          setCreatePRNow={setCreatePRNow}
          prForm={buildPrFormStub()}
          onConfirm={onConfirm}
          instrumentadores={[]}
        />
        <pre data-testid="form-state">{JSON.stringify(newForm)}</pre>
      </>
    )
  }

  return { ...render(<Wrapper />), setWizardStep, onOpenChange, onConfirm }
}

function buildContacto(overrides: Partial<Contacto>): Contacto {
  return {
    id: overrides.id ?? "ct-1",
    codigoContacto: overrides.codigoContacto ?? "C-0001",
    tipoPersona: overrides.tipoPersona ?? "fisica",
    nombre: overrides.nombre ?? "Contacto Test",
    estado: overrides.estado ?? "activo",
    roles: overrides.roles ?? ["cliente"],
    groups: overrides.groups ?? [],
    createdAt: overrides.createdAt ?? "2026-01-01T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-01-01T00:00:00.000Z",
    ...overrides,
  }
}

describe("NewSurgeryDialog — NUEVA-CIRUGIA-IA-UX-P1 (Phase A, focused render)", () => {
  beforeEach(() => {
    mockCompanyId = "test-co"
    apiFetchMock.mockReset()
    toastSuccessMock.mockReset()
    toastErrorMock.mockReset()
    initialLookupCallbacks.clear()
    latestLookupCallbacks.clear()
    mockStore.contactos = []
    mockStore.surgeries = []
    mockStore.classifications = []
    mockAiHookState = {
      extract: vi.fn(),
      result: null,
      error: null,
      isProcessing: false,
      reset: vi.fn(),
    }

    // jsdom does not implement scrollIntoView; polyfill as a no-op so the
    // MissingFieldsBar focus path (scrollIntoView on the focused input) does not warn.
    if (typeof Element.prototype.scrollIntoView !== "function") {
      Element.prototype.scrollIntoView = function () {}
    }
  })

  it("does not show the MissingFieldsBar or footer count before Siguiente is clicked (step0Errors empty)", () => {
    renderDialog()
    expect(screen.queryByText("Faltan datos obligatorios:")).toBeNull()
    expect(screen.queryByText(/Faltan \d+ obligatorio/)).toBeNull()
  })

  it("renders MissingFieldsBar chips + 'Faltan 2 obligatorios' after Siguiente click on an empty patient/classification form (AC-01/AC-04)", () => {
    // Fill surgeon/institution/client so only patient + classification are missing.
    const form: NewSurgeryForm = {
      ...EMPTY_NEW_FORM,
      surgeon: "Dr. Gómez",
      institution: "Hospital A",
      client: "Cliente Test",
    }
    renderDialog(form)

    const nextBtn = screen.getByTestId("wizard-next-btn")
    act(() => {
      fireEvent.click(nextBtn)
    })

    // MissingFieldsBar chips (visual order: client before patient when both are present).
    expect(screen.getByRole("button", { name: "Paciente" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Clasificación" })).toBeInTheDocument()
    // Non-missing fields do NOT produce chips.
    expect(screen.queryByRole("button", { name: "Médico" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Institución" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Cliente / Pagador" })).toBeNull()
    // Footer count.
    expect(screen.getByText("Faltan 2 obligatorios")).toBeInTheDocument()
  })

  it("keeps the Siguiente button enabled regardless of the missing-required count (AC-04)", () => {
    // All required fields empty → 5 errors after click.
    renderDialog(EMPTY_NEW_FORM)
    const nextBtn = screen.getByTestId("wizard-next-btn") as HTMLButtonElement
    expect(nextBtn.disabled).toBe(false)
    act(() => {
      fireEvent.click(nextBtn)
    })
    // After validation runs, the button must remain enabled (no proactive disable).
    expect(nextBtn.disabled).toBe(false)
    expect(screen.getByText("Faltan 5 obligatorios")).toBeInTheDocument()
  })

  it("does NOT advance the wizard when validation fails (setWizardStep not called with 1)", () => {
    const { setWizardStep } = renderDialog(EMPTY_NEW_FORM)
    act(() => {
      fireEvent.click(screen.getByTestId("wizard-next-btn"))
    })
    expect(setWizardStep).not.toHaveBeenCalledWith(1)
  })

  it("focuses the [data-step0-field='patient'] input when the Paciente chip is clicked (AC-01)", () => {
    const form: NewSurgeryForm = {
      ...EMPTY_NEW_FORM,
      surgeon: "Dr. Gómez",
      institution: "Hospital A",
      client: "Cliente Test",
    }
    renderDialog(form)

    act(() => {
      fireEvent.click(screen.getByTestId("wizard-next-btn"))
    })

    const chip = screen.getByRole("button", { name: "Paciente" })
    act(() => {
      fireEvent.click(chip)
    })

    const patientInput = screen.getByTestId("clf-Paciente *")
    expect(document.activeElement).toBe(patientInput)
  })

  it("preserves sibling contact state when a stale patient callback resolves later", () => {
    renderDialog()

    const stalePatientOnChange = initialLookupCallbacks.get("Paciente *")
    const latestClientOnChange = latestLookupCallbacks.get("Cliente / Pagador *")

    expect(stalePatientOnChange).toBeTypeOf("function")
    expect(latestClientOnChange).toBeTypeOf("function")

    act(() => {
      latestClientOnChange?.({ id: "cli-1", nombre: "Cliente Uno" })
    })

    act(() => {
      stalePatientOnChange?.({ id: "pat-1", nombre: "Paciente Uno" })
    })

    expect(screen.getByTestId("form-state").textContent).toContain('"client":"Cliente Uno"')
    expect(screen.getByTestId("form-state").textContent).toContain('"patient":"Paciente Uno"')
    expect(screen.getByTestId("form-state").textContent).toContain('"clientContactId":"cli-1"')
    expect(screen.getByTestId("form-state").textContent).toContain('"patientContactId":"pat-1"')
  })

  it("prefers patient-group contacts over non-patient contacts with similar names", () => {
    const ranked = findContactCandidates({
      contactos: [
        buildContacto({ id: "med-1", nombre: "Encina Marisol Itati", groups: ["medicos"], datosMedico: { matricula: "M-1" } }),
        buildContacto({ id: "pat-1", nombre: "Encina Marisol Itati", groups: ["pacientes"] }),
      ],
      field: "patient",
      detectedName: "ENCINA MARISOL ITATI",
    })

    expect(ranked[0]?.contacto.id).toBe("pat-1")
    expect(ranked.some((candidate) => candidate.contacto.id === "med-1")).toBe(false)
  })

  it("gives patient DNI matches a strong score when the patient group is compatible", () => {
    const candidate = scoreContactMatch({
      contacto: buildContacto({ id: "pat-2", nombre: "Maria Test", dni: "30.123.456", groups: ["pacientes"] }),
      field: "patient",
      detectedName: "MARIA TEST",
      detectedDni: "30123456",
    })

    expect(candidate).not.toBeNull()
    expect(candidate?.score ?? 0).toBeGreaterThanOrEqual(100)
    expect(candidate?.reason).toContain("DNI coincide")
  })

  it("prefers institution-compatible contacts for institution suggestions", () => {
    const ranked = findContactCandidates({
      contactos: [
        buildContacto({ id: "cli-2", nombre: "Centro Trauma Norte", groups: ["obras_sociales"], datosClientePagador: { esPagador: true, condicionIva: "Exento" } }),
        buildContacto({ id: "inst-1", nombre: "Centro Trauma Norte", groups: ["instituciones"], tipoPersona: "juridica", datosInstitucion: { observacionEntrega: "Recepción principal" } }),
      ],
      field: "institution",
      detectedName: "CENTRO TRAUMA NORTE",
    })

    expect(ranked[0]?.contacto.id).toBe("inst-1")
  })

  it("renders inline contact suggestions below the wizard field instead of the lateral panel", () => {
    mockAiHookState.result = {
      confidence: 0.82,
      extracted: {
        paciente: "ENCINA MARISOL ITATI",
        dni: "30123456",
        medico: "",
        institucion: "",
        obra_social: "",
        fecha_cirugia: "2026-07-01",
        fecha_probable: "2026-07-03",
        patologia_sugerida: "",
        provincia_sugerida: "Corrientes",
        localidad_sugerida: "Capital",
        material_autorizado: [],
        observaciones: "",
      },
    }

    renderDialog()

    expect(screen.getByText("Detectado por IA:")).toBeInTheDocument()
    expect(screen.getByText("ENCINA MARISOL ITATI")).toBeInTheDocument()
    expect(screen.getByText("Sin coincidencia clara en contactos existentes.")).toBeInTheDocument()
    expect(screen.getByText("IA detectó fecha de cirugía")).toBeInTheDocument()
    expect(screen.getByText("IA detectó fecha probable")).toBeInTheDocument()
    expect(screen.getByText("IA detectó ubicación")).toBeInTheDocument()
    expect(screen.getByText("Localidad sugerida: Capital")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Mantener texto" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Crear paciente" })).toBeInTheDocument()
  })

  it("shows an explicit text-only indicator after clicking 'Mantener texto'", () => {
    mockAiHookState.result = {
      confidence: 0.82,
      extracted: {
        paciente: "ENCINA MARISOL ITATI",
        dni: "30123456",
        medico: "",
        institucion: "",
        obra_social: "",
        fecha_cirugia: "",
        fecha_probable: "",
        patologia_sugerida: "",
        provincia_sugerida: "",
        localidad_sugerida: "",
        material_autorizado: [],
        observaciones: "",
      },
    }

    renderDialog()

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Mantener texto" }))
    })

    expect(screen.getByText("Texto sin contacto vinculado.")).toBeInTheDocument()
    expect(screen.getByText(/no queda asociado a una ficha de contacto/i)).toBeInTheDocument()
    expect(screen.getByTestId("form-state").textContent).toContain('"patient":"ENCINA MARISOL ITATI"')
    expect(screen.getByTestId("form-state").textContent).not.toContain("patientContactId")
  })

  it("uses contextual quick-create labels for AI contact suggestions", () => {
    mockAiHookState.result = {
      confidence: 0.82,
      extracted: {
        paciente: "Paciente Detectado",
        dni: "30123456",
        medico: "Dra. Médica",
        institucion: "Sanatorio Norte",
        obra_social: "OS Pagadora",
        fecha_cirugia: "",
        fecha_probable: "",
        patologia_sugerida: "",
        provincia_sugerida: "",
        localidad_sugerida: "",
        material_autorizado: [],
        observaciones: "",
      },
    }

    renderDialog()

    expect(screen.getByRole("button", { name: "Crear paciente" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Crear médico" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Crear institución" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Crear pagador" })).toBeInTheDocument()
  })

  it("keeps the exact suggested contact when clicking 'Usar'", () => {
    mockStore.contactos = [
      buildContacto({ id: "sur-1", codigoContacto: "MED-001", nombre: "Dr. De Biasi", dni: "20111222", groups: ["medicos"], datosMedico: { matricula: "A1" } }),
      buildContacto({ id: "sur-2", codigoContacto: "MED-002", nombre: "Dr. De Biasi Consultor", dni: "20999888", groups: ["medicos"], datosMedico: { matricula: "B2" } }),
    ]

    mockAiHookState.result = {
      confidence: 0.9,
      extracted: {
        paciente: "",
        dni: "",
        medico: "dr. de biasi",
        institucion: "",
        obra_social: "",
        fecha_cirugia: "",
        fecha_probable: "",
        patologia_sugerida: "",
        provincia_sugerida: "",
        localidad_sugerida: "",
        material_autorizado: [],
        observaciones: "",
      },
    }

    renderDialog()

    expect(screen.getByText((_, element) =>
      element?.tagName.toLowerCase() === "p" && Boolean(element.textContent?.includes("MED-001"))
    )).toBeInTheDocument()

    act(() => {
      fireEvent.click(screen.getAllByRole("button", { name: "Usar" })[0])
    })

    expect(screen.getByTestId("form-state").textContent).toContain('"surgeonContactId":"sur-1"')
    expect(screen.getByTestId("form-state").textContent).toContain('"surgeon":"Dr. De Biasi"')
  })

  it("prefers the exact selected suggestion object even if store lookup for that id would resolve another contact", () => {
    const wrongButSameId = buildContacto({
      id: "dup-1",
      codigoContacto: "C-0025",
      nombre: "Angel Ariel Garcia",
      groups: ["pacientes"],
    })
    const suggested = buildContacto({
      id: "dup-1",
      codigoContacto: "C-0030",
      nombre: "Encina Marisol Itati",
      groups: ["pacientes"],
      dni: "30123456",
    })

    mockStore.contactos = [wrongButSameId, suggested]

    mockAiHookState.result = {
      confidence: 0.9,
      extracted: {
        paciente: "ENCINA MARISOL ITATI",
        dni: "30123456",
        medico: "",
        institucion: "",
        obra_social: "",
        fecha_cirugia: "",
        fecha_probable: "",
        patologia_sugerida: "",
        provincia_sugerida: "",
        localidad_sugerida: "",
        material_autorizado: [],
        observaciones: "",
      },
    }

    renderDialog()

    act(() => {
      fireEvent.click(screen.getAllByRole("button", { name: "Usar" })[0])
    })

    expect(screen.getByTestId("form-state").textContent).toContain('"patientContactId":"dup-1"')
    expect(screen.getByTestId("clf-value-Paciente *").textContent).toBe("Encina Marisol Itati")
  })

  it("marks the current wizard step in the top control", () => {
    renderDialog()

    expect(screen.getByLabelText("Wizard steps")).toBeInTheDocument()
    expect(screen.getByText("Datos del caso").closest("div")?.getAttribute("aria-current")).toBe("step")
  })

  it("clears institution-derived geography when switching to an institution without an address", () => {
    const institutionA = { id: "institution-a", nombre: "Institution A", provincia: "Corrientes", localidad: "Goya" } as Contacto
    const institutionB = { id: "institution-b", nombre: "Institution B" } as Contacto
    mockStore.contactos = [institutionA, institutionB]
    renderDialog()
    act(() => latestLookupCallbacks.get("Institución *")!(institutionA))
    expect(JSON.parse(screen.getByTestId("form-state").textContent!)).toMatchObject({ provincia: "Corrientes", localidad: "Goya" })
    act(() => latestLookupCallbacks.get("Institución *")!(institutionB))
    expect(JSON.parse(screen.getByTestId("form-state").textContent!)).toMatchObject({ institutionContactId: "institution-b", provincia: "", localidad: "" })
    act(() => latestLookupCallbacks.get("Institución *")!(institutionA))
    act(() => latestLookupCallbacks.get("Institución *")!(null))
    expect(JSON.parse(screen.getByTestId("form-state").textContent!)).toMatchObject({ institution: "", provincia: "", localidad: "" })
  })

  it("preserves manual geography on institution selection when automatic remittance is off", () => {
    const institution = { id: "institution-b", nombre: "Institution B" } as Contacto
    mockStore.contactos = [institution]
    renderDialogWithFormControls()
    fireEvent.click(screen.getByRole("switch", { name: /Remitir a la institución por defecto/i }))
    fireEvent.click(screen.getByTestId("set-provincia"))
    act(() => latestLookupCallbacks.get("Institución *")!(institution))
    expect(JSON.parse(screen.getByTestId("form-state").textContent!)).toMatchObject({ provincia: "Buenos Aires" })
  })

  it("keeps provincia/localidad Selects controlled from first render", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    renderDialogWithFormControls()

    act(() => {
      fireEvent.click(screen.getByTestId("set-provincia"))
      fireEvent.click(screen.getByTestId("set-localidad"))
    })

    expect(
      consoleErrorSpy.mock.calls.some(([message]) =>
        typeof message === "string" && message.includes("uncontrolled") && message.includes("controlled")
      )
    ).toBe(false)

    consoleErrorSpy.mockRestore()
  })

  function renderIntakeResult(result: SurgeryIntakeResult, confirm?: DialogProps["onConfirm"]) {
    const prForm = buildPrFormStub()
    prForm.formData = { ...prForm.formData, fechaEmision: "2026-10-07", vigencia: "30 días", concepto: "Keep concept", clientContactId: "payer-1" }
    prForm.items = [{ name: "Implant", code: "IMP", quantity: 2, unitPrice: 100, ivaKey: "21", catalogItemId: "catalog-1", discountPercent: 0, isArticuloLibre: false, descripcionLibre: "", codeResolved: true }]
    const props: DialogProps = {
      open: true, onOpenChange: vi.fn(), wizardStep: 2, setWizardStep: vi.fn(),
      newForm: { ...EMPTY_NEW_FORM, patient: "Keep patient", notes: "Keep notes" }, setNewForm: vi.fn(),
      createPRNow: true, setCreatePRNow: vi.fn(), prForm,
      onConfirm: confirm ?? vi.fn().mockResolvedValue(result), createdSurgeryId: result.surgeryId, instrumentadores: [],
      onOpenCreatedSurgery: vi.fn(),
    }
    return { ...render(<NewSurgeryDialog {...props} />), props }
  }

  const partialResult: SurgeryIntakeResult = {
    surgeryId: "db-surgery-1", companyId: "test-co", budget: "missing", attachment: "not-requested", refreshFailed: false,
  }

  it("preserves partial intake data and reconciles before posting a budget with backend ID", async () => {
    apiFetchMock.mockResolvedValueOnce([]).mockResolvedValueOnce({ id: "budget-1" })
    const { props } = renderIntakeResult(partialResult)
    fireEvent.click(screen.getByTestId("wizard-confirm-btn"))
    expect(await screen.findByText(/Alta parcial:/)).toBeInTheDocument()
    expect(apiFetchMock).not.toHaveBeenCalled()
    fireEvent.click(screen.getByTestId("action-create-pr-later"))
    await screen.findByText("Cirugía y presupuesto creados exitosamente")
    expect(apiFetchMock.mock.calls[0]).toEqual(["/api/companies/test-co/presupuestos?surgeryId=db-surgery-1&take=1"])
    expect(apiFetchMock.mock.calls[1][0]).toBe("/api/companies/test-co/presupuestos")
    expect(apiFetchMock.mock.calls[1][1].method).toBe("POST")
    expect(JSON.parse(apiFetchMock.mock.calls[1][1].body)).toMatchObject({
      surgeryId: "db-surgery-1", title: "Keep concept", clientContactId: "payer-1",
      items: [{ description: "Implant", quantity: 2, unitPrice: 100, vatRate: 21 }],
    })
    expect(props.setNewForm).not.toHaveBeenCalled()
    expect(props.prForm.resetForm).not.toHaveBeenCalled()
    expect(props.onConfirm).toHaveBeenCalledTimes(1)
  })

  it("uses confirmed intake evidence even if a later list request would fail", async () => {
    apiFetchMock.mockRejectedValue(new Error("Offline"))
    renderIntakeResult({ ...partialResult, budget: "confirmed", attachment: "unverified", refreshFailed: true })
    fireEvent.click(screen.getByTestId("wizard-confirm-btn"))
    await screen.findByText("Cirugía y presupuesto creados exitosamente")
    expect(screen.getByText(/No se pudo confirmar el comprobante/)).toBeInTheDocument()
    expect(screen.getByText(/la lista no pudo actualizarse/)).toBeInTheDocument()
    expect(apiFetchMock).not.toHaveBeenCalled()
  })

  it("does not duplicate an existing budget when reconciling an unverified outcome", async () => {
    apiFetchMock.mockResolvedValue([{ id: "already-saved" }])
    renderIntakeResult({ ...partialResult, budget: "unverified" })
    fireEvent.click(screen.getByTestId("wizard-confirm-btn"))
    await screen.findByText(/resultado del presupuesto sin verificar/)
    fireEvent.click(screen.getByTestId("action-create-pr-later"))
    await screen.findByText("Cirugía y presupuesto creados exitosamente")
    expect(apiFetchMock).toHaveBeenCalledTimes(1)
    expect(apiFetchMock.mock.calls[0][1]).toBeUndefined()
  })

  it("waits for a delayed original commit without another POST after empty reconciliation", async () => {
    apiFetchMock.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: "delayed-original" }])
    renderIntakeResult({ ...partialResult, budget: "unverified" })
    fireEvent.click(screen.getByTestId("wizard-confirm-btn"))
    await screen.findByText(/resultado del presupuesto sin verificar/)
    fireEvent.click(screen.getByTestId("action-create-pr-later"))
    await waitFor(() => expect(screen.queryByText("Verificando presupuesto…")).not.toBeInTheDocument())
    expect(apiFetchMock).toHaveBeenCalledTimes(1)
    expect(screen.getByText(/resultado del presupuesto sin verificar/)).toBeInTheDocument()
    fireEvent.click(screen.getByTestId("action-create-pr-later"))
    await screen.findByText("Cirugía y presupuesto creados exitosamente")
    expect(apiFetchMock.mock.calls.every(call => call[1] === undefined)).toBe(true)
  })

  it("retains partial intake when expediente is absent after refresh failure", async () => {
    const { props } = renderIntakeResult({ ...partialResult, refreshFailed: true })
    fireEvent.click(screen.getByTestId("wizard-confirm-btn"))
    await screen.findByText(/Alta parcial:/)
    fireEvent.click(screen.getByTestId("action-expediente"))
    expect(props.onOpenChange).not.toHaveBeenCalled()
    expect(props.onOpenCreatedSurgery).not.toHaveBeenCalled()
    expect(toastErrorMock).toHaveBeenCalledWith(expect.stringContaining("la cirugía aún no está disponible"))
    expect(props.prForm.resetForm).not.toHaveBeenCalled()
    expect(screen.getByText(/Alta parcial:/)).toBeInTheDocument()
  })

  it("opens the loaded expediente by visible ID before closing", async () => {
    mockStore.surgeries = [{ id: "CX-100", backendId: partialResult.surgeryId }]
    const { props } = renderIntakeResult(partialResult)
    fireEvent.click(screen.getByTestId("wizard-confirm-btn"))
    await screen.findByText(/Alta parcial:/)
    fireEvent.click(screen.getByTestId("action-expediente"))
    expect(props.onOpenCreatedSurgery).toHaveBeenCalledWith("CX-100")
    expect(props.onOpenChange).toHaveBeenCalledWith(false)
  })

  it.each([new Error("Lost response"), new ApiClientError("Server failure", 503)])("never retries another POST after an ambiguous retry and empty reads", async (error) => {
    apiFetchMock.mockResolvedValueOnce([]).mockRejectedValueOnce(error).mockResolvedValueOnce([])
      .mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: "late-retry-commit" }])
    renderIntakeResult(partialResult)
    fireEvent.click(screen.getByTestId("wizard-confirm-btn"))
    await screen.findByText(/Alta parcial:/)
    fireEvent.click(screen.getByTestId("action-create-pr-later"))
    await waitFor(() => expect(toastErrorMock).toHaveBeenCalled())
    expect(screen.getByText(/resultado del presupuesto sin verificar/)).toBeInTheDocument()
    fireEvent.click(screen.getByTestId("action-create-pr-later"))
    await waitFor(() => expect(screen.queryByText("Verificando presupuesto…")).not.toBeInTheDocument())
    expect(apiFetchMock).toHaveBeenCalledTimes(4)
    fireEvent.click(screen.getByTestId("action-create-pr-later"))
    await screen.findByText("Cirugía y presupuesto creados exitosamente")
    expect(apiFetchMock.mock.calls.filter(call => call[1]?.method === "POST")).toHaveLength(1)
  })

  it("allows a new attempt after a definitive retry rejection", async () => {
    apiFetchMock.mockResolvedValueOnce([]).mockRejectedValueOnce(new ApiClientError("Rejected", 422))
      .mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce({ id: "pr-1" })
    renderIntakeResult(partialResult)
    fireEvent.click(screen.getByTestId("wizard-confirm-btn"))
    await screen.findByText(/Alta parcial:/)
    fireEvent.click(screen.getByTestId("action-create-pr-later"))
    await waitFor(() => expect(toastErrorMock).toHaveBeenCalled())
    expect(screen.getByText(/Alta parcial:/)).toBeInTheDocument()
    fireEvent.click(screen.getByTestId("action-create-pr-later"))
    await screen.findByText("Cirugía y presupuesto creados exitosamente")
    expect(apiFetchMock.mock.calls.filter(call => call[1]?.method === "POST")).toHaveLength(2)
  })

  it("keeps an unverified result and never POSTs while reconciliation is unavailable", async () => {
    apiFetchMock.mockRejectedValue(new Error("Offline"))
    renderIntakeResult({ ...partialResult, budget: "unverified" })
    fireEvent.click(screen.getByTestId("wizard-confirm-btn"))
    await screen.findByText(/resultado del presupuesto sin verificar/)
    fireEvent.click(screen.getByTestId("action-create-pr-later"))
    await waitFor(() => expect(toastErrorMock).toHaveBeenCalled())
    expect(apiFetchMock.mock.calls.every(call => call[1] === undefined)).toBe(true)
    expect(toastSuccessMock).not.toHaveBeenCalled()
    expect(screen.getByText(/resultado del presupuesto sin verificar/)).toBeInTheDocument()
  })

  it("reconciles a lost retry response and prevents concurrent retries", async () => {
    let resolveRead!: (value: unknown) => void
    apiFetchMock.mockImplementationOnce(() => new Promise(resolve => { resolveRead = resolve }))
      .mockRejectedValueOnce(new Error("Response lost"))
      .mockResolvedValueOnce([{ id: "persisted-budget" }])
    const { props } = renderIntakeResult(partialResult)
    fireEvent.click(screen.getByTestId("wizard-confirm-btn"))
    await screen.findByText(/Alta parcial:/)
    fireEvent.click(screen.getByTestId("action-create-pr-later"))
    fireEvent.click(screen.getByTestId("action-create-pr-later"))
    expect(apiFetchMock).toHaveBeenCalledTimes(1)
    expect(props.onOpenChange).not.toHaveBeenCalled()
    await act(async () => { resolveRead([]) })
    await screen.findByText("Cirugía y presupuesto creados exitosamente")
    expect(apiFetchMock).toHaveBeenCalledTimes(3)
    expect(apiFetchMock.mock.calls.filter(call => call[1]?.method === "POST")).toHaveLength(1)
  })

  it.each(["company", "close"])("discards pending confirmation after %s change", async (change) => {
    let resolveConfirm!: (value: SurgeryIntakeResult) => void
    const onConfirm = vi.fn(() => new Promise<SurgeryIntakeResult>(resolve => { resolveConfirm = resolve }))
    const { props, rerender } = renderIntakeResult(partialResult, onConfirm)
    fireEvent.click(screen.getByTestId("wizard-confirm-btn"))
    fireEvent.click(screen.getByTestId("wizard-confirm-btn"))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled()
    if (change === "company") mockCompanyId = "company-2"
    rerender(<NewSurgeryDialog {...props} open={change !== "close"} />)
    await act(async () => { resolveConfirm(partialResult) })
    expect(screen.queryByTestId("action-create-pr-later")).not.toBeInTheDocument()
    expect(apiFetchMock).not.toHaveBeenCalled()
  })

  it.each(["company", "close"])("ignores a retry POST response after %s change", async (change) => {
    let resolvePost!: (value: unknown) => void
    apiFetchMock.mockResolvedValueOnce([])
      .mockImplementationOnce(() => new Promise(resolve => { resolvePost = resolve }))
    const { props, rerender } = renderIntakeResult(partialResult)
    fireEvent.click(screen.getByTestId("wizard-confirm-btn"))
    await screen.findByText(/Alta parcial:/)
    fireEvent.click(screen.getByTestId("action-create-pr-later"))
    await waitFor(() => expect(apiFetchMock).toHaveBeenCalledTimes(2))
    expect(apiFetchMock.mock.calls[1][0]).toBe("/api/companies/test-co/presupuestos")
    if (change === "company") mockCompanyId = "company-2"
    rerender(<NewSurgeryDialog {...props} open={change !== "close"} />)
    await act(async () => { resolvePost({ id: "saved-in-old-company" }) })
    expect(toastSuccessMock).not.toHaveBeenCalled()
    expect(screen.queryByText("Cirugía y presupuesto creados exitosamente")).not.toBeInTheDocument()
    expect(apiFetchMock).toHaveBeenCalledTimes(2)
  })

  it.each(["company", "close"])("does not continue a budget retry after %s change", async (change) => {
    let resolveRead!: (value: unknown) => void
    apiFetchMock.mockImplementation(() => new Promise(resolve => { resolveRead = resolve }))
    const { props, rerender } = renderIntakeResult(partialResult)
    fireEvent.click(screen.getByTestId("wizard-confirm-btn"))
    await screen.findByText(/Alta parcial:/)
    fireEvent.click(screen.getByTestId("action-create-pr-later"))
    if (change === "company") mockCompanyId = "company-2"
    rerender(<NewSurgeryDialog {...props} open={change !== "close"} />)
    await act(async () => { resolveRead([]) })
    expect(apiFetchMock).toHaveBeenCalledTimes(1)
    expect(toastSuccessMock).not.toHaveBeenCalled()
  })

  it("does not false-positive match on single common first name without surname/DNI match", () => {
    const contact: Contacto = {
      id: "cont-1",
      nombre: "López, Diego",
      codigoContacto: "C-1",
      roles: ["cliente"],
      groups: ["pacientes"],
      tipoPersona: "fisica",
      estado: "activo",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const match = scoreContactMatch({
      contacto: contact,
      detectedName: "BOBADILLA DIEGO",
      field: "patient",
    })

    expect(match).toBeNull()
  })

  it("correctly matches contact when surname and first name match in different order", () => {
    const contact: Contacto = {
      id: "cont-2",
      nombre: "Diego Bobadilla",
      codigoContacto: "C-2",
      roles: ["cliente"],
      groups: ["pacientes"],
      tipoPersona: "fisica",
      estado: "activo",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const match = scoreContactMatch({
      contacto: contact,
      detectedName: "BOBADILLA DIEGO",
      field: "patient",
    })

    expect(match).not.toBeNull()
    expect(match?.contacto.nombre).toBe("Diego Bobadilla")
  })
})
