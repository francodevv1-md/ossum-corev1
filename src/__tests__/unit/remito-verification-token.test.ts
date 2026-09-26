import { createHash, createHmac } from "node:crypto"

import { describe, expect, it } from "vitest"

import {
  assertRemitoTokenKeyRetirementAllowed,
  buildRemitoTokenHmacInput,
  createRemitoTokenKeyring,
  deriveRemitoPublicToken,
  generateRemitoPublicToken,
  hashRemitoPublicToken,
  timingSafeRemitoTokenHashMatches,
} from "@/lib/remito-verification/token"

const KEY = Buffer.from(Array.from({ length: 32 }, (_, index) => index))
const NONCE = Buffer.from(Array.from({ length: 32 }, (_, index) => 255 - index))

function keyring(activeTokenKeyVersion = 1) {
  return createRemitoTokenKeyring({
    activeTokenKeyVersion,
    keys: { 1: KEY.toString("base64url"), 2147483647: Buffer.alloc(32, 7).toString("base64url") },
  })
}

describe("Remito public token cryptography", () => {
  it("validates canonical 32-byte keyring entries and active versions", () => {
    expect(keyring().keys.get(1)).toEqual(KEY)
    expect(() => createRemitoTokenKeyring({ activeTokenKeyVersion: 0, keys: {} })).toThrow()
    expect(() => createRemitoTokenKeyring({ activeTokenKeyVersion: 1.5, keys: {} })).toThrow()
    expect(() => createRemitoTokenKeyring({ activeTokenKeyVersion: 2147483648, keys: {} })).toThrow()
    expect(() => createRemitoTokenKeyring({ activeTokenKeyVersion: 2, keys: { 1: KEY.toString("base64url") } })).toThrow()
    expect(() => createRemitoTokenKeyring({ activeTokenKeyVersion: 1, keys: { "01": KEY.toString("base64url") } })).toThrow()
    expect(() => createRemitoTokenKeyring({ activeTokenKeyVersion: 1, keys: { 1: Buffer.alloc(31).toString("base64url") } })).toThrow()
    expect(() => createRemitoTokenKeyring({ activeTokenKeyVersion: 1, keys: { 1: `${KEY.toString("base64url") }=` } })).toThrow()
  })

  it("serializes the exact domain, four-byte big-endian version and nonce", () => {
    const input = buildRemitoTokenHmacInput(0x01020304, NONCE)
    expect(input.byteLength).toBe(62)
    expect(input.subarray(0, 26).toString("hex")).toBe(
      "4f5353554d2d52454d49544f2d5055424c49432d544f4b454e00",
    )
    expect(input.subarray(26, 30).toString("hex")).toBe("01020304")
    expect(input.subarray(30)).toEqual(NONCE)
  })

  it("derives the exact HMAC token with canonical base64url", () => {
    const nonce = NONCE.toString("base64url")
    const expected = createHmac(
      "sha256",
      KEY,
    ).update(Buffer.concat([
      Buffer.from("4f5353554d2d52454d49544f2d5055424c49432d544f4b454e00", "hex"),
      Buffer.from("00000001", "hex"),
      NONCE,
    ])).digest("base64url")

    const token = deriveRemitoPublicToken(keyring(), 1, nonce)
    expect(token).toBe(expected)
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/)
  })

  it("rejects noncanonical or wrong-length nonces", () => {
    expect(() => deriveRemitoPublicToken(keyring(), 1, `${NONCE.toString("base64url") }=`)).toThrow()
    expect(() => deriveRemitoPublicToken(keyring(), 1, Buffer.alloc(31).toString("base64url"))).toThrow()
    expect(() => deriveRemitoPublicToken(keyring(), 2, NONCE.toString("base64url"))).toThrow()
  })

  it("generates canonical nonce/token material and a hash-at-rest value", () => {
    const generated = generateRemitoPublicToken(keyring())
    expect(generated.nonce).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(generated.token).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(generated.tokenKeyVersion).toBe(1)
    expect(generated.tokenHash).toBe(hashRemitoPublicToken(generated.token))
    expect(generated.tokenHash).toBe(
      createHash("sha256").update(generated.token, "ascii").digest("hex"),
    )
  })

  it("uses constant-time hash comparison and a dummy path for unknown hashes", () => {
    const token = deriveRemitoPublicToken(keyring(), 1, NONCE.toString("base64url"))
    const hash = hashRemitoPublicToken(token)
    expect(timingSafeRemitoTokenHashMatches(token, hash)).toBe(true)
    expect(timingSafeRemitoTokenHashMatches(token, null)).toBe(false)
    expect(timingSafeRemitoTokenHashMatches(token, "A".repeat(64))).toBe(false)
    expect(timingSafeRemitoTokenHashMatches("not-a-canonical-token", null)).toBe(false)
  })

  it("enforces security rotation, active-key and reference retirement checks", () => {
    const base = {
      tokenKeyVersion: 1,
      activeTokenKeyVersion: 2,
      securityRotationCompleted: true,
      currentAccessKeyVersions: [] as number[],
      enabledPrintCohortKeyVersions: [] as number[],
    }
    expect(() => assertRemitoTokenKeyRetirementAllowed(base)).not.toThrow()
    expect(() => assertRemitoTokenKeyRetirementAllowed({ ...base, securityRotationCompleted: false })).toThrow()
    expect(() => assertRemitoTokenKeyRetirementAllowed({ ...base, activeTokenKeyVersion: 1 })).toThrow()
    expect(() => assertRemitoTokenKeyRetirementAllowed({ ...base, currentAccessKeyVersions: [1] })).toThrow()
    expect(() => assertRemitoTokenKeyRetirementAllowed({ ...base, enabledPrintCohortKeyVersions: [1] })).toThrow()
  })
})
