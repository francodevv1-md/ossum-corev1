# PRESUPUESTOS.md — Presupuestos / Cotizaciones

Estado: vigente

---

## Principio

El presupuesto puede existir independiente o vinculado a una cirugía.

En el circuito quirúrgico, una cirugía puede tener un presupuesto principal activo y versiones anteriores.

Presupuesto no equivale a remito, consumo ni factura.

---

## Datos principales

Un presupuesto debe guardar:

- número visible;
- empresa/sucursal;
- cliente/pagador;
- cirugía vinculada si existe;
- ítems;
- cantidades;
- precios;
- descuentos;
- IVA por ítem;
- totales discriminados;
- condición de pago;
- lista de precios;
- leyenda/aclaraciones;
- estado;
- versión;
- usuario/responsable;
- fecha;
- notas.

---

## Versionado

Debe poder existir:

- presupuesto borrador;
- presupuesto emitido/enviado;
- presupuesto revisado;
- presupuesto aprobado;
- presupuesto rechazado;
- presupuesto vencido/anulado;
- presupuesto principal activo.

Las versiones anteriores deben conservarse para auditoría y comparación.

---

## Aclaración fija para presupuestos estimativos Districorr

Texto canónico:

> El presente presupuesto es estimativo y se emite para orientación inicial del paciente. Queda sujeto a confirmación de disponibilidad de implantes, definición final del acto quirúrgico, institución, fecha de cirugía, logística y validación operativa correspondiente.

---

## Precio más firme / respetable

Cuando el objetivo sea entregar un precio más firme y respetable, el sistema debe permitir registrar:

- especificaciones suficientes del pedido;
- datos de intermediario/coordinador;
- contacto de área cotizaciones;
- materiales incluidos/excluidos;
- condiciones de disponibilidad;
- aclaraciones operativas;
- validez;
- supuestos del acto quirúrgico.

---

## Reglas

- Crear presupuesto no genera remito ni factura automáticamente.
- Una cirugía puede existir sin presupuesto inicial.
- Un presupuesto puede existir sin cirugía si es cotización general.
- Vigencia y lista de precios deben declararse en cada presupuesto operativo.
- La facturación puede basarse en presupuesto, consumo, manual o mixto, pero debe declararlo.
- Cambios de precio o ítems relevantes deben auditarse.
