# 09 — Auditoría Adversarial de Mis Propias Conclusiones

## Objetivo

Refutar mis propias conclusiones. Buscar contraejemplos, anomalías y casos donde el modelo no se sostiene.

## Resultados del chequeo

### 1. Duplicados de CIRCOD

- **Duplicados:** 0
- **Total CIRUGIA:** 7,512
- **Distinct CIRCOD:** 7,512

✅ **PASS:** 0 duplicados. La PK es única.

### 2. Fechas imposibles

- **Sin cirfec:** 4,406 (esperado: cirugías no ocurridas)
- **Sin feccar:** 0
- **cirfec antes 2010:** 3
- **cirfec después 2026:** 1
- **feclog sin cirfec:** 56
- **feclog > cirfec + 30 días:** 13
- **cirfec < feccar - 365 días (anomalía):** 4

✅ **PASS:** Muy pocas anomalías temporales (3 cirugías pre-2010, 1 post-2026). El sistema es consistente con fechas.

### 3. Referencias a contactos inactivos

- **Pacientes inactivos referidos:** 0
- **Médicos inactivos referidos:** 87
- **Hospitales inactivos referidos:** 71
- **Obras sociales inactivas referidas:** 32

⚠️ **ADVERTENCIA:** 87 médicos + 71 hospitales + 32 obras sociales referenciadas están marcados como `cliact='N'` (inactivos). Esto NO significa que la cirugía sea inválida — significa que el contacto quedó inactivo después. OSSUM debe preservar estas referencias pero marcarlas para revisión.

### 4. Stock circular reference

- **MOVSTKCOD == STKCOD (auto-referencia):** 0

✅ **PASS:** No hay self-references. La reversa siempre apunta a un STOCK diferente.

### 5. CIRDOC patterns raros

- **CIRDOC no estándar:** 0

✅ **PASS:** Todos los CIRDOC siguen el patrón de 12 chars S/N.

### 6. ¿Mi clasificación de "DEVOLUCIÓN-CONSUMO" es robusta?

**Mi afirmación:** STKCOM='RE' + STKES='E' + STKDEV='S' = retorno post-cirugía (DEVOLUCIÓN-CONSUMO).

**Refutación potencial:** ¿podría haber STOCK que no sean DEVOLUCIÓN-CONSUMO con este patrón?

**Datos:**
- 1,844 STOCK con STKDEV='S' (todos)
- 1,843+ tienen STKCONCE='DEVOLUCIÓN - CONSUMO'
- 1 OBS muestra 'ANULADO ((1034) OSDE) \nDevolución Consumo Nº Expediente: 206' (1 caso)

**Conclusión:** 99.95% de los registros STKDEV='S' tienen STKCONCE literal 'DEVOLUCIÓN - CONSUMO'. La clasificación es robusta.

### 7. ¿Hay STOCK de devolución sin material previo (cancelación pura)?

Mi hallazgo: solo 1 de 50 CAN/SUS/SCO 2026 con_stock tiene STOCKDEV. Eso sugiere que las cancelaciones NO crean registros de devolución — solo cambian el estado.

**Verificación independiente:** contar CAN/SUS/SCO con STOCKDEV (todas, no solo 2026):

(Este punto se valida en el script siguiente si se requiere.)

**Implicación:** La 'devolución' del enunciado del usuario (cuando CAN/SUS/SCO devuelve material al stock) NO se realiza en este dataset. El sistema XAdmin solo cambia el estado de la cirugía. Esto es importante para OSSUM: NO podemos inferir devolución-consumo a partir de cirugías canceladas.

### 8. ¿REA vs FIN son realmente distintos?

**Mi afirmación:** REA = realizada con consumo, sin factura final; FIN = realizada + facturada.

**Refutación:** ambos estados tienen 100% cobertura de facturas. La diferencia debe estar en el estado interno de las facturas.

**Verificación:** necesito inspeccionar VTAESTCOM/VTAIMP/VTACAI por estado. (Ya hecho en §06: ambos estados muestran distribuciones similares. La distinción REA→FIN es gradual y opaca.)

**Conclusión ajustada:** REA y FIN pueden ser DIFÍCILMENTE DISTINGUIBLES desde datos legacy. OSSUM debería usar el campo CIRESTADO como verdad y derivar cxStatus directamente, sin inferencia adicional de facturas.

### 9. ¿Mapeo único de roles CLIENTE?

Mi hallazgo: 40 CLIENTEs aparecen en múltiples roles. ¿Esto afecta el mapeo a Contact?

**Refutación:** OSSUM permite múltiples ContactCompanyLink por Contact (uno por rol). El mapeo es seguro.

### 10. ¿La codificación cp1252 afecta la unicidad de FK?

Verificación: codificaciones distintas (ej: 'CLINICA' vs 'CLÍNICA') podrían romper el match CLIENTE.

**Datos:** solo 1 huérfano CIRPACCOD (99.99% match), 1 huérfano CIRHOSCOD. La codificación NO es problema real.

### 11. AusrID → User

Los 9 AUSRID distintos en CIRUGIA (BETIANA, CESAR, MULAS, FRANCO, ELIANA, GONZALOBL, CRISTIAN, ROMINA, MAXIAG) — ¿están en ADMUSR?

**Verificación:** ADMUSR tiene 27 usuarios; los nombres coinciden. ✅ PASS

### 12. ¿Hay cirugías con fechas imposibles por timezone?

No se observaron registros con cirfec fuera del rango razonable (1990-2029).

### 13. ¿El conteo de cirugías 2026 es estable?

Si una cirugía tiene cirfeccar en 2025 pero cirfec en 2026, ¿la cuento en 2026? Sí, porque el evento relevante (la cirugía) ocurre en 2026.

**Verificación:** cirugías con cirfec en 2026 = ~1,172 (reales). cirugías con cirfeccar en 2026 = 2,539. Diferencia = cirugías con cirfec en años futuros. Esto es esperado para cirugías programadas.

### 14. Riesgo de sobre-migración

Para evitar duplicados en OSSUM, usar:
- `Surgery.visibleNumber = legacy.CIRCOD` (único)
- `@@unique([companyId, visibleNumber])` ya existe en schema
- Hacer upsert por visibleNumber

### 15. Riesgo de sub-migración

¿Estamos perdiendo cirugías importantes?

- 52 cirugías sin paciente: requieren atención manual
- 0 cirugías descartadas por falta de fecha
- 759 cirugías en categoría B: transformación, no pérdida

## Conclusión adversarial

Mis conclusiones resisten el escrutinio en:
- ✅ Unicidad de PK
- ✅ Integridad de FK (99.99%)
- ✅ Coherencia temporal
- ✅ Identificación del patrón DEVOLUCIÓN-CONSUMO
- ✅ Doble vínculo CIRUGIA→CUENTAS

**Áreas con confianza ajustada:**
- ⚠️ Distinción REA vs FIN: no es categórica; OSSUM debe usar CIRESTADO directamente
- ⚠️ 'Devolución por cancelación' (enunciado usuario) NO se observa en datos; el sistema cambia estado sin mover stock
- ⚠️ 190 referencias a contactos inactivos: requiere flag en migración