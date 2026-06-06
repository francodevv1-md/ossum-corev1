# FISCAL_BOUNDARY_TUSFACTURAS.md — Límite con TusFacturasAPP / ARCA

Estado: vigente

---

## Principio

OSSUM COR mantiene la verdad operativa.

TusFacturasAPP actúa como motor fiscal/comercial externo para comprobantes.

---

## OSSUM COR gobierna

OSSUM COR debe gobernar:

- cirugía/expediente;
- contactos;
- presupuesto operativo;
- preparación;
- remitos operativos;
- consumo;
- devolución;
- comparativa;
- documentación;
- stock;
- cajas;
- trazabilidad;
- logística;
- facturación operativa;
- cobros e imputaciones;
- auditoría.

---

## TusFacturasAPP puede aportar

- Factura electrónica.
- CAE.
- QR fiscal.
- PDF fiscal.
- Notas fiscales.
- Eventuales remitos formales con CAI si el circuito lo requiere.

---

## Lo que TusFacturasAPP no reemplaza

- Stock quirúrgico.
- Cajas.
- Lotes.
- Series.
- Preparación.
- Consumo.
- Devolución.
- Trazabilidad interna.
- Logística.
- Expediente.

---

## Regla técnica

La integración fiscal debe ser backend-only.

Nunca exponer en frontend:

- token;
- API key;
- credenciales fiscales;
- CUIT/password;
- secretos de TusFacturasAPP;
- secretos ARCA.

---

## Remitos con CAI

OSSUM COR debe contemplar la necesidad futura de remitos formales/preimpresos o numeración autorizada según circuito fiscal argentino.

La integración con TusFacturasAPP puede ayudar, pero no debe bloquear el diseño operativo del remito.

