# SURGERY_EXPEDIENTE.md — Cirugía / Expediente

Estado: vigente  
Tipo: dominio central

---

## Principio

La cirugía es la entidad operativa central de OSSUM COR.  
El expediente es la vista integral de esa cirugía.

No son dos entidades independientes de igual jerarquía. La cirugía concentra el caso; el expediente permite navegar todo lo relacionado.

---

## Objetivo

Desde una cirugía/expediente debe poder responderse:

- ¿Qué se pidió?
- ¿Qué se presupuestó?
- ¿Qué se autorizó?
- ¿Qué se preparó?
- ¿Qué se envió?
- ¿Qué se usó?
- ¿Qué volvió?
- ¿Qué diferencia hubo?
- ¿Está documentado?
- ¿Se facturó?
- ¿Se cobró?
- ¿Quién hizo cada cosa?

---

## Datos posibles de cirugía

Una cirugía puede tener:

- empresa;
- sucursal;
- cliente / pagador;
- paciente;
- médico;
- institución;
- coordinador;
- vendedor;
- instrumentador/es;
- clasificación;
- diagnóstico o descripción quirúrgica si corresponde;
- fecha de cirugía;
- fecha probable;
- fecha de envío;
- fecha de disponibilidad de material;
- fecha de retiro;
- fecha de devolución;
- estado quirúrgico;
- subestado de preparación/material;
- presupuestos;
- preparaciones;
- remitos;
- consumos;
- devoluciones;
- facturas;
- cobros;
- documentación;
- notas;
- historial;
- trazabilidad;
- eventos logísticos.

---

## Datos mínimos recomendados para crear cirugía en V1

- Empresa.
- Cliente/Pagador.
- Paciente.
- Médico.
- Institución.
- Clasificación o descripción básica.

Médico e institución pueden ser configurables como obligatorios según empresa. Fechas operativas pueden completarse luego si el caso todavía no está programado.

---

## Estados principales CX

Estados de cirugía:

- Sin autorizar.
- Autorizada.
- Pendiente.
- En preparación.
- En tránsito.
- Realizada.
- Sin consumo.
- Finalizada.
- Suspendida.
- Cancelada.

El estado CX es la dimensión principal del caso quirúrgico.

---

## Subestados de preparación/material

Subestados operativos:

- Sin preparar.
- Congelado.
- Congelado con faltantes.
- Enviado.
- Entregado.
- Retirado.

Estado CX y preparación/material no deben mezclarse. Son dimensiones distintas.

---

## Reglas

- Crear cirugía no genera automáticamente presupuesto, remito ni factura.
- Crear presupuesto no genera automáticamente remito ni factura.
- El remito refleja lo enviado.
- El consumo refleja lo usado.
- La devolución refleja lo que volvió.
- La comparativa ayuda a decidir facturación, diferencias y reposición.
- La documentación puede habilitar o bloquear facturación según configuración.
- Toda acción crítica debe auditarse.
- Toda operación debe respetar empresa y permisos.

---

## UX

La vista de Cirugías debe ser operativa, rápida y clara:

- buscador inteligente;
- filtros rápidos visibles;
- filtros avanzados;
- columnas configurables y reordenables;
- acciones por fila;
- doble click o acción directa para abrir expediente;
- estado CX destacado;
- preparación/material como subestado separado;
- indicadores de doc/consumo/facturación neutros.

Evitar:

- preview lateral fijo que robe espacio;
- KPIs superiores que reduzcan operación;
- badges excesivos;
- filtros operativos escondidos.

