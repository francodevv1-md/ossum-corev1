# Four months vs whole 2026 — Contact + Article + Surgery only

**Recommendation:** first dry-run June 1–September 30, 2026 by `CIRFEC`, then **same pipeline** for remainder and separate `CIRFECCAR`-based open records. Four months are the last four surgery-date months with observed rows near backup 2026-09-29; a September 30 date is included by interval convention, not claimed already performed. Snapshot planned future October is excluded. Metric provenance: `core_closure.json.cohorts`, records excluding DBF deleted; distinct Contact codes are union of patient/doctor/institution/payer/commercial roles, NOT just patients; pending native matches unmeasured.

| Comparable cohort | Jun–Sep 2026 CIRFEC | Jan–Dec 2026 CIRFEC | Change |
|---|---:|---:|---:|
| Surgery | 581 | 1,193 | −612 (−51.3%) |
| FIN + REA by current status | 533 (488+45) | 1,086 (1,041+45) | −553 |
| Distinct Contact codes all roles | 857 | 1,545 | −688 (−44.5%) |
| Surgery rows with ≥1 core structural ERROR | 4 | 7 | −3; all missing patient in these cohorts |
| Surgery rows with ≥1 WARNING | 194 | 357 | −163; warnings can overlap errors |
| Warning missing type | 190 | 349 | −159 |
| Article **required** by Surgery schema | **0** | **0** | no dependency |
| Article codes only if optional stock references are preserved in report | 3,249 | 3,443 | −194 (−5.6%); 3 absent/ambiguous in each |

For a distinct **loaded** criterion, June–Sep (`CIRFECCAR`) has 1,195 Surgery / 1,521 Contact codes / 29 rows with errors / 850 with warnings; full loaded 2026 has 2,539 / 2,933 / 53 / 1,731. These cannot be added to CIRFEC counts because cohorts overlap. A full first operational wave must explicitly decide whether to include loaded-but-undated pending cases (1,378 loaded 2026 have blank CIRFEC).

Four months halves case and Contact review workload but does **not** simplify schema, tenant matching, date-only policy, legacy ledger or idempotence. Optional article catalogue hardly shrinks if stock references are in scope; for pure core Surgery, Article may be independently dry-run without importing one linked stock line. Since latest months have more REA/TRA/SCO, the subset is not automatically lower semantic risk; start with dry-run FIN/REA and report TRA/SCO as REVIEW. No stock/invoice volume is counted as core workload.
