# PREPARACION_REMITOS_CONSUMO.md — Preparación, Remitos, Consumo, Devolución y Comparativa

Estado: vigente

---

## 1. Preparación interna

Preparación interna representa el armado operativo del material antes del envío.

Puede incluir:

- artículos simples;
- cajas;
- instrumental;
- implantes;
- descartables;
- equipos;
- precintos;
- fotos;
- ficha técnica;
- observaciones internas;
- responsable de armado;
- responsable de control;
- estado de preparación.

Regla operativa:

El armado incluye embalado/etiquetado, fotos, control y ficha técnica. Luego puede dejarse nota final única:

> Caja armada. Control interno OK. Ficha técnica enviada. Lista para despachar.

---

## 2. Remito

El remito refleja lo que sale.

Puede crearse desde:

- presupuesto;
- preparación;
- manualmente;
- movimiento de stock;
- reposición o traslado.

Debe guardar:

- número visible;
- empresa/sucursal;
- cirugía vinculada si aplica;
- destinatario como contacto;
- institución/dirección/logística;
- ítems;
- cajas completas;
- artículos sueltos;
- estado;
- fecha de emisión;
- fecha de envío;
- transporte/logística;
- firma/confirmación si aplica.

Reglas:

- El remito no necesariamente coincide con presupuesto.
- El remito debe generar movimientos de stock cuando el backend real esté listo.
- Remitos con CAI deben contemplarse como circuito fiscal/formal futuro si aplica.

---

## 3. Consumo

El consumo registra lo efectivamente utilizado en la cirugía.

Regla conceptual:

Cada consumo pertenece a un remito específico. Si hay dos remitos, puede haber dos consumos separados. La cirugía debe mostrar vista consolidada.

No debe asumirse una relación rígida de un solo consumo por cirugía como regla universal del dominio.

Debe guardar:

- remito de origen;
- cirugía;
- ítems consumidos;
- cantidades usadas;
- cantidades devueltas o pendientes;
- diferencias;
- responsable de carga;
- validación;
- observaciones;
- estado.

---

## 4. Devolución

La devolución registra lo que vuelve después de una cirugía o movimiento.

Puede generarse desde:

- consumo;
- remito;
- logística;
- control de calidad.

Debe generar movimiento de stock de entrada cuando corresponda, pero nunca asumirse sin validación humana.

---

## 5. Comparativa

La comparativa analiza:

- presupuestado;
- remitido;
- consumido;
- devuelto;
- pendiente;
- diferencia económica estimada;
- diferencia operativa.

Objetivo:

- detectar diferencias antes de facturar;
- mejorar control de stock;
- evitar errores de cobro;
- documentar excepciones;
- disparar reposición/compra si corresponde.

Artículos flexibles o fuera de catálogo deben requerir revisión manual cuando el matching no sea confiable.

La lectura principal de la comparativa pertenece al circuito operativo de consumo/devolución, aunque su impacto alcance facturación y cobro.
