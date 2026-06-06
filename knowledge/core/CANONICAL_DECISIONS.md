# CANONICAL_DECISIONS.md — OSSUM COR

Estado: vigente  
Tipo: decisiones cortas para agentes

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

## Secuencia vigente

1. GPT-027F.0A — Knowledge V2 / saneamiento documental.
2. GPT-027F.0B — Gentle-AI workspace / Engram / SDD / Skill Registry / guardrails.
3. GPT-027F.5A — Backend Foundation.

Backend está bloqueado hasta cerrar 0A/0B.

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

## Prohibiciones vigentes

- No iniciar Backend Foundation antes de 0A/0B.
- No tocar `prisma/schema.prisma` sin spec y task brief.
- No refactorizar Cirugías sin scope explícito.
- No usar Prisma desde React.
- No poner lógica crítica en componentes.
- No usar Supabase RLS como reemplazo de validación backend.
- No exponer secretos ni credenciales fiscales en frontend.
- No integrar TusFacturasAPP productivo sin backend y ADR específica.

---

## Prioridad inmediata

Crear y consolidar Knowledge V2 + AGENTS.md + specs GPT-027F.0.

