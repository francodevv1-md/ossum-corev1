# Proposal — MAIL-V1-ETAPA3-GMAIL-REAL

Status: proposed  
Change: `MAIL-V1-ETAPA3-GMAIL-REAL`  
Workspace: `E:/OSSUM_COR_PROJECT`  
Artifact store: hybrid (filesystem + Engram)  
Parent: `MAIL-V1-ETAPA1-IMPLEMENTACION` (Stage 1/2 completo, 706 tests OK)

---

## 1. Objetivo

Reemplazar el proveedor mock (`MockMailProvider`) por un proveedor real contra Gmail API que implemente la misma interfaz `MailProviderAdapter`, manteniendo el resto de la arquitectura de Stage 1/2 intacta. La capacidad de email real queda dentro del Expediente de Cirugía, sin crear un inbox global ni modificar el modelo de snapshot + refresh manual.

---

## 2. Alcance

### 2.1 Dentro del alcance

1. **Nuevo `GmailMailProvider`** — implementa `MailProviderAdapter` contra la Gmail API real.
   - `listMailboxConversations` → `users.messages.list` + `users.threads.get` de Gmail.
   - `getConversationSnapshot` → `users.threads.get` con `format=FULL` para cuerpos completos.
   - `downloadAttachment` → `users.messages.attachments.get`.

2. **`GmailConnectionManager`** — manejo de OAuth 2.0 con Google.
   - Inicio de flujo OAuth (authorization URL).
   - Callback OAuth con intercambio de código por tokens.
   - Almacenamiento seguro de `access_token` + `refresh_token`.
   - Refresh automático de token expirado vía `google.auth.OAuth2`.
   - Health check de conexión.

3. **Configuración swappeable de proveedor** — factory o config central que permita alternar entre `mock` y `gmail` sin tocar el service ni las rutas API existentes.

4. **Nuevas rutas API exclusivas para administración de conexión**:
   - `GET  /api/admin/mail/gmail/auth` — inicia flujo OAuth (admin-only).
   - `GET  /api/admin/mail/gmail/callback` — callback OAuth.
   - `GET  /api/admin/mail/gmail/status` — estado de la conexión.
   - `POST /api/admin/mail/gmail/disconnect` — revocación de tokens (admin-only).

5. **Variables de entorno nuevas** para credenciales Gmail (sin exponer en frontend):
   - `GMAIL_CLIENT_ID`
   - `GMAIL_CLIENT_SECRET`
   - `GMAIL_REDIRECT_URI`
   - `MAIL_PROVIDER` (`mock` | `gmail`)

6. **Mailbox configurable por compañía** — el buzón `sistemas@districorr.com.ar` se parametriza para que futuras compañías puedan tener su propio buzón (aunque en V1 solo hay una compañía activa).

### 2.2 Fuera del alcance

- Send / reply / compose / draft / forward — **diferido a Etapa 4** salvo aprobación explícita de Franco para incluirlo aquí.
- Inbox global o dashboard de correo multi-buzón.
- Sincronización automática, polling, webhooks (Push Notifications de Gmail).
- Múltiples buzones por compañía.
- Attachment persistence en storage externo (S3/Supabase Storage) — sigue en filesystem como Stage 1.
- Cambios en el modelo de permisos de Stage 1.
- Refactor de Cirugías o del sistema de tabs de Expediente.
- UI nueva de administración de conexión — se usará una ruta admin mínima sin UI compleja en esta etapa.

### 2.3 Decisión pendiente: send/reply

La inclusión de send/reply (`POST /api/admin/mail/gmail/send`) se **propone como opcional** dentro de esta etapa si Franco lo aprueba. Si se incluye:
- Se agrega scope `https://www.googleapis.com/auth/gmail.send` al token OAuth.
- Se crea un endpoint simple `POST /api/admin/mail/gmail/send` con validación de `to`, `subject`, `body`.
- Se añade método `sendMessage` a `GmailMailProvider` (adicional a la interfaz base, como método propio del provider).
- **No se expone en la UI del Expediente en esta etapa** — solo API, para pruebas controladas.

---

## 3. Enfoque técnico

### 3.1 Arquitectura de archivos nueva

```
src/lib/mail-stage1/
├── provider/
│   ├── types.ts                    ← sin cambios
│   ├── mock-mail-provider.ts       ← sin cambios
│   ├── gmail-mail-provider.ts      ← NUEVO: GmailMailProvider
│   └── provider-factory.ts         ← NUEVO: factory swappeable
├── gmail/
│   ├── connection-manager.ts       ← NUEVO: GmailConnectionManager
│   ├── token-store.ts              ← NUEVO: almacenamiento de tokens
│   └── types.ts                    ← NUEVO: tipos Gmail internos
├── service.ts                      ← cambio mínimo: usar factory
├── types.ts                        ← sin cambios (o leve: MAIL_PROVIDER dinámico)
├── repository.ts                   ← sin cambios
└── permissions.ts                  ← sin cambios

src/app/api/admin/mail/gmail/
├── auth/route.ts                   ← NUEVO
├── callback/route.ts               ← NUEVO
├── status/route.ts                 ← NUEVO
└── disconnect/route.ts             ← NUEVO
```

### 3.2 Provider factory y swappeabilidad

El cambio clave en `service.ts` es reemplazar la importación directa de `mockMailProvider`:

```ts
// ANTES (service.ts actual)
import { mockMailProvider } from "./provider/mock-mail-provider"
// ... mockMailProvider.listMailboxConversations(...)

// DESPUÉS
import { getMailProvider } from "./provider/provider-factory"
// ... getMailProvider().listMailboxConversations(...)
```

`provider-factory.ts` lee `MAIL_PROVIDER` de variables de entorno y devuelve la instancia correspondiente. Ambas implementaciones (`MockMailProvider`, `GmailMailProvider`) son singleton y cumplen `MailProviderAdapter`.

### 3.3 Gmail API — métodos

#### `listMailboxConversations({ mailbox, query?, limit? })`

1. Construir query Gmail: `q={query} in:inbox` (u otros filtros configurados).
2. Llamar `gmail.users.threads.list({ userId: mailbox, q, maxResults: limit ?? 20 })`.
3. Para cada thread ID, llamar `gmail.users.threads.get({ id, format: "metadata", metadataHeaders: ["Subject", "From", "To", "Cc", "Date"] })`.
4. Mapear a `MockMailboxConversationSummary[]` (sin cambios en la interfaz).

#### `getConversationSnapshot({ mailbox, externalConversationId })`

1. `gmail.users.threads.get({ userId: mailbox, id: externalConversationId, format: "FULL" })`.
2. Extraer mensajes con `payload.parts` y bodies (decodificando base64 cuando corresponda).
3. Extraer attachments con `filename`, `mimeType`, `attachmentId` (Gmail).
4. Mapear a `ProviderConversationSnapshot`.

#### `downloadAttachment({ mailbox, externalConversationId, providerAttachmentRef })`

1. `gmail.users.messages.attachments.get({ userId: mailbox, messageId, id: providerAttachmentRef })`.
2. Decodificar `data` (base64 → Buffer).
3. Retornar `{ buffer, fileName, mimeType }`.

### 3.4 OAuth 2.0 flow

Usar `googleapis` (librería oficial `google-auth-library`) para OAuth 2.0:

1. **Inicio** (`GET /api/admin/mail/gmail/auth`):
   - Generar URL de autorización con scopes requeridos.
   - Redirigir al usuario a Google OAuth consent screen.
   - Scopes mínimos: `https://www.googleapis.com/auth/gmail.readonly`.
   - Scopes opcionales (si send/reply aprobado): `https://www.googleapis.com/auth/gmail.send`.

2. **Callback** (`GET /api/admin/mail/gmail/callback`):
   - Recibir `code` de Google.
   - Intercambiar `code` por `tokens` (access + refresh).
   - Almacenar tokens encriptados.
   - Redirigir a página de confirmación.

3. **Token storage** (`token-store.ts`):
   - **Propuesta principal**: archivo encriptado en `.runtime/mail-stage1/gmail-tokens.json` usando `crypto.createCipheriv` con clave derivada de `GMAIL_ENCRYPTION_KEY` (variable de entorno).
   - **Alternativa (si Franco aprueba tocar schema.prisma)**: tabla `GmailConnection` en Prisma — pero esto cruza el umbral de aprobación de DB.
   - Para esta propuesta se **recomienda filesystem encriptado** y se difiere el modelo DB a Etapa 4 o a Backend Foundation (GPT-027F.5A).

4. **Token refresh automático**:
   - `GmailConnectionManager` detecta `access_token` expirado (HTTP 401).
   - Usa `refresh_token` para obtener nuevo `access_token`.
   - Persiste el nuevo token automáticamente.
   - Si el refresh falla (token revocado), marca conexión como `disconnected` y notifica.

### 3.5 Dependencias nuevas

```json
{
  "googleapis": "^148.0.0",       // Gmail API client oficial
  "google-auth-library": "^9.0.0" // OAuth 2.0 client (incluido en googleapis)
}
```

No se requieren dependencias adicionales para encriptación — se usa `node:crypto` nativo.

### 3.6 Variables de entorno nuevas

```bash
# .env.example (nuevas entradas)
MAIL_PROVIDER="mock"                    # "mock" | "gmail"
GMAIL_CLIENT_ID="xxx.apps.googleusercontent.com"
GMAIL_CLIENT_SECRET="GOCSPX-xxx"
GMAIL_REDIRECT_URI="http://localhost:3000/api/admin/mail/gmail/callback"
GMAIL_ENCRYPTION_KEY="hex-256-bit-key"  # generado con: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 4. Camino de migración

### 4.1 Secuencia de implementación (6 slices)

| Slice | Descripción | Archivos afectados | Riesgo |
|-------|-------------|-------------------|--------|
| **S1** | Provider factory + swappeabilidad | `provider-factory.ts`, `service.ts`, `types.ts` | Bajo — refactor mínimo |
| **S2** | `GmailConnectionManager` + token store | `gmail/connection-manager.ts`, `gmail/token-store.ts`, `gmail/types.ts` | Medio — criptografía |
| **S3** | `GmailMailProvider` con 3 métodos de interfaz | `provider/gmail-mail-provider.ts` | Medio — mapeo de API |
| **S4** | Rutas admin OAuth (auth, callback, status, disconnect) | `app/api/admin/mail/gmail/*/route.ts` | Bajo — rutas nuevas |
| **S5** | Tests unitarios + integración con Gmail API mockeada | `__tests__/unit/gmail-mail-provider.test.ts`, `__tests__/integration/gmail-api.test.ts` | Medio — mocking de googleapis |
| **S6** | (Opcional) Send/reply si aprobado | `provider/gmail-mail-provider.ts`, `app/api/admin/mail/gmail/send/route.ts` | Medio — scope adicional |

### 4.2 Estrategia de zero-downtime

1. El feature flag `MAIL_PROVIDER=mock` es el default.
2. S1–S3 se implementan sin cambiar el proveedor activo.
3. S4 despliega rutas admin que solo afectan si se usan explícitamente.
4. Cuando Franco configure `MAIL_PROVIDER=gmail` y complete el flujo OAuth, el sistema cambia a Gmail real sin deploy adicional.
5. Las rutas API existentes de Expediente (`/mail-links/*`, `/mailbox/conversations`) no cambian su contrato — mismo request/response, distinto proveedor por debajo.

### 4.3 Rollback

- Cambiar `MAIL_PROVIDER=mock` → vuelta instantánea al mock provider.
- Los snapshots ya persistidos en filesystem siguen disponibles (son datos históricos, no live).
- La desconexión de Gmail no borra datos ya importados.

---

## 5. Aprobaciones requeridas

| # | Decisión | Quién | Urgencia | Bloqueante |
|---|----------|-------|----------|------------|
| **A1** | Crear proyecto GCP + credenciales OAuth 2.0 para `sistemas@districorr.com.ar` | Franco | Alta | Sí — sin credenciales no hay Gmail |
| **A2** | Scopes Gmail: ¿solo `readonly` o incluir `send`? | Franco | Alta | Define si S6 se incluye |
| **A3** | Almacenamiento de tokens: ¿filesystem encriptado (recomendado) o tabla en `schema.prisma`? | Franco | Media | Define implementación de token-store |
| **A4** | Política de privacidad/seguridad para contenido de email importado | Franco | Alta | Cumplimiento normativo |
| **A5** | ¿Incluir send/reply en esta etapa o diferir a Etapa 4? | Franco | Media | Define scope final de S6 |
| **A6** | Aprobación de dependencia `googleapis` | Franco | Baja | Nueva dependencia en package.json |

---

## 6. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| **Gmail API quotas** (10K req/día free, 250 req/seg) | Media | Medio — puede frenar browse intensivo | Rate limiting interno + caché de snapshots ya importados |
| **Rotación de refresh tokens** (Google revoca tokens inactivos o en desarrollo) | Alta | Bajo — requiere re-auth | Auto-refresh + notificación admin en `status` |
| **Complejidad de mapeo Gmail thread → snapshot** (estructura anidada de parts/bodies/attachments) | Media | Medio — bugs en parsing de mensajes | Tests exhaustivos con fixtures de threads reales anonimizados |
| **Fuga de credenciales** (GMAIL_CLIENT_SECRET en logs o frontend) | Baja | Crítico | Solo server-side, `.env` excluido de git, `GMAIL_ENCRYPTION_KEY` separada |
| **Conflicto con prohibición de tocar schema.prisma** (AGENTS.md §11) | Media | Alto — bloquea si se elige DB para tokens | **Recomendación: filesystem encriptado**. Si Franco insiste en DB, requiere task brief explícito para schema change |
| **Latencia de Gmail API** (300-800ms por llamada) | Alta | Bajo — UX más lenta en browse | Indicadores de carga explícitos (ya implementados en Stage 1) |
| **Compatibilidad con multiempresa futura** | Baja | Medio — refactor posterior | `GmailConnectionManager` acepta `companyId` desde el inicio; token-store particiona por compañía |

---

## 7. Caveman handoff

```text
Done:
- Proposal MAIL-V1-ETAPA3-GMAIL-REAL written
- Scope defined: Gmail provider + OAuth + swappable config
- Send/reply flagged as optional pending Franco approval
- Token storage recommended as encrypted filesystem (avoids schema.prisma)
- 6 implementation slices defined with zero-downtime migration path

Changed:
- (none) — proposal only, no code changes

Files:
- knowledge/specs/MAIL-V1-ETAPA3-GMAIL-REAL/PROPOSAL.md — proposal artifact

Validations:
- Architecture review: compatible with Stage 1/2 (same interface, same API contract)
- Guardrails check: no schema.prisma touch (filesystem token store), no auth redesign, no global inbox

Risks:
- A1 (GCP credentials) — blocker, requires Franco action
- A3 (token storage) — if DB chosen, crosses schema.prisma prohibition boundary
- Gmail API quotas and latency — acceptable with current manual-refresh model
- Refresh token rotation in dev — may require periodic re-auth

Next:
- Franco reviews and approves A1-A6
- If approved: proceed to sdd-spec for detailed Gmail API mapping + OAuth flow spec
- If send/reply approved: include in spec and S6
- If DB token storage approved: task brief for schema.prisma change required before implementation
```
