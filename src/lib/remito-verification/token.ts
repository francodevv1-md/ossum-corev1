import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto"

const TOKEN_DOMAIN = Buffer.from("OSSUM-REMITO-PUBLIC-TOKEN\0", "ascii")
const MAX_TOKEN_KEY_VERSION = 2_147_483_647
const CANONICAL_BASE64URL_32 = /^[A-Za-z0-9_-]{43}$/
const LOWERCASE_SHA256 = /^[0-9a-f]{64}$/
const PROCESS_DUMMY_HASH = randomBytes(32)

export type RemitoTokenKeyring = {
  readonly activeTokenKeyVersion: number
  readonly keys: ReadonlyMap<number, Buffer>
}

export type RemitoTokenKeyringInput = {
  activeTokenKeyVersion: number
  keys: Readonly<Record<string, string>>
}

function assertTokenKeyVersion(value: number, field = "tokenKeyVersion"): void {
  if (!Number.isInteger(value) || value < 1 || value > MAX_TOKEN_KEY_VERSION) {
    throw new RangeError(`${field} must be an integer from 1 through 2147483647`)
  }
}

function decodeCanonicalBase64Url32(value: string, field: string): Buffer {
  if (typeof value !== "string" || !CANONICAL_BASE64URL_32.test(value)) {
    throw new RangeError(`${field} must be canonical unpadded 43-character base64url`)
  }

  const decoded = Buffer.from(value, "base64url")
  if (decoded.byteLength !== 32 || decoded.toString("base64url") !== value) {
    throw new RangeError(`${field} must decode canonically to exactly 32 bytes`)
  }
  return decoded
}

function encodeCanonicalBase64Url32(value: Uint8Array, field: string): string {
  if (value.byteLength !== 32) throw new RangeError(`${field} must contain exactly 32 bytes`)
  return Buffer.from(value).toString("base64url")
}

export function createRemitoTokenKeyring(input: RemitoTokenKeyringInput): RemitoTokenKeyring {
  assertTokenKeyVersion(input.activeTokenKeyVersion, "activeTokenKeyVersion")

  const keys = new Map<number, Buffer>()
  for (const [rawVersion, encodedKey] of Object.entries(input.keys)) {
    if (!/^[1-9][0-9]*$/.test(rawVersion)) {
      throw new RangeError("keyring versions must be canonical positive decimal integers")
    }
    const version = Number(rawVersion)
    assertTokenKeyVersion(version, "keyring version")
    keys.set(version, decodeCanonicalBase64Url32(encodedKey, "token key"))
  }

  if (!keys.has(input.activeTokenKeyVersion)) {
    throw new RangeError("activeTokenKeyVersion must exist in the keyring")
  }

  return { activeTokenKeyVersion: input.activeTokenKeyVersion, keys }
}

export function buildRemitoTokenHmacInput(tokenKeyVersion: number, nonce: Uint8Array): Buffer {
  assertTokenKeyVersion(tokenKeyVersion)
  if (nonce.byteLength !== 32) throw new RangeError("nonce must contain exactly 32 bytes")

  const serializedVersion = Buffer.allocUnsafe(4)
  serializedVersion.writeUInt32BE(tokenKeyVersion)
  return Buffer.concat([TOKEN_DOMAIN, serializedVersion, Buffer.from(nonce)])
}

export function deriveRemitoPublicToken(
  keyring: RemitoTokenKeyring,
  tokenKeyVersion: number,
  canonicalNonce: string,
): string {
  assertTokenKeyVersion(tokenKeyVersion)
  const key = keyring.keys.get(tokenKeyVersion)
  if (key === undefined) throw new RangeError("tokenKeyVersion does not exist in the keyring")

  const nonce = decodeCanonicalBase64Url32(canonicalNonce, "nonce")
  const mac = createHmac("sha256", key)
    .update(buildRemitoTokenHmacInput(tokenKeyVersion, nonce))
    .digest()
  return encodeCanonicalBase64Url32(mac, "token")
}

export function hashRemitoPublicToken(token: string): string {
  decodeCanonicalBase64Url32(token, "token")
  return createHash("sha256").update(token, "ascii").digest("hex")
}

export function generateRemitoPublicToken(keyring: RemitoTokenKeyring): {
  nonce: string
  tokenKeyVersion: number
  token: string
  tokenHash: string
} {
  const nonce = encodeCanonicalBase64Url32(randomBytes(32), "nonce")
  const tokenKeyVersion = keyring.activeTokenKeyVersion
  const token = deriveRemitoPublicToken(keyring, tokenKeyVersion, nonce)
  return { nonce, tokenKeyVersion, token, tokenHash: hashRemitoPublicToken(token) }
}

export function timingSafeRemitoTokenHashMatches(token: string, storedHash: string | null): boolean {
  const canonicalToken = CANONICAL_BASE64URL_32.test(token)
    && Buffer.from(token, "base64url").toString("base64url") === token
  const candidateHash = createHash("sha256").update(token, "ascii").digest()
  const hasStoredHash = storedHash !== null && LOWERCASE_SHA256.test(storedHash)
  const expectedHash = hasStoredHash ? Buffer.from(storedHash, "hex") : PROCESS_DUMMY_HASH
  const equal = timingSafeEqual(candidateHash, expectedHash)
  return canonicalToken && hasStoredHash && equal
}

export function assertRemitoTokenKeyRetirementAllowed(input: {
  tokenKeyVersion: number
  activeTokenKeyVersion: number
  securityRotationCompleted: boolean
  currentAccessKeyVersions: Iterable<number>
  enabledPrintCohortKeyVersions: Iterable<number>
}): void {
  assertTokenKeyVersion(input.tokenKeyVersion)
  assertTokenKeyVersion(input.activeTokenKeyVersion, "activeTokenKeyVersion")
  if (!input.securityRotationCompleted) throw new Error("security rotation must complete before retirement")
  if (input.tokenKeyVersion === input.activeTokenKeyVersion) throw new Error("the active token key cannot retire")
  if ([...input.currentAccessKeyVersions].includes(input.tokenKeyVersion)) {
    throw new Error("a current access still references the token key")
  }
  if ([...input.enabledPrintCohortKeyVersions].includes(input.tokenKeyVersion)) {
    throw new Error("an enabled print cohort can still derive from the token key")
  }
}
