# GO/NO-GO técnico — NO autoriza migración

| Dominio | Estado actual | Bloqueo antes de DEV write |
|---|---|---|
| Contact | READY FOR READ-ONLY DRY RUN | normalización DNI/CUIT, roles y colisiones; matching nativo DEV; tenant |
| Article | READY FOR READ-ONLY DRY RUN | SKU organizacional, variantes, inactivos, 289 líneas huérfanas |
| Surgery | READY FOR READ-ONLY DRY RUN | escoger universo canónico, estado prep separado, FKs/fechas y side effects |
| Remito | NOT READY FOR WRITE | prueba de documento/serie/número por secuencia NR/RE |
| Consumo | NOT READY FOR WRITE | fórmula/fuente efectiva no probada |
| Devolucion | NOT READY FOR WRITE | pareo material y motivo CAN/SUS/SCO/reversión no demostrado |
| Invoice | NOT READY FOR WRITE | discriminar borrador/emitida/fiscal, numeración y anulación |
| Payment | NOT READY FOR WRITE | imputaciones/saldo no reconstruidos |
| Stock histórico | NOT READY FOR WRITE | snapshot y reconciliación de existencias/depositos |

**DEV WRITE TEST: ninguno hoy.** Antes del primer write test: aprobación humana explícita de nuevo paquete, DB DEV confirmada descartable, ledger/schema validado, closure de identificadores tenant, side effects revisados, matching nativos medido, reconciliación dry-run sin omisiones desconocidas y plan rollback ensayado en entorno descartable. Histórico validado solo cuando cada wave reconcilie registros e invariantes de negocio con muestra humana de casos difíciles. No hubo conexiones a PostgreSQL/Supabase.
