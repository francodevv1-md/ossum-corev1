import { describe, expect, it } from "vitest"

import { createRemitoIssuanceDependenciesFromEnv } from "@/lib/remito-verification/issuance-runtime"

const testKey = Buffer.alloc(32, 7).toString("base64url")

function reader(values: Record<string, string | undefined>) {
  return (name: string) => values[name]
}

describe("Remito issuance runtime configuration", () => {
  it("builds a validated keyring through an injected environment reader", () => {
    const dependencies = createRemitoIssuanceDependenciesFromEnv(reader({
      OSSUM_REMITO_TOKEN_ACTIVE_KEY_VERSION: "1",
      OSSUM_REMITO_TOKEN_KEYRING_JSON: JSON.stringify({ "1": testKey }),
    }))

    expect(dependencies.keyring.activeTokenKeyVersion).toBe(1)
    expect(dependencies.keyring.keys.get(1)).toEqual(Buffer.alloc(32, 7))
  })

  it.each([
    [{}, /ACTIVE_KEY_VERSION.*missing/],
    [{ OSSUM_REMITO_TOKEN_ACTIVE_KEY_VERSION: "01", OSSUM_REMITO_TOKEN_KEYRING_JSON: "{}" }, /canonical/],
    [{ OSSUM_REMITO_TOKEN_ACTIVE_KEY_VERSION: "1", OSSUM_REMITO_TOKEN_KEYRING_JSON: "not-json" }, /valid JSON/],
    [{ OSSUM_REMITO_TOKEN_ACTIVE_KEY_VERSION: "1", OSSUM_REMITO_TOKEN_KEYRING_JSON: "[]" }, /JSON object/],
    [{ OSSUM_REMITO_TOKEN_ACTIVE_KEY_VERSION: "1", OSSUM_REMITO_TOKEN_KEYRING_JSON: "{}" }, /must exist/],
    [{ OSSUM_REMITO_TOKEN_ACTIVE_KEY_VERSION: "1", OSSUM_REMITO_TOKEN_KEYRING_JSON: JSON.stringify({ "1": "short" }) }, /43-character/],
  ])("fails closed for invalid configuration", (values, expected) => {
    expect(() => createRemitoIssuanceDependenciesFromEnv(reader(values))).toThrow(expected)
  })
})
