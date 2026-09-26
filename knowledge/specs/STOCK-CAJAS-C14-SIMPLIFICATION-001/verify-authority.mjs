import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname,join } from 'node:path';
import { fileURLToPath } from 'node:url';
const vHash=value=>createHash('sha256').update(value).digest('hex');
const vCanonical=value=>`${JSON.stringify(value).replace(/(?<!\\)\\[btnfr]/gu,x=>
  new Map([['\\b','\\u0008'],['\\t','\\u0009'],['\\n','\\u000a'],['\\f','\\u000c'],['\\r','\\u000d']]).get(x))}\n`;
const vDomain=(domain,value)=>vHash(Buffer.concat([Buffer.from(domain),Buffer.from([0]),
  Buffer.isBuffer(value)?value:Buffer.from(value)]));
const vFail=(code,detail='')=>{const error=new Error(detail||code);error.code=code;throw error;};
const vKeys=(value,expected,label)=>{if(!value||Array.isArray(value)||typeof value!=='object'||
  Object.keys(value).join('|')!==expected.join('|'))vFail('UNKNOWN_OR_MISSING_FIELDS',label);};
const HERE=dirname(fileURLToPath(import.meta.url));
function reconstructCx08Seal(input) {
  const bytes=readFileSync(join(HERE,'../STOCK-CAJAS-C14-CX-DEFINITIONS-001/CX08_SEMANTIC_SEAL.md'));
  const blob=createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex');
  if(blob!=='cd543667c914e7ce60e007ea8c223b094a2ce100'||vHash(bytes)!==
      '15f107dbd45f415b5f920ddc806d8119fd43d247598a849e46450e471fab944b')vFail('CX08_SEAL_FILE_IDENTITY');
  const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes),match=/```cj1\n(\{[^\n]+\}\n)```/u.exec(text);
  if(!match||Buffer.byteLength(match[1])!==3439||vHash(match[1])!=='048ddebd6084350fca9bf0b6d99d1319781d13c31fe5b8461eaa2ab810abc0ac')
    vFail('CX08_SEAL_CORE_BYTES');const core=JSON.parse(match[1]),keys=Object.keys(core).join('|');
  const expected='dbObjectCount|dbObjectDelta|fragmentSeals|humanApprovalEvidence|independentPassEvidence|schemaVersion|'+
    'semanticCandidateBlob|semanticCandidateByteLength|semanticCandidatePath|semanticCandidateSha256|semanticDecisionIds';
  if(keys!==expected||
      core.fragmentSeals.length!==11||core.independentPassEvidence.length!==1)vFail('CX08_SEAL_CORE_FIELDS');
  const rows=input.rows.filter(row=>row.cx==='CX08');for(let index=0;index<core.fragmentSeals.length;index+=1){
    const seal=core.fragmentSeals[index],row=rows[index];if(Object.keys(seal).join('|')!==
      'fragmentPath|fragmentSha256|lfCount|objectId|objectOrdinal'||seal.objectId!==row.objectId||seal.objectOrdinal!==row.objectOrdinal||
      seal.fragmentSha256!==row.rendering.v2ObjectBlockSha256||seal.lfCount!==row.rendering.lfCount)vFail('CX08_SEAL_FRAGMENT',seal.objectId);}
  const semanticSealSha256=vDomain('C14-RTS-CX08-SEMANTIC-SEAL-V1',match[1]);
  if(semanticSealSha256!=='09e3687e115f23dcac6093a7f8d22ea992eb293699e011eada00d04fcf543302')vFail('CX08_SEAL_HASH');
  return {...core,semanticSealSha256};}
const SLOTS = ['OBJ','ATM','BRN','BDY','DEP','EVT','LOC'];
const UNIT_KINDS = ['DECISION','OBJECT','RULE','BRANCH_FAMILY','FUNCTION_BODY',
  'TRIGGER_ATTACHMENT','DEPENDENCY','LOCATOR'];
const EXPECTED_KIND_COUNTS = [65,169,1052,92,53,59,127,517];
export function independentlyValidateSc63Projection(units,root=null) {
  const ids=[...Array(65)].map((_,index)=>`SC${String(index+1).padStart(2,'0')}`);
  const decisions=units.filter(unit=>unit.sourceUnitKind==='DECISION');
  if(decisions.length!==65||decisions.some((unit,index)=>unit.sourceDecisionId!==ids[index]||unit.sourceUnitId!==ids[index]))
    vFail('DECISION_INVENTORY');
  const rowCountsByKind=UNIT_KINDS.map((kind,index)=>({kind,count:units.filter(unit=>unit.sourceUnitKind===kind).length}));
  if(rowCountsByKind.some((row,index)=>row.count<1||row.count!==EXPECTED_KIND_COUNTS[index])||
      rowCountsByKind.reduce((total,row)=>total+row.count,0)!==2134)vFail('ROW_KIND_COUNTS');
  if(root&&vCanonical(root.proposedDecisionInventory)!==vCanonical(decisions))vFail('DECISION_INVENTORY');
  if(root&&vCanonical(root.rowCountsByKind)!==vCanonical(rowCountsByKind))vFail('ROW_KIND_COUNTS');return {decisions,rowCountsByKind};}
function projectedEvents(row) {
  const all=row.parserExpectations.manifestProjection?.eventInventory||[];
  const entries=all.filter(entry=>(Array.isArray(entry)?(entry.length===7?entry[1]:entry[0]):entry.triggerObjectId)===row.objectId);
  if(!entries.length)return (row.rendering.ast.semanticAst?.events||row.parserExpectations.events||[]).map(operation=>({
    triggerObjectId:row.objectId,operation,timing:row.rendering.ast.semanticAst?.timing,level:row.rendering.ast.semanticAst?.level}));
  return entries.map(entry=>{if(!Array.isArray(entry))return {id:entry.eventId,triggerObjectId:entry.triggerObjectId,
    operation:entry.operation,timing:entry.timing};if(entry.length===7)return {id:entry[0],triggerObjectId:entry[1],
    timing:entry[2],operation:entry[3],level:entry[4],deferrable:entry[5],qualifier:entry[6]};
    return {triggerObjectId:entry[0],timing:entry[1],level:entry[2]==='ROW'?entry[2]:entry[3],
      operation:entry[2]==='ROW'?entry[3]:entry[2],qualifier:entry[4]};});}
function readName(tokens,index) {
  const token=tokens[index];if(!token||!['word','name'].includes(token.kind))return null;
  return tokens[index+1]?.value==='.'?{schema:token.value,name:tokens[index+2].value}:{schema:null,name:token.value};}
export function deriveVerifierEvents(row,tokens) {
  if(!['TRIGGER','CONSTRAINT_TRIGGER'].includes(row.category))return [];
  const timing=tokens.findIndex(token=>['BEFORE','AFTER'].includes(token.keyword));
  const on=tokens.findIndex((token,index)=>index>timing&&token.keyword==='ON');
  const forAt=tokens.findIndex((token,index)=>index>on&&token.keyword==='FOR');
  if(timing<0||on<0||forAt<0)vFail('TRIGGER_UNKNOWN_SYNTAX',row.objectId);
  const relation=readName(tokens,on+1),level=tokens[forAt+2]?.keyword;
  const deferrable=tokens.some(token=>token.keyword==='DEFERRABLE');
  const deferred=tokens.some((token,index)=>token.keyword==='INITIALLY'&&tokens[index+1]?.keyword==='DEFERRED');
  const found=tokens.slice(timing+1,on).filter(token=>['INSERT','UPDATE','DELETE'].includes(token.keyword)).map(token=>({
    triggerObjectId:row.objectId,timing:tokens[timing].keyword,operation:token.keyword,level,deferrable,
    qualifier:token.keyword==='UPDATE'?'ALL_COLUMNS':'NOT_UPDATE',relation:`${relation.schema}.${relation.name}`,
    startByte:token.begin,endByte:token.end}));
  const expected=projectedEvents(row);if(found.length!==expected.length)vFail('EVENT_INVENTORY_MISMATCH',row.objectId);
  expected.forEach((source,index)=>{const event=found[index];const qualifier=source.qualifier==null||
    [event.qualifier,event.relation,event.deferrable?'INITIALLY_DEFERRED':null,'ROW_DEFERRABLE_INITIALLY_DEFERRED'].includes(source.qualifier);
    if(source.triggerObjectId!==row.objectId||source.timing!==event.timing||source.operation!==event.operation||
      (source.level&&!String(source.level).startsWith(event.level))||
      (source.deferrable!==undefined&&source.deferrable!==event.deferrable)||!qualifier)vFail('EVENT_INVENTORY_MISMATCH',row.objectId);
    event.eventId=source.id||null;event.initiallyDeferred=deferred;});
  return found;}
export function assertVerifierSyntax(row,tokens) {
  if(row.category!=='FUNCTION')return;const forbidden=['PERFORM','LOOP','WHILE','FOREACH','OPEN','FETCH','MOVE','CLOSE','CALL','DO'];
  if(tokens.some(token=>forbidden.includes(token.keyword)))vFail('SQL_UNKNOWN_SYNTAX',row.objectId);
  const begin=tokens.findIndex(token=>token.keyword==='BEGIN');if(begin<0)vFail('FUNCTION_BODY_UNKNOWN',row.objectId);
  const accepted=['SELECT','WITH','IF','ELSIF','ELSE','END','RETURN','RAISE','BEGIN'];let statement=true;
  for(let index=begin+1;index<tokens.length;index+=1){const token=tokens[index];
    if(statement&&token.kind==='word'&&!accepted.includes(token.keyword)&&tokens[index+1]?.value!==':=')
      vFail('SQL_UNKNOWN_SYNTAX',`${row.objectId}:${token.value}`);statement=token.value===';';}}
const resultValues=result=>result.map(row=>row.cells.map(cell=>cell.valueUtf8));
export function independentlySelect(observation) {
  const result = observation.queryResults.map(resultValues);
  const boolean = value => value === 't' ? true : value === 'f' ? false : vFail('CATALOG_BOOLEAN');
  if(result[1].length!==1||result[1][0][0]!=='btree_gist'||!result[1][0][1])vFail('AVAILABLE_EXTENSION');
  const version=result[1][0][1],tuple=result[2].filter(row=>row[0]==='btree_gist'&&row[1]===version);
  if (tuple.length !== 1 || (tuple[0][6] !== null && tuple[0][6] !== 'public')) vFail('DEFAULT_TUPLE');
  const privileges=result[4][0].map(boolean),opclass=['public','gist_text_ops','gist','pg_catalog.text','btree_gist','e'];
  if (result[1][0][2] === null) {
    if (result[3].length || result[5].length || !privileges.slice(0,3).every(Boolean) ||
        (!privileges[3] && !boolean(tuple[0][4]))) vFail('ABSENT_NOT_CREATE_ELIGIBLE');
  } else if (result[1][0][2] !== version || !result[3].length ||
      !result[5].some(row => JSON.stringify(row) === JSON.stringify(opclass))) {
    vFail('INSTALLED_STATE');}
  return version;}
function reconstructObjects(input, version) {
  return input.rows.map((row,index) => {
    const bytes = index ? Buffer.from(row.rendering.bytesBase64,'base64') :
      Buffer.from(`CREATE EXTENSION btree_gist SCHEMA public VERSION '${version.replaceAll("'","''")}';\n`);
    const inventory = index ? input.inventories[index] : {
      statementKind:'CREATE_EXTENSION',dependencies:[],events:[],errors:[],branches:[],roots:[],atoms:[],
      atomCount:0,locators:[{kind:'FULL_OBJECT',startByte:0,endByte:bytes.length}],
      rawSha256:vHash(bytes),lfCount:1,
    };
    return {cx:row.cx,objectId:row.objectId,objectOrdinal:row.objectOrdinal,
      category:row.category,attachment:row.attachment,bytesBase64:bytes.toString('base64'),inventory,
      objectSha256:vDomain('C14-SIMPLIFICATION-FINAL-OBJECT-V1',bytes)};
  });}
function reconstructUnits(input,objects) {
  const extracted=[],rowById=new Map(input.rows.map(row=>[row.objectId,row]));
  const emit=(kind,object,ordinal,payload)=>extracted.push({kind,object,ordinal,payload});
  objects.forEach(object=>{emit('OBJECT',object,1,object.objectSha256);
    object.inventory.atoms.forEach((payload,index)=>emit('RULE',object,index+1,payload));
    object.inventory.branches.forEach((payload,index)=>emit('BRANCH_FAMILY',object,index+1,payload));
    if(object.category==='FUNCTION')emit('FUNCTION_BODY',object,1,object.inventory.rawSha256);
    if(object.inventory.events.length)emit('TRIGGER_ATTACHMENT',object,1,object.inventory.events);
    object.inventory.dependencies.forEach((payload,index)=>emit('DEPENDENCY',object,index+1,payload));
    object.inventory.locators.forEach((payload,index)=>emit('LOCATOR',object,index+1,payload));});
  for(let ordinal=1;ordinal<=65;ordinal+=1){const id=`SC${String(ordinal).padStart(2,'0')}`;
    const row=input.rows.slice(1).find(value=>value.parserExpectations.sourceDecisionId===id);
    emit('DECISION',objects[row?input.rows.indexOf(row):0],ordinal,id);}
  const missing=new Map(),proposal=input.source.authoritativeInputs.completionProposal;
  const units=extracted.map(item=>{const row=rowById.get(item.object.objectId),authority=item.kind==='DECISION'?proposal:
      row.provenance.findLast(value=>value.gitBlob),start=Number.isInteger(item.payload?.startByte)?item.payload.startByte:0;
    const end=Number.isInteger(item.payload?.endByte)&&item.payload.endByte<=authority.byteLength?item.payload.endByte:authority.byteLength;
    const counter=`${authority.gitBlob}:${item.kind}`,local=(missing.set(counter,(missing.get(counter)||0)+1),missing.get(counter));
    const sourceDecisionId=item.kind==='DECISION'?item.payload:(row?.parserExpectations.sourceDecisionId||
      `NO_DECISION:${authority.path}:${item.kind}:${String(local).padStart(4,'0')}`);
    const sourceUnitId=item.kind==='DECISION'?item.payload:
      `${item.object.cx}:${item.kind}:${String(item.object.objectOrdinal).padStart(4,'0')}:${String(item.ordinal).padStart(4,'0')}`;
    const semanticText=typeof item.payload==='string'?item.payload:
      `P:${vDomain('C14-SOURCE-UNIT-PAYLOAD-V1',vCanonical(item.payload))}`;
    const targetObjectIds=[item.object.objectId],targetCxs=[item.object.cx];
    const targetObjectSetSha256=vDomain('C14-SOURCE-UNIT-TARGET-OBJECT-SET-V1',vCanonical(targetObjectIds));
    const authorityId=authority.path,authorityIdentity=`GIT_BLOB:${authority.gitBlob}`;
    const authoritySectionPath=`${authority.path}#B${start}:${end}`;
    const core={schemaVersion:'C14-SOURCE-UNIT-V1',authorityId,authorityIdentity,authoritySectionPath,sourceDecisionId,
      sourceUnitId,sourceUnitKind:item.kind,semanticText,targetObjectIds,targetObjectSetSha256,targetCxs};
    const semanticCore={authorityId,authorityIdentity,authoritySectionPath,semanticText,sourceDecisionId,sourceUnitId,
      sourceUnitKind:item.kind,targetCxs,targetObjectSetSha256},sourceSemanticStatement=vCanonical(semanticCore).trimEnd();
    if([...sourceSemanticStatement].length>1024)vFail('SOURCE_SEMANTIC_NSTRING',sourceUnitId);
    const sourceSemanticSha256=vDomain('C14P-SEED-SOURCE-SEMANTIC-V2',vCanonical(sourceSemanticStatement));
    return {...core,sourceSemanticStatement,sourceSemanticSha256,
      sourceUnitSha256:vDomain('C14-SOURCE-UNIT-V1',vCanonical(core))};});
  const identities=new Set(),digests=new Set();for(const unit of units){const identity=[unit.authorityIdentity,
    unit.authoritySectionPath,unit.sourceDecisionId,unit.sourceUnitId].join('|');
    if(identities.has(identity)||digests.has(unit.sourceSemanticSha256))vFail('SOURCE_UNIT_COLLISION',unit.sourceUnitId);
    identities.add(identity);digests.add(unit.sourceSemanticSha256);}
  if(units.length!==2134)vFail('SOURCE_UNIT_COUNT',String(units.length));return units;}
function reconstructSeeds(units) {
  const ranking=new Map(UNIT_KINDS.map((kind,index)=>[kind,index]));
  const expanded=units.flatMap(unit=>unit.targetCxs.map(cx=>({unit,cx}))).sort((left,right)=>
    left.cx.localeCompare(right.cx)||ranking.get(left.unit.sourceUnitKind)-ranking.get(right.unit.sourceUnitKind)||
    left.unit.sourceDecisionId.localeCompare(right.unit.sourceDecisionId)||left.unit.sourceUnitId.localeCompare(right.unit.sourceUnitId)||
    left.unit.sourceSemanticSha256.localeCompare(right.unit.sourceSemanticSha256));
  if(expanded.length!==2134)vFail('SEED_SOURCE_COUNT');const outputs=expanded.map((_,index)=>`C14O-${String(index+1).padStart(5,'0')}`);
  const seedSources=expanded.map(({unit,cx},index)=>{const seedExpectedOutputs=Array.from({length:26},(_,offset)=>({
      outputId:outputs[(index+offset)%outputs.length],relation:offset?'REFERENCES_SHARED':'EMITS'}));
    const core={seedSourceId:`C14SS-${String(index+1).padStart(5,'0')}`,cx,sourceDecisionId:unit.sourceDecisionId,
      sourceUnitId:`${unit.sourceUnitId}#${cx}`,seedClass:unit.sourceUnitKind==='DECISION'?'PROPOSAL_DECISION':unit.sourceUnitKind,
      expectedOwnerObjectId:unit.targetObjectIds.find(id=>id.startsWith('extension:')||unit.targetCxs.includes(cx))||null,
      sourceSemanticStatement:unit.sourceSemanticStatement,sourceSemanticSha256:unit.sourceSemanticSha256,
      sourceLocators:[unit.authoritySectionPath],seedExpectedOutputs};
    return {...core,seedSourceSha256:vDomain('C14P-SEED-SOURCE-SEMANTIC-V2',vCanonical(core))};});
  const ordinals=new Map(),rows=seedSources.map(seed=>{const seedClass=seed.seedClass==='PROPOSAL_DECISION'?'RULE':seed.seedClass;
    const group=`${seed.cx}:${seedClass}`,ordinal=(ordinals.set(group,(ordinals.get(group)||0)+1),ordinals.get(group));
    const core={seedId:`C14S-${seed.cx}-${seedClass}-${String(ordinal).padStart(4,'0')}`,cx:seed.cx,seedClass,
      seedSourceSha256:seed.seedSourceSha256,sourceSemanticSha256:seed.sourceSemanticSha256,sourceUnitId:seed.sourceUnitId,
      sourceLocators:seed.sourceLocators,expectedOwnerObjectId:seed.expectedOwnerObjectId,seedExpectedOutputs:seed.seedExpectedOutputs};
    return {...core,seedRowSha256:vDomain('C14A-SEED-ROW-V1',vCanonical(core))};});
  const emitted=seedSources.flatMap(seed=>seed.seedExpectedOutputs.filter(output=>output.relation==='EMITS').map(output=>output.outputId));
  if(new Set(emitted).size!==2134||emitted.some(id=>!outputs.includes(id)))vFail('EMITS_BIJECTION');return {seedSources,rows};}
function reconstructSlots(rows) {
  const map = {OBJ:'OBJECT',ATM:'RULE',BRN:'BRANCH_FAMILY',BDY:'FUNCTION_BODY',
    DEP:'DEPENDENCY',EVT:'TRIGGER_ATTACHMENT',LOC:'LOCATOR'};
  const slots = [];
  for (let number=1; number<=13; number+=1) for (const category of SLOTS) {
    const cx = `CX${String(number).padStart(2,'0')}`;
    const selected = rows.filter(row => row.cx === cx && row.seedClass === map[category]);
    const bytes = selected.map(vCanonical).join('');
    slots.push({slotId:`C14A-${cx}-${category}`,cx,category,rowCount:selected.length,
      byteLength:Buffer.byteLength(bytes),rowsSha256:vHash(bytes)});
  }
  const descriptors = slots.map(slot => ({slotId:slot.slotId,rowCount:slot.rowCount,
    byteLength:slot.byteLength,rowsSha256:slot.rowsSha256}));
  const css1 = [...Array(13)].map((_,index) => {
    const cx = `CX${String(index+1).padStart(2,'0')}`;
    const core = {cx,slotIds:slots.filter(slot=>slot.cx===cx).map(slot=>slot.slotId)};
    return {...core,css1Sha256:vDomain('C14A-CSS1-V1',vCanonical(core))};
  });
  if (slots.length !== 91 || descriptors.length !== 91 || css1.length !== 13) vFail('SLOT_TOPOLOGY');
  return {slots,descriptors,css1};}
function childObjects(source, objects, childId) {
  return objects.filter(object => object.attachment.c14Child === childId ||
    (childId.startsWith('C14-33') && object.cx === 'CX12' &&
      (source.cx12Partitions[childId] || []).includes(object.objectOrdinal)) ||
    (childId.startsWith('C14-16') && object.cx === 'CX07' &&
      (source.cx07Partitions[childId] || []).includes(object.objectOrdinal)) ||
    (childId.startsWith('C14-18') && object.cx === 'CX08' &&
      (source.cx08Partitions[childId] || []).includes(object.objectOrdinal)));}
function reconstructTopology(input, objects, slots) {
  const source = input.source.rts1b;
  const children = source.children.map(childId => {
    const selected = childObjects(source,objects,childId);
    const lineCount = 4 + selected.reduce((sum,object)=>sum+object.inventory.lfCount,0) +
      Math.max(0,selected.length-1) + 1;
    if (lineCount > 350) vFail('P19_CAPACITY',childId);
    return {childId,objectIds:selected.map(object=>object.objectId),lineCount};
  });
  const projections = children.map((child,index) => {
    const core = {projectionId:`RTS1B-${String(index+1).padStart(2,'0')}`,
      childId:child.childId,objectIds:child.objectIds};
    return {...core,projectionSha256:vDomain('C14-RTS1B-PROJECTION-V1',vCanonical(core))};
  });
  const sourceSets = projections.map(projection => {
    const slotIds = [...new Set(projection.objectIds.flatMap(id => {
      const cx = objects.find(object=>object.objectId===id)?.cx;
      return slots.filter(slot=>slot.cx===cx).map(slot=>slot.slotId);
    }))];
    const core = {projectionId:projection.projectionId,slotIds};
    return {...core,sourceSetSha256:vDomain('C14A-PSS1-V1',vCanonical(core))};
  });
  const parentBindings = children.filter(child=>child.childId.startsWith('C14-33'))
    .map((child,index)=>({rank:index+1,authority:child.childId,
      identity:vHash(vCanonical(child)),state:'BOUND'}));
  if (projections.length!==24 || sourceSets.length!==24 || parentBindings.length!==9) {
    vFail('RTS1B_TOPOLOGY');
  }
  return {children,projections,sourceSets,parentBindings};}
function reconstructProfile(input) {
  const ids = input.source.authoritativeInputs.requiredParentIdentities;
  const profile = {schemaVersion:'C14P-PROFILE-V2-RTS1B',status:'PROPOSED_NON_EXECUTABLE',
    serializationProfile:'CJ1_CJL1_SQLFRAG_V2',rowSchemaVersion:'C14P-ROW-V2-RTS1B',
    rootSchemaVersion:'C14P-ROOT-V2-RTS1B',parentProposalBlob:ids.P19,
    parentProposalApprovalObservation:4802,serializationAddendumBlob:ids.P19Serialization,
    serializationApprovalObservation:4816,capacityAddendumBlob:ids.P19Capacity,
    capacityApprovalObservation:5037,bindingAddendumBlob:ids.BIND,topologyBlob:ids.RTS,
    c13Commit:ids.C13Commit,c13SchemaBlob:ids.C13SchemaBlob,p16Choice:'B',u01Choice:'A',u02Choice:'A',
    artifactClasses:['profile.cj1','blocks/CXnn/dddd.sqlfrag','proposal-rows.cjl1','proposal-root.cj1'],
    unknownKeys:'REJECT',renderingTopologyAddendumBlob:ids.RTS,
    renderingTopologyApprovalObservation:5037,renderingTopologyState:'RTS1B',
    renderingDecisionIds:['RTS00','RTS07','RTS08','RTS12'],cx08SemanticSeal:reconstructCx08Seal(input)};
  if (Object.keys(profile).length !== 25) vFail('PROFILE_FIELD_COUNT');
  return profile;}
function reconstructProposal(input, objects, units, topology, profile, hashes) {
  const ids = input.source.authoritativeInputs.requiredParentIdentities;
  const inventory = objects.map(object=>({cx:object.cx,objectId:object.objectId,
    objectOrdinal:object.objectOrdinal,objectSha256:object.objectSha256}));
  const {decisions,rowCountsByKind}=independentlyValidateSc63Projection(units);
  const root = {schemaVersion:'C14P-ROOT-V2-RTS1B',rootId:'C14-CX-PROPOSAL-ROOT-V2-RTS1B',
    status:'PROPOSED_NON_EXECUTABLE',gateState:'HUMAN_APPROVAL_REQUIRED',nonAuthority:true,
    profileSha256:hashes.profile,parentProposalBlob:ids.P19,
    parentProposalApprovalEvidenceRowId:'EVIDENCE:4802',serializationAddendumBlob:ids.P19Serialization,
    serializationApprovalEvidenceRowId:'EVIDENCE:4816',capacityAddendumBlob:ids.P19Capacity,
    capacityApprovalEvidenceRowId:'EVIDENCE:5037',bindingAddendumBlob:ids.BIND,topologyBlob:ids.RTS,
    c13Commit:ids.C13Commit,c13SchemaBlob:ids.C13SchemaBlob,
    coreDecisionIds:[...Array(19)].map((_,i)=>`P${String(i+1).padStart(2,'0')}`),
    p16Choice:'B',u01Choice:'A',u02Choice:'A',serializationDecisionIds:[1,2,3,4,5,6].map(i=>`A0${i}`),
    capacityDecisionIds:[1,2,3,4,5,6].map(i=>`C0${i}`),cxInventory:input.source.inventory.inventoryByCx,
    expectedObjectInventory:inventory,
    objectInventorySha256:vDomain('C14P-OBJECT-INVENTORY-V2',vCanonical(inventory)),objectCount:169,
    fragmentInventory:inventory,
    fragmentInventorySha256:vDomain('C14P-FRAGMENT-INVENTORY-V2',vCanonical(inventory)),fragmentCount:169,
    rowCount:hashes.csr1Count,rowCountsByKind,rowSetSha256:hashes.seedRegistry,
    proposedDecisionInventory:decisions,
    decisionInventorySha256:vDomain('C14P-DECISION-INVENTORY-V2',vCanonical(decisions)),
    decisionStatusSummary:{total:65,unresolved:65,selected:0,recommended:0},
    completenessSummary:{objects:169,slots:91,projections:24,parentBindings:9},
    hashCoverage:{profile:true,fragments:true,rows:true,rowSet:true,objectInventory:true,
      fragmentInventory:true,decisionInventory:true,rootCore:true},
    hashExclusions:['ROW_SELF','ROOT_SELF','FUTURE_AUTHORITY','FINAL_WRAPPER'],
    nextApprovalBoundary:{requiredState:'INDEPENDENT_PASS_THEN_FRANCO_EXACT_BLOB_APPROVAL',
      forbidsAuthority:true},renderingTopologyAddendumBlob:ids.RTS,
    renderingTopologyApprovalEvidence:{observationId:5037,verdict:'PASS'},renderingTopologyState:'RTS1B',
    renderingDecisionIds:['RTS00','RTS07','RTS08','RTS12'],renderingProjections:topology.projections,
    renderingSourceSets:topology.sourceSets,renderingTopologySha256:hashes.renderingTopology,
    cx08SemanticSeal:profile.cx08SemanticSeal};
  if (Object.keys(root).length !== 47) vFail('PROPOSAL_ROOT_FIELD_COUNT');
  return root;}
function reconstructAuthority(input, topology, profile, proposalHash, hashes, tooling) {
  const ids = input.source.authoritativeInputs.requiredParentIdentities;
  const root = {schemaVersion:'C14A-ROOT-V1-RTS1B',rootId:'C14-CX-AUTHORITY-ROOT-V1-RTS1B',
    proposalBlob:proposalHash.slice(0,40),parentBindings:topology.parentBindings,
    coreDecisionIds:[...Array(19)].map((_,i)=>`P${String(i+1).padStart(2,'0')}`),
    p16Choice:'B',u01Choice:'A',u02Choice:'A',normalizationProfileId:'C14A-NORM-V1',
    seedRegistrySha256:hashes.seedRegistry,childInventorySha256:hashes.childInventory,
    sqlChildSourceSets:topology.sourceSets,children:topology.descriptors,
    renderingTopologyAddendumBlob:ids.RTS,
    renderingTopologyApprovalEvidence:{observationId:5037,verdict:'PASS'},renderingTopologyState:'RTS1B',
    renderingDecisionIds:['RTS00','RTS07','RTS08','RTS12'],renderingProjections:topology.projections,
    renderingSourceSets:topology.sourceSets,renderingTopologySha256:hashes.renderingTopology,
    cx08SemanticSeal:profile.cx08SemanticSeal};
  if (Object.keys(root).length !== 21) vFail('AUTHORITY_ROOT_FIELD_COUNT');
  const rootSha256 = vDomain('C14A-ROOT-RTS1B-V1',vCanonical(root));
  const tupleCore = {schemaVersion:'C14A-AUTHORITY-TUPLE-V1-RTS1B',rootId:root.rootId,
    proposalBlob:root.proposalBlob,parentBindingsSha256:hashes.parentBindings,
    seedRegistrySha256:hashes.seedRegistry,childInventorySha256:hashes.childInventory,
    rootSha256,toolchain:tooling.modules,toolchainSha256:tooling.toolchainSha256,
    candidateStateSha256:tooling.candidateStateSha256,
    independentReviewEvidence:[]};
  const authorityTuple = {...tupleCore,
    tupleSha256:vDomain('C14A-AUTHORITY-TUPLE-V1-RTS1B',vCanonical(tupleCore))};
  const envelopeCore = {schemaVersion:'C14A-APPROVAL-ENVELOPE-CANDIDATE-V1',
    tupleSha256:authorityTuple.tupleSha256,toolchain:tooling.modules,toolchainSha256:tooling.toolchainSha256,
    candidateStateSha256:tooling.candidateStateSha256,humanApprovalEvidence:null,approvedAt:null,
    executionAuthority:false};
  const envelope = {...envelopeCore,
    envelopeSha256:vDomain('C14A-APPROVAL-ENVELOPE-CANDIDATE-V1',vCanonical(envelopeCore))};
  return {authorityRoot:{...root,rootSha256},authorityTuple,envelope};}
export function reconstructPackage(input, observation, evidenceClass = 'REAL_APPROVED_OBSERVATION') {
  const tooling=observation.candidateInventory;
  if(!tooling?.toolchainSha256||!tooling?.candidateStateSha256)vFail('TOOLCHAIN_IDENTITY_REQUIRED');
  const selectedVersion = independentlySelect(observation);
  const objects = reconstructObjects(input,selectedVersion);
  const sourceUnits = reconstructUnits(input,objects);
  const seeds = reconstructSeeds(sourceUnits);
  const slotData = reconstructSlots(seeds.rows);
  const topology = {...reconstructTopology(input,objects,slotData.slots),
    descriptors:slotData.descriptors};
  const hashes = {seedRegistry:vDomain('C14A-SEED-REGISTRY-V1',seeds.rows.map(vCanonical).join('')),
    childInventory:vDomain('C14A-CHILD-INVENTORY-RTS1B-V1',vCanonical(topology.children)),
    parentBindings:vDomain('C14A-PARENTS-RTS1B-V1',vCanonical(topology.parentBindings)),
    renderingTopology:vDomain('C14-RENDERING-TOPOLOGY-RTS1B-V1',vCanonical({
      children:topology.children,projections:topology.projections,sourceSets:topology.sourceSets,
      parentBindings:topology.parentBindings})),csr1Count:seeds.rows.length};
  const profile = reconstructProfile(input);
  hashes.profile = vDomain('C14P-PROFILE-V2-RTS1B',vCanonical(profile));
  const proposal = reconstructProposal(input,objects,sourceUnits,topology,profile,hashes);
  const proposalRootSha256 = vDomain('C14P-ROOT-V2-RTS1B',vCanonical(proposal));
  const authority = reconstructAuthority(input,topology,profile,proposalRootSha256,hashes,tooling);
  return {schemaVersion:'C14-PACKAGE-B-RTS1B-V2',evidenceClass,
    candidateInventory:tooling,inputs:{semanticSourceSha256:input.sourceSha256,
      objectBlocksSha256:input.blocksSha256,catalogSnapshotSha256:observation.snapshotSha256,
      toolchainSha256:tooling.toolchainSha256,candidateStateSha256:tooling.candidateStateSha256},
    selectedVersion,objects,sourceUnits,
    seedSources:seeds.seedSources,csr1:{rows:seeds.rows,seedRegistrySha256:hashes.seedRegistry},
    slots:slotData.slots,descriptors:slotData.descriptors,css1:slotData.css1,
    projections:topology.projections,pss1:topology.sourceSets,sourceSets:topology.sourceSets,
    parentBindings:topology.parentBindings,profile,childInventory:topology.children,
    renderingTopologySha256:hashes.renderingTopology,
    proposalRoot:{...proposal,proposalRootSha256},...authority};
}
export function compareCompletePackage(actual, expected, allowSynthetic = false) {
  vKeys(actual,Object.keys(expected),'package');
  if (!allowSynthetic && actual.evidenceClass !== 'REAL_APPROVED_OBSERVATION') {
    vFail('SYNTHETIC_PACKAGE_FORBIDDEN');
  }
  if (vCanonical(actual) !== vCanonical(expected)) {
    const pending = [['package',actual,expected]];
    let mismatch = 'package';
    while (pending.length) {
      const [path,left,right] = pending.shift();
      if (JSON.stringify(left) === JSON.stringify(right)) continue;
      mismatch = path;
      if (left && right && typeof left === 'object' && typeof right === 'object') {
        const names = new Set([...Object.keys(left),...Object.keys(right)]);
        for (const name of names) pending.push([`${path}.${name}`,left[name],right[name]]);
      } else break;
    }
    const parts = mismatch.split('.').slice(1);
    const at = (root) => parts.reduce((value,key)=>value?.[key],root);
    vFail('PACKAGE_RECONSTRUCTION_MISMATCH',
      `${mismatch}:${JSON.stringify(at(actual))}:${JSON.stringify(at(expected))}`.slice(0,500));
  }
  return {byteLength:Buffer.byteLength(vCanonical(actual)),sha256:vHash(vCanonical(actual)),
    proposalRootSha256:actual.proposalRoot.proposalRootSha256,
    authorityRootSha256:actual.authorityRoot.rootSha256};
}
function oneRow(values, columns) {
  return {rowOrdinal:1,cells:values.map((value,index)=>({columnOrdinal:index+1,
    columnName:columns[index],isNull:value===null,valueUtf8:value}))};
}
export function independentSyntheticObservation(input, queryArtifacts, contracts, candidateInventory) {
  const raw = [
    [['1','1','postgres','160000','PostgreSQL synthetic','1','synthetic_role','1:1:',
      '2000-01-01T00:00:00.000Z']], [['btree_gist','1.7.0','1.7.0']],
    [['btree_gist','1.7.0','t','t','t','t','public','{}']],
    [['btree_gist','1.7.0','public','t','1','synthetic_role',null,null,null]],
    [['t','t','t','t']], [['public','gist_text_ops','gist','pg_catalog.text','btree_gist','e']],
  ];
  const queryResults = raw.map((set,index)=>set.map(values=>oneRow(values,contracts[index].columns)));
  const core = {schemaVersion:'C14C-CATALOG-OBSERVATION-V1',approvalSha256:'0'.repeat(64),
    input:{semanticSourceSha256:input.sourceSha256,objectBlocksSha256:input.blocksSha256},candidateInventory,
    target:{label:'ossum-cor-dev',projectRef:'yywqcdromnmmelijvspi',connectionProfile:candidateInventory.connectionProfile.profile,
      connectionProfileSha256:candidateInventory.connectionProfile.rawSha256,systemIdentifier:'1',databaseOid:'1',databaseName:'postgres',
      serverVersionNum:'160000',serverVersion:'PostgreSQL synthetic',currentUserOid:'1',
      currentUserName:'synthetic_role'},transactionMode:'READ_ONLY_REPEATABLE_READ',
    transactionSnapshotIdentity:'1:1:',observedAt:'2000-01-01T00:00:00.000Z',
    queryArtifacts,queryResults};
  return {...core,snapshotSha256:vDomain('C14C-SYNTHETIC-OBSERVATION-V1',vCanonical(core)),
    syntheticTestOnly:true};
}
