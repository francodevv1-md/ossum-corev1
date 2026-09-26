#!/usr/bin/env node
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { compareCompletePackage, independentSyntheticObservation, independentlyValidateSc63Projection,
  reconstructPackage } from './verify-authority.mjs';
import { BLOCK_SHA, independentlyParse, independentlyValidateQuery, SOURCE_SHA,
  vCanonical, vDomain, vFail, vHash, vKeys, vText } from './verify-parse.mjs';
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE,'../../../..');
const SOURCE = join(HERE,'SEMANTIC_SOURCE.cj1');
const BLOCKS = join(HERE,'OBJECT_BLOCKS.cjl1');
const GENERATOR = join(HERE,'generate.mjs');
const OBSERVATION = join(HERE,'CATALOG_OBSERVATION.cj1');
const PACKAGE = 'PACKAGE_B_RTS1B.cj1';
const MODULES=['generate.mjs','generate-parse.mjs','generate-authority.mjs',
  'verify.mjs','verify-parse.mjs','verify-authority.mjs'];
const CANDIDATE_INPUTS=['SEMANTIC_SOURCE.cj1','OBJECT_BLOCKS.cjl1',
  'SEMANTIC_COMPLETION_PROPOSAL.md','RENDERING_COMPLETION_PROPOSAL.md'];
const CONNECTION={database:'postgres',fragment:'',host:'aws-1-sa-east-1.pooler.supabase.com',port:5432,
  projectRef:'yywqcdromnmmelijvspi',protocol:'postgresql:',query:'',
  schemaVersion:'C14-SIMPLIFICATION-CONNECTION-PROFILE-V1',tier:'development',tlsMode:'verify-full',
  username:'postgres.yywqcdromnmmelijvspi'};
const IDS = [
  'Q01_TARGET_IDENTITY', 'Q02_AVAILABLE_EXTENSION', 'Q03_AVAILABLE_VERSIONS',
  'Q04_INSTALLED_OWNER_REQUIRES', 'Q05_PRIVILEGES', 'Q06_OPCLASS',
];
const SQL = [
  ['SELECT c.system_identifier::text AS system_identifier,d.oid::text AS database_oid,',
    'd.datname::text AS database_name,current_setting(\'server_version_num\') AS server_version_num,',
    'version() AS server_version,r.oid::text AS current_user_oid,r.rolname::text AS current_user_name,',
    'pg_current_snapshot()::text AS transaction_snapshot_identity,to_char(transaction_timestamp() ',
    'AT TIME ZONE \'UTC\',\'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"\') AS observed_at ',
    'FROM pg_catalog.pg_control_system() AS c JOIN pg_catalog.pg_database AS d ',
    'ON d.datname=current_database() JOIN pg_catalog.pg_roles AS r ON r.rolname=current_user;\n'].join(''),
  ['SELECT name::text AS name,default_version::text AS default_version,',
    'installed_version::text AS installed_version FROM pg_catalog.pg_available_extensions ',
    'WHERE name=\'btree_gist\' ORDER BY name COLLATE "C";\n'].join(''),
  ['SELECT name::text AS name,version::text AS version,',
    'CASE WHEN installed THEN \'t\' ELSE \'f\' END AS installed,',
    'CASE WHEN superuser THEN \'t\' ELSE \'f\' END AS superuser,',
    'CASE WHEN trusted THEN \'t\' ELSE \'f\' END AS trusted,',
    'CASE WHEN relocatable THEN \'t\' ELSE \'f\' END AS relocatable,',
    'schema::text AS schema,requires::text AS requires ',
    'FROM pg_catalog.pg_available_extension_versions WHERE name=\'btree_gist\' ',
    'ORDER BY name COLLATE "C",version COLLATE "C";\n'].join(''),
  ['SELECT e.extname::text AS extension_name,e.extversion::text AS installed_version,',
    'n.nspname::text AS namespace,CASE WHEN v.relocatable THEN \'t\' ',
    'WHEN v.relocatable IS FALSE THEN \'f\' ELSE NULL END AS relocatable,',
    'e.extowner::text AS owner_oid,r.rolname::text AS owner_name,',
    're.extname::text AS required_name,re.extversion::text AS required_installed_version,',
    'rn.nspname::text AS required_namespace FROM pg_catalog.pg_extension AS e ',
    'JOIN pg_catalog.pg_namespace AS n ON n.oid=e.extnamespace ',
    'JOIN pg_catalog.pg_roles AS r ON r.oid=e.extowner ',
    'LEFT JOIN pg_catalog.pg_available_extension_versions AS v ',
    'ON v.name=e.extname AND v.version=e.extversion LEFT JOIN pg_catalog.pg_depend AS dep ',
    'ON dep.classid=\'pg_catalog.pg_extension\'::regclass AND dep.objid=e.oid ',
    'AND dep.refclassid=\'pg_catalog.pg_extension\'::regclass ',
    'LEFT JOIN pg_catalog.pg_extension AS re ON re.oid=dep.refobjid ',
    'LEFT JOIN pg_catalog.pg_namespace AS rn ON rn.oid=re.extnamespace ',
    'WHERE e.extname=\'btree_gist\' ORDER BY e.extname COLLATE "C",',
    're.extname COLLATE "C" NULLS FIRST;\n'].join(''),
  ['SELECT CASE WHEN has_database_privilege(current_user,current_database(),\'CREATE\') ',
    'THEN \'t\' ELSE \'f\' END AS database_create,',
    'CASE WHEN has_schema_privilege(current_user,\'public\',\'USAGE\') ',
    'THEN \'t\' ELSE \'f\' END AS public_usage,',
    'CASE WHEN has_schema_privilege(current_user,\'public\',\'CREATE\') ',
    'THEN \'t\' ELSE \'f\' END AS public_create,',
    'CASE WHEN r.rolsuper THEN \'t\' ELSE \'f\' END AS current_user_superuser ',
    'FROM pg_catalog.pg_roles AS r WHERE r.rolname=current_user;\n'].join(''),
  ['SELECT n.nspname::text AS schema,o.opcname::text AS name,a.amname::text AS access_method,',
    '(tn.nspname||\'.\'||t.typname)::text AS input_type,e.extname::text AS extension_name,',
    'd.deptype::text AS dependency_type FROM pg_catalog.pg_opclass AS o ',
    'JOIN pg_catalog.pg_namespace AS n ON n.oid=o.opcnamespace ',
    'JOIN pg_catalog.pg_am AS a ON a.oid=o.opcmethod ',
    'JOIN pg_catalog.pg_type AS t ON t.oid=o.opcintype ',
    'JOIN pg_catalog.pg_namespace AS tn ON tn.oid=t.typnamespace ',
    'LEFT JOIN pg_catalog.pg_depend AS d ON d.classid=\'pg_catalog.pg_opclass\'::regclass ',
    'AND d.objid=o.oid AND d.refclassid=\'pg_catalog.pg_extension\'::regclass ',
    'LEFT JOIN pg_catalog.pg_extension AS e ON e.oid=d.refobjid ',
    'WHERE n.nspname=\'public\' AND o.opcname=\'gist_text_ops\' AND a.amname=\'gist\' ',
    'AND tn.nspname=\'pg_catalog\' AND t.typname=\'text\' ',
    'ORDER BY n.nspname COLLATE "C",o.opcname COLLATE "C",a.amname COLLATE "C",',
    'tn.nspname COLLATE "C",t.typname COLLATE "C",e.extname COLLATE "C" NULLS FIRST,',
    'd.deptype NULLS FIRST;\n'].join(''),
];
const CONTRACTS = [
  {columns:['system_identifier','database_oid','database_name','server_version_num','server_version',
    'current_user_oid','current_user_name','transaction_snapshot_identity','observed_at'],min:1,max:1,
    relations:['pg_control_system','pg_database','pg_roles']},
  {columns:['name','default_version','installed_version'],min:0,max:1,
    relations:['pg_available_extensions']},
  {columns:['name','version','installed','superuser','trusted','relocatable','schema','requires'],min:0,
    max:null,relations:['pg_available_extension_versions']},
  {columns:['extension_name','installed_version','namespace','relocatable','owner_oid','owner_name',
    'required_name','required_installed_version','required_namespace'],min:0,max:null,
    relations:['pg_extension','pg_namespace','pg_roles','pg_available_extension_versions','pg_depend']},
  {columns:['database_create','public_usage','public_create','current_user_superuser'],min:1,max:1,
    relations:['pg_roles']},
  {columns:['schema','name','access_method','input_type','extension_name','dependency_type'],min:0,
    max:null,relations:['pg_opclass','pg_namespace','pg_am','pg_type','pg_depend','pg_extension']},
];
const RAW_HASHES = [
  '953be69cf157343123fb0e84cd3788163d01b40c49b09d5cee09931370f401a7',
  '298fcd0c19da57ce63ff27c731f2b3ee8cc6f263e5afda8a176567243b1545e8',
  '2d3801671e2f1b2f165b47c923c3e51087f4b776f20dfc1205dfeb8f2c73f43f',
  '346c688d26d5cab2c82ca28b81a28794d635e544e1418680193238db783a6ad6',
  '03fbdfc6ef5d72693daeb7e4d92062423faced3f055336e3e26834b080bb6dd0',
  '2baa2018a7be381ffd076b57e067b53a2fcca71b70070c94022d947f4555e844',
];
function independentlyLoad() {
  const sourceBytes=readFileSync(SOURCE),blocksBytes=readFileSync(BLOCKS);
  if(vHash(sourceBytes)!==SOURCE_SHA||vHash(blocksBytes)!==BLOCK_SHA)vFail('SOURCE_HASH_MISMATCH');
  const source=JSON.parse(vText(sourceBytes,'SEMANTIC_SOURCE.cj1'));
  const rows=vText(blocksBytes,'OBJECT_BLOCKS.cjl1').trimEnd().split('\n').map(JSON.parse);
  if(rows.length!==169||source.objectBlocksBinding.rowCount!==169)vFail('OBJECT_COUNT');
  if(vDomain(source.objectBlocksBinding.aggregateDomain,blocksBytes)!==
      source.objectBlocksBinding.objectAggregateSha256)vFail('OBJECT_AGGREGATE_HASH');
  const seen=new Set(),inventories=[];
  rows.forEach((row,index)=>{if(row.globalOrdinal!==index+1||seen.has(row.objectId))vFail('OBJECT_ORDINAL',row.objectId);seen.add(row.objectId);
    const core={...row};delete core.objectRowSha256;
    if(vDomain(source.objectBlocksBinding.rowDomain,vCanonical(core))!==row.objectRowSha256)vFail('OBJECT_ROW_HASH',row.objectId);
    if(vDomain(source.objectBlocksBinding.semanticDomain,vCanonical(row.semanticCore))!==row.sourceSemanticSha256)vFail('OBJECT_SEMANTIC_HASH',row.objectId);
    if(!index){inventories.push(null);return;}const bytes=Buffer.from(row.rendering.bytesBase64,'base64');
    const rebuilt=Buffer.concat(row.rendering.ast.losslessChildren.map((line,ordinal)=>{if(line.nodeType!=='SOURCE_LINE'||
      line.ordinal!==ordinal+1)vFail('AST_UNKNOWN',row.objectId);return Buffer.from(line.utf8Base64,'base64');}));
    if(!bytes.equals(rebuilt)||vHash(bytes)!==row.rendering.rawSha256||vDomain('C14P-OBJECT-BLOCK-V2',bytes)!==
      row.rendering.v2ObjectBlockSha256)vFail('FRAGMENT_OR_AST_HASH',row.objectId);inventories.push(independentlyParse(row,bytes));});
  inventories.forEach((inventory,index)=>inventory?.errors.forEach(error=>{if(!error.triggerIds?.length)return;
    const triggers=error.triggerIds.map(id=>inventories[rows.findIndex(row=>row.objectId===id)]);
    if(triggers.some(value=>!value))vFail('ERROR_TRIGGER_ASSOCIATION_MISMATCH',rows[index].objectId);
    const operations=[...new Set(triggers.flatMap(value=>value.events.map(event=>event.operation)))].sort();
    const target=`EXECUTES:${rows[index].objectId.split(':').at(-1)}`;
    if(operations.join('|')!==[...new Set(error.operations)].sort().join('|')||
        triggers.some(value=>!value.dependencies.includes(target)))vFail('ERROR_TRIGGER_ASSOCIATION_MISMATCH',error.errorId);}));
  return {source,rows,inventories,sourceSha256:vHash(sourceBytes),blocksSha256:vHash(blocksBytes)};
}
function queryArtifacts() {
  return SQL.map((sqlUtf8Lf,index) => {
    if (vHash(sqlUtf8Lf) !== RAW_HASHES[index]) vFail('QUERY_HASH_RESTATEMENT',IDS[index]);
    independentlyValidateQuery(sqlUtf8Lf,index,IDS,CONTRACTS);
    const core = {schemaVersion:'C14C-QUERY-ARTIFACT-V1',queryId:IDS[index],
      sqlUtf8Lf,contract:CONTRACTS[index]};
    return {...core,sqlRawSha256:vHash(sqlUtf8Lf),
      queryArtifactSha256:vDomain('C14C-QUERY-ARTIFACT-V1',vCanonical(core))};
  });
}
const blobIdentity=bytes=>createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex');
function artifactIdentity(name,ordinal) {
  const bytes=readFileSync(join(HERE,name));
  return {ordinal,path:`knowledge/specs/STOCK-CAJAS-C14-SIMPLIFICATION-001/${name}`,
    byteLength:bytes.length,gitBlob:blobIdentity(bytes),rawSha256:vHash(bytes)};
}
function independentCandidateInventory() {
  const modules=MODULES.map(artifactIdentity),inputs=CANDIDATE_INPUTS.map(artifactIdentity);
  const toolchainSha256=vDomain('C14-SIX-MODULE-TOOLCHAIN-V1',vCanonical(modules));
  const profileCj1Utf8Lf=vCanonical(CONNECTION),connectionProfile={profile:CONNECTION,profileCj1Utf8Lf,
    byteLength:Buffer.byteLength(profileCj1Utf8Lf),rawSha256:vHash(profileCj1Utf8Lf)};
  const core={schemaVersion:'C14-CANDIDATE-INVENTORY-V1',identityClaim:'EXACT_CLOSED_CANDIDATE_STATE',
    authorshipClaim:false,modules,inputs,connectionProfile,toolchainSha256};
  return {...core,candidateStateSha256:vDomain('C14-CANDIDATE-INVENTORY-V1',vCanonical(core))};
}
function compareCandidate(value) {
  if(vCanonical(value)!==vCanonical(independentCandidateInventory()))vFail('TOOLCHAIN_IDENTITY_MISMATCH');return value;
}
function independentToolchainMutations() {
  const cases=[['omission',value=>value.modules.shift()],['reorder',value=>value.modules.reverse()],
    ['substitution',value=>{value.modules[4].path='substituted.mjs';}],
    ['drift',value=>{value.modules[5].gitBlob='0'.repeat(40);}]];
  return cases.map(([name,mutate])=>{const value=structuredClone(independentCandidateInventory());mutate(value);let actualCode=null;
    try{compareCandidate(value);}catch(error){actualCode=error.code;}if(actualCode!=='TOOLCHAIN_IDENTITY_MISMATCH')
      vFail('TOOLCHAIN_MUTATION_NOT_REJECTED',name);return {name,actualCode};});
}
function verifyCandidateManifest(options) {
  const raw=options.get('candidate-manifest');if(!raw)vFail('CANDIDATE_MANIFEST_REQUIRED');const path=resolve(raw);
  if(!isAbsolute(path)||!existsSync(path))vFail('CANDIDATE_MANIFEST_REQUIRED');let supplied;
  try{supplied=JSON.parse(vText(readFileSync(path),'CANDIDATE_MANIFEST.cj1'));}
  catch(error){if(error.code)throw error;vFail('CANDIDATE_MANIFEST_INVALID');}
  return {path,value:compareCandidate(supplied)};
}
function approvalBinding(input, artifacts, target, candidate) {
  const core = {schemaVersion:'C14-SIMPLIFICATION-FUTURE-PROCESS-APPROVAL-V1',
    semanticSourceSha256:input.sourceSha256,objectBlocksSha256:input.blocksSha256,
    toolchain:candidate.modules,toolchainSha256:candidate.toolchainSha256,
    candidateStateSha256:candidate.candidateStateSha256,
    querySetSha256:vDomain('C14C-QUERY-SET-V1',vCanonical(artifacts)),
    commandIdentity:'node-esm+pg@8.21.0:generate.mjs:observe',target};
  return vDomain(core.schemaVersion,vCanonical(core));
}
function validateResultRows(rows, contract) {
  if (rows.length < contract.min || (contract.max !== null && rows.length > contract.max)) {
    vFail('RESULT_CARDINALITY');
  }
  rows.forEach((row,rowIndex) => {
    vKeys(row,['rowOrdinal','cells'],'result');
    if (row.rowOrdinal !== rowIndex + 1 || row.cells.length !== contract.columns.length) {
      vFail('RESULT_SHAPE');
    }
    row.cells.forEach((cell,columnIndex) => {
      vKeys(cell,['columnOrdinal','columnName','isNull','valueUtf8'],'cell');
      const invalid = cell.columnOrdinal !== columnIndex + 1 ||
        cell.columnName !== contract.columns[columnIndex] || cell.isNull !== (cell.valueUtf8 === null);
      if (invalid) vFail('RESULT_CELL');
    });
  });
}
function validateTarget(observation) {
  const valid = observation.target?.label === 'ossum-cor-dev' &&
    observation.target.projectRef===CONNECTION.projectRef&&
    vCanonical(observation.target.connectionProfile)===vCanonical(CONNECTION)&&
    observation.target.connectionProfileSha256===vHash(vCanonical(CONNECTION));
  if (!valid) vFail('TARGET_DRIFT');
}
function validateObservation(input, path, candidate) {
  if (!existsSync(path)) vFail('CATALOG_OBSERVATION_ABSENT');
  const observation = JSON.parse(vText(readFileSync(path),'observation'));
  vKeys(observation,['schemaVersion','approvalSha256','input','candidateInventory','target','transactionMode',
    'transactionSnapshotIdentity','observedAt','queryArtifacts','queryResults',
    'snapshotSha256'],'observation');
  const core = {...observation}; delete core.snapshotSha256;
  const invalid = observation.schemaVersion !== 'C14C-CATALOG-OBSERVATION-V1' ||
    observation.transactionMode !== 'READ_ONLY_REPEATABLE_READ' ||
    vDomain('C14C-CATALOG-OBSERVATION-V1',vCanonical(core)) !== observation.snapshotSha256 ||
    observation.input.semanticSourceSha256 !== input.sourceSha256 ||
    observation.input.objectBlocksSha256 !== input.blocksSha256 ||
    vCanonical(observation.candidateInventory)!==vCanonical(candidate);
  if (invalid) vFail('OBSERVATION_TARGET_OR_HASH');
  validateTarget(observation);
  const artifacts = queryArtifacts();
  const target = {label:observation.target.label,projectRef:observation.target.projectRef,
    connectionProfile:observation.target.connectionProfile,
    connectionProfileSha256:observation.target.connectionProfileSha256};
  if (observation.approvalSha256 !== approvalBinding(input,artifacts,target,candidate)) vFail('APPROVAL_BINDING');
  if (JSON.stringify(observation.queryArtifacts) !== JSON.stringify(artifacts)) vFail('QUERY_DRIFT');
  observation.queryResults.forEach((rows,index)=>validateResultRows(rows,CONTRACTS[index]));
  return observation;
}
function externalPath(path) {
  if (!isAbsolute(path)) vFail('EXTERNAL_PATH_REQUIRED');
  const relation = relative(realpathSync(ROOT),resolve(path));
  if (!isAbsolute(relation) &&
      (relation === '' || (!relation.startsWith(`..${sep}`) && relation !== '..'))) {
    vFail('REPOSITORY_PATH_FORBIDDEN');
  }
}
function tempRoots(input, prefix) {
  const base = join(tmpdir(),'opencode','c14-simplification',input.sourceSha256);
  mkdirSync(base,{recursive:true});
  const first = mkdtempSync(join(base,`${prefix}-a-`));
  const second = mkdtempSync(join(base,`${prefix}-b-`));
  externalPath(first); externalPath(second);
  return [first,second];
}
function safeEnvironment() {
  return {SystemRoot:process.env.SystemRoot,WINDIR:process.env.WINDIR,
    TEMP:process.env.TEMP,TMP:process.env.TMP};
}
function runGenerator(mode, root, observationPath = null, manifestPath = null) {
  const argumentsList = [GENERATOR,mode,`--out-root=${root}`];
  if (observationPath) argumentsList.push(`--observation=${observationPath}`);
  if (manifestPath) argumentsList.push(`--candidate-manifest=${manifestPath}`);
  return spawnSync(process.execPath,argumentsList,{cwd:ROOT,encoding:'utf8',env:safeEnvironment()});
}
function readGenerated(root) {
  const path = join(root,PACKAGE);
  const bytes = readFileSync(path);
  return {bytes,value:JSON.parse(vText(bytes,PACKAGE))};
}
function verifyRuns(input, observation, observationPath, manifestPath) {
  const roots = tempRoots(input,'verify');
  const runs = roots.map(root=>runGenerator('derive',root,observationPath,manifestPath));
  if (runs.some(run=>run.status!==0)) vFail('GENERATOR_FAILED',runs.map(run=>run.stdout).join('').slice(0,500));
  const generated = roots.map(readGenerated);
  if (!generated[0].bytes.equals(generated[1].bytes)) vFail('DOUBLE_GENERATION_MISMATCH');
  const expected = reconstructPackage(input,observation);
  return {roots,runs:generated.map(item=>compareCompletePackage(item.value,expected))};
}
function syntheticVerification(input) {
  const artifacts = queryArtifacts();
  const observation = independentSyntheticObservation(input,artifacts,CONTRACTS,independentCandidateInventory());
  const expected = reconstructPackage(input,observation,'SYNTHETIC_TEST_ONLY');
  const refusals = [];
  try { vKeys({},['schemaVersion'],'observation'); }
  catch { refusals.push('invalid-observation'); }
  try { validateTarget({...observation,target:{...observation.target,label:'ossum-cor-prod'}}); }
  catch { refusals.push('target-drift'); }
  try { compareCompletePackage(expected,expected,false); }
  catch { refusals.push('synthetic-as-real'); }
  if (refusals.length !== 3) vFail('OFFLINE_REFUSAL_TEST');
  const roots = tempRoots(input,'synthetic');
  const runs = roots.map(root=>runGenerator('synthetic',root));
  if (runs.some(run=>run.status!==0)) vFail('SYNTHETIC_GENERATOR_FAILED',
    runs.map(run=>run.stdout).join('').slice(0,500));
  const generated = roots.map(readGenerated);
  if (!generated[0].bytes.equals(generated[1].bytes)) vFail('SYNTHETIC_DOUBLE_RUN_MISMATCH');
  return {roots,refusals,runs:generated.map(item=>compareCompletePackage(item.value,expected,true))};
}
function independentMutations(input) {
  const cases=[
    ['dependency','function:fn_stock_lot_review_coherence',/"StockLotObservation"/u,'"StockLotObservationX"','DEPENDENCY_INVENTORY_MISMATCH'],
    ['event','trigger:trg_stock_lot_append_only',/BEFORE/u,'AFTER','EVENT_INVENTORY_MISMATCH'],
    ['error','function:fn_stock_lot_append_only',/'23514'/u,"'22000'",'ERROR_INVENTORY_MISMATCH'],
    ['branch','function:fn_operational_semantic_intent_guard',/RETURN NEW/u,'RETURN NULL','BRANCH_INVENTORY_MISMATCH'],
    ['boolean-root','check:ck_sab_valid_window',/IS TRUE/u,'IS FALSE','ROOT_INVENTORY_MISMATCH'],
    ['atom','check:ck_sab_valid_window',/IS NULL/u,'IS TRUE','ATOM_INVENTORY_MISMATCH'],
    ['locator-span','trigger:trg_stock_lot_append_only',/CREATE TRIGGER/u,'CREATE  TRIGGER','LOCATOR_INVENTORY_MISMATCH'],
    ['unknown-syntax','function:fn_operational_semantic_intent_guard',/RETURN NEW/u,'PERFORM NEW','SQL_UNKNOWN_SYNTAX'],
  ];
  return cases.map(([name,id,pattern,replacement,expectedCode])=>{
    const row=input.rows.find(item=>item.objectId===id);
    const source=Buffer.from(row.rendering.bytesBase64,'base64').toString('utf8');let actualCode=null;
    try{independentlyParse(row,Buffer.from(source.replace(pattern,replacement)));}catch(error){actualCode=error.code;}
    if(actualCode!==expectedCode)vFail('MUTATION_WRONG_FAILURE_CLASS',`${name}:${actualCode}`);
    return {name,expectedCode,actualCode,classSpecific:true};
  });
}
function auditAuthorityPackage(value) {
  const units=value.sourceUnits,sources=value.seedSources,rows=value.csr1.rows;
  if([units.length,sources.length,rows.length].some(count=>count!==2134))vFail('SOURCE_UNIT_COUNT');
  const objects=new Map(value.objects.map(object=>[object.objectId,object.cx])),seen=new Set();
  for(const unit of units){const core={schemaVersion:unit.schemaVersion,authorityId:unit.authorityId,
      authorityIdentity:unit.authorityIdentity,authoritySectionPath:unit.authoritySectionPath,sourceDecisionId:unit.sourceDecisionId,
      sourceUnitId:unit.sourceUnitId,sourceUnitKind:unit.sourceUnitKind,semanticText:unit.semanticText,targetObjectIds:unit.targetObjectIds,
      targetObjectSetSha256:unit.targetObjectSetSha256,targetCxs:unit.targetCxs};
    const allocation=[...new Set(unit.targetObjectIds.map(id=>objects.get(id)))];
    if(vDomain('C14-SOURCE-UNIT-TARGET-OBJECT-SET-V1',vCanonical(unit.targetObjectIds))!==unit.targetObjectSetSha256||
      allocation.join('|')!==unit.targetCxs.join('|'))vFail('SOURCE_UNIT_ALLOCATION');
    const identity=[unit.authorityIdentity,unit.authoritySectionPath,unit.sourceDecisionId,unit.sourceUnitId].join('|');
    if(seen.has(identity)||vDomain('C14-SOURCE-UNIT-V1',vCanonical(core))!==unit.sourceUnitSha256)vFail('SOURCE_UNIT_DUPLICATE');seen.add(identity);
    const semantic={authorityId:unit.authorityId,authorityIdentity:unit.authorityIdentity,authoritySectionPath:unit.authoritySectionPath,
      semanticText:unit.semanticText,sourceDecisionId:unit.sourceDecisionId,sourceUnitId:unit.sourceUnitId,
      sourceUnitKind:unit.sourceUnitKind,targetCxs:unit.targetCxs,targetObjectSetSha256:unit.targetObjectSetSha256};
    if(vCanonical(semantic).trimEnd()!==unit.sourceSemanticStatement||vDomain('C14P-SEED-SOURCE-SEMANTIC-V2',
      vCanonical(unit.sourceSemanticStatement))!==unit.sourceSemanticSha256)vFail('SOURCE_SEMANTIC_HASH');}
  independentlyValidateSc63Projection(units,value.proposalRoot);
  const emitted=sources.flatMap(source=>source.seedExpectedOutputs.filter(output=>output.relation==='EMITS').map(output=>output.outputId));
  const outputSet=new Set(emitted);if(outputSet.size!==2134||sources.some(source=>source.seedExpectedOutputs.length!==26||
    source.seedExpectedOutputs.some(output=>!outputSet.has(output.outputId))))vFail('EMITS_BIJECTION');
  const seal=value.profile.cx08SemanticSeal,core={...seal};delete core.semanticSealSha256;
  if(Object.keys(seal).length!==12||seal.fragmentSeals.length!==11||seal.fragmentSeals.some(fragment=>Object.keys(fragment).length!==5))
    vFail('CX08_SEAL_FIELDS');if(vDomain('C14-RTS-CX08-SEMANTIC-SEAL-V1',vCanonical(core))!==seal.semanticSealSha256)vFail('CX08_SEAL_HASH');
  if(Object.keys(value.profile).length!==25||Object.keys(value.proposalRoot).length!==48||
    Object.keys(value.authorityRoot).filter(key=>key!=='rootSha256').length!==21)vFail('RTS1B_FIELD_COUNT');
  if(value.projections.length!==24||value.descriptors.length!==91||value.parentBindings.length!==9)vFail('RTS1B_TOPOLOGY');}
function authorityMutations(packageValue) {
  const cases=[['missing','SOURCE_UNIT_COUNT',x=>x.sourceUnits.shift()],['duplicate','SOURCE_UNIT_DUPLICATE',x=>x.sourceUnits[2]=x.sourceUnits[0]],
    ['misallocated','SOURCE_UNIT_ALLOCATION',x=>x.sourceUnits[0].targetCxs=['CX12']],
    ['emits','EMITS_BIJECTION',x=>x.seedSources[0].seedExpectedOutputs[0].outputId='UNKNOWN'],
    ['semantic-drift','SOURCE_SEMANTIC_HASH',x=>x.sourceUnits[0].sourceSemanticSha256='f'.repeat(64)],
    ['seal-hash-only','CX08_SEAL_FIELDS',x=>x.profile.cx08SemanticSeal={semanticSealSha256:x.profile.cx08SemanticSeal.semanticSealSha256}],
    ['seal-substitution','CX08_SEAL_HASH',x=>x.profile.cx08SemanticSeal.semanticCandidateBlob='0'.repeat(40)],
    ['seal-missing','CX08_SEAL_FIELDS',x=>delete x.profile.cx08SemanticSeal.dbObjectDelta],
    ['seal-nested','CX08_SEAL_FIELDS',x=>x.profile.cx08SemanticSeal.fragmentSeals[0].extra=true],
    ['decision-missing','DECISION_INVENTORY',x=>x.proposalRoot.proposedDecisionInventory.shift()],
    ['decision-mislabel','DECISION_INVENTORY',x=>{const p=x.proposalRoot.proposedDecisionInventory;p[0]={...p[0],sourceUnitId:'SC00'}}],
    ['kind-count','ROW_KIND_COUNTS',x=>x.proposalRoot.rowCountsByKind.at(-1).count+=1],['rts-count','RTS1B_FIELD_COUNT',x=>x.authorityRoot.extra=true]];
  return cases.map(([name,expectedCode,mutate])=>{const candidate=structuredClone(packageValue);mutate(candidate);let actualCode=null;
    try{auditAuthorityPackage(candidate);}catch(error){actualCode=error.code;}if(actualCode!==expectedCode)
      vFail('AUTHORITY_MUTATION_WRONG_CLASS',`${name}:${actualCode}`);return {name,expectedCode,actualCode};});}
function argumentsOf(){const argv=process.argv.slice(2),mode=(argv.shift()||'verify').replace(/^--/u,''),options=new Map();
  for(const argument of argv){const separator=argument.indexOf('=');if(!argument.startsWith('--')||separator<3)vFail('ARGUMENT');
    options.set(argument.slice(2,separator),argument.slice(separator+1));}return {mode,options};}
const help = [
  'verify.mjs [source|verify|self-test|candidate-inventory|help] [--observation=absolute-path]',
  'source independently parses exact bytes and validates inventories.',
  'verify requires a real approved observation and performs two fresh derivations.',
  'self-test uses synthetic evidence in OS temp only; synthetic output can never pass verify.',
].join('\n') + '\n';
const output = (status,mode,data={}) => process.stdout.write(vCanonical({status,mode,...data}));
try {
  const {mode,options} = argumentsOf();
  if (mode === 'help') process.stdout.write(help);
  else if(mode==='candidate-inventory')process.stdout.write(vCanonical(independentCandidateInventory()));
  else {
    const input = independentlyLoad(SOURCE,BLOCKS);
    const queries = queryArtifacts();
    if (mode === 'source') {const candidate=independentCandidateInventory();
      const observation=independentSyntheticObservation(input,queries,CONTRACTS,candidate);
      output('PASS',mode,{sourceSha256:input.sourceSha256,
      objectBlocksSha256:input.blocksSha256,objects:input.rows.length,exactFragments:168,
       deferredObjects:1,toolchainMutations:independentToolchainMutations(),parserMutations:independentMutations(input),
       authorityMutations:authorityMutations(reconstructPackage(input,observation,'SYNTHETIC_TEST_ONLY')),
      queries:queries.map(query=>({queryId:query.queryId,sqlRawSha256:query.sqlRawSha256,
        queryArtifactSha256:query.queryArtifactSha256}))});}
    else if (mode === 'self-test') output('PASS',mode,syntheticVerification(input));
    else if (mode === 'verify') {
      const candidate=verifyCandidateManifest(options);
      const path = resolve(options.get('observation') || OBSERVATION);
      const observation = validateObservation(input,path,candidate.value);
      output('PASS',mode,{observationSha256:observation.snapshotSha256,
        ...verifyRuns(input,observation,path,candidate.path)});
    } else vFail('UNKNOWN_MODE');
  }
} catch (error) {const detail = String(error.message).replace(/(?:postgres(?:ql)?:\/\/|password=)\S+/giu,'[REDACTED]');
  output('FAIL',process.argv[2] || 'verify',{code:error.code || 'FAIL',detail});
  process.exitCode = 1;
}
