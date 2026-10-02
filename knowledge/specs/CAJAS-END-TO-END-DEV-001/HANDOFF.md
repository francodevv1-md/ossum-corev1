# HANDOFF — CAJAS-END-TO-END-DEV-001

## Done
- Corrected explicit `preparationLineId` enforcement and universal lot/serial validation in `src/lib/cajas-intent.ts`:
  1. **Strict Explicit `preparationLineId` Validation**: When `item.preparationLineId` is supplied, it must exist and be active (`l.id === item.preparationLineId && l.isActive`) in the assignment preparation. If missing or inactive, throws a descriptive error immediately without falling back to SKU/article matching.
  2. **Universal Traceability Checks**: In all selection paths (explicit ID, single SKU/article candidate, and multi-candidate disambiguation), reported `item.lotNumber` and `item.serialNumber` are validated against `prepLine.lotNumberSnapshot` and `prepLine.serialNumberSnapshot`. Incompatible lot/serial numbers immediately reject the intent with descriptive errors.
  3. **Regression Tests Added**: Added 4 new test cases in `src/__tests__/unit/cajas-ui-intent-wiring.test.ts` (31 tests total, all passing).
  4. **Quality Gates Verified**: `git diff --check` clean, standalone `tsc` 0 errors on scoped files, and 186 unit tests passing across Cajas and Document services.

## Changed
- `src/lib/cajas-intent.ts`: Implemented strict active line verification on `item.preparationLineId` (preventing fallback to SKU search) and added universal post-resolution checks for `item.lotNumber` and `item.serialNumber`.
- `src/__tests__/unit/cajas-ui-intent-wiring.test.ts`: Added 4 regression tests for nonexistent/inactive explicit IDs, single candidate lot mismatch, serial mismatch, and valid matching traceability.
- `knowledge/specs/CAJAS-END-TO-END-DEV-001/LOCK.md`: Released lock.
- `knowledge/specs/CAJAS-END-TO-END-DEV-001/VALIDATION_LOG.md`: Updated validation records.

## Files
- `src/lib/cajas-intent.ts`
- `src/__tests__/unit/cajas-ui-intent-wiring.test.ts`
- `knowledge/specs/CAJAS-END-TO-END-DEV-001/LOCK.md`
- `knowledge/specs/CAJAS-END-TO-END-DEV-001/VALIDATION_LOG.md`
- `knowledge/specs/CAJAS-END-TO-END-DEV-001/HANDOFF.md`

## Validations
- `git diff --check`: 0 errores.
- Standalone TypeScript (`npx tsc --noEmit`): 0 errores en todos los archivos del alcance (`src/lib/cajas-intent.ts`, tests de intent, componentes Cajas/Stock/Expediente). (5 errores ajenos en archivo protegido `src/app/cirugias/page.tsx` dejados intactos).
- `npm test -- cajas-ui-intent-wiring`: 1 archivo, 31 pasados, 0 fallados.
- `npm test -- cajas`: 9 archivos, 108 pasados, 0 fallados, 5 omitidos (PostgreSQL en vivo).
- `npm test -- remito-service consumo-service devolucion-service`: 3 archivos, 78 pasados, 0 fallados.
- **Total Tests Unitarios Ejecutados**: 186 pasados, 0 fallados.

## Risks
- **Validación Operativa en Staging**: Concurrencia transaccional real bajo PostgreSQL multi-tenant y sesiones E2E de navegador completas permanecen pendientes de validación en entorno de staging vivo.

## Next
- Scoped locks liberados. Corrección de defectos de intent completada bajo el paquete `CAJAS-END-TO-END-DEV-001`.
