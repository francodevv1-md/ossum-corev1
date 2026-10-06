import React from "react"
import { render, screen, act } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  changeDateDialogPropsSpy,
  mobileActionSheetPropsSpy,
  mockActions,
  useCirugiaActionsMock,
} = vi.hoisted(() => {
  const changeDateDialogPropsSpy = vi.fn()
  const mobileActionSheetPropsSpy = vi.fn()
  const mockActions = {
    changeDateDialogOpen: true,
    setChangeDateDialogOpen: vi.fn(),
    dialogSurgery: {
      id: "cx-1",
      backendId: "backend-cx-1",
      visibleNumber: "CX-0001",
      date: "2026-08-21",
      time: "14:30",
      surgeryTimeSpecified: true,
    },
    newDate: "2026-08-21",
    setNewDate: vi.fn(),
    newTime: "14:30",
    setNewTime: vi.fn(),
    isSubmittingDate: true,
    dateChangeError: "Servidor no disponible",
    handleChangeDate: vi.fn(),
    openChangeDateDialog: vi.fn(),
    closeChangeDateDialog: vi.fn(),
    newDialogOpen: false,
    setNewDialogOpen: vi.fn(),
    changeStateDialogOpen: false,
    setChangeStateDialogOpen: vi.fn(),
    suspendDialogOpen: false,
    setSuspendDialogOpen: vi.fn(),
    cancelDialogOpen: false,
    setCancelDialogOpen: vi.fn(),
    facturarDialogOpen: false,
    setFacturarDialogOpen: vi.fn(),
    presupuestoDialogOpen: false,
    setPresupuestoDialogOpen: vi.fn(),
    openNewSurgeryDialog: vi.fn(),
    setDialogSurgery: vi.fn(),
    newState: "Pendiente",
    setNewState: vi.fn(),
    reason: "",
    setReason: vi.fn(),
    wizardStep: 0,
    setWizardStep: vi.fn(),
    newForm: {},
    setNewForm: vi.fn(),
    createPRNow: false,
    setCreatePRNow: vi.fn(),
    prForm: {},
    instrumentadores: [],
    createdSurgeryId: undefined,
    handleNewSurgery: vi.fn(),
    handleChangeState: vi.fn(),
    handleSuspend: vi.fn(),
    handleCancel: vi.fn(),
  }

  return {
    changeDateDialogPropsSpy,
    mobileActionSheetPropsSpy,
    mockActions,
    useCirugiaActionsMock: vi.fn(() => mockActions),
  }
})

vi.mock("@/hooks/useCirugiaActions", () => ({
  useCirugiaActions: useCirugiaActionsMock,
}))

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: vi.fn(() => ({
    activeCompany: { id: "company-1", name: "Empresa 1" },
    currentUser: { id: "user-1" },
  })),
}))

vi.mock("@/lib/store", () => ({
  useOrtoTrackStore: Object.assign(
    vi.fn(() => ({
      surgeries: [],
      getDocStatus: vi.fn(() => "complete"),
      getConsumoBySurgeryId: vi.fn(() => null),
    })),
    {
      getState: vi.fn(() => ({ surgeries: [] })),
    }
  ),
}))

vi.mock("@/components/layout/app-shell", () => ({
  useSidebar: vi.fn(() => ({
    setHideMobileMenuButton: vi.fn(),
  })),
}))

vi.mock("@/hooks/useLogisticsMap", () => ({
  useLogisticsMap: vi.fn(() => ({
    error: null,
    data: null,
  })),
}))

vi.mock("@/hooks/useCirugiasFilters", () => ({
  useCirugiasFilters: vi.fn(() => ({
    search: "",
    setSearch: vi.fn(),
    activeFilterCount: 0,
    hasActiveFilters: false,
    filtersOpen: false,
    setFiltersOpen: vi.fn(),
    activeFilterChips: [],
    searchChips: [],
    setSearchChips: vi.fn(),
    hasExtendedSearch: false,
    clearExtendedSearch: vi.fn(),
    selectedPreset: null,
    filterData: vi.fn((list: any[]) => list),
  })),
}))

vi.mock("@/hooks/useCirugiaSelection", () => ({
  useCirugiaSelection: vi.fn(() => ({
    selectedSurgeryId: null,
    selectedSurgery: null,
    selectSurgery: vi.fn(),
    deselectSurgery: vi.fn(),
    openExpediente: vi.fn(),
    setExpTab: vi.fn(),
    selNotes: [],
    selDocStatus: "complete",
    selPresupuestos: [],
    selRemitos: [],
    selConsumos: [],
    selDevoluciones: [],
    selInvoices: [],
  })),
}))

vi.mock("@/hooks/useColumnVisibility", () => ({
  useColumnVisibility: vi.fn(() => ({
    colVisOpen: false,
    setColVisOpen: vi.fn(),
    visibleCols: {},
    toggleColumn: vi.fn(),
    stickyColumns: {},
    toggleStickyColumns: vi.fn(),
    columnOrder: [],
    reorderColumns: vi.fn(),
    resetToDefault: vi.fn(),
    compactMode: false,
    cxVariant: "default",
    fixedLeftColumns: [],
    columnWidths: {},
  })),
}))

vi.mock("@/hooks/useCirugiasSorting", () => ({
  useCirugiasSorting: vi.fn(() => ({
    sorting: [],
    setSorting: vi.fn(),
    sortData: vi.fn((list: any[]) => list),
  })),
}))

vi.mock("@/hooks/useBackendActiveSurgeries", () => ({
  useBackendActiveSurgeries: vi.fn(() => ({
    ready: true,
    isLoading: false,
    error: null,
    refresh: vi.fn(),
  })),
}))

vi.mock("@/hooks/useIsMobile", () => ({
  useIsMobile: vi.fn(() => true), // Render mobile list to test mobile sheet action
}))

// Spy on ChangeDateDialog
vi.mock("@/components/cirugias/dialogs/ChangeDateDialog", () => ({
  ChangeDateDialog: (props: any) => {
    changeDateDialogPropsSpy(props)
    return <div data-testid="change-date-dialog-mock">{props.open ? "Dialog Open" : "Dialog Closed"}</div>
  },
}))

// Spy on MobileCirugiaActionSheet
vi.mock("@/components/cirugias/MobileCirugiaActionSheet", () => ({
  MobileCirugiaActionSheet: (props: any) => {
    mobileActionSheetPropsSpy(props)
    return (
      <div data-testid="mobile-sheet-mock">
        <button
          data-testid="mobile-change-date-btn"
          onClick={() => props.onChangeDate?.({ id: "cx-mobile-1", date: "2026-08-30" })}
        >
          Change Date Mobile
        </button>
      </div>
    )
  },
}))

// Mock heavy subcomponents
vi.mock("@/components/cirugias/MobileCirugiasToolbar", () => ({
  MobileCirugiasToolbar: () => <div data-testid="mobile-toolbar" />,
}))
vi.mock("@/components/cirugias/MobileCirugiasList", () => ({
  MobileCirugiasList: (props: any) => (
    <div data-testid="mobile-list">
      <button
        data-testid="trigger-mobile-actions"
        onClick={() =>
          props.onActions?.({
            id: "cx-mobile-99",
            date: "2026-08-30",
            surgeryTimeSpecified: false,
          })
        }
      >
        Actions
      </button>
    </div>
  ),
}))
vi.mock("@/components/cirugias/MobileCirugiaFiltersSheet", () => ({
  MobileCirugiaFiltersSheet: () => null,
}))
vi.mock("@/components/cirugias/CirugiasToolbar", () => ({
  CirugiasToolbar: () => <div data-testid="desktop-toolbar" />,
}))
vi.mock("@/components/cirugias/CirugiasModuleBar", () => ({
  CirugiasModuleBar: () => <div data-testid="module-bar" />,
}))
vi.mock("@/components/cirugias/CirugiasDataGrid", () => ({
  CirugiasDataGrid: () => <div data-testid="data-grid" />,
}))
vi.mock("@/components/cirugias/SurgeryContextTray", () => ({
  SurgeryContextTray: () => <div data-testid="context-tray" />,
}))
vi.mock("@/components/cirugias/dialogs/ChangeStateDialog", () => ({
  ChangeStateDialog: () => null,
}))
vi.mock("@/components/cirugias/dialogs/SuspendDialog", () => ({
  SuspendDialog: () => null,
}))
vi.mock("@/components/cirugias/dialogs/CancelDialog", () => ({
  CancelDialog: () => null,
}))

import CirugiasPage from "@/app/cirugias/page"

describe("CirugiasPage - ChangeDateFlow Integration (Finding 2)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("wires ChangeDateDialog with loading state, error message, and controlled close", () => {
    render(<CirugiasPage />)

    expect(changeDateDialogPropsSpy).toHaveBeenCalled()
    const lastCall = changeDateDialogPropsSpy.mock.calls.at(-1)
    expect(lastCall).toBeDefined()
    const lastProps = lastCall![0]

    // 1. Loading state passed through
    expect(lastProps.isSubmitting).toBe(true)

    // 2. Error message passed through
    expect(lastProps.error).toBe("Servidor no disponible")

    // 3. Initialized surgery passed through
    expect(lastProps.dialogSurgery?.id).toBe("cx-1")

    // 4. Controlled close handler invokes closeChangeDateDialog on close
    act(() => {
      lastProps.onOpenChange(false)
    })
    expect(mockActions.closeChangeDateDialog).toHaveBeenCalledTimes(1)
  })

  it("connects mobile action sheet onChangeDate to actions.openChangeDateDialog", () => {
    render(<CirugiasPage />)

    // Trigger action sheet opening from list
    const triggerBtn = screen.getByTestId("trigger-mobile-actions")
    act(() => {
      triggerBtn.click()
    })

    expect(mobileActionSheetPropsSpy).toHaveBeenCalled()
    const mobileCall = mobileActionSheetPropsSpy.mock.calls.at(-1)
    expect(mobileCall).toBeDefined()
    const mobileProps = mobileCall![0]

    act(() => {
      mobileProps.onChangeDate({
        id: "cx-mobile-99",
        date: "2026-08-30",
        surgeryTimeSpecified: false,
      })
    })

    // Must call openChangeDateDialog, NOT setDialogSurgery + setChangeDateDialogOpen separately
    expect(mockActions.openChangeDateDialog).toHaveBeenCalledWith(
      expect.objectContaining({ id: "cx-mobile-99" })
    )
  })
})
