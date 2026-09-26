import type { RemitoIssuanceDependencies } from "@/lib/remito-verification/repository"
import { createRemitoTokenKeyring } from "@/lib/remito-verification/token"

const ACTIVE_KEY_VERSION_ENV = "OSSUM_REMITO_TOKEN_ACTIVE_KEY_VERSION"
const KEYRING_ENV = "OSSUM_REMITO_TOKEN_KEYRING_JSON"

export type RemitoIssuanceEnvReader = (name: string) => string | undefined

function requiredEnv(readEnv: RemitoIssuanceEnvReader, name: string): string {
  const value = readEnv(name)
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Required Remito issuance configuration ${name} is missing`)
  }
  return value
}

export function createRemitoIssuanceDependenciesFromEnv(
  readEnv: RemitoIssuanceEnvReader,
): RemitoIssuanceDependencies {
  const rawVersion = requiredEnv(readEnv, ACTIVE_KEY_VERSION_ENV)
  if (!/^[1-9][0-9]*$/.test(rawVersion)) {
    throw new Error(`${ACTIVE_KEY_VERSION_ENV} must be a canonical positive decimal integer`)
  }

  let keys: unknown
  try {
    keys = JSON.parse(requiredEnv(readEnv, KEYRING_ENV))
  } catch {
    throw new Error(`${KEYRING_ENV} must be valid JSON`)
  }
  if (!keys || Array.isArray(keys) || typeof keys !== "object") {
    throw new Error(`${KEYRING_ENV} must be a JSON object keyed by token key version`)
  }

  return {
    keyring: createRemitoTokenKeyring({
      activeTokenKeyVersion: Number(rawVersion),
      keys: keys as Record<string, string>,
    }),
  }
}

export function getRemitoIssuanceDependencies(): RemitoIssuanceDependencies {
  return createRemitoIssuanceDependenciesFromEnv((name) => process.env[name])
}
