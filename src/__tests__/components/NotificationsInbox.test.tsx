import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NotificationsInbox } from "@/components/notifications/NotificationsInbox"
import { buildExpedienteLink, buildNotificationExpedienteLink } from "@/lib/expediente-navigation"
import type { InternalNotificationCategory } from "@/lib/api/notifications"

const pushMock = vi.fn()
const replaceMock = vi.fn()
let searchParamsMock = new URLSearchParams()
let actorIdMock = "user-1"
let availabilityRequestsEnabledMock = false
const markAsReadMock = vi.fn().mockResolvedValue(undefined)
const markAllAsReadMock = vi.fn().mockResolvedValue({ updatedCount: 2, readAt: new Date().toISOString() })
const useNotificationsMock = vi.fn()
const refreshListMock = vi.fn().mockResolvedValue(undefined)
const { toastErrorMock } = vi.hoisted(() => ({
  toastErrorMock: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
  useSearchParams: () => searchParamsMock,
}))
vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({
    currentUser: { id: actorIdMock },
    features: { availabilityRequests: availabilityRequestsEnabledMock },
    user: null,
  }),
}))

vi.mock("sonner", () => ({
  toast: {
    error: toastErrorMock,
  },
}))

vi.mock("@/hooks/useNotifications", () => ({
  useNotifications: (options?: { unreadOnly?: boolean; take?: number; category?: InternalNotificationCategory }) => useNotificationsMock(options),
}))

const allItems = [
  {
    id: "notif-1",
    companyId: "comp-1",
    recipientUserId: "user-1",
    actorUserId: "user-2",
    surgeryId: "CX-101",
    sourceEntityId: "seg-1",
    type: "seguimiento_mention",
    title: "Ana te mencionó en Seguimiento",
    body: "Necesitamos revisar la autorización.",
    metadata: null,
    readAt: null,
    createdAt: "2026-07-03T13:00:00.000Z",
    updatedAt: "2026-07-03T13:00:00.000Z",
    actorName: "Ana Pérez",
  },
  {
    id: "notif-2",
    companyId: "comp-1",
    recipientUserId: "user-1",
    actorUserId: "user-3",
    surgeryId: "CX-202",
    sourceEntityId: "seg-2",
    type: "seguimiento_mention",
    title: "Luis actualizó el caso",
    body: "Ya quedó revisado.",
    metadata: null,
    readAt: "2026-07-03T14:00:00.000Z",
    createdAt: "2026-07-03T13:30:00.000Z",
    updatedAt: "2026-07-03T14:00:00.000Z",
    actorName: "Luis Gómez",
  },
  {
    id: "notif-3",
    companyId: "comp-1",
    recipientUserId: "user-1",
    actorUserId: "user-4",
    surgeryId: "CX-303",
    sourceEntityId: "seg-reschedule-3",
    type: "seguimiento_mention",
    title: "María reprogramó una cirugía",
    body: "Caso CX-303 reprogramado.",
    metadata: {
      channel: "operational",
      eventType: "surgery_rescheduled",
      sourceEntityType: "seguimiento_entry",
      scheduledDate: "2026-07-04",
      scheduledTime: "10:00",
      previousScheduledDate: "2026-07-03",
      previousScheduledTime: "09:00",
    },
    readAt: null,
    createdAt: "2026-07-03T15:00:00.000Z",
    updatedAt: "2026-07-03T15:00:00.000Z",
    actorName: "María López",
  },
] as const

const unreadItems = [allItems[0], allItems[2]]
const availabilityItem = {
  ...allItems[0],
  id: "notif-availability",
  title: "Fecha de disponibilidad solicitada",
  metadata: {
    channel: "operational",
    eventType: "availability_request_actionable",
    availabilityRequestId: "request/1",
  },
}

function buildMockItems(options?: { unreadOnly?: boolean; category?: InternalNotificationCategory }) {
  const scopedItems = options?.unreadOnly ? unreadItems : allItems

  switch (options?.category) {
    case "mention":
      return scopedItems.filter((item) => item.id !== "notif-3")
    case "operational":
      return scopedItems.filter((item) => item.id === "notif-3")
    default:
      return scopedItems
  }
}

describe("NotificationsInbox", () => {
  beforeEach(() => {
    pushMock.mockClear()
    replaceMock.mockClear()
    markAsReadMock.mockClear()
    markAllAsReadMock.mockClear()
    refreshListMock.mockClear()
    toastErrorMock.mockClear()
    useNotificationsMock.mockClear()
    availabilityRequestsEnabledMock = false
    searchParamsMock = new URLSearchParams()
    actorIdMock = "user-1"
    vi.stubGlobal("fetch", vi.fn())

    useNotificationsMock.mockImplementation((options?: { unreadOnly?: boolean; take?: number; category?: InternalNotificationCategory }) => ({
      companyId: "comp-1",
      items: buildMockItems(options),
      unreadCount: 2,
      totalCount:
        options?.category === "mention"
          ? options?.unreadOnly ? 1 : 7
          : options?.category === "operational"
            ? options?.unreadOnly ? 1 : 5
            : options?.unreadOnly ? 2 : 12,
      categoryCounts: options?.unreadOnly
        ? { all: 2, mention: 1, operational: 1 }
        : { all: 12, mention: 7, operational: 5 },
      unreadCategoryCounts: { all: 2, mention: 1, operational: 1 },
      loadingList: false,
      loadingCount: false,
      listError: null,
      countError: null,
      refreshList: refreshListMock,
      refreshUnreadCount: vi.fn(),
      markAsRead: markAsReadMock,
      markAllAsRead: markAllAsReadMock,
      isMarking: () => false,
      markingAll: false,
    }))
  })

  it("muestra el listado real y permite marcar todas como leídas", async () => {
    render(<NotificationsInbox />)

    expect(screen.getByText("Notificaciones")).toBeInTheDocument()
    expect(screen.getByText("Ana te mencionó en Seguimiento")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /marcar todas como leídas/i }))

    await waitFor(() => {
      expect(markAllAsReadMock).toHaveBeenCalled()
    })
  })

  it("permite cambiar entre Todas y No leídas con datos reales del hook", async () => {
    render(<NotificationsInbox />)

    expect(screen.getByText("Luis actualizó el caso")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /no leídas/i }))

    await waitFor(() => {
      expect(screen.queryByText("Luis actualizó el caso")).not.toBeInTheDocument()
      expect(screen.getByText("Ana te mencionó en Seguimiento")).toBeInTheDocument()
      expect(useNotificationsMock).toHaveBeenLastCalledWith(expect.objectContaining({ unreadOnly: true }))
    })
  })

  it("pide filtro server-side entre menciones y operativas", async () => {
    render(<NotificationsInbox />)

    expect(screen.getByText("Ana te mencionó en Seguimiento")).toBeInTheDocument()
    expect(screen.getByText("María reprogramó una cirugía")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /menciones/i }))

    await waitFor(() => {
      expect(screen.getByText("Ana te mencionó en Seguimiento")).toBeInTheDocument()
      expect(screen.queryByText("María reprogramó una cirugía")).not.toBeInTheDocument()
      expect(useNotificationsMock).toHaveBeenLastCalledWith(expect.objectContaining({ category: "mention" }))
    })

    fireEvent.click(screen.getByRole("button", { name: /operativas/i }))

    await waitFor(() => {
      expect(screen.queryByText("Ana te mencionó en Seguimiento")).not.toBeInTheDocument()
      expect(screen.getByText("María reprogramó una cirugía")).toBeInTheDocument()
      expect(useNotificationsMock).toHaveBeenLastCalledWith(expect.objectContaining({ category: "operational" }))
      expect(screen.getByText("1 visibles · 5 en esta vista")).toBeInTheDocument()
    })
  })

  it("muestra contadores reales por categoría aunque la página cargada sea parcial", () => {
    render(<NotificationsInbox />)

    expect(screen.getByRole("button", { name: /todas\s*12/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /menciones\s*7/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /operativas\s*5/i })).toBeInTheDocument()
    expect(screen.getByText("3 visibles · 12 totales")).toBeInTheDocument()
  })

  it("permite cargar más resultados incrementando el take", async () => {
    render(<NotificationsInbox />)

    fireEvent.click(screen.getByRole("button", { name: /cargar más/i }))

    await waitFor(() => {
      expect(useNotificationsMock).toHaveBeenLastCalledWith(expect.objectContaining({ take: 40, unreadOnly: false }))
    })
  })

  it("mantiene la navegación al contexto del caso", async () => {
    render(<NotificationsInbox />)

    fireEvent.click(screen.getAllByRole("button", { name: /ver contexto/i })[0])

    await waitFor(() => {
      expect(markAsReadMock).toHaveBeenCalledWith("notif-1")
      expect(pushMock).toHaveBeenCalledWith(buildExpedienteLink({
        surgeryId: "CX-101",
        tab: "novedades",
        entryId: "seg-1",
      }))
    })
  })

  it("ignora disponibilidad y deep-links mientras la fuente está deshabilitada", async () => {
    searchParamsMock = new URLSearchParams("accion=informar-disponibilidad&solicitud=request-query")
    const state = useNotificationsMock()
    useNotificationsMock.mockReturnValue({ ...state, companyId: "comp-1", items: [availabilityItem], totalCount: 1 })
    render(<NotificationsInbox />)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /ver contexto/i }))
    await waitFor(() => expect(pushMock).toHaveBeenCalled())
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it("abre una única acción fresca con metadata exacta y la limpia al cambiar actor", async () => {
    availabilityRequestsEnabledMock = true
    const state = useNotificationsMock()
    useNotificationsMock.mockReturnValue({ ...state, companyId: "comp-1", items: [availabilityItem], totalCount: 1 })
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => undefined)))
    const { rerender } = render(<NotificationsInbox />)
    fireEvent.click(screen.getByRole("button", { name: /informar disponibilidad/i }))
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/companies/comp-1/availability-requests/request%2F1",
      expect.anything()
    ))
    expect(screen.getAllByRole("dialog")).toHaveLength(1)
    actorIdMock = "user-2"
    rerender(<NotificationsInbox />)
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
  })

  it("limpia el candidato y la query al cerrar un deep-link habilitado", async () => {
    availabilityRequestsEnabledMock = true
    searchParamsMock = new URLSearchParams("accion=informar-disponibilidad&solicitud=request-query")
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => undefined)))
    render(<NotificationsInbox />)
    await screen.findByRole("dialog")
    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    expect(replaceMock).toHaveBeenCalledWith("/notificaciones")
  })

  it.each([
    [{ channel: "operational", eventType: "availability_request_actionable", availabilityRequestId: "" }],
    [{ channel: "operational", eventType: "availability_request_actionable", availabilityRequestId: "x".repeat(201) }],
    [{ channel: "operational", eventType: "wrong_event", availabilityRequestId: "request-1" }],
    [{ channel: "operational", eventType: "availability_request_completed", availabilityRequestId: "request-1" }],
  ])("no abre metadata malformada o informativa", async (metadata) => {
    availabilityRequestsEnabledMock = true
    const state = useNotificationsMock()
    useNotificationsMock.mockReturnValue({ ...state, companyId: "comp-1", items: [{ ...availabilityItem, metadata }], totalCount: 1 })
    render(<NotificationsInbox />)
    fireEvent.click(screen.getByRole("button", { name: /ver contexto/i }))
    await waitFor(() => expect(pushMock).toHaveBeenCalled())
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it("abre la ficha base para reprogramaciones aunque lleguen con sourceEntityType de seguimiento", async () => {
    render(<NotificationsInbox />)

    expect(screen.getByText("Reprogramación")).toBeInTheDocument()
    expect(screen.getAllByText(/Nueva fecha 04\/07\/2026 · 10:00 · Antes 03\/07\/2026 · 09:00/).length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole("button", { name: /abrir expediente/i }))

    await waitFor(() => {
      expect(markAsReadMock).toHaveBeenCalledWith("notif-3")
      expect(pushMock).toHaveBeenCalledWith(buildNotificationExpedienteLink({
        surgeryId: "CX-303",
      }))
    })
  })

  it("mantiene el deep-link a novedades para menciones reales de seguimiento", async () => {
    render(<NotificationsInbox />)

    fireEvent.click(screen.getAllByRole("button", { name: /ver contexto/i })[0])

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith(buildExpedienteLink({
        surgeryId: "CX-101",
        tab: "novedades",
        entryId: "seg-1",
      }))
    })
  })

  it("permite refrescar la lista manualmente", async () => {
    render(<NotificationsInbox />)

    fireEvent.click(screen.getByRole("button", { name: /actualizar/i }))

    await waitFor(() => {
      expect(refreshListMock).toHaveBeenCalledTimes(1)
    })
  })

  it("permite marcar como leída desde la acción secundaria sin navegar", async () => {
    render(<NotificationsInbox />)

    fireEvent.click(screen.getAllByRole("button", { name: /marcar como leída/i })[0])

    await waitFor(() => {
      expect(markAsReadMock).toHaveBeenCalledWith("notif-1")
    })
    expect(pushMock).not.toHaveBeenCalled()
  })

  it("muestra estado vacío contextual cuando no hay pendientes", () => {
    useNotificationsMock.mockImplementation(() => ({
      items: [],
      unreadCount: 0,
      totalCount: 0,
      categoryCounts: { all: 0, mention: 0, operational: 0 },
      unreadCategoryCounts: { all: 0, mention: 0, operational: 0 },
      loadingList: false,
      listError: null,
      countError: null,
      refreshList: refreshListMock,
      refreshUnreadCount: vi.fn(),
      markAsRead: markAsReadMock,
      markAllAsRead: markAllAsReadMock,
      isMarking: () => false,
      markingAll: false,
    }))

    render(<NotificationsInbox />)

    fireEvent.click(screen.getByRole("button", { name: /no leídas/i }))

    expect(screen.getByText("No hay notificaciones sin leer.")).toBeInTheDocument()
    expect(screen.getByText("Cuando llegue algo nuevo, lo vas a ver primero acá.")).toBeInTheDocument()
  })

  it("muestra estado de error cuando falla la carga del inbox", () => {
    useNotificationsMock.mockImplementation((options?: { unreadOnly?: boolean; take?: number; category?: InternalNotificationCategory }) => ({
      items: buildMockItems(options),
      unreadCount: 2,
      totalCount: 12,
      categoryCounts: { all: 12, mention: 7, operational: 5 },
      unreadCategoryCounts: { all: 2, mention: 1, operational: 1 },
      loadingList: false,
      listError: "timeout",
      countError: null,
      refreshList: refreshListMock,
      refreshUnreadCount: vi.fn(),
      markAsRead: markAsReadMock,
      markAllAsRead: markAllAsReadMock,
      isMarking: () => false,
      markingAll: false,
    }))

    render(<NotificationsInbox />)

    expect(screen.getByText("No pudimos cargar las notificaciones.")).toBeInTheDocument()
    expect(screen.getByText("timeout")).toBeInTheDocument()
  })
})
