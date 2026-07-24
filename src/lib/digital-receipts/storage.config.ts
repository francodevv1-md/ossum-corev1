import "server-only"

export type DigitalReceiptR2StorageConfig = {
  provider: "cloudflare-r2"
  bucket: string
  endpoint: string
  region: string
  accessKeyId: string
  secretAccessKey: string
  keyPrefix: string
}

function normalizeString(value: string | undefined) {
  const normalized = value?.trim()
  return normalized ? normalized : undefined
}

function resolveEndpoint() {
  const explicitEndpoint = normalizeString(process.env.DIGITAL_RECEIPTS_R2_ENDPOINT)
  if (explicitEndpoint) {
    return explicitEndpoint
  }

  const accountId = normalizeString(process.env.DIGITAL_RECEIPTS_R2_ACCOUNT_ID)
  if (accountId) {
    return `https://${accountId}.r2.cloudflarestorage.com`
  }

  return undefined
}

export function getDigitalReceiptR2StorageConfig(): DigitalReceiptR2StorageConfig {
  const bucket = normalizeString(process.env.DIGITAL_RECEIPTS_R2_BUCKET)
  const endpoint = resolveEndpoint()
  const accessKeyId = normalizeString(process.env.DIGITAL_RECEIPTS_R2_ACCESS_KEY_ID)
  const secretAccessKey = normalizeString(process.env.DIGITAL_RECEIPTS_R2_SECRET_ACCESS_KEY)

  if (!bucket || !endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "Missing DigitalReceipt R2 configuration. Required env: DIGITAL_RECEIPTS_R2_BUCKET, DIGITAL_RECEIPTS_R2_ACCESS_KEY_ID, DIGITAL_RECEIPTS_R2_SECRET_ACCESS_KEY, and DIGITAL_RECEIPTS_R2_ENDPOINT or DIGITAL_RECEIPTS_R2_ACCOUNT_ID."
    )
  }

  return {
    provider: "cloudflare-r2",
    bucket,
    endpoint,
    region: normalizeString(process.env.DIGITAL_RECEIPTS_R2_REGION) ?? "auto",
    accessKeyId,
    secretAccessKey,
    keyPrefix: normalizeString(process.env.DIGITAL_RECEIPTS_R2_KEY_PREFIX) ?? "digital-receipts",
  }
}

export function hasDigitalReceiptR2StorageConfig() {
  return Boolean(
    normalizeString(process.env.DIGITAL_RECEIPTS_R2_BUCKET)
      && normalizeString(process.env.DIGITAL_RECEIPTS_R2_ACCESS_KEY_ID)
      && normalizeString(process.env.DIGITAL_RECEIPTS_R2_SECRET_ACCESS_KEY)
      && resolveEndpoint()
  )
}
