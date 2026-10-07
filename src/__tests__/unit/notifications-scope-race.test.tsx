import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

let mockActiveCompany: { id: string; name: string } | null = { id: "company-1", name: "Company 1" };
let mockCurrentUser: { id: string } | null = { id: "user-1" };

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({
    activeCompany: mockActiveCompany,
    currentUser: mockCurrentUser,
  }),
}));

const mockFetchInternalNotifications = vi.fn();
const mockFetchInternalNotificationsUnreadCount = vi.fn();

vi.mock("@/lib/api/notifications", () => ({
  fetchInternalNotifications: (...args: any[]) => mockFetchInternalNotifications(...args),
  fetchInternalNotificationsUnreadCount: (...args: any[]) => mockFetchInternalNotificationsUnreadCount(...args),
  markAllInternalNotificationsAsRead: vi.fn(),
  markInternalNotificationAsRead: vi.fn(),
}));

import { useNotifications } from "@/hooks/useNotifications";

describe("useNotifications - in-flight scope race protection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockActiveCompany = { id: "company-1", name: "Company 1" };
    mockCurrentUser = { id: "user-1" };
  });

  it("discards late responses when company changes while request is pending", async () => {
    let resolveCompany1: (val: any) => void;
    const company1Promise = new Promise((resolve) => {
      resolveCompany1 = resolve;
    });

    mockFetchInternalNotifications.mockImplementation((companyId) => {
      if (companyId === "company-1") return company1Promise;
      return Promise.resolve({ items: [{ id: "n-company-2", title: "Comp 2 Notif" }], totalCount: 1, unreadCount: 1 });
    });

    const { result, rerender } = renderHook(() => useNotifications({ autoloadList: false }));

    // Start fetch for Company 1
    act(() => {
      void result.current.refreshList();
    });

    expect(result.current.loadingList).toBe(true);

    // User switches to Company 2
    mockActiveCompany = { id: "company-2", name: "Company 2" };
    rerender();

    // Company 1 resolves LATE
    await act(async () => {
      resolveCompany1!({
        items: [{ id: "n-company-1", title: "Comp 1 Leak" }],
        totalCount: 1,
        unreadCount: 1,
      });
    });

    // Verify that Company 1 items did NOT leak into Company 2 state
    expect(result.current.items).toEqual([]);
  });
});
