# 11 — Comparación Codex vs Minimax

## Estado: PENDIENTE hasta Fase 17

Este documento se completará DESPUÉS de leer el análisis previo del agente Codex en:

- (Carpeta fuente del agente previo: `E:\OSSUM_COR_PROJECT\docs\migration-consultar-plus\`)
- Documentos a revisar: `01_*` a `10_*` y `09_AUDITORIA_PROFUNDA_LEGACY.md`

## Lo que ya tengo listo (MiniMax-M3, este análisis):

- Inventario completo 510 DBF, 1.88M registros
- Modelo legacy con FKs verificadas (CIRUGIA → STOCK → CUENTAS)
- Cirugías 2026: 2,539 cargadas, 1,172 ocurrieron en 2026
- STOCK/STOCK1 forénsica: 1,844 devoluciones-consumo
- Facturación: 99.5% cirugías 2026 con invoice
- Mapping legacy → OSSUM con confianza por campo
- Clasificación A/B/C/D: 1,766 A + 759 B + 52 C + 0 D
- Auditoría adversarial: pasó en unicidad, fechas, FK
- Migration readiness: schema OK + recomendaciones de ledger transversal

## Lo que falta

- Leer 3 documentos previos: ANALISIS_2026.md, INVENTARIO_BACKUP.md, DICCIONARIO_DBF_RECONSTRUIDO.md
- Identificar acuerdos y discrepancias
- Para cada discrepancia: diseñar prueba READ-ONLY para resolver con datos
- Construir la matriz final