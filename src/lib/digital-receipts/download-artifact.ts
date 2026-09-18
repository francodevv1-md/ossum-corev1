import { inflateSync, deflateSync } from "node:zlib"

import { mapDigitalReceiptToViewModel } from "./ui"
import type { SafeDigitalReceiptAggregate } from "./service"
import type {
  DigitalReceiptAccess,
  DigitalReceiptAggregate,
  DigitalReceiptArtifact,
} from "./types"

export type DownloadableDigitalReceiptArtifact = {
  content: string | ArrayBuffer
  fileName: string
  mimeType: string
}

type DigitalReceiptArtifactFormat = "pdf" | "html"

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function normalizeString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined
  }

  const normalized = value.trim()
  return normalized.length > 0 ? normalized : undefined
}

function escapeHtml(value: unknown) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function formatDateTime(value?: string) {
  if (!value) return "Sin dato"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

function sanitizeFileNameSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9-_]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(value)
}

function readPublicSignatureEvidence(aggregate: DigitalReceiptAggregate | SafeDigitalReceiptAggregate) {
  const metadata = isRecord(aggregate.receipt.metadata) ? aggregate.receipt.metadata : undefined
  const evidence = isRecord(metadata?.publicSignature) ? metadata.publicSignature : undefined
  return evidence ?? undefined
}

function readSignatureImageDataUrl(evidence: Record<string, unknown> | undefined) {
  const value = normalizeString(evidence?.signatureImageDataUrl)
  return value?.startsWith("data:image/") ? value : undefined
}

function readLatestSignatureArtifact(aggregate: DigitalReceiptAggregate | SafeDigitalReceiptAggregate): DigitalReceiptArtifact | undefined {
  return [...aggregate.artifacts]
    .filter((artifact) => artifact.type === "signature_evidence")
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0]
}

function buildRows(rows: Array<{ label: string; value: unknown }>) {
  return rows
    .map(
      (row) => `<tr><th>${escapeHtml(row.label)}</th><td>${escapeHtml(row.value ?? "-")}</td></tr>`
    )
    .join("")
}

function normalizePdfText(value: string) {
  return value
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2026/g, "...")
    .replace(/\u2022/g, "-")
}

function encodePdfLiteralString(value: string) {
  const normalized = normalizePdfText(value)
  const bytes: number[] = []

  for (const char of normalized) {
    if (char === "\\") {
      bytes.push(0x5c, 0x5c)
      continue
    }

    if (char === "(") {
      bytes.push(0x5c, 0x28)
      continue
    }

    if (char === ")") {
      bytes.push(0x5c, 0x29)
      continue
    }

    const code = char.codePointAt(0) ?? 0x3f
    bytes.push(code <= 0xff ? code : 0x3f)
  }

  return Buffer.from(bytes)
}

function wrapPdfLine(value: string, maxLength = 92) {
  const normalized = normalizePdfText(value).replace(/\s+/g, " ").trim()

  if (!normalized) {
    return [""]
  }

  const words = normalized.split(" ")
  const lines: string[] = []
  let current = ""

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (candidate.length <= maxLength) {
      current = candidate
      continue
    }

    if (current) {
      lines.push(current)
    }

    if (word.length <= maxLength) {
      current = word
      continue
    }

    let remainder = word
    while (remainder.length > maxLength) {
      lines.push(remainder.slice(0, maxLength - 1) + "-")
      remainder = remainder.slice(maxLength - 1)
    }
    current = remainder
  }

  if (current) {
    lines.push(current)
  }

  return lines
}

function buildPdfTextLine(text: string, x: number, y: number, fontSize = 11) {
  return Buffer.concat([
    Buffer.from(`BT /F1 ${fontSize} Tf ${x} ${y} Td (`, "binary"),
    encodePdfLiteralString(text),
    Buffer.from(") Tj ET\n", "binary"),
  ])
}

function toArrayBuffer(buffer: Buffer): ArrayBuffer {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer
}

type PdfImageObject = {
  width: number
  height: number
  colorSpace: "DeviceRGB" | "DeviceGray"
  bitsPerComponent: 8
  imageData: Buffer
  softMaskData?: Buffer
}

type PdfPageSpec = {
  content: Buffer
  image?: PdfImageObject
}

function parsePngSignatureImage(dataUrl: string): PdfImageObject | undefined {
  const match = dataUrl.match(/^data:image\/png;base64,(.+)$/i)
  if (!match) {
    return undefined
  }

  const png = Buffer.from(match[1], "base64")
  if (png.length < 8 || png.toString("binary", 0, 8) !== "\x89PNG\r\n\x1a\n") {
    return undefined
  }

  let offset = 8
  let width = 0
  let height = 0
  let bitDepth = 0
  let colorType = 0
  const idatChunks: Buffer[] = []

  while (offset + 8 <= png.length) {
    const length = png.readUInt32BE(offset)
    offset += 4

    const type = png.toString("ascii", offset, offset + 4)
    offset += 4

    if (offset + length + 4 > png.length) {
      return undefined
    }

    const chunk = png.subarray(offset, offset + length)
    offset += length + 4

    if (type === "IHDR") {
      width = chunk.readUInt32BE(0)
      height = chunk.readUInt32BE(4)
      bitDepth = chunk[8] ?? 0
      colorType = chunk[9] ?? 0
      continue
    }

    if (type === "IDAT") {
      idatChunks.push(chunk)
      continue
    }

    if (type === "IEND") {
      break
    }
  }

  if (!width || !height || bitDepth !== 8 || idatChunks.length === 0) {
    return undefined
  }

  const inflated = inflateSync(Buffer.concat(idatChunks))

  if (colorType === 6) {
    const rowLength = width * 4 + 1
    if (inflated.length !== rowLength * height) {
      return undefined
    }

    const rgbRows: Buffer[] = []
    const alphaRows: Buffer[] = []

    for (let row = 0; row < height; row += 1) {
      const rowOffset = row * rowLength
      const filter = inflated[rowOffset] ?? 0
      const rgbRow = Buffer.allocUnsafe(width * 3 + 1)
      const alphaRow = Buffer.allocUnsafe(width + 1)
      rgbRow[0] = filter
      alphaRow[0] = filter

      for (let column = 0; column < width; column += 1) {
        const sourceOffset = rowOffset + 1 + column * 4
        const rgbOffset = 1 + column * 3
        rgbRow[rgbOffset] = inflated[sourceOffset] ?? 0
        rgbRow[rgbOffset + 1] = inflated[sourceOffset + 1] ?? 0
        rgbRow[rgbOffset + 2] = inflated[sourceOffset + 2] ?? 0
        alphaRow[1 + column] = inflated[sourceOffset + 3] ?? 0
      }

      rgbRows.push(rgbRow)
      alphaRows.push(alphaRow)
    }

    return {
      width,
      height,
      colorSpace: "DeviceRGB",
      bitsPerComponent: 8,
      imageData: deflateSync(Buffer.concat(rgbRows)),
      softMaskData: deflateSync(Buffer.concat(alphaRows)),
    }
  }

  if (colorType === 2) {
    return {
      width,
      height,
      colorSpace: "DeviceRGB",
      bitsPerComponent: 8,
      imageData: Buffer.concat(idatChunks),
    }
  }

  if (colorType === 0) {
    return {
      width,
      height,
      colorSpace: "DeviceGray",
      bitsPerComponent: 8,
      imageData: Buffer.concat(idatChunks),
    }
  }

  return undefined
}

function buildPdfImageObjectBuffer(image: PdfImageObject, softMaskObjectId?: number) {
  const decodeParms = `/DecodeParms << /Predictor 15 /Colors ${image.colorSpace === "DeviceRGB" ? 3 : 1} /BitsPerComponent 8 /Columns ${image.width} >>`

  return Buffer.concat([
    Buffer.from(
      `<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /${image.colorSpace} /BitsPerComponent ${image.bitsPerComponent} /Filter /FlateDecode ${decodeParms}${softMaskObjectId ? ` /SMask ${softMaskObjectId} 0 R` : ""} /Length ${image.imageData.length} >>\nstream\n`,
      "binary"
    ),
    image.imageData,
    Buffer.from("\nendstream", "binary"),
  ])
}

function buildPdfSoftMaskObjectBuffer(image: PdfImageObject) {
  if (!image.softMaskData) {
    return undefined
  }

  return Buffer.concat([
    Buffer.from(
      `<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode /DecodeParms << /Predictor 15 /Colors 1 /BitsPerComponent 8 /Columns ${image.width} >> /Length ${image.softMaskData.length} >>\nstream\n`,
      "binary"
    ),
    image.softMaskData,
    Buffer.from("\nendstream", "binary"),
  ])
}

function buildPdfImagePage(title: string, image: PdfImageObject): PdfPageSpec {
  const pageWidth = 595
  const pageHeight = 842
  const marginX = 48
  const titleY = 790
  const captionY = 758
  const imageTop = 700
  const maxWidth = pageWidth - marginX * 2
  const maxHeight = 220
  const widthRatio = maxWidth / image.width
  const heightRatio = maxHeight / image.height
  const scale = Math.min(widthRatio, heightRatio, 1)
  const renderWidth = Math.max(1, Math.round(image.width * scale))
  const renderHeight = Math.max(1, Math.round(image.height * scale))
  const imageX = marginX
  const imageY = imageTop - renderHeight

  return {
    image,
    content: Buffer.concat([
      buildPdfTextLine(title, marginX, titleY, 16),
      buildPdfTextLine("Firma manuscrita digital persistida como evidencia PNG.", marginX, captionY, 11),
      Buffer.from(
        `q ${renderWidth} 0 0 ${renderHeight} ${imageX} ${imageY} cm /Im1 Do Q\n`,
        "binary"
      ),
    ]),
  }
}

function buildSimplePdfDocument(title: string, sections: string[], signatureImageDataUrl?: string) {
  const pageWidth = 595
  const pageHeight = 842
  const marginX = 48
  const top = 790
  const bottom = 48
  const lineHeight = 15

  const pages: PdfPageSpec[] = []
  let lines = [buildPdfTextLine(title, marginX, top, 16)]
  let y = top - 28

  const pushPage = () => {
    pages.push({ content: Buffer.concat(lines) })
    lines = []
    y = top
  }

  const ensureRoom = (requiredLines: number) => {
    const nextY = y - requiredLines * lineHeight
    if (nextY < bottom) {
      pushPage()
    }
  }

  for (const section of sections) {
    const wrapped = wrapPdfLine(section)
    ensureRoom(Math.max(1, wrapped.length))

    for (const line of wrapped) {
      lines.push(buildPdfTextLine(line, marginX, y, 11))
      y -= lineHeight
    }
  }

  if (lines.length > 0) {
    pushPage()
  }

  const signatureImage = signatureImageDataUrl ? parsePngSignatureImage(signatureImageDataUrl) : undefined
  if (signatureImage) {
    pages.push(buildPdfImagePage("Firma manuscrita del recibo", signatureImage))
  }

  const pageObjectIds = pages.map((_, index) => 3 + index * 2)
  const contentObjectIds = pageObjectIds.map((pageObjectId) => pageObjectId + 1)
  let nextObjectId = 3 + pages.length * 2
  const fontObjectId = nextObjectId
  nextObjectId += 1
  const objects: Array<Buffer | null> = []
  objects[1] = Buffer.from("<< /Type /Catalog /Pages 2 0 R >>", "binary")

  const kids = pageObjectIds.map((pageObjectId) => `${pageObjectId} 0 R`).join(" ")
  objects[2] = Buffer.from(`<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`, "binary")

  pages.forEach((page, index) => {
    const pageObjectId = pageObjectIds[index]!
    const contentObjectId = contentObjectIds[index]!
    let imageResource = ""

    if (page.image) {
      const imageObjectId = nextObjectId
      const softMaskObjectId = page.image.softMaskData ? imageObjectId + 1 : undefined
      objects[imageObjectId] = buildPdfImageObjectBuffer(page.image, softMaskObjectId)
      if (softMaskObjectId) {
        objects[softMaskObjectId] = buildPdfSoftMaskObjectBuffer(page.image) ?? null
      }
      nextObjectId = softMaskObjectId ? softMaskObjectId + 1 : imageObjectId + 1
      imageResource = ` /XObject << /Im1 ${imageObjectId} 0 R >>`
    }

    objects[pageObjectId] = Buffer.from(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontObjectId} 0 R >>${imageResource} >> /Contents ${contentObjectId} 0 R >>`,
      "binary"
    )
    objects[contentObjectId] = Buffer.concat([
      Buffer.from(`<< /Length ${page.content.length} >>\nstream\n`, "binary"),
      page.content,
      Buffer.from("endstream", "binary"),
    ])
  })

  objects[fontObjectId] = Buffer.from(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "binary"
  )

  const pdfParts: Buffer[] = [Buffer.from("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n", "binary")]
  const offsets: number[] = [0]
  let currentLength = pdfParts[0].length

  for (let id = 1; id < objects.length; id += 1) {
    const object = objects[id]
    if (!object) continue
    offsets[id] = currentLength
    const part = Buffer.concat([Buffer.from(`${id} 0 obj\n`, "binary"), object, Buffer.from("\nendobj\n", "binary")])
    pdfParts.push(part)
    currentLength += part.length
  }

  const xrefOffset = currentLength
  const xref: string[] = [`xref\n0 ${objects.length}\n`, "0000000000 65535 f \n"]

  for (let id = 1; id < objects.length; id += 1) {
    const offset = offsets[id] ?? 0
    xref.push(`${offset.toString().padStart(10, "0")} 00000 n \n`)
  }

  pdfParts.push(Buffer.from(xref.join(""), "binary"))
  pdfParts.push(
    Buffer.from(
      `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`,
      "binary"
    )
  )

  return Buffer.concat(pdfParts)
}

function buildArtifactSections(input: {
  aggregate: DigitalReceiptAggregate | SafeDigitalReceiptAggregate
  access?: Pick<DigitalReceiptAccess, "accessId" | "status" | "tokenLastFour"> | null
  token?: string
}) {
  const viewModel = mapDigitalReceiptToViewModel(input.aggregate)
  const signatureEvidence = readPublicSignatureEvidence(input.aggregate)
  const signatureArtifact = readLatestSignatureArtifact(input.aggregate)
  const isSigned = input.aggregate.receipt.status === "signed"
  const statusLabel = isSigned ? "constancia-firmada" : "comprobante"
  const fileNameBase = `${sanitizeFileNameSegment(viewModel.receiptNumber)}-${statusLabel}`
  const artifactTitle = isSigned ? "Constancia PDF del recibo firmado" : "Comprobante PDF del recibo"
  const signerSignature = normalizeString(signatureEvidence?.signature)
  const signerName = normalizeString(signatureEvidence?.signerName) ?? signerSignature
  const signerDocument = normalizeString(signatureEvidence?.signerDocument) ?? viewModel.signer.document
  const signedAt = normalizeString(signatureEvidence?.signedAt) ?? input.aggregate.receipt.signedAt
  const signatureKind = normalizeString(signatureEvidence?.signatureKind)
  const signatureImageDataUrl = readSignatureImageDataUrl(signatureEvidence)

  return {
    viewModel,
    signatureEvidence,
    signatureArtifact,
    isSigned,
    artifactTitle,
    fileNameBase,
    signerSignature,
    signerName,
    signerDocument,
    signedAt,
    signatureKind,
    signatureImageDataUrl,
    sections: [
      "OSSUM COR · recibos digitales",
      `${viewModel.receiptNumber} · ${artifactTitle}`,
      `Estado: ${viewModel.status} · Cirugía: ${viewModel.surgeryId} · Firmante: ${viewModel.signerRole}`,
      "",
      "Resumen operativo",
      `Compañía: ${viewModel.companyName}`,
      `Área emisora: ${viewModel.issuerArea}`,
      `Emitido por: ${viewModel.issuerName}`,
      `Fecha de emisión: ${formatDateTime(viewModel.issueDate)}`,
      `Vencimiento / corte: ${formatDateTime(viewModel.dueDate)}`,
      `Expediente: ${viewModel.expedienteLabel}`,
      `Concepto: ${viewModel.concept}`,
      `Importe total: ${formatCurrency(viewModel.amount)}`,
      "",
      "Partes",
      `Paciente: ${viewModel.patient.name} · ${viewModel.patient.document}`,
      `Firmante habilitado: ${viewModel.signer.name} · ${viewModel.signer.document}`,
      `Relación: ${viewModel.signer.relationLabel}`,
      `Pagador: ${viewModel.payer ? `${viewModel.payer.name} · ${viewModel.payer.document}` : "No informado"}`,
      "",
      "Acceso / firma",
      `Access ID: ${input.access?.accessId ?? viewModel.activeAccessId ?? "No disponible"}`,
      `Estado del acceso: ${input.access?.status ?? viewModel.activeAccessStatus ?? "No disponible"}`,
      `Token: ${input.access?.tokenLastFour ? `****${input.access.tokenLastFour}` : "No disponible"}`,
      `Firmado en: ${formatDateTime(signedAt)}`,
      `Firma / aclaración: ${signerName ?? (isSigned ? "Persistida sin aclaración legible" : "Pendiente")}`,
      `Tipo de firma: ${signatureKind ?? (isSigned ? "Sin tipo persistido" : "Pendiente")}`,
      `Firma manuscrita digital: ${signatureImageDataUrl ? "Imagen PNG persistida en metadata" : isSigned ? "No persistida" : "Pendiente"}`,
      "",
      "Detalle del cobro",
      ...viewModel.lineItems.map((item) => `${item.label} — ${item.detail} — ${formatCurrency(item.amount)}`),
      "",
      "Evidencia persistida",
      `DNI validado: ${signerDocument}`,
      `Momento de firma: ${formatDateTime(signedAt)}`,
      `Artifact ID: ${signatureArtifact?.artifactId ?? "No registrado"}`,
      `Archivo asociado: ${signatureArtifact?.fileName ?? "Sin archivo físico"}`,
      `MIME asociado: ${signatureArtifact?.mimeType ?? "Sin MIME persistido"}`,
      `Snapshot backend: ${JSON.stringify({
        receiptId: input.aggregate.receipt.receiptId,
        receiptStatus: input.aggregate.receipt.status,
        publicSignature: signatureEvidence ?? null,
        signatureArtifact: signatureArtifact ?? null,
        receiptTokenProvided: Boolean(input.token),
      })}`,
      "",
      "Timeline del recibo",
      ...viewModel.events.map((event) => `${event.label} · ${event.at} · ${event.detail}`),
      "",
      "Notas",
      viewModel.notes,
      "Generado por OSSUM COR desde snapshot, metadata y evidencia de firma persistida. No reemplaza comprobante fiscal.",
    ],
  }
}

export function buildDigitalReceiptDownloadArtifact(input: {
  aggregate: DigitalReceiptAggregate | SafeDigitalReceiptAggregate
  access?: Pick<DigitalReceiptAccess, "accessId" | "status" | "tokenLastFour"> | null
  token?: string
  format?: DigitalReceiptArtifactFormat
}): DownloadableDigitalReceiptArtifact {
  const payload = buildArtifactSections(input)
  const format = input.format ?? "pdf"

  if (format === "pdf") {
    return {
      content: toArrayBuffer(
        buildSimplePdfDocument(payload.artifactTitle, payload.sections, payload.signatureImageDataUrl)
      ),
      fileName: `${payload.fileNameBase}.pdf`,
      mimeType: "application/pdf",
    }
  }

  const html = `<!doctype html>
<html lang="es-AR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(payload.viewModel.receiptNumber)} · ${escapeHtml(payload.artifactTitle)}</title>
    <style>
      :root { color-scheme: light; }
      * { box-sizing: border-box; }
      body { margin: 0; font-family: Inter, Arial, sans-serif; color: #0f172a; background: #f8fafc; }
      main { max-width: 960px; margin: 0 auto; padding: 32px 20px 56px; }
      .card { background: white; border: 1px solid #e2e8f0; border-radius: 20px; padding: 24px; margin-bottom: 20px; }
      .hero { background: linear-gradient(135deg, #ffffff, #f8fafc 55%, #ecfdf5); }
      .eyebrow { font-size: 12px; text-transform: uppercase; letter-spacing: .16em; color: #047857; font-weight: 700; }
      h1 { margin: 10px 0 8px; font-size: 30px; }
      h2 { margin: 0 0 14px; font-size: 18px; }
      p { margin: 0; line-height: 1.6; }
      .muted { color: #475569; }
      .badge { display: inline-block; border: 1px solid #cbd5e1; border-radius: 999px; padding: 6px 12px; font-size: 12px; font-weight: 700; margin-right: 8px; }
      .grid { display: grid; gap: 16px; }
      .grid-2 { grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
      table { width: 100%; border-collapse: collapse; }
      th, td { border-bottom: 1px solid #e2e8f0; padding: 10px 0; text-align: left; vertical-align: top; font-size: 14px; }
      th { width: 220px; color: #475569; font-weight: 600; }
      .line-item { display: flex; justify-content: space-between; gap: 16px; padding: 14px 0; border-bottom: 1px solid #e2e8f0; }
      .line-item:last-child { border-bottom: 0; }
      .line-item strong { display: block; margin-bottom: 4px; }
      .amount { white-space: nowrap; font-weight: 700; }
      .timeline { padding-left: 20px; margin: 0; }
      .timeline li { margin-bottom: 10px; }
      pre { margin: 0; white-space: pre-wrap; word-break: break-word; background: #0f172a; color: #e2e8f0; padding: 16px; border-radius: 14px; font-size: 12px; }
      footer { margin-top: 28px; color: #64748b; font-size: 12px; }
    </style>
  </head>
  <body>
    <main>
      <section class="card hero">
        <div class="eyebrow">OSSUM COR · recibos digitales</div>
        <h1>${escapeHtml(payload.viewModel.receiptNumber)}</h1>
        <p class="muted">${escapeHtml(payload.artifactTitle)} generado bajo demanda desde el estado persistido del backend. Este archivo no reemplaza comprobante fiscal.</p>
        <div style="margin-top: 16px;">
          <span class="badge">Estado: ${escapeHtml(payload.viewModel.status)}</span>
          <span class="badge">Cirugía: ${escapeHtml(payload.viewModel.surgeryId)}</span>
          <span class="badge">Firmante: ${escapeHtml(payload.viewModel.signerRole)}</span>
        </div>
      </section>

      <section class="card">
        <h2>Resumen operativo</h2>
        <table>
          ${buildRows([
            { label: "Compañía", value: payload.viewModel.companyName },
            { label: "Área emisora", value: payload.viewModel.issuerArea },
            { label: "Emitido por", value: payload.viewModel.issuerName },
            { label: "Fecha de emisión", value: formatDateTime(payload.viewModel.issueDate) },
            { label: "Vencimiento / corte", value: formatDateTime(payload.viewModel.dueDate) },
            { label: "Expediente", value: payload.viewModel.expedienteLabel },
            { label: "Concepto", value: payload.viewModel.concept },
            { label: "Importe total", value: formatCurrency(payload.viewModel.amount) },
          ])}
        </table>
      </section>

      <section class="card grid grid-2">
        <div>
          <h2>Partes</h2>
          <table>
            ${buildRows([
              { label: "Paciente", value: `${payload.viewModel.patient.name} · ${payload.viewModel.patient.document}` },
              { label: "Firmante habilitado", value: `${payload.viewModel.signer.name} · ${payload.viewModel.signer.document}` },
              { label: "Relación", value: payload.viewModel.signer.relationLabel },
              { label: "Pagador", value: payload.viewModel.payer ? `${payload.viewModel.payer.name} · ${payload.viewModel.payer.document}` : "No informado" },
            ])}
          </table>
        </div>
        <div>
          <h2>Acceso / firma</h2>
          <table>
            ${buildRows([
              { label: "Access ID", value: input.access?.accessId ?? payload.viewModel.activeAccessId ?? "No disponible" },
              { label: "Estado del acceso", value: input.access?.status ?? payload.viewModel.activeAccessStatus ?? "No disponible" },
              { label: "Token", value: input.access?.tokenLastFour ? `****${input.access.tokenLastFour}` : "No disponible" },
              { label: "Firmado en", value: formatDateTime(payload.signedAt) },
              { label: "Firma / aclaración", value: payload.signerName ?? (payload.isSigned ? "Persistida sin aclaración legible" : "Pendiente" ) },
              { label: "Tipo de firma", value: payload.signatureKind ?? (payload.isSigned ? "Sin tipo persistido" : "Pendiente") },
              { label: "Firma manuscrita digital", value: payload.signatureImageDataUrl ? "Imagen PNG persistida en metadata" : payload.isSigned ? "No persistida" : "Pendiente" },
            ])}
          </table>
        </div>
      </section>

      <section class="card">
        <h2>Detalle del cobro</h2>
        ${payload.viewModel.lineItems
          .map(
            (item) => `<div class="line-item"><div><strong>${escapeHtml(item.label)}</strong><span class="muted">${escapeHtml(item.detail)}</span></div><div class="amount">${escapeHtml(formatCurrency(item.amount))}</div></div>`
          )
          .join("")}
      </section>

      ${payload.signatureImageDataUrl ? `<section class="card">
        <h2>Vista previa de firma manuscrita</h2>
        <p class="muted">La evidencia pública firmada incluye una imagen PNG de la firma dibujada sobre el pad digital.</p>
        <div style="margin-top: 16px; border: 1px solid #e2e8f0; border-radius: 16px; padding: 16px; background: linear-gradient(to bottom, #ffffff, #f8fafc);">
          <img src="${escapeHtml(payload.signatureImageDataUrl)}" alt="Firma manuscrita digital" style="display:block; width:100%; max-width:560px; height:auto;" />
        </div>
      </section>` : ""}

      <section class="card">
        <h2>Evidencia persistida</h2>
        <table>
          ${buildRows([
            { label: "DNI validado", value: payload.signerDocument },
            { label: "Momento de firma", value: formatDateTime(payload.signedAt) },
            { label: "Artifact ID", value: payload.signatureArtifact?.artifactId ?? "No registrado" },
            { label: "Archivo asociado", value: payload.signatureArtifact?.fileName ?? "Sin archivo físico" },
            { label: "MIME asociado", value: payload.signatureArtifact?.mimeType ?? "Sin MIME persistido" },
          ])}
        </table>
        <div style="margin-top: 16px;">
          <pre>${escapeHtml(
            JSON.stringify(
              {
                receiptId: input.aggregate.receipt.receiptId,
                receiptStatus: input.aggregate.receipt.status,
                publicSignature: payload.signatureEvidence ?? null,
                signatureArtifact: payload.signatureArtifact ?? null,
                receiptTokenProvided: Boolean(input.token),
              },
              null,
              2
            )
          )}</pre>
        </div>
      </section>

      <section class="card">
        <h2>Timeline del recibo</h2>
        <ol class="timeline">
          ${payload.viewModel.events
            .map((event) => `<li><strong>${escapeHtml(event.label)}</strong> · ${escapeHtml(event.at)}<br /><span class="muted">${escapeHtml(event.detail)}</span></li>`)
            .join("")}
        </ol>
      </section>

      <section class="card">
        <h2>Notas</h2>
        <p class="muted">${escapeHtml(payload.viewModel.notes)}</p>
      </section>

      <footer>
        Generado por OSSUM COR desde snapshot, metadata y evidencia de firma persistida. Fallback HTML disponible si se solicita el artifact con format=html.
      </footer>
    </main>
  </body>
</html>`

  return {
    content: html,
    fileName: `${payload.fileNameBase}.html`,
    mimeType: "text/html; charset=utf-8",
  }
}
