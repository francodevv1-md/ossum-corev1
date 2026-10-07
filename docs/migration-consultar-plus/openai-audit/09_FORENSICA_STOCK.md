# STOCK / STOCK1

STOCK activos 9.754; STOCK1 activos 311.852. STKCOM: NR 6.304, RE 2.659, AJ 572, TR 97, CV 69, FV 41, resto menor. STKES: S 6.561/E 3.193. STKTIP B 5.794/A 2.623/C 1.335 (2 vacíos). STKDEV S 1.844/N 4.746/vacío 3.164. Combinaciones: NR|B|S|N 2.957; RE|B|E|S 1.546; NR|B|S|vacío 1.206; NR|C|S|vacío 1.064; NR|A|S|N 973; RE|A|E|N 547. En 5.338 encabezados con STKCIRCOD no-cero, NR|S 3.479 y RE|E 1.843. STOCK1.MOVES S 162.718/E 149.134; MOVUNI S 184.778/V 127.073/C 1. Sin evidencia, MOVUNI NO es dirección. `STKDEV=S` aparece en RE pero NR también tiene STKDEV ausente o N: no generalizar devolución.

Se requiere secuencia por cirugía/empresa/STKCOD/ARTCOD/lote y prueba de movimientos pareados MOVSTKCOD/MOVMOVORD (149.472 / 149.203 no vacíos). Cualquier lectura como reserva/remito/consumo definitivo queda **no resuelta**. No reconstruir stock actual sumando movimientos sin snapshot/reconciliación de saldos.
