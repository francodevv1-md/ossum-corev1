import { getAccessToken } from "@/lib/auth/client"
import { apiFetch } from "@/lib/api/client"
import { mapSeguimientoFeedResponse, type SeguimientoEntryView, type SeguimientoFeedApiResponse } from "@/lib/api/seguimiento-adapter"
import type { EmailAttachment } from "@/lib/services/resend.service"
import { MAIL_MAX_FILE_BYTES, normalizeMailAttachments } from "@/lib/validators/mail.validator"

export function readMailFile(file: Blob, filename: string): Promise<EmailAttachment> {
  if (!file.size || file.size > MAIL_MAX_FILE_BYTES) return Promise.reject(new Error(`El archivo ${filename} está vacío o supera 6 MB.`))
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error(`No se pudo leer ${filename}.`))
    reader.onload = () => {
      try {
        resolve(normalizeMailAttachments([{ filename, content: String(reader.result), contentType: file.type }])[0])
      } catch (error) { reject(error) }
    }
    reader.readAsDataURL(file)
  })
}

export async function loadAuthorizationFeed(companyId: string, surgeryId: string, authorizationOnly = true) {
  const response = await apiFetch<SeguimientoFeedApiResponse>(
    `/api/companies/${encodeURIComponent(companyId)}/surgeries/${encodeURIComponent(surgeryId)}/seguimiento?take=100${authorizationOnly ? "&entryType=authorization_evidence" : ""}`
  )
  return mapSeguimientoFeedResponse(response, 100)
}

/** Follow only explicit source links; never infer authorization from an unrelated image. */
export async function loadAuthorizationAttachments(companyId: string, surgeryId: string, selected: SeguimientoEntryView, knownEntries: SeguimientoEntryView[] = [], additional: EmailAttachment[] = []): Promise<EmailAttachment[]> {
  const attachments: EmailAttachment[] = []
  let entries = knownEntries
  let fetchedSources = false
  let entry: SeguimientoEntryView | undefined = selected
  const visited = new Set<string>()
  while (entry) {
    if (visited.has(entry.id) || visited.size >= 8) throw new Error("La evidencia tiene un vínculo de origen inválido.")
    visited.add(entry.id)
    const files = [...(entry.photoMeta?.files || []), ...(entry.imageEvidenceMeta?.files || [])]
    for (const [index, file] of files.entries()) {
      if (!file.previewDataUrl) throw new Error("Faltan bytes de una imagen de evidencia. Revisá la novedad original o adjuntá el archivo real.")
      const mimeType = /^data:([^;,]+);base64,/.exec(file.previewDataUrl)?.[1]
      attachments.push(...normalizeMailAttachments([{
        filename: file.name || `evidencia-${index + 1}.${mimeType === "image/jpeg" ? "jpg" : mimeType?.split("/")[1] || "img"}`,
        content: file.previewDataUrl, contentType: file.mimeType || mimeType,
      }]))
    }
    if (entry.documentMeta) {
      if (entry.documentMeta.status !== "queued") throw new Error("El documento todavía no está disponible. Reintentá cuando termine la carga.")
      const token = await getAccessToken()
      const response = await fetch(`/api/companies/${encodeURIComponent(companyId)}/surgeries/${encodeURIComponent(surgeryId)}/seguimiento/documents/${encodeURIComponent(entry.id)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      if (!response.ok) throw new Error("No se pudo cargar el documento original. Reintentá o adjuntá el archivo real.")
      const blob = await response.blob()
      attachments.push(await readMailFile(blob, entry.documentMeta.fileName))
    }
    const sourceId = entry.evidenceRef?.sourceEntryId
    if (typeof sourceId !== "string" || !sourceId) break
    let source = entries.find((item) => item.id === sourceId)
    if (!source && !fetchedSources) {
      entries = (await loadAuthorizationFeed(companyId, surgeryId, false)).entries
      fetchedSources = true
      source = entries.find((item) => item.id === sourceId)
    }
    if (!source) throw new Error("La novedad de origen no está disponible en los últimos 100 registros. Abrí la autorización desde Novedades con su origen cargado o adjuntá el archivo real.")
    entry = source
  }
  const combined = normalizeMailAttachments([...additional, ...attachments], true)
  if (!combined.length) throw new Error("Esta evidencia no tiene imágenes o documentos disponibles. Adjuntá el archivo real; no se enviará una evidencia vacía.")
  return combined
}
