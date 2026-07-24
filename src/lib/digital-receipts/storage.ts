import "server-only"

import { buildDigitalReceiptArtifactObjectKey } from "./storage.keys"
import {
  createDigitalReceiptArtifactStorageMetadataFromUpload,
  createDigitalReceiptR2StorageAdapter,
  R2DigitalReceiptArtifactStorageAdapter,
} from "./storage.r2"

export {
  getDigitalReceiptR2StorageConfig,
  hasDigitalReceiptR2StorageConfig,
} from "./storage.config"
export { buildDigitalReceiptArtifactObjectKey } from "./storage.keys"
export {
  attachDigitalReceiptArtifactStorageMetadata,
  buildDigitalReceiptArtifactStorageMetadata,
  DIGITAL_RECEIPT_ARTIFACT_STORAGE_METADATA_VERSION,
  DIGITAL_RECEIPT_STORAGE_PROVIDER,
  isReadableDigitalReceiptArtifactStream,
  readDigitalReceiptArtifactStorageMetadata,
  type DigitalReceiptArtifactObjectHead,
  type DigitalReceiptArtifactObjectRead,
  type DigitalReceiptArtifactStorageAdapter,
  type DigitalReceiptArtifactStorageKeyInput,
  type DigitalReceiptArtifactStorageLocator,
  type DigitalReceiptArtifactStorageMetadata,
  type DigitalReceiptArtifactStorageMetadataInput,
  type DigitalReceiptStorageProvider,
  type UploadDigitalReceiptArtifactObjectInput,
  type UploadDigitalReceiptArtifactObjectResult,
} from "./storage.types"
export {
  createDigitalReceiptArtifactStorageMetadataFromUpload,
  createDigitalReceiptR2StorageAdapter,
  R2DigitalReceiptArtifactStorageAdapter,
} from "./storage.r2"

export const digitalReceiptArtifactStorage = createDigitalReceiptR2StorageAdapter

export function buildDigitalReceiptR2UploadPlan(input: Parameters<typeof buildDigitalReceiptArtifactObjectKey>[0]) {
  return {
    objectKey: buildDigitalReceiptArtifactObjectKey(input),
    storage: createDigitalReceiptR2StorageAdapter(),
    buildMetadata: createDigitalReceiptArtifactStorageMetadataFromUpload,
  }
}
