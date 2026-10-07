# Migration checkpoint ownership

- task: DEV-MIGRATIONS-CHECKPOINT-20261005
- agent role: SDD apply executor
- selected model: openai/gpt-6.1-sol
- status: released
- owned: this task folder; C:/Users/franc/AppData/Local/Temp/opencode/dev-migrations-2138552-20261005/
- not owned: source/schema/migrations, original Git index/client/runtime; all other task resources.
- preflight: GPT2 schema/geography locks released. Existing AdjustmentDocument schema lock remains editing and is not overridden; no schema edits permitted. Runtime/build owners remain untouched.
- database: metadata-only preflight until every brief gate passes; Sol1 hold remains active.
- final: no pending artifacts; read-only checkpoint complete. No database write resources acquired or mutations performed.
