# 02 — Inventario Independiente del Backup Legacy

**Origen:** `E:\OSSUM_COR_ANTIGRAVITY\Backup_DistriCorr_29092026`
**Método:** Header-only (32 bytes por DBF) + iteración completa para CIRCOD/STOCK1 sample.
**Encoding por defecto:** `cp1252` (Windows Latin-1).
**Total archivos DBF:** 510
**Total registros (suma):** 1,878,890
**Con memo (.FPT):** 65
**Con índice (.CDX):** 507
**Con deleted records:** 10

## Top 30 tablas por volumen

| # | Tabla | Registros | Deleted | Bytes | Campos | Memo | CDX |
|---|-------|----------:|--------:|------:|-------:|:----:|:---:|
| 1 | `STOCKH.DBF` | 407,766 | 0 | 86,039,211 | 9 | N | Y |
| 2 | `STOCK1.DBF` | 312,095 | 0 | 263,722,332 | 55 | Y | Y |
| 3 | `ATRIENT.DBF` | 190,270 | 0 | 64,121,543 | 8 | N | Y |
| 4 | `FORMHIS.DBF` | 164,971 | 0 | 15,837,833 | 10 | N | Y |
| 5 | `cambio.dbf` | 99,402 | 150 | 5,865,207 | 6 | Y | Y |
| 6 | `FORMULA1.DBF` | 94,735 | 0 | 29,557,905 | 9 | N | Y |
| 7 | `CLIATRI.DBF` | 92,701 | 0 | 12,978,629 | 6 | Y | Y |
| 8 | `HISREG.DBF` | 60,412 | 0 | 24,467,637 | 15 | N | Y |
| 9 | `HisCam.DBF` | 56,679 | 0 | 15,984,223 | 14 | N | Y |
| 10 | `CUENTASD.DBF` | 56,021 | 1 | 83,193,466 | 62 | N | Y |
| 11 | `CUENTASH.DBF` | 27,991 | 0 | 5,878,695 | 9 | N | Y |
| 12 | `ARTATRI.DBF` | 24,190 | 0 | 6,870,417 | 5 | N | Y |
| 13 | `CUENTAS.DBF` | 22,055 | 0 | 25,895,747 | 90 | N | Y |
| 14 | `ASIENTO1.DBF` | 20,654 | 0 | 1,694,245 | 10 | N | Y |
| 15 | `PRECIOAR.DBF` | 18,624 | 0 | 1,360,169 | 10 | N | Y |
| 16 | `Precioarbak.dbf` | 18,298 | 77 | 1,318,073 | 10 | N | N |
| 17 | `OBSASO.DBF` | 18,074 | 4 | 6,001,057 | 6 | N | Y |
| 18 | `FORMU.DBF` | 14,348 | 0 | 272,973 | 2 | N | Y |
| 19 | `HISCON.DBF` | 13,808 | 0 | 828,937 | 5 | N | Y |
| 20 | `NECCOM.DBF` | 11,120 | 0 | 3,170,137 | 20 | N | Y |
| 21 | `STOCK.DBF` | 9,819 | 0 | 7,434,432 | 36 | N | Y |
| 22 | `HISCOS.DBF` | 9,264 | 0 | 1,047,385 | 8 | N | Y |
| 23 | `CLIENTE.DBF` | 9,078 | 0 | 27,695,077 | 215 | Y | Y |
| 24 | `ASIENTOS.DBF` | 8,812 | 0 | 4,204,261 | 20 | N | Y |
| 25 | `FORMULA2.DBF` | 8,774 | 46 | 430,351 | 4 | N | Y |
| 26 | `PREFUSR.DBF` | 8,707 | 0 | 3,161,194 | 8 | Y | Y |
| 27 | `ADMMAP.DBF` | 8,379 | 0 | 712,736 | 7 | N | Y |
| 28 | `cuentase.dbf` | 7,593 | 0 | 2,278,421 | 7 | N | Y |
| 29 | `VARHIS.DBF` | 7,578 | 0 | 3,115,271 | 13 | Y | Y |
| 30 | `CIRUGIA.DBF` | 7,514 | 0 | 2,781,853 | 43 | Y | Y |

## Tablas quirúrgicas núcleo

| Tabla | Registros | Campos | Encoding | Memo |
|-------|----------:|-------:|----------|:---:|
| `CIRUGIA.DBF` | 7,514 | 43 | cp1252 | Y |
| `CIRNOTAS.DBF` | 6,365 | 6 | cp1252 | Y |
| `CIRTIP.DBF` | 75 | 4 | cp1252 | N |
| `CLIENTE.DBF` | 9,078 | 215 | cp1252 | Y |
| `ARTICULO.DBF` | 5,902 | 115 | cp1252 | Y |
| `STOCK.DBF` | 9,819 | 36 | cp1252 | N |
| `STOCK1.DBF` | 312,095 | 55 | cp1252 | Y |
| `STOCKH.DBF` | 407,766 | 9 | cp1252 | N |
| `CUENTAS.DBF` | 22,055 | 90 | cp1252 | N |
| `CUENTASD.DBF` | 56,021 | 62 | cp1252 | N |
| `CUENTASH.DBF` | 27,991 | 9 | cp1252 | N |
| `HisCam.DBF` | 56,679 | 14 | cp1252 | N |
| `HISCOS.DBF` | 9,264 | 8 | cp1252 | N |
| `HISREG.DBF` | 60,412 | 15 | cp1252 | N |
| `HISCON.DBF` | 13,808 | 5 | cp1252 | N |
| `HISPRE.DBF` | 6,831 | 10 | cp1252 | N |
| `VARHIS.DBF` | 7,578 | 13 | cp1252 | Y |
| `FORMHIS.DBF` | 164,971 | 10 | cp1252 | N |
| `FORMULA1.DBF` | 94,735 | 9 | cp1252 | N |
| `CLIATRI.DBF` | 92,701 | 6 | cp1252 | Y |
| `ARTATRI.DBF` | 24,190 | 5 | cp1252 | N |
| `ATRIENT.DBF` | 190,270 | 8 | cp1252 | N |

## Catálogos pequeños (referencia)

| Tabla | Registros | Descripción inferida |
|-------|----------:|---------------------|
| `VIAJANTE.DBF` | 7 | - |
| `OBRAS.DBF` | 11 | - |
| `MEDPAG.DBF` | 26 | - |
| `CONDPAG.DBF` | 8 | - |
| `CENCOS.DBF` | 5 | - |
| `CONCEPTO.DBF` | 6 | - |
| `CONCEP.DBF` | 87 | - |
| `sucursales.dbf` | 2 | - |
| `EMPRESA.DBF` | 2 | - |
| `LOCALIDA.DBF` | 1,236 | - |
| `PROVINCI.DBF` | 25 | - |
| `TRANSPOR.DBF` | 68 | - |
| `BANCOS.DBF` | 188 | - |
| `ADMGRP.DBF` | 8 | - |
| `ADMGRP1.DBF` | 39 | - |
| `admusr.DBF` | 27 | - |
| `CIRTIP.DBF` | 75 | - |
| `NUMERATO.DBF` | 104 | - |
| `OBSASO.DBF` | 18,074 | - |

## Observaciones

- **Deleted records** detectados (mayoritarios): `cambio.dbf` (150), `Precioarbak.dbf` (77), `formolis.dbf` (4 — archivo huérfano), `FORMULA2.DBF` (46). En general pocos deleted flags.
- **Encoding cp1252**: las tildes/ñ no se pierden, pero caracteres de imprenta rara (0x81, 0x9d) fuerzan `errors='replace'` en algunos archivos. La estructura no se ve afectada.
- **Disco**: el backup mide ~700 MB total en DBF/FPT/CDX.

## Diferencias vs expectativas

- Esperaba ~200-300 tablas en un ERP típico. Aquí hay 510 — sistema multi-módulo (compras, ventas, contabilidad, stock, RRHH, AFIP, etc.).
- El módulo quirúrgico es solo una parte menor: 7,514 cirugías vs 22,055 ventas y 312,095 movimientos de stock.
- Hay una tabla `formolis.dbf` huérfana (sin CDX, en raíz, modificada 2025-04-24) — probablemente backup temporal.

## Datos derivados

`510 archivos` → `1,878,890 registros totales`