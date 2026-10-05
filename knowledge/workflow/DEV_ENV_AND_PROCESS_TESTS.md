# Entorno DEV y pruebas de procesos — OSSUM COR

Fecha: 2026-10-03. Worktree auditado: `E:\OSSUM_COR_ANTIGRAVITY\ux-ui`, HEAD `73e3e1b` con cambios locales ajenos preservados.
Estado: auditoría estática + comandos de versión. **No certifica credenciales, conectividad, DB descartable ni procesos funcionando.** No se leyeron archivos reales de entorno/sesión, ni se ejecutaron tests con escrituras.

## 1. Diagnóstico honesto

| Hallazgo | Evidencia | Consecuencia |
| --- | --- | --- |
| Build ignora errores TypeScript | `next.config.ts:7–11` | Un build exitoso no certifica tipos correctos. Hace falta corregir la configuración y pasar typecheck por separado. |
| `npm test` incluye integración PostgreSQL | `vitest.config.ts:11`; `src/__tests__/integration/remitos-api.test.ts:56–110` | No usarlo como comprobación inocua: algunas suites crean y borran datos sin gate de target. |
| Browser no tiene sesión/preflight general | `playwright.config.ts:11–27` | No hay una base autenticada uniforme para repetir procesos. |
| Facturación/cobros solo buscan ausencia de texto de error | `e2e/shared-tooltip-pages.spec.ts:8–21` | Pueden pasar en login; no prueban facturas ni cobros. |
| Hover condicional evita una aserción si falta el elemento | `e2e/cirugias-page.spec.ts:54–65` | Un resultado verde no necesariamente ejercita esa interacción. |
| Paths de migraciones archivadas y conteo obsoleto | Integraciones `contacts-backend-authority-migration-artifact`, `surgery-visible-number-uniqueness-migration`, `coordination-shipping-persistence-artifact`; unit `erp-migration-smoke` | Hay defectos estáticos de replay. No se afirma un fallo ejecutado en esta auditoría. |
| Loaders de env distintos | `prisma.config.ts:1–11`; `scripts/dev/inspect-ezequiel-auth.ts:12–13`; `scripts/dev/smoke-fiscal-issuance.ts:4–5` | Un valor puede resolverse distinto según el comando. Falta un contrato uniforme. |
| No workflow CI versionado encontrado | Inventario Git de `.github/workflows` | No hay evidencia de ejecución automática CI de estos procesos. |

No corresponde asignar un porcentaje de producto terminado a partir de esta auditoría. Hay pruebas útiles de piezas; falta evidencia reproducible de varios procesos completos.

## 2. Herramientas necesarias

Ya se verificó: Node `v25.2.1`, npm `11.6.2`, CLI Playwright `1.60.0`. El último comando **no prueba que el ejecutable Chromium esté instalado**.
El proyecto ya declara TypeScript, Vitest, Playwright, Prisma, dotenv y Zod. No hace falta sumar un framework de tests ni Python para los E2E operativos.
Para preparar cuentas/configuración: editor local, navegador, acceso al dashboard del proyecto Supabase **de pruebas**. Para OCR/IA o correo real, solo los dashboards del proveedor que se vaya a probar. Cloudflare/Wrangler no son requisito para probar la aplicación Next local.
La estandarización posterior de Node debe elegir una versión LTS compatible y verificar lockfile/build; no se cambió Node en esta tarea.

## 3. Qué debe preparar Franco

No enviar passwords, tokens ni archivos `.env` por chat. No sobrescribir archivos existentes copiando una plantilla encima.

1. Abrir esta carpeta exacta en el editor y terminal. No preparar otro worktree por error.
2. Identificar un proyecto/DB **aislado para QA**, con empresa y datos sintéticos. Registrar su identificador no secreto y autorización de uso; “localhost” y `NODE_ENV=development` no prueban aislamiento. Si hay casos reales o datos que se deben conservar, esa DB no es descartable.
3. Guardar valores privados localmente en `.env.local`; revisar `.env` existente para evitar duplicaciones contradictorias. La ingeniería normalizará los loaders; **Prisma actualmente carga `.env` y requiere `DIRECT_URL`**, por lo que no se debe mover todo a `.env.local` y asumir que las migraciones seguirán funcionando.
4. Preparar usuarios de prueba con los roles existentes para admin, comercial, coordinación y compras/contabilidad según las pruebas. No inventar roles ni usar la cuenta personal en pruebas de denegación. Crear/asignar cuentas implica Auth/permisos y requiere autorización específica antes de automatizarlo.
5. Preparar login manual de esos usuarios. Una sesión guardada temporalmente permite repetir pruebas sin compartir la contraseña con el agente. No hay todavía un capturador/preflight general implementado en este worktree.
6. Informar solamente qué grupos están configurados y qué capacidad se quiere probar. La disponibilidad/validez será comprobada por ingeniería con salida redactada; no basta con que una key esté escrita.

### Configuración mínima identificada en código

| Grupo | Nombres, sin valores | Dónde obtener/configurar |
| --- | --- | --- |
| PostgreSQL | `DATABASE_URL`, `DIRECT_URL` | Conexiones del proyecto de pruebas; confirmar que ambas apuntan al mismo target autorizado. La conexión directa es privada. |
| Supabase cliente | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Configuración API del mismo proyecto de pruebas. Solo la clave pública/anon, nunca service-role. |
| Supabase servidor | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Configuración server-side del proyecto. Service-role es secreto privilegiado y nunca `NEXT_PUBLIC_*`. |
| Empresa inicial | `NEXT_PUBLIC_OSSUM_DEFAULT_COMPANY_ID` | ID de empresa de prueba existente, vinculado a membresías autorizadas. |

Evidencia: `src/lib/prisma.ts:15–18`, `prisma.config.ts:11`, `src/lib/auth/client.ts:12–16`, `src/lib/supabase/server.ts:7–18`, `src/components/auth/AuthProvider.tsx:9`.

### Opcionales: configurar solo cuando se vaya a probar esa integración

| Capacidad | Variables identificadas | Límite |
| --- | --- | --- |
| Extracción IA | `AI_PROVIDER`, `OPENAI_API_KEY` o `OPENROUTER_API_KEY`; modelo según proveedor | La factory registra mock/OpenAI/OpenRouter. Nombres Gemini/Anthropic/local en config no prueban implementación. No presentar mock como proveedor real. |
| Azure OCR | `AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT`, `AZURE_DOCUMENT_INTELLIGENCE_API_KEY`, versión opcional | Archivos sintéticos y uso autorizado; no enviar documentación clínica real. |
| Mail stage1/Gmail | `MAIL_PROVIDER`, `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REDIRECT_URI`, `GMAIL_ENCRYPTION_KEY`, `GMAIL_MAILBOX` | No configurar todos los proveedores a la vez. OAuth/tokens y envío real se preparan en un paquete autorizado. Hay trabajo local no certificado de otro proveedor; revisar antes de elegir. |
| Documentos/mail R2 | `R2_ACCOUNT_ID` o `R2_ENDPOINT`, `R2_REGION`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` | Acceso y bucket de pruebas, permisos mínimos. No asumir que cubre recibos digitales. |
| Recibos digitales R2 | `DIGITAL_RECEIPTS_R2_ENDPOINT` o `DIGITAL_RECEIPTS_R2_ACCOUNT_ID`, `DIGITAL_RECEIPTS_R2_BUCKET`, `DIGITAL_RECEIPTS_R2_ACCESS_KEY_ID`, `DIGITAL_RECEIPTS_R2_SECRET_ACCESS_KEY`, región/prefix opcionales | Segundo namespace independiente. |
| GPS/notificaciones | `LOGISTICS_GPS_PROVIDER_BASE_URL`, `LOGISTICS_GPS_PROVIDER_TOKEN`, `NTFY_SERVER_URL`, `NTFY_DEFAULT_TOPIC` | Destinos de prueba; no notificar a personas reales automáticamente. |
| Fiscal | `TUSFACTURAS_DEV_*` | Fuera de este paquete. El código tiene fallback a credenciales genéricas; una key presente no acredita aislamiento ni habilita emisión. |

No se verificó la cobertura/seguridad de valores de `.env.example` o `.dev.vars.example`; no se abrieron. Los archivos reales `.env`/`.env.local` existen, pero **no se certificó qué variables tienen**.

### Contrato a normalizar por ingeniería, no todavía implementado

- Next DEV: variables inyectadas → `.env.development.local` → `.env.local` → `.env.development` → `.env`.
- Next en `NODE_ENV=test` omite `.env.local`; los runners externos necesitan su loader explícito. No asumir que Vitest/Prisma cargan como Next.
- `NEXT_PUBLIC_*` llega al navegador y se fija en build. Reiniciar/reconstruir según corresponda después de cambios; nunca prefijar secretos para “hacerlos llegar”.
- Mantener plantilla versionada sin secretos y un checker sin red/DB que emita únicamente missing/placeholder/invalid-format/present. Presencia no es validez/conectividad.
- Mantener autorización de target separada de una bandera editable en `.env`. Desactivar gates de borrado/bootstrap por defecto.
- Workers tiene configuración build/runtime propia; `.env.local` no reemplaza secrets/bindings de Workers. No migrar tokens persistidos en filesystem a Workers sin diseño específico.

Referencias oficiales verificadas: [Next environment variables](https://nextjs.org/docs/app/guides/environment-variables), [Playwright authentication](https://playwright.dev/docs/auth), [Playwright CLI](https://playwright.dev/docs/test-cli).

## 4. Pruebas existentes y lo que falta

Inventario de fuentes **versionadas** en HEAD, no de ejecuciones aprobadas: 172 archivos unit, 78 component, 14 integration; 3 specs Playwright / 6 casos. Las adiciones no versionadas del worktree no están incluidas en esos conteos.

| Proceso | Evidencia existente | Falta para la prueba que Franco necesita |
| --- | --- | --- |
| Carga de cirugía | Componentes/hooks y create-API con mocks | Crear desde wizard en navegador, verificar persistencia y reload; validaciones/duplicado. |
| Autorización/aprobación | Reglas y UI mockeadas | Guardar evidencia sintética, revisión humana, transición persistida y rechazo sin requisito. |
| Presupuesto | Integración PostgreSQL de rutas, Auth mockeado | Crear/revisar/emitir/aprobar desde UI con resultado persistido. |
| Orden de compra/recepción | Dominio/diálogos mockeados | Crear OC, recibir parcial/completo, verificar pendientes/stock, rechazo inválido. |
| Preparación/cajas | Integración PostgreSQL opt-in con concurrencia/rollback | Selección/control/despacho desde UI, tenant/roles adecuados. |
| Remito/consumo/devolución | Integraciones PostgreSQL separadas | Recorrido conectado en navegador y efectos persistidos. |
| Facturación/cobro | Integración PostgreSQL operativa con saldo/anulación | Emitir no fiscal, imputar cobro, verificar saldo y anulación desde UI. |

Integraciones reales acceden a PostgreSQL, pero varias invocan handlers directamente con autenticación mockeada: no certifican navegador ni Auth real.
`src/__tests__/unit/presupuesto-connected-journey-e2e.test.ts` usa arrays/mocks; el nombre “e2e” no lo convierte en Playwright.
Hay 14 casos legacy deshabilitados en `remitos-022.test.ts`. Las suites opt-in requieren gates; otras integraciones no los tienen.

## 5. Comandos para repetir, con límites explícitos

Abrir terminal en `E:\OSSUM_COR_ANTIGRAVITY\ux-ui`. Los comandos siguientes se identificaron en código; salvo las versiones, **no se ejecutaron en esta auditoría**.

```powershell
# Herramientas: sin aplicación ni DB
node --version
npm --version
.\node_modules\.bin\playwright.cmd --version

# Componente mockeado: NO certifica persistencia ni navegador real
.\node_modules\.bin\vitest.cmd run src/__tests__/components/NewSurgeryDialog.test.tsx
.\node_modules\.bin\vitest.cmd run src/__tests__/components/ReceiveOrdenCompraDialog.test.tsx

# Tipos: separado del build que actualmente los ignora
npm run typecheck
```

No ejecutar `npm test`, `db:reset`, `db:push`, seeds, bootstrap, cleanup ni smoke fiscal como “comprobación de entorno”. Necesitan análisis/autorización propios y pueden escribir datos.

Cuando la aplicación/target de pruebas esté preparado y autorizado:

```powershell
# Terminal de la app: evita depender de tee del script npm dev en Windows
.\node_modules\.bin\next.cmd dev -p 3000

# Otra terminal: descubrir no es ejecutar ni aprobar
.\node_modules\.bin\playwright.cmd test --list --project=chromium

# Runner existente: no representa todavía un proceso de negocio completo
.\node_modules\.bin\playwright.cmd test e2e/cirugias-page.spec.ts --project=chromium --workers=1 --retries=0 --headed
```

El config usa 3000 y puede reutilizar cualquier servidor en ese puerto; comprobar worktree/target antes de reutilizarlo. El script especializado de coordinación usa 3001. No mezclar sus sesiones/orígenes.
El test de coordinación requiere credenciales privadas, attestation, fixtures y evidence directory: no correrlo indiscriminadamente con toda la carpeta E2E.
Si falta Chromium, su instalación oficial es `playwright install chromium`; ingeniería debe comprobar primero si realmente falta y coordinar esa instalación, no reinstalar toda la aplicación.
El reporter actual es `list` y el trace se graba en primer retry; con cero retries no garantiza un trace de fallo. El futuro runner de procesos debe producir un reporte local legible y evidencia on-failure, sin publicación automática.

## 6. Paquete de automatización pendiente

No se creó ni ejecutó todavía la suite de procesos solicitada. Para implementarla correctamente:

1. Normalizar checker/contrato de env sin alterar secretos ni Auth sin autorización.
2. Separar unit/component de integración con escrituras; proteger todos los targets y reparar paths/aserciones de migraciones mediante Diagnose. Los gates existentes tocan seguridad de ejecución y no se modificaron aquí.
3. Crear captura manual de sesión + preflight reusable (y automatización de credenciales solo si se aprueba); seleccionar empresa/fixture sintética y validar el target antes de mutaciones.
4. Crear specs independientes de carga, autorización, OC/recepción y circuito comercial/logístico; afirmar persistencia, negativos y roles. Coordinar OC/schema: existe lock `COMPRAS-AUTHORITY-PORT-TO-ANTIGRAVITY` en estado editing, no asumir liberado.
5. Ejecutar con el agente por CLI y entregar **el mismo comando** para replay de Franco. El agente sí puede ejecutar Playwright por terminal; no necesita manejar el navegador clic a clic ni un MCP para cada paso.
6. Informar PASS/FAIL/BLOCKED/NOT RUN. Solo considerar completo lo efectivamente ejecutado y validado en ese target.

## 7. Skills y reglas

AGENTS.md fue compactado de 499 a 71 líneas y el texto anterior se preservó en `AGENT_REFERENCE_20261003.md` con aprobaciones/paths detallados. Se restauró una política explícita de sesión fresca/preflight/reuso y presupuesto de 20 minutos.
Skills propias creadas: `.opencode/skills/ossum-safe-changes/SKILL.md` y `.opencode/skills/ossum-process-e2e/SKILL.md`. Guía de estilo del repo ausente: se usó el formato fallback de skill-creator. Sin assets ni dependencias nuevas.
Estas skills son instrucciones para agentes, **no ejecutables ni tests**. Si el host no las descubre, debe leer el SKILL.md enlazado; no están garantizadas en otros worktrees ni en el catálogo de una sesión ya iniciada.
Se eligió `.opencode/skills/` porque `.agents/` está ignorado por Git; no se alteró `.gitignore` ajeno. Skills genéricas locales de UI/Prisma siguen referenciadas cuando aplican, sin cargar un catálogo completo.

## Handoff

- **Done:** auditoría y preparación documental compacta.
- **Changed:** reglas/skills/guía; no aplicación, Auth, secretos, DB ni tests operativos.
- **Files:** AGENTS.md, referencia anterior, esta guía, dos SKILL.md y lock propio.
- **Validations:** inspección estática, versiones de herramientas, git diff --check de AGENTS.md y revisión independiente PASS de coherencia documental/paths/metadatos; sin ejecución de procesos.
- **Risks:** credenciales/target no certificados; suite insegura si se ejecuta completa; gaps E2E y ownership de Compras.
- **Next:** preparar target/cuentas y resolver permisos de manejo de secretos/Auth; implementar y ejecutar la suite por paquetes acotados.
