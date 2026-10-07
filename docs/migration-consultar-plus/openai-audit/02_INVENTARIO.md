# Inventario

`profile.py`: 1.090 archivos; 510 DBF; 1.878.890 filas declaradas (incluye borradas); archivos FPT/CDX y auxiliares enumerados con ruta/tamaño/mtime en `inventory.json`. El header de las tablas medidas indica versión 48, marcador codepage 3; no equivale a validación completa de encoding. Ningún error de lectura reportado, pero los DBF vacíos no tienen campos volcados por esta versión del profiler. Tablas núcleo activas: CIRUGIA 7.514 físicas / 7.512 no borradas; CLIENTE 9.078; ARTICULO 5.902; STOCK 9.819 / 9.754; STOCK1 312.095 / 311.852; CUENTAS 22.055 / 22.029; CUENTASD 56.021 / 56.019. STOCKH 407.766 declaradas: histórica, no sumar a STOCK1 como transacciones nuevas. `EMPCOD` en STOCK: PRINC 8.689, TEST 1.065; filtrar por empresa antes de toda métrica migrable.

**No resuelto**: clasificación exhaustiva productiva/auxiliar de las 510 tablas, hash integral del backup, interpretación FPT/CDX e integridad de índices; no inferir temporalidad por mtime del backup.
