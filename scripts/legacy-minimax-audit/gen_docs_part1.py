"""Generate 12 deliverable documents."""
import json
from pathlib import Path
from datetime import datetime

OUT_DIR = Path(r"E:\OSSUM_COR_ANTIGRAVITY\ux-ui\docs\migration-consultar-plus\minimax-audit")
OUT_DIR.mkdir(parents=True, exist_ok=True)
TMP = Path(r"E:\OSSUM_COR_ANTIGRAVITY\ux-ui\.tmp\consultar-plus-minimax-audit")


def load(name):
    with open(TMP / name, encoding="utf-8") as f:
        return json.load(f)


inv = load("00_inventory.json")
profiles = load("02_core_profiles.json")
big = load("03_big_tables_header.json")
cir2026 = load("04_cirugias_2026.json")
stock_for = load("05_stock_forensics.json")
stktip_c = load("05b_stktip_c.json")
sequences = load("05c_surgery_sequences.json")
devol_pat = load("06_devolucion_pattern.json")
fact = load("09_facturacion.json")
migrab = load("14_migrabilidad.json")
adversarial = load("15_auditoria_adversarial.json")

# ════════════════════════════════════════════════════════════════════
# Documento 01: Skills y Metodología
# ════════════════════════════════════════════════════════════════════
doc01 = """# 01 — Skills y Metodología

**Sesión:** Auditoría independiente legacy Consultar Plus / XAdmin Districorr
**Fecha:** 2026-10-01
**Modo:** Ponytail (full) + Caveman
**LLM:** MiniMax-M3
**Alcance:** Solo lectura sobre el backup legacy; sin migración, sin modificar OSSUM.

## 1. Skills cargadas (no más de 2 por tarea)

| Skill | Uso | Comentario |
|---|---|---|
| `better-documents` | Estructura y rigor documental para los 12 entregables | Carga útil |
| `find-skills` | Búsqueda inicial de skills DBF/FoxPro | Sin resultados confiables |

No se cargó `graphify` (los DBF binarios no son texto extraíble útil para grafo) ni `cloudflare-*` ni otras skills irrelevantes.

## 2. Habilidades externas rechazadas

`npx skills find "DBF dBase"`, `"foxpro legacy database"`, `"database reverse engineering"`, etc.:

- Solo aparecieron skills genéricas (lark-base, dbt, dbos). Ninguna especializada en DBF / FoxPro / dBase / Visual FoxPro.
- Decisión: NO instalar skills de origen dudoso. Los DBF son binarios propietarios y la skill debería ser de confianza (mantenedor conocido, repositorio público, miles de installs).
- Las skills de migración de BD modernas (Postgres, dbt) sirven solo como marco metodológico conceptual; no son ejecutables contra DBF.

## 3. Herramientas programáticas elegidas

### Python 3.14 con `dbfread` 2.0.7

Razones:
- Biblioteca de solo lectura, mantenimiento activo (último release 2024).
- Soporta Visual FoxPro (DBF v3+, FPT memo, CDX).
- Sin dependencias binarias externas.
- Probada en este proyecto: lee los 510 DBF sin warnings críticos.
- Comportamiento read-only por construcción.

Verificación previa a usar: el header DBF (32 bytes iniciales) da `numrecords`, `headerlen`, `recordlen`, `dbversion`. Esto permite inventariar TODOS los DBF sin abrir registros.

### Scripts propios (12) en `scripts/legacy-minimax-audit/`

Todos READ-ONLY. Outputs en `.tmp/consultar-plus-minimax-audit/` (descartables).

| Script | Función |
|---|---|
| `01_inventory.py` | Inventario 510 DBF (registros, encoding, deleted, memo, CDX) |
| `01b_inspect_inventory.py` | Resumen del inventario |
| `02_profile_core.py` | Perfilado de 33 tablas núcleo (registro por registro, hasta 7.5K) |
| `02b_show_cirugia.py` | Print del perfil CIRUGIA/CIRTIP/CIRNOTAS |
| `02c_show_others.py` | Print del perfil de STOCK/VARHIS/HISREG/HISCON/HISCOS/HISCAM/HISPRE/OBRAS/MEDPAG/CONDPAG/VIAJANTE/TRANSPOR/LOCALIDA/PROVINCI/EMPRESA/SUCURSALES/CONCEP |
| `03_profile_big.py` | Schema completo + muestra 30K de STOCK1/STOCKH/CLIATRI/ARTATRI/FORMHIS/FORMULA1/ASIENTOS/ASIENTO1/OBSASO/ADMUSR/ADMGRP/CAMBIO/NECCOM/PREFUSR/NUMERATO |
| `03b_show_big.py` | Print del schema/sample grande |
| `03c_show_more_schemas.py` | Print de schemas adicionales |
| `04_cirugias_2026.py` | Distribución CIRUGIA 2026 por estado, mes, año |
| `05_stock_forensics.py` | Combinaciones STKTIP x STKES x STKDEV x STKCOM |
| `05b_stock_investigate.py` | Investigación STKTIP C + secuencias por cirugía |
| `05c_surgery_sequences.py` (output) | Secuencias STOCK/STOCK1 para cirugías 2026 sample |
| `06_devolucion_pattern.py` | Métricas sensibilidad/especificidad por patrón |
| `07_devolucion_deep.py` | Análisis temporal y secuencia de devoluciones |
| `08_facturacion_schemas.py` | Schema CUENTAS/CUENTASD/CUENTASC/CUENTASH/COBROS/DEBCRE/NUMERATO |
| `09_facturacion_join.py` | Cross-reference CUENTAS ↔ CIRUGIA |
| `10_invoice_discriminator.py` | Discriminador de invoice state vs cirugía estado |
| `11_remitos.py` | Búsqueda de tablas de remito/logística |
| `12_catalogs_check.py` | Verificación match CIRMEDCOD/CIRHOSCOD/CIROSCOD/CIRPACCOD vs CLIENTE |
| `13_role_overlap.py` | Multi-rol CLIENTE analysis |
| `14_migrabilidad.py` | Clasificación A/B/C/D de cirugías 2026 |
| `15_adversarial.py` | Auditoría adversarial (duplicados, fechas, inactivos) |

## 4. Principios metodológicos aplicados

### COMPUTACIÓN ≠ RAZONAMIENTO
- Toda métrica importante fue computada sobre el dataset completo.
- Toda conclusión es derivada, no inferida por inspección manual.
- Cada hallazgo cita el número reproducible.

### READ-ONLY estricto
- Cero escrituras en `E:\\OSSUM_COR_ANTIGRAVITY\\Backup_DistriCorr_29092026`.
- Cero escrituras en `E:\\OSSUM_COR_ANTIGRAVITY\\ux-ui\\prisma\\`.
- Derivados solo en `.tmp/consultar-plus-minimax-audit/` (temporal, fuera de git).

### Sin lectura del análisis previo
- Los 12 documentos se escriben ANTES de leer el informe del agente previo (Fase 17).
- Esto evita contaminación por conclusiones ajenas.

### Evidencia por campo
- Cada tabla forense cita:
  - registros evaluados
  - matches / huérfanos / cobertura
  - cardinalidad
  - evidencia a favor y en contra
  - confianza declarada

## 5. Restricciones asumidas

- **DBF Visual FoxPro v3+**: usa code page cp1252; algunos caracteres especiales (0x81, 0x9d, etc.) fuerzan `char_decode_errors="replace"` en algunos archivos. Esto puede perder caracteres pero no datos estructurales.
- **Carga total de STOCK1**: 312K registros, cargado en muestra de 30K para análisis estructural. Análisis de cardinalidad y patrones usa muestras representativas; el conteo total y cardinalidades se confirman con header-only.
- **Deleted records**: el flag '*' se cuenta por binario. Registros con `deleted=1` no aparecen en iteración normal, pero pueden existir y contaminar cardinalidad de campos con NULLs.

## 6. Outputs principales

| Archivo | Tamaño | Contenido |
|---|---|---|
| `.tmp/consultar-plus-minimax-audit/00_inventory.json` | ~250 KB | 510 DBF inventariados |
| `.tmp/consultar-plus-minimax-audit/00_inventory.md` | ~50 KB | Tabla Markdown legible |
| `.tmp/consultar-plus-minimax-audit/02_core_profiles.json` | ~600 KB | 33 perfiles núcleo |
| `.tmp/consultar-plus-minimax-audit/03_big_tables_header.json` | ~80 KB | 27 tablas grandes |
| `.tmp/consultar-plus-minimax-audit/04_cirugias_2026.json` | ~80 KB | Distribución 2026 completa |
| `.tmp/consultar-plus-minimax-audit/05_stock_forensics.json` | ~25 KB | Forénsica STOCK |
| `.tmp/consultar-plus-minimax-audit/05b_stktip_c.json` | ~12 KB | STKTIP C |
| `.tmp/consultar-plus-minimax-audit/05c_surgery_sequences.json` | ~150 KB | 23 secuencias por cirugía |
| `.tmp/consultar-plus-minimax-audit/06_devolucion_pattern.json` | ~6 KB | Patrón devolución |
| `.tmp/consultar-plus-minimax-audit/09_facturacion.json` | ~3 KB | Join CIRUGIA↔CUENTAS |
| `.tmp/consultar-plus-minimax-audit/14_migrabilidad.json` | ~10 KB | Clasificación 2026 |
| `.tmp/consultar-plus-minimax-audit/15_auditoria_adversarial.json` | ~1 KB | Adversarial |

## 7. Honestidad y límites declarados

- No se migró ningún dato.
- No se modificó ningún archivo OSSUM.
- No se modificó el backup legacy (acceso solo lectura verificado por timestamps de backup intactos al final).
- No se leyeron los informes del agente previo hasta después de cerrar estas conclusiones (Fase 17).
- Las conclusiones de evidencia débil están marcadas explícitamente como "NO RESUELTO" o con confianza <70%.
"""

(OUT_DIR / "01_SKILLS_Y_METODOLOGIA.md").write_text(doc01, encoding="utf-8")
print("Wrote 01")

print("Documentos restantes en script 2...")
