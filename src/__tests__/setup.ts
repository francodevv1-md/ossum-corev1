import "@testing-library/jest-dom/vitest"

// ── Polyfill localStorage for Node v22+ (global localStorage exists but methods are undefined) ──
// Node v22+ provides an experimental global localStorage object via --localstorage-file,
// but without a valid file path its methods (setItem, getItem, removeItem) are undefined.
// This shadows jsdom's window.localStorage and causes Zustand persist to fail with
// "storage.setItem is not a function" when store write actions trigger persistence.
// Fix: provide a working in-memory localStorage on the global scope for tests.
if (typeof globalThis.localStorage === "undefined" || typeof globalThis.localStorage.setItem !== "function") {
  const store = new Map<string, string>()
  const storage: Storage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value) },
    removeItem: (key: string) => { store.delete(key) },
    clear: () => { store.clear() },
    get length() { return store.size },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
  }
  Object.defineProperty(globalThis, "localStorage", {
    value: storage,
    writable: true,
    configurable: true,
  })
}

// ── Polyfill ResizeObserver for jsdom (used by CirugiasTable scroll tracking) ──
// jsdom does not implement ResizeObserver natively.
// CHATZAI-014B: Without this polyfill, component tests that render CirugiasTable
// would crash with "ResizeObserver is not defined".
class ResizeObserverMock {
  private callback: ResizeObserverCallback
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}

global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver

// ── Polyfill window.matchMedia for jsdom (used by useMediaQuery / useIsMobile) ──
// jsdom does not implement matchMedia. Components that subscribe to media
// queries (mobile breakpoints, pointer queries) need a no-op stub to render
// without throwing.
if (typeof window !== "undefined" && typeof window.matchMedia !== "function") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}
