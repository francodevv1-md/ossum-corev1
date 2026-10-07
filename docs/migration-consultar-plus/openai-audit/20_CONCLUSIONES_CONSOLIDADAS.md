# Conclusiones consolidadas

## Hechos confirmados

Backup: 510 DBF, 1.878.890 registros físicos (Codex y relectura independiente). Cirugías activas: 7.512; 2.539 con CIRFECCAR 2026; 1.193 con CIRFEC 2026; unión 2.577; FIN+REA fechadas 2026 1.086 **por estado actual**, no evidencia de fecha de realización. La operación confirma los significados de estados y tres fechas, y el retorno operacional ante CAN/SUS/SCO con material.

## Alta confianza

CLIENTE universal referenciado por varias funciones; STOCK/STOCK1 son encabezado/detalle con 311.848 de 311.852 enlaces activos; NR típicamente salida y RE típicamente entrada (dirección estructural, no semántica documental definitiva). CUENTAS enlaza con cirugía, pero el link no acredita emisión.

## Decisiones propuestas de OSSUM, no hechos legacy

Staging fiel + ledger único por `(companyId,source,entityType,legacyId)` + writer histórico aislado; sin duplicar números visibles ni tocar stock actual; versionado de transformaciones y rollback por ownership/run. Requiere diseño/aprobación antes de schema o write.

## Contradicciones y riesgos

MiniMax afirma que CAN/SUS/SCO no tienen devolución; backup muestra 1 CAN y 7 SCO con `RE|STKDEV=S` vinculados; requiere secuencias para confirmar naturaleza de cada caso. Su clasificación 2.525 'migrables' no prueba campos/side effects/documentos. Sus propuestas de un ContactCompanyLink por rol chocan con unique por contacto+empresa de OSSUM. Ninguna auditoría acredita fórmula de consumo ni documento fiscal completo. Fecha y empresa de cada relación deben verificarse.

## Side effects verificados parcialmente en código (NO auditoría exhaustiva)

`surgery.service.ts:732–797` crea número visible y AuditEvent dentro de transacción Serializable; writer histórico debe preservar control tenant/auditoría de provenance, pero no generar número histórico inventado. `remito.service.ts:472–558` crea borrador, renglones y, con actor, AuditEvent; no equiparar creación de borrador con emisión documental. `invoice.service.ts:680–697` al emitir asigna visibleNumber y fecha actual, cambia Consumo vinculado a Facturado y audita: **no ejecutar emisión normal para documentos históricos**. `stock-ledger.service.ts:142–206` crea/upsert StockMovement inmutable por `(companyId,idempotencyKey)` y alimenta disponibilidad: **no reproducir movimientos anteriores al snapshot**. Validaciones tenant y provenance deben conservarse vía writer especializado; notificaciones operativas, numeración actual, emisión actual y ajuste del stock vivo no deben ocurrir por importar historia. Contact/Article/Devolucion/Payment requieren aún traza exhaustiva de side effects antes de write.
