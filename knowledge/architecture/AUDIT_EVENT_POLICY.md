# AUDIT_EVENT_POLICY.md — Política de auditoría

Estado: inicial vigente

---

## Principio

Toda acción crítica debe dejar trazabilidad.

V1 audita modificaciones y eventos críticos. V2 puede auditar consultas sensibles puntuales.

---

## AuditEvent mínimo

Cada evento relevante debe guardar:

- company_id;
- user_id;
- entity_type;
- entity_id;
- fecha/hora;
- acción;
- detalle;
- valor anterior si aplica;
- valor nuevo si aplica;
- módulo origen;
- metadata contextual.

---

## Eventos a auditar

- creación/modificación de cirugía;
- cambio de estado CX;
- asignación de médico/institución/paciente;
- emisión/modificación/anulación de presupuesto;
- preparación lista/despacho;
- remito emitido/anulado;
- consumo cargado/validado;
- devolución registrada;
- cambio de stock;
- factura emitida/anulada;
- cobro registrado/imputado/anulado;
- cambio de permisos;
- cambios de configuración crítica.

---

## Historial de cirugía

El historial de cirugía debe poder mostrar eventos de todos los módulos vinculados:

- presupuesto;
- preparación;
- remito;
- consumo;
- devolución;
- documentación;
- facturación;
- cobros;
- stock;
- logística.

Usuarios externos deben ver historial filtrado.

