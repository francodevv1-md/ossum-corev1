# Legacy DEV Read-Only Evidence — 2026-09-23

## Source session

- Purpose: schema-only authority assessment for `PRISMA-FISCAL-CONTROLLED-BASELINE-DEV-001`.
- Connection handling: existing configured Prisma datasource was supplied only to child tools; no secret value was displayed, copied, or persisted.
- Legacy write protection: all catalog and migration queries ran inside `BEGIN READ ONLY` and ended with `ROLLBACK`.
- Source database identity: database `postgres`; role `postgres`; PostgreSQL 17.6; source session reported `transaction_read_only = on`.
- Source role metadata: `rolcreatedb = true`. This was not exercised because the parity gate failed before target provisioning.
- DEV classification: user-confirmed legacy disposable DEV source. No application-table rows or personally identifiable data were queried or exported.

## Prisma status

`npx prisma migrate status` read the legacy source and found 45 local migrations. It reported exactly two pending local artifacts:

| Pending local migration | Action taken |
| --- | --- |
| `20260921020000_stock_reservation_evidence_command_reservation_unique` | Not applied |
| `20260923134500_fiscal_tusfacturas_dev` | Not applied |

The legacy `_prisma_migrations` table has 47 rows: 43 finished/applied records and four rolled-back records (two each for `20260811000000_remito_qr_barcode_001` and `20260820190000_receipt_preparation_v1`). The active checksum values that make the historical lineage non-recoverable remain:

| Applied legacy migration | SHA-256 |
| --- | --- |
| `20260820190000_receipt_preparation_v1` | `f044745e16341711f17796b9439bf7ff51941c76f669e075f9307ec2ebd2f963` |
| `20260903030000_surgery_visible_number_uniqueness` | `efa3d2e676fdd9f68048024a6fa2538abf18ce84622049fd54228f09064caa2b` |

No `_prisma_migrations` row was inserted, updated, resolved, or removed.

### Read-only migration table export

This is the non-secret export used for the assessment (`migration_name,checksum,applied,rolled_back`):

```csv
20260606063628_init_backend_foundation,32f85a51585909d997e292f667aa0405e57fd6ac69f7edf309216efcd0a2f69e,true,false
20260615153000_surgery_phase1_core,7aa835e72e9fa1b239f4f691c69a4bad370d4a92991c67a310b17353afbf2d1e,true,false
20260629110404_add_seguimiento_entry,4a3240dc2153b45a663b78425db9b0ca03e243c57d24a8a37e46d4ada04a83f8,true,false
20260701142201_add_digital_receipts,607c81f605d8422cd6f6dfdba0e7940754cdf8ada2ba7d430cff77bd9eb42274,true,false
20260703113000_add_user_module_view_preference_history,1c775a16ddd70cef07abbe7f458b89c3a4353e1aa6cac52ad600c3b302062f90,true,false
20260703133500_add_internal_notifications_mentions,3af589fc871b8680bcf2de6f7fe12a84b4e4b5450f7856d0aa82b90d53546c4e,true,false
20260707091809_add_remito_unificado,4d727063e0eaa0571c1149998823edb5ea7e94b6b71b1097547fec79f3b3e755,true,false
20260707163042_add_consumo_devolucion,732232370294b2126accfd1944d93f42ee2370a5cf216e4439df45684b8a3a5d,true,false
20260707173000_add_presupuesto_core,6bbe84b50a5b43708de135d0dc6894795bae48fdcb20c3c974712e6e67abe425,true,false
20260707192335_rename_internal_notification_index,b8d990feda8173fd3e18dbfaf52c88c9f8ad519307565bad93962cf147ffd55f,true,false
20260707193000_add_invoice_payment_core,2ee07cb0a8f927758bd601c7ae96d6534f385ef0ba537acad04ef72788695d6d,true,false
20260708014500_add_surgery_archive_fields,9064324044c1830f8bedf0c9f144ffea6a8e4a6e3282034a5894c4ee59ea9b58,true,false
20260714215000_add_item_trace_lot_expiration,2bdc67699558aa1ec4fffa8a90b17f9545fa997c774f82846d225be6c0e7ce65,true,false
20260722150000_repair_availability_prerequisites,2a481ac5097efe9a5ca75466da563b5b4d08ec05ef1b1864d47dfb06dc8947e3,true,false
20260722160000_add_availability_request_foundation,8814ee032118e1392c0f1031d021073f2c1c1f9fdaf652b579200fc4c5ec647e,true,false
20260723113000_repair_item_tenant_baseline,06748bb8cfb65efb431051b6e2b995fdd4b553e78ee7b49aae71b2f10f2c9a20,true,false
20260723160000_add_availability_capability_grants,c3a32266234ff5c9afc6724492e543082cc5921e981ca9dfe59b1edbe3deb13b,true,false
20260727200000_add_surgery_documentation_v0,9581992f7f8a5d29fd4835e444e47a36684aa05a2548d21299b9083ae957e6c1,true,false
20260811000000_remito_qr_barcode_001,451ee5cfe54e8004e9dfcc563958b5a4a4182c9e31ba30e6e7342affbf55aeb1,false,true
20260811000000_remito_qr_barcode_001,445b4283aa4da7ec89d28d6f45676ad5198b32f2fa411e4264c12e89951d6134,false,true
20260811000000_remito_qr_barcode_001,445b4283aa4da7ec89d28d6f45676ad5198b32f2fa411e4264c12e89951d6134,true,false
20260813000000_remito_stock_atomic_dispatch_persistence_001,670e672a539edfeb6133e8e95b30b4e7f388aef8f93dcfb46eaca4d7f60742d8,true,false
20260815233000_coordination_shipping_transport_001,2365f67b7c1fa760f82ceb45e722813db8fb7156b16af60e5ec9ca43917cff02,true,false
20260820170000_article_master_v11,fa1a3e21da3409e1841b6029ee78dd8f46cd5d8361559dfeb4399d66cdbd4069,true,false
20260820190000_receipt_preparation_v1,d52d9d42a50ea04220009bb3d8796bddc296eb2eede32e50c976ed0ae014af15,false,true
20260820190000_receipt_preparation_v1,f044745e16341711f17796b9439bf7ff51941c76f669e075f9307ec2ebd2f963,false,true
20260820190000_receipt_preparation_v1,f044745e16341711f17796b9439bf7ff51941c76f669e075f9307ec2ebd2f963,true,false
20260821120000_receipt_expected_scan_bridge,06aee2eb1cb5a6a527ddb6b1bab2b88909c0e26d1f388902f8428b19ac2c6a95,true,false
20260824120000_article_identifier_gs1_ai22,be648f67757c14dc77b391a56db1a13cccc20e6021baea3b322e5f20e81f4bcd,true,false
20260824150000_receipt_unit_scan_learning,b43edaed2e521832eaf8da682d4ff48cfbc12bae01372e58ad0dc5c745cae982,true,false
20260824160000_fix_stock_policy_guard_null_eligibility,bd58a3a2622487ea0facf88dea03da66e50a9975127aca15ae9f0de1350eb1f9,true,false
20260824180000_guided_traceability_profile,41f18b3bb3798bcde9e72c9898d1e13cecaf074685b196ee6a79c32527d46883,true,false
20260825130000_fix_stock_unit_config_under_review_literal,b0740ea6e22776af68d2d249b2f34becf0ce756b3293ed9793fb3d1c28d13b40,true,false
20260826123000_cajas_unit_log_v1,a3c7700150186cd341932f02aada2cd1a9f50e907e78b8ebb197656d4a90a1ab,true,false
20260826190000_article_xadmin_taxonomy_v1,eaf6f5022f70575a59c991d9c949502efd774d3e27ae9fab4363a7cef70b586c,true,false
20260827010000_cajas_maintenance_control_v1,37678a546d52f912806d5c556d38e97cebf0aed454e59dedda3e489e1064c3f6,true,false
20260831010000_presupuesto_authority_unification_dev_001,0da18309cf6f09917bf35963888282e9c43a88fbf37013ab63865c908f8bfc58,true,false
20260831073000_presupuesto_authority_corrective_dev_001,aa026921293d5120e18b565caeff07e6c9c6a4a3f42fc6a9e784f075aefa9340,true,false
20260903030000_surgery_visible_number_uniqueness,efa3d2e676fdd9f68048024a6fa2538abf18ce84622049fd54228f09064caa2b,true,false
20260903130000_contacts_backend_authority,94c9856e6a681eaed3a292146a93ac4f301b0f6f91493358d77700d7c8250548,true,false
20260903195000_fix_preparation_reservation_contracts,a6ce747d83cc9ba3cc06a144a9bab4f27a8be262e7d121bcb01976936d25aa47,true,false
20260903200000_fix_cajas_dispatch_ceiling_columns,60a749ad33aa381a9dd484a558214d48cf2670110bbb7eb94d7c4accb62566bd,true,false
20260906234500_add_cajas_allocation_trace_snapshot,b7407ef56339f814037c121a95c09bdb7b8f9b800c3e10332e3b9a2bb5770ebc,true,false
20260907100000_phase_d_logistics_reconciliation,979d8e0f43ae0194d588ef881925fb7f98095b9b70a3f08aa12eddb4e867f70f,true,false
20260910120000_contact_address_geography,2178bd532b94aa5fc7ac080171f49c0cbdbe0e8afd59893d902574f9c717c528,true,false
20260914093000_logistics_vehicle_gps_rest_v1,5a99be5267dd4884c0d5974ba3c8d5cfaa79942d35d13339e9e4ef1a2f0db7c8,true,false
20260916143000_geo_gps_tenant_forward_correction,78d1320aafd9d18313b821af541bbe80accb26b0e6524da6ef9aa5ed6ffefe01,true,false
```

## Schema inventory and introspection gap

The read-only catalog inventory found 123 public tables, no views, no materialized views, and no sequences. An isolated `prisma db pull` ran only against `C:\Users\franc\AppData\Local\Temp\opencode\prisma-fiscal-reconciliation-20260923\legacy-introspection.prisma`; it produced 122 Prisma models and never overwrote `prisma/schema.prisma`.

| Object class | Legacy count | Prisma baseline consequence |
| --- | ---: | --- |
| User triggers | 90 | Not represented by Prisma datamodel introspection; direct reviewed SQL is required to preserve each trigger and its function dependency. |
| Check constraints | 128 | Prisma explicitly reported them unsupported; direct reviewed SQL is required. |
| Exclusion constraints | 1 | Prisma explicitly reported it unsupported; direct reviewed SQL is required. |
| Deferrable constraints | 18 | Prisma explicitly reported that deferring semantics are not fully supported; direct reviewed SQL and parity review are required. |
| Extensions | 6 | `btree_gist`, `pg_stat_statements`, `pgcrypto`, `plpgsql`, `supabase_vault`, `uuid-ossp`; target availability and provisioning authority are not established. |

`psql` and `pg_dump` are not installed in this execution environment. Therefore a schema-only dump and dump hash could not be captured. This is a tooling limitation only; no alternative dump was fabricated.

## Gate conclusion

**STOP — baseline parity is incomplete.** The proposed baseline cannot be safely generated from Prisma introspection alone because it would omit at least 90 triggers, 128 checks, one exclusion constraint, and deferrable-constraint behavior. The required reviewed SQL preservation source is not available through the current approved toolchain, and target extension provisioning is unproven.

Consequently no fiscal-reconciliation database was created, no baseline migration directory was generated, no SQL was applied, and FISCAL-02 was not rebased. This preserves the legacy database and avoids presenting a lossy schema as an authoritative DEV baseline.

## Non-schema validation record

- `npx prisma validate`: passed.
- `npx prisma generate`: passed.
- `npx prisma format` was not run against the active schema because it can rewrite the shared, dirty `prisma/schema.prisma`, which is outside this task's allowed files; no rebased fiscal schema exists to format.
- Focused FISCAL-02 tests: `npx vitest run src/__tests__/unit/fiscal.service.test.ts src/__tests__/unit/invoice-service.test.ts` passed (28 tests, 2 files).
- `npm run typecheck`: failed in pre-existing ContactAddress call sites because the current shared schema requires `companyId` but `prisma/seed.ts`, `src/__tests__/integration/contacts-code-concurrency-postgres.test.ts`, and two paths in `src/lib/services/contact.service.ts` omit it. No fix was applied: these files are outside this task's allowed scope and are unrelated to the baseline gate.

## Required unblock

Provide a safe schema-only export capability or a pre-approved authoritative PostgreSQL schema export that includes extensions, functions, triggers, checks, exclusions, and deferrable constraints. Then review the generated baseline and unsupported-object SQL before creating the isolated target.
