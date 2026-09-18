# STOCK_CAJAS_TRAZABILIDAD.md — Stock, Cajas y Trazabilidad

Estado: vigente

---

## Principio

Stock y trazabilidad son transversales al circuito quirúrgico.

No son “después” en concepto, aunque su profundidad pueda implementarse por etapas.

---

## Modelo conceptual

- Artículo: qué es.
- Stock: cuánto hay y dónde.
- Movimiento: por qué cambió.
- Depósito: dónde está.
- Caja modelo/base: composición ideal.
- Caja física: caja real con código propio.
- Caja enviada: composición real asociada a cirugía/remito.

---

## Movimientos relevantes

- Entrada por remito proveedor.
- Salida por remito quirúrgico.
- Devolución.
- Consumo.
- Ajuste.
- Inventario.
- Transferencia.
- Material en tránsito.
- Anulación como movimiento contrario.

---

## Stock mínimo V1

V1 puede empezar con:

- artículos;
- depósitos;
- movimientos;
- saldos;
- remito como salida;
- devolución como entrada;
- consumo como baja/uso.

Cajas, lotes, series, vencimientos y trazabilidad fina pueden ir por etapas.

---

## Cajas

### Caja modelo

Composición ideal o estándar.

### Caja física

Caja real con código propio, estado, ubicación y composición controlada.

### Caja enviada

Composición real enviada para una cirugía/remito.

---

## Reglas

- No actualizar stock solo por saldo manual si hay operación trazable.
- Toda salida/entrada relevante debe tener movimiento.
- Devolución requiere validación.
- Consumo validado puede disparar baja o ajuste según configuración.
- Cajas físicas no deben implementarse completas en primer backend foundation si inflan alcance.

