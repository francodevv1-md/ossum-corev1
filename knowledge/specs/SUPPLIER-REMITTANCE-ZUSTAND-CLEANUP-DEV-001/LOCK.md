# Ownership Lock

- task: SUPPLIER-REMITTANCE-ZUSTAND-CLEANUP-DEV-001
- agent role: Store maintenance
- selected model: openai/gpt-5.6-sol
- owned files: `src/lib/store.ts`, `src/data/mock-remitos-proveedor.ts`, `src/__tests__/unit/supplier-remittance-store-migration.test.ts`
- status: released
- scope: remove only confirmed legacy demo IDs; preserve all other local records
