import { describe, it, expect } from "vitest"
import { generateAuthorizationEmailHtml, generateSurgeryFormalEmailHtml } from "@/lib/services/resend.service"
import { normalizeMailAttachments, validateMailBody } from "@/lib/validators/mail.validator"

const PNG = "iVBORw0KGgo="
const PDF = "JVBERi0xLjQK"
describe("authorization email template and bounded attachments", () => {
  it("shows actual images full-width via matching CID and preview data URLs; PDFs stay attached", () => {
    const attachments = normalizeMailAttachments([
      { filename: "actual.png", content: `data:image/png;base64,${PNG}`, contentType: "image/png" },
      { filename: "actual.pdf", content: PDF, contentType: "application/pdf" },
    ], true)
    const data = { patientName: "Actual", notes: "Please review\nThank you", signature: { name: "Individual", companyName: "Actual Co", email: "person@example.com" } }
    const delivered = generateAuthorizationEmailHtml(data, attachments)
    expect(delivered).toContain('src="cid:authorization-1"')
    expect(delivered).toContain("width:100%;max-width:100%;height:auto")
    expect(delivered).not.toContain("object-fit:cover")
    expect(delivered).not.toContain("data:image")
    expect(delivered).not.toContain("cid:authorization-2")
    expect(delivered).toContain("Please review<br/>Thank you")
    expect(delivered).toContain("Individual<br/>Actual Co<br/>person@example.com")
    const preview = generateAuthorizationEmailHtml(data, attachments, true)
    expect(preview).toContain(`src="data:image/png;base64,${PNG}"`)
    expect(preview).not.toContain("cid:")
    expect(attachments[0].content).toBe(PNG)
    expect(attachments[1].content).toBe(PDF)
  })

  it("escapes all values and omits invented clinical data, company and issuance claims", () => {
    const html = generateAuthorizationEmailHtml({ patientName: '<script>alert("x")</script>', notes: '<img src=x onerror="alert(1)">', signature: { name: "A & B", companyName: "<Other>" } })
    expect(html).not.toContain("<script>")
    expect(html).not.toContain('<img src=x')
    expect(html).toContain("&lt;script&gt;")
    expect(html).toContain("A &amp; B")
    expect(html).not.toMatch(/PREVENCIÓN|DISTRICORR|MAT-01|Shaver|comprobante|emitido|Sin asignar/i)
    expect(html).not.toContain("Referencia de autorización")
    const formal = generateSurgeryFormalEmailHtml({ title: "<script>", patientName: "<img>", bodyText: "one\ntwo" })
    expect(formal).toContain("&lt;script&gt;")
    expect(formal).toContain("one<br/>two")
    expect(formal).not.toContain("archivo adjunto")
  })

  it.each([
    { filename: "empty.png", content: "", contentType: "image/png" },
    { filename: "remote.png", content: "https://private/image.png", contentType: "image/png" },
    { filename: "svg.png", content: btoa("<svg onload='alert(1)'></svg>"), contentType: "image/png" },
    { filename: "mime.png", content: `data:image/jpeg;base64,${PNG}`, contentType: "image/png" },
    { filename: "bad.png", content: "%%%not-base64", contentType: "image/png" },
    { filename: "a\r\nb.png", content: PNG, contentType: "image/png" },
  ])("rejects empty, unsafe, mismatched or non-base64 attachment %s", (attachment) => {
    expect(() => normalizeMailAttachments([attachment])).toThrow()
  })

  it("rejects oversize files without decoding full content", () => {
    const content = PNG.slice(0, -1) + "A".repeat(8 * 1024 * 1024) + "="
    expect(() => normalizeMailAttachments([{ filename: "big.png", content, contentType: "image/png" }])).toThrow()
  })

  it("requires actual evidence for authorization but preserves text-only coordination", () => {
    expect(() => validateMailBody({ surgeryId: "s", to: ["a@example.com"], subject: "Subject", templateType: "authorization", authorizationData: { patientName: "Actual" } })).toThrow()
    expect(validateMailBody({ surgeryId: "s", to: ["a@example.com"], subject: "Subject", formalSurgeryData: { title: "Subject", patientName: "Actual" } }).attachments).toEqual([])
  })
})
