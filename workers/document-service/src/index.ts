import { createAzureDocumentReader } from "./azure-document-reader"
import {
  buildResultKey,
  isDocumentCreatedEvent,
  normalizeDocumentType,
  selectAzureModel,
  validateDocumentObject,
} from "./document-routing"
import type { R2ObjectCreatedEvent } from "./contracts"

async function processDocument(event: R2ObjectCreatedEvent, env: Env) {
  const object = await env.DOCUMENTS.get(event.object.key)
  if (!object) throw new Error("R2 source object not found")

  const currentEtag = object.etag.replace(/^"|"$/g, "")
  const eventEtag = event.object.eTag.replace(/^"|"$/g, "")
  if (currentEtag !== eventEtag) return

  const resultKey = buildResultKey(event.object.key, event.object.eTag)
  if (await env.DOCUMENTS.head(resultKey)) return

  const mimeType = object.httpMetadata?.contentType
  const rejectionReason = validateDocumentObject(object.size, mimeType)
  if (rejectionReason) {
    await env.DOCUMENTS.put(resultKey, JSON.stringify({
      source: {
        bucket: event.bucket,
        key: event.object.key,
        eTag: event.object.eTag,
        eventTime: event.eventTime,
      },
      status: "rejected",
      reason: rejectionReason,
    }), {
      httpMetadata: { contentType: "application/json" },
    })
    return
  }

  const documentType = normalizeDocumentType(object.customMetadata?.documentType)
  const model = selectAzureModel(documentType)
  const reader = createAzureDocumentReader(env, model)
  const result = await reader.read({
    bytes: await object.arrayBuffer(),
    mimeType: mimeType!,
    model,
  })

  await env.DOCUMENTS.put(resultKey, JSON.stringify({
    source: {
      bucket: event.bucket,
      key: event.object.key,
      eTag: event.object.eTag,
      eventTime: event.eventTime,
    },
    documentType,
    status: "extracted_pending_normalization",
    extraction: result,
  }), {
    httpMetadata: { contentType: "application/json" },
  })
}

export default {
  async queue(batch, env): Promise<void> {
    for (const message of batch.messages) {
      if (!isDocumentCreatedEvent(message.body)) {
        message.ack()
        continue
      }

      try {
        await processDocument(message.body, env)
        message.ack()
      } catch (error) {
        console.error("document_processing_failed", {
          messageId: message.id,
          errorName: error instanceof Error ? error.name : "UnknownError",
        })
        message.retry()
      }
    }
  },
} satisfies ExportedHandler<Env>
