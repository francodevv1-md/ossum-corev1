# FACTURACION_COBROS.md — Facturación, Cobros e Imputaciones

Estado: vigente

---

## 1. Facturación

Facturación puede originarse desde una cirugía o desde facturación general.

La factura creada desde cirugía debe vincularse automáticamente a esa cirugía. Desde facturación general puede existir sin cirugía o vincularse a una o varias cirugías.

---

## 2. Base de factura

La factura debe declarar la base usada:

- presupuesto;
- consumo;
- manual;
- mixto.

Regla clave:

OSSUM COR mantiene la verdad operativa. TusFacturasAPP/ARCA actúa como motor fiscal externo para comprobantes fiscales.

---

## 3. Documentación y habilitación

La facturación puede depender de documentación mínima:

- orden médica;
- autorización;
- ficha técnica;
- remito firmado;
- consumo firmado;
- documentación de implantes;
- fotos de caja;
- comprobantes;
- documentos por institución/obra social.

V1 puede iniciar con checklist documental. Luego debe evolucionar a adjuntos reales, storage y validaciones por tipo de cliente/institución.

---

## 4. Cobros

Cobro es entidad independiente.

Puede:

- imputarse a una factura;
- imputarse a varias facturas;
- quedar sin imputar temporalmente;
- imputarse parcialmente;
- tener múltiples medios de pago.

La imputación es el vínculo formal entre cobro y factura.

---

## 5. Cuenta corriente

Cuenta corriente no debe quedar escondida solo dentro de contactos.

Debe existir vista financiera propia conectada al contacto/cliente/pagador, con:

- facturas;
- cobros;
- saldos;
- pagos parciales;
- imputaciones;
- notas de crédito/débito futuras.

---

## 6. Reglas

- Factura no debe emitirse automáticamente sin base y validación.
- Cobro no equivale a factura.
- Un cobro puede quedar pendiente de imputación.
- Toda emisión fiscal debe pasar por backend.
- Credenciales fiscales nunca en frontend.
- Cambios de factura/cobro deben auditarse.
