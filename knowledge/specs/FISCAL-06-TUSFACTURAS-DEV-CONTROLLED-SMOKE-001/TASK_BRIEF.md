# TASK BRIEF — FISCAL-06 — Emisión DEV Controlada contra TusFacturas

## Task ID
`FISCAL-06-TUSFACTURAS-DEV-CONTROLLED-SMOKE-001`

## Objective
Ejecutar una única emisión fiscal controlada contra la API de prueba (sandbox) de TusFacturas desde una factura fixture DEV (`TF-DEV-SMOKE-*`), persistiendo el snapshot inmutable y el intento, verificando que no se expongan secretos y validando la proyección de evidencia `SIMULATED` en Facturación.

## Agent Role & Ownership Lock
- Role: Fiscal Integration Smoke Agent
- Scope: Controlled Single DEV Fiscal Issuance
- Lock Status: `editing`
- Owned Files:
  - `knowledge/specs/FISCAL-06-TUSFACTURAS-DEV-CONTROLLED-SMOKE-001/TASK_BRIEF.md`
  - `knowledge/specs/FISCAL-06-TUSFACTURAS-DEV-CONTROLLED-SMOKE-001/HANDOFF.md`
  - `knowledge/specs/FISCAL-06-TUSFACTURAS-DEV-CONTROLLED-SMOKE-001/SMOKE_REPORT.md`

## Human Boundary & Safeguards
- Precondición: variables DEV configuradas manualmente por Franco en `.env.local`.
- Prohibición absoluta de leer, imprimir o exponer credenciales de entorno.
- Solo comprobación booleana de presencia de configuración DEV (`isTusFacturasDevConfigured()`).
- Emisión única: cero reintentos automáticos, cero duplicación de facturas/referencias.
- Si el servidor devuelve CAE real, detener inmediatamente por seguridad impositiva.
