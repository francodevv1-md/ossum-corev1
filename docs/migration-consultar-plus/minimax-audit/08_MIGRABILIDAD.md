# 08 — Migrabilidad Independiente por Cirugía 2026

## Criterios aplicados (independientes, no del agente previo)

Para cada cirugía 2026, calculé cuatro flags:

- `has_feccar` o `has_cirfec`: tiene al menos una fecha
- `has_pac`: tiene paciente (CIRPACCOD no vacío)
- `has_stock`: tiene STOCK.STKCIRCOD
- `has_vta`: tiene CUENTAS.VTACIRCOD

### Reglas de clasificación

| Categoría | Criterio |
|---|---|
| **A** alta confianza | cirestado ∈ (FIN,REA,AUT,TRA,PEN) con stock + invoice, o CAN/SUS/SCO con paciente, o SAU con los 4 contactos |
| **B** transformación | cirestado ∈ (FIN,REA,AUT,TRA,PEN) con invoice pero sin stock, o CAN/SUS con stock, o SAU con paciente pero contactos parciales |
| **C** validación humana | cirestado ∈ (FIN,REA,...) sin paciente, o cirugías con datos incompletos |
| **D** no migrar | cirugías sin ninguna fecha |

## Resultados

- **Total cirugías 2026:** 2,577
- **A (alta confianza):** 1,766 (68.5%)
- **B (transformación):** 759 (29.5%)
- **C (validación humana):** 52 (2.0%)
- **D (no migrar):** 0 (0.0%)

## Desglose por subcategoría

| Subcategoría | # | Notas |
|---|---:|---|
| A_complete | 1,140 | Cirugía activa con stock + invoice (workflow completo) |
| A_sau_complete | 534 | SAU con los 4 contactos (paciente + médico + hospital + payer) |
| A_cancelled_basic | 92 | Cancelada/suspendida con paciente identificado |
| B_vta_only | 68 | Cirugía activa con invoice pero sin stock |
| B_cancelled_with_stock | 60 | Cancelada/suspendida con stock (raro; revisar) |
| B_sau_partial | 631 | SAU con paciente pero contactos parciales |
| C_no_patient | 52 | Sin paciente identificado (revisar) |
| C_vta_missing | 0 | Cirugía activa sin invoice (raro) |
| C_cancelled_partial | 0 | Cancelada/suspendida sin paciente |
| C_sau_partial | 0 | SAU sin paciente |
| D_no_date | 0 | Sin ninguna fecha |
| D_unknown_estado | 0 | Estado desconocido |

## Conclusión

De las 2,577 cirugías 2026:
- **2,525 (98.0%)** son automáticamente migrables con transformaciones estándar
- **52 (2.0%)** requieren revisión humana caso por caso
- **0 (0.0%)** no son migrables sin información adicional

**Recomendación:** priorizar A y B para el primer pase de migración, dejar C para validación humana, descartar D.

**Ejemplos de cada categoría (primeros 10 CIRCOD):**

- A_complete: [4660, 4831, 4901, 4913, 4933, 4962, 4971, 4998, 5018, 5024]
- A_sau_complete: [5139, 5150, 5153, 5173, 5175, 5176, 5178, 5179, 5181, 5185]
- A_cancelled_basic: [5102, 5155, 5262, 5264, 5266, 5276, 5302, 5307, 5312, 5379]
- B_vta_only: [178, 249, 5245, 5444, 5532, 5551, 5696, 5749, 5755, 5846]
- B_cancelled_with_stock: [5083, 5104, 5106, 5145, 5177, 5194, 5265, 5284, 5288, 5294]
- B_sau_partial: [5134, 5143, 5146, 5147, 5148, 5151, 5157, 5160, 5161, 5164]
- C_no_patient: [5402, 5415, 5416, 5432, 5433, 5496, 5499, 5500, 5521, 5522]