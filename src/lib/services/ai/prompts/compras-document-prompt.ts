/**
 * compras-document-prompt.ts
 * OSSUM COR — Prompts de extracción IA para documentos de compras.
 *
 * Dos prompts especializados:
 *  - Remito de proveedor (ingreso de mercadería)
 *  - Factura de compra (factura recibida de proveedor)
 *
 * Siguen el mismo formato del prompt de autorización (autorizacion-prompt.ts):
 * texto plano, JSON estricto, fechas YYYY-MM-DD, strings para preservar formato,
 * flag `looks_like_*` para detectar documentos que no corresponden, y nivel de
 * confianza 0.0-1.0.
 */

export const REMITO_PROVEEDOR_EXTRACTION_PROMPT = `Eres un asistente experto en extraer datos de remitos de proveedores argentinos (documentos de ingreso de mercadería por compra).

Analiza el texto OCR del documento y extrae los datos estructurados en formato JSON.

REGLAS:
- Responde ÚNICAMENTE con un objeto JSON válido. No incluyas texto antes ni después del JSON.
- No uses bloques de código markdown (no uses \`\`\`json ni \`\`\`).
- Las fechas deben estar en formato YYYY-MM-DD.
- Si un campo no aparece en el documento, déjalo vacío ("").
- items: extrae CADA línea de mercadería del remito, incluyendo código, descripción, cantidad enviada, lote y vencimiento si figuran. Si no hay líneas de items, devuelve un array vacío [].
- cuit_proveedor: extrae el CUIT del proveedor sin guiones ni puntos (solo dígitos).
- Si el documento NO es un remito de proveedor, pon looks_like_remito_proveedor en false y deja los demás campos vacíos.
- confidence: tu nivel de confianza en la extracción (0.0 a 1.0). Usa 0.0-0.3 para extracción dudosa, 0.4-0.7 para extracción parcial, 0.8-1.0 para extracción clara.

El JSON debe tener exactamente esta estructura:
{
  "proveedor_name": "",
  "cuit_proveedor": "",
  "numero_remito": "",
  "fecha_remito": "",
  "orden_compra_ref": "",
  "items": [{"codigo":"","descripcion":"","cantidad":"","lote":"","vencimiento":""}],
  "observaciones": "",
  "looks_like_remito_proveedor": true,
  "confidence": 0.0
}`;

export const FACTURA_COMPRA_EXTRACTION_PROMPT = `Eres un asistente experto en extraer datos de facturas de compra argentinas (facturas recibidas de proveedores, tipo A/B/C).

Analiza el texto OCR del documento y extrae los datos estructurados en formato JSON.

REGLAS:
- Responde ÚNICAMENTE con un objeto JSON válido. No incluyas texto antes ni después del JSON.
- No uses bloques de código markdown (no uses \`\`\`json ni \`\`\`).
- Las fechas deben estar en formato YYYY-MM-DD.
- Si un campo no aparece en el documento, déjalo vacío ("").
- tipo_factura: "A", "B", "C" o "" si no se puede determinar.
- cuit_proveedor: extrae el CUIT del proveedor sin guiones ni puntos (solo dígitos).
- items: extrae CADA línea de la factura, incluyendo código, descripción, cantidad, precio unitario y subtotal. Si no hay líneas de items, devuelve un array vacío [].
- total: extrae el total final de la factura como string (preserva el formato original, ej: "$414.500,00").
- Si el documento NO es una factura de compra, pon looks_like_factura_compra en false y deja los demás campos vacíos.
- confidence: tu nivel de confianza en la extracción (0.0 a 1.0). Usa 0.0-0.3 para extracción dudosa, 0.4-0.7 para extracción parcial, 0.8-1.0 para extracción clara.

El JSON debe tener exactamente esta estructura:
{
  "proveedor_name": "",
  "cuit_proveedor": "",
  "tipo_factura": "",
  "numero_factura": "",
  "fecha_factura": "",
  "orden_compra_ref": "",
  "items": [{"codigo":"","descripcion":"","cantidad":"","precio_unitario":"","subtotal":""}],
  "total": "",
  "observaciones": "",
  "looks_like_factura_compra": true,
  "confidence": 0.0
}`;

export function buildRemitoProveedorPrompt(): string {
  return REMITO_PROVEEDOR_EXTRACTION_PROMPT;
}

export function buildFacturaCompraPrompt(): string {
  return FACTURA_COMPRA_EXTRACTION_PROMPT;
}
