## Done
- Corregido el runbook documental del 2026-10-02; demo pendiente de registros confirmados, sin declaración READY global.
- Task `RESUME-MVP-RUNBOOK-CORRECTION-20261002`; docs maintainer; modelo runtime `openai/gpt-6.1-sol`; modo docs. Ownership previo released; alcance de dos archivos liberado al cierre.

## Changed
- Ficha CX se abre desde `/cirugias`, sin ruta de detalle inventada. Checklist de estados sin upload; Pendientes crea Borrador, no emite factura.
- Eliminados fixtures inventados y totales/personas/correos no acreditados. Manifiesto UNVERIFIED; sin continuidad completa entre registros independientes.
- Preservada evidencia válida de Presupuestos y Documentación. Coordinación: re-revisión actual completada; PARTIAL por bloqueos fuente y evidencia/browser pendientes, pese a READY del propietario. Cajas: PARTIAL offline 153/153 y bloqueo DB absoluto. Movimientos: runtime separado pendiente.

## Files
- `knowledge/specs/MVP-DEMO-RUNBOOK-001/DEMO_RUNBOOK.md`.
- `knowledge/specs/MVP-DEMO-RUNBOOK-001/RESUME_HANDOFF.md` (nuevo).
- `knowledge/specs/MVP-DEMO-RUNBOOK-001/RESUME_REVIEW.md` — integración del orquestador, sin ownership de código.

## Validations
- Leídos AGENTS.md, skill better-documents, handoff de sesión, Sol1 UI_HANDOFF/DB_TESTS_BLOCKED, Presupuestos HANDOFF/QA_STATUS, Documentación HANDOFF/RUNTIME_ACCEPTANCE, Coordinación HANDOFF actual y Movimientos FINDINGS/closeout.
- Cotejadas navegación y superficies por lectura fuente. Evidencia QA previa conservada, sin reruns.
- `git diff --check -- knowledge/specs/MVP-DEMO-RUNBOOK-001/DEMO_RUNBOOK.md knowledge/specs/MVP-DEMO-RUNBOOK-001/RESUME_HANDOFF.md`: exit 0, sin salida. El comando cubre diferencias tracked; el handoff nuevo se revisó por lectura (seis encabezados exactos). No certifica runtime ni contenido de registros.
- Diagnose documental del orquestador: `git diff --no-index --check -- NUL <archivo>` incluyó los tres archivos untracked y detectó dos espacios finales de Markdown en líneas 3–4 del runbook. Se retiraron únicamente esos espacios; la comprobación posterior cubre contenido completo, no solo archivos tracked.

## Risks
- Fixtures y disponibilidad presente UNVERIFIED. Sin aceptación del circuito completo ni emisión/cobro enlazados acreditados para esta demo.
- Cajas DB hold vigente: no mutaciones en vivo, DB acceptance, consultas, cleanup o reapertura del incidente. Disposabilidad DEV general no levanta el bloqueo.
- Coordinación conserva defectos de identidad, filtros, feedback y scope asíncrono: ver RESUME_REVIEW.md. Browser pendiente; Movimientos runtime seguro separado; Documentación conserva sus gaps de otra empresa/solo lectura y build según sus artefactos.

## Next
- Confirmar el manifiesto con registros sintéticos reales y enlaces antes de presentar; conservar las exclusiones hasta resolver cada gate con su responsable.
- Antigravity debe corregir el delta de RESUME_REVIEW.md y enlazar evidencia de ejecución. Re-revisar solo cambios posteriores; coordinar ensayo/build pendiente por separado. Sin source edits, DB/tests/Node/browser/build/server/secrets ni Git mutation/commit en esta tarea.
