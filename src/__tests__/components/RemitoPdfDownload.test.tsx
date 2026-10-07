import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { RemitoApiRow } from "@/lib/api/remitos"

const mocks = vi.hoisted(() => ({ token: vi.fn(), render: vi.fn() }))
vi.mock("@/lib/auth/client", () => ({ getAccessToken: mocks.token }))
vi.mock("@/lib/remito-pdf", () => ({ renderRemitoPdf: mocks.render }))
import { useRemitoPdfDownload } from "@/hooks/useRemitoPdfDownload"

const row = { id: "nr-a", companyId: "co-a", surgeryId: "cx-a", visibleNumber: 93, items: [] } as unknown as RemitoApiRow
const response = (data: unknown, status = 200) => new Response(JSON.stringify({ data }), { status })
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done }); return { promise, resolve } }
let fetchSpy = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()
let click = vi.fn<(name: string, href: string) => void>()
let createUrl = vi.fn<(blob: Blob | MediaSource) => string>()
let revokeUrl = vi.fn<(url: string) => void>()

beforeEach(() => {
  mocks.token.mockResolvedValue("synthetic-token")
  mocks.render.mockResolvedValue(new Blob(["%PDF-real-render-tested-separately"], { type: "application/pdf" }))
  fetchSpy = vi.fn(async () => response(row))
  vi.stubGlobal("fetch", fetchSpy)
  click = vi.fn()
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) { click(this.download, this.href) })
  createUrl = vi.fn(() => "blob:synthetic-pdf")
  revokeUrl = vi.fn()
  vi.stubGlobal("URL", class extends URL { static createObjectURL = createUrl; static revokeObjectURL = revokeUrl })
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.clearAllMocks(); vi.useRealTimers() })

describe("remito PDF authenticated download", () => {
  it("reads the exact remito with auth, downloads PDF, and releases its URL", async () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useRemitoPdfDownload("co-a", "cx-a", "ready"))
    await act(async () => { await result.current.download("nr-a") })
    const [url, init] = fetchSpy.mock.calls[0]
    expect(url).toBe("/api/companies/co-a/remitos/nr-a")
    expect(new Headers(init!.headers).get("Authorization")).toBe("Bearer synthetic-token")
    expect(mocks.render).toHaveBeenCalledWith(row)
    expect(click).toHaveBeenCalledWith("Remito-93.pdf", "blob:synthetic-pdf")
    expect((createUrl.mock.calls[0][0] as Blob).type).toBe("application/pdf")
    expect(document.querySelector("a[download]")).toBeNull()
    expect(revokeUrl).not.toHaveBeenCalled()
    act(() => { vi.advanceTimersByTime(1000) })
    expect(revokeUrl).toHaveBeenCalledWith("blob:synthetic-pdf")
  })

  it.each(["companyId", "surgeryId", "id"] as const)("rejects wrong returned %s before rendering", async key => {
    fetchSpy.mockResolvedValue(response({ ...row, [key]: "other" }))
    const { result } = renderHook(() => useRemitoPdfDownload("co-a", "cx-a", "ready"))
    await act(async () => { await result.current.download("nr-a") })
    expect(result.current.error).toMatch(/No pudimos descargar/)
    expect(mocks.render).not.toHaveBeenCalled()
    expect(click).not.toHaveBeenCalled()
  })

  it.each(["fetch", "render"])("reports %s failure and can retry", async stage => {
    if (stage === "fetch") fetchSpy.mockRejectedValueOnce(new Error("offline"))
    else mocks.render.mockRejectedValueOnce(new Error("unsupported font"))
    const { result } = renderHook(() => useRemitoPdfDownload("co-a", "cx-a", "ready"))
    await act(async () => { await result.current.download("nr-a") })
    expect(result.current.error).toMatch(/No pudimos descargar/)
    expect(click).not.toHaveBeenCalled()
    await act(async () => { await result.current.download("nr-a") })
    expect(result.current.error).toBeNull()
    expect(click).toHaveBeenCalledTimes(1)
  })

  it.each([
    { company: undefined, surgery: "cx-a", status: "ready" },
    { company: "co-a", surgery: undefined, status: "ready" },
    { company: "co-a", surgery: "cx-a", status: "loading" },
  ])("never queries without a ready identity (%j)", async ({ company, surgery, status }) => {
    const { result } = renderHook(() => useRemitoPdfDownload(company, surgery, status))
    await act(async () => { await result.current.download("nr-a") })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it.each(["company", "surgery", "reload", "unmount", "render"])("suppresses late downloads after %s", async change => {
    const read = deferred<Response>()
    const pdf = deferred<Blob>()
    if (change === "render") mocks.render.mockReturnValue(pdf.promise)
    else fetchSpy.mockReturnValue(read.promise)
    const view = renderHook(({ co, cx, status }) => useRemitoPdfDownload(co, cx, status), { initialProps: { co: "co-a", cx: "cx-a", status: "ready" } })
    let pending!: Promise<void>
    act(() => { pending = view.result.current.download("nr-a") })
    if (change === "render") await waitFor(() => expect(mocks.render).toHaveBeenCalled())
    if (change === "unmount") view.unmount()
    else view.rerender({ co: change === "company" ? "co-b" : "co-a", cx: change === "surgery" ? "cx-b" : "cx-a", status: change === "reload" || change === "render" ? "loading" : "ready" })
    await act(async () => { read.resolve(response(row)); pdf.resolve(new Blob(["%PDF-"], { type: "application/pdf" })); await pending })
    expect(click).not.toHaveBeenCalled()
    expect(createUrl).not.toHaveBeenCalled()
  })

  it("ignores repeated clicks while preparing a download", async () => {
    const late = deferred<Response>()
    fetchSpy.mockReturnValue(late.promise)
    const { result } = renderHook(() => useRemitoPdfDownload("co-a", "cx-a", "ready"))
    let first!: Promise<void>
    act(() => { first = result.current.download("nr-a") })
    await act(async () => { await result.current.download("nr-a") })
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    await act(async () => { late.resolve(response(row)); await first })
    expect(click).toHaveBeenCalledTimes(1)
  })
})
