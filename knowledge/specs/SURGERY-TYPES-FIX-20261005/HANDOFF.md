# HANDOFF — ANTIGRAVITY-SURGERY-TYPES-20261005 (Revisión Candidato Aislado)

**Fecha**: 2026-10-05  
**Autor**: Antigravity (Frontend/UI)  
**Workspace**: `E:\OSSUM_COR_ANTIGRAVITY\ux-ui`  
**HEAD revalidado**: `ba258b71596f01c471aebfd39ea7c0673dd41b97` (`feat(stock): add article detail sheet facets and pagination`)  
**Scope**: `src/app/cirugias/page.tsx`  

---

## 1. Distinción: HEAD vs. Candidato de Tipos vs. Worktree

### A. Estado en HEAD (`ba258b7`) — 5 Errores TypeScript Reproducidos
Al compilar `src/app/cirugias/page.tsx` tal como existe en HEAD:
1. `Line 102:76`: `TS2304: Cannot find name 'Surgery'.` (`useState<Surgery | null>`)
2. `Line 110:51`: `TS2304: Cannot find name 'Surgery'.` (`openSeguimientoComposer(s: Surgery)`)
3. `Line 116:49`: `TS2304: Cannot find name 'Surgery'.` (`openMobileActionSheet(s: Surgery)`)
4. `Line 128:9`: `TS2304: Cannot find name 'Surgery'.` (`primaryActionFor(s: Surgery)`)
5. `Line 131:40`: `TS2345: Argument of type '"Pendiente" | "Validado" | "Facturado" | null' is not assignable to parameter of type 'ConsumoState | undefined'. Type 'null' is not assignable to type 'ConsumoState | undefined'.`

### B. Estado en Worktree (Modificaciones locales sin commit)
El worktree contiene:
- Import `import type { Surgery, ConsumoState } from "@/types"`.
- `(store.getConsumoBySurgeryId(s.id)?.state as ConsumoState) ?? undefined` (contiene un cast redundante).
- **Integración de Mapa ajena**: `useLogisticsMap`, `LogisticsMapPanel`, estado `viewMode`, toggle en toolbar y vistas mobile/desktop de mapa geolocalizado.

### C. Candidato Aislado de Tipos (Solo los 2 hunks necesarios)
Elimina la integración de mapa y prescinde del cast redundante.

---

## 2. Análisis del Cast y Firma Real de `canAutorizarFV`

### Firma canónica en `src/lib/businessRules.ts`:
```typescript
export function canAutorizarFV(
  surgery: Surgery,
  docStatus: DocumentStatus | string,
  consumoState?: ConsumoState
): RuleResult
```

### ¿Por qué el cast `as ConsumoState` es innecesario?
- En `src/types/index.ts`, `interface Consumo` define `state: "Pendiente" | "Validado" | "Facturado"`.
- En `src/lib/store.ts`, `getConsumoBySurgeryId: (surgeryId: string) => Consumo | undefined`.
- Por ende, la expresión `store.getConsumoBySurgeryId(s.id)?.state` evalúa nativamente a:
  `"Pendiente" | "Validado" | "Facturado" | undefined` (idéntico a `ConsumoState | undefined`).
- El error en HEAD era causado **exclusivamente por el operador `?? null`** en la línea 130 de HEAD:
  `const consumoState = store.getConsumoBySurgeryId(s.id)?.state ?? null`
- Al remover `?? null` y dejar `store.getConsumoBySurgeryId(s.id)?.state`, el tipo inferido es exactamente `ConsumoState | undefined`, encajando limpiamente en el 3er parámetro sin ningún `as Cast`.

---

## 3. Hunks Exactos del Candidato Aislado

Aplicable sobre `HEAD:src/app/cirugias/page.tsx` sin tocar mapa ni otros archivos:

```diff
diff --git a/src/app/cirugias/page.tsx b/src/app/cirugias/page.tsx
index 0800830..candidate 100644
--- a/src/app/cirugias/page.tsx
+++ b/src/app/cirugias/page.tsx
@@ -17,6 +17,7 @@ import { useBackendActiveSurgeries } from "@/hooks/useBackendActiveSurgeries"
 import { useIsMobile } from "@/hooks/useIsMobile"
 
 // Utils
+import type { Surgery } from "@/types"
 import { computeKpis, getFacturacionStatus, resolveKpiFilter } from "@/lib/cirugias.utils"
 import { CIRUGIAS_COLUMNS } from "@/lib/cirugias.constants"
 import { getCircuitProgress } from "@/lib/circuit-progress"
@@ -127,7 +128,7 @@ export default function CirugiasPage() {
   const primaryActionFor = useCallback(
     (s: Surgery): MobileCardPrimaryAction | null => {
       const docStatus = store.getDocStatus(s.id)
-      const consumoState = store.getConsumoBySurgeryId(s.id)?.state ?? null
+      const consumoState = store.getConsumoBySurgeryId(s.id)?.state
       if (canAutorizarFV(s, docStatus, consumoState).allowed) {
         return {
           id: "facturar",
```

---

## 4. Validación del Candidato Aislado (HEAD + 2 Hunks)

- **TypeScript Diagnostics**: **0 errores** (reproducidos los 5 en HEAD, 0 en el candidato aislado).
- **Suites Focalizadas Ejecutadas**:
  - `src/__tests__/components/CirugiasTable.test.tsx` (3 tests) — **PASS**
  - `src/__tests__/components/CirugiasDataGrid.test.tsx` (4 tests) — **PASS**
  - `src/__tests__/components/MobileCirugiaCard.test.tsx` (4 tests) — **PASS**
  - `src/__tests__/unit/cirugias-optabs.test.ts` (6 tests) — **PASS**
  - `src/__tests__/unit/useCirugiaActions-create-backend-only.test.tsx` (14 tests) — **PASS**
  - Total: **31/31 tests passing (100%)**.

---

## 5. Delimitación de Ownership y Entrega

- **Ownership de Tipos**: Candidato de 2 hunks sobre `src/app/cirugias/page.tsx`.
- **Ownership de Mapa (Excluido de este checkpoint)**:
  - Cambios de `LogisticsMapPanel`, `useLogisticsMap` y `viewMode` permanecen en el worktree para su track/paquete correspondiente de Logística/Coordinación.
- **Sin Staging / Sin Commit**: Índice preservado para control de GPT2.
