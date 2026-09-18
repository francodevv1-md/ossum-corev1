import { describe, expect, it, vi, beforeEach } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { AttachConversationModal } from "@/components/expediente/correo/AttachConversationModal"

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}))

vi.mock("@/lib/api/client", () => ({
  apiFetch: apiFetchMock,
  ApiClientError: class ApiClientError extends Error {
    code?: string
  },
}))

describe("AttachConversationModal", () => {
  beforeEach(() => {
    apiFetchMock.mockReset()
    apiFetchMock.mockResolvedValue({
      mailbox: "sistemas@districorr.com.ar",
      permissions: {
        role: "admin",
        canView: true,
        canAttach: true,
        canRefresh: true,
        canPersistAttachments: true,
        canUnlink: true,
        viewAudienceLabels: [],
        mutationAudienceLabels: [],
      },
      conversations: [
        {
          conversationKey: "gmail::mailbox::conv-1",
          externalConversationId: "conv-1",
          subject: "Autorización paciente Pérez",
          participantsSummary: "Andrea · prestaciones@os.example",
          participants: [],
          latestMessageAt: "2026-06-20T10:00:00.000Z",
          messageCount: 2,
          previewSnippet: "Adjuntamos documentación relevante.",
          latestMessageBodyText: "Texto largo que ya no debería gobernar el flujo.",
          attachments: [
            {
              attachmentId: "att-case-1",
              fileName: "autorizacion.pdf",
              mimeType: "application/pdf",
              sizeBytes: 1200,
              providerAttachmentRef: "provider-att-1",
              persistenceState: "metadata_only",
              isCriticalSelected: false,
            },
            {
              attachmentId: "att-inline-1",
              fileName: "image001.png",
              mimeType: "image/png",
              sizeBytes: 500,
              providerAttachmentRef: "provider-att-2",
              contentDisposition: "inline",
              contentId: "<img-1>",
              persistenceState: "metadata_only",
              isCriticalSelected: false,
            },
          ],
          linkedSurgeries: [],
          alreadyLinkedToCurrentSurgery: false,
          hasLocalSnapshot: false,
        },
      ],
    })
  })

  it("focuses review on useful attachments and removes the mail body note block", async () => {
    render(
      <AttachConversationModal
        open
        onOpenChange={vi.fn()}
        companyId="company-1"
        surgeryId="surgery-1"
        surgeryLabel="CX-123"
        canAttach
        onAttached={vi.fn()}
      />
    )

    await waitFor(() => expect(apiFetchMock).toHaveBeenCalledTimes(1))

    fireEvent.click(screen.getByRole("button", { name: /Autorización paciente Pérez/i }))
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }))

    expect(screen.getByText("Adjuntos prioritarios del caso")).toBeInTheDocument()
    expect(screen.getByText("Embebidos secundarios del correo")).toBeInTheDocument()
    expect(screen.queryByText("Texto del correo")).not.toBeInTheDocument()
    expect(screen.queryByText(/Agregar este texto al seguimiento/i)).not.toBeInTheDocument()
  })
})
