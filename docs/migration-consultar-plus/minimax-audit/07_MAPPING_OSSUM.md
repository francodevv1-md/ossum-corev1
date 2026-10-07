# 07 — Mapping Legacy → OSSUM

## Tabla maestra de mapeo

### Entidades principales

| Legacy | OSSUM | FK | Confianza | Notas |
|---|---|---|:---:|---|
| `CIRUGIA.CIRCOD` | `Surgery.visibleNumber` (Int) | N 7 → Int | CONFIRMADA | Único; ya validado sin duplicados |
| `CIRUGIA` | `Surgery` | - | CONFIRMADA | 43 campos; ver desglose abajo |
| `CLIENTE` | `Contact` | `Surgery.patientId`, etc. | CONFIRMADA | Mapeo universal de roles |
| `CLIENTE.CLIATRI` | `ContactGroupMembership` + attrs custom | - | MEDIA | Mapeo por atributo; revisar GLN/SUCURSAL_PROPUESTA |
| `VIAJANTE` | `Contact` (rol coordinador) | - | ALTA | Solo 7 registros |
| `CIRTIP` | `ContactGroup` o enum custom | - | MEDIA | 75 registros; ¿va en ContactGroup o en metadata? |
| `STOCK` (STKCOM='RE') | `Remito` | `Remito.surgeryId` | CONFIRMADA | Solo comprobantes RE son remitos |
| `STOCK1` (de STKCOM='RE') | `RemitoItem` | - | CONFIRMADA | Cada línea es un item |
| `STOCK` (STKCOM='NR') | ❌ NO migra como Remito | - | - | Es la reserva inicial; debe transformarse a otra cosa |
| `STOCK.STKDEV='S' + STKES='E'` | `Devolucion` + `DevolucionItem` | `Devolucion.remitoId` | CONFIRMADA | Patrón DEVOLUCIÓN-CONSUMO |
| `STOCK.STKCOM='AJ'` | `StockMovement` (TRANSFER) | - | MEDIA | Ajustes manuales |
| `STOCK.STKVTACOD` | `Invoice.id` (mapping legacy) | - | CONFIRMADA | FK directa |
| `CUENTAS` | `Invoice` | `Invoice.surgeryId` | CONFIRMADA | 90 campos; mapear estados |
| `CUENTASD` | `InvoiceItem` | - | CONFIRMADA | 62 campos; mapear artcod → sku |
| `CUENTASH` | `AuditEvent` / `Invoice.metadata` | - | MEDIA | Histórico; considerar ignorar o comprimir |
| `CUENTASC` | `Invoice.metadata` (comisiones) | - | BAJA | Raro, 2,010 registros |
| `ARTICULO` | `Article` | - | CONFIRMADA | 115 campos; mapear subset |
| `ARTATRI` | `Article.metadata` + tipos custom | - | MEDIA | Solo 2 atributos usados (GTING, PM) |
| `FORMULA1` | `Article.metadata.formulaBOM` | - | MEDIA | JSON con líneas |
| `FORMHIS` | ❌ NO migra | - | - | Histórico de cambios de fórmula |
| `HISCAM` | `AuditEvent` | - | MEDIA | Histórico de cambios de campos; volumen alto |
| `HISCOS` | `Article.metadata.costHistory` | - | MEDIA | Costos históricos |
| `HISREG` | ❌ NO migra | - | - | Trigger log |
| `HISCON` | `Invoice.metadata` | - | BAJA | Control de numeración |
| `HISPRE` | `Article.metadata.priceHistory` | - | BAJA | Precios históricos |
| `VARHIS` | ❌ NO migra | - | - | Variantes; parece interno |
| `ADMUSR` | `User` | - | CONFIRMADA | 27 usuarios |
| `ADMGRP/1` | `UserCompanyAccess.role` | - | MEDIA | 8 grupos, 39 asignaciones |
| `OBSASO` | `AuditEvent.notes` o similar | - | MEDIA | 18,074 observaciones asociadas |
| `CIRNOTAS` | `Surgery.notes` + extensión propia | - | MEDIA | 6,365 notas; alta calidad |
| `REPARTO/1` | ❌ NO migra | - | - | Tabla casi vacía; feature abandonado |
| `NECCOM` | `NecesidadCompra` | - | ALTA | 11,120 registros |
| `CAMBIO` | `Currency` snapshot | - | MEDIA | 99,402 cotizaciones históricas |

### Mapeo de campos CIRUGIA → Surgery

| Legacy | OSSUM | Tipo | Transformación |
|---|---|---|---|
| `CIRCOD` | `visibleNumber` | Int | Cast N 7 → Int |
| `CIRFECCAR` | `createdAt` (proxy) | DateTime | Cast D → DateTime (00:00:00) |
| `CIRFEC` | `surgeryDate` (si cirfec) | DateTime? | Cast D → DateTime? |
| `CIRFECLOG` | `materialShippingDate` | DateTime? @db.Date | Cast D → Date |
| `CIRESTADO` | `cxStatus` | String | **MAPEO CRÍTICO** — ver §2 abajo |
| `CIRPRE` ('S' cuando hay pre-ingreso) | `prepStatus` | String | **MAPEO CRÍTICO** |
| `CIRPACCOD` | `patientId` (FK Contact) | CUID | FK lookup |
| `CIRMEDCOD` | `doctorId` (FK Contact) | CUID? | FK lookup; opcional si cirmedcod está vacío |
| `CIRHOSCOD` | `institutionId` (FK Contact) | CUID? | FK lookup |
| `CIROSCOD` | `payerContactId` (FK Contact) | CUID? | FK lookup |
| `CIRTIP` | `classification` (String) | String | FK textual a CIRTIP; concatenar CIRTIPDES |
| `CIROBS` (memo) | `notes` (Text) | String | Truncar a 2000 chars |
| `VIACOD` | `createdById` o metadata | String | **Decisión**: ¿es vendedor o coordinador? |
| `AUSRID` | `createdById` (FK User) | CUID? | FK lookup por ausrid |
| `CIRPRCOD` / `CIRPRNRO` | `presupuestoId` (FK Presupuesto) | CUID? | Si hay presupuesto; ver §3 |
| `CIRDOC` | `metadata.documents` | Json | Parsear pattern de 12 chars |
| `CIRTRAZ` ('T'/'Y') | `metadata.trazabilidad` | Json | Flag booleano |
| `CIRCOCOD` / `CIRFCCOD` | (legacy only) | - | Descartar o metadata |
| `CIRDOC` + flags (cirdocre, cirdocce, etc.) | `metadata.documents` | Json | Consolidar |

### Mapeo de campos CLIENTE → Contact + ContactCompanyLink

**CLIENTE → Contact**

| Legacy | OSSUM | Transformación |
|---|---|---|
| `CLICOD` | (no OSSUM) | El CLICOD se preserva en `ContactCompanyLink.code` |
| `CLINOM` | `legalName` o `firstName + lastName` | Si ISCOMPANY=true → legalName; sino split |
| `CLINOMFAN` | `tradeName` | Directo |
| `CLIDNI` / `CLICUI` | `documentNumber` + `documentType` | DNI: 'DNI'; CUIT 11 dígitos: 'CUIT' |
| `CLIDOM` | `ContactAddress` (principal) | Tipo 'fiscal' |
| `CLIDOMENV` | `ContactAddress` (envío) | Tipo 'envio' |
| `CLITEL` / `CLITELLAB` | `phone` | Concatenar con ; |
| `CLIEMA` | `email` | Directo |
| `CLIFECNAC` | `metadata.birthDate` | Date |
| `CLISEX` | `metadata.gender` | String |
| `CLIAFPICOD` | `metadata.afipCode` | String |
| `CLIAct='N'` | `isActive=false` | Booleano |
| `CLICODGES` | `metadata.gestor` | String |

**CLIENTE → ContactCompanyLink (roles)**

Para cada CLIENTE, generar ContactCompanyLink según dónde aparece en CIRUGIA:

- Aparece como `CIRPACCOD` → roles=['patient']
- Aparece como `CIRMEDCOD` → roles=['doctor'] + `specialty`, `doctorLicense` si hay datos
- Aparece como `CIRHOSCOD` → roles=['institution']
- Aparece como `CIROSCOD` → roles=['payer'] + `isPayer=true`
- Aparece en `STOCK.CLICOD` → roles=['client'] (cliente comercial, no paciente)
- Si aparece en múltiples roles → múltiples ContactCompanyLink (1 por rol)

**CLIATRI → metadata + campos custom**

Los 17 atributos conocidos mapean así:

| CLIATRI.ATRDES | OSSUM destino |
|---|---|
| `AFIP_GRAN_EMPRESA` | `ContactCompanyLink.metadata.afipGranEmpresa` (Boolean) |
| `FCE_MONTO_MINIMO` | `ContactCompanyLink.metadata.fceMontoMinimo` (Decimal) |
| `SUCURSAL_PROPUESTA` | `ContactCompanyLink.metadata.sucursalPropuesta` (String) |
| `SUCURSAL_PROPUESTA_NR` | (idem) |
| `LOGISTICA` | `ContactCompanyLink.metadata.logistica` (String) |
| `ALTERNATIVOS` | `ContactCompanyLink.metadata.alternativos` (String) |
| `EXCLUIR_CPTES` | `ContactCompanyLink.metadata.excluirCptes` (String) |
| `PERCEPCION_DE_IVA` | `ContactCompanyLink.metadata.percepcionIva` (String) |
| `DESCUENTO_COMPRAS` | `ContactCompanyLink.usualDiscount` (Decimal) |
| `GLN` | `ContactCompanyLink.metadata.gln` (String) |
| `MOSTRAR_EN_EMPRESA` | `ContactCompanyLink.metadata.mostrarEnEmpresa` (Boolean) |
| `CLITEMRET/POR/MIN` | `ContactCompanyLink.vatCondition` + variantes |
| `CLINOMORTO` | `Contact.metadata.fallecido` (Boolean) |
| `ULT_DATOS_CT_PROPIO` | descartar |
| `DESTINO_TRANSFERENCIA` | descartar |

## Mapeo CRÍTICO: CIRESTADO → cxStatus / prepStatus

OSSUM tiene DOS campos de estado separados. El legacy solo tiene UNO (CIRESTADO).

| CIRESTADO | cxStatus | prepStatus | Notas |
|---|---|---|---|
| `SAU` (Sin Autorizar) | `pending` | (null o `pending`) | Aún sin autorización |
| `AUT` (Autorizada) | `pending` | `authorized` | Autorizada, esperando preparar |
| `PEN` (Pendiente) | `pending` | `pending` | Pendiente, sin preparar |
| `TRA` (En Tránsito) | `pending` | `in_transit` | Material en camino |
| `REA` (Realizada, con consumo) | `performed` | `consumed` | Cirugía hecha; sin facturar |
| `FIN` (Finalizada, facturada) | `finalized` | `consumed` | Cirugía hecha y facturada |
| `CAN` (Cancelada) | `cancelled` | (null) | Cancelada antes o durante |
| `SUS` (Suspendida) | `suspended` | (null) | Suspendida temporalmente |
| `SCO` (Sin Consumo) | `no_consumption` | `consumed_partial` | Realizada sin consumo cargado |

**Diferencia REA vs FIN:** REA = realizada pero sin factura final; FIN = facturada. OSSUM debe inferir esto del estado de las facturas asociadas:
- Si tiene al menos 1 Invoice con `state='Facturado'` o CAE presente → `cxStatus='finalized'`
- Si no → `cxStatus='performed'`

## Campos adicionales OSSUM derivados del legacy

OSSUM Surgery tiene campos que el legacy no tiene:
- `description` ← combinación de CIROBS + CIRTIPDES
- `priority` ← inferir de CIRHORA o regla de negocio
- `probableDate` ← CIRFEC si no está vacío
- `scheduledDate` ← CIRFEC si cirestado=SAU/AUT/PEN/TRA
- `performedDate` ← CIRFEC si cirestado=FIN/REA/SCO
- `cancelledDate` ← CIRFEC si cirestado=CAN/SUS
- `materialTransport` ← STOCK.STKTRACOD si está
- `materialAvailabilityDate` ← STOCK.STKFEC del primer STOCK1 con MOVES=S (salida inicial)