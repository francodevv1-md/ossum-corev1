# 04 — Cirugías 2026 (Análisis Independiente)

## Resumen ejecutivo

**Total cirugías cargadas con CIRFECCAR o CIRFEC en 2026:** 2539

## Distribución por estado (carga 2026)

| Estado | Total 2026 | % | Interpretación XAdmin |
|-------|----------:|---:|---|
| SAU | 1,199 | 47.2% | Sin Autorizar |
| FIN | 1,068 | 42.1% | Finalizada (realizada + facturada) |
| CAN | 132 | 5.2% | Cancelada |
| REA | 50 | 2.0% | Realizada (con consumo) |
| TRA | 30 | 1.2% | En Tránsito |
| AUT | 25 | 1.0% | Autorizada |
| PEN | 18 | 0.7% | Pendiente |
| SUS | 10 | 0.4% | Suspendida |
| SCO | 7 | 0.3% | Sin Consumo |

## Distribución por mes (FECHA DE CIRUGÍA — cirfec)

| Mes | Total | FIN | REA | CAN | SUS | SCO | TRA | AUT | PEN | SAU |
|-----|------:|----:|----:|----:|----:|----:|----:|----:|----:|----:|
| 2026-01 | 94 | 87 | 0 | 6 | 0 | 1 | 0 | 0 | 0 | 0 |
| 2026-02 | 106 | 99 | 0 | 6 | 0 | 0 | 0 | 0 | 0 | 1 |
| 2026-03 | 137 | 128 | 0 | 9 | 0 | 0 | 0 | 0 | 0 | 0 |
| 2026-04 | 131 | 127 | 0 | 3 | 0 | 0 | 1 | 0 | 0 | 0 |
| 2026-05 | 123 | 112 | 0 | 8 | 0 | 0 | 1 | 1 | 0 | 1 |
| 2026-06 | 148 | 141 | 1 | 5 | 0 | 1 | 0 | 0 | 0 | 0 |
| 2026-07 | 148 | 138 | 2 | 5 | 0 | 3 | 0 | 0 | 0 | 0 |
| 2026-08 | 143 | 125 | 13 | 3 | 1 | 1 | 0 | 0 | 0 | 0 |
| 2026-09 | 142 | 84 | 29 | 4 | 3 | 0 | 19 | 1 | 0 | 2 |
| 2026-10 | 21 | 0 | 0 | 0 | 0 | 0 | 2 | 0 | 18 | 1 |

## Distribución por mes (FECHA DE CARGA — cirfeccar)

| Mes | Total |
|-----|------:|
| 2026-01 | 252 |
| 2026-02 | 237 |
| 2026-03 | 283 |
| 2026-04 | 274 |
| 2026-05 | 298 |
| 2026-06 | 308 |
| 2026-07 | 319 |
| 2026-08 | 294 |
| 2026-09 | 274 |

## Distribución por año (todas las cirugías)

| Año carga | Total | FIN | REA | CAN | SUS | SCO | TRA | AUT | PEN | SAU |
|-----|------:|----:|----:|----:|----:|----:|----:|----:|----:|----:|
| 2024 | 1729 | 732 | 0 | 81 | 60 | 1 | 2 | 3 | 2 | 848 |
| 2025 | 3243 | 1495 | 1 | 171 | 42 | 6 | 0 | 32 | 0 | 1496 |
| 2026 | 2539 | 1068 | 50 | 132 | 10 | 7 | 30 | 25 | 18 | 1199 |

## Hallazgos

- **REA es muy rara en este dataset (50 vs 1,068 FIN).** Esto NO concuerda con la semántica XAdmin de "REA = con consumo cargado". Posibles razones:
  - El sistema XAdmin marca REA brevemente y luego transiciona a FIN cuando se factura.
  - En 2024-2025 había más REA (1 en 2025) — los flujos se consolidan rápido a FIN.
- **SAU 1,199 (47%)**: casi mitad de cirugías 2026 no están autorizadas. Esto es esperable: muchas se cargan antes de obtener la autorización de la obra social.
- **CAN 132 (5.2%)**: nivel normal de cancelaciones.
- **SCO 7 (0.3%)**: 'Sin Consumo' es rarísimo — quizás indica registros incompletos.
- **Oct 2026 'fantasma': 21 cirugías** con cirfec en octubre 2026 — son programadas a futuro.

## Dependencias pre-2026 necesarias para preservar integridad

Para migrar las 2,577 cirugías 2026 con integridad referencial, también necesitamos importar:

- **Pacientes** (7,360 CIRPACCOD distintos): todos los CLIENTE con `clicir` paciente activo.
- **Médicos** (434 CIRMEDCOD distintos): todos los CLIENTE referidos como doctor en cualquier cirugía (no solo 2026).
- **Hospitales** (135 CIRHOSCOD distintos): CLIENTE referidos como hospital en cualquier cirugía.
- **Obras sociales** (173 CIROSCOD distintos): CLIENTE referidos como payer.
- **Vendedores/coordinadores** (6 VIAJANTE: ADMIN, NELS, EZE, CRIS, FRA, SUCUR, LET).
- **Tipos de cirugía** (57 CIRTIP distintos en uso).
- **Stock/Remitos/Devoluciones/Facturas**: 5,338 STOCK con STKCIRCOD real (5,822 NN); 7,413 facturas CUENTAS con VTACIRCOD.
- **Artículos**: ~2,220 artículos distintos usados en CUENTASD 2026 (de 5,902 totales).
- **Notas**: 6,365 CIRNOTAS, todas con CIRCOD FK; 1,500-2,500 son de 2026.