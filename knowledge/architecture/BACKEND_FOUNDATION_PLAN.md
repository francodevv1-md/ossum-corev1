# BACKEND_FOUNDATION_PLAN.md — GPT-027F.5A

Estado: activo — GPT-027F.0A y 0B cerrados, decisiones de Franco documentadas en VALIDATION.md

---

## Decisiones de Franco (5A-00B)

- **DB provider**: Supabase.
- **Auth**: Supabase Auth.
- **Storage**: diferido (no requerido para el primer schema).
- **Stock**: fuera del primer commit.
- **Primer schema**: Organization, Company, Branch, User, UserCompanyAccess, Contact, ContactCompanyLink, ContactGroup, ContactAddress, Surgery (mínima), AuditEvent.

---

## Regla de entrada

No iniciar este plan hasta tener como mínimo:

- AGENTS.md.
- KNOWLEDGE_INDEX.md.
- PROJECT_BRIEF.md.
- CURRENT_STATE.md.
- CANONICAL_DECISIONS.md.
- QUALITY_GATES.md.
- specs GPT-027F.0.
- Gentle-AI/Engram/SDD configurados o definidos.

---

## Objetivo

Implementar una base backend real, chica y validable, sin intentar resolver todo el ERP.

---

## Alcance núcleo recomendado

- Organization.
- Company.
- Branch.
- User.
- UserCompanyAccess.
- Contact.
- ContactCompanyLink.
- ContactGroup.
- ContactGroupMembership.
- ContactAddress.
- Surgery mínima.
- SurgeryInstrumentador si el modelo mínimo lo justifica.
- Classification solo si aporta y no complica.
- AuditEvent.

---

## Stock mínimo opcional

Solo si no infla demasiado el alcance:

- Item.
- ItemCategory.
- ItemBrand.
- Warehouse.
- WarehouseLocation.
- StockBalance.
- StockMovement.
- StockMovementLine.

Stock puede dividirse a subtarea posterior si amenaza la validación.

---

## Fuera del primer commit

- Cajas físicas completas.
- Equipos completos.
- Fórmulas completas.
- Presupuestos completos.
- Preparación completa.
- Remitos completos.
- Consumos.
- Devoluciones.
- Comparativa persistente.
- Facturación.
- Cobros.
- Pagos.
- Liquidaciones.
- Contabilidad.
- Integración fiscal.
- PDFs finales.
- Integración Gmail/Calendar.

---

## Entregables esperados

- `prisma/schema.prisma` inicial.
- `prisma/seed.ts` limpio.
- Cliente Prisma server-side.
- Servicios de dominio.
- Validadores.
- Permisos multiempresa mínimos.
- API Routes/Server Actions iniciales.
- Auditoría mínima.
- Documentación de migración desde Zustand/localStorage.
- Quality gates ejecutados.

