# FPT/CIRNOTAS: etapa posterior, no ejecutada

**Estado: DIFERIDO.** No se decodificó ningún FPT en esta tarea; por lo tanto, **NO RESUELTO** si CIROBS/CIRNOTAS aclaran TRA, SCO o fecha efectiva. La CLI core solo expone `memoPointerPresent` y `memo_not_decoded`. El puntero DBF no verifica existencia ni integridad del bloque memo; el hash de fila DBF tampoco incluye contenido FPT. No afirmar que las notas son irrelevantes por esta ausencia de análisis.

Evidencia previa disponible sin reabrir FPT: CIRNOTAS 6.365 registros, 6.266 punteros no vacíos, 1.754 fechas de nota en 2025 y 4.611 en 2026 (`profiles.json.CIRNOTAS`). Esto no prueba contenido, codificación ni secuencias clínicas.

Próximo análisis **después** del Gate 2 o cuando haya un motivo puntual: evaluar lector Visual FoxPro/FPT maduro de solo lectura y formato de bloques/punteros, validar hash FPT antes/después, relacionar por CIRCOD sin exportar texto, producir únicamente conteos de memos válidos/nulos/corruptos, longitud, rango temporal y evidencia agregada para casos TRA/SCO/CAN. Si datos concretos de memo resuelven estados o fechas, documentar bajo control de privacidad; si solo aportan contexto histórico, dejar la migración de notas para una wave separada. No modificar ni copiar derivados al backup.
