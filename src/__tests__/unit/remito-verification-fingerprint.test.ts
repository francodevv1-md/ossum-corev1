import { describe, expect, it } from "vitest"

import {
  buildRemitoFingerprintPayload,
  createRemitoFingerprint,
} from "@/lib/remito-verification/fingerprint"

const VECTOR_INPUT = {
  issuerDisplayName: "Distribuidora Ágil S.A.",
  issuerTaxId: "30-12345678-9",
  documentType: "REMITO_SALIDA",
  issuedAt: new Date("2026-08-11T23:59:59.999Z"),
  remitoShortCode: "RM1-04HM-ASW9-NF6Y-ZZPW-M",
  verificationVersion: 1,
}

const VECTOR_HEX =
  "4f5353554d2d52454d49544f2d5055424c49432d46494e4745525052494e54000a66696e6765727072696e7456657273696f6e3d333a5246310a697373756572446973706c61794e616d653d32343a446973747269627569646f726120c38167696c20532e412e0a69737375657254617849643d31313a33303132333435363738390a646f63756d656e74547970653d31333a52454d49544f5f53414c4944410a697373756564446174653d31303a323032362d30382d31310a72656d69746f53686f7274436f64653d32353a524d312d3034484d2d415357392d4e4636592d5a5a50572d4d0a766572696669636174696f6e56657273696f6e3d313a310a"

describe("RF1 public fingerprint", () => {
  it("reproduces the sealed 255-byte payload and SHA-256", () => {
    const result = createRemitoFingerprint(VECTOR_INPUT)

    expect(result.payload.byteLength).toBe(255)
    expect(result.payload.toString("hex")).toBe(VECTOR_HEX)
    expect(result.hash).toBe("9c02d28682f66646a8e2d3521319d4ac5b50a20bdf9100262e0e96cc7ddcf25a")
    expect(result.apiFingerprint).toBe(
      "sha256:9c02d28682f66646a8e2d3521319d4ac5b50a20bdf9100262e0e96cc7ddcf25a",
    )
  })

  it("normalizes NFC and Unicode whitespace by UTF-8 byte length", () => {
    const composed = buildRemitoFingerprintPayload(VECTOR_INPUT)
    const decomposed = buildRemitoFingerprintPayload({
      ...VECTOR_INPUT,
      issuerDisplayName: "  Distribuidora\u2003A\u0301gil\tS.A.  ",
    })
    expect(decomposed).toEqual(composed)
  })

  it("derives the date in UTC", () => {
    const result = buildRemitoFingerprintPayload({
      ...VECTOR_INPUT,
      issuedAt: new Date("2026-08-12T01:30:00+02:00"),
    })
    expect(result.toString("utf8")).toContain("issuedDate=10:2026-08-11\n")
  })

  it.each(["", "---", "30-ABC-9", "３０１２３４５６７８９", "30\u200b12345678\u200b9"])(
    "rejects an invalid issuer CUIT: %j",
    (issuerTaxId) => {
      expect(() => buildRemitoFingerprintPayload({ ...VECTOR_INPUT, issuerTaxId })).toThrow()
    },
  )

  it("rejects invalid required fields, dates, locators and versions", () => {
    expect(() => buildRemitoFingerprintPayload({ ...VECTOR_INPUT, issuerDisplayName: " \u2003 " })).toThrow()
    expect(() => buildRemitoFingerprintPayload({ ...VECTOR_INPUT, documentType: "RÉMITO" })).toThrow()
    expect(() => buildRemitoFingerprintPayload({ ...VECTOR_INPUT, issuedAt: new Date("invalid") })).toThrow()
    expect(() => buildRemitoFingerprintPayload({ ...VECTOR_INPUT, remitoShortCode: "RM1-invalid" })).toThrow()
    expect(() => buildRemitoFingerprintPayload({ ...VECTOR_INPUT, verificationVersion: 0 })).toThrow()
    expect(() => buildRemitoFingerprintPayload({ ...VECTOR_INPUT, verificationVersion: 1.5 })).toThrow()
  })
})
