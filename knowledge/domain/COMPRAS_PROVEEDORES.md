# COMPRAS_PROVEEDORES.md — Compras, Proveedores y Reposición

Estado: inicial vigente

---

## Principio

Compras debe recibir señales del circuito operativo, no vivir aislado.

Las necesidades de compra pueden generarse desde:

- faltantes de caja;
- stock mínimo;
- consumo;
- reposición manual;
- cirugía futura;
- proveedor/artículo crítico;
- comparativa remitido/consumido/devuelto.

---

## Proveedores

Proveedor es un contacto con vínculo por empresa y rol proveedor.

Debe poder tener:

- datos fiscales;
- condiciones comerciales;
- plazos;
- marcas/artículos asociados;
- observaciones;
- historial de compras;
- contactos comerciales.

---

## Compras V1

Compras no es núcleo del primer backend foundation, pero el modelo debe dejar lugar para:

- solicitud de compra;
- orden de compra;
- recepción;
- remito proveedor;
- factura proveedor futura;
- entrada de stock.

---

## OCR + IA

OCR/IA de compras y stock es futuro, no bloqueante para V1.

Debe ser asistido y con validación humana. No debe crear stock crítico automáticamente sin revisión.

