# UI callers — offline delivery complete / PARTIAL acceptance

## Done
- Connected selection/reservation/control/recontrol/resolution callers and both Remito emission surfaces under verified non-overlapping ownership. Writers released.

## Changed
- Material selection uses backend physical/source movement IDs and quantity/append/remove; reserve first displays observed preparation version. Commands retain UUID/version/payload across identical retries; explicit refresh/edit starts a new intent.
- Resolution sends latest observed sequence; failures retain inputs. Accepted writes remain accepted if read refresh fails, with further writes blocked until explicit reload.
- Assignment selector uses backend surgery identity. Both emission callers preserve persisted assignment linkage, trace checks and actual backend Remito/item/preparation IDs, reject unavailable/ambiguous linked intent and retain exact retry bodies. Stale preflight cannot issue a mutation into a replacement context.
- Existing clients/services reused; accounting/Coordination/states/permissions/Auth/schema/Movimientos/dirty shared files untouched. No incident investigation or DB execution.

## Files
- CajasPhysicalUnitsSection.tsx; OperationalRemitoWorkspace.tsx; LogisticaTabContent.tsx; cajas-intent.ts.
- Three new HTTP component suites; one existing component fixture argument-shape correction.
- UI brief/locks/implementation/validation/review/handoff in this task directory. Cajas client transport unchanged.

## Validations
- Eight fully inspected/enumerated offline unit/component files:153/153 passed. Narrow63/63 emission/workspace and23/23 preparation results overlap.
- Final TypeScript/diff passed; independent read-only review accepted matching hashes, no introduced blocker; index empty.
- Sole orchestrator runner enforced explicit allowlist and blocked real transport; source writers executed no tests/Node/DB commands. Writer timeouts after authored release/handoffs required artifact recovery, not test-result invention.

## Risks
- PARTIAL: mocked HTTP proves UI contracts, not persisted ledger/reservations/traces/concurrency or live browser behavior.
- DB_TESTS_BLOCKED remains in force; build deferred without exclusive window. No server restart, dependency/config/Auth/schema change, staging/commit/deploy.

## Next
- Real acceptance requires separately authorized disposable-target/DB gate, synthetic prepared→controlled→issued case with persisted balances/traces/replay, authenticated browser and exclusive build evidence. Do not lift gates or reopen incident automatically.
