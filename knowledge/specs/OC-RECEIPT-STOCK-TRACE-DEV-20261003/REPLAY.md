# Repetir recepción OC → stock DEV

## Done
Dos corridas nativas e ininterrumpidas PASS, cada una con OC/artículo QA nuevos: stock0→1→4 en destino explícito; dos recepciones/dos movimientos1+3, trazabilidad de origen/usuario y auditoría; repetición de operaciones aceptadas sin nuevo ingreso.

## Changed
La recepción física exige permisos existentes de Admin/Logística, destino y operationKey estable. OC/Receipt/StockMovement/auditoría confirman en una misma transacción. Coordinación no obtiene permisos de stock. El formulario conserva el intento cuando el POST fue aceptado y falla el refresh, incluso si ese GET devuelve4xx.

## Files
- e2e/compras-oc-stock-receipt.spec.ts
- playwright.compras-stock.config.ts
- scripts/qa/run-compras-stock-process.mjs
- Lanzador/preparación locales verificados bajo Temp/opencode, fuera de Git.

## Validations
Desde `E:\OSSUM_COR_ANTIGRAVITY\ux-ui`, el mismo comando probado prepara un artículo QA nuevo sin movimientos y ejecuta una sola prueba:

```powershell
node "C:\Users\franc\AppData\Local\Temp\opencode\ossum-compras-stock-run-20261003.mjs" --fresh
```

Cada invocación explícita crea un SKU y una OC QA nuevos; no vuelve a ingresar stock para un caso completado. No hay retries ni cleanup automáticos. Si una corrida falla después de crear la OC o recibir parcialmente, conservar sus recibos y ejecutar Diagnose antes de otra corrida: `--fresh` no repara ni reconcilia ese caso anterior.

La prueba versionada acepta configuración explícita de target/fixture/sesión/revisión documentada en el runner:

```powershell
node scripts/qa/run-compras-stock-process.mjs
# Solo discovery, sin navegador/DB y sin certificar el recorrido:
node scripts/qa/run-compras-stock-process.mjs --list
```

El estado vigente es `ossum-qa-stock-session-20261003-2315.json`, fuera de Git. No abrir/pegar su contenido. Al vencer, captura manual nueva con otro nombre y CORE_FLOW_STORAGE_STATE actualizado; no cambiar Auth ni sobreescribir/borrar sesiones. El runner falla cerrado con `E2E blocked by expired authentication state`.

Prerequisitos: mismo DEV identificado, servidor existente127.0.0.1:5000, Admin con permiso de preparación de catálogo QA, fixtures propias activas/eligibles/policyNONE, destinoQAexplícito. El lanzador local fija la aprobación/revisión del paquete conocido; no sirve para certificar otra versión/DB. No se inicia servidor ni se ejecuta build/typegen.

Prueba real: native create/emit/send; recibir1; replay exactoK1; mismoK1 con cantidad distinta→409; exceso con nueva clave→409; recibir3conK2; replayK2yK1después deRecibida; stock/apuntadores/audits sin cambios ante replays/rechazos; recarga y columnaDisponible4 visibles. Un worker, cero retries, diez minutos globales, todos los contextos cerrados. Reportes/recibos únicos externos, sin traces/screenshots/videos autenticados.

## Risks
- V1 soporta solo políticaNONE: cantidades, destino y trazabilidad OC→Receipt→línea→movimiento→usuario. LOT/SERIAL/EXPIRY se rechazan antes de efectos; no se certifica su ciclo ni StockPhysicalUnit/Cajas.
- Destino usa el campo existente de ubicación explícita; no es una nueva arquitectura multi-depósito ni una decisión automática de Depósito Central.
- No se completó stock de OC históricas/anteriores. No ejecutar viejos tests de recepción quantity-only: cambió el contrato obligatorio y ese harness no certifica stock. Usar esta prueba nueva.
- Reintentos seguros requieren la misma clave/intención. No tratar una nueva clave como duplicado de una entrega identificada externamente ni asumir recuperación automática de una pérdida completa de sesión/navegador.
- Typecheck global sigue fallando únicamente por eslint en next.config.ts, ajeno al paquete; no se modificó ni deshabilitó. Full build NOT RUN.

## Next
Ampliar lotes/series/vencimiento y relaciones/destinos tipados solo con alcance explícito y datos requeridos, sin improvisar unidades. Mantener independiente el hold de Sol1; no ejecutar sus suites/forensics ni limpiar registros antiguos.
