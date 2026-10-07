# Repetir OC → recepción parcial/completa DEV

> **Aviso de contrato posterior:** el PASS descrito aquí corresponde a la versión quantity-only anterior. La integración OC-RECEIPT-STOCK-TRACE-DEV-20261003 ahora exige destino/operationKey y permisos físicos Admin/Logística. No usar este harness antiguo para certificar o ingresar stock; usar `../OC-RECEIPT-STOCK-TRACE-DEV-20261003/REPLAY.md`, con SKU/OC QA nuevos. La evidencia histórica no fue invalidada ni se completó stock retroactivamente.

## Done
Corrida real nativa e ininterrumpida PASS: crear una OC QA de4unidades, emitir, marcar enviada operativamente, recibir1, rechazar una recepción adicional inválida de4sin cambiar datos, recibir3restantes y verificar Recibida/recibido4/pendiente0 después de recargar.

## Changed
Se agregó únicamente la acción Emitir de borradores usando el hook/API existentes. El error de dominio ya declaraba409; ahora hereda ApiError para que el mapper respete su código/estado en vez de convertirlo en500. Reglas, roles y validadores no cambiaron. Fixtures: un proveedor y un artículo de catálogo explícitamente QA, sin stock físico inicial ni movimientos de ledger.

## Files
- e2e/compras-oc-receipt.spec.ts
- playwright.compras.config.ts
- scripts/qa/run-compras-process.mjs
- Lanzador/configuración local verificada bajo Temp/opencode, fuera de Git.

## Validations
Desde la terminal del worktree `E:\OSSUM_COR_ANTIGRAVITY\ux-ui`, el mismo comando probado en esta máquina es:

```powershell
node "C:\Users\franc\AppData\Local\Temp\opencode\ossum-compras-run-20261003.mjs"
```

El lanzador privado fija los parámetros ya verificados y llama al runner guardado en el repositorio. No contiene contraseñas/tokens; referencia el archivo de sesión local, que nunca debe abrirse ni compartirse por chat. La sesión actual es `ossum-qa-session-20261003-2150.json`. Si vence, capturar login manual con un nombre nuevo y pasar la nueva ruta por CORE_FLOW_STORAGE_STATE; no modificar Auth ni sobreescribir/borrar sesiones.

El runner versionado se ejecuta con la configuración explícita documentada en sus comentarios:

```powershell
node scripts/qa/run-compras-process.mjs
# Descubrimiento solamente: no navegador/DB, no significa PASS
node scripts/qa/run-compras-process.mjs --list
```

Cada corrida válida crea una nueva OC QA propia y conserva evidencia. No reintentos ni limpieza automática. Un worker, cero retries, límite global menor a20minutos; usa el servidor existente en127.0.0.1:5000, no inicia ni reconstruye otro. Reportes y recibos únicos quedan en el directorio temporal aprobado, sin screenshots/videos/traces de tráfico autenticado. El recibo de una creación se guarda antes de las aserciones para no perder el ID si un paso posterior falla.

## Risks
- Esto valida **cantidades/estado de OC y recepción operativa**, NO ingreso físico de inventario. El servicio actual modifica OC/items/audit y no genera un movimiento de stock. El recibo PASS declara physicalStockValidated=false.
- Emitir/enviar cambian estado operativo; no emisión fiscal ni envío real de correo.
- Scope fijo: empresaDEV codevdistricorr1000000000, proveedor/artículoQAverificados. Las attestations no certifican otrotarget ni cambios futuros de fuente/efectos externos.
- Typecheck global sigue FAIL solamente por la propiedad eslint ajena en next.config.ts; no se tocó esa configuración. No full build/CI/producto completo certificado.

## Next
Antes de probar otrotarget/versión, repetir checks de fixtures/ownership/efectos. La validación de ingreso físico a stock es un alcance separado; no inferirla de Recibida.
