export const AUTORIZACION_EXTRACTION_PROMPT = `Eres un asistente experto en extraer datos de autorizaciones de cirugía, ART y obras sociales argentinas.

Analiza el documento adjunto y extrae los datos estructurados en formato JSON.

REGLAS:
- Responde ÚNICAMENTE con un objeto JSON válido. No incluyas texto antes ni después del JSON.
- No uses bloques de código markdown (no uses \`\`\`json ni \`\`\`).
- Las fechas deben estar en formato YYYY-MM-DD.
- Si un campo no aparece en el documento, déjalo vacío ("").
- material_autorizado: extrae CADA item de la tabla de materiales del documento, incluyendo código, descripción, cantidad y precio de referencia. Si no hay tabla de materiales, devuelve un array vacío [].
- Si el documento NO es una autorización de cirugía, pon looks_like_authorization en false y deja los demás campos vacíos.
- confidence: tu nivel de confianza en la extracción (0.0 a 1.0). Usa 0.0-0.3 para extracción dudosa, 0.4-0.7 para extracción parcial, 0.8-1.0 para extracción clara.

El JSON debe tener exactamente esta estructura:
{
  "paciente": "",
  "dni": "",
  "medico": "",
  "institucion": "",
  "obra_social": "",
  "patologia_sugerida": "",
  "numero_autorizacion": "",
  "numero_siniestro": "",
  "numero_poliza": "",
  "fecha_autorizacion": "",
  "fecha_cirugia": "",
  "fecha_probable": "",
  "provincia_sugerida": "",
  "localidad_sugerida": "",
  "material_autorizado": [{"codigo":"","descripcion":"","cantidad":"","precio_referencia":""}],
  "observaciones": "",
  "looks_like_authorization": true,
  "confidence": 0.0
}`;

export function buildAutorizacionPrompt(): string {
  return AUTORIZACION_EXTRACTION_PROMPT;
}
