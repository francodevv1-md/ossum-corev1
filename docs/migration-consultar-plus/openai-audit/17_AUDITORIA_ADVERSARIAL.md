# Refutación activa

- 2.539 es carga 2026, no fecha de cirugía (1.193), no realizada (1.086 por estado FIN/REA entre fechadas).
- Se observaron TEST 1.065 STOCK y 1.532 STOCK1; joins de código no son necesariamente cross-tenant seguros.
- 65 STOCK, 243 STOCK1, 2 CIRUGIA, 26 CUENTAS borrados: incluirlos distorsiona conteos.
- 17 STOCK→cirugía, 289 STOCK1→artículo, 36 CUENTASD→CUENTAS huérfanos: bloquear asociación automática.
- STKDEV=S coexiste con RE|E pero no demuestra que todas las entradas sean devolución física; existen RE|A|E|N 547.
- Fechas quirúrgicas 2004, 2005, 2029 y 4.406 CIRFEC vacías cuestionan definiciones temporales fáciles.
- CIRCOD no coincide por definición con visibleNumber OSSUM; numeración legal/fiscal no derivable de VTACOD.
- `profiles.json` solo cubre campos no vacíos y códigos; FPT no decodificado: la cobertura semántica todavía es parcial.

Antes de afirmar sensibilidad/especificidad, construir ground truth de devoluciones a partir de secuencias y/o proveedor; sin ground truth ambas métricas quedan **NO RESUELTAS**.
