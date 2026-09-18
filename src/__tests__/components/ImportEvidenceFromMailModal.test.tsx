import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ImportEvidenceFromMailModal } from "@/components/expediente/correo/ImportEvidenceFromMailModal"

const { apiFetchMock } = vi.hoisted(() => ({ apiFetchMock: vi.fn() }))

vi.mock("@/lib/api/client", () => ({
  apiFetch: apiFetchMock,
  ApiClientError: class ApiClientError extends Error { code?: string },
}))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const conversation = {
  conversationKey: "gmail::mailbox::conv-1", externalConversationId: "conv-1", subject: "Autorización", participantsSummary: "Obra social", participants: [], latestMessageAt: "2026-07-15T10:00:00.000Z", messageCount: 1, previewSnippet: "Confirmación", latestMessageBodyText: "Autorización confirmada", attachments: [], linkedSurgeries: [], alreadyLinkedToCurrentSurgery: false, hasLocalSnapshot: false,
}

describe("ImportEvidenceFromMailModal", () => {
  beforeEach(() => {
    HTMLElement.prototype.scrollIntoView = vi.fn()
    apiFetchMock.mockReset()
    apiFetchMock.mockResolvedValueOnce({ mailbox: "mail@example.com", permissions: {}, conversations: [conversation] })
    apiFetchMock.mockResolvedValueOnce({ linkId: "link-1" })
    apiFetchMock.mockResolvedValueOnce({ id: "authorization-1" })
  })

  it("uses the closed Mail authorization endpoint without a generic fallback payload", async () => {
    render(<ImportEvidenceFromMailModal open onOpenChange={vi.fn()} companyId="company-1" surgeryId="surgery-1" surgeryLabel="CX-1" canAttach onImported={vi.fn()} />)
    await waitFor(() => expect(apiFetchMock).toHaveBeenCalledTimes(1))
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }))
    fireEvent.click(screen.getByRole("combobox"))
    fireEvent.click(await screen.findByText("Como evidencia autorizada"))
    fireEvent.click(screen.getByRole("button", { name: "Importar evidencia" }))

    await waitFor(() => expect(apiFetchMock).toHaveBeenCalledTimes(3))
    const [path, request] = apiFetchMock.mock.calls[2]
    expect(path).toBe("/api/companies/company-1/surgeries/surgery-1/mail-links/link-1/authorization-evidence")
    expect(JSON.parse(request.body)).toEqual({ content: "Autorización confirmada", summary: "Autorización confirmada" })
    expect(JSON.stringify(apiFetchMock.mock.calls)).not.toContain('"entryType":"authorization_evidence"')
  })
})
