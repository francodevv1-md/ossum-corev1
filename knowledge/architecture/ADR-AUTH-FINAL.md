# ADR-AUTH-FINAL.md — Auth productiva OSSUM COR

> **DRAFT.** Requiere aprobación de Franco antes de finalizar. No implementar Auth productivo sin este ADR cerrado.

Estado: DRAFT  
Última actualización: 2026-07-07 (DOC-027F.0C-SANEO)  
Proyecto: OSSUM COR  
Supera: definición genérica de "Auth pendiente" en `ADR-027E-BACKEND_DB_ORM_AUTH_STORAGE.md` addendum 2026-06-09.

---

## 1. Estado de contexto actual (DEV)

Supabase Auth está operacional en el entorno DEV de OSSUM COR:

- `src/lib/supabase/server.ts` expone un cliente admin side con `SERVICE_ROLE_KEY`.
- `src/lib/api/auth-context.ts` expone `getApiAuthContext(request, companyId)` como punto único de resolución de identidad server-side.
- Mapeo dual de identidad:
  1. **Camino real**: Supabase JWT (Bearer) → `auth.getUser()` → `User.supabaseAuthId` → `User.id` interno (cuid) + `UserCompanyAccess` por empresa activa.
  2. **Fallback DEV**: header `x-ossum-actor-user-id` solo cuando `process.env.NODE_ENV !== "production"`. Permite fumar sin Bearer durante DEV. **No debe estar activo en producción.**
- Guards: `requireCompanyReadAccess(ctx)`, `requireCompanyMutationAccess(ctx, roles)`.
- AuthGuard SPA en frontend `/login` con logout y redirección; `AuthProvider` expone `currentUser`, `currentAccess`, `activeCompany`, `currentUserLoading`.
- Smoke DEV probado: 8/8 matriz (401 sin token, 401 token inválido, 200 con Bearer válido, 400 body inválido).
- Manualmente: `User.supabaseAuthId` seteado en admin de la DB DEV, tokens Supabase Auth expiran ~1h.

> Pendiente de declaración productiva: no está cerrado que Supabase sea el destino auth definitivo, ni que el patrón actual (JWTBearer + fallback DEV apagado en prod + roles inline + sesión server con `getApiAuthContext`) sea el esquema final. Este ADR define el cierre.

---

## 2. Decisiones pendientes a resolver

1. **Supabase Auth como arquitectura auth productiva definitiva.** ¿Sí / No / condiciones? Alternativa considerada: NextAuth o Auth propia. Clerk solo con ADR específica (no preferido por cost/lock-in).
2. **Apagar fallback DEV `x-ossum-actor-user-id` en producción.** Requiere env check cerrado (`process.env.NODE_ENV === "production"` o entorno explícito) más smoke que valide que sin Bearer la API siempre/functiona retorna 401. Decidir si el header se elimina del código o solo se desactiva mediante runtime check.
3. **Estrategia de sesiones/refresh de tokens.** Opciones:
   - Solo Supabase JWT en memoria + Bearer en cada request.
   - Cookies `httpOnly` con sesión server-side y refresh transparente.
   - Híbrido: Bearer client-side + cookie httpOnly para SSR.
4. **Rotación de claves y revocación.** Cómo rotar `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Política de revocación de sesión/jwt en caso de compromiso.
5. **Roles centralizados.** Migrar roles inline por servicio (`SURGERY_MUTATION_ROLES`, etc.) a `src/lib/permissions/*`. Validez vs dominio OSSUM COR (admin, coordinador, logística, médico, facturación, etc.).
6. **Multiempresa.** Confirmar `UserCompanyAccess` como tabla única de permisos por empresa + rol por empresa. Reglas de selección de empresa activa y cambio de empresa activa.
7. **Auditoría de login/logout/role change.** ¿Volcar entradas de auth a `AuditEvent` central? Ver `AUDIT_EVENT_POLICY.md`. Actualmente no se auditan eventos auth en `AuditEvent`.

---

## 3. Pendiente de aprobación Franco

Pendiente de aprobación de Franco (ver `docs/ia-autorizaciones/PLAN_CONTINUIDAD_REAL_OSSUM_COR.md` §15, punto 2). Sin aprobación explícita de los ítems 2.1 a 2.7 anteriores más la decisión §15.p2, este ADR no cierra y **no se debe activar Auth productiva**.

---

## 4. Reglas protectivas mientras este ADR sea DRAFT

Hasta el cierre formal de este ADR:

- No apagar el fallback DEV en ningún entorno que no sea producción etiquetada explicitamente.
- No introducir un nuevo proveedor de Auth (Clerk, NextAuth, Auth0, etc.) sin ADR adicional.
- No exponer secretos Supabase en frontend ni en client bundles.
- No crear rutas API nuevas sin pasar por `getApiAuthContext` + scoping companyId.
- No añadir roles sin registarlos en `permissions/*` (cuando exista) o inline respetando el patrón de los servicios existentes.

---

## 5. Referencias

- `knowledge/architecture/ADR-027E-BACKEND_DB_ORM_AUTH_STORAGE.md` (decisión técnica V0 + addendums).
- `knowledge/architecture/MULTI_COMPANY_ACCESS.md` (multitenant).
- `knowledge/architecture/AUDIT_EVENT_POLICY.md` (auditoría).
- `docs/ia-autorizaciones/PLAN_CONTINUIDAD_REAL_OSSUM_COR.md` §15 (decisiones que requieren Franco).
- `knowledge/architecture/BACKEND_PHASE2_PLAN.md` Fase 4B (Auth productivo como gate).