# Change Pack — C14 External Projection Estimation

Status: **NOT READY — RUNNER, CX VECTORS, AND NO-NETWORK ENFORCEMENT REQUIRE A SEPARATE APPROVED BINDING ARTIFACT**
Change ID: `STOCK-CAJAS-C14-ESTIMATION-001`
Risk: **T3 — migration architecture and persistence-history estimation**
Mode: **docs/design only; non-executable and not eligible for execution approval in this revision**

This Change Pack freezes the deterministic portions of a possible later evidence run and incorporates independent FAIL report #4736. It intentionally does not freeze executable runner bytes, evidence-derived CX vectors, or an enforceable no-network mechanism; therefore it remains **NOT READY** and cannot receive execution approval. Authoring or acknowledging this document does not authorize an external run, migration authoring, accepted SQL, database access, or any repository change other than this document. Preparation and intended execution were discussed in Engram #4732; exploration #4733 and verification #4736 require the remaining exact machine-readable bindings. The governing topology is the independently closed artifact `STOCK-CAJAS-C14-TOPOLOGY-AMENDMENT-001`, final blob `b8608a922d2d9adf5d776673252f709c52d4a518`, closure #4730.

## 1. Decision and authority boundary

Only after the supplemental binding artifact in §10 is independently accepted and incorporated into a newly reviewed revision may Franco be asked to approve one external-only estimation run that:

1. materializes immutable raw `S00..S24` inputs and deterministic projected `P00..P24` schemas;
2. formats and validates 25 external projections;
3. emits 24 raw Prisma schema-to-schema SQL diffs as external evidence only;
4. estimates exactly 13 customized children (`CX01..CX13`) from one approved line-cost catalog;
5. produces operation, count, no-op, split, hash, command-capture, and repository-guard evidence; and
6. retains the complete external evidence tree for independent review.

The run is not implementation. Its SQL stdout is unaccepted estimator evidence and may never be copied, transformed, hand-pruned, staged, or treated as a migration body under this approval.

## 2. Frozen provenance

### 2.1 Final C13 and toolchain

| Evidence | Frozen identity |
| --- | --- |
| Final C13 commit / parent | `0faf2f55e178f1b111c5ae108380a505a68c8feb` / `609aea48ccc6910aa864b09f324030f06010d4aa` |
| Final tree / schema blob | `a967f808fdc0a7662d7ce45b472301422210038a` / `47313a8a85ac71ac56df93ce212593820cb95a13` |
| Final schema raw SHA-256 / bytes | `32f6e414ccfe315ea1338d37badbc92db8255ae278211b09be1c7c3a78fdafb7` / `192607` |
| Canonical migration tree | `5c6e4b9e6e4e7fd5a632d3fb68a2dc161f62ad9c` |
| Canonical migration inventory | exactly 18 immutable migration SQL files plus `migration_lock.toml`; zero Stock/Cajas objects |
| Final scoped C13 Stock/Cajas projection inventory | 50 models / 20 enums / 206 FKs / 159 inverses / 151 uniques / 63 indexes; not the whole repository Prisma inventory |
| `package.json` Git blob / raw SHA-256 / bytes | `cb9ab0d7910f4e1b74ccf62b93098ad710fde5e0` / `c0ca25dbc959c3487be4df2efbc8390f44b735a58446186b5296eff0888acd38` / `4412` |
| `package-lock.json` Git blob / raw SHA-256 / bytes | `6f9d004d10d00b6f6219eddd4b238736a56e852a` / `e1d0056af65a849290caea24ff7159844c23f4faa2785a0d087ec2cc3e06d593` / `653272` |
| Absolute Node executable | `C:\Program Files\nodejs\node.exe`; version `25.2.1`; `91673600` bytes; SHA-256 `91ec09dda8f20556f366110859f106ab189d45f8f6a2bd092e6785174ad4a0fa` |
| Absolute Prisma CLI JS | `E:\OSSUM_COR_PROJECT\node_modules\prisma\build\index.js`; `2662793` bytes; SHA-256 `0367633ed980170cac67d10f9c4fecbc495806d3465af2bf5b8018bf1232470d` |
| Prisma package identity | installed `prisma` `7.8.0`; `package.json` `5502` bytes / SHA-256 `d98a88695435d693b66c27d9e8e1b083fc5e544890ce2bdfe755b9f90846e35b`; `bin.prisma=build/index.js` |
| Prisma lock identity | `node_modules/prisma` version `7.8.0`; integrity `sha512-yfN4yrw7HV9kEJhoy1+jgah0jafEIQsf7uWouSsM8MvJtlubsk+kM7AIBWZ8+GJl74Yj3c+nbYqBkMOxtsZ3Lw==` |
| Prisma client identity | installed `@prisma/client` `7.8.0`; package `8511` bytes / SHA-256 `a64669ec1b457f2651b3de564db6b9604e89460cb349641afffa73b0bbf3939a`; lock integrity `sha512-HFp3Dawv/3sU3JtlPha90IB+48lS7zHiH4LKZPjmcE8YH5P9DOXGPvo8dqOtO7MqLDd1p2hOWMcFlRT1DMblHw==` |
| Prisma engine identity | engine hash `3c6e192761c0362d496ed980de936e2f3cebcd3a`; `schema-engine-windows.exe` `20978176` bytes / SHA-256 `29c2811f9918e84e38e8d166726bdaceeea7aa58d62398fdb0761d8ea2b08c8e` |
| Corroborating `.cmd` shim only | `E:\OSSUM_COR_PROJECT\node_modules\.bin\prisma.cmd`; `326` bytes; SHA-256 `318295660573ab116b8d6ca312c716ddbe4d3544c6ea7928ccd3871d0933e600`; never executed |
| S00 provenance | commit `02a50044d879248236805bb47b5782845a5f5bd8`; schema blob `a92e6c2a42b70685e8d2e9076313f1b064858034` |
| Quarantine introduction | commit `08d45fd24a454eba92c8714d840b1bbbdc696955`; there is no clean historical schema representing the canonical 18-migration state |

The runner must verify every identity before creating the external root. A different package/lock blob, resolved Prisma version, engine hash, snapshot blob, final tree, migration tree/count, or canonical Stock/Cajas absence is a hard stop. Git blobs are authoritative provenance; raw SHA-256 values are transport-integrity bindings.

### 2.2 Immutable snapshot chain

| Snapshot | Commit | Schema blob |
| --- | --- | --- |
| S00 | `02a50044d879248236805bb47b5782845a5f5bd8` | `a92e6c2a42b70685e8d2e9076313f1b064858034` |
| S01 | `c93119f21fb90e7eed8c96152c85667b2cccdea7` | `163f0ebce9623a2bdd47b347ede7cc57f58b2d5c` |
| S02 | `bac87f4edad8e8f6735377abe7d62739200de5c1` | `99f0841bb77a10993c679d715d24da9e6b4ce203` |
| S03 | `2b8285584c12d8e8fcc9726dd88601c162523990` | `430d74f3697ec9e39abbeae27bb3894753f8acfc` |
| S04 | `604347ecd7859bd316d036f60a69777734d4b4b5` | `afe5e552387fc801bfe7fc23db86fbac4de7e125` |
| S05 | `cf85099786c5839d24a7e64149daa2f7c3acfe24` | `0f751eaf9eab6ccb2a016a235ad59ef4867eff04` |
| S06 | `66165aefa077073335e9821fd10752cfc1c37e59` | `2433f98922be3684efd512ad0515adbd4621dc73` |
| S07 | `0fc8f326345bc5b477c28e7dfc9095c5a8f9fc44` | `eeb2d8510dced1e51a6922e62657204d3020395e` |
| S08 | `1a116002c83adaee1e9864ab0e34e4212ff390ee` | `17cef1f796f8bba68330de0b3c3880164cb5c137` |
| S09 | `2ffb60aae18985d1f1d13094c290906c3105de99` | `7224292c3c34f094fa8eed617f37291675ed35d9` |
| S10 | `ee8d9e4fb4465984b2832fb4b044f4c73eab13ae` | `e920c20a69e249c10a3cab5c76185501225a1446` |
| S11 | `849f4938d6e62e5e0b5a41e2fcaa241e4c2980c2` | `e770fe98de1439e963175b24512c14abe4ed39d7` |
| S12 | `93c9b72758954ad5f1ac9ed8567fc3462fa847cf` | `ed45d81b89c7ea448497a4cde01539c2f7d91490` |
| S13 | `77326b249cfe8ba580a39b2b2011b7d68bcb3599` | `988f72cb688b5aa6d1c4de5340ec9887dcfffad0` |
| S14 | `156d82d2916c43f878782cabb17d4623aba5bee1` | `df5a2ab5ec94027a2a873b0a4a97e12dd2405e05` |
| S15 | `980194449633c927eb22e20dec4467aba7f1c95b` | `b68cb2676253636234e2ef2d7a6aa47d659f01e5` |
| S16 | `b8fc9e667ec6901178ba1274d897c007a698482a` | `ec170b6fbd65238d0e465ab105458bf472e4372e` |
| S17 | `ab444b61b585a49149994acb4338f44a16996365` | `6a2fa2f6c1a6044a2fa3bcc9cfa455719638bb76` |
| S18 | `abf1bd27a86a44facde580b39496c1bfb655fa91` | `4bf945809f476d20ed8303dff30bb6fa1778853a` |
| S19 | `cb4b0e5c9bd19dada42a1fcd9c8d29be89e56f19` | `d08d3a35ae3fec4cf1641255b51adbdd672b0806` |
| S20 | `406c86b33750e76cba937f305725b4960fdbfa5f` | `0697da95236ccfc35128db626c0ac82c2cf637b3` |
| S21 | `53f9d0ff5863224856ed9871f5986663cfbf4713` | `751ef97e7e41d16dc7976ac544e0be97159b5e1c` |
| S22 | `fa6a200783f451ff6b61218987c22188d5341766` | `48ac493f53e12bd672d0f9d9aae0e257ed2638d3` |
| S23 | `609aea48ccc6910aa864b09f324030f06010d4aa` | `af7e0c6ca32bf5efba3f11f42e92c55dab8944ca` |
| S24 | `0faf2f55e178f1b111c5ae108380a505a68c8feb` | `47313a8a85ac71ac56df93ce212593820cb95a13` |

## 3. Full projection manifest

### 3.1 Normalization and row semantics

The hashes below are SHA-256 over the S00 declaration extracted from its top-level keyword through its matching closing brace, after CRLF/CR→LF conversion, removal of trailing horizontal whitespace on every line, removal of leading/trailing blank lines, and addition of exactly one terminal LF. A field hash uses the same rule after trimming its leading indentation. `acceptedFrom` means the first snapshot whose declaration is an accepted replacement, not that the quarantined S00 body is executable. `never` means absent from every projection.

The later runner must parse these JSONL rows and reproduce all hashes from raw S00. A count, name, hash, target, or stage mismatch stops before formatting.

### 3.2 S00 quarantine models — exactly 32

```jsonl
{"name":"CajasArticleReference","sha256":"f4a2652f90042415491521ba561bdd7f3d36e8ac75b91e662706733a5199d813","disposition":"never"}
{"name":"CajasStockScopeReference","sha256":"94cf9dccad3ebae2890cc86cf699dbc5f56a5e29d8f3c6e2fac9722b6707c771","disposition":"never"}
{"name":"CajasStockRecordReference","sha256":"1424d42a4602d96e14eefd10420145bae9d5e47af569a933277b17f224771f3c","disposition":"never"}
{"name":"CajasBoxFormula","sha256":"af3549fe55ccedf3d5d701a9cefd1a166a1b6ed51ccf77fab037bc62ce0c04ee","disposition":"accepted","acceptedFrom":"S12"}
{"name":"CajasFormulaCurrent","sha256":"a1e8f7c6798613f73ee0db93ac4d4d010c3417df9e36a271621d51aec389cb42","disposition":"never"}
{"name":"CajasFormulaVersion","sha256":"0019382370ce34fabdb437a61e90533147f27c0764341ff40247c170fff2c9b8","disposition":"accepted","acceptedFrom":"S12"}
{"name":"CajasFormulaLine","sha256":"40f900e552373422e21ccbfb9d2e030c539967cdb36924aed245a3eab119da3b","disposition":"accepted","acceptedFrom":"S12"}
{"name":"CajasAssignment","sha256":"248872762050cc865bdf141cc2c7395c4897d6fd985789466e0153ced0c9f459","disposition":"accepted","acceptedFrom":"S13"}
{"name":"CajasPreparation","sha256":"4d05440119bf24c360d94fc807c8470d32d0bc07996a39fb62da7a5c9826f3e3","disposition":"accepted","acceptedFrom":"S13"}
{"name":"CajasPreparationLine","sha256":"e26cd790a7b1d9d2900ccd54ecb8624c325fa88d60140ce3d05ea5acaf3bfc35","disposition":"accepted","acceptedFrom":"S13"}
{"name":"CajasReservationCorrelation","sha256":"c10aa305e191b57e823d7a1255f2ee503dc57da6d9d9cd93526733bdb125db42","disposition":"accepted","acceptedFrom":"S14"}
{"name":"CajasControl","sha256":"d708b23e3c8aa4154df6a7d79a79e07c4531ca5a202de9b213a0434e7dbd36a1","disposition":"accepted","acceptedFrom":"S15"}
{"name":"CajasControlLine","sha256":"f5906650801b06d40fbbc00759d89a010f3929c26e609d207b980e186a57e93d","disposition":"accepted","acceptedFrom":"S15"}
{"name":"CajasCompositionChange","sha256":"f31d7e27013086846cf37218cadb63860d4a0dda16a0a13b4cf4e0bca6a6bb8c","disposition":"accepted","acceptedFrom":"S16"}
{"name":"CajasCompositionChangeLine","sha256":"0ba0f73c87864b0a36f78fdae92b3a4150d90f8d6b460478c21bb6e141d937fb","disposition":"accepted","acceptedFrom":"S16"}
{"name":"CajasDifference","sha256":"a8827145035488a012237786533a80980d9cc3a010a5a5873d9172b7f04c9be9","disposition":"accepted","acceptedFrom":"S16"}
{"name":"CajasDifferenceResolution","sha256":"dcb5417ce2644f3a002db6aba5763ce5600ae595623049a0c0bdc1cebe9cdd12","disposition":"accepted","acceptedFrom":"S16"}
{"name":"CajasDispatch","sha256":"be947f3855af1a65b2699f6d3dd64576190cf4123bf3181f8b3de15aad115c4a","disposition":"accepted","acceptedFrom":"S17"}
{"name":"CajasDispatchLine","sha256":"831e400339614877a0caff34178396e977c63e19026e5b6c454ccc92e735c087","disposition":"accepted","acceptedFrom":"S17"}
{"name":"CajasDispatchAccounting","sha256":"94d46f78698f14316c2cd827f63679b8e8bd7b8a82c1c80e1e06f8eae2081413","disposition":"accepted","acceptedFrom":"S18"}
{"name":"CajasDispatchLineAccounting","sha256":"80cb28e657f4124d01798c3ebf78b1e4b5dbbcce434fdc4de4266e9df0e6a0e3","disposition":"accepted","acceptedFrom":"S18"}
{"name":"CajasDisposition","sha256":"237676753c0820d681acf9725a87a3a0d6d92a62c27902cf716cf6bfa8d8c3fd","disposition":"accepted","acceptedFrom":"S21"}
{"name":"CajasReturnConfirmation","sha256":"c0f48573090cbc2a799541464460a178e72c02c6fad9f77385edbdaeafdbbcce","disposition":"accepted","acceptedFrom":"S19"}
{"name":"CajasReturnLine","sha256":"16bf9b36557a26951ffc2008621bdc0571750e367cfa1f1c48787944fd9033fb","disposition":"accepted","acceptedFrom":"S19"}
{"name":"CajasReplacementPair","sha256":"85daa733c4b7cce9c746589ace13da689f8643d48353c14517739cb12ffb6b55","disposition":"accepted","acceptedFrom":"S19"}
{"name":"CajasConsumptionConfirmation","sha256":"d7e7bb852b4b1d79c0517c684f25494fcf8b391b358fc368ef3d7054faf9e9a5","disposition":"accepted","acceptedFrom":"S20"}
{"name":"CajasConsumptionLine","sha256":"fd41aa284a520a080535d88dc35cc3a1ce8e8a0081b44efc2346dd2982a46c1e","disposition":"accepted","acceptedFrom":"S20"}
{"name":"CajasConditionProjection","sha256":"335f7ff5e9e36c04d9d0f9e33fcc51a5b301e17b1745506619452539404fe27b","disposition":"accepted","acceptedFrom":"S21"}
{"name":"CajasCommandAcceptance","sha256":"3015fadc2cb5515d0889a8e8d0572d5f85f650014f68932085f973df0bf52aa6","disposition":"never"}
{"name":"CajasCommandEffect","sha256":"722d37b690d22028b126a351c2dd86b1c24d30ef247b18f3e69f3ede7e9464ae","disposition":"never"}
{"name":"CajasCommandAttempt","sha256":"388d67b20ebff2f880e1e711a5eea1ec4f594e27c808c09b8e5cf9cf6c9e60f2","disposition":"never"}
{"name":"CajasProjectionReconciliation","sha256":"ef54131eeec411f629754a90acf09ee61e01fe7f85bc73f5dc71b1b86b898fac","disposition":"never"}
```

Accepted stage sets reconcile to exactly 24: `S12={CajasBoxFormula,CajasFormulaVersion,CajasFormulaLine}` (3), `S13={CajasAssignment,CajasPreparation,CajasPreparationLine}` (3), `S14={CajasReservationCorrelation}` (1), `S15={CajasControl,CajasControlLine}` (2), `S16={CajasCompositionChange,CajasCompositionChangeLine,CajasDifference,CajasDifferenceResolution}` (4), `S17={CajasDispatch,CajasDispatchLine}` (2), `S18={CajasDispatchAccounting,CajasDispatchLineAccounting}` (2), `S19={CajasReturnConfirmation,CajasReturnLine,CajasReplacementPair}` (3), `S20={CajasConsumptionConfirmation,CajasConsumptionLine}` (2), and `S21={CajasDisposition,CajasConditionProjection}` (2). The exactly eight never-executable identities are `CajasArticleReference`, `CajasStockScopeReference`, `CajasStockRecordReference`, `CajasFormulaCurrent`, `CajasCommandAcceptance`, `CajasCommandEffect`, `CajasCommandAttempt`, and `CajasProjectionReconciliation`.

### 3.3 S00 Cajas enums — exactly 14

`referencedFrom` is the earliest accepted projected model that references the enum. The seven `never` enums are final legacy enums and must be absent from every `Pn`.

```jsonl
{"name":"CajasStockScopeKind","sha256":"ed57f4a605720024735918fb80620f1bae847df40580d32164f4935ada334290","disposition":"never","rule":"exclude-all"}
{"name":"CajasStockRecordKind","sha256":"d5a07592f1b2af3e3dc2c59a76b5dcc43f3936a2f918c4fb5ababbbccee3966b","disposition":"never","rule":"exclude-all"}
{"name":"CajasLineRole","sha256":"8907a2a352f830011fa0e47a1e02a194470329ae178f63d3a3e382adf8640265","disposition":"referenced","referencedFrom":"S13","targets":["CajasPreparationLine","CajasControlLine"],"rule":"include-iff-retained-target-references"}
{"name":"CajasControlKind","sha256":"963401ae8ba3a3a3a522b5a22ddc44dd0c46b03c3187f5390ace009241d34db4","disposition":"referenced","referencedFrom":"S15","targets":["CajasControl"],"rule":"include-iff-retained-target-references"}
{"name":"CajasControlResult","sha256":"41484b2041395b5254a26651b75ec0db3ad8fd91f81d5723bbdc52497e4c0d0d","disposition":"referenced","referencedFrom":"S15","targets":["CajasControl","CajasReturnConfirmation"],"rule":"include-iff-retained-target-references"}
{"name":"CajasChangeKind","sha256":"52028e2e027a3415dbdb6b7f326f08aeb20e9f9c5476b47b89a2e4f47d7e0cb2","disposition":"referenced","referencedFrom":"S16","targets":["CajasCompositionChangeLine"],"rule":"include-iff-retained-target-references"}
{"name":"CajasEvidenceRecordKind","sha256":"42e8c4e6bbf5bb55eccf86ec7b6e52c236f2ad988e6b7a7efb39e958f5f7ac5b","disposition":"never","rule":"exclude-all"}
{"name":"CajasDispositionKind","sha256":"c05cc4a1d885c35caf4aea5489520644e5cd71bafe579d820d3bac70ac8e18b4","disposition":"referenced","referencedFrom":"S21","targets":["CajasDisposition"],"rule":"include-iff-retained-target-references"}
{"name":"CajasReturnLineKind","sha256":"b1de7516d22eb35e3ee6d0f5ff4ac3e205417bd39b31290642c3a462ec35ed69","disposition":"referenced","referencedFrom":"S19","targets":["CajasReturnLine"],"rule":"include-iff-retained-target-references"}
{"name":"CajasCurrentCondition","sha256":"e4fd6e9486dfcc9a8a44fe3a284c090562bf4fb718fdedc5bccefe8df921835b","disposition":"referenced","referencedFrom":"S21","targets":["CajasConditionProjection"],"rule":"include-iff-retained-target-references"}
{"name":"CajasCheckpoint","sha256":"e57d7aa66a67e71b094c2fc8b6bde61a558ae90019cbeae0f2dd72ce25f6e287","disposition":"never","rule":"exclude-all"}
{"name":"CajasAttemptOutcome","sha256":"d8aaeedb62641cc29bdf36ea5f69f79a386842cbaff951272e896ae8608bfdf1","disposition":"never","rule":"exclude-all"}
{"name":"CajasProjectionKind","sha256":"ef2c276c04a8ad39314052ee6077654a57c79ee92a15d6e5acbfa47d3aac89bb","disposition":"never","rule":"exclude-all"}
{"name":"CajasReconciliationResult","sha256":"019a2c936742ff05c1d96b6a1d2d076a0c23411bd0e0a59aea550489448d1897","disposition":"never","rule":"exclude-all"}
```

### 3.4 S00 quarantine inverse fields — exactly 57

Each row's rule is `include-iff-target-retained`; `from` is the target model's accepted stage or `never`. The declared type supplies the exact relation target after removing `[]` or `?`.

```jsonl
{"owner":"Company","field":"cajasArticleReferences","type":"CajasArticleReference[]","target":"CajasArticleReference","sha256":"552d0c6b1e7ae2cec4f6c9aa75415abd4f16a24d7ec88eb8ea04bf5035b79b8b","from":"never"}
{"owner":"Company","field":"cajasStockScopeReferences","type":"CajasStockScopeReference[]","target":"CajasStockScopeReference","sha256":"3324cd9d36d55be798880f79e694be32d29a53525d661b65970ba4a049823509","from":"never"}
{"owner":"Company","field":"cajasStockRecordReferences","type":"CajasStockRecordReference[]","target":"CajasStockRecordReference","sha256":"15c21a3e6e1b94374943af03245599eee158422d8ca71715b6254d67a118e3e3","from":"never"}
{"owner":"Company","field":"cajasBoxFormulas","type":"CajasBoxFormula[]","target":"CajasBoxFormula","sha256":"67f54851c3a4a22b2589f56e7ae89ed79863b7fbd70d3fdc2bae148ae3d167aa","from":"S12"}
{"owner":"Company","field":"cajasFormulaCurrents","type":"CajasFormulaCurrent[]","target":"CajasFormulaCurrent","sha256":"b9a91d4ccee6164c653a07646b77ae8899697525798a1fb6ffbf647d5ba6d149","from":"never"}
{"owner":"Company","field":"cajasFormulaVersions","type":"CajasFormulaVersion[]","target":"CajasFormulaVersion","sha256":"ee0f8da01163c56c3649d8e981c9e49b29e09d90bf80a8c0e4bfe4042683d748","from":"S12"}
{"owner":"Company","field":"cajasFormulaLines","type":"CajasFormulaLine[]","target":"CajasFormulaLine","sha256":"5c75085e7b7ef37d7a4812f09eb376cf828cf57a040acb35992dec66d4f8794c","from":"S12"}
{"owner":"Company","field":"cajasAssignments","type":"CajasAssignment[]","target":"CajasAssignment","sha256":"1a68c9c256b548ad8646760569ef8f92a4d4cbcca346358fed9f9494c8feea7b","from":"S13"}
{"owner":"Company","field":"cajasPreparations","type":"CajasPreparation[]","target":"CajasPreparation","sha256":"93bb9443ceec6e55b3f3f7c839d590fa8517228971a19603f796f65ada22c841","from":"S13"}
{"owner":"Company","field":"cajasPreparationLines","type":"CajasPreparationLine[]","target":"CajasPreparationLine","sha256":"8ac298aea60321205b8035c258cdec73acfdf4e8b42e52dfb3e85eaba6709394","from":"S13"}
{"owner":"Company","field":"cajasReservationCorrelations","type":"CajasReservationCorrelation[]","target":"CajasReservationCorrelation","sha256":"f21553057af7ca4c4c59d37db1f7414da6f37d81765f623bfdaa6e15468b9a5e","from":"S14"}
{"owner":"Company","field":"cajasControls","type":"CajasControl[]","target":"CajasControl","sha256":"c81b39702bb77b8f1b8ce92a6165e10451e1f94e5e317666cb2277127d916bf4","from":"S15"}
{"owner":"Company","field":"cajasControlLines","type":"CajasControlLine[]","target":"CajasControlLine","sha256":"3874f574accdd5c8496a2be501522840ef0414ad9eec6f0b34a47c44e1fe7029","from":"S15"}
{"owner":"Company","field":"cajasCompositionChanges","type":"CajasCompositionChange[]","target":"CajasCompositionChange","sha256":"a17b868d8b624aa59b252e7dd93ead457f3f0e091fb0c596ef78af639e2187fe","from":"S16"}
{"owner":"Company","field":"cajasCompositionChangeLines","type":"CajasCompositionChangeLine[]","target":"CajasCompositionChangeLine","sha256":"7a9e2e93913e342a5eb59525fac0d284c95d0bc5f6f2780a01e717f050b90512","from":"S16"}
{"owner":"Company","field":"cajasDifferences","type":"CajasDifference[]","target":"CajasDifference","sha256":"6d6f255276b1a35b7f9d5c8de1877f8f46a3f446aa2ed5046cde1d9c5e6317b7","from":"S16"}
{"owner":"Company","field":"cajasDifferenceResolutions","type":"CajasDifferenceResolution[]","target":"CajasDifferenceResolution","sha256":"d2c6775c4462589ac5056c9fce480af7d8d39d5782a2a0eafec7ade7a2bb9620","from":"S16"}
{"owner":"Company","field":"cajasDispatches","type":"CajasDispatch[]","target":"CajasDispatch","sha256":"3366aded024066bdbb14ab638d91a54aaf16e8f0216effdc1dc1f9f295e3b5e5","from":"S17"}
{"owner":"Company","field":"cajasDispatchLines","type":"CajasDispatchLine[]","target":"CajasDispatchLine","sha256":"4c57f3d286218cd27fb94bb0d47bf2d4d313dd926c005302d930d4891eadfdab","from":"S17"}
{"owner":"Company","field":"cajasDispatchAccountings","type":"CajasDispatchAccounting[]","target":"CajasDispatchAccounting","sha256":"69eb21d81fe2f5680efdea78a1b3bbbbdf01eb7be9a6c30964588fdfe037117e","from":"S18"}
{"owner":"Company","field":"cajasDispatchLineAccountings","type":"CajasDispatchLineAccounting[]","target":"CajasDispatchLineAccounting","sha256":"8c637b941dd82b5797fed8698366398f4e0ae0fdd413c8ac7ba51b6ce2f93f9b","from":"S18"}
{"owner":"Company","field":"cajasDispositions","type":"CajasDisposition[]","target":"CajasDisposition","sha256":"9537ae1b78ecba9460089725204d726122ec9d53900c8025c2323631c22c208a","from":"S21"}
{"owner":"Company","field":"cajasReturnConfirmations","type":"CajasReturnConfirmation[]","target":"CajasReturnConfirmation","sha256":"c55e566a61351ee6a691f4c46eb232c01201af6515dca99583c1b65c8687fa73","from":"S19"}
{"owner":"Company","field":"cajasReturnLines","type":"CajasReturnLine[]","target":"CajasReturnLine","sha256":"053240e5f54cb6e3f7bc97d8b7da7582ec7746c0a01a555e74d2db1832a290df","from":"S19"}
{"owner":"Company","field":"cajasReplacementPairs","type":"CajasReplacementPair[]","target":"CajasReplacementPair","sha256":"e91132db07ceb52dffccc084f5d467a60fa1ec67ada8c427a4df5d4b8fc6adad","from":"S19"}
{"owner":"Company","field":"cajasConsumptionConfirmations","type":"CajasConsumptionConfirmation[]","target":"CajasConsumptionConfirmation","sha256":"6c9fd6af5056930cebadc013fd2897d5258e85e756205368c0ebe3ba1d08a11f","from":"S20"}
{"owner":"Company","field":"cajasConsumptionLines","type":"CajasConsumptionLine[]","target":"CajasConsumptionLine","sha256":"209f0d07dd0f9f4355ac0336ad94cd39bd7d1ad4da1431b9c83caae655b218d4","from":"S20"}
{"owner":"Company","field":"cajasConditionProjections","type":"CajasConditionProjection[]","target":"CajasConditionProjection","sha256":"4748a441249d8ce0635a39610d9a7ee80dfa585a5337ab747401402277cde958","from":"S21"}
{"owner":"Company","field":"cajasCommandAcceptances","type":"CajasCommandAcceptance[]","target":"CajasCommandAcceptance","sha256":"2a6aac1a136f59c2845f0034b267b141c7aca81c2e2b187dbccc4ecf6b20556b","from":"never"}
{"owner":"Company","field":"cajasCommandEffects","type":"CajasCommandEffect[]","target":"CajasCommandEffect","sha256":"a5b663e28a41ad14a267e16184a9c1f7c18265ffd5de6fc0a08c3fd83dc040b2","from":"never"}
{"owner":"Company","field":"cajasCommandAttempts","type":"CajasCommandAttempt[]","target":"CajasCommandAttempt","sha256":"b1dcfefc2e6e2a9bc904b0d0eca08952fb381208f66d262a9bcf4161e2df4348","from":"never"}
{"owner":"Company","field":"cajasProjectionReconciliations","type":"CajasProjectionReconciliation[]","target":"CajasProjectionReconciliation","sha256":"0ab1bc585e9de0d4dad53058afd9672806ac208be441765c5fe783d562b8b5d3","from":"never"}
{"owner":"User","field":"verifiedCajasArticleReferences","type":"CajasArticleReference[]","target":"CajasArticleReference","sha256":"c9124642a9f61519f4cb6ccf38f32be1a76dbeec918621e48946ff77df035cd3","from":"never"}
{"owner":"User","field":"verifiedCajasStockScopeReferences","type":"CajasStockScopeReference[]","target":"CajasStockScopeReference","sha256":"fd2f50c330e53bc30330691fb32320dc0406d3aa110a0ac6640a45e98ffd78c2","from":"never"}
{"owner":"User","field":"verifiedCajasStockRecordReferences","type":"CajasStockRecordReference[]","target":"CajasStockRecordReference","sha256":"f5014cb1cc928aca1229e47581c7563231622adb8e258c726ac34b1b0c51536a","from":"never"}
{"owner":"User","field":"acceptedCajasFormulaVersions","type":"CajasFormulaVersion[]","target":"CajasFormulaVersion","sha256":"5965e685b7509f98c1cbc844efdbc2411b425cfdf0a8421d65e188fd1a63cdd2","from":"S12"}
{"owner":"User","field":"startedCajasAssignments","type":"CajasAssignment[]","target":"CajasAssignment","sha256":"6cb2daabab4b40b4b8a1a499bf8fd9fd3afa28f0bce98c48eb44f385a650a9ed","from":"S13"}
{"owner":"User","field":"endedCajasAssignments","type":"CajasAssignment[]","target":"CajasAssignment","sha256":"f18d05c3bd1660e915bde650d01db26620e3f08faf566a5d28529fb7cdf092ee","from":"S13"}
{"owner":"User","field":"acceptedCajasControls","type":"CajasControl[]","target":"CajasControl","sha256":"e8e059163ba88a480f649bfe3c0f40a1dc61f1b7b4b7f77359958e92d6bd3bd7","from":"S15"}
{"owner":"User","field":"acceptedCajasCompositionChanges","type":"CajasCompositionChange[]","target":"CajasCompositionChange","sha256":"60fdd92ecd1afdd8e4c96786ec04683ea649e2378c057d814fc0c949963f4ee0","from":"S16"}
{"owner":"User","field":"openedCajasDifferences","type":"CajasDifference[]","target":"CajasDifference","sha256":"8a38216da58ea63c0a62d2327ec4eb610b9aebfb1266882b6da0e8ac5c15a674","from":"S16"}
{"owner":"User","field":"acceptedCajasDifferenceResolutions","type":"CajasDifferenceResolution[]","target":"CajasDifferenceResolution","sha256":"30e71c78bee7bdbf47a9816e4466ca5f9fa1d858ff3094dbe3c9eee5ba0ba5a1","from":"S16"}
{"owner":"User","field":"acceptedCajasDispatches","type":"CajasDispatch[]","target":"CajasDispatch","sha256":"237cf5553d266475b30aede068d7977fcfb774a56e0bead0b60de686ff358db7","from":"S17"}
{"owner":"User","field":"acceptedCajasReturnConfirmations","type":"CajasReturnConfirmation[]","target":"CajasReturnConfirmation","sha256":"699e16b308c0d9eeb4f6e63c2c6656c2753452bdfbcd7bd351ae385cb136735e","from":"S19"}
{"owner":"User","field":"acceptedCajasConsumptionConfirmations","type":"CajasConsumptionConfirmation[]","target":"CajasConsumptionConfirmation","sha256":"efd29bc783bfb9525beb122e85c9e18da133371a3c42ab0fa2d7b3e8d8e92037","from":"S20"}
{"owner":"User","field":"acceptedCajasCommands","type":"CajasCommandAcceptance[]","target":"CajasCommandAcceptance","sha256":"e7fa87aa330ecaea08c3e878f37d13bc1f9cd1d5a5d8da5187ce3cae68e4e2b6","from":"never"}
{"owner":"User","field":"cajasCommandAttempts","type":"CajasCommandAttempt[]","target":"CajasCommandAttempt","sha256":"7890c6dc3b19234682394066eceeb5f76abb03d19525bb726b24bd16e170bb1f","from":"never"}
{"owner":"User","field":"cajasProjectionReconciliations","type":"CajasProjectionReconciliation[]","target":"CajasProjectionReconciliation","sha256":"2f9bf56794b51127666aec0d3c4b5f8cbba5e421b45b82136037107a48e047c7","from":"never"}
{"owner":"Surgery","field":"cajasAssignments","type":"CajasAssignment[]","target":"CajasAssignment","sha256":"1ea69ca634ec7dfa9b0e0f816195ade245cac6db851952b10c5953cc13ae5175","from":"S13"}
{"owner":"AuditEvent","field":"cajasAcceptedCommand","type":"CajasCommandAcceptance?","target":"CajasCommandAcceptance","sha256":"6259e2cba9a35ef296088aabe1da6106618582208ed5fec4f1f85e7271602682","from":"never"}
{"owner":"AuditEvent","field":"cajasCommandAttempts","type":"CajasCommandAttempt[]","target":"CajasCommandAttempt","sha256":"45a0681b78d48763237359588df4fc57d929ac73204a5980e1f0845f97dc7272","from":"never"}
{"owner":"Remito","field":"cajasDispatches","type":"CajasDispatch[]","target":"CajasDispatch","sha256":"eebf9c3e05eec773aa08294cdc774c31ca2eac841d18b23b0e13f08231851971","from":"S17"}
{"owner":"RemitoItem","field":"cajasDispatchLines","type":"CajasDispatchLine[]","target":"CajasDispatchLine","sha256":"811c82cfd8501b160464798dc80c8261320835922348a53f07ec3e542b799d4c","from":"S17"}
{"owner":"Consumo","field":"cajasConsumptionConfirmations","type":"CajasConsumptionConfirmation[]","target":"CajasConsumptionConfirmation","sha256":"68137b08430ed7e116fc13ab35618bb4fdd8d71824c2c3949bb1fdd5c6692fb3","from":"S20"}
{"owner":"ConsumoItem","field":"cajasConsumptionLines","type":"CajasConsumptionLine[]","target":"CajasConsumptionLine","sha256":"0de7a6086871cf6d21dbaa51e0d879238895b1969af6165f7e09e008411cbeaf","from":"S20"}
{"owner":"Devolucion","field":"cajasReturnConfirmations","type":"CajasReturnConfirmation[]","target":"CajasReturnConfirmation","sha256":"161439bae96a93a35bd91412335fa8f40d4265fbd189ef1e0f86be88a0e7616b","from":"S19"}
{"owner":"DevolucionItem","field":"cajasReturnLines","type":"CajasReturnLine[]","target":"CajasReturnLine","sha256":"ca3e12712e8d9688a94ce2e0987e8a6846f0b2f0ea950f076354af2bc3a1126e","from":"S19"}
```

Mechanical owner totals must be exactly: `Company=32`, `User=16`, `Surgery=1`, `AuditEvent=2`, and `Remito=RemitoItem=Consumo=ConsumoItem=Devolucion=DevolucionItem=1`; total `57`.

## 4. Deterministic projection protocol

### 4.1 External root, lock, and repository guard

The sole external root is exactly:

```text
C:\Users\franc\AppData\Local\Temp\opencode\c14-est-b8608a92
```

The approved parent already exists. Before creation, resolve the parent and every existing path component with Windows handle-based final paths; reject any symlink, junction, mount point, or other reparse point, any path escaping the approved parent, and any resolved path equal to or under `E:\OSSUM_COR_PROJECT`. Create the root once with fail-if-exists semantics. A pre-existing root blocks rather than being reused or deleted.

Acquire immutable `run.lock` using exclusive create (`wx`) before any other root child. It records only acquisition facts: protocol blob, future runner SHA-256, owner, process ID, host, UTC acquisition time, repository real path, and external-root real path. It is fsynced and never rewritten or deleted. Lifecycle transitions are separate atomic, append-only files `events/0001-reserved.json`, `events/0002-running.json`, and `events/0003-review-held.json`; each binds the previous event SHA-256, UTC time, actor, reason, and evidence state. Missing order, duplicate ordinal, rewritten event, or broken hash chain blocks. Exactly one owner may write. The independent reviewer is read-only.

Capture `git status --porcelain=v2 -z --untracked-files=all` with `child_process.execFile` as raw bytes immediately before root creation and after all evidence is fsynced. Store bytes and SHA-256. The two byte arrays must be identical; no status entry may be added, removed, or changed, including this already-authored Change Pack. Any repository mutation blocks and preserves evidence. No Git index operation is allowed.

### 4.2 Parser and source materialization

No executable runner is approved by this revision. A complete canonical UTF-8/LF Node source is not safely derivable from prose or pseudocode and is deliberately not assigned a fictitious hash. The required supplemental artifact in §10 must include the complete source in a fenced or deterministically encoded appendix, define exact byte extraction, publish byte length and SHA-256, include parser/projection/capture/guard tests, and require byte-for-byte reproduction as `runner/runner.mjs` in the external root before use. Every launch must first hash that file and compare it to the approved value. Until that independently reviewed artifact is incorporated, execution is blocked.

The future runner must use `child_process.execFile` with an argv array, `shell:false`, explicit external cwd, byte buffers, timeout, bounded output, and the command evidence contract in §5. Text redirection and shell pipelines are forbidden.

The parser must be a deterministic single-pass lexer/parser aware of LF/CRLF, line and nested block comments, quoted strings and escapes, top-level declaration keywords, balanced braces, model fields, attributes, and declaration source spans. Regex may assert tokens after parsing but may not locate or remove declarations/fields. It must reject unterminated strings/comments, unbalanced/ambiguous braces, duplicate top-level names, duplicate fields, unknown declaration kinds, or source spans that overlap.

For every `Sn`, use `git cat-file blob <schema-blob>` and independently `git show <commit>:prisma/schema.prisma`; require byte identity, Git `hash-object --stdin` identity without `-w`, and the frozen commit/blob pair. Write the immutable bytes once to `inputs/Snn.prisma`, mark read-only, and record byte length, Git blob, and SHA-256. Never read raw snapshots from the worktree.

Parser unit assertions, all required before projection, cover: nested block comments; `//` and braces inside strings; escaped quotes; CRLF; attributes containing arrays/parentheses; optional/list relation types; multiline declarations; exact span round-trip; all 32/14/57 manifest counts and hashes; duplicate names/fields; unresolved targets; malformed braces/comments/strings; and byte-preservation of untouched spans.

### 4.3 Independent `Pn` construction

Construct every `Pn` independently from raw `Sn`; never mutate or chain from `P(n-1)`:

1. Parse `Sn`, reproduce the manifest identities, and classify every Cajas-prefixed model/enum. Unclassified identity is a hard stop.
2. Remove each quarantine model whose `acceptedFrom > n` or disposition is `never`. At and after its accepted stage, retain the declaration present in that exact `Sn`; do not transplant a body from another snapshot.
3. Retain all non-quarantine replacement Stock models/enums present in `Sn` at their accepted stage. A name collision between a retained declaration and any quarantine identity stops.
4. In the ten owner models, remove exactly those S00-manifest inverse fields whose target model is excluded. Retain a manifest field only when its target is retained. Preserve every unrelated source byte before formatting. Any unresolved relation target or manifest field drift stops.
5. Remove each Cajas quarantine enum marked `never`. For the other seven, include it only if at least one retained projected declaration has a parsed type/value reference to it. Retain every non-quarantine/shared enum from `Sn` unchanged before formatting.
6. Normalize the candidate to LF with exactly one terminal LF and create it once at `scratch/projections/Pnn.prisma`. Only Prisma `format` may subsequently mutate that scratch file: invoke format pass 1, hash it, invoke format pass 2 on the same scratch file, and require byte identity. Invoke Prisma validate against the stable scratch bytes. Then atomically publish a byte-identical, immutable `projections/Pnn.prisma` exactly once. Retain scratch for review. Record every command capture and hash.
7. Reparse the formatted projection and prove its declaration/reference inventory against the expected stage set.

`P00` is `S00` stripped of all 32 quarantine models, all 14 Cajas quarantine enums, and all 57 quarantine inverse fields; it must contain the canonical app schema and zero projected Stock/Cajas identities. In addition to the frozen migration-tree/count/name guard, a deterministic static inventory of the 18 canonical SQL files must prove zero case-insensitive unquoted or quoted identifiers beginning `stock` or `cajas`; comments and strings are lexed, not regex-stripped. Any canonical-SQL parser ambiguity blocks; this protocol does not infer a database state or access a database.

Required identities after formatting:

- `P22` must be byte-identical to `P21` because S22 removes models that projections never included.
- `P24` must be byte-identical to `P23` because S24 removes enums that projections never included.
- `P00` has zero Stock/Cajas projected identities; `P24` has exactly the supported final projected inventory.

Failure of any identity is a protocol failure, not permission to edit, transplant, or hand-prune content.

## 5. External evidence layout and file contracts

```text
c14-est-b8608a92/
  run.lock
  events/0001-reserved.json ... 0003-review-held.json
  runner/runner.mjs
  runner/runner.sha256
  scratch/projections/P00.prisma ... P24.prisma
  scratch/tmp/
  run.json
  protocol.json
  manifest.json
  quarantine-manifest.json
  projection-manifest.json
  hashes.sha256
  completion.json
  completion.sha256
  inputs/S00.prisma ... S24.prisma
  projections/P00.prisma ... P24.prisma
  ps/PS01/raw.sql ... PS24/raw.sql
  cx/CX01/manifest.json ... CX13/manifest.json
  commands/C0001-<slug>/request.json
  commands/C0001-<slug>/result.json
  commands/C0001-<slug>/stdout.bin
  commands/C0001-<slug>/stderr.bin
  commands/C0001-<slug>/stdout.sha256
  commands/C0001-<slug>/stderr.sha256
  commands/C0002-<slug>/... one directory per invocation
  reports/counts.csv
  reports/operations.json
  reports/no-op.json
  reports/repo-guard.json
  reports/repo-before.porcelain-v2-z
  reports/repo-after.porcelain-v2-z
  reports/split.json
  reports/parser-tests.json
```

- `protocol.json`: protocol version, approved document blob, normalization/parser/counting/catalog versions, constants, command templates, stop rules, and Context7 source URLs/dates.
- `manifest.json`: immutable pre-inventory manifest containing final C13/package/lock/toolchain/migration bindings, external root, owner/lock, approved runner identity, expected relative evidence paths, and explicit exclusions. It contains no completion state or `hashes.sha256` hash.
- `quarantine-manifest.json`: exact normalized copies of the 32 model, 14 enum, and 57 inverse rows in §3 plus source S00 bindings.
- `projection-manifest.json`: 25 entries containing source commit/blob/raw SHA-256, exclusions, retained stage sets, enum references, inverse removals, pre-format and formatted SHA-256, byte counts, format-pass hashes, validation capture IDs, and inventory counts.
- `run.json`: immutable summary/index of all command IDs and internal phase verdicts. It stores no environment values or secrets.
- `commands/Cnnnn-<slug>/`: one atomic write-once command-evidence directory for every Git/materialization command, parser-test worker invocation, each of 50 format passes, each of 25 validates, and each of 24 diffs. `request.json` contains command ID, category, executable absolute path, argv array, external cwd, sorted sanitized environment-key names only, UTC start, timeout milliseconds, and expected output policy. `result.json` contains UTC end, spawn result, exit code or `null`, signal or `null`, timed-out boolean, error code/message with secrets redacted, stdout/stderr byte counts and SHA-256, and published-artifact links. `stdout.bin` and `stderr.bin` always exist, including zero-byte files for empty output, timeout, or spawn failure; sibling hash files bind those exact bytes. Pre-root repository-status stdout/stderr and request/result facts are retained in memory until the root/lock exists, then published unchanged as the first command directory before any other work. No secret value is stored.
- `hashes.sha256`: lowercase SHA-256, two spaces, forward-slash relative path, LF, lexically sorted by UTF-8 bytes. It covers every immutable payload file published before inventory, including `manifest.json`, but excludes `hashes.sha256`, `completion.json`, `completion.sha256`, and mutable scratch.
- `completion.json`: atomic write-once closure record containing the SHA-256/bytes of `manifest.json` and `hashes.sha256`, command/event terminal counts, final repository-guard hashes, verdict, and retained-scratch inventory.
- `completion.sha256`: lowercase SHA-256 of exact `completion.json` bytes plus LF. Its digest is the detached handoff root; it is not added back into `hashes.sha256` or another completion file.

JSON is UTF-8, LF, two-space indentation, recursively lexicographically sorted object keys, array order preserved, and one terminal LF. CSV is RFC 4180 with fixed headers and LF. Final evidence files are write-once: create temporary siblings inside the external root, fsync, atomic rename, then never overwrite. `run.lock` and event files follow their stricter immutable/append-only rules. Only `scratch/**` may be mutable: the runner may create candidates and temporary files there, only Prisma format may rewrite `scratch/projections/*.prisma`, nothing may be promoted until stable/validated, and all scratch bytes are retained for review without entering the immutable payload hash inventory.

Finalization is acyclic and exact: (1) atomically publish immutable `manifest.json`; (2) publish all remaining immutable payload; (3) inventory those payload files into `hashes.sha256`, excluding itself/completion/scratch; (4) atomically publish `completion.json` binding both manifest and inventory hashes; (5) atomically publish `completion.sha256`; (6) report that detached digest as the sole handoff root. No earlier file is rewritten.

Artifacts remain external and retained for review. No cleanup is allowed before an independent verdict and a later explicit cleanup authority.

## 6. Prisma command and capture contract

The requested launcher is shell-free and exact:

```js
child_process.execFile(process.execPath, [verifiedCliJs, ...argv], { shell: false })
```

Immediately before each Prisma command, the approved future runner must require `process.execPath === "C:\\Program Files\\nodejs\\node.exe"`, `verifiedCliJs === "E:\\OSSUM_COR_PROJECT\\node_modules\\prisma\\build\\index.js"`, and reproduce every byte/SHA-256/package/engine identity in §2.1. It must use native real-path resolution and Windows handle/file-attribute checks to reject reparse points or path escape for the Node executable, CLI JS, Prisma package, client package, engine, and `.cmd` shim. It parses and hashes the shim only to corroborate that its non-shell target is the same `build/index.js`; it never executes the shim. `cmd.exe`, `powershell`, `npx`, PATH lookup, shell invocation, command strings, and text redirection are forbidden.

Allowed external-file commands are:

```json
["format","--schema","<external Pn path>"]
["validate","--schema","<external Pn path>"]
["migrate","diff","--from-schema","<external P(n-1) path>","--to-schema","<external Pn path>","--script"]
```

For every `n=1..24`, execute the third argv exactly once after all 25 projections validate. Capture stdout as raw bytes directly to `ps/PSnn/raw.sql`; capture stderr as raw bytes, exit code, signal, duration, argv, and hashes. No datasource/migrations/config source flag is allowed. Every Prisma subprocess cwd is the resolved external root, never the repository, so automatic config discovery cannot load repository `prisma.config.ts` or its `dotenv/config` import.

Current Prisma documentation identifies `--from-schema` and `--to-schema` as Prisma schema-file sources and `--script` as SQL stdout; `migrate diff` is read-only. Prisma 7 can load `prisma.config.ts`, and this repository's config imports `dotenv/config` and requires `DIRECT_URL`; loading it is forbidden. Every Prisma cwd is the external root, which must contain no `prisma.config.*`, `.env*`, package manifest, migrations directory, or datasource file.

The child environment is rebuilt from nothing with exactly these keys and no others:

| Key | Exact source/value |
| --- | --- |
| `SystemRoot` | copied only if case-insensitively equal to `C:\Windows`; otherwise stop |
| `WINDIR` | copied only if case-insensitively equal to `C:\Windows`; otherwise stop |
| `TEMP` | `<external-root>\scratch\tmp` |
| `TMP` | `<external-root>\scratch\tmp` |
| `TZ` | `UTC` |
| `NO_COLOR` | `1` |
| `PRISMA_HIDE_UPDATE_MESSAGE` | `1` |
| `CHECKPOINT_DISABLE` | `1` |

`PATH`, `PATHEXT`, `ComSpec`, user/profile/app-data keys, `NODE_OPTIONS`, all `PRISMA_*` keys except the two fixed non-secret flags above, `DIRECT_URL`, `DATABASE_URL`, every key ending `_URL`, and `HTTP_PROXY`, `HTTPS_PROXY`, `ALL_PROXY`, `NO_PROXY` in any case are absent. Request evidence stores only the sorted eight key names, never values.

**No-network decision/blocker:** read-only host inspection found the Windows `New-NetFirewallRule` capability and WSL, but no approved, non-mutating per-process sandbox that can prove network/DB denial; Windows Sandbox was not available. A firewall rule would mutate host security state and requires separate human authority, cleanup, and independent validation; WSL does not itself deny networking. This revision therefore makes no unsupported sandbox claim and blocks execution. The supplemental artifact in §10 must choose, authorize, test, and bind an enforceable no-network mechanism, or obtain a separately reviewed risk decision that permits file-to-file Prisma execution with only the external-cwd/environment controls. Any actual URL/config/network/DNS/socket/database attempt remains a hard stop.

All 50 format exits, 25 validate exits, and 24 diff exits must be zero. Any other exit blocks. Command stdout/stderr are never normalized before hashing.

## 7. SQL counts, operations, and destructive policy

### 7.1 Raw and physical counts

For each raw SQL buffer `b`:

- `rawBytes = b.length`;
- `rawSha256 = SHA256(b)`;
- reject NUL or CR bytes and invalid UTF-8;
- `physicalLines = 0` when `rawBytes=0`; otherwise `count(0x0A) + (lastByte==0x0A ? 0 : 1)`;
- record blank, comment-only, and code-bearing physical lines separately after lexical classification.

No line is trimmed, inserted, deleted, or transformed. There is no “transformed” SQL count in this estimation run because transformation and accepted SQL are excluded.

### 7.2 Semantic statement parser

Use a deterministic PostgreSQL lexer that recognizes whitespace, `--` comments, nested `/* */` comments, single-quoted and `E''` strings with escapes, double-quoted identifiers, dollar-quoted bodies with exact tags, numeric/operator tokens, and semicolons only outside those states. Split only on such top-level semicolons. A non-comment token sequence without its required terminating semicolon is a parser failure. `semanticStatements` is the number of non-whitespace/non-comment statement token sequences. Preserve statement byte spans and SHA-256 in `operations.json`.

Classify every statement into exactly one category: `CREATE_EXTENSION`, `CREATE_ENUM`, `ALTER_ENUM`, `CREATE_TABLE`, `ALTER_TABLE_ADD_COLUMN`, `ALTER_TABLE_ALTER_COLUMN`, `ALTER_TABLE_ADD_CONSTRAINT`, `CREATE_INDEX`, `CREATE_UNIQUE_INDEX`, `CREATE_FUNCTION`, `CREATE_TRIGGER`, `CREATE_CONSTRAINT_TRIGGER`, `COMMENT`, `TRANSACTION`, `DROP`, or `OTHER`. `OTHER` blocks. Record affected quoted/unquoted identifiers, operation verb, destructive flag, and source span.

Any `DROP` token used as a statement or `ALTER ... DROP ...` operation is a blocker. `TRUNCATE`, `DELETE`, `UPDATE`, `INSERT`, `MERGE`, `RENAME`, provider/schema changes, raw data movement, or executable procedural body is also destructive/out of scope and blocks this estimation. No warning or manual exception exists inside the run.

### 7.3 No-op identities

`PS22` and `PS24` must each have `semanticStatements=0` and the immutable raw stdout emitted by Prisma must be either zero bytes or lexically comment-only. `P22==P21` and `P24==P23` must already have passed byte identity. The runner preserves whichever exact raw representation Prisma emits; it never forces, normalizes, truncates, or rewrites it. `reports/no-op.json` records projection hashes, raw hashes/bytes, comment spans, statement count, and verdict. Any semantic token, `DROP`, differing projection, or raw-byte transformation blocks all acceptance.

Non-binding future recommendation: during a separately approved migration implementation/replay phase, consider comment-only provenance migration files for PS22 and PS24 so all 24 PS identities remain visible in migration history. That decision requires separate implementation authority, checksum/replay review, and explicit approval. This estimation design creates no migration directories/files and does not predetermine their bytes.

## 8. CX forecast catalog and exact manifests

### 8.1 Catalog decision requiring approval

Independent report #4736 correctly rejected the prior discretionary constants. They are removed and grant no authority. C05 #4324 revision 3 and closure #4329 freeze only the 13 unsupported-family scopes, not exact object identities, function bodies, predicates, branches, dependencies, event sets, or line-rendering templates. The exact approved C04 physical-unit sources are referenced as #4318 revision 1 plus governing #4319 revision 2, but their complete machine-readable unsupported-object manifests and canonical SQL templates are not repository-visible or reproduced in this task. Deriving numerical vectors from family prose would invent SQL semantics. Therefore every CX vector and every catalog constant is unresolved, and the run is blocked.

The supplemental artifact in §10 must provide evidence-derived templates rather than estimates by assertion. For each catalog unit (`transaction/provenance scaffold`, `extension`, `check`, `function`, `ordinary trigger`, `exclusion`, `constraint trigger`, `predicate`, `branch`, `dependency`, `event`) it must include: exact canonical UTF-8/LF template bytes; placeholder grammar; one zero-occurrence fixture and one one-occurrence fixture; rendered bytes and physical-line counts under §7.1; delta calculation; authority citation to an approved named invariant/object; and SHA-256 for source/template/fixtures. Lower/point/upper may exist only if three separately justified approved templates produce those values; otherwise one exact measured constant governs. Catalog constants require explicit Franco approval after independent Migration review. A child may never adjust a constant ad hoc.

Every CX manifest requires exactly these fields: `id`, `c14Child`, `attachmentAfter`, `coversSnapshots`, `purpose`, `sourceAuthorities`, `namedObjects`, `namedInvariants`, `semanticQuestions`, `extensionCount`, `checkCount`, `functionCount`, `triggerCount`, `exclusionCount`, `constraintTriggerCount`, `predicateCount`, `branchCount`, `dependencyCount`, `eventCount`, `lowerLines`, `pointLines`, `upperLines`, `catalogVersion`, `unresolved`, `splitRequired`, `prohibitedOverlap`, `reviewStatus`, and `notes`. Counts must be justified by source citations and named intended invariants, never inferred from family prose. Any `null` count, unresolved semantic, unsupported object identity, overlap with PS-supported structure, or approved upper bound above 350 sets `splitRequired=true` and blocks; re-splitting requires a topology amendment and new approval.

### 8.2 Exact CX attachment scopes

In this table, display alias `b8608a9...` means only the exact topology blob `b8608a922d2d9adf5d776673252f709c52d4a518`; no prefix matching or alternate blob is permitted.

| ID | C14 child | Attachment / covered snapshots | Frozen family purpose | Vector status / authority |
| --- | --- | --- | --- | --- |
| CX01 | C14-01 | canonical baseline prerequisite, before PS01 | deterministic, catalog-verifiable `btree_gist` prerequisite design | `UNRESOLVED`; topology blob `b8608a9...`, C05 #4324 rev3 |
| CX02 | C14-06 | after S04 | lot correction and append-only custom guards | `UNRESOLVED`; topology blob `b8608a9...`, C05 #4324 rev3 |
| CX03 | C14-08 | after S05 | identified-unit configuration custom guards | `UNRESOLVED`; topology blob `b8608a9...`, C05 #4324 rev3 |
| CX04 | C14-10 | after S06 | position, trace, and occupancy custom guards | `UNRESOLVED`; topology blob `b8608a9...`, C05 #4324 rev3 |
| CX05 | C14-12 | after S07 | opening row-local custom checks | `UNRESOLVED`; topology blob `b8608a9...`, C05 #4324 rev3 |
| CX06 | C14-14 | after S08 | command-family effect-target and semantic-intent custom behavior | `UNRESOLVED`; topology blob `b8608a9...`, C05 #4324 rev3 |
| CX07 | C14-16 | after S09 | Stock evidence append-only, scale, correction, and reversal guards | `UNRESOLVED`; topology blob `b8608a9...`, C05 #4324 rev3 |
| CX08 | C14-18 | after S10 | reservation append-only, ceiling, and source-scope guards | `UNRESOLVED`; topology blob `b8608a9...`, C05 #4324 rev3 |
| CX09 | C14-20 | after S11 | projection custom-guard skeleton; no fold/rebuild algorithm | `UNRESOLVED`; topology blob `b8608a9...`, C05 #4324 rev3 |
| CX10 | C14-22 | after S12 | formula pointer, append-only, and minimum-line custom guards | `UNRESOLVED`; topology blob `b8608a9...`, C05 #4324 rev3 |
| CX11 | C14-26 | after S15; covers S13–S15 | assignment, preparation, correlation, and control custom rules, including nullable correlation shape | `UNRESOLVED`; topology blob `b8608a9...`, C05 #4324 rev3 |
| CX12 | C14-33 | after S21; covers S16–S21 | operational Cajas custom rules across dispatch, return, consumption, disposition, and condition families | `UNRESOLVED`; topology blob `b8608a9...`, C05 #4324 rev3 |
| CX13 | C14-37 | after S24; final deferred reconciliation | GiST opening exclusion and remaining deferred custom-object reconciliation | `UNRESOLVED`; topology blob `b8608a9...`, C05 #4324 rev3 |

The frozen occurrence-vector representation for each row is exactly `{extension:null,check:null,function:null,trigger:null,exclusion:null,constraintTrigger:null,predicate:null,branch:null,dependency:null,event:null,lowerLines:null,pointLines:null,upperLines:null,unresolved:true,splitRequired:true}`. These are explicit unresolved vectors, not zero counts. The supplemental artifact must replace every `null` with an evidence-derived integer and bind named objects/invariants and full authority citations before execution approval.

`reports/split.json` would list all 24 PS children using measured raw physical lines and all 13 CX children using approved catalog/vector values. In this revision all CX entries necessarily block. A future run may mark `PASS` only when every PS raw physical count and every approved CX upper bound is `<=350`, every CX semantic question is resolved, and no child overlaps another attachment. It may recommend exact re-split boundaries but cannot alter topology.

## 9. Gates, review, stops, and retention

### 9.1 Required gates

Gates 1–13 describe a future run only. This revision cannot enter gate 1 because approved runner bytes/SHA-256, 13 resolved CX vectors/catalog templates, and an approved no-network decision are absent.

1. Exactly one external writer and one exclusive external lock.
2. Frozen topology/provenance/package/toolchain/migration bindings pass.
3. External-root containment and reparse-point checks pass.
4. Before repository guard captured; after guard byte-identical.
5. Parser unit assertions pass.
6. Exactly 25 raw inputs and 25 independent projections are hashed.
7. Exactly 50 format exits and 25 validate exits pass; every second format is byte-stable.
8. Exactly 24 diff exits pass with stdout/stderr hashes.
9. PS22/PS24 no-op identities pass; no destructive or unclassified operation exists.
10. Exactly 13 complete, non-null CX manifests use the independently approved evidence-derived catalog; unresolved/upper-bound gates pass.
11. Counts, operations, split report, canonical absence proof, and `hashes.sha256` reconcile.
12. Independent Migration reviewer returns read-only PASS against the retained evidence and this exact approved document blob.
13. Caveman handoff records hashes, counts, unresolved decisions, risks, and next approval; lock remains `review-held`.

### 9.2 Hard stops

Do not start while runner bytes/SHA-256, any CX vector/catalog value, or the no-network decision remains unresolved. After those documentary gates close, stop and retain evidence on any stale hash, count mismatch, parser ambiguity, unresolved relation, identity collision, unclassified Cajas declaration, Prisma invalidity, non-idempotent format, failed command, discovered Prisma config, datasource/network/DB attempt, repository mutation, non-no-op PS22/PS24, `DROP`/destructive/`OTHER` operation, unresolved CX semantic, upper forecast above 350, scope overlap, missing independent PASS, or absent exact Franco approval. Never repair a failure by editing raw inputs, projections after formatting, or SQL stdout.

### 9.3 Exact non-authority

This pack does not authorize accepted SQL; migration directories or migration files; SQL transformation, pruning, acceptance, staging, or execution; a DB, introspection, catalog, shadow DB, provider, environment, datasource, or network endpoint; `migrate dev/deploy/status/resolve`, any `db *`, seed/backfill, repository schema/config/package/lock/worklog/AGENTS edits, retained generated client, dependency changes, Auth/security/multi-company implementation, C15+, commit, remotes, push, PR, merge, deploy, or production. It does not authorize reuse or cleanup of external evidence after review.

## 10. NOT READY closure and exact next artifact

No execution-approval sentence is valid for this revision. The exact next documentary artifact is:

```text
knowledge/specs/STOCK-CAJAS-C14-ESTIMATION-EXECUTION-BINDINGS-001/CHANGE_PACK.md
```

That separately scoped, independently reviewed artifact must contain: (1) complete canonical UTF-8/LF runner source with extraction rule, byte length, SHA-256, parser/projection/capture/guard tests, and exact command sequence; (2) evidence-derived canonical catalog templates/fixtures/hashes and all 13 non-null occurrence vectors with named objects/invariants and full C04/C05/topology citations; (3) the chosen enforceable no-network mechanism and its separate authority/test/cleanup evidence, or a separately reviewed explicit risk acceptance; and (4) an amended one-sentence execution request binding its own blob, this document's then-current reviewed blob, runner SHA-256, catalog/vector version, shell-free launcher identities, external retention, immutable raw no-op policy, and all exclusions. It must not execute the runner or create the external root. After PASS and Franco's documentary approval, this Change Pack must be amended to incorporate those exact bindings and independently reviewed again before any execution request.

Franco may acknowledge the current non-executable state only with this exact sentence:

> I acknowledge `STOCK-CAJAS-C14-ESTIMATION-001` at its independently reviewed Change Pack blob as NOT READY and authorize no execution: any future request must bind an approved runner SHA-256 (none exists in this revision), all 13 evidence-derived CX vectors and catalog templates (currently unresolved), and an approved no-network decision; it must use only the shell-free `child_process.execFile(process.execPath, [verifiedCliJs, ...argv], {shell:false})` launcher with the frozen Node/Prisma identities, preserve PS22/PS24 exactly as immutable raw Prisma stdout whether zero-byte or lexically comment-only, retain external evidence for review, and continue to exclude accepted SQL, migration files/directories, repository schema/config/package/lock/worklog/AGENTS changes, database/provider/environment/introspection/catalog access, migrate dev/deploy/status/resolve, db commands, generated-client retention, dependency changes, Git staging/commit/remotes, deployment, and production.

Status remains **NOT READY — RUNNER, CX VECTORS, AND NO-NETWORK ENFORCEMENT REQUIRE A SEPARATE APPROVED BINDING ARTIFACT**. No external run may begin from this document.

## 11. Documentary validation for this authoring task

Only this Markdown may be modified. Validate with path-limited `git diff --check -- knowledge/specs/STOCK-CAJAS-C14-ESTIMATION-001/CHANGE_PACK.md`, compute its Git blob with `git hash-object` without `-w`, mechanically count `32` model rows, `14` enum rows, `57` inverse rows, `25` snapshot rows, `24` accepted model identities, `8` never model identities, and `13` CX rows, and reproduce all `103` normalized manifest hashes from raw S00 (`32+14+57`). Do not run Prisma migrate/diff, materialize projections, create the external root, access a DB, stage, or commit.
