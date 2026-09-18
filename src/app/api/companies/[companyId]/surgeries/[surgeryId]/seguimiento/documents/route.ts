import { getApiAuthContext } from "@/lib/api/auth-context"
import { badRequest } from "@/lib/api/errors"
import { requireSeguimientoEventMutationAccess } from "@/lib/api/guards"
import { created, errorResponse } from "@/lib/api/responses"
import prisma from "@/lib/prisma"
import { uploadOperationalDocument } from "@/lib/services/operational-document-upload.service"
import { resolveCompanySurgery } from "@/lib/surgery/resolve-company-surgery"
import { OPERATIONAL_DOCUMENT_MAX_BYTES, validateOperationalDocument, validateOperationalDocumentDescription } from "@/lib/validators/operational-document-upload.validator"

type RouteContext = { params: Promise<{ companyId: string; surgeryId: string }> }
const MAX_MULTIPART_BYTES = OPERATIONAL_DOCUMENT_MAX_BYTES + 100_000

async function readBoundedFormData(request: Request) {
  const contentLength = Number(request.headers.get("content-length") || "0")
  if (contentLength > MAX_MULTIPART_BYTES) {
    throw badRequest("The document exceeds the 4 MB processing limit", "document_too_large")
  }
  if (!request.body) return request.formData()

  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > MAX_MULTIPART_BYTES) {
      await reader.cancel().catch(() => undefined)
      throw badRequest("The document exceeds the 4 MB processing limit", "document_too_large")
    }
    chunks.push(value)
  }

  const body = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new Request(request.url, {
    method: request.method,
    headers: request.headers,
    body: body as BodyInit,
  }).formData()
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { companyId, surgeryId } = await params
    const ctx = await getApiAuthContext(request, companyId)
    requireSeguimientoEventMutationAccess(ctx)
    const surgery = await resolveCompanySurgery(ctx.companyId, surgeryId)

    const formData = await readBoundedFormData(request)
    const files = formData.getAll("file")
    if (files.length !== 1 || !(files[0] instanceof File)) {
      throw badRequest("Exactly one document file is required", "invalid_document_upload")
    }

    const entry = await uploadOperationalDocument({
      prisma,
      companyId: ctx.companyId,
      surgeryId: surgery.id,
      actorUserId: ctx.actorUserId,
      description: validateOperationalDocumentDescription(formData.get("description")),
      file: await validateOperationalDocument(files[0]),
    })
    return created(entry)
  } catch (error) {
    return errorResponse(error)
  }
}
