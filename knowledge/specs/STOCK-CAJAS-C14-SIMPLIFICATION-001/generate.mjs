#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPackage, syntheticObservation, validateSc63Projection } from './generate-authority.mjs';
import { canonical, deriveFragment, domainHash, exactKeys, EXPECTED, fail, hash, lexSql,
  strictText, tokenName } from './generate-parse.mjs';
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../../../..');
const SOURCE = join(HERE, 'SEMANTIC_SOURCE.cj1');
const BLOCKS = join(HERE, 'OBJECT_BLOCKS.cjl1');
const OBSERVATION = 'CATALOG_OBSERVATION.cj1';
const PACKAGE = 'PACKAGE_B_RTS1B.cj1';
const MODULES = ['generate.mjs','generate-parse.mjs','generate-authority.mjs',
  'verify.mjs','verify-parse.mjs','verify-authority.mjs'];
const CANDIDATE_INPUTS = ['SEMANTIC_SOURCE.cj1','OBJECT_BLOCKS.cjl1',
  'SEMANTIC_COMPLETION_PROPOSAL.md','RENDERING_COMPLETION_PROPOSAL.md'];
const CONNECTION={database:'postgres',fragment:'',host:'aws-1-sa-east-1.pooler.supabase.com',port:5432,
  projectRef:'yywqcdromnmmelijvspi',protocol:'postgresql:',query:'',
  schemaVersion:'C14-SIMPLIFICATION-CONNECTION-PROFILE-V1',tier:'development',tlsMode:'verify-full',
  username:'postgres.yywqcdromnmmelijvspi'};
export const IDS = [
  'Q01_TARGET_IDENTITY', 'Q02_AVAILABLE_EXTENSION', 'Q03_AVAILABLE_VERSIONS',
  'Q04_INSTALLED_OWNER_REQUIRES', 'Q05_PRIVILEGES', 'Q06_OPCLASS',
];
export const SQL = [
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
export const CONTRACTS = [
  { columns: ['system_identifier','database_oid','database_name','server_version_num','server_version',
    'current_user_oid','current_user_name','transaction_snapshot_identity','observed_at'], min: 1, max: 1,
    relations: ['pg_control_system','pg_database','pg_roles'] },
  { columns: ['name','default_version','installed_version'], min: 0, max: 1,
    relations: ['pg_available_extensions'] },
  { columns: ['name','version','installed','superuser','trusted','relocatable','schema','requires'], min: 0,
    max: null, relations: ['pg_available_extension_versions'] },
  { columns: ['extension_name','installed_version','namespace','relocatable','owner_oid','owner_name',
    'required_name','required_installed_version','required_namespace'], min: 0, max: null,
    relations: ['pg_extension','pg_namespace','pg_roles','pg_available_extension_versions','pg_depend'] },
  { columns: ['database_create','public_usage','public_create','current_user_superuser'], min: 1, max: 1,
    relations: ['pg_roles'] },
  { columns: ['schema','name','access_method','input_type','extension_name','dependency_type'], min: 0,
    max: null, relations: ['pg_opclass','pg_namespace','pg_am','pg_type','pg_depend','pg_extension'] },
];
export function queryArtifacts() {
  return SQL.map((sqlUtf8Lf, index) => {
    validateQuery(sqlUtf8Lf, index, IDS, CONTRACTS);
    const core = {schemaVersion:'C14C-QUERY-ARTIFACT-V1',queryId:IDS[index],
      sqlUtf8Lf,contract:CONTRACTS[index]};
    return {...core,sqlRawSha256:hash(sqlUtf8Lf),
      queryArtifactSha256:domainHash('C14C-QUERY-ARTIFACT-V1',canonical(core))};
  });
}
function validateQuery(sql,index) {
  strictText(Buffer.from(sql),IDS[index]);
  const tokens=lexSql(sql);
  if(tokens[0]?.upper!=='SELECT'||tokens.filter(token=>token.value===';').length!==1)fail('QUERY_STATEMENT_COUNT',IDS[index]);
  const forbidden=new Set(['INSERT','UPDATE','DELETE','MERGE','CREATE','ALTER','DROP','TRUNCATE',
    'COPY','CALL','DO','GRANT','REVOKE','LOCK','WITH','INTO','TEMP','EXECUTE']);
  if(tokens.some(token=>forbidden.has(token.upper)))fail('QUERY_FORBIDDEN_TOKEN',IDS[index]);
  const relations=[];
  for(let offset=0;offset<tokens.length;offset+=1){if(!['FROM','JOIN'].includes(tokens[offset].upper))continue;
    const relation=tokenName(tokens,offset+1);if(relation?.schema!=='pg_catalog')fail('QUERY_UNQUALIFIED_RELATION',IDS[index]);
    relations.push(relation.name);}
  if(relations.some(name=>!CONTRACTS[index].relations.includes(name))||
      CONTRACTS[index].relations.some(name=>!relations.includes(name)))fail('QUERY_RELATION_SET',IDS[index]);
}
function loadInputs() {
  const sourceBytes=readFileSync(SOURCE),blockBytes=readFileSync(BLOCKS);
  if(hash(sourceBytes)!==EXPECTED.source||hash(blockBytes)!==EXPECTED.blocks)fail('SOURCE_HASH_MISMATCH');
  const source=JSON.parse(strictText(sourceBytes,'SEMANTIC_SOURCE.cj1'));
  const rows=strictText(blockBytes,'OBJECT_BLOCKS.cjl1').trimEnd().split('\n').map(JSON.parse);
  if(rows.length!==169||source.objectBlocksBinding.rowCount!==169)fail('OBJECT_COUNT');
  if(domainHash(source.objectBlocksBinding.aggregateDomain,blockBytes)!==
      source.objectBlocksBinding.objectAggregateSha256)fail('OBJECT_AGGREGATE_HASH');
  const ids=new Set(),inventories=[];
  rows.forEach((row,index)=>{if(row.globalOrdinal!==index+1||ids.has(row.objectId))fail('OBJECT_ORDINAL',row.objectId);ids.add(row.objectId);
    const core={...row};delete core.objectRowSha256;
    if(domainHash(source.objectBlocksBinding.rowDomain,canonical(core))!==row.objectRowSha256)fail('OBJECT_ROW_HASH',row.objectId);
    if(domainHash(source.objectBlocksBinding.semanticDomain,canonical(row.semanticCore))!==row.sourceSemanticSha256)fail('OBJECT_SEMANTIC_HASH',row.objectId);
    if(!index){inventories.push(null);return;}const bytes=Buffer.from(row.rendering.bytesBase64,'base64');
    const roundTrip=Buffer.concat(row.rendering.ast.losslessChildren.map((child,ordinal)=>{if(child.nodeType!=='SOURCE_LINE'||
      child.ordinal!==ordinal+1)fail('AST_UNKNOWN',row.objectId);return Buffer.from(child.utf8Base64,'base64');}));
    if(!bytes.equals(roundTrip)||hash(bytes)!==row.rendering.rawSha256||domainHash('C14P-OBJECT-BLOCK-V2',bytes)!==
      row.rendering.v2ObjectBlockSha256)fail('FRAGMENT_OR_AST_HASH',row.objectId);inventories.push(deriveFragment(row,bytes));});
  inventories.forEach((inventory,index)=>inventory?.errors.forEach(error=>{if(!error.triggerIds?.length)return;
    const triggerInventories=error.triggerIds.map(id=>inventories[rows.findIndex(row=>row.objectId===id)]);
    if(triggerInventories.some(value=>!value))fail('ERROR_TRIGGER_ASSOCIATION_MISMATCH',rows[index].objectId);
    const operations=[...new Set(triggerInventories.flatMap(value=>value.events.map(event=>event.operation)))].sort();
    const target=`EXECUTES:${rows[index].objectId.split(':').at(-1)}`;
    if(operations.join('|')!==[...new Set(error.operations)].sort().join('|')||
        triggerInventories.some(value=>!value.dependencies.includes(target)))fail('ERROR_TRIGGER_ASSOCIATION_MISMATCH',error.errorId);}));
  return {source,rows,inventories,sourceSha256:hash(sourceBytes),blocksSha256:hash(blockBytes)};
}
const gitBlob = bytes => createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex');
function identity(name,ordinal) {
  const bytes=readFileSync(join(HERE,name));
  return {ordinal,path:`knowledge/specs/STOCK-CAJAS-C14-SIMPLIFICATION-001/${name}`,
    byteLength:bytes.length,gitBlob:gitBlob(bytes),rawSha256:hash(bytes)};
}
export function candidateInventory() {
  const modules=MODULES.map(identity);
  const inputs=CANDIDATE_INPUTS.map(identity);
  const toolchainSha256=domainHash('C14-SIX-MODULE-TOOLCHAIN-V1',canonical(modules));
  const profileCj1Utf8Lf=canonical(CONNECTION);
  const connectionProfile={profile:CONNECTION,profileCj1Utf8Lf,byteLength:Buffer.byteLength(profileCj1Utf8Lf),
    rawSha256:hash(profileCj1Utf8Lf)};
  const core={schemaVersion:'C14-CANDIDATE-INVENTORY-V1',identityClaim:'EXACT_CLOSED_CANDIDATE_STATE',
    authorshipClaim:false,modules,inputs,connectionProfile,toolchainSha256};
  return {...core,candidateStateSha256:domainHash('C14-CANDIDATE-INVENTORY-V1',canonical(core))};
}
function checkCandidate(value) {
  if(canonical(value)!==canonical(candidateInventory()))fail('TOOLCHAIN_IDENTITY_MISMATCH');return value;
}
function toolchainMutationTests() {
  const cases=[['omission',value=>value.modules.pop()],['reorder',value=>value.modules.reverse()],
    ['substitution',value=>{value.modules[1].path='substituted.mjs';}],
    ['drift',value=>{value.modules[2].rawSha256='0'.repeat(64);}]];
  return cases.map(([name,mutate])=>{const value=structuredClone(candidateInventory());mutate(value);let actualCode=null;
    try{checkCandidate(value);}catch(error){actualCode=error.code;}if(actualCode!=='TOOLCHAIN_IDENTITY_MISMATCH')
      fail('TOOLCHAIN_MUTATION_NOT_REJECTED',name);return {name,actualCode};});
}
function candidateManifest(options) {
  const raw=options.get('candidate-manifest');if(!raw)fail('CANDIDATE_MANIFEST_REQUIRED');const path=resolve(raw);
  if(!isAbsolute(path)||!existsSync(path))fail('CANDIDATE_MANIFEST_REQUIRED');let supplied;
  try{supplied=JSON.parse(strictText(readFileSync(path),'CANDIDATE_MANIFEST.cj1'));}
  catch(error){if(error.code)throw error;fail('CANDIDATE_MANIFEST_INVALID');}
  return checkCandidate(supplied);
}
function canonicalRows(rows, contract) {
  if (rows.length < contract.min || (contract.max !== null && rows.length > contract.max)) {
    fail('QUERY_CARDINALITY');
  }
  return rows.map((row, rowIndex) => {
    if (!Array.isArray(row) || row.length !== contract.columns.length) fail('QUERY_COLUMN_COUNT');
    return {rowOrdinal:rowIndex+1,cells:row.map((value,columnIndex)=>({
      columnOrdinal:columnIndex+1,columnName:contract.columns[columnIndex],
      isNull:value===null,valueUtf8:value===null?null:String(value),
    }))};
  });
}
function targetFromUrl(raw) {
  let url; try { url = new URL(raw); } catch { fail('TARGET_URL_INVALID'); }
  const exact=url.protocol===CONNECTION.protocol&&url.hostname===CONNECTION.host&&Number(url.port)===CONNECTION.port&&
    url.pathname===`/${CONNECTION.database}`&&decodeURIComponent(url.username)===CONNECTION.username&&url.password&&
    !url.search&&!url.hash;
  if(!exact)fail('TARGET_ENDPOINT_OVERRIDE');
  const bytes=canonical(CONNECTION);return {label:'ossum-cor-dev',projectRef:CONNECTION.projectRef,
    connectionProfile:CONNECTION,connectionProfileSha256:hash(bytes)};
}
function approvalBinding(input, artifacts, target, candidate) {
  const core = {schemaVersion:'C14-SIMPLIFICATION-FUTURE-PROCESS-APPROVAL-V1',
    semanticSourceSha256:input.sourceSha256,objectBlocksSha256:input.blocksSha256,
    toolchain:candidate.modules,toolchainSha256:candidate.toolchainSha256,
    candidateStateSha256:candidate.candidateStateSha256,
    querySetSha256:domainHash('C14C-QUERY-SET-V1',canonical(artifacts)),
    commandIdentity:'node-esm+pg@8.21.0:generate.mjs:observe',target};
  return domainHash(core.schemaVersion,canonical(core));
}
async function observe(options) {
  const approval = options.get('future-approved');
  const environmentApproval = process.env.C14_SIMPLIFICATION_FUTURE_APPROVAL_SHA256;
  const connection = process.env.C14_SIMPLIFICATION_DEV_DATABASE_URL;
  if (!/^[0-9a-f]{64}$/u.test(approval || '') || approval !== environmentApproval || !connection) {
    fail('FUTURE_APPROVAL_REQUIRED');
  }
  const input = loadInputs(SOURCE,BLOCKS);
  const candidate=candidateManifest(options);
  const artifacts = queryArtifacts();
  const target = targetFromUrl(connection);
  if (approval !== approvalBinding(input,artifacts,target,candidate)) fail('FUTURE_APPROVAL_BINDING_MISMATCH');
  const output = resolve(options.get('output') || '');
  if (!isAbsolute(output) || output !== join(dirname(output),OBSERVATION)) fail('OBSERVATION_OUTPUT_PATH');
  const {Client} = await import('pg');
  const client = new Client({connectionString:connection,ssl:{rejectUnauthorized:true}});
  let transaction = false;
  try {
    await client.connect();
    const tls=client.connection?.stream;if(!tls?.encrypted||tls.authorized===false)fail('TLS_VERIFICATION_FAILED');
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    transaction = true;
    const results = [];
    for (let index=0; index<SQL.length; index+=1) {
      const result = await client.query({text:SQL[index],rowMode:'array'});
      results.push(canonicalRows(result.rows,CONTRACTS[index]));
    }
    await client.query('COMMIT'); transaction = false;
    const identity = results[0][0].cells.map(cell=>cell.valueUtf8);
    const core = {schemaVersion:'C14C-CATALOG-OBSERVATION-V1',approvalSha256:approval,
      input:{semanticSourceSha256:input.sourceSha256,objectBlocksSha256:input.blocksSha256},
      candidateInventory:candidate,
      target:{...target,systemIdentifier:identity[0],databaseOid:identity[1],databaseName:identity[2],
        serverVersionNum:identity[3],serverVersion:identity[4],currentUserOid:identity[5],
        currentUserName:identity[6]},transactionMode:'READ_ONLY_REPEATABLE_READ',
      transactionSnapshotIdentity:identity[7],observedAt:identity[8],
      queryArtifacts:artifacts,queryResults:results};
    const observation = {...core,
      snapshotSha256:domainHash('C14C-CATALOG-OBSERVATION-V1',canonical(core))};
    writeFileSync(output,canonical(observation),{encoding:'utf8',flag:'wx'});
    return {output,snapshotSha256:observation.snapshotSha256};
  } catch (error) {
    if (transaction) try { await client.query('ROLLBACK'); } catch {}
    throw error;
  } finally { await client.end().catch(()=>{}); }
}
function validateObservation(observation, input, candidate) {
  exactKeys(observation,['schemaVersion','approvalSha256','input','candidateInventory','target','transactionMode',
    'transactionSnapshotIdentity','observedAt','queryArtifacts','queryResults',
    'snapshotSha256'],'observation');
  const core = {...observation}; delete core.snapshotSha256;
  const invalid = observation.schemaVersion !== 'C14C-CATALOG-OBSERVATION-V1' ||
    observation.transactionMode !== 'READ_ONLY_REPEATABLE_READ' ||
    domainHash('C14C-CATALOG-OBSERVATION-V1',canonical(core)) !== observation.snapshotSha256 ||
    observation.input.semanticSourceSha256 !== input.sourceSha256 ||
    observation.input.objectBlocksSha256 !== input.blocksSha256 || observation.target.label !== 'ossum-cor-dev' ||
    canonical(observation.candidateInventory)!==canonical(candidate);
  if (invalid) fail('OBSERVATION_INVALID');
  const expected = queryArtifacts();
  if (JSON.stringify(observation.queryArtifacts) !== JSON.stringify(expected)) fail('OBSERVATION_QUERY_DRIFT');
  observation.queryResults.forEach((rows,index)=>
    canonicalRows(rows.map(row=>row.cells.map(cell=>cell.valueUtf8)),CONTRACTS[index]));
  return observation;
}
function externalRoot(path) {
  const output = resolve(path || '');
  if (!isAbsolute(output)) fail('EXTERNAL_ROOT_REQUIRED');
  const relation = relative(realpathSync(ROOT),output);
  if (!isAbsolute(relation) &&
      (relation === '' || (!relation.startsWith(`..${sep}`) && relation !== '..'))) {
    fail('REPOSITORY_OUTPUT_FORBIDDEN');
  }
  mkdirSync(output,{recursive:true});
  return output;
}
function writePackage(root, packageValue) {
  const output = join(externalRoot(root),PACKAGE);
  const bytes = canonical(packageValue);
  writeFileSync(output,bytes,{encoding:'utf8',flag:'wx'});
  return {output,byteLength:Buffer.byteLength(bytes),sha256:hash(bytes)};
}
function derive(options) {
  const input = loadInputs(SOURCE,BLOCKS);
  const candidate=candidateManifest(options);
  const path = resolve(options.get('observation') || join(HERE,OBSERVATION));
  if (!existsSync(path)) fail('CATALOG_OBSERVATION_ABSENT');
  const observation = validateObservation(JSON.parse(strictText(readFileSync(path),OBSERVATION)),input,candidate);
  return writePackage(options.get('out-root'),buildPackage(input,observation));
}
function synthetic(options) {
  const input = loadInputs(SOURCE,BLOCKS);
  const observation = syntheticObservation(input,queryArtifacts(),CONTRACTS,candidateInventory());
  const packageValue = buildPackage(input,observation,'SYNTHETIC_TEST_ONLY');
  return writePackage(options.get('out-root'),packageValue);
}
function parserMutationTests(input) {
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
    try{deriveFragment(row,Buffer.from(source.replace(pattern,replacement)));}catch(error){actualCode=error.code;}
    if(actualCode!==expectedCode)fail('MUTATION_WRONG_FAILURE_CLASS',`${name}:${actualCode}`);
    return {name,expectedCode,actualCode,classSpecific:true};
  });
}
function validateAuthorityPackage(value) {
  const units=value.sourceUnits,seeds=value.seedSources,rows=value.csr1.rows,objects=new Map(value.objects.map(x=>[x.objectId,x]));
  if(units.length!==2134||seeds.length!==2134||rows.length!==2134)fail('SOURCE_UNIT_COUNT');const keys=new Set();
  for(const unit of units){const core={schemaVersion:unit.schemaVersion,authorityId:unit.authorityId,authorityIdentity:unit.authorityIdentity,
      authoritySectionPath:unit.authoritySectionPath,sourceDecisionId:unit.sourceDecisionId,sourceUnitId:unit.sourceUnitId,
      sourceUnitKind:unit.sourceUnitKind,semanticText:unit.semanticText,targetObjectIds:unit.targetObjectIds,
      targetObjectSetSha256:unit.targetObjectSetSha256,targetCxs:unit.targetCxs};
    if(domainHash('C14-SOURCE-UNIT-TARGET-OBJECT-SET-V1',canonical(unit.targetObjectIds))!==unit.targetObjectSetSha256||
      [...new Set(unit.targetObjectIds.map(id=>objects.get(id)?.cx))].join('|')!==unit.targetCxs.join('|'))fail('SOURCE_UNIT_ALLOCATION');
    const key=[unit.authorityIdentity,unit.authoritySectionPath,unit.sourceDecisionId,unit.sourceUnitId].join('|');
    if(keys.has(key)||domainHash('C14-SOURCE-UNIT-V1',canonical(core))!==unit.sourceUnitSha256)fail('SOURCE_UNIT_DUPLICATE');keys.add(key);
    const semantic={authorityId:unit.authorityId,authorityIdentity:unit.authorityIdentity,authoritySectionPath:unit.authoritySectionPath,
      semanticText:unit.semanticText,sourceDecisionId:unit.sourceDecisionId,sourceUnitId:unit.sourceUnitId,sourceUnitKind:unit.sourceUnitKind,
      targetCxs:unit.targetCxs,targetObjectSetSha256:unit.targetObjectSetSha256};
    if(canonical(semantic).trimEnd()!==unit.sourceSemanticStatement||domainHash('C14P-SEED-SOURCE-SEMANTIC-V2',
      canonical(unit.sourceSemanticStatement))!==unit.sourceSemanticSha256)fail('SOURCE_SEMANTIC_HASH');}
  validateSc63Projection(units,value.proposalRoot);
  const emitted=seeds.flatMap(seed=>seed.seedExpectedOutputs.filter(x=>x.relation==='EMITS').map(x=>x.outputId)),known=new Set(emitted);
  if(known.size!==2134||seeds.some(seed=>seed.seedExpectedOutputs.length!==26||seed.seedExpectedOutputs.some(x=>!known.has(x.outputId))))
    fail('EMITS_BIJECTION');const seal=value.profile.cx08SemanticSeal,sealCore={...seal};delete sealCore.semanticSealSha256;
  if(Object.keys(seal).length!==12||seal.fragmentSeals.length!==11||seal.fragmentSeals.some(x=>Object.keys(x).length!==5))fail('CX08_SEAL_FIELDS');
  if(domainHash('C14-RTS-CX08-SEMANTIC-SEAL-V1',canonical(sealCore))!==seal.semanticSealSha256)fail('CX08_SEAL_HASH');
  if(Object.keys(value.profile).length!==25||Object.keys(value.proposalRoot).length!==48||
    Object.keys(value.authorityRoot).filter(key=>key!=='rootSha256').length!==21)fail('RTS1B_FIELD_COUNT');
  if(value.projections.length!==24||value.descriptors.length!==91||value.parentBindings.length!==9)fail('RTS1B_TOPOLOGY');}
function authorityMutationTests(packageValue) {
  const cases=[['missing','SOURCE_UNIT_COUNT',x=>x.sourceUnits.pop()],['duplicate','SOURCE_UNIT_DUPLICATE',x=>x.sourceUnits[1]=x.sourceUnits[0]],
    ['misallocated','SOURCE_UNIT_ALLOCATION',x=>x.sourceUnits[0].targetCxs=['CX13']],
    ['emits','EMITS_BIJECTION',x=>x.seedSources[0].seedExpectedOutputs[0].outputId='MISSING'],
    ['semantic-drift','SOURCE_SEMANTIC_HASH',x=>x.sourceUnits[0].sourceSemanticSha256='0'.repeat(64)],
    ['seal-hash-only','CX08_SEAL_FIELDS',x=>x.profile.cx08SemanticSeal={semanticSealSha256:x.profile.cx08SemanticSeal.semanticSealSha256}],
    ['seal-substitution','CX08_SEAL_HASH',x=>x.profile.cx08SemanticSeal.fragmentSeals[0].fragmentSha256='0'.repeat(64)],
    ['seal-missing','CX08_SEAL_FIELDS',x=>delete x.profile.cx08SemanticSeal.dbObjectCount],
    ['seal-nested','CX08_SEAL_FIELDS',x=>x.profile.cx08SemanticSeal.fragmentSeals[0].unknown=true],
    ['decision-missing','DECISION_INVENTORY',x=>x.proposalRoot.proposedDecisionInventory.pop()],
    ['decision-mislabel','DECISION_INVENTORY',x=>{const p=x.proposalRoot.proposedDecisionInventory;p[0]={...p[0],sourceDecisionId:'SC66'}}],
    ['kind-count','ROW_KIND_COUNTS',x=>x.proposalRoot.rowCountsByKind[0].count-=1],['rts-count','RTS1B_FIELD_COUNT',x=>x.proposalRoot.unknown=true]];
  return cases.map(([name,code,mutate])=>{const value=structuredClone(packageValue);mutate(value);let actualCode=null;
    try{validateAuthorityPackage(value);}catch(error){actualCode=error.code;}if(actualCode!==code)
      fail('AUTHORITY_MUTATION_WRONG_CLASS',`${name}:${actualCode}`);return {name,expectedCode:code,actualCode};});}
function argumentsOf(){const argv=process.argv.slice(2),mode=(argv.shift()||'validate').replace(/^--/u,''),options=new Map();
  for(const argument of argv){const separator=argument.indexOf('=');if(!argument.startsWith('--')||separator<3)fail('ARGUMENT');
    options.set(argument.slice(2,separator),argument.slice(separator+1));}return {mode,options};}
const help=['generate.mjs [validate|observe|derive|double-run|synthetic|candidate-inventory|help] [--key=value]',
  'validate is the safe default and never accesses DB/network.','observe requires exact future approval and DEV environment bindings.',
  'derive and synthetic write only PACKAGE_B_RTS1B.cj1 under an external root.'].join('\n')+'\n';
const report = (ok,mode,data={}) => process.stdout.write(canonical({ok,mode,...data}));
try {const {mode,options} = argumentsOf();
  if (mode === 'help') process.stdout.write(help);
  else if (mode === 'candidate-inventory') process.stdout.write(canonical(candidateInventory()));
  else if (mode === 'validate') {
    const input=loadInputs(SOURCE,BLOCKS),queries=queryArtifacts();
    const candidate=candidateInventory(),observation=syntheticObservation(input,queries,CONTRACTS,candidate);
    report(true,mode,{sourceSha256:input.sourceSha256,objectBlocksSha256:input.blocksSha256,
      objectCount:input.rows.length,candidateInventory:candidate,toolchainMutations:toolchainMutationTests(),
      parserMutations:parserMutationTests(input),authorityMutations:authorityMutationTests(buildPackage(input,observation,'SYNTHETIC_TEST_ONLY')),
      blocked:'CATALOG_OBSERVATION_ABSENT',queries:queries.map(query=>({queryId:query.queryId,
        sqlRawSha256:query.sqlRawSha256,queryArtifactSha256:query.queryArtifactSha256}))});
  } else if (mode === 'observe') report(true,mode,await observe(options));
  else if (mode === 'derive') report(true,mode,derive(options));
  else if (mode === 'synthetic') report(true,mode,synthetic(options));
  else if (mode === 'double-run') {
    const roots=(options.get('out-roots')||'').split(',');if(roots.length!==2||roots[0]===roots[1])fail('TWO_EXTERNAL_ROOTS_REQUIRED');
    const first=derive(new Map([...options,['out-root',roots[0]]]));
    const second=derive(new Map([...options,['out-root',roots[1]]]));if(first.sha256!==second.sha256)fail('NON_DETERMINISTIC');
    report(true,mode,{runs:[first,second]});
  } else fail('UNKNOWN_MODE');
} catch (error) {const detail=String(error.message).replace(/(?:postgres(?:ql)?:\/\/|password=)\S+/giu,'[REDACTED]');
  report(false,process.argv[2]||'validate',{code:error.code||'FAIL',detail});process.exitCode=1;
}
