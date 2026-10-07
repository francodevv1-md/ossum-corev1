# Repetir la preparación DEV

Ejecutar desde `E:\OSSUM_COR_ANTIGRAVITY\ux-ui`. No pegar claves ni archivos de sesión en el chat.

## 1. Configuración local: sin red ni DB

```powershell
node scripts/qa/dev-readiness.mjs
node --test scripts/qa/dev-readiness.test.mjs
```

El checker carga la configuración de desarrollo con `@next/env`, sin modificar los archivos de entorno. Imprime únicamente nombres y estados de una lista fija. `present` no significa credencial válida, proveedor funcionando ni DB autorizada. No normaliza los loaders existentes de Prisma/Vitest.

Resultado real de esta tarea: variables obligatorias presentes/formato aceptado; Chromium instalado y arranque local verificado. `GMAIL_MAILBOX` opcional ausente; no se probó envío de correo ni OCR/IA. Siete tests sintéticos pasaron; Windows no permitió crear el symlink de archivo de uno de los checks, cuya aserción no se ejecutó.

## 2. Servidor: pendiente de ownership

```powershell
$env:CORE_FLOW_BASE_URL = 'http://localhost:5000'
node scripts/qa/dev-readiness.mjs --tcp
```

El chequeo TCP real dio `blocked`: no había servidor en ese puerto tras el apagado. Tampoco se encontraron listeners en 3000/3001.

Actualización posterior: Franco transfirió explícitamente la reserva; se levantó Next DEV en `http://127.0.0.1:5000`, login HTTP200. El bloqueo de ownership quedó resuelto para este runtime. Captura real y preflight de membresía autenticada200 pasaron; el navegador de captura se cerró automáticamente al guardar. El servidor sigue reservado por esta tarea.

No iniciar ni reconstruir sobre `.next` antes de resolver el lock `knowledge/specs/CLOUDFLARE-BUILD-PREP-DEV-20261002/LOCK.md`, que sigue en `editing` y reserva ese output compartido/DEV5000. El lock del ensayo de navegador anterior está liberado. No se detuvo ningún proceso ajeno.

## 3. Sesión manual: preparada, no ejecutada

Con el servidor del worktree correcto disponible y una empresa DEV sintética identificada:

```powershell
$env:CORE_FLOW_BASE_URL = 'http://localhost:5000'
# Asignar CORE_FLOW_COMPANY_ID al ID exacto de la empresa DEV autorizada.
# No inferir autorización de un valor de .env o del puerto local.
$env:CORE_FLOW_STORAGE_STATE = "C:\Users\franc\AppData\Local\Temp\opencode\ossum-qa-session-20261003.json"
node scripts/qa/dev-session.mjs capture
node scripts/qa/dev-session.mjs preflight
```

`capture` abre Chromium visible y espera el login manual. Solo guarda la sesión al observar una respuesta autenticada 200/JSON de membresía de la empresa indicada usando el transporte Bearer real de la app. Tiempo máximo: 20 minutos; el navegador se cierra al finalizar/fallar/interrumpir. No automatiza contraseñas ni modifica Auth.

El archivo debe tener padre existente, estar fuera de repositorios/worktrees y no existir al capturar. Una captura nueva requiere un nombre nuevo, sin sobreescribir ni borrar la anterior. El modo solicitado 0600 no certifica ACLs de Windows. `preflight` reutiliza la sesión sin sobreescribirla. Una sesión vencida se informa como `E2E blocked by expired authentication state`.

## Límites

- Preparación offline y tests sintéticos: ejecutados; no son aceptación operativa.
- Captura/preflight reales: inicialmente bloqueados; luego ejecutados PASS tras transferencia explícita de ownership (ver actualización y HANDOFF).
- Alta, autorización y OC en navegador: no creados/ejecutados por esta tarea. Se necesita scope de fixtures y aislamiento de efectos externos; Compras mantiene su lock separado.
- Sin schema, migraciones, Auth/roles, código de aplicación, datos de negocio, commits o deploy.
