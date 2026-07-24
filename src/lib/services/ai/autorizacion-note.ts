import type { AutorizacionAIResponse } from "@/lib/validators/autorizacion-ai"
import { formatMaterialAutorizado } from "@/lib/validators/autorizacion-ai"

export function buildAutorizacionSeguimientoText(
  result: AutorizacionAIResponse,
  options?: { fileName?: string }
) {
  const { extracted } = result
  const lines = [
    options?.fileName ? `Adjunto extraído: ${options.fileName}` : "Texto extraído desde adjunto de correo",
  ]

  const fields: Array<[string, string]> = [
    ["Paciente", extracted.paciente],
    ["DNI", extracted.dni],
    ["Médico", extracted.medico],
    ["Institución", extracted.institucion],
    ["Obra social", extracted.obra_social],
    ["Patología sugerida", extracted.patologia_sugerida],
    ["N° autorización", extracted.numero_autorizacion],
    ["N° siniestro", extracted.numero_siniestro],
    ["N° póliza", extracted.numero_poliza],
    ["Fecha autorización", extracted.fecha_autorizacion],
    ["Fecha cirugía", extracted.fecha_cirugia],
    ["Fecha probable", extracted.fecha_probable],
    ["Provincia sugerida", extracted.provincia_sugerida],
    ["Localidad sugerida", extracted.localidad_sugerida],
    ["Observaciones", extracted.observaciones],
  ]

  const populatedFields = fields.filter(([, value]) => value.trim().length > 0)
  if (populatedFields.length > 0) {
    lines.push("", ...populatedFields.map(([label, value]) => `${label}: ${value.trim()}`))
  }

  const materialText = formatMaterialAutorizado(extracted.material_autorizado).trim()
  if (materialText) {
    lines.push("", materialText)
  }

  const preview = result.raw_text_preview.trim()
  if (preview) {
    lines.push("", `Vista previa IA: ${preview}`)
  }

  return lines.join("\n").trim()
}
