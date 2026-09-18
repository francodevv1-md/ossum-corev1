import { describe, expect, it } from "vitest"
import { getMailRefreshBadgeModel } from "@/components/expediente/correo/mail-summary"

describe("mail-summary", () => {
  it("marks failed refresh explicitly", () => {
    expect(getMailRefreshBadgeModel({ refreshStatus: "failed", refreshedAt: undefined })).toMatchObject({
      label: "Refresh fallido",
    })
  })

  it("marks refreshed conversations as ok", () => {
    expect(getMailRefreshBadgeModel({ refreshStatus: "success", refreshedAt: "2026-06-29T15:00:00.000Z" })).toMatchObject({
      label: "Refresh OK",
    })
  })

  it("falls back to imported when there is no refresh yet", () => {
    expect(getMailRefreshBadgeModel({ refreshStatus: "idle", refreshedAt: undefined })).toMatchObject({
      label: "Importada",
    })
  })
})
