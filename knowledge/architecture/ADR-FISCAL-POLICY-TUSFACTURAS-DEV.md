# ADR — Política fiscal e integración TusFacturas DEV

## Metadata

- **Status:** ACCEPTED — aprobado por Franco el 2026-09-23.
- **Date:** 2026-09-23
- **Owner:** Architecture / Fiscal integration
- **Scope:** política y límites para una futura integración fiscal DEV con TusFacturasAPP.
- **Supersedes:** None.
- **Superseded by:** None.
- **Approver:** Franco.
- **Approval basis:** aprobación explícita de Franco con límite de primera etapa DEV: emisión y reconciliación fiscal únicamente; presupuestos, cobros, cuenta corriente y demás capacidades comerciales del proveedor quedan fuera de alcance.
- **Authorization effect:** esta aceptación autoriza preparar el Change Pack documental `FISCAL-TUSFACTURAS-DEV-001`. No autoriza schema, migraciones, secretos, llamadas al proveedor, webhooks, cambios de permisos, producción ni implementación.

## Decision summary

OSSUM COR conserva la autoridad de la operación comercial; TusFacturasAPP se integra solamente como motor fiscal backend-only. Una factura comercial existente no se reemplaza ni se convierte en una cuenta corriente externa. La eventual emisión fiscal agrega evidencia fiscal inmutable vinculada a la factura operacional, sin duplicar Presupuesto, Consumo, Cobro, Saldo ni Cirugía.

La primera implementación debe ser una integración acotada de emisión y consulta/reconciliación fiscal. No se construirá un framework genérico de proveedores ni se adoptarán módulos comerciales de TusFacturasAPP.

## Context

OSSUM ya tiene `Invoice`, `InvoiceItem`, `Payment` y `PaymentImputation` multiempresa, con borradores desde Presupuesto/Consumo, bloqueo de fuentes, emisión operacional, anulación operacional, pagos parciales, saldo e imputaciones. Esas capacidades responden al circuito canónico:

```txt
Cirugía → Presupuesto → Consumo → Facturación → Cobro
```

La auditoría comparativa identificó que ese flujo es suficiente como verdad comercial-operativa, pero no como comprobante fiscal ARCA: faltan datos fiscales inmutables, alícuotas explícitas, política de redondeo fiscal, estados externos, numeración/Punto de Venta fiscal y evidencia de autorización.

TusFacturasAPP aporta emisión fiscal, CAE, QR, PDF fiscal, numeración por Punto de Venta y notas fiscales. Sus solicitudes pueden quedar pendientes; la recuperación puede consultarse por `external_reference`; sus webhooks pueden reintentarse. La documentación indica además que `external_reference` no impone unicidad por sí misma.

## Decision drivers

1. Conservar una sola autoridad para el flujo quirúrgico y comercial.
2. No reinterpretar una factura operacional o un cobro como un comprobante fiscal.
3. Tener evidencia inmutable, consultable y auditable de cada comprobante enviado y autorizado.
4. Evitar doble emisión ante timeout, refresh, retry o webhook duplicado.
5. No introducir lógica fiscal, secretos ni llamadas de proveedor en frontend.
6. Mantener la primera entrega DEV pequeña y reversible, sin cambiar el núcleo de Cirugías.

## Decisions

### F-01 — Límites de autoridad

**Accepted direction:**

- OSSUM gobierna Cirugía, Contactos, Presupuesto, Consumo, factura comercial, pagos, imputaciones, saldos, cuenta corriente y auditoría operacional.
- TusFacturasAPP gobierna el envío/validación fiscal, CAE, QR, PDF fiscal, Punto de Venta y numeración fiscal, y la emisión de NC/ND fiscales.
- El frontend nunca conoce credenciales, tokens, secretos fiscales ni decide estados fiscales.
- La primera etapa DEV usa TusFacturasAPP exclusivamente para emisión y reconciliación fiscal. Presupuestos, cobros, cuenta corriente y cualquier otra capacidad comercial del proveedor quedan fuera de alcance.
- No se sincronizarán cobros, saldos, stock, trazabilidad, remitos operativos ni cuenta corriente hacia TusFacturasAPP como autoridad alternativa. Una capacidad comercial futura sólo podrá evaluarse si reduce desarrollo sin quitar a OSSUM la autoridad sobre la Cirugía y el negocio.

### F-02 — Factura operacional y evidencia fiscal separadas

**Accepted direction:** una futura factura fiscal se representa como evidencia vinculada a la `Invoice` existente; no se sobrecarga `Invoice.state`, `visibleNumber` ni `metadata` como registro fiscal definitivo.

La futura evidencia debe conservar como mínimo:

- compañía, factura operacional, emisor y Punto de Venta utilizados;
- tipo de comprobante, número fiscal, fecha y moneda;
- CAE, vencimiento CAE, QR y referencia al PDF/documento fiscal;
- request fiscal normalizado y response del proveedor, sin secretos;
- snapshot fiscal de emisor, receptor, ítems, alícuotas, descuentos, importes y totales;
- `external_reference` interno estable, correlación y timestamps de creación/autorización;
- vínculos al comprobante fiscal original cuando corresponda una NC/ND.

El snapshot es inmutable: cambios posteriores en Contactos, precios, condición IVA o datos de compañía no alteran un comprobante ya enviado o autorizado.

### F-03 — Datos fiscales, IVA y redondeos

**Accepted direction:** una emisión fiscal sólo será elegible si OSSUM puede construir un snapshot fiscal completo y validar sus totales antes de enviar al proveedor.

- Cada ítem fiscal debe conservar descripción, cantidad, precio neto o bruto según el tipo fiscal elegido, descuento, alícuota/categoría IVA e importes resultantes.
- El receptor debe tener snapshot de tipo y número de documento, condición frente al IVA, nombre/razón social y domicilio cuando el comprobante lo exija.
- La empresa emisora debe aportar snapshot de CUIT, razón social, condición IVA y Punto de Venta configurado del lado servidor.
- Se aplicará una única política fiscal de precisión y redondeo por comprobante; los cálculos por línea y los totales enviados se preservarán tal como fueron emitidos.
- La alícuota aplicable, tratamiento de exento/no gravado, precios con/sin IVA y regla exacta de redondeo quedan como parámetros fiscales explícitos a definir con asesoramiento contable antes de habilitar emisión DEV.

La respuesta autorizada del proveedor es la evidencia de autorización, no una orden para modificar retroactivamente los totales comerciales. Una diferencia invalida el intento y exige corrección explícita antes de una nueva emisión.

#### Política técnica transitoria DEV_ONLY

Para destrabar exclusivamente la integración técnica DEV, Franco aprobó el 2026-09-23 una política de prueba que no representa ni decide la política fiscal productiva de Districorr:

- emisor ficticio/de prueba configurado en TusFacturas API DEV;
- Punto de Venta DEV creado en TusFacturasAPP;
- un único tipo de factura de prueba soportado por la cuenta DEV;
- receptor ficticio con los datos completos requeridos por la API;
- un único caso explícito y configurable de IVA;
- precisión y formato de redondeo exactamente requeridos por la API, encapsulados como política DEV;
- vencimiento de prueba/configurable cuando el tipo de comprobante lo requiera.

Toda configuración, snapshot, intento y evidencia derivados de esta política se identifica como `DEV_ONLY`. No puede reutilizarse, promocionarse ni convertirse automáticamente en configuración productiva. La política productiva de IVA, tipos de comprobante, vencimientos, emisor y PDV queda pendiente de validación contable y requiere una decisión posterior antes de producción.

### F-04 — Tipo de comprobante y Punto de Venta

**Accepted direction:** el tipo de comprobante fiscal no se infiere de `Invoice.type` actual ni de la pantalla. Se deriva server-side de una política fiscal aprobada que considere emisor, receptor, condición IVA, operación y moneda.

- La primera entrega DEV se limita a un único tipo de factura de prueba soportado por la cuenta DEV; A/B/C, M, exportación y MiPyme no se habilitan por defecto ni se clasifican como política productiva.
- El Punto de Venta se selecciona por una configuración fiscal de empresa/emisor del lado servidor. No se usa `visibleNumber` interno como número fiscal.
- TusFacturasAPP/ARCA asigna y valida la numeración fiscal. OSSUM conserva su numeración interna para navegación y trazabilidad operacional.

### F-05 — Estados fiscales y criterio de emisión

**Accepted direction:** los estados fiscales viven en la evidencia fiscal vinculada y no reemplazan los estados comerciales actuales.

El modelo futuro debe distinguir, como mínimo:

| Estado fiscal | Significado |
| --- | --- |
| `READY` | Cumple precondiciones fiscales y espera acción explícita. |
| `SUBMITTED` / `PENDING` | Fue enviada; el resultado aún no es definitivo. |
| `AUTHORIZED` | Hay CAE y evidencia fiscal autorizada. |
| `REJECTED` | El proveedor/ARCA devolvió un rechazo corregible o terminal. |
| `UNKNOWN` | Hubo timeout o respuesta perdida; requiere reconciliación antes de reenviar. |
| `CREDITED` / `DEBITED` | Existe una NC/ND fiscal vinculada; no altera la evidencia original. |

`NOT_REQUESTED` no es un estado persistido: una factura operacional sin `FiscalDocument` ni `FiscalIssuanceAttempt` es ausencia de evidencia fiscal y la UI podrá derivar esa condición cuando sea necesaria. Mientras la historia Prisma no esté estabilizada, `SIMULATED` es exclusivamente un estado de presentación derivado: sólo para evidencia persistida `DEV_ONLY` en `UNKNOWN` cuya respuesta de emisión tenga `error=N`, `external_reference` exacta, `comprobante_nro` y `comprobante_pdf_url` no vacíos, pero CAE en blanco o ausente por falta de conexión ARCA. Nunca autoriza producción ni se trata como autorización fiscal. Un rechazo definitivo recibido del proveedor se persiste como `REJECTED`; timeout, transporte, HTTP, respuesta perdida o evidencia de autorización incompleta —incluyendo número/PDF incompletos o referencia no coincidente— permanecen `UNKNOWN` y requieren reconciliación antes de cualquier reenvío. `AUTHORIZED` continúa exigiendo CAE no vacío y referencia exacta, aun en DEV. `SIMULATED` no habilita emisión ni reintento automático y sólo podrá persistirse tras estabilizar la historia Prisma, con una migración aprobada por separado.

La emisión será una acción explícita y server-side sobre una `Invoice` operacional ya creada. Antes de enviarla se exige: compañía y actor válidos, fuente comercial bloqueada, factura no anulada operacionalmente, receptor/emisor/Punto de Venta completos, ítems y totales fiscales válidos, tipo fiscal permitido, política fiscal marcada `DEV_ONLY` en la primera etapa y ausencia de otro intento activo/autorizado para la misma identidad fiscal.

Cobrar parcial o totalmente no es precondición para emitir una factura fiscal, salvo una futura regla comercial/fiscal aprobada. La emisión fiscal tampoco marca automáticamente una factura como cobrada.

### F-06 — Anulación, Nota de Crédito y Nota de Débito

**Accepted direction:** `Invoice.Anulada` conserva únicamente su sentido operacional antes de una autorización fiscal. Una factura fiscal autorizada no se elimina, reescribe ni se “anula” cambiando ese estado.

- La reversión fiscal se realiza con una NC/ND como comprobante fiscal nuevo, vinculado de forma inmutable al comprobante original.
- La NC/ND debe conservar los datos requeridos del comprobante asociado: tipo, Punto de Venta, número, fecha, emisor y moneda, además del motivo y el alcance parcial/total.
- La política que determina si una corrección comercial crea una nueva `Invoice`, un ajuste operacional o una NC/ND requiere una decisión posterior aprobada; nunca se infiere sólo desde `Anulada`.
- Las limitaciones del proveedor/ARCA —por ejemplo fechas, moneda y comprobantes asociados— se validan antes del envío y se exponen como error accionable.

La primera entrega fiscal deberá impedir atómicamente la transición operacional a `Anulada` y la restauración del `Consumo` asociado cuando exista evidencia fiscal `SUBMITTED`, `PENDING`, `UNKNOWN` o `AUTHORIZED`. Esa protección corrige la semántica actual de `updateInvoiceState`, que permite anular facturas operacionales emitidas y restaurar su Consumo.

### F-07 — Idempotencia, errores y reintentos

**Accepted direction:** OSSUM es dueño de la identidad idempotente y de la recuperación de resultados inciertos.

- Cada intención fiscal recibe un `external_reference` interno, estable y único por compañía, factura, tipo fiscal y versión de snapshot.
- Antes de cualquier reintento por timeout, desconexión o respuesta perdida, OSSUM consulta/reconcilia por esa referencia. Nunca reenvía a ciegas.
- Un error de validación/precondición no crea emisión autorizada. Un rechazo del proveedor queda registrado como evidencia y permite una nueva intención sólo después de corregir los datos y generar un snapshot nuevo.
- Un error transitorio o resultado desconocido conserva el intento y su correlación; se recupera por consulta o webhook antes de reintentar.
- Las respuestas, errores y payloads se guardan redactando secretos y datos innecesarios; se generan eventos de auditoría para acciones e impactos críticos.

No se adoptará una cola, broker ni framework de reintentos en la primera entrega. Un flujo server-side acotado con reconciliación explícita es suficiente mientras el proveedor sea único.

### F-08 — Webhook y reconciliación

**Accepted direction:** el webhook es un canal de actualización y recuperación, no la única fuente de verdad ni el disparador de reglas comerciales.

- Cada evento recibido se autentica con el mecanismo que el proveedor permita y se deduplica por identidad de evento/correlación antes de mutar evidencia fiscal.
- Un webhook duplicado, tardío o fuera de orden no puede emitir otro comprobante, modificar la factura comercial, repetir un cobro ni sobrescribir una autorización posterior.
- Si un webhook no llega, OSSUM conserva la posibilidad de consultar el proveedor por `external_reference` para reconciliar `PENDING` o `UNKNOWN`.
- Los fallos de recepción o persistencia se registran y quedan reintentables; nunca se reporta éxito fiscal si no existe evidencia autorizada persistida.

## Consequences

### Positive

- Reutiliza factura, pago, saldo, auditoría y vínculo a Cirugía ya existentes.
- Evita doble autoridad comercial y los riesgos de sincronizar cuenta corriente con un SaaS fiscal.
- Hace visibles y recuperables los resultados inciertos de una integración externa.
- Permite auditoría histórica aunque cambien contactos o reglas comerciales posteriores.

### Tradeoffs

- Requiere nuevos datos fiscales y evidencia persistida antes de emitir.
- Introduce una distinción explícita entre emisión operacional y autorización fiscal.
- NC/ND deja de ser un simple cambio de estado y exige un flujo documental vinculado.
- La configuración fiscal inicial necesita decisión de negocio y revisión contable.

## Explicit non-goals

Este ADR no define ni autoriza:

- schema, migraciones, endpoints, UI, servicios, secretos, webhooks o llamadas reales a TusFacturasAPP;
- emisión fiscal productiva, ARCA/AFIP, CAE real, facturación masiva o migración histórica;
- Auth, permisos, RLS, roles ni multiempresa más allá de los límites de autoridad declarados;
- sincronización de pagos, cuenta corriente, stock, remitos operativos, compras o contactos hacia el proveedor;
- una abstracción genérica para múltiples proveedores fiscales;
- reglas contables, legales o impositivas no validadas por el asesor fiscal de la empresa.

## Recommended next Change Pack

**Nombre recomendado:** `FISCAL-TUSFACTURAS-DEV-001`.

**Objetivo:** implementar la primera emisión fiscal DEV acotada, vinculada a `Invoice`, sin alterar el flujo comercial existente.

**Alcance propuesto:**

1. contrato fiscal versionado y validación server-side de elegibilidad;
2. persistencia de snapshot, documento/estado fiscal e intentos idempotentes;
3. módulo backend-only TusFacturas para emisión, consulta por referencia y manejo de errores;
4. webhook autenticado/idempotente y reconciliación manual de estados inciertos;
5. guardia atómica que bloquee anulación operacional/restauración de Consumo mientras exista evidencia fiscal activa o autorizada;
6. UI mínima de solicitud, estado y evidencia fiscal, sin exponer secretos;
7. pruebas de cálculo, precondiciones, duplicados, timeout/reconciliación, guardia de anulación y webhooks duplicados.

**Gates previos obligatorios:** aprobación de este ADR, Task Brief T3, política contable de IVA/redondeo/tipos, datos del emisor y PDV DEV, secreto DEV gestionado fuera del repositorio, y confirmación de base de datos DEV descartable antes de cualquier migración.

**Exclusiones iniciales:** presupuestos, cobros, cuenta corriente y demás capacidades comerciales de TusFacturasAPP; NC/ND y su política comercial; producción, datos reales, emisión masiva, sincronización de cobros/saldos, remitos CAI, exportación, MiPyme, cambio de Auth y refactor del núcleo de Cirugías. NC/ND requiere un Change Pack posterior, luego de aprobar su política de corrección/reversión.

## Approval record

- [x] Franco aprobó la política y límites F-01 a F-08 el 2026-09-23.
- [x] Franco aprobó el límite funcional de primera etapa DEV: emisión y reconciliación fiscal únicamente; no presupuestos, cobros, cuenta corriente ni otras capacidades comerciales de TusFacturasAPP.
- [ ] Franco aprueba el Change Pack documental `FISCAL-TUSFACTURAS-DEV-001` una vez preparado.
- [ ] La política contable/fiscal de IVA, redondeo, tipos y vencimientos fue confirmada por el responsable correspondiente.
- [ ] Se autoriza por separado cualquier schema, migración, secreto DEV, webhook o implementación.

## References

- `knowledge/domain/FISCAL_BOUNDARY_TUSFACTURAS.md` — límite vigente OSSUM/TusFacturasAPP.
- `knowledge/domain/FACTURACION_COBROS.md` — autoridad operacional de facturas, cobros e imputaciones.
- `knowledge/core/PROJECT_BRIEF.md` — circuito V1 y entidad central.
- `knowledge/core/CANONICAL_DECISIONS.md` — backend-only y guardrails vigentes.
- `prisma/schema.prisma` — estado actual de `Invoice`, `InvoiceItem`, `Payment` y contactos.
- `src/lib/services/invoice.service.ts` y `src/lib/services/payment.service.ts` — flujo operacional actual.
- TusFacturasAPP, [Consulta avanzada](https://developers.tusfacturas.app/api-factura-electronica-afip-facturacion-ventas/consulta-avanzada.md) — búsqueda por `external_reference`, comprobantes emitidos o pendientes y alcance por Punto de Venta; consultada el 2026-09-23.
- TusFacturasAPP, [Webhooks](https://developers.tusfacturas.app/api-factura-electronica-afip-facturacion-ventas/webhooks-notificaciones.md) — eventos, `hook_id`, `external_reference`, `TF-WebhookToken`, reintentos y consulta posterior; consultada el 2026-09-23.
- TusFacturasAPP, [Notas de crédito / débito](https://developers.tusfacturas.app/api-factura-electronica-afip-facturacion-ventas/api-factura-electronica-afip-notas-credito-debito.md) — comprobantes asociados, restricciones y reversión fiscal; consultada el 2026-09-23.
