# Repetir carga → autorización DEV

## Done
Test guardado y corrección del coordinador sin asignar completados. Evidencia real: el wizard creó un caso QA; una aserción equivocada de UUID detuvo el test porque el backend usa CUID. Se corrigió el test y se retomó ese mismo caso, sin duplicarlo: gate UI, rechazo backend409, excepción atribuida, estado autorizado y recarga PASS. El PASS está marcado como retomado; no se afirma una nueva corrida ininterrumpida después de esas correcciones.

## Changed
El runner verifica la sesión/empresa y únicamente los cuatro contactos sintéticos baseline antes de lanzar el test. No inicia servidores ni crea usuarios/contactos; no modifica Auth. Cada ejecución válida crea una cirugía QA nueva, que se conserva para inspección. Sin limpieza automática.

## Files
- scripts/qa/run-surgery-process.mjs
- playwright.process.config.ts
- e2e/surgery-intake-approval.spec.ts

## Validations
Desde una terminal en `E:\OSSUM_COR_ANTIGRAVITY\ux-ui`, con la app DEV existente en el puerto5000:

```powershell
$env:CORE_FLOW_BASE_URL = 'http://127.0.0.1:5000'
$env:CORE_FLOW_STORAGE_STATE = 'C:\Users\franc\AppData\Local\Temp\opencode\ossum-qa-session-20261003-2040.json'
$env:CORE_FLOW_ARTIFACT_DIR = 'C:\Users\franc\AppData\Local\Temp\opencode'
$env:CORE_FLOW_RESUME_RECEIPT = $null
node scripts/qa/run-surgery-process.mjs
```

No abrir ni pegar el JSON de sesión: contiene acceso privado. Si vence, capturar una sesión manual nueva y actualizar solo su ruta. No cambiar Auth para hacer pasar el test.

Descubrimiento sin navegador/DB (no ejecuta el recorrido):

```powershell
node node_modules/@playwright/test/cli.js test --config=playwright.process.config.ts --list
```

La ejecución usa un worker, cero retries, máximo global seis minutos y servidor preexistente. Los reportes JSON y recibos de la única cirugía sintética quedan en el directorio temporal indicado, con nombres únicos. No traces, videos o screenshots de páginas autenticadas.

## Risks
La autorización para este runner se limita a `codevdistricorr1000000000`, fixtures baseline sintéticas verificadas y fuente revisada de este paquete. Sus attestations no autorizan producción ni certifican cambios futuros de fuente/DB/efectos externos. No sustituir contactos reales, asignar coordinadores, emitir mail/fiscal ni ejecutar OC/Cajas mediante este comando. Antes de correr sobre otra versión/target, repetir la verificación de seguridad y fixtures.

Un fallo después de crear el caso conserva su CUID en un recibo `QA-INTAKE-...-created.json`; no reintentar automáticamente ni borrar el caso. Primero Diagnose. Para retomar solo un caso propio pendiente, fijar CORE_FLOW_RESUME_RECEIPT al recibo externo validado: no crea otro caso y exige identidad/contactos/marcador/estado pendiente/sin notas antes de mutar. El caso CX-0010 ya está autorizado: no usar su recibo para autorizarlo nuevamente. El test comprueba la excepción nativa sin imagen, no la carga de un documento ni una aprobación de presupuesto.

## Next
Usar el mismo comando para una nueva corrida QA cuando corresponda, sin recrear login mientras la sesión sea válida. Resultado y límites en HANDOFF.md. Typecheck global sigue bloqueado por la propiedad eslint existente en next.config.ts, ajena a este paquete; no se tocó esa configuración.
