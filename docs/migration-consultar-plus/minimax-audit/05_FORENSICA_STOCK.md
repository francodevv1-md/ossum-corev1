# 05 — Forénsica Profunda STOCK/STOCK1

## Pregunta de investigación

¿Qué significa cada combinación de STKTIP × STKES × STKDEV × STKCOM × MOVES?

## Hallazgo principal

**El término 'DEVOLUCIÓN' en este sistema NO significa 'devolución por cancelación'.**
El campo `STKCONCE` con valor `DEVOLUCIÓN - CONSUMO` aparece en el **retorno rutinario de material no usado después de una cirugía finalizada**, NO en la cancelación.

## Diccionario inferido

### Campos categóricos

| Campo | Valores | Significado inferido |
|---|---|---|
| STKTIP | A | Alta (inicial / reserva) |
| STKTIP | B | Baja (entrega / salida) |
| STKTIP | C | Carga (reposición / ingreso) |
| STKES | E | Entrada al stock (retorno) |
| STKES | S | Salida del stock |
| STKDEV | S | Es devolución (reversión) |
| STKDEV | N | No es devolución |
| STKCOM | NR | Comprobante Normal (Reserva inicial pre-cirugía) |
| STKCOM | RE | Remito (retorno post-cirugía = DEVOLUCIÓN-CONSUMO) |
| STKCOM | AJ | Ajuste manual |
| STKCOM | TR | Tránsito entre depósitos |
| STKCOM | CV | Comprobante de venta (auto-factura) |
| STKCOM | FV | Factura de venta |
| STKCOM | TV | Transferencia |
| STKCOM | LV | Lista de venta |
| STKCOM | PE | Pedido especial |
| STKCOM | FC | ? (raro, 1 muestra) |
| STKCOM | CM | ? (raro, 2 muestras) |
| MOVES | E | Movimiento entrada |
| MOVES | S | Movimiento salida |
| MOVUNI | S | Unidad stock (cantidad física) |
| MOVUNI | V | Unidad venta (cantidad facturable) |
| MOVUNI | C | ? (1 muestra, ignorado) |

### Distribución STOCK completo (9,754 registros)

**STKTIP:**
- A (Alta): 2,623 (26.9%)
- B (Baja): 5,794 (59.4%)
- C (Carga): 1,335 (13.7%)
- Vacío: 2 (0.02%)

**STKES:**
- E (Entrada): 3,193 (32.7%)
- S (Salida): 6,561 (67.3%)

**STKDEV:**
- S (Devolución): 1,844 (18.9%)
- N: 4,746 (48.7%)
- Vacío: 3,164 (32.4%) — registros sin clasificar (probablemente AJ/TR/C)

**STKCOM:**
- NR: 6,304 (64.6%)
- RE: 2,659 (27.3%)
- AJ: 572 (5.9%)
- TR: 97 (1.0%)
- CV: 69 (0.7%)
- FV: 41 (0.4%)
- Otros (TV/LV/FC/CM/PE): 12 (0.1%)

### Combinaciones triple (STKTIP × STKES × STKDEV)

| Triple | Registros | Interpretación |
|---|---:|---|
| B×S×N | 2,958 | Salida normal (pre-cirugía o venta) |
| B×E×S | 1,546 | **DEVOLUCIÓN - CONSUMO** (retorno post-cirugía) |
| B×S× | 1,226 | Salida sin clasificar (probable AJ o TR) |
| C×S× | 1,070 | Salida por Carga/Reposición (sin dev) |
| A×S×N | 973 | Salida desde Alta (entrega de material reservado) |
| A×E×N | 547 |  |
| A×E× | 472 |  |
| A×S× | 333 |  |
| A×E×S | 298 | **DEVOLUCIÓN - CONSUMO** sobre Alta |
| C×E×N | 264 | Entrada por Carga/Reposición |
| B×E× | 61 |  |
| B×E×N | 3 |  |
| ×E× | 1 |  |
| C×E× | 1 |  |
| ×S×N | 1 |  |

### Combinaciones con comprobante (surgery records)

De los 5,338 STOCK records con STKCIRCOD:

| Combo | Registros | Interpretación |
|---|---:|---|
| B×S×N×NR | 2,686 | **SALIDA inicial pre-cirugía** (entrega material) |
| B×E×S×RE | 1,546 | **DEVOLUCIÓN-CONSUMO post-cirugía** |
| A×S×N×NR | 759 | Salida desde Alta |
| A×E×S×RE | 297 | DEVOLUCIÓN-CONSUMO sobre Alta |
| B×S××NR | 27 |  |
| A×S××AJ | 14 |  |
| A×S××NR | 6 |  |
| B×S×N×PE | 1 |  |
| A×E××AJ | 1 |  |
| ×S×N×NR | 1 |  |

### STKCONCE patterns

**Para B×E:**
- `DEVOLUCIÓN - CONSUMO` (literal, 1,843+ matches)
- Confirma: estos son retornos de material post-cirugía.

**Para A×E:**
- `DEVOLUCIÓN - CONSUMO`
- Misma naturaleza.

**Para B×S:**
- 'ORTOPEDIA' (cliente), 'Dr : SANTIANGO PIASSENTINI', 'SE ENTREGA A DROGUERIA CENTRAL', etc.
- Confirma: estas son salidas a clientes/pacientes.

### STKTIP C en detalle

1,335 registros STKTIP='C'. Distribución:
- STKES: E=265, S=1,070
- STKCOM: NR=1,064, RE=264, AJ=6, CV=1
- STKDEV: N=264, vacío=1,071

**Observaciones OBS más comunes:**
- `ANULADO ((1075) PROVEEDOR PARA REALIZAR MODIFICACIONES)` (4)
- `REMITO : 88235` (2)
- `MOVIMIENTO OPUESTO DE RE-C-4-16` (2) — auto-reversión
- `TOR-4.5-7.0-CANU-TIT-002` (2)
- `CARGA DE REPO` (2)
- `INGRESO A SISTEMA` (1)
- `CARGA DE IMPLANTES` (1)
- `INGRESO DIA SABADO 27/07` (1)

**Conclusión sobre STKTIP C:** Probablemente:
- C+S+NR (1,070): salida por carga inicial (materia prima / compra)
- C+E+N+RE (264): entrada por carga con devolución posterior (anulación)
- C+E+NR (1): carga pura
- C+S+AJ (6): ajuste de salida

### STOCK1 sample (30,000 registros)

**MOVES:**
- E: 16,824 (56.1%)
- S: 13,176 (43.9%)

**MOVUNI:**
- S (stock unit): 19,153 (63.8%)
- V (venta unit): 10,846 (36.1%)
- C: 1

**MOVES × MOVUNI (clave para entender consumo):**
- E×S: 16,124 (entrada en unidad stock — devolución física)
- S×V: 10,147 (salida en unidad venta — entrega facturada)
- S×S: 3,029 (salida en unidad stock — entrega física sin facturar)
- E×V: 699 (entrada en unidad venta — extraño; ver anomalías)

**MOVES × MOVCER:**
- E×(vacío): 16,187 — entradas sin clasificar
- S×(vacío): 4,329 — salidas sin clasificar
- S×S: 8,257 — salidas cerradas
- S×N: 590 — salidas abiertas
- E×N: 473 — entradas abiertas
- E×S: 164 — entradas cerradas

**MOVSTKCOD (reversa):**
- 6,645 con STKCOD de referencia (reversiones explícitas)
- 23,355 sin STKCOD (movimientos independientes)

**MOVCAN negativos:**
- Rango observado: -1 a 81,600
- El `-1` aparece (probable flag de anulación)

## Conclusiones forénsicas

1. **El modelo STOCK/STOCK1 codifica un sistema de remitos + devoluciones con doble entrada:**
   - `STKCOM='NR' + STKTIP='B' + STKES='S' + STKDEV='N'`: salida inicial (entrega al cliente/paciente) → genera STOCK1 con MOVES='S', MOVUNI='V' (facturable).
   - `STKCOM='RE' + STKTIP='B' + STKES='E' + STKDEV='S'`: devolución-consumo (retorno de no usado) → STOCK1 con MOVES='E', MOVUNI='S' (devuelto a stock físico).
   - El STOCK1 hijo del NR referencia `stkref` al STOCK1 hijo del RE (vía MOVSTKCOD/MOVMOVORD) para trazabilidad por artículo.

2. **OSSUM debe separar los conceptos:**
   - `Remito` ← STOCK (NR) + STOCK1 (MOVES=S, MOVUNI=V)
   - `Consumo` ← diferencia implícita: cantidad enviada - cantidad devuelta (por artículo)
   - `Devolucion` ← STOCK (RE) + STOCK1 (MOVES=E, MOVUNI=S)
   - `StockMovement` ← cada STOCK1 produce 2 StockMovement: RECEIPT_IN (entrada) o RETURN_IN (devolución), con FK a remito/consumo/devolucion según corresponda.

3. **NO hay remito separado del modelo STOCK.** El 'remito' ES un STOCK con STKCOM='RE'. La numeración de remitos no es global sino por-STKCOM.