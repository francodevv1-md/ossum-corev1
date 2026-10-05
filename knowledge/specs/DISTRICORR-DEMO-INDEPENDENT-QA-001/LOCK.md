# File Locks — DISTRICORR-DEMO-INDEPENDENT-QA-001

- **Task**: `DISTRICORR-DEMO-INDEPENDENT-QA-001`
- **Agent Role**: Reviewer independiente + preparación de demo
- **Selected Model**: minimax/MiniMax-M3
- **Mode**: `read-only` (sobre aplicación); `docs` (sobre carpeta propia)
- **Status**: `editing`
- **Owned Files**:
  - `knowledge/specs/DISTRICORR-DEMO-INDEPENDENT-QA-001/OWNERSHIP.md`
  - `knowledge/specs/DISTRICORR-DEMO-INDEPENDENT-QA-001/REVIEW.md`
  - `knowledge/specs/DISTRICORR-DEMO-INDEPENDENT-QA-001/DEMO_CHECKLIST.md`
  - `knowledge/specs/DISTRICORR-DEMO-INDEPENDENT-QA-001/CONTEXT.md`
- **Forbidden Files**:
  - Aplicación, tests y configuración del repo (read-only).
  - Runbooks/handoffs de otros owners (`MVP-DEMO-RUNBOOK-001/DEMO_RUNBOOK.md`,
    `MVP-DEMO-RUNBOOK-001/RESUME_REVIEW.md`,
    `MVP-DEMO-RUNBOOK-001/RESUME_HANDOFF.md`,
    `DISTRICORR-DEMO-INTAKE-AUTHORIZATION-DEV-001/*`,
    `SURGERY-COMPROBANTES-BACKEND-READ-DEV-001/*` salvo hashes baseline).
- **Pre-flight**:
  - HEAD: `73e3e1b4b930fa0bc4bf44636c78529d73b33208`.
  - Lock Antigravity (`DISTRICORR-DEMO-INTAKE-AUTHORIZATION-DEV-001`): `editing`. Sin HANDOFF.
  - Lock Sol (`SURGERY-COMPROBANTES-BACKEND-DEV-READ-001`): `released`. HANDOFF + VALIDATION + self-review presentes. Mi walk-through del delta: PENDING REVIEW sin bloqueos nuevos propios.
  - Mi etiqueta de certificación: **PENDING REVIEW** (no `BLOCKED`). No es veredicto funcional, es "todavía no certificado por mí".
- **Stop / escalate if**:
  - Owner libera archivos → recién ahí reviso diff contra baseline.
  - Cualquier owner re-edita después de haber publicado HANDOFF → invalido el snapshot certificado.
  - Encuentra bloqueos que requieren corrección → informo en REVIEW; **no implemento fix**.