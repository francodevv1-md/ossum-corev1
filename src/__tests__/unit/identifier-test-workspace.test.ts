import { describe, expect, it } from "vitest"
import { parseArticleScan, scanDetails } from "@/components/stock/IdentifierTestWorkspace"
import { groupScanDetails } from "@/components/stock/ProductIdentifier"

describe("parseArticleScan", () => {
  it("extracts GTIN and GS1 traceability data from a DataMatrix payload", () => {
    const result = parseArticleScan("(01)07798325708674(21)GR5393(10)2604571(17)140331")

    expect(result).toMatchObject({
      lookup: "07798325708674",
      identifierType: "GTIN_EAN",
      lotCode: "2604571",
      serialNumber: "GR5393",
      expirationDate: "2014-03-31",
    })
  })

  it("keeps an article identified when traceability fields are absent", () => {
    const result = parseArticleScan("22152BP")

    expect(result).toMatchObject({
      lookup: "22152BP",
      lotCode: undefined,
      serialNumber: undefined,
      expirationDate: undefined,
    })
  })

  it("exposes manufacturer article data as a lookup candidate without relabeling its GS1 meaning", () => {
    const result = parseArticleScan("(21)GU6423(17)250431(10)260821(22)22152BP")

    expect(result.lookupCandidates).toContain("22152BP")
    expect(result.identifierType).toBeUndefined()
    expect(result.serialNumber).toBe("GU6423")
    expect(scanDetails("(21)GU6423(17)250431(10)260821(22)22152BP")).toContainEqual({ label: "Dato GS1 (AI 22)", value: "22152BP" })
  })

  it("normalizes a thirteen-digit GTIN to the fourteen-digit lookup form", () => {
    const result = parseArticleScan("(01)7798243208583(17)301130")

    expect(result.lookup).toBe("07798243208583")
    expect(result.identifierType).toBe("GTIN_EAN")
  })

  it("reads an unparenthesized AI 22 that follows a GTIN", () => {
    const result = parseArticleScan("01077983257086742222152BP")

    expect(result).toMatchObject({ gtin: "07798325708674", articleCode: "22152BP" })
  })

  it("reads compact AI 21, 10 and 17 fields after a GTIN without AI 22", () => {
    const payload = "010779826783246721GS212710260521017310321"
    const result = parseArticleScan(payload)

    expect(result).toMatchObject({
      gtin: "07798267832467",
      serialNumber: "GS2127",
      lotCode: "2605210",
      expirationDate: "2031-03-21",
    })
    expect(scanDetails(payload)).toEqual(expect.arrayContaining([
      { label: "Versión de lectura", value: "GS1 parser v4" },
      { label: "GTIN (AI 01)", value: "07798267832467" },
      { label: "Serie (AI 21)", value: "GS2127" },
      { label: "Lote (AI 10)", value: "2605210" },
      { label: "Vencimiento (AI 17)", value: "2031-03-21" },
    ]))
  })

  it("reads GS1 variable fields delimited by FNC1 without changing the raw evidence", () => {
    const payload = "]d2010779826783246721GS2127\x1d102605210\x1d17310321"
    const result = parseArticleScan(payload)

    expect(result).toMatchObject({
      rawValue: payload,
      gtin: "07798267832467",
      serialNumber: "GS2127",
      lotCode: "2605210",
      expirationDate: "2031-03-21",
    })
  })

  it("reads a displayed AI 17 expiration despite whitespace between parenthesized GS1 fields", () => {
    const result = parseArticleScan("(01)7798243205988 (17)31/01/2031 (10)855085 (21) (240)1993-000")

    expect(result).toMatchObject({
      gtin: "07798243205988",
      additionalReference: "1993-000",
      lotCode: "855085",
      expirationDate: "2031-01-31",
    })
  })

  it("reads Subiton's compact expiration and terminal lot after the GTIN", () => {
    const result = parseArticleScan("0107798034460039172905311056757")

    expect(result).toMatchObject({
      gtin: "07798034460039",
      lotCode: "56757",
      expirationDate: "2029-05-31",
    })
  })

  it("reads scanner payloads that expose FNC1 separators as spaces", () => {
    const payload = "010779826783246721GS2127 102605210 17310321"

    expect(parseArticleScan(payload)).toMatchObject({
      rawValue: payload,
      gtin: "07798267832467",
      serialNumber: "GS2127",
      lotCode: "2605210",
      expirationDate: "2031-03-21",
    })
  })

  it("reads AI 01 when the scanner prepends an invisible GS separator", () => {
    const payload = "\x1d010779826783246721GS2127\x1d102605210\x1d17310321"

    expect(parseArticleScan(payload)).toMatchObject({
      gtin: "07798267832467",
      serialNumber: "GS2127",
      lotCode: "2605210",
      expirationDate: "2031-03-21",
    })
  })
})

describe("groupScanDetails", () => {
  it("keeps article identity separate from unit traceability and diagnostics", () => {
    const groups = groupScanDetails(scanDetails("010779826783246721GS212710260521017310321"))

    expect(groups.article.map(({ label }) => label)).toEqual(["GTIN (AI 01)"])
    expect(groups.traceability.map(({ label }) => label)).toEqual(["Lote (AI 10)", "Serie (AI 21)", "Vencimiento (AI 17)"])
    expect(groups.diagnostics.map(({ label }) => label)).toEqual(["Versión de lectura", "Código leído"])
  })
})
