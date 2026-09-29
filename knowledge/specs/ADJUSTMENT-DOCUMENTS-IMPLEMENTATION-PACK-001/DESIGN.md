# Technical Design — Documentos de Ajuste Multi-Origen (NC / ND)

## 1. Data Model (Prisma Schema Proposal)

```prisma
enum AdjustmentType {
  CREDIT
  DEBIT
}

enum AdjustmentModality {
  TOTAL
  PARTIAL
  MANUAL
}

enum AdjustmentOriginType {
  INTERNAL_INVOICE
  EXTERNAL_INVOICE
  PERIOD
}

model AdjustmentDocument {
  id                 String               @id @default(cuid())
  companyId          String
  company            Company              @relation(fields: [companyId], references: [id], onDelete: Restrict)

  visibleNumber      Int?
  type               AdjustmentType       // CREDIT | DEBIT
  state              String               @default("Borrador") // Borrador | Emitida | Anulada
  originType         AdjustmentOriginType @default(INTERNAL_INVOICE)

  // Vínculo si origen es Factura Interna OSSUM
  internalInvoiceId  String?
  internalInvoice    Invoice?             @relation(fields: [internalInvoiceId], references: [id], onDelete: SetNull)

  // Snapshot Inmutable si origen es Comprobante Externo
  externalDocType    String?              // "FACTURA A", "FACTURA B", etc.
  externalPtoVta     Int?
  externalNumber     Int?
  externalIssueDate  DateTime?
  externalIssuerCuit String?
  externalCae        String?              // Evidencia complementaria opcional

  // Período si origen es por Período
  periodFrom         DateTime?
  periodTo           DateTime?

  // Datos comerciales y de contexto
  surgeryId          String?
  surgery            Surgery?             @relation(fields: [surgeryId], references: [id], onDelete: SetNull)
  clientName         String?
  clientDocumentType String?              // "CUIT", "DNI"
  clientDocumentNumber String?
  clientVatCondition String?              // "RI", "CF", "MT", "EX"

  modalidad          AdjustmentModality   @default(TOTAL)
  motivo             String
  observaciones      String?              @db.Text

  currency           String               @default("ARS")
  subtotal           Decimal              @default(0) @db.Decimal(18, 4)
  taxTotal           Decimal              @default(0) @db.Decimal(18, 4)
  total              Decimal              @default(0) @db.Decimal(18, 4)

  issuedAt           DateTime?
  cancelledAt        DateTime?

  createdById        String?
  createdBy          User?                @relation("AdjustmentCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)
  updatedById        String?
  updatedBy          User?                @relation("AdjustmentUpdatedBy", fields: [updatedById], references: [id], onDelete: SetNull)

  metadata           Json?
  createdAt          DateTime             @default(now())
  updatedAt          DateTime             @updatedAt

  items              AdjustmentDocumentItem[]
  fiscalDocument     FiscalDocument?

  @@unique([companyId, visibleNumber], map: "uq_adjustment_company_visible_number")
  @@index([companyId, state, createdAt], map: "ix_adjustment_company_state_created")
  @@index([companyId, originType], map: "ix_adjustment_company_origin")
  @@index([internalInvoiceId], map: "ix_adjustment_internal_invoice")
  @@map("adjustment_document")
}

model AdjustmentDocumentItem {
  id                   String             @id @default(cuid())
  adjustmentDocumentId String
  adjustmentDocument   AdjustmentDocument @relation(fields: [adjustmentDocumentId], references: [id], onDelete: Cascade)

  description          String
  quantity             Decimal            @default(1) @db.Decimal(18, 4)
  unitPrice            Decimal            @default(0) @db.Decimal(18, 4)
  discount             Decimal            @default(0) @db.Decimal(18, 4)
  tax                  Decimal            @default(0) @db.Decimal(18, 4)
  total                Decimal            @default(0) @db.Decimal(18, 4)

  vatTreatment         String             @default("GRAVADO")
  vatRate              Decimal            @default(21.0000) @db.Decimal(18, 4)

  originalQuantity     Decimal?           @db.Decimal(18, 4)
  sourceItemId         String?

  createdAt            DateTime           @default(now())
  updatedAt            DateTime           @updatedAt

  @@index([adjustmentDocumentId])
  @@map("adjustment_document_item")
}
```

---

## 2. TusFacturas / ARCA Adapter Enhancements

### Mapeo de Comprobantes Asociados Individuales
```typescript
if (doc.originType === "INTERNAL_INVOICE" && doc.internalInvoice) {
  comprobantePayload.comprobantes_asociados = [
    {
      tipo_comprobante: mapInvoiceTypeToTusFacturas(doc.internalInvoice.type),
      punto_venta: config.puntoVenta,
      numero: doc.internalInvoice.visibleNumber!,
      comprobante_fecha: formatDateToAr(doc.internalInvoice.issuedAt!),
      cuit: Number(company.cuit.replace(/\D/g, "")),
    }
  ]
} else if (doc.originType === "EXTERNAL_INVOICE") {
  comprobantePayload.comprobantes_asociados = [
    {
      tipo_comprobante: doc.externalDocType!,
      punto_venta: doc.externalPtoVta!,
      numero: doc.externalNumber!,
      comprobante_fecha: formatDateToAr(doc.externalIssueDate!),
      cuit: Number(doc.externalIssuerCuit!.replace(/\D/g, "")),
    }
  ]
}
```

### Mapeo de Comprobantes por Período
```typescript
if (doc.originType === "PERIOD") {
  if (doc.tipoComprobante.includes("E")) {
    throw new FiscalError("period_adjustment_not_allowed_for_e", "ARCA prohíbe emisión de notas tipo E por período", 422)
  }
  comprobantePayload.comprobantes_asociados_periodo = {
    fecha_desde: formatDateToAr(doc.periodFrom!),
    fecha_hasta: formatDateToAr(doc.periodTo!),
  }
}
```

---

## 3. REST API Contracts

### 1. `GET /api/companies/[companyId]/adjustment-documents`
- **Query Params:** `tipo` (`CREDITO` | `DEBITO`), `state`, `originType`, `search`, `issuedFrom`, `issuedTo`, `page`, `limit`.
- **Response:**
```json
{
  "data": [
    {
      "id": "adj-cuid",
      "visibleNumber": 12,
      "type": "CREDIT",
      "state": "Emitida",
      "originType": "INTERNAL_INVOICE",
      "invoiceNumber": "0001-00009901",
      "total": "45000.0000",
      "impacto": "-$ 45.000,00",
      "motivo": "Devolución de material",
      "issuedAt": "2026-09-20T10:00:00.000Z",
      "fiscalState": "AUTHORIZED",
      "cae": "74328901234567"
    }
  ],
  "kpis": {
    "creditCount": 5,
    "creditTotal": "125000.0000",
    "debitCount": 2,
    "debitTotal": "30000.0000",
    "netImpact": "-95000.0000"
  },
  "pagination": { "page": 1, "totalPages": 1, "totalItems": 7 }
}
```

### 2. `POST /api/companies/[companyId]/adjustment-documents`
- **Body:**
```json
{
  "type": "CREDIT",
  "originType": "INTERNAL_INVOICE",
  "internalInvoiceId": "inv-123",
  "modalidad": "PARTIAL",
  "motivo": "Devolución de material",
  "observaciones": "Devuelto en sala 4",
  "items": [
    {
      "description": "Set de Instrumental",
      "quantity": 1,
      "unitPrice": "45000.0000",
      "vatRate": 21.0
    }
  ]
}
```

### 3. `POST /api/companies/[companyId]/adjustment-documents/[id]/emit`
- Asigna `visibleNumber` correlativo inmutable.
- Si `originType === "INTERNAL_INVOICE"`, descuenta/incrementa transaccionalmente `Invoice.balance`.
- Si `originType === "EXTERNAL_INVOICE"` o `"PERIOD"`, congela el snapshot sin tocar `Invoice.balance`.
- Dispara intento de emisión fiscal DEV en `FiscalDocument`.
