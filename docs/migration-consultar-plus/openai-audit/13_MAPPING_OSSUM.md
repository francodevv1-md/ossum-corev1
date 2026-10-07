# Mapa provisional legacy → OSSUM

| Fuente | Destino canónico propuesto | Clasificación | Evidencia / límite |
|---|---|---|---|
| CLIENTE.CLICOD | ledger LegacyEntityRef + Contact/ContactCompanyLink | STAGING / MATCH | Código no es Contact.id; multirol/tenant pendiente |
| ARTICULO.ARTCOD | ledger + Article.sku solo tras resolver colisión | STAGING / MATCH | Article organización global; 289 detalles sin artículo |
| CIRUGIA.CIRCOD | ledger + Surgery.id nuevo | STAGING | No usar como Surgery.visibleNumber |
| CIRFECCAR | fecha de alta histórica en staging; `Surgery.createdAt` SOLO con writer histórico autorizado | TRANSFORMACIÓN | Date sin hora, timezone sin demostrar; no poblar createdAt por service normal |
| CIRFEC | Surgery.scheduledDate | TRANSFORMACIÓN | Date civil, no implica performedDate ni surgeryDate real |
| CIRFECLOG | Surgery.materialShippingDate | TRANSFORMACIÓN | `@db.Date` de OSSUM; fechas anómalas bloquear/revisar |
| CIRESTADO | cxStatus propuesto vía tabla de equivalencias revisada | STAGING | REA/FIN/SCO/CAN/SUS no equivalentes automáticos a prepStatus |
| STOCK/STOCK1 | evidencia fuente histórica | STAGING | No crear Remito/StockMovement hasta probar secuencias |
| CUENTAS/CUENTASD | evidencia documento histórico | STAGING | No Invoice emitida sin discriminador |

El destino de CIRFECCAR es inequívoco como fecha de alta legacy, pero `createdAt` es DateTime; conservar fecha civil y precisión original, no inventar hora UTC. `CIRFEC` es fecha prevista del acto, no prueba realización: `scheduledDate`. `CIRFECLOG` mapea a `materialShippingDate`, no a `issuedAt` de Remito. Estos destinos son **decisiones propuestas**, no evidencia del legacy.
