# C14 CX `btree_gist` Catalog Binding Addendum

Status: **PROPOSED / HUMAN APPROVAL REQUIRED / NON-EXECUTABLE**

## 1. Conflict, scope, and authority precedence

This addendum resolves only the catalog-timing conflict recorded in Engram #4833; Franco authorized preparation, not approval, in #4834. The exact parents are canonical proposal `b1045fd3f66defcbb0bac7a1cc0adcadf783b81a`, P19 serialization `bdc0fd13f3126567ade7e13c8f65f6e376a9940f`, P19 capacity `1304c0911e858a4995f0621a5c478650f4fe4ccd`, and Binding Finalization Addendum B `a860049af04a6ff07fbe9fae6ddb512a8ef0adc8`.

The conflict is exact. Addendum B requires the unique `btree_gist` row whose version equals `pg_available_extensions.default_version`, freezes its catalog tuple, and requires explicit `SCHEMA public` and `VERSION`. Capacity V2 requires one concrete CX01 `.sqlfrag`, an exact `ACTION.extensionVersion`, source span, locator, evidence, and hashes inside a complete 169-fragment proposal. No PostgreSQL provider, server, database, environment, default version, available-version row, installed state, owner, privileges, requirements, or opclass state has been approved or observed. Therefore a generic author cannot lawfully choose the required VERSION literal or hash the CX01 bytes.

**Ruthless feasibility conclusion:** a truly byte-exact generic CX01 SQL `.sqlfrag` cannot exist without a concrete VERSION literal. Omitting `VERSION`, guessing it, accepting the server default implicitly, inserting a placeholder/sentinel, or deferring substitution inside already approved bytes makes the fragment either non-exact or contrary to Addendum B. Dynamic SQL that selects at execution time also fails: it is not the approved literal statement and moves selection past exact human review.

If approved, this addendum narrowly supersedes Capacity V2 only where V2 requires CX01's catalog-dependent realization and the 169th concrete fragment in the generic proposal. Binding Addendum B remains semantically superior for tuple selection, existing/absent checks, creation, and postconditions. The other 168 objects and all other parent rules remain unchanged. This file has no authority until its exact blob is independently passed and Franco approves the selected cells. No approval is transitive.

## 2. Decision cells and recommendation

| Cell | Selectable alternatives | Recommendation |
|---|---|---|
| CB01 representation | **A:** require an immutable approved target snapshot before any proposal authoring. **B:** select from a catalog at execution runtime. **C:** approve a portable staged proposal with one typed deferred CX01 realization, then create a target-specific materialized proposal only after approved observation. | **C** |
| CB02 version selection | **A:** require an independently approved requested version. **B:** preserve Addendum B: require exactly one available-version row matching the unique non-null advertised default version. | **B** |
| CB03 observation | **A:** later shell-free, allowlisted, read-only observation against one separately approved target. **B:** query a database now or inherit an ambient provider/environment. | **A** |
| CB04 byte binding | **A:** render fresh target-specific CX01 bytes after selection; hash and approve them before authority work. **B:** mutate placeholders, sentinels, omitted VERSION, or mutable substitutions in an approved generic fragment. | **A** |
| CB05 roots and approval | **A:** staged non-authority root first; materialized non-authority root only after selection evidence exists; authority manifests/roots only after exact materialized-root approval. **B:** precompute/predict an authority root or let a selection approve later bytes automatically. | **A** |
| CB06 replay/drift | **A:** bind target identity plus complete observation hashes and invalidate on identity/state change. **B:** trust provider labels, elapsed time alone, or an unreviewed refreshed query result. | **A** |
| CB07 creation privilege | **A:** treat `superuser=false` as sufficient. **B:** require current-role superuser, trusted-extension eligibility, or a complete approved script/component-object privilege proof, always with required database/schema privileges. | **B** |

**Single recommendation:** approve `CB01-C`, `CB02-B`, `CB03-A` through `CB06-A`, and `CB07-B` as one non-severable seven-cell catalog-binding package. CB01-C is portable and requires no database access now, while final SQL remains literal, byte-exact, target-bound, independently reviewed, and explicitly approved. CB07-B removes an unsafe privilege inference. The package is independent of later target selection, observation, proposal materialization, authority, binding, and execution decisions; it grants none of them.

## 3. Alternative analysis

| Consequence | A — snapshot before proposal | B — execution-runtime selection | C — staged proposal plus target materialization |
|---|---|---|---|
| Exact data model | One approved `CatalogSelectionRequest`, `CatalogObservation`, and `CatalogSelectionResult` from §4 must precede every proposal row. | The same request/observation/result would be produced by an executor immediately before mutation. | Generic root carries one `DeferredCatalogObject`; later target package carries the §4 request/observation/result and a complete CX01 realization. |
| Bytes/hashes/root | All 169 fragments and normal complete root are target-specific from the start. Any target change replaces CX01 bytes and root. | No stable pre-execution CX01 literal, fragment hash, source span, row hash, or approvable root exists. | Staged root hashes 168 concrete fragments plus the deferred record; materialized root hashes 169 concrete fragments and binds the approved catalog evidence. Roots are distinct and never aliases. |
| Authoring sequence | Approve target → observe → approve snapshot/result → author all 169 fragments. | Author a selector or mutable fragment, then choose/render during execution. | Author/review/approve 168 fragments and deferred CX01 → later approve target → observe/select/review/approve → materialize/review/approve CX01 and complete root. |
| Preflight/execution | Reobserve exact target; mismatch fails. Separately approved execution remains required. | Selection and mutation are adjacent; exact bytes cannot receive prior approval. | Materialization preflight is read-only; eventual execution rechecks approved identity/state. Selection and execution remain separate prohibited phases. |
| Coupling | Strongly couples the entire proposal to one provider/environment before useful generic review. | Ambient runtime coupling; unsafe unless transformed into C before mutation. | Generic semantics are portable; only the materialized proposal is coupled to the approved target identity, never merely a provider name. |
| Gates | Target, observation, result, proposal, authority, and execution approvals. | Cannot satisfy the proposal-byte approval gate. | Addendum, staged proposal, target, observation/result, materialized proposal, authority, bindings, and execution are separate gates. |
| Reproducibility | Exact for one immutable snapshot; poor reuse. | Not reproducible as an already approved literal artifact. | Exact at both stages: portable deferred semantics and target-specific final bytes have separate hash DAGs. |
| Failure | Missing/changed target or tuple blocks all proposal authoring. | Any runtime surprise risks unapproved bytes or mutation; therefore rejected. | Missing/changed evidence blocks only CX01 materialization; no placeholder, root promotion, authority, or mutation occurs. |

Alternative A is safe but prematurely destroys portability and is unavailable now. Alternative B is acceptable only if “runtime” means a later **non-mutating documentary observation phase followed by review and approval**; under that constraint it is C. Selection inside an execution process is rejected. Alternative C is recommended.

Unsafe variants are unconditionally invalid: guessed or implicit default version; omitted `VERSION`; `IF NOT EXISTS`; `CASCADE`; placeholder/sentinel/template substitution; ambient provider assumptions; database access during this addendum or generic authoring; mutable or unreviewed substitution; and any create/extension execution during selection.

## 4. Closed catalog-selection contract

The following are project decisions, not claims that PostgreSQL itself supplies these artifact schemas. All objects are CJ1 with required keys only, unknown keys rejected, parent `Hex40`, `Hex64`, `NString`, `PgName`, `PosInt`, `UInt`, `UtcMillis`, and UTF-8 byte-order rules, and one terminal LF. `Cjl1Bytes` is either zero bytes or a direct concatenation of one or more CJ1 rows; it contains no blank line, BOM, NUL, or CR.

### 4.1 Request and target

```text
CatalogSelectionPolicy = {
  schemaVersion:"C14C-CATALOG-POLICY-V1",
  extensionName:"btree_gist",
  targetSchema:"public",
  selectionRule:"UNIQUE_DEFAULT_VERSION",
  installedRule:"INSTALLED_VERSION_MUST_EQUAL_SELECTED",
  requiredOpclass:{schema:"public",name:"gist_text_ops",accessMethod:"gist",inputType:"pg_catalog.text",requiredUses:2},
  createRenderingRule:"FIXED_PREFIX_PLUS_PG_LITERAL_PLUS_SEMICOLON_LF",
  creationPrivilegeRule:"SUPERUSER_OR_TRUSTED_OR_AUDITED_COMPONENT_PROOF",
  superuserFalseAlone:false,ifNotExists:false,cascade:false,mutationDuringSelection:false
}

CatalogSelectionRequestCore = {
  schemaVersion:"C14C-CATALOG-REQUEST-V1",requestId:NString,
  parentProposalBlob:"b1045fd3f66defcbb0bac7a1cc0adcadf783b81a",
  serializationAddendumBlob:"bdc0fd13f3126567ade7e13c8f65f6e376a9940f",
  capacityAddendumBlob:"1304c0911e858a4995f0621a5c478650f4fe4ccd",
  bindingAddendumBlob:"a860049af04a6ff07fbe9fae6ddb512a8ef0adc8",
  catalogBindingAddendumBlob:Hex40,policySha256:Hex64,
  stagedProposalRootSha256:Hex64,targetBindingEvidenceId:NString,
  targetBindingSha256:Hex64,observationMode:"READ_ONLY_REPEATABLE_READ",
  querySetVersion:"C14C-QSET-V1",querySetSha256:Hex64,commandIdentitySha256:Hex64
}
CatalogSelectionRequest = CatalogSelectionRequestCore + {requestSha256:Hex64}

TargetDatabaseIdentity = {
  approvedTargetBindingSha256:Hex64,systemIdentifier:NString,
  databaseOid:UInt,databaseName:NString,serverVersionNum:UInt,
  serverVersion:NString,currentUserOid:UInt,currentUserName:NString
}
```

`targetBindingSha256` names a separately reviewed and Franco-approved target-binding artifact; an endpoint, provider label, environment variable, current shell context, or database name alone is insufficient. `systemIdentifier` is the exact decimal system identifier obtained through the allowlisted identity query. Failure to read any identity field fails closed; no weaker identity is substituted.

### 4.2 Exact Q01–Q06 query artifacts, results, and observation

```text
AvailableExtension = {name:"btree_gist",defaultVersion:NString|null,installedVersion:NString|null}
AvailableVersion = {name:"btree_gist",version:NString,installed:Boolean,superuser:Boolean,
  trusted:Boolean,relocatable:Boolean,schema:PgName|null,requires:PgName[]}
InstalledState =
  {state:"ABSENT"} |
  {state:"PRESENT",version:NString,namespace:"public",relocatable:Boolean,
   ownerOid:UInt,ownerName:NString,requiredExtensionNames:PgName[]}
PrivilegeState = {databaseCreate:Boolean,publicUsage:Boolean,publicCreate:Boolean,
  currentUserSuperuser:Boolean}
OpclassObservation = {schema:PgName,name:PgName,accessMethod:PgName,inputType:NString,
  extensionName:PgName|null,dependencyType:NString|null}
RequiredExtensionState = {name:PgName,installedVersion:NString|null,namespace:PgName|null}[]

QueryId = "Q01_TARGET_IDENTITY"|"Q02_AVAILABLE_EXTENSION"|"Q03_AVAILABLE_VERSIONS"|
          "Q04_INSTALLED_OWNER_REQUIRES"|"Q05_PRIVILEGES"|"Q06_OPCLASS"
QueryColumn = {ordinal:PosInt,name:NString,pgType:NString,nullable:Boolean}
QueryOrderKey = {columnName:NString,direction:"ASC",nulls:"FIRST"|"LAST",
  comparison:"UTF8_BYTE_LEX"|"BOOLEAN_FALSE_TRUE"|"UNSIGNED_INTEGER"}
QueryContract = {queryId:QueryId,rowCardinality:"EXACTLY_ONE"|"ZERO_OR_ONE"|"ZERO_OR_MORE",
  columns:QueryColumn[],orderKeys:QueryOrderKey[],duplicateKeyColumns:NString[],
  allowedRelations:NString[],allowedFunctions:NString[],approvedConstants:NString[]}

QueryArtifactCore = {schemaVersion:"C14C-QUERY-ARTIFACT-V1",queryId:QueryId,
  querySetVersion:"C14C-QSET-V1",statementKind:"SELECT",sqlUtf8Lf:SqlUtf8Lf,
  contract:QueryContract,parameterMode:"NO_AMBIENT_PARAMETERS",
  targetConstants:{extensionName:"btree_gist",targetSchema:"public"},unknownKeys:"REJECT"}
QueryArtifact = QueryArtifactCore + {queryArtifactSha256:Hex64}

CommandIdentity = {toolName:NString,toolVersion:NString,executableSha256:Hex64,
  driverName:NString,driverVersion:NString,invocationProfileSha256:Hex64,
  observerIdentity:NString}
QuerySetCore = {schemaVersion:"C14C-QUERY-SET-V1",querySetVersion:"C14C-QSET-V1",
  targetBindingSha256:Hex64,commandIdentity:CommandIdentity,
  queryArtifacts:[QueryArtifact Q01,Q02,Q03,Q04,Q05,Q06],unknownKeys:"REJECT"}
QuerySet = QuerySetCore + {commandIdentitySha256:Hex64,querySetSha256:Hex64}
RawCell = {columnOrdinal:PosInt,isNull:Boolean,valueUtf8:NString|null}
RawResultRow = {arrivalOrdinal:PosInt,cells:RawCell[]}
CanonicalCell = {columnName:NString,isNull:Boolean,valueUtf8:NString|null}
CanonicalResultRow = {canonicalOrdinal:PosInt,cells:CanonicalCell[]}

QueryResultCore = {schemaVersion:"C14C-QUERY-RESULT-V1",requestSha256:Hex64,
  queryArtifactSha256:Hex64,queryId:QueryId,commandIdentity:CommandIdentity,
  targetIdentitySha256:Hex64,transactionSnapshotIdentity:NString,
  rawResultCjl1Utf8Lf:Cjl1Bytes,rawResultRowCount:UInt,
  canonicalResultCjl1Utf8Lf:Cjl1Bytes,canonicalResultRowCount:UInt,
  projectionSchemaSha256:Hex64}
QueryResult = QueryResultCore + {rawResultSha256:Hex64,
  canonicalResultSha256:Hex64,queryResultSha256:Hex64}

CatalogObservationCore = {schemaVersion:"C14C-CATALOG-OBSERVATION-V1",
  requestSha256:Hex64,targetIdentity:TargetDatabaseIdentity,
  transactionMode:"READ_ONLY_REPEATABLE_READ",observedAt:UtcMillis,
  availableExtensions:AvailableExtension[],availableVersions:AvailableVersion[],
  installedState:InstalledState,privileges:PrivilegeState,
  requiredExtensions:RequiredExtensionState,opclassObservations:OpclassObservation[],
  querySet:QuerySet,
  queryResults:[QueryResult Q01,Q02,Q03,Q04,Q05,Q06]}
CatalogObservation = CatalogObservationCore + {snapshotSha256:Hex64}
```

The six `QueryContract` values are closed:

| Query | Cardinality; exact result columns in ordinal order | Canonical order / duplicate key | Allowlist |
|---|---|---|---|
| Q01 | exactly one; `system_identifier text NOT NULL`, `database_oid oid NOT NULL`, `database_name name NOT NULL`, `server_version_num integer NOT NULL`, `server_version text NOT NULL`, `current_user_oid oid NOT NULL`, `current_user_name name NOT NULL`, `transaction_snapshot_identity text NOT NULL`, `observed_at text NOT NULL` where the last cell is exact `UtcMillis` | no order; duplicate impossible | `pg_database`, `pg_roles`; current database/user, server-version, control-system identity, transaction-snapshot, and transaction-timestamp/approved UTC-format functions only |
| Q02 | zero or one; `name name NOT NULL`, `default_version text NULL`, `installed_version text NULL` | `name` UTF-8 bytes; key `name` | `pg_available_extensions` only; constant `btree_gist` |
| Q03 | zero or more; `name name NOT NULL`, `version text NOT NULL`, `installed boolean NOT NULL`, `superuser boolean NOT NULL`, `trusted boolean NOT NULL`, `relocatable boolean NOT NULL`, `schema name NULL`, `requires name[] NULL` | `(name,version)` UTF-8 bytes; same key | `pg_available_extension_versions` only; constant `btree_gist` |
| Q04 | zero or more; `extension_name name NULL`, `installed_version text NULL`, `namespace name NULL`, `relocatable boolean NULL`, `owner_oid oid NULL`, `owner_name name NULL`, `required_name name NULL`, `required_installed_version text NULL`, `required_namespace name NULL` | `(extension_name,required_name)` UTF-8 bytes, nulls first; key `(extension_name,required_name)` | `pg_extension`, `pg_namespace`, `pg_roles`, `pg_depend`, `pg_available_extensions`, `pg_available_extension_versions`; constant `btree_gist` only |
| Q05 | exactly one; `database_create boolean NOT NULL`, `public_usage boolean NOT NULL`, `public_create boolean NOT NULL`, `current_user_superuser boolean NOT NULL` | no order; duplicate impossible | `pg_database`, `pg_roles`, privilege-information functions; current database/user and `public` only |
| Q06 | zero or more; `schema name NOT NULL`, `name name NOT NULL`, `access_method name NOT NULL`, `input_type text NOT NULL`, `extension_name name NULL`, `dependency_type "char" NULL` | `(schema,name,access_method,input_type,extension_name,dependency_type)` UTF-8 bytes, nulls first; same key | `pg_namespace`, `pg_opclass`, `pg_am`, `pg_type`, `pg_depend`, `pg_extension` only |

Every query artifact contains the later approved exact SELECT bytes; this addendum contains no generic SQL query payload. `sqlUtf8Lf` must parse as exactly one SELECT and reference only its row's allowlist, exact approved constants, exact columns/aliases, and an explicit order equivalent to the contract where cardinality is plural. Comments, client variables, environment interpolation, search-path resolution, extra statements, writable CTEs, volatile mutation functions, and unknown columns fail. Query artifacts are immutable and individually approved before use; changing one byte creates a new query set and invalidates every result.

Raw result bytes are CJL1: one `RawResultRow` per driver-returned row, arrival order retained, exactly one terminal LF per row, and zero rows represented by zero bytes. Each row has exactly the contract's column count; cell ordinals are contiguous; `isNull=true` requires `valueUtf8=null`, otherwise a non-null canonical PostgreSQL text-format value. Canonical result bytes are CJL1 `CanonicalResultRow` values with cells renamed into contract column order and rows sorted by `QueryOrderKey`; zero rows are zero bytes. No collation, locale, arrival order, trimming, case folding, numeric coercion, null replacement, or deduplication participates. Duplicate semantic keys are retained in raw bytes and cause rejection before observation projection; they are never silently collapsed. Arrays use PostgreSQL text-array parsing under the approved driver, then duplicate-free UTF-8-byte sorting; `requires=NULL` becomes `[]`, while a malformed array or duplicate member rejects.

Observation projection equality is mechanical and total:

- `targetIdentity` is the approved target-binding hash plus the first seven Q01 cells, with OID/integer decimal text parsed as `UInt`; `transactionSnapshotIdentity` and `observedAt` derive from Q01 cells eight and nine. No other source is allowed.
- `availableExtensions` is the ordered Q02 row projection; zero rows becomes `[]`; more than one or duplicate name rejects.
- `availableVersions` is the ordered Q03 projection; booleans accept only exact driver canonical `t`/`f`; `schema` preserves null; `requires` follows the preceding array rule.
- `installedState` and `requiredExtensions` derive only from Q04. Zero rows means ABSENT with no requirements. An ABSENT dependency row requires all six installed-extension identity/owner fields null and all three requirement fields non-null; such rows project only required-extension state. PRESENT requires one non-null extension identity repeated byte-equally across rows; an empty-requires tuple has exactly one row with all three requirement fields null, otherwise one row per non-null requirement triple. Any other partial-null tuple, contradiction, duplicate, or Q02/Q03 disagreement rejects.
- `privileges` is the four Q05 cells; no inference from extension metadata is permitted.
- `opclassObservations` is the ordered Q06 projection; dependency null remains null and `deptype='e'` remains the only extension-membership proof.
- `querySet.queryArtifacts[i].queryId=queryResults[i].queryId` for exactly Q01 through Q06; request/query-set/command hashes are equal, and every result binds the same request, target, approved command identity, Q01 transaction-snapshot identity, and query-set version. `transactionMode` and schema-version literals are approved request/addendum constants. Every `CatalogObservation` scalar, null, array member, and order therefore derives from one exact result cell or one named approved constant; any other source invalidates it.

Q01–Q06 remain later, separately approved, and unexecuted now. No shell, subprocess, client meta-command, dynamic SQL, DDL, DML, temporary object, lock-taking statement, extension command, network discovery, ambient target, or mutable query substitution is permitted. One approved command/tool identity executes SELECTs in exact Q01→Q06 order in one read-only repeatable-read transaction and ends it without mutation.

### 4.3 Deterministic selection and result

```text
ScriptArtifact = {path:NString,byteLength:PosInt,sha256:Hex64,
  role:"CONTROL"|"INSTALL_SCRIPT"|"REQUIRED_EXTENSION_CONTROL"|"REQUIRED_EXTENSION_SCRIPT"}
ComponentPrivilegeProof = {statementOrdinal:PosInt,statementSha256:Hex64,
  componentObjectKind:NString,requiredPrivilege:NString,privilegeEvidenceSha256:Hex64,
  satisfied:Boolean}
ExtensionScriptPrivilegeProofCore = {schemaVersion:"C14C-SCRIPT-PRIVILEGE-PROOF-V1",
  extensionName:"btree_gist",extensionVersion:NString,controlFileSha256:Hex64,
  scriptArtifacts:ScriptArtifact[],scriptSetSha256:Hex64,statementCount:PosInt,
  componentProofs:ComponentPrivilegeProof[],componentProofSetSha256:Hex64,
  completeParserCoverage:Boolean,requiredExtensionNames:PgName[],
  reviewerApprovalEvidenceId:NString,reviewerApprovalEvidenceSha256:Hex64,
  unknownKeys:"REJECT"}
ExtensionScriptPrivilegeProof = ExtensionScriptPrivilegeProofCore + {scriptPrivilegeProofSha256:Hex64}

CatalogSelectionResultCore = {
  schemaVersion:"C14C-CATALOG-SELECTION-RESULT-V1",requestSha256:Hex64,
  snapshotSha256:Hex64,targetIdentitySha256:Hex64,
  outcome:"INSTALLED_EXACT"|"ABSENT_CREATE_ELIGIBLE"|"REJECTED",
  selectedTuple:AvailableVersion|null,selectedVersion:NString|null,
  requiredExtensionNames:PgName[],frozenOwnerOid:UInt|null,
  frozenOwnerName:NString|null,createOwnerName:NString|null,
  creationPrivilegePath:"CURRENT_ROLE_SUPERUSER"|"TRUSTED_EXTENSION"|
    "AUDITED_COMPONENT_PRIVILEGES"|null,
  scriptPrivilegeProof:ExtensionScriptPrivilegeProof|null,
  createStatementUtf8Lf:SqlUtf8Lf|null,
  requiredPostcondition:"FULL_ADDENDUM_B_RECHECK"|null,
  rejectionCodes:("TARGET_IDENTITY_MISMATCH"|"AVAILABLE_ROW_CARDINALITY"|
    "QUERY_ARTIFACT_OR_RESULT_MISMATCH"|"RAW_CANONICAL_PROJECTION_MISMATCH"|
    "DEFAULT_VERSION_NULL"|"DEFAULT_TUPLE_CARDINALITY"|"SCHEMA_INCOMPATIBLE"|
    "INSTALLED_VERSION_MISMATCH"|"OWNER_OR_NAMESPACE_MISMATCH"|
    "REQUIRES_MISMATCH"|"PRIVILEGE_OR_TRUST_FAILURE"|
    "SCRIPT_PRIVILEGE_PROOF_INCOMPLETE"|
    "OPCLASS_PRECONDITION_MISMATCH")[]
}
CatalogSelectionResult = CatalogSelectionResultCore + {selectionResultSha256:Hex64}
```

Algorithm, in this exact order:

1. Verify the approved target binding and every target identity field. Mismatch rejects.
2. Require exactly one Q02 row for `btree_gist` and a non-null `defaultVersion`; no fallback or ordering choice exists.
3. Require exactly one Q03 row with `(name,version)=('btree_gist',defaultVersion)`. This is the selected tuple. Extra versions are retained as evidence but never ranked. Require `schema IS NULL OR schema='public'`.
4. Require the selected tuple's canonical `requires` to equal Q04 requirement evidence; Q06 is opclass evidence only.
5. **Installed path:** require advertised and actual installed versions both equal selected version; namespace `public`; relocatability equal the selected tuple; frozen owner OID/name; exact installed requirements; public `USAGE` and `CREATE`; and exactly one opclass observation `(public,gist_text_ops,gist,pg_catalog.text,btree_gist,'e')`. Produce `INSTALLED_EXACT`, null create bytes/owner, frozen owner values, and full postcondition requirement. Any mismatch rejects.
6. **Absent path:** require both advertised and actual absence; database `CREATE`; public `USAGE` and `CREATE`; exact installed requirements; and zero colliding opclass observations. Select one creation-privilege path by strict priority: (a) if Q05 current-role superuser is true, `CURRENT_ROLE_SUPERUSER`; else (b) if selected `trusted=true`, `TRUSTED_EXTENSION`; else (c) only when selected `superuser=false`, require `AUDITED_COMPONENT_PRIVILEGES` with an `ExtensionScriptPrivilegeProof` binding exact selected version, control file, complete install/required-script closure, every parsed component-object statement, exact privilege evidence, all `satisfied=true`, complete parser coverage, and independent approval. `superuser=false` alone proves nothing. Missing proof input rejects. Produce owner=`currentUserName`, selected path/proof, and exact create bytes. Required opclass membership remains a postcondition after separately approved creation.
7. Any failed predicate yields `REJECTED`, null selected/create fields where selection is not proven, all applicable rejection codes in displayed enum order, and no rendering/root/authority/mutation.

Outcome null rules are closed. `INSTALLED_EXACT` requires selected tuple/version, requirements and frozen owner; creation path/proof/owner/statement are null. `ABSENT_CREATE_ELIGIBLE` requires selected tuple/version, requirements, create owner/statement and one creation path; script proof is non-null only for `AUDITED_COMPONENT_PRIVILEGES`. `REJECTED` requires non-empty ordered rejection codes, null create owner/statement/path/proof, and null selected fields unless the tuple itself passed before a later check failed. No other combination is valid.

This paragraph narrowly supersedes only Binding Addendum B's unsafe absent-path disjunct `superuser=false`. It preserves B's current-role-superuser and trusted-extension paths and all database/schema privilege, owner, version, requires, schema, race, postcondition, and opclass checks. PostgreSQL documentation says trusted extensions can be installed by non-superusers with the required database privilege and otherwise creation commonly requires superuser-like component privileges; the project therefore does not infer script safety from the control-file `superuser=false` flag.

Script artifacts are duplicate-free and ordered `(role,path UTF-8)`; they include the selected control/install bytes and full required-extension closure. Component proofs are contiguous by statement ordinal and form a bijection with the complete parsed statement set; each evidence hash resolves an immutable approved privilege proof for that exact statement/current role/target. `statementCount=|componentProofs|`, both set hashes recompute, every `satisfied=true`, and parser/reviewer approval evidence resolves exactly. Unknown component semantics, unsupported statement, missing script, hash mismatch, duplicate/gap, or mutable evidence rejects the entire path.

`PG_LITERAL(v)` is ASCII `'` + UTF-8 `v` with each `'` doubled + ASCII `'`. After a successful absent result, and only in the separately authorized materialization task, the sole documentary overlay author renders exactly:

```sql
CREATE EXTENSION btree_gist SCHEMA public VERSION '<selected literal>';
```

including one terminal LF and no `WITH`, `IF NOT EXISTS`, `CASCADE`, comment, placeholder, or ambient substitution. The displayed angle-bracket phrase is explanatory only and is forbidden from artifacts. The approved `selectedVersion` is substituted before hashing; the full target-specific CX01 fragment, including its surrounding Addendum-B fail-closed logic, is then authored as new bytes, not patched into an approved generic fragment. The absent CREATE source span must byte-equal the rendered statement. Installed/recheck actions remain synthetic no-ops. A different author, value, or byte sequence requires new review and approval.

### 4.4 Hash preimages and DAG

```text
policySha256 = SHA256(ASCII("C14C-CATALOG-POLICY-V1") || NUL || CJ1(CatalogSelectionPolicy))
requestSha256 = SHA256(ASCII("C14C-CATALOG-REQUEST-V1") || NUL || CJ1(CatalogSelectionRequestCore))
targetIdentitySha256 = SHA256(ASCII("C14C-TARGET-IDENTITY-V1") || NUL || CJ1(TargetDatabaseIdentity))
queryArtifactSha256 = SHA256(ASCII("C14C-QUERY-ARTIFACT-V1") || NUL || CJ1(QueryArtifactCore))
commandIdentitySha256 = SHA256(ASCII("C14C-COMMAND-IDENTITY-V1") || NUL || CJ1(CommandIdentity))
querySetSha256 = SHA256(ASCII("C14C-QUERY-SET-V1") || NUL || CJ1(QuerySetCore) ||
  CJ1(commandIdentitySha256))
projectionSchemaSha256 = SHA256(ASCII("C14C-QUERY-PROJECTION-SCHEMA-V1") || NUL ||
  CJ1(QueryArtifactCore.contract))
rawResultSha256 = SHA256(ASCII("C14C-QUERY-RAW-RESULT-V1") || NUL || rawResultCjl1Utf8Lf)
canonicalResultSha256 = SHA256(ASCII("C14C-QUERY-CANONICAL-RESULT-V1") || NUL || canonicalResultCjl1Utf8Lf)
queryResultSha256 = SHA256(ASCII("C14C-QUERY-RESULT-V1") || NUL ||
  CJ1({core:QueryResultCore,rawResultSha256,canonicalResultSha256}))
scriptSetSha256 = SHA256(ASCII("C14C-SCRIPT-SET-V1") || NUL || CJ1(scriptArtifacts))
componentProofSetSha256 = SHA256(ASCII("C14C-COMPONENT-PROOF-SET-V1") || NUL || CJ1(componentProofs))
scriptPrivilegeProofSha256 = SHA256(ASCII("C14C-SCRIPT-PRIVILEGE-PROOF-V1") || NUL ||
  CJ1(ExtensionScriptPrivilegeProofCore))
snapshotSha256 = SHA256(ASCII("C14C-CATALOG-SNAPSHOT-V1") || NUL || CJ1(CatalogObservationCore))
selectionResultSha256 = SHA256(ASCII("C14C-CATALOG-SELECTION-RESULT-V1") || NUL || CJ1(CatalogSelectionResultCore))
overlayInputSha256 = SHA256(ASCII("C14C-CATALOG-OVERLAY-INPUT-V1") || NUL ||
  CJ1({stagedProposalRootSha256,requestSha256,snapshotSha256,selectionResultSha256,
       cx01FragmentSha256,cx01ExtensionContractSha256}))
```

Each self-hash is excluded only from its own preimage. The catalog DAG is approved parents/policy/staged root plus approved target binding/command/query artifacts → query set → request → raw/canonical Q results and Q01-derived target identity → observation snapshot → selection and optional independently upstream script proof → exact CX01 bytes/rows → overlay input/transition → materialized artifact set/root. Parallel proposal branches are neutral expected-object row bytes → neutral set digest; staged/materialized profile core bytes → state profile digest; row/fragment bytes → state row/artifact sets; those upstream digests enter roots/transition. Q01's target hash derives directly from Q01 canonical cells, not from `queryResultSha256`. Profiles contain no profile digest, neutral bytes contain no root/profile digest, roots exclude their own hashes, transition excludes materialized root, and artifact sets exclude roots. No catalog hash is authority or execution permission.

## 5. Narrow Capacity V2C amendment

No generic payload, optional metadata bag, fifth artifact class, fake `.sqlfrag`, or silent inventory deletion is introduced. The four path classes remain. Two finite profile/row/root states are added; only materialized V2C is a complete Capacity V2 proposal.

### 5.1 Closed deferred row

Capacity V2 has 26 row kinds/27 variants because EVIDENCE has two variants. Staged V2C appends `DEFERRED_CATALOG_OBJECT` at rank 27 after ERROR, yielding 27 kinds/28 variants without moving ranks 1–26.

```text
ParentProposalRowIdV2 = the exact Capacity-V2 grammar
  "C14P2-GLOBAL-<PARENT_KIND>-dddd" | "C14P2-CXnn-<PARENT_KIND>-dddd"
  where PARENT_KIND is one of the 26 parent literals, nn=01..13, dddd=0001..9999,
  and every parent scope/kind/contiguous-ordinal restriction still applies.
DeferredProposalRowIdV2C = "C14P2C-CX01-DEFERRED_CATALOG_OBJECT-0001"
StagedProposalRowIdV2C = ParentProposalRowIdV2 | DeferredProposalRowIdV2C
MaterializedProposalRowIdV2C = ParentProposalRowIdV2
StagedProposalRowV2C = ParentProposalRowV2ExceptSeedSource |
  SEED_SOURCE_V2C_STAGED | DEFERRED_CATALOG_OBJECT
MaterializedProposalRowV2C = ParentProposalRowV2
```

The union is closed. `ParentProposalRowV2ExceptSeedSource` is the exact parent union minus only SEED_SOURCE; no parent variant is altered. Parent variants and parent-only fields continue to accept only `ParentProposalRowIdV2`. Only staged seed-output sets, deferred-anchor structures, staged root projections, and transition structures explicitly typed below may accept `StagedProposalRowIdV2C`. Materialized artifacts reject every `C14P2C-*` value. Canonical staged ordering is the parent `(scopeRank,cxRank,kindRank,ordinal,rowId UTF-8)` order with parent ranks 1–26 and deferred rank 27; the deferred row is therefore after all parent-kind CX01 rows and before CX02 rows only if the parent scope/CX rank comparison has already selected CX01.

```text
StagedAnchorOwnershipEntry={ownedRowId:ParentProposalRowIdV2,
  ownedKind:"PHYSICAL_IDENTIFIER"|"OWNER"|"ATTACHMENT"|"OBJECT_INVENTORY"|
    "SEED_SOURCE"|"PROVENANCE",
  ownershipRole:"EXTENSION_IDENTITY"|"DATABASE_OWNER"|"BASELINE_ATTACHMENT"|
    "EXPECTED_INVENTORY"|"EXTENSION_CONTRACT_SEED"|"EXTENSION_PROVENANCE"}
StagedSeedExpectedOutput={kind:<one of the 27 staged kind literals>,mode:"EMITS"|"REFERENCES_SHARED",
  cardinality:UInt,stableRowIds:StagedProposalRowIdV2C[],stableRowSetSha256:Hex64}
```

Anchor entries are duplicate-free in staged canonical row order. Each allowed kind has exactly its displayed role; another pairing fails. The anchor set equals all and only non-global staged CX01 rows other than the deferred row. Every such row appears once, no global/non-CX01 row appears, and no row may also own through an OBJECT. Existing relational FKs remain exact: ATTACHMENT/OBJECT_INVENTORY point to the listed database OWNER/physical extension identity/attachment; SEED_SOURCE expected owner is the listed OWNER; provenance subjects are contained in the same anchor. The deferred anchor replaces OBJECT semantic ownership only at this staged boundary; it does not impersonate an OBJECT row or satisfy any parent OBJECT FK.

```text
DEFERRED_CATALOG_OBJECT = {schemaVersion:"C14P-ROW-V2C",rowId:DeferredProposalRowIdV2C,
  kind:"DEFERRED_CATALOG_OBJECT",cx:"CX01",ordinal:1,deferredCatalogObjectId:"C14PCD-CX01-0001",
  anchorRowId:DeferredProposalRowIdV2C,
  objectId:"extension:btree_gist",objectClass:"extension",objectInventoryRowId:ParentProposalRowIdV2,
  ownerRowId:ParentProposalRowIdV2,physicalIdentifierRowId:ParentProposalRowIdV2,
  attachmentRowId:ParentProposalRowIdV2,
  expectedFragmentPath:"blocks/CX01/0001.sqlfrag",
  deferredReason:"NO_APPROVED_TARGET_CATALOG_TUPLE_OR_VERSION",selectionPolicySha256:Hex64,
  requiredBindingKinds:["TARGET_BINDING","QUERY_SET","CATALOG_SNAPSHOT","SELECTION_RESULT",
    "VERSION_LITERAL","CX01_FRAGMENT_BYTES","CX01_SOURCE_SPANS_LOCATORS","CX01_EXTENSION_ACTION_GRAPH"],
  parentEvidenceRowIds:ParentProposalRowIdV2[],catalogEvidenceRowIds:[],locatorRowIds:[],
  seedSourceRowIds:ParentProposalRowIdV2[],anchoredRows:StagedAnchorOwnershipEntry[],
  anchorOwnershipSha256:Hex64,materializationRequired:true,
  antiPlaceholderRule:"NULL_BINDING_STATE_ONLY_NO_SENTINEL_BYTES",provenanceRowId:ParentProposalRowIdV2,
  deferredContractSha256:Hex64,rowSha256:Hex64}
```

`anchorRowId=rowId` makes the deferred row the sole staged CX01 ownership root without a hash/reference cycle; every other non-global CX01 row appears once in `anchoredRows`. Owner, physical identifier, attachment, and inventory references resolve by variant-specific FK to the sole CX01 OWNER/PHYSICAL_IDENTIFIER/ATTACHMENT/OBJECT_INVENTORY rows. `parentEvidenceRowIds` resolves only parent EVIDENCE rows and contains exactly canonical, serialization, capacity, Binding B, and this approved addendum evidence in blob-byte order. `seedSourceRowIds` resolves exactly one parent-ID-shaped staged SEED_SOURCE. Anchor↔seed closure uses stable ID literals only; neither row preimage contains the other's row hash. `catalogEvidenceRowIds=[]` and `locatorRowIds=[]`. Required binding names represent absence only; fake hashes, versions, SQL, empty strings, all-zero values, `TBD`, `LATEST`, `${...}`, `<...>`, or any sentinel are invalid.

```text
anchorOwnershipSha256=SHA256(ASCII("C14P-DEFERRED-ANCHOR-OWNERSHIP-V2C")||NUL||CJ1(anchoredRows))
deferredContractSha256 = SHA256(ASCII("C14P-DEFERRED-CATALOG-CONTRACT-V2C")||NUL||
  CJ1({schemaVersion,rowId,kind,cx,ordinal,deferredCatalogObjectId,anchorRowId,objectId,objectClass,
       objectInventoryRowId,ownerRowId,physicalIdentifierRowId,attachmentRowId,
       expectedFragmentPath,deferredReason,selectionPolicySha256,requiredBindingKinds,
       parentEvidenceRowIds,catalogEvidenceRowIds,locatorRowIds,seedSourceRowIds,
       anchoredRows,anchorOwnershipSha256,materializationRequired,antiPlaceholderRule,provenanceRowId}))
rowSha256 = SHA256(ASCII("C14P-ROW-V2C-STAGED")||NUL||CJ1(row except rowSha256))
stagedStableRowSetSha256=SHA256(ASCII("C14P-STAGED-SEED-STABLE-ROW-SET-V2C")||NUL||
  CJ1({kind,mode,cardinality,stableRowIds}))
```

For every staged output, `cardinality=|stableRowIds|`; IDs are duplicate-free in UTF-8 byte order exactly as parent seed sets require; each ID resolves exactly one row whose kind equals the output kind; parent kinds contain only parent IDs; deferred kind contains exactly the deferred ID or is empty. `stableRowSetSha256` equals the displayed preimage. EMITS sets are pairwise disjoint and their union equals all staged rows; REFERENCES_SHARED IDs must belong to exactly one EMITS set. Only CX01 EXTENSION_CONTRACT EMITS the deferred row and emits no byte/action graph. All other seeds have deferred cardinality zero.

`SEED_SOURCE_V2C_STAGED` replaces, rather than adds to, the original variant. It has the exact parent common/variant fields, with `rowId:ParentProposalRowIdV2`, every ordinary FK parent-typed, `schemaVersion:"C14P-ROW-V2C"`, `expectedOutputs:StagedSeedExpectedOutput[27]`, and `rowSha256=SHA256(ASCII("C14P-ROW-V2C-STAGED")||NUL||CJ1(core))`. Thus staged still has one SEED_SOURCE variant. Materialized uses unchanged parent `SeedExpectedOutput[26]` and parent row IDs only. Unknown keys, wrong-kind FKs, staged IDs in parent fields, or 26/27 mixing fail.

### 5.2 Exact staged profile/root

`ProposalProfileV2CStagedCore` is exactly the following 24-field object; unknown keys fail:

```text
{schemaVersion:"C14P-PROFILE-V2C-STAGED",status:"PROPOSED_NON_EXECUTABLE",
 serializationProfile:"CJ1_CJL1_SQLFRAG_V2C_STAGED",rowSchemaVersions:["C14P-ROW-V2","C14P-ROW-V2C"],
 rootSchemaVersion:"C14P-ROOT-V2C-STAGED",parentProposalBlob:Hex40,
 parentProposalApprovalObservation:4802,serializationAddendumBlob:Hex40,
 serializationApprovalObservation:4816,capacityAddendumBlob:Hex40,
 capacityApprovalObservation:PosInt,catalogBindingAddendumBlob:Hex40,
 catalogBindingApprovalObservation:PosInt,bindingAddendumBlob:Hex40,topologyBlob:Hex40,
 c13Commit:Hex40,c13SchemaBlob:Hex40,p16Choice:"B",u01Choice:"A",u02Choice:"A",
 artifactClasses:["profile.cj1","blocks/CXnn/dddd.sqlfrag","proposal-rows.cjl1","proposal-root.cj1"],
 unknownKeys:"REJECT",catalogSelectionPolicySha256:Hex64,catalogStage:"DEFERRED_CX01"}
stagedProfileCj1Bytes=CJ1(ProposalProfileV2CStagedCore)
stagedProfileSha256=SHA256(ASCII("C14P-PROFILE-V2C-STAGED")||NUL||stagedProfileCj1Bytes)
```

`stagedProfileCj1Bytes` is the exact parent-P02 canonical JSON object above plus exactly one LF, with no BOM/NUL/CR/trailing whitespace. The profile has no self-hash field; no hash is inserted into its own bytes.

The staged directory contains profile, 168 fragments excluding only CX01/0001, rows, and root. CX01 retains identity/inventory/owner/attachment/seed/provenance/evidence/decision rows plus the deferred row, but none of OBJECT/BODY/SOURCE_SPAN/LOCATOR/EXTENSION_DECISION_POINT/DECISION_OUTCOME/BRANCH/ACTION/ERROR/DEPENDENCY/EVENT/ATOM/ATOM_OCCURRENCE/BOOLEAN/EXPRESSION_ROOT/LOOP/DECISION_POINT.

```text
ExpectedOwnerIdentityV1={ownerKind:"DATABASE"|"RELATION",renderedIdentity:NString,companyScoped:Boolean}
ExpectedPhysicalIdentityV1={identifierClass:"EXTENSION"|"CHECK"|"FUNCTION"|"TRIGGER"|
  "EXCLUSION"|"CONSTRAINT_TRIGGER",schemaName:PgName|null,relationRenderedIdentity:NString|null,
  localName:PgName,renderedIdentity:NString}
ExpectedAttachmentIdentityV1={c14Child:C14Child,
  afterSnapshot:"baseline"|"S04"|"S05"|"S06"|"S07"|"S08"|"S09"|"S10"|"S11"|"S12"|"S15"|"S21"|"S24",
  coversSnapshots:NString[],
  triggerTiming:"NONE"|"BEFORE"|"AFTER",triggerLevel:"NONE"|"ROW",
  selectedEventKinds:("INSERT"|"UPDATE"|"DELETE")[],selectedUpdateMode:"NONE"|"ALL_COLUMNS",
  selectedUpdateColumnIdentities:NString[],u02BReferenceColumnIdentities:NString[]}
ExpectedObjectInventoryRowV1Core={schemaVersion:"C14P-EXPECTED-OBJECT-INVENTORY-ROW-V1",
  globalOrdinal:PosInt,cx:Cx,objectOrdinal:Ordinal4,objectId:ObjectId,
  objectClass:"extension"|"check"|"function"|"trigger"|"exclusion"|"constraintTrigger",
  ownerIdentity:ExpectedOwnerIdentityV1,physicalIdentity:ExpectedPhysicalIdentityV1,
  attachmentIdentity:ExpectedAttachmentIdentityV1,expectedFragmentPath:RepoPath}
ExpectedObjectInventoryRowV1=ExpectedObjectInventoryRowV1Core+{rowSha256:Hex64}
ExpectedObjectInventoryV1=ExpectedObjectInventoryRowV1[169]
ConcreteObjectBindingV2C={expectedObjectRowSha256:Hex64,inventoryRowId:ParentProposalRowIdV2,
  objectRowId:ParentProposalRowIdV2,fragmentPath:RepoPath}
StagedCxCount={cx:Cx,expectedObjectCount:PosInt,concreteObjectCount:UInt,
  expectedFragmentCount:PosInt,fragmentCount:UInt,rowCount:PosInt}
FragmentInventoryEntryV2CStaged={fragmentPath:RepoPath,cx:Cx,objectOrdinal:Ordinal4,
 objectRowId:ParentProposalRowIdV2,objectId:ObjectId,byteLength:PosInt,lfCount:PosInt,
 fragmentSha256:Hex64,profileVersion:"C14P-PROFILE-V2C-STAGED",ownerRowId:ParentProposalRowIdV2,
 attachmentRowId:ParentProposalRowIdV2}
DeferredInventoryEntry={deferredRowId:"C14P2C-CX01-DEFERRED_CATALOG_OBJECT-0001",
  expectedObjectRowSha256:Hex64,objectId:"extension:btree_gist",cx:"CX01",objectOrdinal:1,
  expectedFragmentPath:"blocks/CX01/0001.sqlfrag",deferredContractSha256:Hex64}

ProposalRootV2CStagedCore={schemaVersion:"C14P-ROOT-V2C-STAGED",rootId:"C14-CX-PROPOSAL-ROOT-V2C-STAGED",
 status:"PROPOSED_NON_EXECUTABLE",gateState:"HUMAN_APPROVAL_REQUIRED",nonAuthority:true,
 stagedProfileSha256:Hex64,parentProposalBlob:Hex40,parentProposalApprovalEvidenceRowId:ParentProposalRowIdV2,
 serializationAddendumBlob:Hex40,serializationApprovalEvidenceRowId:ParentProposalRowIdV2,
 capacityAddendumBlob:Hex40,capacityApprovalEvidenceRowId:ParentProposalRowIdV2,bindingAddendumBlob:Hex40,
 catalogBindingAddendumBlob:Hex40,catalogBindingApprovalEvidenceRowId:ParentProposalRowIdV2,topologyBlob:Hex40,
 c13Commit:Hex40,c13SchemaBlob:Hex40,coreDecisionIds:NString[19],p16Choice:"B",u01Choice:"A",u02Choice:"A",
 serializationDecisionIds:NString[6],capacityDecisionIds:NString[6],
 catalogDecisionIds:["CB01","CB02","CB03","CB04","CB05","CB06","CB07"],cxInventory:StagedCxCount[13],
 expectedObjectInventory:ExpectedObjectInventoryV1,expectedObjectInventoryCjl1:Cjl1Bytes,
 expectedObjectInventorySha256:Hex64,expectedObjectCount:169,
 concreteObjectInventory:ConcreteObjectBindingV2C[168],concreteObjectInventorySha256:Hex64,concreteObjectCount:168,
 deferredCatalogInventory:DeferredInventoryEntry[1],deferredCatalogInventorySha256:Hex64,deferredCatalogObjectCount:1,
 expectedFragmentCount:169,fragmentInventory:FragmentInventoryEntryV2CStaged[168],fragmentInventorySha256:Hex64,fragmentCount:168,
 rowCount:PosInt,rowCountsByKind:KindCountV2CStaged[27],rowSetSha256:Hex64,artifactSetSha256:Hex64,
 proposedDecisionInventory:DecisionInventoryEntry[],decisionInventorySha256:Hex64,
 decisionStatusSummary:DecisionStatusSummary,completenessSummary:StagedCompleteness,
 hashCoverage:StagedHashCoverage,hashExclusions:HashExclusion[4],nextApprovalBoundary:StagedNextApprovalBoundary}
ProposalRootV2CStaged=ProposalRootV2CStagedCore+{proposalRootSha256:Hex64}
```

`ExpectedObjectInventoryV1` is the exact ordered 169-row array of `ExpectedObjectInventoryRowV1`. It contains no proposal row ID, profile version, concrete/deferred state, or catalog value. Owner/physical/attachment identities satisfy parent §4.3 rendering and exact child/snapshot/covers/event/update pairings; identity strings and column arrays are duplicate-free in parent order. `globalOrdinal` is contiguous 1..169 and equals array position; `(cx,objectOrdinal)` follows fixed CX counts and parent identity order; path is canonical. The row identity/class/owner/physical/attachment/path set equals the approved parent 169-identity set exactly.

Each `ConcreteObjectBindingV2C` resolves expected hash → one exact OBJECT_INVENTORY → one exact OBJECT → same path, with kind-checked parent IDs. Staged contains 168 neutral rows as concrete bindings, while `DeferredInventoryEntry.expectedObjectRowSha256` equals the sole neutral extension row hash and its deferred contract. Materialized contains 169 concrete bindings including that same neutral extension row. No neutral row is concrete and deferred simultaneously.

Every reused named V2 type retains its exact parent key set, literals, null rules, order, and reference equations; it is not widened. Within this section every inherited unqualified `ProposalRowId` means `ParentProposalRowIdV2`, never the staged union. In both roots `coreDecisionIds` is the exact literal P01–P19 array, serialization/capacity arrays are exact A01–A06/C01–C06, and `HashExclusion[4]` is the parent's exact ordered four entries. All nested objects reject unknown keys.

The staged core has 51 fields; file has 52. Nested schemas are exact:

```text
StagedCompleteness={expectedObjectInventoryComplete:true,concreteObjectInventoryComplete:true,
  deferredCatalogInventoryComplete:true,fragmentInventoryCompleteForConcreteObjects:true,
 deferredAnchorOwnershipComplete:true,rowReferenceClosureComplete:true,seedEmissionComplete:true,expectedObjectCount:169,
 concreteObjectCount:168,deferredCatalogObjectCount:1,expectedFragmentCount:169,fragmentCount:168,
 fullFragmentBijection:false,completeCapacityV2:false,eligibleForMaterializedProposalApproval:false,
 eligibleForAuthority:false}
StagedHashCoverage={profile:true,concreteFragments:true,rows:true,rowSet:true,
  expectedObjectInventory:true,concreteObjectInventory:true,deferredCatalogInventory:true,
 deferredAnchorOwnership:true,fragmentInventory:true,decisionInventory:true,artifactSet:true,rootCore:true}
StagedNextApprovalBoundary={requiredState:"APPROVE_TARGET_COMMAND_AND_QSET_THEN_READ_ONLY_OBSERVATION",
 authorizes:"NO_TRANSITIVE_ACTION",forbidsAuthority:true}
```

Expected counts are `[1,11,6,9,3,8,12,11,5,14,22,51,16]`; concrete counts are `[0,11,6,9,3,8,12,11,5,14,22,51,16]`. Equations are `|Expected|=169`, `|Concrete|=|Fragments|=168`, `|Deferred|=1`, and `Expected=Concrete identities disjoint-union {extension:btree_gist}`. The sole missing path is CX01/0001. Concrete objects have exact object/fragment bijection; deferred has none.

```text
ArtifactPathEntry={path:RepoPath,byteLength:PosInt,sha256:Hex64}
StagedArtifactSetCore={schemaVersion:"C14P-ARTIFACT-SET-V2C-STAGED",
 profile:ArtifactPathEntry,fragments:ArtifactPathEntry[168],rows:ArtifactPathEntry,
 orderedPaths:RepoPath[170]}
expectedObjectInventoryRowSha256=SHA256(ASCII("C14P-EXPECTED-OBJECT-INVENTORY-ROW-V1")||NUL||
  CJ1(ExpectedObjectInventoryRowV1Core))
expectedObjectInventoryCjl1=direct concatenation of CJ1(ExpectedObjectInventoryRowV1) in
  globalOrdinal 1..169 order, which must equal (CX ordinal,objectOrdinal) order
expectedObjectInventorySha256=SHA256(ASCII("C14P-EXPECTED-OBJECT-INVENTORY-SET-V1")||NUL||
  expectedObjectInventoryCjl1)
stagedConcreteObjectInventorySha256=SHA256(ASCII("C14P-CONCRETE-OBJECT-INVENTORY-V2C-STAGED")||NUL||CJ1(concreteObjectInventory))
stagedDeferredCatalogInventorySha256=SHA256(ASCII("C14P-DEFERRED-CATALOG-INVENTORY-V2C-STAGED")||NUL||CJ1(deferredCatalogInventory))
stagedFragmentInventorySha256=SHA256(ASCII("C14P-FRAGMENT-INVENTORY-V2C-STAGED")||NUL||CJ1(fragmentInventory))
stagedProposalRowsCjl1=direct concatenation of CJ1(StagedProposalRowV2C) in staged canonical order
stagedRowSetSha256=SHA256(ASCII("C14P-ROW-SET-V2C-STAGED")||NUL||stagedProposalRowsCjl1)
stagedArtifactSetSha256=SHA256(ASCII("C14P-ARTIFACT-SET-V2C-STAGED")||NUL||CJ1(StagedArtifactSetCore))
stagedProposalRootSha256=SHA256(ASCII("C14P-ROOT-V2C-STAGED")||NUL||CJ1(ProposalRootV2CStagedCore))
```

`proposal-rows.cjl1` must byte-equal the state-specific row concatenation; row count equals physical CJL1 rows; IDs are unique and grammar-valid; every FK resolves exactly one permitted variant under the state-specific ID type. The staged root's generic digest fields equal the named staged preimages above. Its artifact profile entry is exactly `{path:"profile.cj1",byteLength:|stagedProfileCj1Bytes|,sha256:stagedProfileSha256}`. Each neutral row excludes only its `rowSha256` from its row preimage. `expectedObjectInventoryCjl1` is the direct concatenation of all 169 complete row CJ1 values, one LF each and no blank line; decoding it must byte/project equal the root array. Neither profile/root/row domain enters neutral row or set bytes. Root is excluded from artifact-set paths because it contains that digest; the DAG is acyclic. Staged proves deferred completeness, never full fragment bijection or authority.

### 5.3 Exact materialized profile/root

```text
ProposalProfileV2CMaterializedCore={schemaVersion:"C14P-PROFILE-V2C-MATERIALIZED",
 status:"PROPOSED_NON_EXECUTABLE",serializationProfile:"CJ1_CJL1_SQLFRAG_V2C_MATERIALIZED",
 rowSchemaVersions:["C14P-ROW-V2"],rootSchemaVersion:"C14P-ROOT-V2C-MATERIALIZED",
 parentProposalBlob:Hex40,parentProposalApprovalObservation:4802,serializationAddendumBlob:Hex40,
 serializationApprovalObservation:4816,capacityAddendumBlob:Hex40,capacityApprovalObservation:PosInt,
 catalogBindingAddendumBlob:Hex40,catalogBindingApprovalObservation:PosInt,
 bindingAddendumBlob:Hex40,topologyBlob:Hex40,c13Commit:Hex40,c13SchemaBlob:Hex40,
 p16Choice:"B",u01Choice:"A",u02Choice:"A",
 artifactClasses:["profile.cj1","blocks/CXnn/dddd.sqlfrag","proposal-rows.cjl1","proposal-root.cj1"],
 unknownKeys:"REJECT",catalogSelectionPolicySha256:Hex64,catalogStage:"MATERIALIZED_CX01",
 stagedProposalRootSha256:Hex64,targetBindingSha256:Hex64,catalogRequestSha256:Hex64,
 catalogSnapshotSha256:Hex64,catalogSelectionResultSha256:Hex64,catalogOverlayInputSha256:Hex64}
materializedProfileCj1Bytes=CJ1(ProposalProfileV2CMaterializedCore)
materializedProfileSha256=SHA256(ASCII("C14P-PROFILE-V2C-MATERIALIZED")||NUL||materializedProfileCj1Bytes)
```

The materialized core has exactly 30 fields and rejects unknown keys. `materializedProfileCj1Bytes` is that exact self-hash-free CJ1 object plus one LF under the same BOM/NUL/CR/trailing-whitespace prohibitions. Neither profile contains its digest. Roots, artifact sets, and transition use only the corresponding domain-separated digest.

```text
FragmentInventoryEntryV2CMaterialized={fragmentPath:RepoPath,cx:Cx,objectOrdinal:Ordinal4,
 objectRowId:MaterializedProposalRowIdV2C,objectId:ObjectId,byteLength:PosInt,lfCount:PosInt,
 fragmentSha256:Hex64,profileVersion:"C14P-PROFILE-V2C-MATERIALIZED",ownerRowId:MaterializedProposalRowIdV2C,
 attachmentRowId:MaterializedProposalRowIdV2C}
ProposalRootV2CMaterializedCore={schemaVersion:"C14P-ROOT-V2C-MATERIALIZED",rootId:"C14-CX-PROPOSAL-ROOT-V2C-MATERIALIZED",
 status:"PROPOSED_NON_EXECUTABLE",gateState:"HUMAN_APPROVAL_REQUIRED",nonAuthority:true,
 materializedProfileSha256:Hex64,parentProposalBlob:Hex40,parentProposalApprovalEvidenceRowId:ParentProposalRowIdV2,
 serializationAddendumBlob:Hex40,serializationApprovalEvidenceRowId:MaterializedProposalRowIdV2C,
 capacityAddendumBlob:Hex40,capacityApprovalEvidenceRowId:MaterializedProposalRowIdV2C,bindingAddendumBlob:Hex40,
 catalogBindingAddendumBlob:Hex40,catalogBindingApprovalEvidenceRowId:MaterializedProposalRowIdV2C,topologyBlob:Hex40,
 c13Commit:Hex40,c13SchemaBlob:Hex40,stagedProposalRootSha256:Hex64,targetBindingSha256:Hex64,
 catalogRequestSha256:Hex64,catalogSnapshotSha256:Hex64,catalogSelectionResultSha256:Hex64,
 catalogOverlayInputSha256:Hex64,transitionSha256:Hex64,coreDecisionIds:NString[19],p16Choice:"B",u01Choice:"A",u02Choice:"A",
 serializationDecisionIds:NString[6],capacityDecisionIds:NString[6],
 catalogDecisionIds:["CB01","CB02","CB03","CB04","CB05","CB06","CB07"],cxInventory:CxCount[13],
 expectedObjectInventory:ExpectedObjectInventoryV1,expectedObjectInventoryCjl1:Cjl1Bytes,
 expectedObjectInventorySha256:Hex64,expectedObjectCount:169,
 concreteObjectInventory:ConcreteObjectBindingV2C[169],concreteObjectInventorySha256:Hex64,
 concreteObjectCount:169,
 fragmentInventory:FragmentInventoryEntryV2CMaterialized[169],fragmentInventorySha256:Hex64,fragmentCount:169,
 rowCount:PosInt,rowCountsByKind:KindCount[26],rowSetSha256:Hex64,artifactSetSha256:Hex64,
 proposedDecisionInventory:DecisionInventoryEntry[],decisionInventorySha256:Hex64,
 decisionStatusSummary:DecisionStatusSummary,completenessSummary:MaterializedCompleteness,
 hashCoverage:MaterializedHashCoverage,hashExclusions:HashExclusion[4],nextApprovalBoundary:MaterializedNextApprovalBoundary}
ProposalRootV2CMaterialized=ProposalRootV2CMaterializedCore+{proposalRootSha256:Hex64}
```

Materialized core has 54 fields; file has 55. Nested schemas are exact:

```text
MaterializedCompleteness={expectedObjectInventoryComplete:true,concreteObjectInventoryComplete:true,fragmentInventoryComplete:true,
 rowReferenceClosureComplete:true,locatorCount:PosInt,locatorComplete:true,
 sourceSpanCount:PosInt,sourceSpanComplete:true,dependencyCount:UInt,dependencyComplete:true,
 eventCount:UInt,eventComplete:true,errorCount:UInt,errorComplete:true,seedSourceCount:PosInt,
 seedSourceComplete:true,decisionCount:PosInt,decisionComplete:true,u02TriggerListRowCount:25,
 u02PhysicalColumnOccurrenceCount:170,deferredCatalogObjectCount:0,catalogSelectionBound:true,
 stagedTransitionComplete:true,completeCapacityV2:true}
MaterializedHashCoverage={profile:true,fragments:true,rows:true,rowSet:true,expectedObjectInventory:true,
 concreteObjectInventory:true,
 fragmentInventory:true,decisionInventory:true,catalogEvidence:true,artifactSet:true,transition:true,rootCore:true}
MaterializedNextApprovalBoundary={requiredState:"INDEPENDENT_PASS_THEN_FRANCO_EXACT_MATERIALIZED_ROOT_APPROVAL",
 authorizes:"SEPARATE_AUTHORITY_AUTHORING_REQUEST_ONLY",forbidsAuthority:true}
```

```text
MaterializedArtifactSetCore={schemaVersion:"C14P-ARTIFACT-SET-V2C-MATERIALIZED",
 profile:ArtifactPathEntry,fragments:ArtifactPathEntry[169],rows:ArtifactPathEntry,
 orderedPaths:RepoPath[171]}
materializedConcreteObjectInventorySha256=SHA256(ASCII("C14P-CONCRETE-OBJECT-INVENTORY-V2C-MATERIALIZED")||NUL||CJ1(concreteObjectInventory))
materializedFragmentInventorySha256=SHA256(ASCII("C14P-FRAGMENT-INVENTORY-V2C-MATERIALIZED")||NUL||CJ1(fragmentInventory))
materializedProposalRowsCjl1=direct concatenation of CJ1(MaterializedProposalRowV2C) in parent canonical order
materializedRowSetSha256=SHA256(ASCII("C14P-ROW-SET-V2C-MATERIALIZED")||NUL||materializedProposalRowsCjl1)
materializedArtifactSetSha256=SHA256(ASCII("C14P-ARTIFACT-SET-V2C-MATERIALIZED")||NUL||CJ1(MaterializedArtifactSetCore))
materializedProposalRootSha256=SHA256(ASCII("C14P-ROOT-V2C-MATERIALIZED")||NUL||CJ1(ProposalRootV2CMaterializedCore))
```

The materialized root's generic digest fields equal the named materialized preimages above. Its artifact profile entry is exactly `{path:"profile.cj1",byteLength:|materializedProfileCj1Bytes|,sha256:materializedProfileSha256}`. Materialized restores 169 OBJECT rows/fragments and original CX counts. CX01 has one OBJECT/fragment, one EXTENSION_DECISION_POINT, eight outcomes, eight branches, eight actions, five errors, and exact byte/result-derived spans, locators, evidence, dependencies, selected requirements, and two opclass uses. Row kinds/variants return to 26/27; deferred count is zero.

### 5.4 Immutable transition and capacity matrix

```text
TransitionCore={schemaVersion:"C14P-CATALOG-TRANSITION-V1",stagedProposalRootSha256:Hex64,
 materializedProfileSha256:Hex64,targetBindingSha256:Hex64,catalogRequestSha256:Hex64,
 catalogSnapshotSha256:Hex64,catalogSelectionResultSha256:Hex64,
 removedDeferredRowIds:["C14P2C-CX01-DEFERRED_CATALOG_OBJECT-0001"],removedDeferredContractSha256:Hex64,
 addedCx01FragmentPath:"blocks/CX01/0001.sqlfrag",addedCx01FragmentSha256:Hex64,
 addedCx01ObjectId:"extension:btree_gist",addedCx01RowIds:MaterializedProposalRowIdV2C[],
  expectedObjectInventoryCjl1:Cjl1Bytes,expectedObjectInventorySha256:Hex64,
  unchanged168FragmentSetSha256:Hex64,
  unchangedNonCatalogSemanticRowsSha256:Hex64,seedProjectionTransitionSha256:Hex64,
  anchorOwnershipTransitionSha256:Hex64,
  materializedRowSetSha256:Hex64,
 materializedArtifactSetSha256:Hex64,transitionRule:"REMOVE_ONE_DEFERRED_ADD_ONE_CONCRETE_CX01_GRAPH"}
transitionSha256=SHA256(ASCII("C14P-CATALOG-TRANSITION-V1")||NUL||CJ1(TransitionCore))
UnchangedFragmentEntry={path:RepoPath,fragmentSha256:Hex64}
unchanged168FragmentSetSha256=SHA256(ASCII("C14P-UNCHANGED-168-FRAGMENTS-V1")||NUL||
  CJ1(UnchangedFragmentEntry[168] in staged path order))
unchangedNonCatalogSemanticRowsSha256=SHA256(ASCII("C14P-UNCHANGED-NONCATALOG-ROWS-V1")||NUL||
  NonCatalogSemanticCoreCjl1Bytes)
SeedTransitionEntry={stagedSeedRowId:ParentProposalRowIdV2,materializedSeedRowId:MaterializedProposalRowIdV2C,
 ranks1To26TransitionSha256:Hex64,deferredRank27Mode:"ZERO_REMOVED"|"ONE_DEFERRED_REPLACED"}
ranks1To26TransitionSha256=SHA256(ASCII("C14P-SEED-RANKS-1-26-TRANSITION-V1")||NUL||
  CJ1({stagedExpectedOutputs:StagedSeedExpectedOutput[26],materializedExpectedOutputs:SeedExpectedOutput[26]}))
seedProjectionTransitionSha256=SHA256(ASCII("C14P-SEED-PROJECTION-TRANSITION-V1")||NUL||
  CJ1(SeedTransitionEntry[] in stable seed-ID order))
AnchorReferenceMap={stagedFromRowId:ParentProposalRowIdV2,
  fieldName:"SEMANTIC_OWNER_ANCHOR"|"EXPECTED_OUTPUT_STABLE_ROW_ID",
  stagedTargetRowId:DeferredProposalRowIdV2C,materializedFromRowId:MaterializedProposalRowIdV2C,
  materializedTargetRowId:MaterializedProposalRowIdV2C}
AnchorOwnershipTransitionEntry={stagedOwnedRowId:ParentProposalRowIdV2,
  materializedRowId:MaterializedProposalRowIdV2C,
  disposition:"SURVIVES_EXACT"|"SURVIVES_REHASHED"|"REPLACED",
  concreteExtensionObjectRowId:MaterializedProposalRowIdV2C,referenceMaps:AnchorReferenceMap[]}
anchorOwnershipTransitionSha256=SHA256(ASCII("C14P-ANCHOR-OWNERSHIP-TRANSITION-V1")||NUL||
  CJ1(AnchorOwnershipTransitionEntry[] in staged anchor order))
```

`NonCatalogSemanticCoreCjl1Bytes` excludes all SEED_SOURCE rows and is the direct CJL1 concatenation of row cores, excluding row hashes, for stable non-CX01 non-global semantic rows in staged canonical order; materialized bytes must be identical. For every non-CX01 seed, the rank-1..26 projections `{kind,mode,cardinality,stableRowIds}` equal materialized parent outputs exactly and rank 27 is zero/removed. The CX01 extension seed removes its deferred emission and gains the exact ordinary graph IDs; its other unchanged output projections remain equal. `ranks1To26TransitionSha256` binds both typed arrays, including staged set hashes. `deferredRank27Mode` is `ZERO_REMOVED` or, only for CX01 EXTENSION_CONTRACT, `ONE_DEFERRED_REPLACED`.

Every staged anchor entry has exactly one ownership-transition entry. Surviving identity/owner/attachment/inventory/provenance rows map to their exact materialized row IDs; changed seed/provenance bytes use `SURVIVES_REHASHED`; rows subsumed by concrete graph use `REPLACED`. Every reference whose staged semantic target is the deferred anchor is listed once and retargeted to the sole materialized CX01 OBJECT; ordinary parent FKs remain byte-equal unless listed. Materialized reverse ownership must reach exactly that OBJECT under parent V2 equations. Missing/duplicate mappings, deferred ID in a materialized field, orphan, second owner, or dual anchor/OBJECT ownership fail.

Both roots' `expectedObjectInventory` arrays, `expectedObjectInventoryCjl1`, and digest must be byte-identical. Transition carries those exact bytes/digest and verifies array decoding, 169 row hashes, canonical order, and identity-set equality; recomputing only a digest is insufficient. Profile entry hash equals the state-specific profile hash, each fragment entry equals its fragment hash, and rows entry equals the row-set hash. Profile path is `profile.cj1`; rows path is `proposal-rows.cjl1`; ordered paths are profile, fragments, rows, without root. Materialized root binds transition; transition omits materialized root hash. `addedCx01RowIds` equals all newly materialized graph rows. Validation additionally requires byte-identical 168 fragments, exact seed/ownership projections, one removed deferred row, one added CX01 fragment/object/complete graph, zero deferred rows, and all materialized equations. Substitution, reordering, extra/missing object, changed old fragment, second CX01 fragment, or partial graph invalidates transition/root.

| Capacity | Staged | Materialized |
|---|---:|---:|
| Profile fields | 24 | 30 |
| Root core/total fields | 51/52 | 54/55 |
| Row kinds/variants | 27/28 | 26/27 |
| Row-ID domain | parent IDs plus one closed deferred ID | parent IDs only |
| Expected objects | 169 | 169 |
| Neutral expected inventory | identical 169 rows/CJL1/digest | identical 169 rows/CJL1/digest |
| Concrete OBJECT rows/fragments | 168/168 | 169/169 |
| Deferred rows | 1 | 0 |
| CX01 ownership root | one deferred anchor; no OBJECT | one concrete extension OBJECT; no anchor |
| Seed output entries | 27 | 26 |
| Full fragment bijection/Capacity V2 complete | false/false | true/true |
| Authority eligible | false | false pending separate exact approval/task |

## 6. Replay, drift, expiry, and failure behavior

The immutable snapshot identity is `snapshotSha256` plus its request and target identity. It is valid only for that approved target binding, system identifier, database OID/name, server identity, current-user identity, approved command/tool identity, transaction snapshot identity, query-set version, six exact query-artifact hashes, six raw-result hashes, six canonical-result hashes, six query-result hashes, and observation projection.

No invented wall-clock lifetime applies. Staleness is identity/change based. Before CX01 materialization and again in any separately approved execution preflight, reobserve Q01–Q06 under the same approved artifacts. Any changed target, command/tool/driver/invocation identity, transaction snapshot contract, SQL byte, query contract, raw/canonical result, projection, default/installed version, tuple, requirement, schema/relocatability, owner, privilege, script proof, required-extension state, or opclass state invalidates the snapshot and dependent result/transition/root. The process stops and requires new observation, review, approval, and materialized root. `observedAt` is evidence, never expiry policy.

Anti-substitution checks require exact equality of all parents, this approved addendum, both exact profile bytes/hashes, neutral 169-row inventory array/CJL1/digest, staged ID union/FKs/seed sets, deferred ownership anchor/map, staged root, target binding, request, six query artifacts/results and raw/canonical bytes, command/target identities, snapshot, selection and optional script proof, selected-version bytes, CX01 fragment/rows, seed/ownership transition, overlay input, and materialized root. Anti-replay rejects another request, target, tool binary/version, driver, invocation profile, observer, transaction snapshot, query set, raw result, or projection. Same provider label with different identity fails; restored/cloned database with mismatched target binding fails; provider upgrade changing catalog/query/tool evidence fails. Recomputed hashes without exact approval prove consistency only.

Failure is always closed: no fallback version, alternate ordering, default omission, partial root, authority root, fragment substitution, create attempt, or extension no-op is emitted. Duplicate-create race handling remains Addendum B's one full existing-path recheck during a separately authorized execution; it is not part of catalog selection and grants no mutation here.

## 7. Illustrative catalogs — never project selections

The values below are deliberately marked `EXAMPLE_ONLY_NOT_APPROVED`; they are not a provider, target, PostgreSQL major, requested version, snapshot, or permission.

**Installed example.** Q02 illustratively reports default/installed `EXAMPLE_ONLY_1.2`; Q03 has one matching tuple `{superuser:true,trusted:true,relocatable:true,schema:null,requires:[]}`; Q04 reports installed version `EXAMPLE_ONLY_1.2`, namespace `public`, owner `EXAMPLE_ONLY_OWNER`; privileges pass; Q06 reports exact extension-member `public.gist_text_ops`. The result would be `INSTALLED_EXACT`, with frozen illustrative owner, null create bytes, full postcondition recheck, and no mutation. If installed version were `EXAMPLE_ONLY_1.1`, selection would reject rather than upgrade or choose it.

**Absent example.** Q02 illustratively reports default `EXAMPLE_ONLY_2.0` and installed null; Q03 has exactly one tuple with `trusted=true`; Q04 proves required dependency state; Q05 proves DB CREATE and public USAGE/CREATE while current role is not superuser; Q06 proves no collision. The result may use `TRUSTED_EXTENSION` and later candidate bytes `CREATE EXTENSION btree_gist SCHEMA public VERSION 'EXAMPLE_ONLY_2.0';\n`. If instead `trusted=false` and `superuser=false`, eligibility remains REJECTED unless a complete separately approved illustrative script proof binds every exact script/component privilege; the flag alone never passes.

**Worked staged → materialized example.** All values are `EXAMPLE_ONLY_NOT_APPROVED`. One neutral 169-row inventory CJL1 byte string/digest is copied byte-for-byte into both roots. The staged profile's exact 24-field bytes produce its staged profile hash; its row file contains parent-shaped IDs plus sole `C14P2C-CX01-DEFERRED_CATALOG_OBJECT-0001`. That anchor self-identifies and owns every other non-global CX01 row once, while staged seeds use typed 27-entry outputs. Counts are 169 expected, 168 concrete/fragments, one deferred, 27 kinds/28 variants. Later illustrative Q results select `EXAMPLE_ONLY_2.0`; transition preserves neutral bytes/digest and 168 fragments, removes the anchor, maps all anchor-owned rows/references to one concrete parent-ID CX01 OBJECT, converts seed outputs to parent 26-entry form, and adds CX01/0001 plus the 1/8/8/8/5 graph. The exact 30-field materialized profile gets a different profile hash; final counts are 169 concrete fragments, zero staged IDs/deferred rows, 26 kinds/27 variants, and all completeness predicates true. Changed neutral bytes, wrong ID grammar/FK, orphan/dual ownership, changed old fragment, or second identity fails.

## 8. Required sequence and approval boundaries

1. Independently review this exact blob, including parent hashes, alternatives, schemas, DAG, feasibility, inventory, and prohibitions.
2. Franco approves or revises this exact blob and selects all seven cells as one package.
3. Separately authorize generic staged proposal authoring; author 168 concrete fragments plus the one deferred CX01 record/root.
4. Independently review and Franco approves the exact staged root/artifact set. This approves no catalog access.
5. Separately identify/approve one target binding, command identity, and six exact query artifacts/contracts, then authorize read-only observation.
6. Capture immutable raw/canonical query results and mechanical projection; independently review request/query artifacts/results/snapshot/selection and any required script proof; Franco approves their exact hashes. No mutation occurs.
7. Separately authorize the sole documentary overlay author to render the literal CREATE bytes, author the complete CX01 fragment/rows, and compute a candidate materialized proposal root.
8. Independently review semantic/byte/hash equality, replay/drift defenses, 169-object/fragment completeness, and the candidate root; Franco approves that exact target-specific materialized root/artifact set.
9. Only then separately authorize seed registry and 91 authority-manifest authoring; independently review; Franco approves the exact authority tuple/root.
10. Separately generate/verify final P19 wrappers, authority manifests, source-slot bindings, execution bindings, and every required approval in their governing sequence.
11. Only a later explicit execution authorization may permit preflight and eventual CREATE/extension execution; any drift returns to step 5. Deployment/production remain separate.

No step grants the next. This addendum, a snapshot, a selection result, a proposal root, an authority root, or a binding never authorizes another artifact or any execution transitively.

## 9. PostgreSQL documentation versus project decisions

Official current PostgreSQL documentation states that `CREATE EXTENSION` accepts `SCHEMA` and `VERSION` (and also documents `IF NOT EXISTS` and `CASCADE`) and that trusted extensions can be installed by a non-superuser with CREATE privilege on the current database: <https://www.postgresql.org/docs/current/sql-createextension.html>. Extension control/script and trusted/superuser security semantics are documented at <https://www.postgresql.org/docs/current/extend-extensions.html>. PostgreSQL documents `pg_available_extension_versions` and the `name`, `version`, `installed`, `superuser`, `trusted`, `relocatable`, `schema`, and `requires` columns at <https://www.postgresql.org/docs/current/view-pg-available-extension-versions.html>, and `pg_available_extensions` with `name`, `default_version`, and `installed_version` at <https://www.postgresql.org/docs/current/view-pg-available-extensions.html>. Installed extension catalog semantics are at <https://www.postgresql.org/docs/current/catalog-pg-extension.html>.

Those are PostgreSQL semantics only. Requiring a complete approved component-object privilege proof when using the non-trusted/non-superuser path is a stricter project gate, not a claim that PostgreSQL emits that proof. The unique-default rule, rendering, canonicalization, schemas, query allowlist, identities, hashes, staging/transition, replay rules, and approvals are OSSUM COR decisions. This addendum claims no PostgreSQL major, provider, environment, version, state, owner, privilege, requirement, or opclass observation.

## 10. Prohibitions

Publication or approval of this file alone authorizes no database/catalog/network query, SQL generation or execution, extension create/update, schema, migration, Prisma, runner, seed, manifest/root/binding generation, provider selection, Git commit/publication, deployment, staging, production, or destructive action. All such work remains prohibited unless separately and explicitly approved at its stated gate.
