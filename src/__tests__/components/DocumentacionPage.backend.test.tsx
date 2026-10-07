import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { Surgery } from "@/types"
import type { SurgeryDocumentationView } from "@/lib/services/surgery-documentation.service"
import { deriveDocumentationAggregate } from "@/lib/validators/documentation.validator"

const mocks = vi.hoisted(() => ({
  auth: {
    activeCompany: { id: "company-alpha" },
    currentAccess: { role: "admin" },
    currentUser: { id: "user-123" },
    isLoading: false,
    currentUserLoading: false,
  },
  storeSurgeries: [] as Surgery[],
  openExpediente: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}))

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => mocks.auth,
}))

vi.mock("@/lib/auth/client", () => ({
  getAccessToken: async () => null,
}))

vi.mock("@/components/layout/app-shell", () => ({
  useExpedienteDrawer: () => ({ openExpediente: mocks.openExpediente }),
  useSidebar: () => ({ isMobile: false, setHideMobileMenuButton: vi.fn() }),
}))

vi.mock("@/hooks/useBackendActiveSurgeries", () => ({
  useBackendActiveSurgeries: () => ({
    ready: true,
    loading: false,
    error: null,
    refresh: vi.fn(),
  }),
}))

vi.mock("sonner", () => ({
  toast: {
    success: mocks.success,
    error: mocks.error,
  },
}))

// Store mock provides ONLY surgeries array and NO local documentChecklists
vi.mock("@/lib/store", () => ({
  useOrtoTrackStore: (selector?: (state: any) => any) => {
    const state = {
      surgeries: mocks.storeSurgeries,
      get documentChecklists() {
        throw new Error("Forbidden access to local documentChecklists")
      },
      updateDocumentationChecklist: () => {
        throw new Error("Forbidden local checklist mutation")
      },
    }
    return selector ? selector(state) : state
  },
}))

import DocumentacionPage from "@/app/documentacion/page"

const time = "2026-10-05T10:00:00.000Z"

function createDocView(state = "received", label = "Orden médica"): SurgeryDocumentationView {
  const aggregate = deriveDocumentationAggregate([{ required: true, state }])
  return {
    checklist: {
      id: "checklist-1",
      templateVersion: "documentation-v0.1",
      createdAt: time,
      updatedAt: time,
    },
    status: aggregate.status,
    progress: { approved: aggregate.approved, total: aggregate.total },
    items: [
      {
        id: "item-1",
        type: "medical_order",
        label,
        required: true,
        sortOrder: 10,
        state,
        observation: null,
        updatedAt: time,
      },
    ],
  }
}

function response(documentation: SurgeryDocumentationView) {
  return new Response(JSON.stringify({ data: { documentation } }), { status: 200 })
}

let http: ReturnType<typeof vi.fn<typeof fetch>>

describe("DocumentacionPage (Backend-connected)", () => {
  beforeEach(() => {
    mocks.auth.activeCompany = { id: "company-alpha" }
    mocks.auth.currentAccess = { role: "admin" }
    mocks.auth.isLoading = false
    mocks.auth.currentUserLoading = false
    mocks.success.mockReset()
    mocks.error.mockReset()
    mocks.openExpediente.mockReset()

    mocks.storeSurgeries = [
      {
        id: "CX-101",
        backendId: "backend-uuid-101",
        visibleNumber: "CX-101",
        patient: "Gómez Carlos",
        institution: "Sanatorio Los Arcos",
        date: "2026-10-10",
        surgeon: "Dr. Pérez",
        state: "Programada",
      } as unknown as Surgery,
      {
        id: "CX-102",
        backendId: "backend-uuid-102",
        visibleNumber: "CX-102",
        patient: "Rodríguez María",
        institution: "Hospital Italiano",
        date: "2026-10-12",
        surgeon: "Dra. Bianchi",
        state: "Autorizada",
      } as unknown as Surgery,
    ]

    http = vi.fn<typeof fetch>().mockResolvedValue(response(createDocView()))
    vi.stubGlobal("fetch", http)
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it("renders header, honest stats, and cards without accessing local store checklists", async () => {
    render(<DocumentacionPage />)

    expect(screen.getByText("Documentación Quirúrgica")).toBeVisible()
    expect(screen.getByText("Total Cirugías")).toBeVisible()
    expect(screen.getAllByText("2").length).toBeGreaterThan(0)

    // Verifies surgery items are rendered
    expect(await screen.findByText("Gómez Carlos")).toBeVisible()
    expect(screen.getByText("Rodríguez María")).toBeVisible()

    // Verifies backend HTTP calls are made per surgery
    expect(http).toHaveBeenCalledWith(
      "/api/companies/company-alpha/surgeries/backend-uuid-101/documentation",
      expect.objectContaining({ cache: "no-store" })
    )
    expect(http).toHaveBeenCalledWith(
      "/api/companies/company-alpha/surgeries/backend-uuid-102/documentation",
      expect.objectContaining({ cache: "no-store" })
    )
  })

  it("handles uninitialized checklists and sends explicit POST /initialize", async () => {
    const uninitialized: SurgeryDocumentationView = {
      checklist: null,
      status: "not_required",
      progress: { approved: 0, total: 0 },
      items: [],
    }

    http.mockImplementation((url) => {
      if (typeof url === "string" && url.includes("backend-uuid-101/documentation/initialize")) {
        return Promise.resolve(response(createDocView("pending")))
      }
      return Promise.resolve(response(uninitialized))
    })

    render(<DocumentacionPage />)

    const initButtons = await screen.findAllByRole("button", { name: /Inicializar checklist/i })
    expect(initButtons.length).toBeGreaterThan(0)

    fireEvent.click(initButtons[0])

    await waitFor(() => {
      expect(mocks.success).toHaveBeenCalledWith("Checklist documental inicializado")
    })

    expect(http).toHaveBeenCalledWith(
      "/api/companies/company-alpha/surgeries/backend-uuid-101/documentation/initialize",
      expect.objectContaining({ method: "POST" })
    )
  })

  it("executes valid canonical transitions: pending -> received", async () => {
    const pendingDoc = createDocView("pending", "Orden médica")
    const receivedDoc = createDocView("received", "Orden médica")

    http.mockImplementation((url, opts) => {
      const u = typeof url === "string" ? url : ""
      if (u.includes("/items/item-1/state")) {
        return Promise.resolve(response(receivedDoc))
      }
      return Promise.resolve(response(pendingDoc))
    })

    render(<DocumentacionPage />)

    const recibirBtn = await screen.findAllByRole("button", { name: "Recibir" })
    fireEvent.click(recibirBtn[0])

    await waitFor(() => {
      expect(mocks.success).toHaveBeenCalledWith('"Orden médica" marcado como recibido')
    })
  })

  it("filters surgeries by search query without crashes", async () => {
    render(<DocumentacionPage />)

    expect(await screen.findByText("Gómez Carlos")).toBeVisible()
    expect(screen.getByText("Rodríguez María")).toBeVisible()

    const searchInput = screen.getByPlaceholderText(/Buscar por ID, paciente/i)
    fireEvent.change(searchInput, { target: { value: "italiano" } })

    expect(screen.queryByText("Gómez Carlos")).not.toBeInTheDocument()
    expect(screen.getByText("Rodríguez María")).toBeVisible()

    const clearBtn = screen.getByRole("button", { name: /Limpiar/i })
    fireEvent.click(clearBtn)

    expect(screen.getByText("Gómez Carlos")).toBeVisible()
    expect(screen.getByText("Rodríguez María")).toBeVisible()
  })

  it("renders empty state cleanly when no surgeries exist", () => {
    mocks.storeSurgeries = []
    render(<DocumentacionPage />)

    expect(screen.getByText("No se encontraron cirugías")).toBeVisible()
  })

  it("shows company required message if no active company is set", () => {
    mocks.auth.activeCompany = null as any
    render(<DocumentacionPage />)

    expect(screen.getByText("Empresa activa requerida")).toBeVisible()
  })
})
