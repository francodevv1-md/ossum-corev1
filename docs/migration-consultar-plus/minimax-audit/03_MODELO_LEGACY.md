# 03 — Modelo Legacy (Reconstrucción Independiente)

## Método

- Cross-reference por nombre de campo (CIRCOD en CIRUGIA → STKCIRCOD en STOCK).
- Cobertura: matches / huérfanos / cardinalidad.
- Confirmación por inspección de valores en muestra.

## Tablas del núcleo quirúrgico

### CIRUGIA (7,512 registros, 43 campos, memo)

Campos clave:
- `CIRCOD` (N 7) — **PK** (7,512 únicos, 0 duplicados)
- `CIRFEC` (D 8) — fecha de la cirugía (3,106 NN = 41.4%; el resto aún no ocurrió)
- `CIRFECCAR` (D 8) — fecha de carga del registro (100% NN)
- `CIRFECLOG` (D 8) — fecha de envío/logística del material (2,868 NN = 38.2%)
- `CIRESTADO` (C 3) — estado actual (ver §04)
- `CIROBS` (M 4) — observación memo (816 NN)
- `CIRMEDCOD` (C 5) — **FK a CLIENTE.CLICOD** (5,900 NN; 100% match)
- `CIRMED` (C 60) — nombre del médico cacheado (vacío — siempre desde FK)
- `CIRHOSCOD` (C 5) — **FK a CLIENTE.CLICOD** (4,687 NN; 99.99% match)
- `CIROSCOD` (C 5) — **FK a CLIENTE.CLICOD** (7,512 NN; 100% match)
- `CIRPACCOD` (C 5) — **FK a CLIENTE.CLICOD** (7,360 NN; 99.99% match)
- `CIRPAC` (C 60) — nombre del paciente cacheado
- `CIRAUT` (C 1) — ¿autorizada? S/N (3,953 S / 3,559 N)
- `CIRAUTNRO` (C 40) — número de autorización (5,243 NN)
- `CIRFV` / `CIRLEYFV` — foto verificación / ley
- `CIRPRCOD` / `CIRPRNRO` — código/número de presupuesto
- `CIRFVCOD` / `CIRNRCOD` / `CIRCOCOD` / `CIRFCCOD` — campos varios
- `CIRRE` — campo 5-char con pattern `NNSNN` (7,347) / `NSNNN` (163) — flags combinados
- `CIRDOCRE` / `CIRDOCRE` / `CIRDOCPR` / `CIRDOCRX` / `CIRAUTFV` — flags S/N de documentos (recibo/certificado/protocolo/rx/factura-verifica)
- `VIACOD` (C 5) — vendedor/coordinador (5,652 NN; FK a VIAJANTE.VIACOD)
- `AUSRID` (C 10) — usuario que carga (todos 7,512 NN; 9 usuarios distintos, BETIANA domina 66%)
- `CIRTIP` (C 10) — tipo de cirugía (FK a CIRTIP; 2,782 NN; 57 distintos)
- `CIRHORA` (N 5) — hora (7,499 = '0' = sin hora)
- `CIRDOC` (C 20) — flags de documentos concatenados (12 chars, pattern `S/N`*12)

### CLIENTE (9,078 registros, 215 campos, memo)

Tabla universal de **todo contacto**: pacientes, médicos, hospitales, obras sociales, vendedores, droguerías, clientes finales.

Campos clave para migración:
- `CLICOD` (C 5) — **PK**
- `CLINOM` (C 60) — nombre / razón social
- `CLINOMFAN` (C 60) — nombre fantasía
- `CLIDNI` (N 8) — DNI / CUIT (no valida formato)
- `CLICUI` (C 13) — CUIT
- `CLIDOM` / `CLIDOMLAB` / `CLIDOMENV` — domicilios
- `CLITEL` / `CLITELLAB` — teléfonos
- `CLIEMA` — email
- `CLIRES` (C 40) — responsable
- `CLICPA` / `CLIPOSCOD` — códigos postales
- `CLIFECING` / `CLIFECNAC` — fechas ingreso / nacimiento
- `CLISEX` — sexo
- `CLICIR` (C 2) — **flag paciente** (no se observó uso claro en muestra)
- `CLIAFPICOD` — código AFIP
- `CLIAct` (C 1) — S/N activo
- `CLICODGES` — gestor asignado
- ~150 campos más contables/financieros (no relevantes para OSSUM core)

### CIRNOTAS (6,365 registros, 6 campos, memo)

- `CIRNOTCOD` (N 5) — PK
- `CIRCOD` (N 7) — **FK a CIRUGIA**
- `CIRNOTUSR` (C 10) — usuario que carga la nota (25 usuarios)
- `CIRNOTFEC` (D 8) — fecha de la nota (rango 2025-03-06 → 2026-09-29)
- `CIRNOTHORA` (C 8) — hora
- `CIRNOTA` (M 4) — texto memo (98.4% NN)

**Hallazgo crítico:** CIRNOTAS arranca el 2025-03-06 — solo tiene 1.5 años de historia. Las cirugías pre-2025 no tienen notas.

### CIRTIP (75 registros, 4 campos)

Catálogo de tipos de cirugía:
- `CIRTIP` (C 10) — código
- `CIRTIPDES` (C 60) — descripción
- `CIRTIPACT` (C 1) — S/N activo (72 S, 3 N)
- `CIRTIPPRE` (N 14) — precio (45 distintos)

### STOCK (9,754 registros, 36 campos)

- `STKCOD` (N 8) — **PK** (movimiento header)
- `STKCOM` (C 2) — tipo de comprobante (NR/RE/AJ/TR/CV/FV/TV/CM/PE/LV/FC) — ver §05
- `STKTIP` (C 1) — tipo (A/B/C) — ver §05
- `STKES` (C 1) — E/S entrada/salida
- `STKDEV` (C 1) — S/N es devolución
- `STKSUC` / `STKSUCCAR` — sucursal (5 distintos)
- `STKNRO` (N 8) — número del comprobante
- `STKFEC` (D 8) — fecha del movimiento
- `DPSCODENT` / `DPSCODSAL` (C 5) — depósito entrada/salida
- `CLICOD` (C 5) — **FK a CLIENTE** (9,110 NN; 200+ distintos)
- `STKVTACOD` (N 8) — **FK a CUENTAS.VTACOD** (8,666 NN)
- `STKCIRCOD` (N 7) — **FK a CIRUGIA.CIRCOD** (5,822 NN; 200+ distintos)
- `STKORDPRO` (N 8) — orden de producción
- `STKTRACOD` (C 5) — transportista
- `STKOBS` / `STKCONCE` — observación/concepto

### STOCK1 (312,095 registros, 55 campos, memo)

Detalle del movimiento de stock.

- `STKCOD` (N 8) — **FK a STOCK.STKCOD**
- `MOVORD` (N 8) — número de línea
- `ARTCOD` (C 13) — **FK a ARTICULO.ARTCOD**
- `MOVDEP` (C 5) — depósito
- `MOVSER` (C 13) — serie/lote
- `MOVCAN` (N 12,2) — cantidad
- `MOVFEC` (D 8) — fecha
- `MOVES` (C 1) — E/S
- `MOVUNI` (C 3) — unidad (S=stock, V=venta, C=?)
- `MOVCON` (N 11,4) — confirmado? (1.0 = sí)
- `MOVCER` (C 1) — cerrado S/N
- `MOVSTKCOD` / `MOVMOVORD` — referencia reversa (link a movimiento opuesto)
- `MOVVTACOD` (N 8) — **FK a CUENTAS.VTACOD** (1,331 NN)
- `MOVPEDCOD` / `MOVPEDORD` — pedido
- `MOVNROSER` (C 20) — número de serie
- `MOVGTING` / `MOVPM` — atributos del artículo (mirror de ARTATRI)
- `MOVNOCSIN` / `MOVNOCCAU` / `MOVNOCPRI` — campos memo de no-conformidades

### CUENTAS (22,055 registros, 90 campos)

Comprobantes de venta (facturación).

- `VTACOD` (N 8) — **PK**
- `CPTECOD` (C 2) — tipo comprobante fiscal
- `VTACOM` (C 2) — clase comprobante
- `VTATIP` (C 1) — tipo (A=Factura A, B=Factura B, C=Factura C)
- `VTASUC` / `VTASUCCAR` (N 4) — sucursal (1/4/5/10)
- `VTANRO` (N 8) — número
- `CLICOD` (C 5) — **FK a CLIENTE**
- `VTAFECEMI` / `VTAFECCON` — fecha emisión / contable
- `VTAFECENT` — fecha entrega
- `VTATOTAL` (N 12) — total
- `VTAMONID` / `VTACOTMON` — moneda / cotización
- `VTAAUTIMP` — autorización impresión (AFIP)
- `VTACAI` / `VTACAIFEC` — CAE AFIP
- `VTACPTEV` (C 1) — tipo comprobante venta (V/C/...)
- `VTAIMP` (C 1) — impresa S/N
- `VTAELE` (C 1) — electrónica S/N
- `VTAESTTRA` / `VTAESTCOM` — estado transferencia/comprobante
- `VTACIRCOD` (N 7) — **FK a CIRUGIA.CIRCOD** (FK directa, redundancy con STOCK)
- `VTADOMCOD` / `VTADOMENV` — domicilio de entrega
- `VTATRACOD` (C 5) — transportista
- `REPNRO` (N 8) — número de reparto (link a REPARTO)

### CUENTASD (56,021 registros, 62 campos)

Líneas de detalle de factura:
- `VTACOD` — FK a CUENTAS
- `DETORD` — número de línea
- `ARTCOD` (C 13) — FK a ARTICULO
- `DETSER` (C 30) — serie/lote
- `DETCAN` (N 14) — cantidad
- `DETPREVEN` / `DETPRECOS` — precios venta/costo
- `DETIMPIVA` / `DETIVA` — IVA
- `DETDTO1/2/3` — descuentos
- `DETDEP` — depósito
- `DETSTKCOD` / `DETSTKORD` — **FK a STOCK1.STKCOD/MOVORD**
- `DETCTACOD` — cuenta contable
- `DETFEC` — fecha

### CLIATRI (92,701 registros, 6 campos, memo)

Atributos extensibles por cliente (EAV).
- `CLICOD` (C 5) — FK a CLIENTE
- `ATRDES` (C 50) — nombre del atributo (AFIP_GRAN_EMPRESA, FCE_MONTO_MINIMO, GLN, SUCURSAL_PROPUESTA, LOGISTICA, ALTERNATIVOS, etc.)
- `DATCLICAR` (C 60) — valor string
- `DATCLINUM` (N 12) — valor numérico
- `DATCLIFEC` — valor fecha
- `DATCLIMEM` (M 4) — valor memo

### ARTATRI (24,190 registros, 5 campos)

Atributos extensibles por artículo:
- `ARTCOD` (C 13) — FK a ARTICULO
- `ATRDES` (C 50) — nombre atributo (GTING, PM)
- `DATARTCAR` (C 200) — valor string
- `DATARTNUM` — valor numérico
- `DATARTFEC` — valor fecha

### ATRIENT (190,270 registros, 8 campos)

Catálogo de valores de atributos. (Schema no leído en detalle; sirve como dimensión de catálogo de atributos.)

### FORMULA1 / FORMULA2 / FORMHIS (BOM de artículos)

- `FORMULA1` (94,735 rec): lista de materiales (BOM) por artículo padre (`FORFABCOD`)
- `FORMULA2` (8,728 rec): tablas auxiliares de fórmulas
- `FORMHIS` (164,971 rec): histórico de fórmulas

### HISCAM / HISCOS / HISREG / HISCON / HISPRE / HISVAL (Auditoría)

- `HISCAM` (56,679 rec): cambios de campo por tabla (`HISCAMTAB` ∈ CIRUGIA/CUENTAS/ARTICULO/CLIENTE/VARIA/ADMUSR)
- `HISCOS` (9,264 rec): histórico de costos por artículo
- `HISREG` (60,405 rec): cambios a VTACOD/STKCOD/ASINRO (trigger-based)
- `HISCON` (13,808 rec): rangos numéricos usados por día
- `HISPRE` (6,831 rec): histórico de precios
- `HISVAL` (883 rec): histórico de valores (impuestos/IVA)
- `VARHIS` (7,578 rec): histórico de variantes

### USER / AUTH

- `ADMUSR` (27 rec): usuarios del sistema
- `ADMGRP` (8 rec): grupos
- `ADMGRP1` (39 rec): pertenencia grupo-usuario
- `ADMMAP` (8,379 rec): permission map (sistema / pgm / evento / grupo)
- `ADMEVN` — eventos del sistema
- `PREFUSR` (8,707 rec): preferencias por usuario

## Diagrama relacional lógico

```
                          ┌──────────────┐
                          │  CLIENTE     │  (universal)
                          │  (9,078)     │
                          └──────┬───────┘
           ┌──────────────────────┼──────────────────────┐
           │                      │                      │
     pac/med/hos/os         CLIATRI (92,701)        VIAJANTE (7)
           │                  atributos                vendedores
           ▼                                              │
    ┌─────────────┐                                     │
    │  CIRUGIA    │◄─── CIRNOTAS (6,365)                │
    │  (7,512)    │◄─── CIRTIP (75)                     │
    │  43 campos  │◄─── VIAJANTE                        │
    └──────┬──────┘                                     │
           │ CIRCOD                                      │
           ▼                                             │
    ┌─────────────┐                                     │
    │   STOCK     │                                     │
    │  (9,754)    │──► STKVTACOD ──┐                    │
    │  36 campos  │──► STKCIRCOD   │                    │
    └──────┬──────┘──► CLICOD ─────┤                    │
           │                        │                   │
           ▼                        ▼                   │
    ┌─────────────┐          ┌─────────────┐            │
    │   STOCK1    │          │  CUENTAS    │            │
    │ (312,095)   │          │ (22,055)    │            │
    │  55 campos  │          │  90 campos  │            │
    │  artcod     │          │  VTACIRCOD  │            │
    │  movstkcod ─┘          └──────┬──────┘            │
    │ (self-ref reversa)           │                   │
    │                              ▼                   │
    │                       ┌─────────────┐            │
    │                       │  CUENTASD   │            │
    │                       │ (56,021)    │            │
    │                       │  artcod     │            │
    │                       └──────┬──────┘            │
    │                              │                   │
    ▼                              ▼                   ▼
    ┌─────────────┐          ┌─────────────┐  ┌──────────────┐
    │  ARTICULO   │◄─────────│  ARTATRI    │  │  TRANSPOR    │
    │ (5,902)     │          │ (24,190)    │  │   (68)       │
    │  115 campos │          │  atributos  │  │              │
    └─────────────┘          └─────────────┘  └──────────────┘
```

## Cardinalidades clave verificadas

| Relación | Padre | Hijo | Cobertura | Confianza |
|---|---|---|---:|:---:|
| CIRUGIA → CLIENTE (patient) | CIRPACCOD | CLICOD | 7,359/7,360 = 99.99% | CONFIRMADA |
| CIRUGIA → CLIENTE (doctor) | CIRMEDCOD | CLICOD | 5,900/5,900 = 100% | CONFIRMADA |
| CIRUGIA → CLIENTE (hospital) | CIRHOSCOD | CLICOD | 4,686/4,687 = 99.99% | CONFIRMADA |
| CIRUGIA → CLIENTE (payer) | CIROSCOD | CLICOD | 7,512/7,512 = 100% | CONFIRMADA |
| CIRUGIA → CIRTIP | CIRTIP | 2,782/2,782 = 100% (37% de cirugías) | ALTA |
| CIRUGIA → VIAJANTE | VIACOD | 5,652/5,652 (75%); falta catálogo 'LET' en algunas | MEDIA |
| CIRUGIA → STOCK | CIRCOD → STKCIRCOD | 5,338/7,512 = 71.0% (real FK; 5,822 NN si se cuentan ceros) | CONFIRMADA |
| CIRUGIA → CUENTAS | CIRCOD → VTACIRCOD | 7,413 matches en 2,577 cirugías 2026 = 99.5% | CONFIRMADA |
| STOCK → STOCK1 | STKCOD | 1:N | CONFIRMADA |
| STOCK → CUENTAS | STKVTACOD → VTACOD | 5,869/9,754 = 60.2% (real FK; 8,666 NN si se cuentan ceros) | CONFIRMADA |
| CUENTAS → CUENTASD | VTACOD | 1:N (avg 3.0, max 22) | CONFIRMADA |
| CLIENTE → CLIATRI | CLICOD | 1:N atributos EAV | CONFIRMADA |
| ARTICULO → ARTATRI | ARTCOD | 1:N atributos EAV | CONFIRMADA |
| CUENTAS → CLIENTE | CLICOD | 100% match | CONFIRMADA |
| STOCK → CLIENTE | CLICOD | 9,110/9,754 = 93.4% | CONFIRMADA |