# Copywriting Rules — OSSUM Contextual Help

---

## 1. Vocabulario Canónico de Dominio

| Término Correcto | Término Incorrecto / Prohibido | Contexto |
| :--- | :--- | :--- |
| **Cirugía / Expediente** | Ticket, Orden, Caso genérico | La entidad troncal del ERP. |
| **Presupuesto** | Cotización, Estimación mock | Documento comercial previo a la cirugía. |
| **Remito Unificado** | Envío, Delivery, Remito viejo | Documento logístico que ampara salida de materiales/cajas. |
| **Consumo / Devolución** | Gasto, Resto | Lo implantado vs lo devuelto al stock tras la cirugía. |
| **Línea Libre / Venta Libre** | Artículo mock, Z-item, Fake item | Ítem no enlazado al catálogo de stock oficial. |
| **Factura Operativa (DEV)** | Factura AFIP final, Factura mock | Facturación interna sincronizada con backend en DEV. |
| **Alícuota IVA** | Tax rate, Impuesto | 21%, 10.5%, 27% o Exento. |

---

## 2. Pautas de Redacción

1. **Brevedad**: Máximo 2 a 3 líneas (menos de 150 caracteres para `HelpTip`; menos de 250 para `InfoTooltip`).
2. **Claridad Directa**: Ir directo al punto sin rodeos ("Ingresá...", "Seleccioná...", "Indica...").
3. **Sin Jerga Técnica**:
   - ❌ *"Se persiste en la tabla Invoices con Prisma."*
   - ✅ *"Queda guardado como borrador operativo en el sistema."*
   - ❌ *"El hook useInvoiceForm calcula el IVA en tiempo real."*
   - ✅ *"Calcula automáticamente el IVA según la alícuota elegida."*
4. **Cero Redundancia**:
   - ❌ Label: *Condición de Pago* ➔ Tooltip: *"Es la condición de pago."*
   - ✅ Label: *Condición de Pago* ➔ Tooltip: *"Plazo acordado para la cancelación del comprobante (e.g. 30 días)."*
