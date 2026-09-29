# Specification — Documentos de Ajuste Multi-Origen (NC / ND)

## 1. Domain Invariants

1. **Inmutabilidad del Comprobante Origen:**
   - La factura origen nunca se modifica, no se recalcula ni se sustituye.
   - El documento de ajuste es un comprobante legal e independiente con su propia numeración, trazabilidad y estado.
2. **Sentido del Ajuste:**
   - **Nota de Crédito (NC):** Disminución/anulación del crédito exigible. Para facturas internas emitidas, reduce el `Invoice.balance` adeudado (sin permitir saldos negativos).
   - **Nota de Débito (ND):** Incremento/recargo. Para facturas internas emitidas, incrementa el `Invoice.balance` a favor de la empresa.
3. **Desacoplamiento Operativo / Fiscal:**
   - Todo Documento de Ajuste posee ciclo de vida operativo (`Borrador` → `Emitida` → `Anulada`).
   - La evidencia fiscal (`FiscalDocument` / CAE) es complementaria y asíncrona; su ausencia no bloquea el registro administrativo interno, pero determina la leyenda obligatoria y la prohibición del código QR.

---

## 2. Orígenes de Ajuste Soportados

### Origen 1: Factura OSSUM Emitida Interna (`INTERNAL_INVOICE`)
- **Precondición:** La factura interna debe existir en la base de datos y estar en estado `Emitida` o `Parcialmente_cobrada`. Facturas en `Borrador` o `Anulada` quedan estrictamente bloqueadas.
- **Vínculo:** FK física obligatoria `internalInvoiceId -> Invoice.id`.
- **Impacto en Cuenta/Saldo:** Impacta de forma transaccional en `Invoice.balance` interno de OSSUM al emitirse.
- **Asociación Fiscal:** Se extrae `(tipo, punto_venta, visibleNumber, issuedAt, CUIT)` de la factura interna para construir `comprobantes_asociados`.

### Origen 2: Comprobante Externo / Preexistente (`EXTERNAL_INVOICE`)
- **Propósito:** Ajustar facturas emitidas antes de la implementación de OSSUM o en sistemas externos/facturación previa.
- **Vínculo:** No posee FK `Invoice.id`. Almacena un **snapshot inmutable de origen** con:
  - `originDocType`: tipo oficial de comprobante (ej. `"FACTURA A"`, `"FACTURA B"`).
  - `originPointOfSale`: punto de venta (1..99999).
  - `originNumber`: número de comprobante (1..99999999).
  - `originIssueDate`: fecha original de emisión.
  - `originIssuerCuit`: CUIT de quien emitió la factura original (debe coincidir con la empresa emisora).
  - `originCae`: CAE original (evidencia complementaria de auditoría, opcional, no vinculante para AFIP).
- **Regla de Balance:** **Una NC externa NO modifica `Invoice.balance` interno** de ninguna factura.
- **Regla de Cuenta Corriente:** No genera saldo a favor automático hasta contar con pagadores/cuenta corriente autoritativos integrados.

### Origen 3: Período Desde / Hasta (`PERIOD`)
- **Propósito:** Ajustes globales comerciales o bonificaciones por volumen correspondientes a un lapso temporal determinado.
- **Permisos:** **Exclusivo para rol `admin`**.
- **Normativa ARCA:** Habilitado para comprobantes A, B y C. **Prohibido estrictamente para comprobantes E (Exportación)**.
- **Estructura:** Objeto `comprobantes_asociados_periodo` con `{ fecha_desde, fecha_hasta }`.

---

## 3. Máquina de Estados y Transiciones

```txt
┌─────────────┐       emit()        ┌─────────────┐
│  Borrador   │ ──────────────────> │   Emitida   │
└─────────────┘                     └─────────────┘
       │                                   │
       │ cancel()                          │ void()
       v                                   v
┌─────────────┐                     ┌─────────────┐
│   Anulada   │ <────────────────── │   Anulada   │
└─────────────┘                     └─────────────┘
```

- **Borrador:** Permite edición de tipo, modalidad, motivo, ítems y montos. No posee numeración oficial definitiva.
- **Emitida:** Adquiere número correlativo `visibleNumber` inmutable. Los datos quedan congelados (solo lectura). Genera intento de emisión fiscal DEV.
- **Anulada:** Estado terminal. No se puede revertir ni reemitir. Si posee CAE autorizado, la anulación operativa debe registrarse con guard de auditoría.
