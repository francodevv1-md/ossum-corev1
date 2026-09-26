# CANONICAL_DECISIONS.md — OSSUM COR

Estado: vigente  
Tipo: decisiones cortas para agentes  
Actualizado: 2026-09-10

---

## Producto

- Nombre canónico: OSSUM COR.
- Producto: ERP operativo multiempresa centrado en Cirugía/Expediente.
- XAdmin: fuente de aprendizaje operativo, no diseño a copiar.
- Cirugía: entidad central.
- Expediente: vista integral de la cirugía.
- V1 canónica: Contactos → Cirugía/Expediente → Presupuesto → Preparación → Remito → Consumo → Devolución → Comparativa → Documentación → Facturación → Cobro.

---

## Tecnología

- Backend V0: Next.js + API Routes/Server Actions + Prisma + PostgreSQL gestionado.
- DB provider: Supabase o Neon a evaluar.
- Auth/Storage: Supabase opcional si simplifica; no cerrado.
- VPS: posterior.
- Zustand/localStorage: transición del prototipo, no fuente final.
- TusFacturasAPP: motor fiscal externo, backend-only.

---

## Secuencia vigente (estado al 2026-07-07)

1. GPT-027F.0A — Knowledge V2 / saneamiento documental — **CERRADA**.
2. GPT-027F.0B — Gentle-AI workspace / Engram / SDD / Skill Registry / guardrails — **CERRADA**.
3. GPT-027F.5A — Backend Foundation — **EJECUTADA parcialmente**:
   - Schema phase1 + 21 modelos en Prisma/PostgreSQL/Supabase (multiempresa, contactos, cirugía mínima enriquecida con visibleNumber/estados/fechas/SurgeryContactAssignment, AuditEvent).
   - Auth Supabase DEV operativo con `getApiAuthContext` + mapeo `supabaseAuthId → User.id` + fallback DEV `x-ossum-actor-user-id` (fuera de producción).
   - Contactos API (read + mutations con auditoría).
   - Surgeries API (read + status PATCH, enriquecida con patient/doctor/institution), vista técnica `/cirugias-api`.
   - Seguimiento (SeguimientoEntry + service + API + adapter + hook + NovedadesTabContent).
   - Notificaciones internas (InternalNotification + service + API + inbox/dropdown).
   - Recibos digitales (5 modelos DigitalReceipt + service + R2 storage + firma pública).
   - Mail stage1 (en FS, Gmail OAuth).
   - IA autorización (stateless, providers mock/openai/openrouter, integrada en NewSurgeryDialog).
   - Auditoría en cirugía y contactos; gap en seguimiento/recibos.

La secuencia 0A/0B como gate bloqueante ya **no aplica**. Las prohibiciones sobre `schema.prisma`, Auth y Cirugías se mantienen como **reglas protectivas basadas en contenido** (ver `AGENTS.md` §11), no como secuencia bloqueante.

---

## IA / agentes

- Codex/OpenCode/Gentle-AI son flujo operativo principal.
- ChatGPT actúa como copiloto estratégico/documental/arquitectura.
- Engram + Engram Sync se activan desde 0B como memoria operativa.
- Engram no reemplaza Knowledge V2.
- No cargar todo el Contexto Maestro por defecto.
- 1 a 3 skills por tarea salvo necesidad explícita.
- Un archivo crítico, un agente escritor por vez.

---

## Geografía

- `knowledge/core/GEORREFERENCIACION_ARGENTINA_MASTER.md` gobierna toda lógica geográfica del sistema.
- Georef Argentina es la fuente territorial primaria; IGN/POSGAR 07 aplica cuando la precisión geodésica lo exige.
- Conservar `georef_id`, jerarquía territorial, latitud, longitud, `coordinate_type`, CRS, fuente y fecha de validación; la geografía debe ser interoperable entre sistemas.
- Distinguir centroide, dirección geocodificada, GPS/GNSS y geometría. No presentar ni reutilizar uno como si fuera otro.
- Nunca inferir ni corregir provincia/localidad por texto. Ante conflictos, auditar e informar sin modificar automáticamente.

---

## Prohibiciones vigentes (reglas protectivas, independientes del cierre de fases)

- No backend foundation nuevo (circuito troncal post-Cirugía) sin Task Brief específico y aprobación de Franco.
- No migraciones reales sin aprobación de Franco.
- No cambio de DB provider sin ADR.
- No Auth productivo sin `ADR-AUTH-FINAL.md` cerrado y aprobado.
- No refactorizar Cirugías sin scope explícito y Task Brief.
- No tocar `prisma/schema.prisma` sin Task Brief + aprobación Franco.
- No instalar dependencias nuevas sin tarea explícita.
- No integrar TusFacturasAPP productivo.
- No usar Prisma desde React.
- No poner lógica crítica en componentes.
- No usar Supabase RLS como reemplazo de validación backend.
- No exponer secretos ni credenciales fiscales en frontend.

---

## Prioridad inmediata

Crear y consolidar Knowledge V2 + AGENTS.md + specs GPT-027F.0.
