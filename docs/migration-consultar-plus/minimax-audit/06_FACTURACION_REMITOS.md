# 06 — Facturación y Remitos (Análisis Independiente)

## Pregunta

1. ¿Cómo se vincula CIRUGIA → FACTURA en el legacy?
2. ¿Qué distingue una factura de FIN vs REA vs CAN/SUS?
3. ¿Existe una entidad 'remito' separada o vive dentro de STOCK?

## Hallazgos clave

### 1. Doble vínculo CIRUGIA → FACTURA

El legacy tiene **dos FKs** entre CIRUGIA y CUENTAS:

- **Directo:** `CUENTAS.VTACIRCOD` (N 7) → `CIRUGIA.CIRCOD`
- **Indirecto (vía STOCK):** `STOCK.STKVTACOD` → `CUENTAS.VTACOD` y `STOCK.STKCIRCOD` → `CIRUGIA.CIRCOD`

La redundancia confirma el modelo. Para OSSUM, debe haber UNA FK limpia (probablemente la directa).

### 2. Cobertura

Para 2,577 cirugías 2026:

| Estado | Con factura | Sin factura | Total | Cobertura |
|-------|---:|---:|---:|---:|
| SAU | 1186 | 13 | 1199 | 98.9% |
| AUT | 26 | 0 | 26 | 100.0% |
| PEN | 18 | 0 | 18 | 100.0% |
| TRA | 31 | 0 | 31 | 100.0% |
| REA | 50 | 0 | 50 | 100.0% |
| FIN | 1100 | 0 | 1100 | 100.0% |
| CAN | 136 | 0 | 136 | 100.0% |
| SUS | 10 | 0 | 10 | 100.0% |
| SCO | 7 | 0 | 7 | 100.0% |

**Observación:** casi TODAS las cirugías 2026 tienen al menos 1 factura asociada (99.5%). Las excepciones (13) son cirugías canceladas/sin avance.

Esto NO significa que estén facturadas en sentido fiscal. La factura se crea automáticamente al cargar la cirugía (en estado Borrador interno) y se actualiza durante el workflow.

### 3. VTAs por cirugía

| # VTAs | Cirugías 2026 |
|------:|---:|
| 0 | 13 |
| 1 | 1,167 |
| 2 | 289 |
| 3 | 254 |
| 4 | 465 |
| 5 | 230 |
| 6 | 111 |
| 7 | 31 |
| 8 | 14 |
| 9 | 2 |
| 11 | 1 |

**Observación:** la mayoría de cirugías (1,167) tienen 1 sola factura, pero hay un número significativo con múltiples facturas (289 con 2, 254 con 3, 465 con 4, 230 con 5...). Esto sugiere que el sistema crea varias versiones de la factura a lo largo del workflow (ej: borrador → impresión → anulación → NC).

### 4. CUENTASD (líneas de factura)

- 56,021 líneas para 22,029 facturas
- Promedio: 2.5 líneas por factura
- Para facturas FIN 2026: avg=3.0 líneas, max=22, n=4,729
- 2,220 artículos distintos facturados (de 5,902 totales = 37.6%)

### 5. VTATIP y VTACAI (discriminación fiscal)

- `VTATIP`: A=Factura A, B=Factura B, C=Factura C
  - VTATIP distribución total: A=7752, B=14110, C=159
- `VTACAI`: 14-char CAE AFIP — presente en facturas autorizadas, vacío en borradores
- `VTAIMP`: S impresa, vacío no impresa
- `VTAELE`: S electrónica (post-RG 4291/2018)
- `VTACPTEV`: V=Venta, C=Cancel/Anulación

### 6. Distribución por estado de cirugía

Para CIRUGIA FIN 2026 (4,718 facturas):

| Campo | S | N | Vacío | Total |
|---|---:|---:|---:|---:|
| VTAIMP (impresa) | 1,955 | - | 2,763 | 4,718 |
| VTAELE (electrónica) | 1,172 | 282 | 3,264 | 4,718 |
| VTAESTCOM (estado comprobante) | 2,077 | - | 2,641 | 4,718 |
| VTACAI presente (CAE) | ~50 con CAE | - | resto | 4,718 |
| VTACPTEV=V (venta) | 3,390 | - | 1,328 | 4,718 |
| VTACPTEV=C (cancel/anul) | 470 | - | - | 470 |

**Interpretación:** Solo ~2,077 facturas en FIN tienen estado comprobante 'S' (cerrado). Las 2,641 sin clasificar probablemente son pre-impresión o intermedias. ~50 tienen CAE (fiscalmente autorizadas).

### 7. NO distinción neta FIN vs REA en facturas

**Sorpresa mayor:** la diferencia entre FIN y REA en el modelo de facturas es **casi nula**. Ambos tienen:
- 100% cobertura de facturas
- Distribución similar de VTATIP A/B
- Cantidad comparable de CAE

**Conclusión:** REA y FIN probablemente difieren solo en metadata interna, no en la factura. La distinción real es REA = 'lista para facturar', FIN = 'facturada formalmente'.

### 8. CIRUGIA CAN/SUS/SCO también tienen facturas

- CAN: 100% con factura
- SUS: 100% con factura
- SCO: 100% con factura

Pero pocas con CAE (autorización fiscal):
- CAN con CAE: ~7 (de 286 facturas)
- SUS: 0 con CAE
- SCO: 1 con CAE

**Interpretación:** Para cirugías canceladas, la factura original NO se anula fiscalmente — simplemente queda en estado 'sin consumar' o se genera una NC.

## REMITOS

### No existe tabla separada de remitos

Búsqueda exhaustiva:
- Tablas con REMIT/REMITO/ENTRE/LOGIST en nombre: **0 resultados**
- `REPARTO` (1 registro) y `REPARTO1` (3 registros): tablas de reparto casi vacías; solo un experimento abortado

### El remito vive dentro de STOCK

El **remito es un STOCK con STKCOM='RE'** (Remito):
- STOCK.STKCOD = ID del remito
- STOCK.STKVTACOD = factura asociada
- STOCK.STKCIRCOD = cirugía asociada
- STOCK1.STKCOD/MOVORD = líneas del remito
- STOCK.STKVTACOD != 0 → factura asociada
- STOCK.STKFEC = fecha del remito

Numeración:
- `STK.STKNRO` (N 8) = número del comprobante (dentro de STKCOM='RE', secuencia propia)
- Cada `STKCOM` tiene su propia numeración

### Para OSSUM

Mapping:
- 1 STOCK (STKCOM='RE') → 1 OSSUM `Remito`
- 1 STOCK1 línea → 1 OSSUM `RemitoItem`
- La factura (CUENTAS) está asociada vía OSSUM `Invoice` con `consumoId` o `presupuestoId`
- En OSSUM, `Remito.surgeryId` se llena; el STOCK previo (STKCOM='NR') NO genera Remito separado (es la reserva, no el envío).

**Decisión recomendada:** mapear SOLO STOCK(STKCOM='RE') como Remito. El STOCK(STKCOM='NR') se descarta o se usa para reconstruir el evento 'preparación'.

### 9. Anomalías / riesgos

- **Múltiples facturas idénticas** (mismo total, fechas cercanas): evidencia de workflow de impresión + anulación. OSSUM debe deduplicar o preservar histórico completo.
- **FK inversa `REPNRO`** en CUENTAS y STOCK: tabla `REPARTO` con 1 registro es evidencia de un feature abandonado. No debería migrarse.