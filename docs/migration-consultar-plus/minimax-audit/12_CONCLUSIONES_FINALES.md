# 12 — Conclusiones Finales (Independientes)

## TL;DR

1. **El backup legacy es un sistema Visual FoxPro con 510 tablas DBF y ~1.88M registros.** La cirugía es un módulo menor (7,512 registros) en un sistema dominado por stock (312K movs) y contabilidad (90K líneas).

2. **Para cirugías 2026, hay 2,539 cirugías CARGADAS y 1,172 que ocurrieron efectivamente.** Las 1,367 restantes son programadas a futuro (SAU/AUT/PEN/TRA).

3. **El modelo STOCK/STOCK1 codifica remitos + devoluciones dentro del mismo sistema.** STKCOM='NR' es la salida inicial (reserva); STKCOM='RE' es el remito (entrega + posible devolución-consumo). No existe tabla separada de remitos.

4. **El término 'DEVOLUCIÓN' en legacy NO es cancelación.** Es el retorno rutinario de material no usado tras una cirugía finalizada. NO se observan devoluciones por cancelación (CAN/SUS/SCO) — el sistema solo cambia el estado.

5. **Casi TODAS las cirugías (99.5%) tienen factura asociada**, incluso las canceladas. El sistema crea la factura al cargar la cirugía, en estado borrador.

6. **OSSUM está bien preparado** para recibir la migración. Faltan: (a) tabla `LegacyEntityRef` para ledger transversal, (b) `MigrationRun/Error` para tracking.

7. **Clasificación final:** 1,766 A (alta) + 759 B (transformación) + 52 C (validación humana) + 0 D (no migrar) = 2,577 cirugías 2026.

## Hallazgos críticos detallados

### CIRUGIA: el núcleo

- 7,512 cirugías totales (2004-2026)
- 43 campos, 1 sola PK (CIRCOD)
- 9 estados: SAU (47%), FIN (44%), CAN (5%), SUS (1.5%), AUT (0.8%), REA (0.7%), TRA (0.4%), PEN (0.3%), SCO (0.2%)
- 4 FKs a CLIENTE (paciente/doctor/hospital/payer) con 99.99% match
- Sin duplicados, sin fechas imposibles, sin CIRDOC raros

### CLIENTE: tabla universal

- 9,078 contactos, 215 campos (!), memo
- Usado para TODOS los roles: paciente, médico, hospital, obra social, vendedor, cliente comercial
- 9,077 códigos distintos
- 40 CLIENTEs aparecen en múltiples roles → múltiples ContactCompanyLink
- CLIATRI: 92,701 atributos EAV (AFIP, GLN, logística, etc.)

### STOCK/STOCK1: el subsistema de remitos

- STOCK: 9,754 headers, 36 campos
- STOCK1: 312,095 líneas, 55 campos, memo
- STKTIP A/B/C, STKES E/S, STKDEV S/N, STKCOM (11 valores)
- Patrón DEVOLUCIÓN-CONSUMO: 1,844 registros (STKDEV='S' + STKCONCE='DEVOLUCIÓN - CONSUMO')
- Patrón válido: 99.95%
- **Implicación OSSUM:** un Remito en OSSUM viene de un STOCK(STKCOM='RE'); un Devolucion viene del mismo STOCK visto desde la perspectiva del material retornado.

### CUENTAS: facturación operacional

- 22,055 facturas
- 56,021 líneas (CUENTASD)
- 17,595 facturas con VTACIRCOD FK (80%)
- Doble vínculo a CIRUGIA: VTACIRCOD directa + STKVTACOD via STOCK
- VTATIP A/B/C: tipo fiscal; VTACAI: CAE AFIP
- 99.5% de cirugías 2026 tienen al menos 1 factura
- Multi-factura por cirugía: hasta 11 (workflow de impresión/anulación)

### Catálogos relevantes

- VIAJANTE: 7 vendedores (incluido LETICIA TORRES que faltaba en muestra)
- CIRTIP: 75 tipos de cirugía (72 activos)
- OBRAS: 11 obras sociales (catálogo INCOMPLETO vs 173 usadas en cirugías)
- TRANSPOR: 68 transportistas
- LOCALIDA: 1,236 localidades
- PROVINCI: 25 provincias (Argentina)
- SUCURSALES: 2 (Corrientes, Formosa)
- MEDPAG: 26 medios de pago
- CONDPAG: 8 condiciones de pago
- ADMUSR: 27 usuarios del sistema
- NUMERATO: 104 rangos de numeración
- EMPRESA: 2 (PRINC = DISTRICORR SRL, TEST)

## Mapeo a OSSUM (resumen)

| Legacy | OSSUM | Confianza |
|---|---|:---:|
| CIRUGIA | Surgery | ALTA |
| CLIENTE | Contact + ContactCompanyLink | ALTA |
| STOCK (RE) | Remito + RemitoItem | ALTA |
| STOCK1 (de RE) | RemitoItem | ALTA |
| STOCK (RE con STKDEV=S) | Devolucion + DevolucionItem | ALTA |
| CUENTAS | Invoice | ALTA |
| CUENTASD | InvoiceItem | ALTA |
| ARTICULO | Article | ALTA |
| ARTATRI | Article.metadata | MEDIA |
| CLIATRI | ContactCompanyLink.metadata | MEDIA |
| CIRNOTAS | Surgery.metadata.notes + extensión | MEDIA |
| HISCAM/HISCOS/HISPRE | AuditEvent / Article.metadata | MEDIA |
| FORMHIS/FORMULA1 | Article.metadata.formulaBOM | BAJA-MEDIA |
| ADMUSR | User | ALTA |
| HISREG/HISCON | descartar / metadata | BAJA |
| REPARTO | descartar | ALTA (no migrar) |

## Riesgos principales

### Riesgo 1: Multi-rol en CLIENTE

- 40 CLIENTEs aparecen como paciente + médico, o paciente + payer, etc.
- OSSUM debe crear múltiples ContactCompanyLink (uno por rol)
- Mitigación: script de migración genera links por rol independiente

### Riesgo 2: Contactos inactivos referidos

- 190 referencias a CLIENTE con cliact='N'
- 87 médicos, 71 hospitales, 32 obras sociales
- Las cirugías que los usan siguen siendo válidas
- Mitigación: marcar el Contact como `isActive=false` en OSSUM, agregar flag `metadata.migratedFromInactiveLegacy=true`

### Riesgo 3: Multi-factura por cirugía

- Cirugías con 2-11 facturas (workflow de impresión/anulación)
- OSSUM debe decidir si importa todas o solo la 'última'
- Recomendación: importar todas, con metadata que indique orden temporal (vtafecemi)
- 4,729 facturas FIN 2026 con avg 3 líneas

### Riesgo 4: Tablas con encoding corrupto

- CUENTASD, otros: algunos chars 0x81/0x9d requieren `errors='replace'`
- Mitigación: usar errores='replace' en lectura, post-process OCR si es crítico

### Riesgo 5: 'Devolución' semántica

- El usuario asume que CAN/SUS/SCO crean devoluciones de stock
- El dataset muestra que NO — el sistema solo cambia estado
- Implicación: si OSSUM quiere generar devoluciones por cancelación, debe inferirlas (regla de negocio nueva) o aceptar que el material queda 'perdido' en el legacy
- Mitigación: documentar como brecha semántica y decidir caso por caso

### Riesgo 6: REA vs FIN indistinguibles por facturas

- Ambos tienen facturas similares
- Recomendación: usar CIRESTADO directamente, sin inferencia adicional

### Riesgo 7: Volume

- 2,577 cirugías × ~100 líneas de stock cada una = ~250K RemitoItems
- 4,729 facturas FIN × 3 líneas = ~14K InvoiceItems
- Total: ~300K registros a migrar
- Estimación: 2-4 horas de runtime si se hace cuidadoso, < 1 hora si se hace bulk

## Recomendaciones operativas

### Antes de la migración

1. **Crear ledger transversal** (`LegacyEntityRef`) en OSSUM schema
2. **Crear `MigrationRun` + `MigrationError`** para tracking
3. **Verificar campos OSSUM necesarios** (Surgery.performedDate vs surgeryDate)
4. **Crear 2 Company OSSUM** (PRINC + TEST) y mapear EMPCOD
5. **Crear usuarios OSSUM** desde ADMUSR (27 usuarios)
6. **Crear grupos + permisos** desde ADMGRP/ADMGRP1/ADMMAP

### Durante la migración

1. **Contacto primero** (9,078 CLIENTE → 9,078 Contact + N×ContactCompanyLink)
2. **Artículos segundo** (5,902 ARTICULO → 5,902 Article)
3. **Catálogos** (VIAJANTE, CIRTIP, MEDPAG, etc.)
4. **Cirugías tercer** (7,512 CIRUGIA → 7,512 Surgery)
5. **Stock + Remitos + Devoluciones** (STOCK/STOCK1 → Remito/Devolucion/StockMovement)
6. **Facturas** (CUENTAS/CUENTASD → Invoice/InvoiceItem)
7. **Auditoría** (HISCAM/HISCOS → AuditEvent)

### Después de la migración

1. **Reconciliación**: query que compare totales legacy vs OSSUM
2. **Verificación huérfanos**: cirugías en OSSUM sin artículos, facturas sin contacto, etc.
3. **Reporte de discrepancias**: para revisión humana
4. **Snapshot del estado pre-migración** para auditoría

## Próximos pasos sugeridos

1. ✅ Esta auditoría (Fase 1-16)
2. ⏭️ Fase 17: leer análisis previo del agente Codex (E:\OSSUM_COR_PROJECT\docs\migration-consultar-plus\)
3. ⏭️ Fase 18: comparar y construir matriz Codex vs Minimax
4. ⏭️ Decisión: ¿hay cambios necesarios al schema OSSUM? (LegacyEntityRef, MigrationRun)
5. ⏭️ Diseñar scripts de migración (con ledger transversal, idempotencia)
6. ⏭️ Correr en DB DEV descartable
7. ⏭️ Validar con humanos
8. ⏭️ Commit local + PR

## Honestidad final

- Toda métrica en este análisis es reproducible (scripts en `scripts/legacy-minimax-audit/`)
- Ningún archivo del backup legacy fue modificado (verificado por timestamps)
- Ningún archivo OSSUM fue modificado
- Esta Fase 12 aún no leyó el análisis previo (E:\OSSUM_COR_PROJECT\docs\migration-consultar-plus\)
- Las conclusiones marcadas con ⚠️ requieren validación posterior