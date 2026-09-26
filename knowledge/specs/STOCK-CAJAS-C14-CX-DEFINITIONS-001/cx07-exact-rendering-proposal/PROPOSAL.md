# CX07 Exact Rendering Proposal — Corrected Size-Gate Stop

Status: **BLOCKED / TOPOLOGY SPLIT REQUIRED / NON-EXECUTABLE / NO ROOT**

## 1. Decision first

The independent FAIL is confirmed. The corrected 12-object CX07 rendering requires **380 fragment lines**. Under the approved P19 equation, the unsplit C14-16 child is exactly **396 lines**:

```text
3 provenance comments + 1 BEGIN + 380 fragment lines
+ 11 inter-object blank lines + 1 COMMIT = 396
```

`396 > 350`; therefore this revision stops before a root-bearing manifest, `hashes.sha256`, detached root, approval question, or adoption claim. The prior manifest, hashes file, and root `733b408e1f04305e78773ea45f06c57fb464326865e6ac4153b7b168b529b62b` are withdrawn and deleted. They must not be reviewed, approved, replayed, or used as authority.

No semantic or formatting compression is applied to force the corrected SQL through the gate. The corrected fragments remain non-executable line/object evidence for a separately reviewed topology amendment.

## 2. Exact authority lineage

| Authority | Exact scope used here |
|---|---|
| C04 | Engram #4318 revision 1 plus governing #4319 revision 2; independent PASS and approval closure #4321. Fixes StockEvidence/StockEvidenceLine fields, parent guards, and trace structures. |
| C05 | Engram #4324 revision 3; approval closure #4329. Allocates CX07 to C14-16 after S09; it does not supply SQL bodies. |
| J1 | `RECOMMENDED_PACKAGES.md` blob `0fd2959cd149d3c37b4162cdb2c232dd9dd35a71`; independent PASS #4764; explicit J1 approval #4767. Direct CX07 authority is shared algebra rules 3, 4, and 7 plus T02-R05..R08 and T05-R01..R12. |
| P3 | Same recommendation blob; explicit approval #4769. P3 governs only structural Cajas condition-projection validation and supplies **no CX07 predicate**. It is recorded for lineage completeness, not imported as trace authority. |
| Integrated D3 | Recommendation blob above plus `MATRICES_PROPOSAL.md` blob `4f8536560fd94ba0af92091739a333986ee75eee`; explicit approval #4771. It consumes J1 for cross-claim compatibility but adds **no StockEvidence trace-snapshot mapping**. |
| Addendum A / ISW2 | `a860049af04a6ff07fbe9fae6ddb512a8ef0adc8`; ISW2 `09408f21b209cda10068d60fe5ee546b460a3f06`. Own stable-anchor serialization and complete-command line-bijection/anti-bypass behavior outside the ordinary row trigger. |
| TEI / DT / PCA2 | TEI `237c7c5e18e4a3cf22d223c3d77b117efa400014`; approved DT blob `fdbdaa1da1fe97d4cac24ae347c94c6a3dff6947` (#4950); approved PCA2 blob `d4ec678a129e85dcfff75283b224395dc80368ff` (#4916). Used only for diagnostics, dependency targets/occurrences, and pending-candidate lifecycle. |
| C13 | Commit `0faf2f55e178f1b111c5ae108380a505a68c8feb`; `prisma/schema.prisma` blob `47313a8a85ac71ac56df93ce212593820cb95a13`. Supplies exact unmapped physical names and trace fields. |

## 3. Corrected trace-snapshot decision

For `ORIGINAL` and `CORRECTION` lines, the effective referenced position is `COALESCE(fromPositionId,toPositionId)` and the corrected parent guard now requires exactly one C13-backed trace arm:

| Position trace mode | Required line snapshots |
|---|---|
| `NONE` | `lotCodeSnapshot`, `expirationDateSnapshot`, `serialNumberSnapshot`, and `identifiedCodeSnapshot` are all null. |
| `LOT` | Position lot resolves through `StockLot.primaryObservationId`; `lotCodeSnapshot = StockLotObservation.displayLotCode`; expiration is null-safe equal to `StockLotObservation.expirationDate`; serial and identified snapshots are null. |
| `IDENTIFIED_UNIT` | Position unit resolves through `StockIdentifiedUnitCurrentConfiguration`; lot and expiration are null; serial is null-safe equal to current `serialNumber`; identified code equals current `internalCode`. |

`CORRECTION` still preserves base Article, reservation, stock unit, scale, source line, and position IDs, but its replaceable captured facts must satisfy the current referenced-position arm above. `REVERSAL` does **not** rebind mutable current trace facts: it retains exact null-safe equality to every base captured snapshot, as required by J1 rule 4.

This mapping uses existing C13 fields only. It adds no schema object, transfer arm, ANNULMENT arm, rounding behavior, or database-wide writer claim.

## 4. Exact corrected object and line evidence

| Ordinal | Object | Lines | Bytes | SHA-256 |
|---:|---|---:|---:|---|
| 1 | `check:ck_se_record_links` | 28 | 764 | `906eb2fa05ce1723c12905c8050d44a2e9c8de3e34cbc07020284d622599bf4b` |
| 2 | `check:ck_sel_qty_positive` | 5 | 125 | `b743a718b87d955ce6db638c2ccf11086768b7be8ddf196ae630068e3aa7af3b` |
| 3 | `check:ck_sel_scale` | 5 | 126 | `c0c82f336d5aa29b85f50d48df0c8bfa63b0c6b9bff7bc6e9d76fcd99a456198` |
| 4 | `check:ck_sel_position_shape` | 9 | 238 | `45cf49d9fa00e319139dbe16a7a46025665dd639d44ec7b01d3d22908d98d411` |
| 5 | `function:fn_stock_evidence_append_only` | 23 | 733 | `4aa68050e84d6752fa3d3066fa31cd53143b0737946fafcf7c95aecd61c71771` |
| 6 | `function:fn_stock_evidence_line_append_only` | 23 | 753 | `cb7527bcb97644597383e2920fb8e709c51adf353f63c04dd3f0dfc9219c9102` |
| 7 | `function:fn_stock_evidence_line_parent_guard` | 216 | 9689 | `1f298d80f103678fc048fdc117f0e1eaad5b57ea94daf3c2ed9b2d82822f82dd` |
| 8 | `function:fn_stock_quantity_scale_guard` | 55 | 2080 | `85466dd113eedbbdf804b5b57a1af2e4043ca803f2a5e83e85fb42e1efde802d` |
| 9 | `trigger:trg_stock_evidence_append_only` | 4 | 174 | `746450b19b6d13c134f3e38e7ff60d3ac0522dc9e27fcbdad2de34a42c7c8330` |
| 10 | `trigger:trg_stock_evidence_line_append_only` | 4 | 188 | `bca63befb3b3d0d906ea76bc185bad32a0e4267d432b555e862861a6dd88db45` |
| 11 | `trigger:trg_stock_evidence_line_parent_guard` | 4 | 190 | `de1e432b2b27fe5016db85dad0401fac291de70f987f52def93404f7f744bde7` |
| 12 | `trigger:trg_stock_quantity_scale_guard` | 4 | 178 | `30dd0e7944ef477fd5b46c3151a75e4723306025ba02f1533dc9c9e8d6f82398` |
|  | **Total fragments** | **380** | **15238** | — |

Class inventory remains exactly four CHECKs, four functions, and four ordinary triggers. Event inventory remains eight scalar events: append-only UPDATE/DELETE twice and ordinary-guard INSERT/UPDATE twice. Branch inventory remains six: two unconditional raises and two explicit `IS TRUE → RETURN NEW / ELSE → RAISE` pairs. Error inventory remains four TEI R0001 sites.

## 5. Complete DT per-occurrence source spans

Each byte span is half-open `[startByte,endByte)` over the exact corrected fragment. Arrays retain complete source order. EXECUTES targets are `GENERATED_OBJECT`; READS targets are `PHYSICAL_RELATION` with `COMPANY_EXACT` evidence in their owning predicates.

```json
[
  ["C14PY-CX07-0001","09-trigger-trg-stock-evidence-append-only.sqlfrag","EXECUTES","function:fn_stock_evidence_append_only",[[130,170]]],
  ["C14PY-CX07-0002","10-trigger-trg-stock-evidence-line-append-only.sqlfrag","EXECUTES","function:fn_stock_evidence_line_append_only",[[139,184]]],
  ["C14PY-CX07-0003","11-trigger-trg-stock-evidence-line-parent-guard.sqlfrag","EXECUTES","function:fn_stock_evidence_line_parent_guard",[[140,186]]],
  ["C14PY-CX07-0004","12-trigger-trg-stock-quantity-scale-guard.sqlfrag","EXECUTES","function:fn_stock_quantity_scale_guard",[[134,174]]],
  ["C14PY-CX07-0005","07-function-fn-stock-evidence-line-parent-guard.sqlfrag","READS","public.StockActivationBoundary",[[3601,3635]]],
  ["C14PY-CX07-0006","07-function-fn-stock-evidence-line-parent-guard.sqlfrag","READS","public.StockEvidence",[[229,253],[282,306],[2078,2102]]],
  ["C14PY-CX07-0007","07-function-fn-stock-evidence-line-parent-guard.sqlfrag","READS","public.StockEvidenceLine",[[506,534]]],
  ["C14PY-CX07-0008","07-function-fn-stock-evidence-line-parent-guard.sqlfrag","READS","public.StockIdentifiedUnitCurrentConfiguration",[[6855,6905]]],
  ["C14PY-CX07-0009","07-function-fn-stock-evidence-line-parent-guard.sqlfrag","READS","public.StockLot",[[6318,6337]]],
  ["C14PY-CX07-0010","07-function-fn-stock-evidence-line-parent-guard.sqlfrag","READS","public.StockLotObservation",[[6565,6595]]],
  ["C14PY-CX07-0011","07-function-fn-stock-evidence-line-parent-guard.sqlfrag","READS","public.StockPosition",[[6254,6278]]],
  ["C14PY-CX07-0012","07-function-fn-stock-evidence-line-parent-guard.sqlfrag","READS","public.StockReservation",[[8674,8701]]],
  ["C14PY-CX07-0013","08-function-fn-stock-quantity-scale-guard.sqlfrag","READS","public.StockPosition",[[444,468],[913,937]]],
  ["C14PY-CX07-0014","08-function-fn-stock-quantity-scale-guard.sqlfrag","READS","public.StockReservation",[[855,882]]]
]
```

The corrected graph has exactly **14 unique DT edges and 17 source occurrences**. Repeated `StockEvidence` and scale-guard `StockPosition` references are retained in source-order arrays and are not collapsed to one occurrence.

## 6. Proposed topology split boundary

This is a proposal only; it changes no approved topology.

| Proposed child | Predecessor / successor | Exact objects | Fragment lines | P19 projected lines |
|---|---|---|---:|---:|
| `C14-16A / CX07-A` | after C14-15; before C14-16B | Checks 1–4; append-only functions 5–6; append-only triggers 9–10 | 101 | `3+1+101+7+1 = 113` |
| `C14-16B / CX07-B` | after C14-16A; before current C14-17 | parent/trace and quantity/scale functions 7–8; guard triggers 11–12 | 279 | `3+1+279+3+1 = 287` |

The boundary is dependency-safe: each trigger stays with its function; A installs row-local/header and immutability objects; B installs all cross-row/trace/scale guards after A. No object is duplicated, renamed, omitted, or moved before S09. The combined inventory remains the same 12 identities and 14 DT edges.

Adoption requires a separately reviewed and Franco-approved topology amendment that replaces current C14-16 with the ordered pair and shifts downstream predecessor bindings without silently renumbering approved identities.

## 7. Stop boundary

No root-bearing manifest, hashes ledger, detached proposal root, authority tuple, migration, execution, database access, Prisma action, global-file edit, publication, deployment, staging, or production action is produced. After topology approval, each child requires its own exact manifest, occurrence arrays, hashes, detached root, independent PASS, and Franco approval. Until then, these corrected fragments and this size evidence are non-authoritative review material only.
