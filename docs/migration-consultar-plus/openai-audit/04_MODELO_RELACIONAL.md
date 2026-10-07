# Grafo relacional observado

Cada relación se mide en `metrics.json` por cantidad no-cero, matched, orphan y distintos; no son FK declaradas. CIRUGIA paciente→CLIENTE 7.359/7.360, médico 5.900/5.900, institución 4.686/4.687, pagador (CIROSCOD) 7.512/7.512, CIRCLICOD 2.542/2.542. STOCK.STKCIRCOD→CIRUGIA.CIRCOD 5.321/5.338 (17 huérfanos); STOCK1.STKCOD→STOCK.STKCOD 311.848/311.852 (4); STOCK1.ARTCOD→ARTICULO.ARTCOD 311.563/311.852 (289); CIRUGIA.CIRFVCOD→CUENTAS.VTACOD 2.429/2.430 (1); CUENTASD.VTACOD→CUENTAS.VTACOD 55.983/56.019 (36).

Clave duplicada: CLIENTE.CLICOD 1 y ARTICULO.ARTCOD 1 por conteo bruto; comprobar valores especiales/blancos antes de considerarlos duplicados reales. Contraevidencia: filas huérfanas y empresas TEST; joins por ID solo no prueban identidad entre compañías. No se estableció FK compuesta con EMPCOD ni cadena inequívoca devolución→envío.
