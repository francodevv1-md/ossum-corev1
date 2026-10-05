import React from "react"
import { fireEvent, render, screen, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { StockAvailabilityQuery } from "@/lib/validators/stock"

const mocks = vi.hoisted(() => ({
  useStockMock: vi.fn(),
  activeCompany: { id: "company-test", name: "Empresa Test" },
  sheetProps: vi.fn(),
  codesDialogProps: vi.fn(),
}))

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({
    activeCompany: mocks.activeCompany,
    isAuthenticated: true,
    isLoading: false,
    currentUserLoading: false,
  }),
}))

vi.mock("@/hooks/useStock", () => ({
  useStock: (query?: Partial<StockAvailabilityQuery>) => mocks.useStockMock(query),
}))

vi.mock("@/components/ui/dropdown-menu", () => {
  const DropdownMenuContext = React.createContext<{ open: boolean; setOpen: (open: boolean) => void }>({
    open: false,
    setOpen: () => undefined,
  })

  return {
    DropdownMenu: ({ children, open: controlledOpen, onOpenChange }: {
      children: React.ReactNode
      open?: boolean
      onOpenChange?: (open: boolean) => void
    }) => {
      const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false)
      const open = controlledOpen ?? uncontrolledOpen
      const setOpen = (nextOpen: boolean) => {
        onOpenChange?.(nextOpen)
        setUncontrolledOpen(nextOpen)
      }
      return <DropdownMenuContext.Provider value={{ open, setOpen }}>{children}</DropdownMenuContext.Provider>
    },
    DropdownMenuTrigger: ({ asChild, children }: {
      asChild?: boolean
      children: React.ReactElement<{ onClick?: (event: React.MouseEvent) => void }>
    }) => {
      const { open, setOpen } = React.useContext(DropdownMenuContext)
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
      const { open } = React.useContext(DropdownMenuContext)
      return open ? <div data-testid="dropdown-menu-content">{children}</div> : null
    },
    DropdownMenuSeparator: () => <hr />,
    DropdownMenuItem: ({ children, onSelect, onClick }: {
      children: React.ReactNode
      onSelect?: () => void
      onClick?: () => void
    }) => {
      const { setOpen } = React.useContext(DropdownMenuContext)
      return (
        <button
          type="button"
          onClick={() => {
            onSelect?.()
            onClick?.()
            setOpen(false)
          }}
        >
          {children}
        </button>
      )
    },
  }
})

vi.mock("@/components/stock/StockArticleSheet", () => ({
  StockArticleSheet: (props: { open: boolean; initialTab?: string }) => {
    mocks.sheetProps(props)
    return props.open ? <div data-testid="stock-article-sheet" data-tab={props.initialTab} /> : null
  },
}))

vi.mock("@/components/stock/ArticleCodesDialog", () => ({
  ArticleCodesDialog: (props: { open: boolean; item?: { code?: string } | null }) => {
    mocks.codesDialogProps(props)
    return props.open ? <div data-testid="article-codes-dialog" /> : null
  },
}))

import StockPage from "@/app/stock/page"

describe("STOCK-TABLE-ACTIONS-HONEST-UI-DEV-001 - Honest Row Actions", () => {
  const sampleItems = [
    {
      id: "art-1",
      code: "SKU-001",
      name: "Tornillo de titanio 3.5mm",
      family: "Cadera",
      category: "Cadera",
      brand: "Acme Medical",
      articleType: "Insumo Especial",
      unit: "u",
      manufacturer: "Acme Medical Corp",
      gtin: "7791234567890",
      physical: 50,
      reserved: 10,
      inTransit: 5,
      available: 35,
      min: 5,
      state: "Disponible" as const,
      masterStatus: "Activo" as const,
      control: "cantidad" as const,
      lotCount: 0,
      hasExpiringLots: false,
      hasExpiredLots: false,
      lastMovementAt: null,
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.useStockMock.mockReturnValue({
      items: sampleItems,
      loading: false,
      error: null,
      summary: {
        totalArticles: 1,
        totalPhysical: 50,
        totalReserved: 10,
        totalInTransit: 5,
        totalAvailable: 35,
      },
      facets: {
        families: ["Cadera"],
        brands: ["Acme Medical"],
        articleTypes: ["Insumo Especial"],
      },
      pagination: {
        page: 1,
        limit: 50,
        total: 1,
        totalPages: 1,
      },
      refresh: vi.fn(),
    })
  })

  it("renders 'Nuevo artículo' button", () => {
    render(<StockPage />)
    expect(screen.getByRole("button", { name: /nuevo artículo/i })).toBeInTheDocument()
  })

  it("sanitizes row menu: 'Editar' and 'Generar códigos' are removed; 'Ver códigos' is present", () => {
    render(<StockPage />)

    const actionButton = screen.getByRole("button", { name: "Acciones de SKU-001" })
    fireEvent.click(actionButton)

    const menu = screen.getByTestId("dropdown-menu-content")

    // Unbacked / misleading actions must NOT exist
    expect(within(menu).queryByText("Editar")).not.toBeInTheDocument()
    expect(within(menu).queryByText("Generar códigos")).not.toBeInTheDocument()

    // Honest navigation and viewing actions must exist
    expect(within(menu).getByText("Ver ficha")).toBeInTheDocument()
    expect(within(menu).getByText("Existencias")).toBeInTheDocument()
    expect(within(menu).getByText("Movimientos")).toBeInTheDocument()
    expect(within(menu).getByText("Trazabilidad")).toBeInTheDocument()
    expect(within(menu).getByText("Ver códigos")).toBeInTheDocument()
  })

  it("opens sheet with correct initialTab when clicking navigation actions", () => {
    render(<StockPage />)

    const actionButton = screen.getByRole("button", { name: "Acciones de SKU-001" })

    // 1. Ver ficha -> general
    fireEvent.click(actionButton)
    fireEvent.click(within(screen.getByTestId("dropdown-menu-content")).getByText("Ver ficha"))
    expect(mocks.sheetProps).toHaveBeenLastCalledWith(
      expect.objectContaining({
        open: true,
        initialTab: "general",
      })
    )

    // 2. Existencias -> stock
    fireEvent.click(actionButton)
    fireEvent.click(within(screen.getByTestId("dropdown-menu-content")).getByText("Existencias"))
    expect(mocks.sheetProps).toHaveBeenLastCalledWith(
      expect.objectContaining({
        open: true,
        initialTab: "stock",
      })
    )

    // 3. Movimientos -> historial
    fireEvent.click(actionButton)
    fireEvent.click(within(screen.getByTestId("dropdown-menu-content")).getByText("Movimientos"))
    expect(mocks.sheetProps).toHaveBeenLastCalledWith(
      expect.objectContaining({
        open: true,
        initialTab: "historial",
      })
    )

    // 4. Trazabilidad -> trazabilidad
    fireEvent.click(actionButton)
    fireEvent.click(within(screen.getByTestId("dropdown-menu-content")).getByText("Trazabilidad"))
    expect(mocks.sheetProps).toHaveBeenLastCalledWith(
      expect.objectContaining({
        open: true,
        initialTab: "trazabilidad",
      })
    )
  })

  it("opens ArticleCodesDialog when clicking 'Ver códigos'", () => {
    render(<StockPage />)

    const actionButton = screen.getByRole("button", { name: "Acciones de SKU-001" })
    fireEvent.click(actionButton)
    fireEvent.click(within(screen.getByTestId("dropdown-menu-content")).getByText("Ver códigos"))

    expect(mocks.codesDialogProps).toHaveBeenLastCalledWith(
      expect.objectContaining({
        open: true,
        item: expect.objectContaining({ code: "SKU-001" }),
      })
    )
  })
})
