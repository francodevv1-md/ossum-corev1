# Task Brief — DISTRICORR-DEMO-INTAKE-AUTHORIZATION-DEV-001

## Task Information
- **Task ID**: `DISTRICORR-DEMO-INTAKE-AUTHORIZATION-DEV-001`
- **Workspace**: `E:\OSSUM_COR_ANTIGRAVITY\ux-ui`
- **Owner**: Antigravity
- **Mode**: implementation
- **Declared Model**: Gemini 2.5 Pro / Antigravity

## Objective
Implement and validate the surgical circuit intake to authorization to coordinator:
`Ingreso → Autorización → Coordinador`

1. **Ingreso persistido**:
   - Persist coordinator using existing backend relations/IDs (`SurgeryContactAssignment` / `contactAssignments` and `coordinadorContactId`), without inventing new schema.
   - Retain surgical classification (e.g. Traumatología, Columna, etc.) without conflating classification with priority (`normal` / `urgent`).
   - Allow entering a case as a quotation/draft (Presupuesto) and resuming later to authorize the same surgery without creating duplicates.

2. **Autorización**:
   - Reuse existing modal `ChangeStateDialog.tsx`.
   - Require attached voucher or checkbox “No posee autorizado”.
   - If valid existing evidence exists, allow reusing it.
   - For exceptions without voucher, log in history and Seguimiento as:
     `El usuario [nombre]: confirma que no tiene una imagen de autorización`.
   - Obtain actor identity from backend session (`getApiAuthContext` / `ctx.actorUserId` / `currentUser`), never from client form inputs.
   - Confirm evidence/exception before transitioning state to "Autorizada".
   - If backend storage, note, or state update fails: preserve data, display error, and DO NOT mark authorized locally or show false success.
   - Prevent duplicate comments/attachments/notifications on retries.
   - Approving a budget is NOT equivalent to authorizing a surgery.

3. **Coordinador**:
   - On authorization, notify the specifically assigned coordinator (`SurgeryContactAssignment` / `contactAssignments`).
   - Reuse existing identity resolution and policy; never equate `User.id` with `Contact.id` or match loosely by names.
   - If no secure relationship exists to identify the recipient, report the blockage rather than broadcasting to all coordinators.

4. **Persistencia**:
   - Verify that intake, assignment, authorization, evidence/exception, and Seguimiento survive reload and persist accurately.

## Non-Goals / Excluded Boundaries
- No changes to Auth, roles, permissions, security policies, secrets, or deployment.
- No invented recipient routing or non-canonical taxonomy.
- No production, staging, real data, fiscalization, or Cajas DB execution (`DB_TESTS_BLOCKED.md` remains strictly active).
