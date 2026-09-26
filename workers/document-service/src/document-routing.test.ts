import assert from "node:assert/strict"
import test from "node:test"

import {
  buildResultKey,
  isDocumentCreatedEvent,
  normalizeEtag,
  normalizeDocumentType,
  selectAzureModel,
  validateDocumentObject,
} from "./document-routing.ts"

test("routes document types to the narrowest Azure model", () => {
  assert.equal(selectAzureModel("invoice"), "prebuilt-invoice")
  assert.equal(selectAzureModel("purchase_order"), "prebuilt-invoice")
  assert.equal(selectAzureModel("delivery_note"), "prebuilt-layout")
  assert.equal(selectAzureModel("authorization"), "prebuilt-layout")
  assert.equal(selectAzureModel("unknown"), "prebuilt-layout")
})

test("normalizes upload metadata without guessing unknown types", () => {
  assert.equal(normalizeDocumentType("purchase-order"), "purchase_order")
  assert.equal(normalizeDocumentType("invoice"), "invoice")
  assert.equal(normalizeDocumentType("something-new"), "unknown")
  assert.equal(normalizeDocumentType(undefined), "unknown")
})

test("accepts only object creation events inside the document inbox", () => {
  assert.equal(isDocumentCreatedEvent({
    action: "PutObject",
    bucket: "ossum-cor-documents-dev",
    object: { key: "document-inbox/company/invoice.pdf", eTag: "etag-1" },
    eventTime: "2026-08-16T00:00:00.000Z",
  }), true)

  assert.equal(isDocumentCreatedEvent({
    action: "PutObject",
    bucket: "ossum-cor-documents-dev",
    object: { key: "mail-evidence/file.pdf", eTag: "etag-1" },
    eventTime: "2026-08-16T00:00:00.000Z",
  }), false)

  assert.equal(isDocumentCreatedEvent({
    action: "LifecycleDeletion",
    bucket: "ossum-cor-documents-dev",
    object: { key: "document-inbox/company/invoice.pdf", eTag: "etag-1" },
    eventTime: "2026-08-16T00:00:00.000Z",
  }), false)

  assert.equal(isDocumentCreatedEvent({
    action: "PutObject",
    bucket: "another-bucket",
    object: { key: "document-inbox/company/invoice.pdf", eTag: "etag-1" },
    eventTime: "2026-08-16T00:00:00.000Z",
  }), false)
})

test("stores extraction results by immutable source version outside the event prefix", () => {
  assert.equal(
    buildResultKey("document-inbox/company/invoice.pdf", "\"etag:1\""),
    "document-results/company/invoice.pdf.etag_1.azure.json"
  )
  assert.equal(normalizeEtag("\"etag:1\""), "etag_1")
})

test("rejects unsupported or oversized objects before buffering them", () => {
  assert.equal(validateDocumentObject(1_000, "application/pdf"), null)
  assert.equal(validateDocumentObject(0, "application/pdf"), "empty_document")
  assert.equal(validateDocumentObject(4_000_001, "application/pdf"), "document_exceeds_azure_f0_limit")
  assert.equal(validateDocumentObject(1_000, "text/plain"), "unsupported_document_type")
})
