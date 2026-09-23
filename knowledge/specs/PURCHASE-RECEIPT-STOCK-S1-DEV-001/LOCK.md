# Ownership Lock

- task: `PURCHASE-RECEIPT-STOCK-S1-DEV-001`
- agent role: Backend/DB + frontend implementation
- selected model: `openai/gpt-5.6-terra`
- owned files: exact files listed in `TASK_BRIEF.md`
- status: released
- forbidden: C13 migration; all C14 migrations/bundle validators/writers; Auth, permissions, `src/lib/db.ts`, OCR, unrelated Cirugías/Presupuestos/Facturación, production/staging, deploy, commit, push, PR
- note: released after isolated persistent DEV fixture and DB-backed validation on `ossum_receipt_s1_dev_20260921`; do not reconcile shared DEV migration records or edit C13/C14/WCB-06.
