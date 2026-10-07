# Matriz posterior al congelamiento 01–18

Fuentes: Codex `E:/OSSUM_COR_PROJECT/docs/migration-consultar-plus/{INVENTARIO_BACKUP,ANALISIS_2026,DICCIONARIO_DBF_RECONSTRUIDO}.md`; MiniMax `../minimax-audit/{04_CIRUGIAS_2026,05_FORENSICA_STOCK,08_MIGRABILIDAD,12_CONCLUSIONES_FINALES}.md`; OpenAI scripts `profile.py`/`metrics.py` y JSON derivado. Los documentos de Codex disponibles aquí no incluyen demostración funcional de remitos/fiscalidad; no atribuirle conclusiones no encontradas.

| Tema | Codex | MiniMax | OpenAI | Acuerdo/discrepancia y prueba necesaria |
|---|---|---|---|---|
| Inventario | 510 DBF, 1.878.890 físicos; 745 deleted | 510 DBF, ~1,88M | 510 DBF, 1.878.890 físicos | Coinciden; excluir deleted en cada tabla |
| CIRUGIA | 7.514 físicos; alguna fecha 2026: 2.583 (incluye deleted) | 7.512 activos; 2.539 carga, A/B/C/D calculada sobre unión 2.577 | 7.512 activos, 2.539 carga, 1.193 CIRFEC, unión 2.577 | Distintos predicados; script `metrics.py`; no comparar como mismo universo |
| Realizada 2026 | no define real por status | 1.172 afirma efectivamente realizadas | 1.086 FIN/REA con CIRFEC 2026; 1.118 FIN/REA cargadas 2026 | Discrepancia material: ninguna es fecha de acto confirmada; requiere fecha real o evidencia de cambio estado |
| Contactos | CLIENTE 9.078 | 9.078; recomienda un link por rol | 9.078; OSSUM unique contactId+companyId | Multirol necesita `roles[]`, no N links idénticos; schema.prisma:307–335 |
| STOCK | 9.819 físicos; 3.353 con STKFEC 2026 físico | 9.754 activos; NR salida/RE retorno según mismo informe; 1.844 STKDEV=S | 9.754; NR|S 6.304, RE|E 2.659, linked RE|E 1.843 | Coinciden distribución; significado exacto y tipo documental sin prueba suficiente |
| STOCK1 | 312.095 físicos; MOVFEC 2026 148.601 físico | 312.095 físicos; muestra 30k | 311.852 activos; MOVFEC 2026 148.358 | Diferencia 243 = deleted total, pero diferencia de 243 2026 necesita chequeo fechas deleted |
| CAN/SUS/SCO devolución | sin conclusión en los tres docs Codex vistos | sostiene ninguna devolución por CAN/SUS/SCO | RE|STKDEV=S vinculados: CAN 1, SCO 7, SUS 0 | Contradicción comprobable; ver prueba 43 abajo; ausencia de SUS no refuta regla funcional |
| Facturas | CUENTAS 22.055 físicos; emisión 2026 8.147 | 99,5% cirugías 2026 con 'invoice'; equipara CUENTAS a factura | 2.526/2.539 cargadas 2026 con CUENTAS.VTACIRCOD; emisión/fiscal NO probadas | Coincide join, NO significado 'emitida'; probar estado/CAE/documento |
| Migrabilidad | no se encontró clasificación equivalente en docs leídos | 1.766 A + 759 B + 52 C = 2.577 unión | 0 aprobadas para write; 2.539 aún sin clasificación de readiness | Distinto estándar: stock+CUENTAS no valida remito/factura; recalcular con política segura |
| VisibleNumber/ledger | análisis temporal pide cierre transitivo | propone ledger pero asimila remito/cirugía | ledger separado de numeración operativa | No usar ID legacy como número OSSUM |
| Side effects | no auditados en docs consultados | no probados exhaustivamente | evidencia parcial en services/schema | PENDIENTE auditoría exhaustiva de ruta de escritura |

No decidir por mayoría: las comparaciones anteriores son predicados y evidencias, no votos.
