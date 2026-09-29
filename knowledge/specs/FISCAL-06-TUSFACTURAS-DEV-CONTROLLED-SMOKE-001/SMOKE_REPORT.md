# REPORTE DE EMISIÓN CONTROLADA — FISCAL-06 — TusFacturas DEV

## Resultado de la Emisión Real contra Sandbox TusFacturas

- **Endpoint alcanzado**: `https://www.tusfacturas.app/app/api/v2/facturacion/nuevo`
- **Punto de Venta**: `00004` (DISTRICORR SRL)
- **Autenticación**: Exitosa (validada por TusFacturas con API Key, API Token y User Token).
- **Factura Fixture DEV**: `cmullybok0000a8huoyh1pizx` (Visible: `9901`, `TF-DEV-SMOKE-001`).
- **External Reference**: `OSSUM-CODEVDIS-cmullybok0000a8h`
- **Comprobante Emitido**: `FACTURA B 00004-00000002`
- **Estado Resultante**: `SIMULATED` (comprobante de prueba generado en sandbox, sin validez legal impositiva ante ARCA/AFIP).
- **Enlace PDF DEV Oficial**: [Descargar PDF Factura B](https://www.tusfacturas.app/app/descarga/pdf/af6254154e2d5bb197686ad4d5f4f9ff/0rwMtnKpPFZFZ5yr7HMv8j12507861y/73692-30715982907-11111111-6-00004-00000002.pdf)
- **Micrositio de Descarga**: `https://servicios.tusfacturas.app/msd/f47bdc415978a664e897bea937933032/7b0a7d7596cc348bf304cfac4833eb1439172b76a3273555fa9d6a258c95db50/0rwMtnKpPFZFZ5yr7HMv8j12507861y/00000002`

---

## Reconciliación y Trazabilidad

- **Consulta por `external_reference`**: `POST /facturacion/consulta_avanzada`
- **Respuesta de Reconciliación**:
  ```json
  {
    "rta": "OK",
    "error": "N",
    "total": 1,
    "comprobantes": [
      {
        "numero": 2,
        "tipo": "FACTURA B",
        "punto_venta": 4,
        "status": "EMITIDO",
        "total": 1210,
        "external_reference": "OSSUM-CODEVDIS-cmullybok0000a8h"
      }
    ]
  }
  ```

---

## Auditoría de Seguridad y Persistencia

1. **Persistencia de Intentos**: 9 intentos auditados con `attemptNumber` secuencial en `FiscalIssuanceAttempt` (desde el rechazo inicial por configuración hasta la emisión exitosa y reconciliación).
2. **Snapshot Inmutable**: `snapshotHash === "048fbf33f04f314619f89bb75f94f08a6ca2ce4c74783daea676312d49f7a2f2"`.
3. **Fuga de Secretos en DB**: `leaksSecret === false` (ninguna API key, token o secreto se persiste en snapshots o evidencias).
4. **Protección de Anulación**: `cancellationBlocked === true` (`assertFiscalCancellationAllowed` bloquea la anulación operacional de la factura mientras mantenga evidencia fiscal activa).
5. **Detección de CAE**: `hasCae === false` (cero riesgo impositivo, el comprobante se clasifica correctamente como `SIMULATED`).
