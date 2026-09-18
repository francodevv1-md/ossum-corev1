# Read-only source baseline

Original recovery HEAD: `dd35d40f65e094789639f12dbb450269b939e9ad`. Current bounded candidate HEAD: `cc0cabb461ac42a1d55f08fb3b4965741654cd6c`. Working-tree bytes, NOT HEAD, are the approved recovery reference. Schema/service/validator are dirty and authority spec is untracked. Hashes are nonsecret SHA-256; no environment files inspected.

| Source path | SHA-256 |
| --- | --- |
| prisma/schema.prisma | 7AA6FD3A1F8C7A465277D72C6CC3E96F33C2AB0CED27282E4A102584E8767700 |
| src/lib/services/presupuesto.service.ts | 13BBB719DC82670A96CBEEAFD1212C330581F151C730580ED9EB41C9F4188801 |
| src/lib/validators/presupuesto.ts | B4BA6153A42AB1E131813A1DE6BE23401555EB518C869ED7C336BF840F856CB8 |
| src/__tests__/unit/presupuesto-service.test.ts | 4459F8E4101DB9A49BA6B63C865BC898DB7A7F840DEECB920DC1A6513FEBD5D6 |
| src/__tests__/integration/presupuesto-authority-migration.test.ts | 9C1141A3BC0FCB4AC22A190C4D370B4E65987E58C8AABE99784DCE2345C0A890 |
| prisma/migrations/20260831010000_presupuesto_authority_unification_dev_001/migration.sql | 0DA18309CF6F09917BF35963888282E9C43A88FBF37013AB63865C908F8BFC58 |
| prisma/migrations/20260831073000_presupuesto_authority_corrective_dev_001/migration.sql | AA026921293D5120E18B565CAEFF07E6C9C6A4A3F42FC6A9E784F075AEFA9340 |
| knowledge/specs/PRESUPUESTO-AUTHORITY-UNIFICATION-DEV-001/TASK_BRIEF.md | 4DF0A3AFB9089000F6F94A52FEAFFD5AEDB06058892807F295A7DF2B487733DF |
| src/app/api/companies/[companyId]/presupuestos/route.ts | 110B88D9931E73F0E1C8E027A7EB0F1399655A724B138519DB0BE2AA2ACD1694 |
| src/app/api/companies/[companyId]/presupuestos/[presupuestoId]/route.ts | 28290F18E9CD4CC23C7ADE7A195F93EED9FE536077F8D021E422CB068B7149F6 |
| src/app/api/companies/[companyId]/presupuestos/[presupuestoId]/emitir/route.ts | E2306EEAE804576A5355C613D7E9C7EB75914EC101BD1CE4D4134C40EB1A16CB |
| src/app/api/companies/[companyId]/presupuestos/[presupuestoId]/versions/route.ts | B4EE61FC3AEB04EFD75992BA664D0F9BE47436FADC283C2A7FECE395B93349B1 |
| src/app/api/companies/[companyId]/presupuestos/[presupuestoId]/state/route.ts | F116520D1DCCC2413161A17D99B9C7D5CCEA857F65E8B4F460F8F51933FF0A13 |

Target baseline already has compile recovery schema/service/monetary test and unrelated dirty geography/OCR/env-recovery/package artifacts. Preserve them except the explicitly superseded temporary legacy monetary assertion. No wholesale source schema copy.

## Post-recovery verification
The prior recovery rechecked all 13 source hashes above and its original HEAD. For this bounded candidate, the schema intentionally no longer matches the original mixed source hash because only the unrelated pending Article/stock cluster, reverse relations, enums and Company composite uniqueness were removed; the Presupuesto authority hunks remain. Target service, validator, source unit/static test, and both SQL files retain their recovery content; both SQL SHA-256 values remain exact and the artifacts were not executed during this recovery. Historical verification evidence #6145 remains authoritative and is not replaced by this static candidate review. All five route `git diff --no-index` comparisons previously returned no content difference; target route byte hashes differ because existing line endings were retained by in-place patches. SQL bytes were never normalized. Prior geography correction SHA pin remains historical evidence only and is outside this candidate.
