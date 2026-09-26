import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { NotificationMenu } from "@/components/layout/ShellUtilityMenus"
import { buildExpedienteLink, buildNotificationExpedienteLink } from "@/lib/expediente-navigation"
import type { InternalNotificationListItem } from "@/lib/api/notifications"
import type React from "react"

type NotificationCategory = "all" | "mention" | "operational"

const pushMock = vi.fn()
const refreshListMock = vi.fn().mockResolvedValue(undefined)
const markAsReadMock = vi.fn().mockResolvedValue(undefined)
const markAllAsReadMock = vi.fn().mockResolvedValue(undefined)
const { useAuthMock, toastErrorMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(() => ({ features: { availabilityRequests: false } })),
  toastErrorMock: vi.fn(),
}))

const notificationItems: InternalNotificationListItem[] = [
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
    patientName: null,
  },
  {
    id: "notif-2",
    companyId: "comp-1",
    recipientUserId: "user-1",
    actorUserId: "user-3",
    surgeryId: "CX-202",
    sourceEntityId: "seg-reschedule-1",
    type: "seguimiento_mention",
    title: "Luis reprogramó la cirugía",
    body: "Caso CX-202 reprogramado para mañana.",
    metadata: {
      channel: "operational",
      eventType: "surgery_rescheduled",
      sourceEntityType: "seguimiento_entry",
      scheduledDate: "2026-07-04",
      scheduledTime: "09:30",
      previousScheduledDate: "2026-07-03",
      previousScheduledTime: "08:00",
    },
    readAt: null,
    createdAt: "2026-07-03T15:00:00.000Z",
    updatedAt: "2026-07-03T15:00:00.000Z",
    actorName: "Luis Gómez",
    patientName: null,
  },
]
const availabilityItem: InternalNotificationListItem = {
  ...notificationItems[0],
  id: "notif-availability",
  title: "Fecha de disponibilidad solicitada",
  metadata: {
    channel: "operational",
    eventType: "availability_request_actionable",
    availabilityRequestId: "request/1",
  },
}

const notificationsState: {
  companyId: string
  unreadCount: number
  totalCount: number
  categoryCounts: Record<NotificationCategory, number>
  unreadCategoryCounts: Record<NotificationCategory, number>
  loadingList: boolean
  loadingCount: boolean
  listError: string | null
  countError: string | null
  refreshList: typeof refreshListMock
  refreshUnreadCount: ReturnType<typeof vi.fn>
  markAsRead: typeof markAsReadMock
  markAllAsRead: typeof markAllAsReadMock
  isMarking: (id: string) => boolean
  markingAll: boolean
} = {
  companyId: "comp-1",
  unreadCount: 2,
  totalCount: 12,
  categoryCounts: { all: 12, mention: 7, operational: 5 },
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
}

const filterNotificationsByCategory = (category: NotificationCategory) => {
  if (category === "all") return notificationItems

  return notificationItems.filter((item) => {
    const itemCategory = item.metadata && "channel" in item.metadata && item.metadata.channel === "operational"
      ? "operational"
      : "mention"

    return itemCategory === category
  })
}

const useNotificationsMock = vi.fn((options?: { category?: NotificationCategory; autoloadList?: boolean }) => {
  const category = options?.category ?? "all"

  return {
    ...notificationsState,
    items: filterNotificationsByCategory(category),
    totalCount: notificationsState.categoryCounts[category],
  }
})

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}))

vi.mock("sonner", () => ({
  toast: {
    error: toastErrorMock,
  },
}))
vi.mock("@/components/auth/AuthProvider", () => ({ useAuth: useAuthMock }))

vi.mock("@/components/ui/dropdown-menu", async () => {
  const React = await import("react")

  const DropdownMenuContext = React.createContext<{
    open: boolean
    setOpen: (open: boolean) => void
  } | null>(null)

  function useDropdownMenuContext() {
    const context = React.useContext(DropdownMenuContext)
    if (!context) throw new Error("DropdownMenu context missing")
    return context
  }

  return {
    DropdownMenu: ({ open: controlledOpen, onOpenChange, children }: { open?: boolean; onOpenChange?: (open: boolean) => void; children: React.ReactNode }) => {
      const [internalOpen, setInternalOpen] = React.useState(false)
      const open = controlledOpen ?? internalOpen
      const setOpen = (nextOpen: boolean) => {
        onOpenChange?.(nextOpen)
        if (controlledOpen === undefined) {
          setInternalOpen(nextOpen)
        }
      }

      return React.createElement(DropdownMenuContext.Provider, { value: { open, setOpen } }, children)
    },
    DropdownMenuTrigger: ({ asChild, children }: { asChild?: boolean; children: React.ReactElement<{ onClick?: (event: React.MouseEvent) => void }> }) => {
      const { open, setOpen } = useDropdownMenuContext()
      if (asChild) {
        return React.cloneElement(children, {
          onClick: (event: React.MouseEvent) => {
            children.props.onClick?.(event)
            setOpen(!open)
          },
        })
      }

      return children
    },
    DropdownMenuContent: ({ children }: { children: React.ReactNode }) => {
      const { open } = useDropdownMenuContext()
      return open ? <div>{children}</div> : null
    },
    DropdownMenuLabel: ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
    DropdownMenuSeparator: () => <hr />,
    DropdownMenuItem: ({ children, onSelect, onClick, disabled, className }: {
      children: React.ReactNode
      onSelect?: (event: { preventDefault: () => void }) => void
      onClick?: () => void
      disabled?: boolean
      className?: string
    }) => (
      <button
        type="button"
        disabled={disabled}
        className={className}
        onClick={() => {
          onSelect?.({ preventDefault: () => undefined })
          onClick?.()
        }}
      >
        {children}
      </button>
    ),
  }
})

vi.mock("@/hooks/useNotifications", () => ({
  useNotifications: (options?: { category?: NotificationCategory; autoloadList?: boolean }) => useNotificationsMock(options),
}))

describe("NotificationMenu", () => {
  beforeEach(() => {
    pushMock.mockClear()
    refreshListMock.mockClear()
    markAsReadMock.mockClear()
    markAllAsReadMock.mockClear()
    toastErrorMock.mockClear()
    useNotificationsMock.mockClear()
    useAuthMock.mockReturnValue({ features: { availabilityRequests: false } })
    useNotificationsMock.mockImplementation((options?: { category?: NotificationCategory; autoloadList?: boolean }) => {
      const category = options?.category ?? "all"

      return {
        ...notificationsState,
        items: filterNotificationsByCategory(category),
        totalCount: notificationsState.categoryCounts[category],
      }
    })
    notificationsState.unreadCount = 2
    notificationsState.categoryCounts = { all: 12, mention: 7, operational: 5 }
    notificationsState.markingAll = false
    notificationsState.loadingList = false
    notificationsState.listError = null
  })

  it("muestra el badge real y el listado al abrir", async () => {
    render(<NotificationMenu />)

    expect(screen.getByText("2")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /notificaciones/i }))

    expect(await screen.findByText("Ana te mencionó en Seguimiento")).toBeInTheDocument()
    expect(screen.getByText(/Caso CX-101/)).toBeInTheDocument()
    await waitFor(() => expect(refreshListMock).toHaveBeenCalled())
  })

  it("marca como leída y navega al expediente al seleccionar una notificación", async () => {
    render(<NotificationMenu />)

    fireEvent.click(screen.getByRole("button", { name: /notificaciones/i }))
    fireEvent.click(await screen.findByText("Ana te mencionó en Seguimiento"))

    await waitFor(() => {
      expect(markAsReadMock).toHaveBeenCalledWith("notif-1")
      expect(pushMock).toHaveBeenCalledWith(buildExpedienteLink({
        surgeryId: "CX-101",
        tab: "novedades",
        entryId: "seg-1",
      }))
    })
  })

  it("mantiene la ruta genérica para disponibilidad cuando la fuente está deshabilitada", async () => {
    useNotificationsMock.mockReturnValue({ ...notificationsState, items: [availabilityItem], totalCount: 1 })
    render(<NotificationMenu />)
    fireEvent.click(screen.getByRole("button", { name: /notificaciones/i }))
    fireEvent.click(await screen.findByText("Fecha de disponibilidad solicitada"))
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith(buildNotificationExpedienteLink({ surgeryId: "CX-101" })))
  })

  it("ruta solo metadata exacta al deep-link candidato cuando está habilitada", async () => {
    useAuthMock.mockReturnValue({ features: { availabilityRequests: true } })
    useNotificationsMock.mockReturnValue({ ...notificationsState, items: [availabilityItem], totalCount: 1 })
    render(<NotificationMenu />)
    fireEvent.click(screen.getByRole("button", { name: /notificaciones/i }))
    fireEvent.click(await screen.findByText("Fecha de disponibilidad solicitada"))
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith(
      "/notificaciones?accion=informar-disponibilidad&solicitud=request%2F1"
    ))
  })

  it.each([
    [{ channel: "operational", eventType: "availability_request_actionable", availabilityRequestId: "" }],
    [{ channel: "operational", eventType: "wrong_event", availabilityRequestId: "request-1" }],
    [{ channel: "operational", eventType: "availability_request_completed", availabilityRequestId: "request-1" }],
  ])("no enruta metadata malformada o informativa", async (metadata) => {
    useAuthMock.mockReturnValue({ features: { availabilityRequests: true } })
    useNotificationsMock.mockReturnValue({ ...notificationsState, items: [{ ...availabilityItem, metadata }], totalCount: 1 })
    render(<NotificationMenu />)
    fireEvent.click(screen.getByRole("button", { name: /notificaciones/i }))
    fireEvent.click(await screen.findByText("Fecha de disponibilidad solicitada"))
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith(buildNotificationExpedienteLink({ surgeryId: "CX-101" })))
  })

  it("abre la ficha del caso para notificaciones scoped a cirugía", async () => {
    render(<NotificationMenu />)

    fireEvent.click(screen.getByRole("button", { name: /notificaciones/i }))
    expect(await screen.findByRole("button", { name: /abrir caso/i })).toBeInTheDocument()
    fireEvent.click(screen.getByText("Luis reprogramó la cirugía"))

    await waitFor(() => {
      expect(markAsReadMock).toHaveBeenCalledWith("notif-2")
      expect(pushMock).toHaveBeenCalledWith(buildNotificationExpedienteLink({
        surgeryId: "CX-202",
      }))
    })
  })

  it("mantiene el deep-link a novedades para menciones reales de seguimiento", async () => {
    render(<NotificationMenu />)

    fireEvent.click(screen.getByRole("button", { name: /notificaciones/i }))
    fireEvent.click(await screen.findByText("Ana te mencionó en Seguimiento"))

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith(buildExpedienteLink({
        surgeryId: "CX-101",
        tab: "novedades",
        entryId: "seg-1",
      }))
    })
  })

  it("permite abrir la vista completa desde el dropdown", async () => {
    render(<NotificationMenu />)

    fireEvent.click(screen.getByRole("button", { name: /notificaciones/i }))
    fireEvent.click(await screen.findByText("Ver todas las notificaciones"))

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/notificaciones")
    })
  })

  it("muestra el CTA para marcar todo como leído cuando hay pendientes y ejecuta la acción", async () => {
    render(<NotificationMenu />)

    fireEvent.click(screen.getByRole("button", { name: /notificaciones/i }))
    fireEvent.click(await screen.findByRole("button", { name: /marcar todas como leídas/i }))

    await waitFor(() => {
      expect(markAllAsReadMock).toHaveBeenCalledTimes(1)
    })
  })

  it("pide items server-side por categoría al cambiar entre menciones y operativas", async () => {
    render(<NotificationMenu />)

    fireEvent.click(screen.getByRole("button", { name: /notificaciones/i }))

    expect(await screen.findByText("Ana te mencionó en Seguimiento")).toBeInTheDocument()
    expect(screen.getByText("Luis reprogramó la cirugía")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /menciones/i }))

    await waitFor(() => {
      expect(useNotificationsMock).toHaveBeenLastCalledWith({ category: "mention", autoloadList: false, deferInitialCount: true })
    })
    expect(screen.getByText("Ana te mencionó en Seguimiento")).toBeInTheDocument()
    expect(screen.queryByText("Luis reprogramó la cirugía")).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /operativas/i }))

    await waitFor(() => {
      expect(useNotificationsMock).toHaveBeenLastCalledWith({ category: "operational", autoloadList: false, deferInitialCount: true })
    })
    expect(screen.queryByText("Ana te mencionó en Seguimiento")).not.toBeInTheDocument()
    expect(screen.getByText("Luis reprogramó la cirugía")).toBeInTheDocument()
  })

  it("usa contadores backend por categoría para chips y resumen del dropdown", async () => {
    render(<NotificationMenu />)

    fireEvent.click(screen.getByRole("button", { name: /notificaciones/i }))

    expect(await screen.findByRole("button", { name: /todas\s*12/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /menciones\s*7/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /operativas\s*5/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /operativas\s*5/i }))

    expect(screen.getByText("+4")).toBeInTheDocument()
  })

  it("oculta el CTA si no hay notificaciones sin leer", async () => {
    notificationsState.unreadCount = 0

    render(<NotificationMenu />)

    fireEvent.click(screen.getByRole("button", { name: /notificaciones/i }))

    expect(screen.queryByRole("button", { name: /marcar todas como leídas/i })).not.toBeInTheDocument()
  })

  it("deshabilita el CTA y muestra estado de carga mientras marca todo", async () => {
    notificationsState.markingAll = true

    render(<NotificationMenu />)

    fireEvent.click(screen.getByRole("button", { name: /notificaciones/i }))

    const button = await screen.findByRole("button", { name: /marcando/i })
    expect(button).toBeDisabled()
    expect(markAllAsReadMock).not.toHaveBeenCalled()
  })

  it("muestra skeleton al abrir mientras carga el listado", async () => {
    notificationsState.loadingList = true

    const { container } = render(<NotificationMenu />)

    fireEvent.click(screen.getByRole("button", { name: /notificaciones/i }))

    await waitFor(() => expect(refreshListMock).toHaveBeenCalled())
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0)
    expect(screen.queryByText("Ana te mencionó en Seguimiento")).not.toBeInTheDocument()
  })

  it("muestra el error del listado cuando falla la carga", async () => {
    notificationsState.listError = "falló el backend"

    render(<NotificationMenu />)

    fireEvent.click(screen.getByRole("button", { name: /notificaciones/i }))

    expect(await screen.findByText("falló el backend")).toBeInTheDocument()
  })

  it("muestra estado vacío cuando no hay notificaciones", async () => {
    notificationsState.unreadCount = 0
    notificationsState.categoryCounts = { all: 0, mention: 0, operational: 0 }
    useNotificationsMock.mockImplementation(() => ({
      ...notificationsState,
      items: [],
      totalCount: 0,
    }))

    render(<NotificationMenu />)

    fireEvent.click(screen.getByRole("button", { name: /notificaciones/i }))

    expect(await screen.findByText("No hay notificaciones")).toBeInTheDocument()
  })

  it("muestra toast si marcar una notificación falla", async () => {
    markAsReadMock.mockRejectedValueOnce(new Error("falló lectura"))

    render(<NotificationMenu />)

    fireEvent.click(screen.getByRole("button", { name: /notificaciones/i }))
    fireEvent.click(await screen.findByText("Ana te mencionó en Seguimiento"))

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith("falló lectura")
    })
    expect(pushMock).not.toHaveBeenCalled()
  })
})
