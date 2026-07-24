import { describe, expect, it, vi } from "vitest"
import { GmailMailProvider } from "@/lib/mail-stage1/provider/gmail-mail-provider"

describe("GmailMailProvider", () => {
  it("listMailboxConversations uses full thread payload to expose attachments in mailbox summaries", async () => {
    const provider = new GmailMailProvider({} as never)
    const bodyTextData = Buffer.from("Hola proveedor\n\nAdjunto autorización", "utf8")
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "")

    const threadsList = vi.fn().mockResolvedValue({
      data: { threads: [{ id: "thread-1" }] },
    })

    const threadsGet = vi.fn().mockImplementation(async ({ format }: { format: string }) => ({
      data: {
        id: "thread-1",
        messages: [
          {
            id: "msg-1",
            snippet: "Adjunto autorización",
            payload: {
              headers: [
                { name: "Subject", value: "Autorización" },
                { name: "From", value: "Andrea <andrea@example.com>" },
                { name: "To", value: "ventas@example.com" },
                { name: "Date", value: "Mon, 01 Jan 2024 10:00:00 +0000" },
              ],
              ...(format === "full"
                ? {
                    parts: [
                      {
                        mimeType: "text/plain",
                        body: { data: bodyTextData },
                      },
                      {
                        filename: "autorizacion.pdf",
                        mimeType: "application/pdf",
                        body: { attachmentId: "att-1", size: 128 },
                      },
                    ],
                  }
                : {}),
            },
          },
        ],
      },
    }))

    ;(provider as any).getGmailClient = vi.fn().mockResolvedValue({
      users: {
        threads: {
          list: threadsList,
          get: threadsGet,
        },
      },
    })

    const result = await provider.listMailboxConversations({
      mailbox: "me",
      companyId: "company-1",
    })

    expect(threadsGet).toHaveBeenCalledWith(expect.objectContaining({ format: "full" }))
    expect(result).toHaveLength(1)
    expect(result[0].latestMessageBodyText).toContain("Hola proveedor")
    expect(result[0].attachments).toEqual([
      expect.objectContaining({
        attachmentId: "thread-1::att-1",
        fileName: "autorizacion.pdf",
        mimeType: "application/pdf",
        providerAttachmentRef: "msg-1::att-1",
      }),
    ])
  })

  it("getConversationSnapshot also keeps root-level attachments", async () => {
    const provider = new GmailMailProvider({} as never)

    ;(provider as any).getGmailClient = vi.fn().mockResolvedValue({
      users: {
        threads: {
          get: vi.fn().mockResolvedValue({
            data: {
              id: "thread-2",
              messages: [
                {
                  id: "msg-2",
                  snippet: "Archivo único",
                  payload: {
                    filename: "inline.pdf",
                    mimeType: "application/pdf",
                    body: { attachmentId: "att-root", size: 42 },
                    headers: [
                      { name: "Subject", value: "Documento" },
                      { name: "From", value: "Andrea <andrea@example.com>" },
                      { name: "To", value: "ventas@example.com" },
                      { name: "Date", value: "Mon, 01 Jan 2024 10:00:00 +0000" },
                    ],
                  },
                },
              ],
            },
          }),
        },
      },
    })

    const snapshot = await provider.getConversationSnapshot({
      mailbox: "me",
      externalConversationId: "thread-2",
      companyId: "company-1",
    })

    expect(snapshot.attachments).toEqual([
      expect.objectContaining({
        attachmentId: "thread-2::att-root",
        fileName: "inline.pdf",
        providerAttachmentRef: "msg-2::att-root",
      }),
    ])
  })
})
