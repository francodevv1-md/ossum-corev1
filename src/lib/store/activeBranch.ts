"use client"

// Global active branch (sucursal) for the ux-ui session. Persisted across
// browser restarts via localStorage. The branch must belong to the active
// company; the consumer hook (useCurrentBranch) drops it otherwise to
// avoid cross-tenant leaks.
import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

type ActiveBranchState = {
  activeBranchId: string | null
  setActiveBranchId: (id: string | null) => void
  clear: () => void
}

export const useActiveBranchStore = create<ActiveBranchState>()(
  persist(
    (set) => ({
      activeBranchId: null,
      setActiveBranchId: (id) => set({ activeBranchId: id }),
      clear: () => set({ activeBranchId: null }),
    }),
    {
      name: "ossum.activeBranchId",
      storage: createJSONStorage(() => {
        if (typeof window === "undefined") {
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          }
        }
        return window.localStorage
      }),
      partialize: (state) => ({ activeBranchId: state.activeBranchId }),
    },
  ),
)
