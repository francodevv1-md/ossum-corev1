import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname,join } from 'node:path';
import { fileURLToPath } from 'node:url';
const hash=value=>createHash('sha256').update(value).digest('hex');
const canonical=value=>`${JSON.stringify(value).replace(/(?<!\\)\\[btnfr]/gu,x=>
  ({'\\b':'\\u0008','\\t':'\\u0009','\\n':'\\u000a','\\f':'\\u000c','\\r':'\\u000d'})[x])}\n`;
const domainHash=(domain,value)=>hash(Buffer.concat([Buffer.from(domain),Buffer.from([0]),
  Buffer.isBuffer(value)?value:Buffer.from(value)]));
const fail=(code,detail='')=>{const error=new Error(detail||code);error.code=code;throw error;};
const HERE=dirname(fileURLToPath(import.meta.url));
function cx08Seal(input) {
  const bytes=readFileSync(join(HERE,'../STOCK-CAJAS-C14-CX-DEFINITIONS-001/CX08_SEMANTIC_SEAL.md'));
  const blob=createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex');
  if(blob!=='cd543667c914e7ce60e007ea8c223b094a2ce100'||hash(bytes)!==
      '15f107dbd45f415b5f920ddc806d8119fd43d247598a849e46450e471fab944b')fail('CX08_SEAL_FILE_IDENTITY');
  const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes),match=text.match(/```cj1\n(\{[^\n]+\}\n)```/u);
  if(!match||Buffer.byteLength(match[1])!==3439||hash(match[1])!=='048ddebd6084350fca9bf0b6d99d1319781d13c31fe5b8461eaa2ab810abc0ac')
    fail('CX08_SEAL_CORE_BYTES');const core=JSON.parse(match[1]);
  const keys='dbObjectCount,dbObjectDelta,fragmentSeals,humanApprovalEvidence,independentPassEvidence,schemaVersion,'+
    'semanticCandidateBlob,semanticCandidateByteLength,semanticCandidatePath,semanticCandidateSha256,semanticDecisionIds';
  if(Object.keys(core).join(',')!==keys||
      core.fragmentSeals.length!==11||core.independentPassEvidence.length!==1)fail('CX08_SEAL_CORE_FIELDS');
  const rows=input.rows.filter(row=>row.cx==='CX08');core.fragmentSeals.forEach((seal,index)=>{
    const row=rows[index];if(Object.keys(seal).join(',')!=='fragmentPath,fragmentSha256,lfCount,objectId,objectOrdinal'||
      seal.objectId!==row.objectId||seal.objectOrdinal!==row.objectOrdinal||seal.fragmentSha256!==row.rendering.v2ObjectBlockSha256||
      seal.lfCount!==row.rendering.lfCount)fail('CX08_SEAL_FRAGMENT',seal.objectId);});
  const semanticSealSha256=domainHash('C14-RTS-CX08-SEMANTIC-SEAL-V1',match[1]);
  if(semanticSealSha256!=='09e3687e115f23dcac6093a7f8d22ea992eb293699e011eada00d04fcf543302')fail('CX08_SEAL_HASH');
  return {...core,semanticSealSha256};
}
const SLOT_TYPES = ['OBJ','ATM','BRN','BDY','DEP','EVT','LOC'];
const UNIT_TYPES = ['DECISION','OBJECT','RULE','BRANCH_FAMILY','FUNCTION_BODY',
  'TRIGGER_ATTACHMENT','DEPENDENCY','LOCATOR'];
const UNIT_COUNTS = [65,169,1052,92,53,59,127,517];
export function validateSc63Projection(units,root=null) {
  const ids=Array.from({length:65},(_,index)=>`SC${String(index+1).padStart(2,'0')}`);
  const decisions=units.filter(unit=>unit.sourceUnitKind==='DECISION');
  if(decisions.length!==65||decisions.some((unit,index)=>unit.sourceDecisionId!==ids[index]||unit.sourceUnitId!==ids[index]))
    fail('DECISION_INVENTORY');
  const rowCountsByKind=UNIT_TYPES.map((kind,index)=>({kind,count:units.filter(unit=>unit.sourceUnitKind===kind).length}));
  if(rowCountsByKind.some((row,index)=>!row.count||row.count!==UNIT_COUNTS[index])||rowCountsByKind.reduce((sum,row)=>sum+row.count,0)!==2134)
    fail('ROW_KIND_COUNTS');
  if(root&&canonical(root.proposedDecisionInventory)!==canonical(decisions))fail('DECISION_INVENTORY');
  if(root&&canonical(root.rowCountsByKind)!==canonical(rowCountsByKind))fail('ROW_KIND_COUNTS');return {decisions,rowCountsByKind};
}
function eventOwner(row,entry) {
  if(!Array.isArray(entry))return entry.triggerObjectId===row.objectId;
  return (entry.length===7?entry[1]:entry[0])===row.objectId;
}
function eventExpectations(row) {
  const entries=(row.parserExpectations.manifestProjection?.eventInventory||[]).filter(entry=>eventOwner(row,entry));
  if(!entries.length)return (row.rendering.ast.semanticAst?.events||row.parserExpectations.events||[])
    .map(operation=>({triggerObjectId:row.objectId,operation,timing:row.rendering.ast.semanticAst?.timing,
      level:row.rendering.ast.semanticAst?.level}));
  return entries.map(entry=>{
    if(!Array.isArray(entry))return {id:entry.eventId,triggerObjectId:entry.triggerObjectId,
      operation:entry.operation,timing:entry.timing};
    if(entry.length===7)return {id:entry[0],triggerObjectId:entry[1],timing:entry[2],operation:entry[3],
      level:entry[4],deferrable:entry[5],qualifier:entry[6]};
    return {triggerObjectId:entry[0],timing:entry[1],level:entry[2]==='ROW'?entry[2]:entry[3],
      operation:entry[2]==='ROW'?entry[3]:entry[2],qualifier:entry[4]};
  });
}
function nameAt(tokens,index) {
  const first=tokens[index];if(!first||!['word','identifier'].includes(first.type))return null;
  return tokens[index+1]?.value==='.'?{schema:first.value,name:tokens[index+2].value}:{schema:null,name:first.value};
}
export function deriveGeneratorEvents(row,tokens) {
  if(!['TRIGGER','CONSTRAINT_TRIGGER'].includes(row.category))return [];
  const timing=tokens.findIndex(token=>['BEFORE','AFTER'].includes(token.upper));
  const on=tokens.findIndex((token,index)=>index>timing&&token.upper==='ON');
  const forAt=tokens.findIndex((token,index)=>index>on&&token.upper==='FOR');
  if(timing<0||on<0||forAt<0)fail('TRIGGER_UNKNOWN_SYNTAX',row.objectId);
  const relation=nameAt(tokens,on+1),level=tokens[forAt+2]?.upper;
  const deferrable=tokens.some(token=>token.upper==='DEFERRABLE');
  const initially=tokens.some((token,index)=>token.upper==='INITIALLY'&&tokens[index+1]?.upper==='DEFERRED');
  const actual=tokens.slice(timing+1,on).filter(token=>['INSERT','UPDATE','DELETE'].includes(token.upper)).map(token=>({
    triggerObjectId:row.objectId,timing:tokens[timing].upper,operation:token.upper,level,deferrable,
    qualifier:token.upper==='UPDATE'?'ALL_COLUMNS':'NOT_UPDATE',relation:`${relation.schema}.${relation.name}`,
    startByte:token.start,endByte:token.end}));
  const expected=eventExpectations(row);if(expected.length!==actual.length)fail('EVENT_INVENTORY_MISMATCH',row.objectId);
  expected.forEach((value,index)=>{const event=actual[index];const qualifierOk=value.qualifier==null||
    [event.qualifier,event.relation,event.deferrable?'INITIALLY_DEFERRED':null,'ROW_DEFERRABLE_INITIALLY_DEFERRED'].includes(value.qualifier);
    if(value.triggerObjectId!==row.objectId||value.timing!==event.timing||value.operation!==event.operation||
      (value.level&&!String(value.level).startsWith(event.level))||
      (value.deferrable!==undefined&&value.deferrable!==event.deferrable)||!qualifierOk)fail('EVENT_INVENTORY_MISMATCH',row.objectId);
    event.eventId=value.id||null;event.initiallyDeferred=initially;});
  return actual;
}
export function assertGeneratorSyntax(row,tokens) {
  if(row.category!=='FUNCTION')return;
  const unsupported=new Set(['PERFORM','LOOP','WHILE','FOREACH','OPEN','FETCH','MOVE','CLOSE','CALL','DO']);
  if(tokens.some(token=>unsupported.has(token.upper)))fail('SQL_UNKNOWN_SYNTAX',row.objectId);
  const begin=tokens.findIndex(token=>token.upper==='BEGIN');if(begin<0)fail('FUNCTION_BODY_UNKNOWN',row.objectId);
  const allowed=new Set(['SELECT','WITH','IF','ELSIF','ELSE','END','RETURN','RAISE','BEGIN']);let start=true;
  for(let index=begin+1;index<tokens.length;index+=1){const token=tokens[index];
    if(start&&token.type==='word'&&!allowed.has(token.upper)&&tokens[index+1]?.value!==':=')
      fail('SQL_UNKNOWN_SYNTAX',`${row.objectId}:${token.value}`);start=token.value===';';}
}
const values = result => result.map(row => row.cells.map(cell => cell.valueUtf8));
export function selectCatalog(observation) {
  const result = observation.queryResults.map(values);
  const boolean = value => value === 't' ? true : value === 'f' ? false : fail('CATALOG_BOOLEAN');
  if (result[1].length !== 1 || result[1][0][0] !== 'btree_gist' || !result[1][0][1]) {
    fail('AVAILABLE_EXTENSION');
  }
  const version = result[1][0][1];
  const tuple = result[2].filter(row => row[0] === 'btree_gist' && row[1] === version);
  if (tuple.length !== 1 || (tuple[0][6] !== null && tuple[0][6] !== 'public')) fail('DEFAULT_TUPLE');
  const privileges = result[4][0].map(boolean);
  const installed = result[1][0][2];
  const opclass = ['public','gist_text_ops','gist','pg_catalog.text','btree_gist','e'];
  if (installed === null) {
    if (result[3].length || result[5].length || !privileges.slice(0, 3).every(Boolean) ||
        (!privileges[3] && !boolean(tuple[0][4]))) fail('ABSENT_NOT_CREATE_ELIGIBLE');
  } else if (installed !== version || !result[3].length ||
      !result[5].some(row => JSON.stringify(row) === JSON.stringify(opclass))) {
    fail('INSTALLED_STATE');
  }
  return version;
}
function materializedObjects(input, version) {
  return input.rows.map((row, index) => {
    const bytes = index ? Buffer.from(row.rendering.bytesBase64, 'base64') :
      Buffer.from(`CREATE EXTENSION btree_gist SCHEMA public VERSION '${version.replaceAll("'", "''")}';\n`);
    const inventory = index ? input.inventories[index] : {
      statementKind:'CREATE_EXTENSION', dependencies:[], events:[], errors:[], branches:[], roots:[], atoms:[],
      atomCount:0, locators:[{kind:'FULL_OBJECT',startByte:0,endByte:bytes.length}],
      rawSha256:hash(bytes), lfCount:1,
    };
    return { cx:row.cx, objectId:row.objectId, objectOrdinal:row.objectOrdinal,
      category:row.category, attachment:row.attachment, bytesBase64:bytes.toString('base64'), inventory,
      objectSha256:domainHash('C14-SIMPLIFICATION-FINAL-OBJECT-V1', bytes) };
  });
}
function sourceUnits(input,objects) {
  const raw=[],rows=new Map(input.rows.map(row=>[row.objectId,row]));
  const add=(kind,object,ordinal,payload)=>raw.push({kind,object,ordinal,payload});
  for(const object of objects){add('OBJECT',object,1,object.objectSha256);
    object.inventory.atoms.forEach((value,index)=>add('RULE',object,index+1,value));
    object.inventory.branches.forEach((value,index)=>add('BRANCH_FAMILY',object,index+1,value));
    if(object.category==='FUNCTION')add('FUNCTION_BODY',object,1,object.inventory.rawSha256);
    if(object.inventory.events.length)add('TRIGGER_ATTACHMENT',object,1,object.inventory.events);
    object.inventory.dependencies.forEach((value,index)=>add('DEPENDENCY',object,index+1,value));
    object.inventory.locators.forEach((value,index)=>add('LOCATOR',object,index+1,value));}
  for(let number=1;number<=65;number+=1){const id=`SC${String(number).padStart(2,'0')}`;
    const row=input.rows.slice(1).find(value=>value.parserExpectations.sourceDecisionId===id);
    add('DECISION',objects[rows.has(row?.objectId)?input.rows.indexOf(row):0],number,id);}
  const absent=new Map(),proposal=input.source.authoritativeInputs.completionProposal;
  const units=raw.map(item=>{const row=rows.get(item.object.objectId),source=item.kind==='DECISION'?proposal:
      row.provenance.findLast(value=>value.gitBlob),start=Number.isInteger(item.payload?.startByte)?item.payload.startByte:0;
    const end=Number.isInteger(item.payload?.endByte)&&item.payload.endByte<=source.byteLength?item.payload.endByte:source.byteLength;
    const key=`${source.gitBlob}:${item.kind}`,local=(absent.set(key,(absent.get(key)||0)+1),absent.get(key));
    const sourceDecisionId=item.kind==='DECISION'?item.payload:(row?.parserExpectations.sourceDecisionId||
      `NO_DECISION:${source.path}:${item.kind}:${String(local).padStart(4,'0')}`);
    const sourceUnitId=item.kind==='DECISION'?item.payload:
      `${item.object.cx}:${item.kind}:${String(item.object.objectOrdinal).padStart(4,'0')}:${String(item.ordinal).padStart(4,'0')}`;
    const semanticText=typeof item.payload==='string'?item.payload:
      `P:${domainHash('C14-SOURCE-UNIT-PAYLOAD-V1',canonical(item.payload))}`;
    const targetObjectIds=[item.object.objectId],targetCxs=[item.object.cx];
    const targetObjectSetSha256=domainHash('C14-SOURCE-UNIT-TARGET-OBJECT-SET-V1',canonical(targetObjectIds));
    const authorityId=source.path,authorityIdentity=`GIT_BLOB:${source.gitBlob}`;
    const authoritySectionPath=`${source.path}#B${start}:${end}`;
    const core={schemaVersion:'C14-SOURCE-UNIT-V1',authorityId,authorityIdentity,authoritySectionPath,sourceDecisionId,
      sourceUnitId,sourceUnitKind:item.kind,semanticText,targetObjectIds,targetObjectSetSha256,targetCxs};
    const semanticCore={authorityId,authorityIdentity,authoritySectionPath,semanticText,sourceDecisionId,sourceUnitId,
      sourceUnitKind:item.kind,targetCxs,targetObjectSetSha256},sourceSemanticStatement=canonical(semanticCore).trimEnd();
    if([...sourceSemanticStatement].length>1024)fail('SOURCE_SEMANTIC_NSTRING',`${sourceUnitId}:${[...sourceSemanticStatement].length}`);
    const sourceSemanticSha256=domainHash('C14P-SEED-SOURCE-SEMANTIC-V2',canonical(sourceSemanticStatement));
    return {...core,sourceSemanticStatement,sourceSemanticSha256,
      sourceUnitSha256:domainHash('C14-SOURCE-UNIT-V1',canonical(core))};});
  const keys=new Set(),hashes=new Set();for(const unit of units){const key=[unit.authorityIdentity,unit.authoritySectionPath,
    unit.sourceDecisionId,unit.sourceUnitId].join('|');if(keys.has(key)||hashes.has(unit.sourceSemanticSha256))
      fail('SOURCE_UNIT_COLLISION',unit.sourceUnitId);keys.add(key);hashes.add(unit.sourceSemanticSha256);}
  if(units.length!==2134)fail('SOURCE_UNIT_COUNT',String(units.length));return units;
}
function makeSeeds(units) {
  const rank=new Map(UNIT_TYPES.map((kind,index)=>[kind,index]));
  const expanded=units.flatMap(unit=>unit.targetCxs.map(cx=>({unit,cx}))).sort((a,b)=>a.cx.localeCompare(b.cx)||
    rank.get(a.unit.sourceUnitKind)-rank.get(b.unit.sourceUnitKind)||a.unit.sourceDecisionId.localeCompare(b.unit.sourceDecisionId)||
    a.unit.sourceUnitId.localeCompare(b.unit.sourceUnitId)||a.unit.sourceSemanticSha256.localeCompare(b.unit.sourceSemanticSha256));
  if(expanded.length!==2134)fail('SEED_SOURCE_COUNT');const outputIds=expanded.map((_,index)=>`C14O-${String(index+1).padStart(5,'0')}`);
  const seedSources=expanded.map(({unit,cx},index)=>{const seedExpectedOutputs=[...Array(26)].map((_,offset)=>({
      outputId:outputIds[(index+offset)%outputIds.length],relation:offset?'REFERENCES_SHARED':'EMITS'}));
    const core={seedSourceId:`C14SS-${String(index+1).padStart(5,'0')}`,cx,sourceDecisionId:unit.sourceDecisionId,
      sourceUnitId:`${unit.sourceUnitId}#${cx}`,seedClass:unit.sourceUnitKind==='DECISION'?'PROPOSAL_DECISION':unit.sourceUnitKind,
      expectedOwnerObjectId:unit.targetObjectIds.find(id=>id.startsWith('extension:')||unit.targetCxs.includes(cx))||null,
      sourceSemanticStatement:unit.sourceSemanticStatement,sourceSemanticSha256:unit.sourceSemanticSha256,
      sourceLocators:[unit.authoritySectionPath],seedExpectedOutputs};
    return {...core,seedSourceSha256:domainHash('C14P-SEED-SOURCE-SEMANTIC-V2',canonical(core))};});
  const counters=new Map(),csr1=seedSources.map(seed=>{const seedClass=seed.seedClass==='PROPOSAL_DECISION'?'RULE':seed.seedClass;
    const key=`${seed.cx}:${seedClass}`,ordinal=(counters.set(key,(counters.get(key)||0)+1),counters.get(key));
    const core={seedId:`C14S-${seed.cx}-${seedClass}-${String(ordinal).padStart(4,'0')}`,cx:seed.cx,seedClass,
      seedSourceSha256:seed.seedSourceSha256,sourceSemanticSha256:seed.sourceSemanticSha256,sourceUnitId:seed.sourceUnitId,
      sourceLocators:seed.sourceLocators,expectedOwnerObjectId:seed.expectedOwnerObjectId,seedExpectedOutputs:seed.seedExpectedOutputs};
    return {...core,seedRowSha256:domainHash('C14A-SEED-ROW-V1',canonical(core))};});
  const emitted=seedSources.flatMap(seed=>seed.seedExpectedOutputs.filter(x=>x.relation==='EMITS').map(x=>x.outputId));
  if(new Set(emitted).size!==2134||emitted.some(id=>!outputIds.includes(id)))fail('EMITS_BIJECTION');
  return {seedSources,csr1};
}
function makeSlots(csr1) {
  const classBySlot = { OBJ:'OBJECT', ATM:'RULE', BRN:'BRANCH_FAMILY', BDY:'FUNCTION_BODY',
    DEP:'DEPENDENCY', EVT:'TRIGGER_ATTACHMENT', LOC:'LOCATOR' };
  const slots = [];
  for (let number = 1; number <= 13; number += 1) for (const category of SLOT_TYPES) {
    const cx = `CX${String(number).padStart(2, '0')}`;
    const rows = csr1.filter(row => row.cx === cx && row.seedClass === classBySlot[category]);
    const bytes = rows.map(canonical).join('');
    slots.push({slotId:`C14A-${cx}-${category}`,cx,category,rowCount:rows.length,
      byteLength:Buffer.byteLength(bytes),rowsSha256:hash(bytes)});
  }
  const descriptors = slots.map(slot => ({slotId:slot.slotId,rowCount:slot.rowCount,
    byteLength:slot.byteLength,rowsSha256:slot.rowsSha256}));
  const css1 = [...Array(13)].map((_, index) => {
    const cx = `CX${String(index + 1).padStart(2, '0')}`;
    const core = {cx,slotIds:slots.filter(slot => slot.cx === cx).map(slot => slot.slotId)};
    return {...core,css1Sha256:domainHash('C14A-CSS1-V1',canonical(core))};
  });
  if (slots.length !== 91 || descriptors.length !== 91 || css1.length !== 13) fail('SLOT_TOPOLOGY');
  return { slots, descriptors, css1 };
}
function selectedForChild(source, objects, childId) {
  return objects.filter(object => object.attachment.c14Child === childId ||
    (childId.startsWith('C14-33') && object.cx === 'CX12' &&
      (source.cx12Partitions[childId] || []).includes(object.objectOrdinal)) ||
    (childId.startsWith('C14-16') && object.cx === 'CX07' &&
      (source.cx07Partitions[childId] || []).includes(object.objectOrdinal)) ||
    (childId.startsWith('C14-18') && object.cx === 'CX08' &&
      (source.cx08Partitions[childId] || []).includes(object.objectOrdinal)));
}
function makeTopology(input, objects, slots) {
  const source = input.source.rts1b;
  const children = source.children.map(childId => {
    const selected = selectedForChild(source, objects, childId);
    const lineCount = 4 + selected.reduce((sum, object) => sum + object.inventory.lfCount, 0) +
      Math.max(0, selected.length - 1) + 1;
    if (lineCount > 350) fail('P19_CAPACITY', childId);
    return {childId,objectIds:selected.map(object => object.objectId),lineCount};
  });
  const projections = children.map((child, index) => {
    const core = {projectionId:`RTS1B-${String(index + 1).padStart(2, '0')}`,
      childId:child.childId,objectIds:child.objectIds};
    return {...core,projectionSha256:domainHash('C14-RTS1B-PROJECTION-V1',canonical(core))};
  });
  const sourceSets = projections.map(projection => {
    const slotIds = [...new Set(projection.objectIds.flatMap(id => {
      const cx = objects.find(object => object.objectId === id)?.cx;
      return slots.filter(slot => slot.cx === cx).map(slot => slot.slotId);
    }))];
    const core = {projectionId:projection.projectionId,slotIds};
    return {...core,sourceSetSha256:domainHash('C14A-PSS1-V1',canonical(core))};
  });
  const parentBindings = children.filter(child => child.childId.startsWith('C14-33'))
    .map((child, index) => ({rank:index + 1,authority:child.childId,
      identity:hash(canonical(child)),state:'BOUND'}));
  if (projections.length !== 24 || sourceSets.length !== 24 || parentBindings.length !== 9) {
    fail('RTS1B_TOPOLOGY');
  }
  return {children,projections,sourceSets,parentBindings};
}
function makeProfile(input) {
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
    renderingDecisionIds:['RTS00','RTS07','RTS08','RTS12'],cx08SemanticSeal:cx08Seal(input)};
  if (Object.keys(profile).length !== 25) fail('PROFILE_FIELD_COUNT');
  return profile;
}
function makeProposalRoot(input, objects, units, topology, profile, hashes) {
  const ids = input.source.authoritativeInputs.requiredParentIdentities;
  const objectInventory = objects.map(object => ({cx:object.cx,objectId:object.objectId,
    objectOrdinal:object.objectOrdinal,objectSha256:object.objectSha256}));
  const {decisions,rowCountsByKind}=validateSc63Projection(units);
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
    expectedObjectInventory:objectInventory,
    objectInventorySha256:domainHash('C14P-OBJECT-INVENTORY-V2',canonical(objectInventory)),objectCount:169,
    fragmentInventory:objectInventory,
    fragmentInventorySha256:domainHash('C14P-FRAGMENT-INVENTORY-V2',canonical(objectInventory)),fragmentCount:169,
    rowCount:hashes.csr1Count,rowCountsByKind,rowSetSha256:hashes.seedRegistry,
    proposedDecisionInventory:decisions,
    decisionInventorySha256:domainHash('C14P-DECISION-INVENTORY-V2',canonical(decisions)),
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
  if (Object.keys(root).length !== 47) fail('PROPOSAL_ROOT_FIELD_COUNT');
  return root;
}
function makeAuthority(input, topology, profile, proposalRootSha256, hashes, tooling) {
  const ids = input.source.authoritativeInputs.requiredParentIdentities;
  const root = {schemaVersion:'C14A-ROOT-V1-RTS1B',rootId:'C14-CX-AUTHORITY-ROOT-V1-RTS1B',
    proposalBlob:proposalRootSha256.slice(0,40),parentBindings:topology.parentBindings,
    coreDecisionIds:[...Array(19)].map((_,i)=>`P${String(i+1).padStart(2,'0')}`),
    p16Choice:'B',u01Choice:'A',u02Choice:'A',normalizationProfileId:'C14A-NORM-V1',
    seedRegistrySha256:hashes.seedRegistry,childInventorySha256:hashes.childInventory,
    sqlChildSourceSets:topology.sourceSets,children:topology.descriptors,
    renderingTopologyAddendumBlob:ids.RTS,
    renderingTopologyApprovalEvidence:{observationId:5037,verdict:'PASS'},renderingTopologyState:'RTS1B',
    renderingDecisionIds:['RTS00','RTS07','RTS08','RTS12'],renderingProjections:topology.projections,
    renderingSourceSets:topology.sourceSets,renderingTopologySha256:hashes.renderingTopology,
    cx08SemanticSeal:profile.cx08SemanticSeal};
  if (Object.keys(root).length !== 21) fail('AUTHORITY_ROOT_FIELD_COUNT');
  const rootSha256 = domainHash('C14A-ROOT-RTS1B-V1',canonical(root));
  const tupleCore = {schemaVersion:'C14A-AUTHORITY-TUPLE-V1-RTS1B',rootId:root.rootId,
    proposalBlob:root.proposalBlob,parentBindingsSha256:hashes.parentBindings,
    seedRegistrySha256:hashes.seedRegistry,childInventorySha256:hashes.childInventory,
    rootSha256,toolchain:tooling.modules,toolchainSha256:tooling.toolchainSha256,
    candidateStateSha256:tooling.candidateStateSha256,independentReviewEvidence:[]};
  const authorityTuple = {...tupleCore,
    tupleSha256:domainHash('C14A-AUTHORITY-TUPLE-V1-RTS1B',canonical(tupleCore))};
  const envelopeCore = {schemaVersion:'C14A-APPROVAL-ENVELOPE-CANDIDATE-V1',
    tupleSha256:authorityTuple.tupleSha256,toolchain:tooling.modules,toolchainSha256:tooling.toolchainSha256,
    candidateStateSha256:tooling.candidateStateSha256,humanApprovalEvidence:null,approvedAt:null,
    executionAuthority:false};
  const envelope = {...envelopeCore,
    envelopeSha256:domainHash('C14A-APPROVAL-ENVELOPE-CANDIDATE-V1',canonical(envelopeCore))};
  return {authorityRoot:{...root,rootSha256},authorityTuple,envelope};
}
export function buildPackage(input, observation, evidenceClass = 'REAL_APPROVED_OBSERVATION') {
  const tooling=observation.candidateInventory;
  if (!tooling?.toolchainSha256||!tooling?.candidateStateSha256) fail('TOOLCHAIN_IDENTITY_REQUIRED');
  const selectedVersion = selectCatalog(observation);
  const objects = materializedObjects(input, selectedVersion);
  const units = sourceUnits(input,objects);
  const {seedSources,csr1} = makeSeeds(units);
  const slotData = makeSlots(csr1);
  const topology = {...makeTopology(input,objects,slotData.slots),descriptors:slotData.descriptors};
  const hashes = {
    seedRegistry:domainHash('C14A-SEED-REGISTRY-V1',csr1.map(canonical).join('')),
    childInventory:domainHash('C14A-CHILD-INVENTORY-RTS1B-V1',canonical(topology.children)),
    parentBindings:domainHash('C14A-PARENTS-RTS1B-V1',canonical(topology.parentBindings)),
    renderingTopology:domainHash('C14-RENDERING-TOPOLOGY-RTS1B-V1',canonical({
      children:topology.children,projections:topology.projections,sourceSets:topology.sourceSets,
      parentBindings:topology.parentBindings})),csr1Count:csr1.length,
  };
  const profile = makeProfile(input);
  hashes.profile = domainHash('C14P-PROFILE-V2-RTS1B',canonical(profile));
  const root = makeProposalRoot(input,objects,units,topology,profile,hashes);
  const proposalRootSha256 = domainHash('C14P-ROOT-V2-RTS1B',canonical(root));
  const authority = makeAuthority(input,topology,profile,proposalRootSha256,hashes,tooling);
  return {schemaVersion:'C14-PACKAGE-B-RTS1B-V2',evidenceClass,
    candidateInventory:tooling,inputs:{semanticSourceSha256:input.sourceSha256,
      objectBlocksSha256:input.blocksSha256,catalogSnapshotSha256:observation.snapshotSha256,
      toolchainSha256:tooling.toolchainSha256,candidateStateSha256:tooling.candidateStateSha256},
    selectedVersion,objects,sourceUnits:units,
    seedSources,csr1:{rows:csr1,seedRegistrySha256:hashes.seedRegistry},slots:slotData.slots,
    descriptors:slotData.descriptors,css1:slotData.css1,projections:topology.projections,
    pss1:topology.sourceSets,sourceSets:topology.sourceSets,parentBindings:topology.parentBindings,
    profile,childInventory:topology.children,renderingTopologySha256:hashes.renderingTopology,
    proposalRoot:{...root,proposalRootSha256},...authority};
}
function resultRow(values, columns) {
  return {rowOrdinal:1,cells:values.map((value,index)=>({columnOrdinal:index+1,
    columnName:columns[index],isNull:value===null,valueUtf8:value}))};
}
export function syntheticObservation(input, queryArtifacts, contracts, candidateInventory) {
  const rows = [
    [['1','1','postgres','160000','PostgreSQL synthetic','1','synthetic_role','1:1:','2000-01-01T00:00:00.000Z']],
    [['btree_gist','1.7.0','1.7.0']],
    [['btree_gist','1.7.0','t','t','t','t','public','{}']],
    [['btree_gist','1.7.0','public','t','1','synthetic_role',null,null,null]],
    [['t','t','t','t']],
    [['public','gist_text_ops','gist','pg_catalog.text','btree_gist','e']],
  ].map((set,index)=>set.map(values=>resultRow(values,contracts[index].columns)));
  const core = {schemaVersion:'C14C-CATALOG-OBSERVATION-V1',approvalSha256:'0'.repeat(64),
    input:{semanticSourceSha256:input.sourceSha256,objectBlocksSha256:input.blocksSha256},candidateInventory,
    target:{label:'ossum-cor-dev',projectRef:'yywqcdromnmmelijvspi',connectionProfile:candidateInventory.connectionProfile.profile,
      connectionProfileSha256:candidateInventory.connectionProfile.rawSha256,systemIdentifier:'1',databaseOid:'1',databaseName:'postgres',
      serverVersionNum:'160000',
      serverVersion:'PostgreSQL synthetic',currentUserOid:'1',currentUserName:'synthetic_role'},
    transactionMode:'READ_ONLY_REPEATABLE_READ',transactionSnapshotIdentity:'1:1:',
    observedAt:'2000-01-01T00:00:00.000Z',queryArtifacts,queryResults:rows};
  return {...core,snapshotSha256:domainHash('C14C-SYNTHETIC-OBSERVATION-V1',canonical(core)),
    syntheticTestOnly:true};
}
