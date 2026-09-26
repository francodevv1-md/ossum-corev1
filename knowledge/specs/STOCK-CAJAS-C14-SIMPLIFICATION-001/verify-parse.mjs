import { createHash } from 'node:crypto';
import { assertVerifierSyntax, deriveVerifierEvents } from './verify-authority.mjs';
export const SOURCE_SHA = '35129309a4336027d72582da4f9bdec054575f1834a5d4ab15c4603a49aab234';
export const BLOCK_SHA = '690329046e21fe16ecf5a76bbc915ea4e4257bdba4375edb4d1be3e3566cbe0f';
export function vHash(value) { return createHash('sha256').update(value).digest('hex'); }
export function vDomain(domain,value) {
  const payload=Buffer.isBuffer(value)?value:Buffer.from(value);
  return vHash(Buffer.concat([Buffer.from(domain),Buffer.from([0]),payload])); }
export function vCanonical(value) {
  const controls = new Map([['\\b','\\u0008'],['\\t','\\u0009'],['\\n','\\u000a'],
    ['\\f','\\u000c'],['\\r','\\u000d']]);
  return `${JSON.stringify(value).replace(/(?<!\\)\\[btnfr]/gu, token => controls.get(token))}\n`;
}
export function vFail(code, detail = '') {
  const error = new Error(detail || code); error.code = code; throw error;
}
export function vText(buffer, label) {
  const decoded = new TextDecoder('utf-8', { fatal:true }).decode(buffer);
  const hasBom = buffer.subarray(0, 3).equals(Buffer.from([0xef,0xbb,0xbf]));
  const invalid = hasBom || decoded.includes('\r') || decoded.includes('\0') ||
    decoded.normalize('NFC') !== decoded || !decoded.endsWith('\n') ||
    decoded.endsWith('\n\n') || /[\t ]+$/mu.test(decoded);
  if (invalid) vFail('NON_CANONICAL_BYTES', label);
  return decoded;
}
export function vKeys(value, expected, label) {
  if (value === null || Array.isArray(value) || typeof value !== 'object') {
    vFail('UNKNOWN_OR_MISSING_FIELDS', label);
  }
  if (Object.keys(value).join('|') !== expected.join('|')) vFail('UNKNOWN_OR_MISSING_FIELDS', label);
}
function scanSql(source) {
  const result = [];
  let cursor = 0;
  const emit = (kind, begin, end, value = source.slice(begin, end)) => {
    result.push({kind,begin,end,value,keyword:value.toUpperCase()});
  };
  while (cursor < source.length) {
    if (/\s/u.test(source[cursor])) { cursor += 1; continue; }
    if (source.startsWith('--',cursor) || source.startsWith('/*',cursor)) vFail('SQL_COMMENT');
    const begin = cursor;
    if (source[cursor] === "'") {
      cursor += 1;
      while (cursor < source.length) {
        if (source[cursor] !== "'") { cursor += 1; continue; }
        if (source[cursor + 1] === "'") { cursor += 2; continue; }
        cursor += 1; break;
      }
      if (source[cursor - 1] !== "'") vFail('SQL_UNTERMINATED_STRING');
      emit('literal',begin,cursor); continue;
    }
    if (source[cursor] === '"') {
      cursor += 1;
      while (cursor < source.length) {
        if (source[cursor] !== '"') { cursor += 1; continue; }
        if (source[cursor + 1] === '"') { cursor += 2; continue; }
        cursor += 1; break;
      }
      if (source[cursor - 1] !== '"') vFail('SQL_UNTERMINATED_IDENTIFIER');
      const name = source.slice(begin + 1,cursor - 1).replaceAll('""','"');
      emit('name',begin,cursor,name); continue;
    }
    const delimiter = source.slice(cursor).match(/^\$[a-z_][a-z0-9_]*\$/iu);
    if (delimiter) { cursor += delimiter[0].length; emit('delimiter',begin,cursor); continue; }
    const identifier = source.slice(cursor).match(/^[A-Za-z_][A-Za-z0-9_$]*/u);
    if (identifier) { cursor += identifier[0].length; emit('word',begin,cursor); continue; }
    const numeric = source.slice(cursor).match(/^\d+(?:\.\d+)?/u);
    if (numeric) { cursor += numeric[0].length; emit('number',begin,cursor); continue; }
    const paired = ['->>','::','<=','>=','<>','!=',':=','||','->']
      .find(operator => source.startsWith(operator,cursor));
    if (paired) { cursor += paired.length; emit('mark',begin,cursor); continue; }
    if ('(),.;=<>+-*/~[]&|^%:'.includes(source[cursor])) {
      cursor += 1; emit('mark',begin,cursor); continue;
    }
    vFail('SQL_UNKNOWN_CHARACTER',`${source[cursor]}@${cursor}`);
  }
  return result;
}
function qualified(tokens, offset) {
  const first = tokens[offset];
  if (!first || !['word','name'].includes(first.kind)) return null;
  if (tokens[offset + 1]?.value === '.' && ['word','name'].includes(tokens[offset + 2]?.kind)) {
    return {schema:first.value,name:tokens[offset + 2].value};
  }
  return {schema:null,name:first.value};
}
function endStatement(tokens,start){const at=tokens.findIndex((token,index)=>index>start&&token.value===';');
  if(at<0)vFail('SQL_STATEMENT_UNTERMINATED');return at;}
function stopExpression(tokens,start,stops){let level=0,range=false;
  for(let index=start;index<tokens.length;index+=1){const token=tokens[index];
    if(token.value==='(')level+=1;else if(token.value===')'){if(!level)return index;level-=1;}
    else if(!level&&token.keyword==='BETWEEN')range=true;else if(!level&&token.keyword==='AND'&&range)range=false;
    else if(!level&&!range&&stops.has(token.keyword))return index;}return tokens.length;}
const localEntries=(row,name)=>(row.parserExpectations.manifestProjection?.[name]||[]).filter(entry=>{
  if(!Array.isArray(entry))return [entry.objectId,entry.functionObjectId,entry.triggerObjectId].includes(row.objectId);
  return (name==='eventInventory'&&entry.length!==7?entry[0]:entry[1])===row.objectId;});
function sourceEdges(row){const projection=row.parserExpectations.manifestProjection||{};
  const all=projection.dependencyInventory||projection.dependencies||[],suffix=row.objectId.split(':').at(-1);
  const chosen=row.dependencies.length?row.dependencies:all.filter(edge=>String(Array.isArray(edge)?edge[0]:edge.source).split(':').at(-1)===suffix);
  return [...new Set(chosen.map(edge=>{if(!Array.isArray(edge))return `${edge.kind}:${String(edge.target).replace(/^public\.|^function:/u,'')}`;
    const operation=edge.find(value=>['READS','EXECUTES'].includes(value)),at=edge.indexOf(operation);
    const tagged=['PHYSICAL_RELATION','GENERATED_OBJECT'].includes(edge[at+1]);
    return `${operation}:${String(edge[at+(tagged?2:1)]).replace(/^public\.|^function:/u,'')}`;}))].sort();}
function peel(tokens){let result=tokens;while(result[0]?.value==='('&&result.at(-1)?.value===')'){
    let level=0,close=-1;for(let index=0;index<result.length;index+=1){level+=result[index].value==='('?1:result[index].value===')'?-1:0;
      if(!level){close=index;break;}}if(close!==result.length-1)break;result=result.slice(1,-1);}return result;}
function divide(tokens,operator){const output=[];let level=0,range=false,start=0;
  for(let index=0;index<tokens.length;index+=1){const token=tokens[index];level+=token.value==='('?1:token.value===')'?-1:0;
    if(!level&&token.keyword==='BETWEEN')range=true;else if(!level&&token.keyword==='AND'&&range)range=false;
    else if(!level&&!range&&token.keyword===operator){output.push(tokens.slice(start,index));start=index+1;}}
  if(output.length)output.push(tokens.slice(start));return output;}
function parseBoolean(tokens){const value=peel(tokens);if(!value.length)vFail('BOOLEAN_EMPTY');
  for(const operator of ['OR','AND']){const groups=divide(value,operator);if(groups.length)return {type:operator,children:groups.map(parseBoolean)};}
  if(['TRUE','FALSE'].includes(value.at(-1)?.keyword)&&value.at(-2)?.keyword==='IS'){
    const raw=value.slice(0,-2),prefix=peel(raw);if(prefix.length!==raw.length||divide(prefix,'OR').length||divide(prefix,'AND').length)
      return parseBoolean(prefix);}
  if(!value.some(token=>['=','<>','!=','<','>','<=','>=','~'].includes(token.value)||
      ['IS','IN','BETWEEN','EXISTS','TRUE','FALSE'].includes(token.keyword)))vFail('BOOLEAN_UNKNOWN_SYNTAX');
  return {type:'ATOM',startByte:value[0].begin,endByte:value.at(-1).end};}
function leaves(node,list=[]){if(node.type==='ATOM')list.push(node);else for(const child of node.children)leaves(child,list);return list;}
function expressionRoot(kind,tokens,source){if(!tokens.length)vFail('BOOLEAN_EMPTY',kind);const ast=parseBoolean(tokens);
  const atoms=leaves(ast).map(atom=>{const expression=source.slice(atom.startByte,atom.endByte);
    const normalized=`${expression.replace(/\s+/gu,' ').trim()}\n`;return {...atom,expression:normalized.trim(),
      rawSha256:vHash(expression),normalizedSha256:vDomain('C14P-ATOM-NORMALIZED-SQL-V2',normalized)};});
  const core={kind,startByte:tokens[0].begin,endByte:tokens.at(-1).end,ast};return {...core,
    rawSha256:vHash(source.slice(core.startByte,core.endByte)),astSha256:vDomain('C14-BOOLEAN-AST-V1',vCanonical(core)),atoms};}
function checkBody(tokens){const at=tokens.findIndex(token=>token.keyword==='CHECK');if(at<0||tokens[at+1]?.value!=='(')return null;
  let level=0;for(let index=at+1;index<tokens.length;index+=1){level+=tokens[index].value==='('?1:tokens[index].value===')'?-1:0;
    if(!level)return tokens.slice(at+2,index);}vFail('CHECK_UNTERMINATED');}
function discoverRoots(tokens,source){const roots=[],stops=new Set(['GROUP','ORDER','HAVING','LIMIT','INTO','RETURNING','THEN','LOOP',';']);
  const add=(kind,part)=>roots.push(expressionRoot(kind,part,source));
  for(let index=0;index<tokens.length;index+=1){const token=tokens[index];
    if(['WHERE','HAVING'].includes(token.keyword)){const filter=tokens[index-1]?.value==='('&&tokens[index-2]?.keyword==='FILTER';
      add(filter?'FILTER_WHERE':token.keyword,tokens.slice(index+1,stopExpression(tokens,index+1,stops)));}
    else if(token.keyword==='ON'){const before=tokens.slice(0,index);if(before.findLastIndex(x=>x.keyword==='JOIN')>
        before.findLastIndex(x=>x.keyword==='TRIGGER'))add('ON',tokens.slice(index+1,
          stopExpression(tokens,index+1,new Set([...stops,'JOIN','LEFT','RIGHT','FULL','WHERE']))));}
    else if((token.keyword==='IF'&&tokens[index-1]?.keyword!=='END')||token.keyword==='ELSIF')
      add(token.keyword==='ELSIF'?'IF':token.keyword,tokens.slice(index+1,stopExpression(tokens,index+1,new Set(['THEN']))));
    else if(token.keyword==='WHEN'){const part=tokens.slice(index+1,stopExpression(tokens,index+1,new Set(['THEN'])));
      if(part.some(x=>['=','<>','!=','<','>','<=','>=','~'].includes(x.value)||['IS','IN','BETWEEN','EXISTS'].includes(x.keyword)))add('WHEN',part);}
    else if(token.keyword==='SELECT'){const part=tokens.slice(index+1,stopExpression(tokens,index+1,new Set(['FROM','INTO',';']))),flat=peel(part);
      if(divide(flat,'OR').length||divide(flat,'AND').length)add('SELECT',part);}}
  const check=checkBody(tokens);if(check)add('CHECK',check);const map=new Map(roots.map(root=>[`${root.kind}:${root.startByte}:${root.endByte}`,root]));
  return [...map.values()].sort((a,b)=>a.startByte-b.startByte||a.endByte-b.endByte);}
function sourceRoots(row){return localEntries(row,'expressionInventory').map(entry=>entry.length===7?
  {id:entry[0],owner:entry[1],startByte:entry[3],endByte:entry[4],atomIds:entry[5],rawSha256:entry[6]}:
  {id:entry[0],owner:entry[1],atomCount:entry[2],sourceSpanId:entry[3]});}
function sourceAtoms(row){return localEntries(row,'atomInventory').map(entry=>Array.isArray(entry)?
  {id:entry[0],owner:entry[1],rootId:entry[2],startByte:entry[4],endByte:entry[5],expression:entry[6],rawSha256:entry[7]}:
  {id:entry.atomId,owner:entry.objectId,ordinal:entry.ordinal,expression:entry.expression});}
function bindBoolean(row,roots){const expectedRoots=sourceRoots(row),atoms=roots.flatMap(root=>root.atoms),expectedAtoms=sourceAtoms(row);
  if(expectedAtoms.length&&expectedAtoms.length!==atoms.length)vFail('ATOM_INVENTORY_MISMATCH',row.objectId);
  expectedAtoms.forEach((expected,index)=>{const atom=atoms[index];if(expected.owner!==row.objectId||expected.expression!==atom.expression||
      (expected.startByte!==undefined&&(expected.startByte!==atom.startByte||expected.endByte!==atom.endByte||expected.rawSha256!==atom.rawSha256)))
      vFail('ATOM_INVENTORY_MISMATCH',`${row.objectId}:${expected.id}`);
    Object.assign(atom,{atomId:expected.id,rootId:expected.rootId||null,ordinal:expected.ordinal||index+1});});
  if(expectedRoots.length&&expectedRoots.length!==roots.length)vFail('ROOT_INVENTORY_MISMATCH',row.objectId);
  expectedRoots.forEach((expected,index)=>{const root=roots[index];if(expected.owner!==row.objectId||
      (expected.atomCount??expected.atomIds.length)!==root.atoms.length||(expected.startByte!==undefined&&
      (expected.startByte!==root.startByte||expected.endByte!==root.endByte||expected.rawSha256!==root.rawSha256)))
      vFail('ROOT_INVENTORY_MISMATCH',`${row.objectId}:${expected.id}`);
    if(expected.atomIds&&expected.atomIds.join('|')!==root.atoms.map(atom=>atom.atomId).join('|'))vFail('ROOT_ATOM_SET_MISMATCH',expected.id);
    Object.assign(root,{rootId:expected.id,sourceSpanId:expected.sourceSpanId||null});});
  return atoms.map(({type,...atom})=>atom);}
function deriveStatement(tokens,source){const words=tokens.map(token=>token.keyword);
  if(words[0]==='CREATE'&&words[1]==='FUNCTION')return 'CREATE_TRIGGER_FUNCTION';
  if(words[0]==='CREATE'&&words[1]==='CONSTRAINT'&&words[2]==='TRIGGER')return 'CREATE_CONSTRAINT_TRIGGER';
  if(words[0]==='CREATE'&&words[1]==='TRIGGER')return 'CREATE_TRIGGER';
  if(words[0]==='ALTER'&&words[1]==='TABLE'&&words.includes('EXCLUDE'))return 'ALTER_TABLE_ADD_EXCLUSION';
  if(words[0]==='ALTER'&&words[1]==='TABLE'&&words.includes('CHECK')){const at=tokens.findIndex(token=>token.keyword==='CHECK');
    return source.slice(tokens[at+1].end,tokens[at+2].begin).includes('\n')?'ALTER_TABLE_ADD_CONSTRAINT':'ALTER_TABLE_ADD_CHECK';}
  vFail('SQL_UNKNOWN_STATEMENT');}
const sqlLiteral=token=>token?.kind==='literal'?token.value.slice(1,-1).replaceAll("''","'"):null;
function sourceErrors(row){if(row.category!=='FUNCTION')return [];const entries=localEntries(row,'errorSiteInventory').length?
    localEntries(row,'errorSiteInventory'):localEntries(row,'errorInventory');
  if(!entries.length)return (row.parserExpectations.errors||[]).map(id=>({id,owner:row.objectId,
    triggerIds:[],operations:[],branchToken:id.match(/R\d+/u)?.[0]}));
  return entries.map(entry=>{if(!Array.isArray(entry))return {id:entry.errorId,owner:entry.functionObjectId,
      triggerIds:[entry.triggerObjectId],operations:entry.events,family:entry.family,branchToken:entry.branchToken,messageId:entry.messageId};
    if(entry.length>=7)return {id:entry[0],owner:entry[1],triggerIds:[entry[2]],operations:entry[3],family:entry[4],
      branchToken:entry[5],messageId:entry[6]};const paths=entry.at(-1);return {id:entry[0],owner:entry[1],
      triggerIds:Array.isArray(paths)?[...new Set(paths.map(x=>x.split('/')[0]))]:[],operations:Array.isArray(paths)?
      paths.map(x=>x.split('/')[1]):[],family:entry[3],branchToken:entry.length===6?entry[2]:entry[4],
      messageId:entry.length===6?entry[4]:null};});}
function inspectErrors(row,tokens,source){const errors=[];for(let index=0;index<tokens.length;index+=1)if(tokens[index].keyword==='RAISE'){
    const end=endStatement(tokens,index),statement=tokens.slice(index,end+1);const field=name=>{const at=statement.findIndex(x=>x.keyword===name);
      if(at<0||statement[at+1]?.value!=='=')return null;const part=statement.slice(at+2,statement.findIndex((token,cursor)=>
        cursor>at+1&&token.value===',')),value=part.filter(token=>token.kind==='literal').map(sqlLiteral).join('');
      const startByte=part[0].begin,endByte=part.at(-1).end;return {value,startByte,endByte,rawSha256:vHash(source.slice(startByte,endByte))};};
    const sqlstate=field('ERRCODE'),message=field('MESSAGE'),detail=field('DETAIL'),hint=field('HINT');
    errors.push({startByte:tokens[index].begin,endByte:tokens[end].end,sqlstate:sqlstate.value,message:message.value,
      detail:detail.value,hint:hint.value,branchToken:detail.value.match(/branch=([A-Z0-9]+)/u)?.[1],
      family:detail.value.match(/family=([A-Z0-9_]+)/u)?.[1],messageId:hint.value.match(/messageId=([A-Z0-9_]+)/u)?.[1],
      fieldSites:{sqlstate,message,detail,hint}});}
  const expected=sourceErrors(row);if(!expected.length)return errors.map((error,index)=>{if(error.sqlstate!=='23514'||
      error.message!=='C14 invariant violation'||!error.branchToken||!error.family||!error.messageId)vFail('ERROR_UNCLASSIFIED',row.objectId);
    return {...error,errorId:`DERIVED:${row.objectId}:ERR${index+1}`,triggerIds:[],operations:[]};});
  if(expected.length!==errors.length)vFail('ERROR_INVENTORY_MISMATCH',row.objectId);expected.forEach((value,index)=>{const error=errors[index];
    if(value.owner!==row.objectId||error.sqlstate!=='23514'||error.message!=='C14 invariant violation'||
      (value.family&&value.family!==error.family)||value.branchToken!==error.branchToken||(value.messageId&&value.messageId!==error.messageId))
      vFail('ERROR_INVENTORY_MISMATCH',`${row.objectId}:${value.id}`);
    Object.assign(error,{errorId:value.id,triggerIds:value.triggerIds,operations:value.operations});});return errors;}
function classifyCondition(tokens){const text=tokens.map(token=>token.value).join(' ');
  if(/^v_(?:valid|coherent) IS TRUE$/iu.test(text))return 'IS_TRUE';
  if(/TG_TABLE_NAME = 'cajas_formula_version'.*TG_OP = 'INSERT'/iu.test(text))return 'VERSION_INSERT';
  if(/TG_TABLE_NAME = 'cajas_formula_line'.*TG_OP IN/iu.test(text))return 'LINE_UPDATE_OR_DELETE';
  if(/TG_TABLE_NAME = 'cajas_control'/iu.test(text))return 'TG_TABLE_NAME_EQ_CAJAS_CONTROL';return `CONDITION_${vHash(text).slice(0,16)}`;}
function classifyAction(tokens,result){const text=tokens.map(token=>token.keyword).join(' ');
  if(/RETURN NEW/u.test(text))return 'RETURN_NEW';if(/RETURN NULL/u.test(text))return 'RETURN_NULL';
  if(/RAISE EXCEPTION/u.test(text))return 'RAISE';if(/:= FALSE/u.test(text))return 'SET_FALSE';if(text.includes('SELECT')){
    if(['VERSION_INSERT','LINE_UPDATE_OR_DELETE'].includes(result))return 'SELECT_VISIBLE_LINE';if(result.startsWith('CONDITION_'))return 'SELECT_QUERY';
    return result==='TG_TABLE_NAME_EQ_CAJAS_CONTROL'?'SELECT_HEADER_PARENT':'SELECT_LINE_OLD_NEW_PARENTS';}vFail('BRANCH_UNKNOWN_ACTION');}
function nextBranch(tokens,start){let nested=0;for(let index=start;index<tokens.length;index+=1){
    if(tokens[index].keyword==='IF'&&tokens[index-1]?.keyword!=='END')nested+=1;
    if(tokens[index].keyword==='END'&&tokens[index+1]?.keyword==='IF'){if(!nested)return index;nested-=1;}
    if(!nested&&['ELSIF','ELSE'].includes(tokens[index].keyword))return index;}vFail('IF_UNTERMINATED');}
function inspectBranches(row,tokens,errors,atoms){const sites=[];for(let index=0;index<tokens.length;index+=1){
    if(tokens[index].keyword!=='IF'||tokens[index-1]?.keyword==='END')continue;let cursor=index;
    while(['IF','ELSIF'].includes(tokens[cursor].keyword)){const then=stopExpression(tokens,cursor+1,new Set(['THEN']));
      const boundary=nextBranch(tokens,then+1),condition=tokens.slice(cursor+1,then),result=classifyCondition(condition);
      const action=tokens.slice(then+1,boundary);sites.push({result,outcome:classifyAction(action,result),startByte:tokens[cursor].begin,
        endByte:action.at(-1)?.end||tokens[then].end,conditionStart:condition[0].begin,conditionEnd:condition.at(-1).end});cursor=boundary;}
    if(tokens[cursor].keyword==='ELSE'){const boundary=nextBranch(tokens,cursor+1),action=tokens.slice(cursor+1,boundary);
      const outcome=classifyAction(action,'ELSE');sites.push({result:outcome==='SET_FALSE'?'UNSUPPORTED_CONTEXT':'ELSE',outcome,
        startByte:tokens[cursor].begin,endByte:action.at(-1)?.end||tokens[cursor].end});cursor=boundary;}index=cursor+1;}
  if(!sites.length&&errors.length)sites.push({result:'UNCONDITIONAL',outcome:'RAISE',startByte:errors[0].startByte,endByte:errors[0].endByte});
  const manifest=localEntries(row,'branchInventory');let expected=manifest.map(entry=>Array.isArray(entry)?
    {id:entry[0],owner:entry[1],result:entry[2],outcome:entry[3],errorId:entry[4]}:{id:entry.branchId,owner:entry.objectId,
      result:entry.result,outcome:entry.outcome,conditionAtomId:entry.conditionAtomId});
  if(!expected.length&&row.parserExpectations.branches?.length)expected=row.parserExpectations.branches.map((id,index)=>{
    const outcome=['RETURN_NEW','RETURN_NULL','RAISE','SET_FALSE'].find(value=>id.endsWith(value));return {id:`${row.objectId}:B${index+1}`,
      owner:row.objectId,result:id.slice(0,-outcome.length-1),outcome,errorId:outcome==='RAISE'?errors[0]?.errorId:null};});
  expected.forEach(value=>{if(value.outcome==='RAISE'&&!value.errorId)value.errorId=errors[0]?.errorId;});
  if(!expected.length)return sites.map((site,index)=>({...site,branchId:`DERIVED:${row.objectId}:${index+1}`,
    errorId:errors[index]?.errorId||null,conditionAtomId:null}));
  if(manifest.length&&expected.length!==sites.length)vFail('BRANCH_INVENTORY_MISMATCH',row.objectId);const used=new Set();
  expected.forEach((value,index)=>{const at=manifest.length?index:sites.findIndex((site,offset)=>!used.has(offset)&&
      site.result===value.result&&site.outcome===value.outcome);if(at<0)vFail('BRANCH_INVENTORY_MISMATCH',row.objectId);used.add(at);
    const site=sites[at],condition=site.conditionStart===undefined?atoms.find(atom=>atom.atomId===value.conditionAtomId):
      atoms.find(atom=>atom.startByte===site.conditionStart&&atom.endByte===site.conditionEnd);
    const error=errors.find(item=>item.startByte>=site.startByte&&item.endByte<=site.endByte);
    if(value.owner!==row.objectId||value.result!==site.result||value.outcome!==site.outcome||
      (value.errorId||null)!==(error?.errorId||null)||(value.conditionAtomId&&value.conditionAtomId!==condition?.atomId))
      vFail('BRANCH_INVENTORY_MISMATCH',row.objectId);
    Object.assign(site,{branchId:value.id,errorId:error?.errorId||null,conditionAtomId:condition?.atomId||null});});
  return sites.map((site,index)=>site.branchId?site:{...site,branchId:`DERIVED:${row.objectId}:${index+1}`,errorId:null,conditionAtomId:null});}
function verifyLocators(row,bytes,tokens,kind){const source=bytes.toString('utf8');
  const rawEnd=start=>{const at=source.indexOf(';',start);if(at<0)vFail('SQL_STATEMENT_UNTERMINATED');return at+1;};
  const locators=[{kind:'FULL_OBJECT',startByte:0,endByte:bytes.length}],delimiters=tokens.filter(token=>token.kind==='delimiter');
  if(delimiters.length===2)locators.push({kind:'FUNCTION_BODY',startByte:delimiters[0].end+2,endByte:delimiters[1].begin});
  for(let index=0;index<tokens.length;index+=1){const token=tokens[index];
    if(token.keyword==='SELECT'&&!source.slice(token.end,tokens[index+1]?.begin).includes('\n'))
      locators.push({kind:'QUERY',startByte:token.begin,endByte:rawEnd(token.begin)});
    if(token.keyword==='WITH'&&['BEGIN',';'].includes(tokens[index-1]?.keyword||tokens[index-1]?.value))
      locators.push({kind:'QUERY_WITH',startByte:token.begin,endByte:rawEnd(token.begin)});
    if(token.keyword==='RAISE')locators.push({kind:'RAISE',startByte:token.begin,endByte:rawEnd(token.begin)});
    if(kind==='CREATE_TRIGGER'&&token.keyword==='EXECUTE'&&tokens[index+1]?.keyword==='FUNCTION')
      locators.push({kind:'EXECUTES',startByte:token.begin,endByte:rawEnd(token.begin)});
    if((token.keyword==='IF'&&tokens[index-1]?.keyword!=='END')||token.keyword==='ELSIF'){
      const end=tokens.findIndex((value,offset)=>offset>index&&value.keyword==='END'&&tokens[offset+1]?.keyword==='IF');
      if(end<0)vFail('IF_UNTERMINATED');locators.push({kind:'IF_DECISION',startByte:token.begin+(token.keyword==='ELSIF'?3:0),
        endByte:tokens[endStatement(tokens,end)].end});}}
  const check=checkBody(tokens);if(kind==='ALTER_TABLE_ADD_CHECK'&&check){const predicate=check.at(-1)?.keyword==='TRUE'&&
      check.at(-2)?.keyword==='IS'?check.slice(0,-2):check,wrapped=predicate[0]?.value==='('&&predicate.at(-1)?.value===')';
    locators.push({kind:'CHECK_PREDICATE',startByte:wrapped?predicate[0].end:predicate[0].begin,
      endByte:wrapped?predicate.at(-1).begin:predicate.at(-1).end});}
  const completed=locators.sort((a,b)=>a.startByte-b.startByte||b.endByte-a.endByte).map(locator=>{
    const slice=bytes.subarray(locator.startByte,locator.endByte);
    const terminated=slice.at(-1)===10?slice:Buffer.concat([slice,Buffer.from('\n')]);return {...locator,
      rawSha256:vDomain('C14A-SOURCE-SPAN-V1',slice),lfTerminatedSha256:vHash(terminated)};});const expected=row.rendering.locators;
  if(expected.length!==completed.length||expected.some((value,index)=>['kind','startByte','endByte','rawSha256','lfTerminatedSha256']
    .some(key=>value[key]!==completed[index][key])))vFail('LOCATOR_INVENTORY_MISMATCH',row.objectId);return completed;}
export function independentlyParse(row,bytes){const source=vText(bytes,row.objectId);if(!/^[\x00-\x7f]*$/u.test(source))vFail('SQL_NON_ASCII',row.objectId);
  const tokens=scanSql(source),kind=deriveStatement(tokens,source);assertVerifierSyntax(row,tokens);
  if(kind!==row.rendering.ast.statementKind)vFail('STATEMENT_KIND_MISMATCH',row.objectId);
  const dependencies=[],relations=new Set();for(let index=0;index<tokens.length;index+=1)if(['FROM','JOIN'].includes(tokens[index].keyword)){
    const relation=qualified(tokens,index+1);if(relation?.schema==='public')relations.add(relation.name);}
  for(const relation of [...relations].sort())dependencies.push(`READS:${relation}`);const execute=tokens.findIndex(token=>token.keyword==='EXECUTE');
  if(execute>=0&&tokens[execute+1]?.keyword==='FUNCTION'){const target=qualified(tokens,execute+2);if(target?.schema!=='public')
    vFail('UNCLASSIFIED_EXECUTES',row.objectId);dependencies.push(`EXECUTES:${target.name}`);}const edges=[...new Set(dependencies)].sort();
  if(JSON.stringify(edges)!==JSON.stringify(sourceEdges(row)))vFail('DEPENDENCY_INVENTORY_MISMATCH',row.objectId);
  const events=deriveVerifierEvents(row,tokens),errors=inspectErrors(row,tokens,source),roots=discoverRoots(tokens,source),atoms=bindBoolean(row,roots);
  const branches=inspectBranches(row,tokens,errors,atoms),locators=verifyLocators(row,bytes,tokens,kind);
  return {statementKind:kind,dependencies:edges,events,errors,branches,roots:roots.map(({atoms:discard,...root})=>root),
    atoms,atomCount:atoms.length,locators,rawSha256:vHash(bytes),lfCount:bytes.filter(byte=>byte===10).length};}
export function independentlyValidateQuery(sql, index, ids, contracts) {
  vText(Buffer.from(sql),ids[index]);
  const tokens = scanSql(sql);
  if (tokens[0]?.keyword !== 'SELECT' || tokens.filter(token => token.value === ';').length !== 1) {
    vFail('QUERY_STATEMENT_COUNT',ids[index]);
  }
  const forbidden = new Set(['INSERT','UPDATE','DELETE','MERGE','CREATE','ALTER','DROP','TRUNCATE',
    'COPY','CALL','DO','GRANT','REVOKE','LOCK','WITH','INTO','TEMP','EXECUTE']);
  if (tokens.some(token => forbidden.has(token.keyword))) vFail('QUERY_FORBIDDEN_TOKEN',ids[index]);
  const relations = [];
  for (let offset=0; offset<tokens.length; offset+=1) {
    if (!['FROM','JOIN'].includes(tokens[offset].keyword)) continue;
    const relation = qualified(tokens,offset+1);
    if (relation?.schema !== 'pg_catalog') vFail('QUERY_UNQUALIFIED_RELATION',ids[index]);
    relations.push(relation.name);
  }
  if (relations.some(name=>!contracts[index].relations.includes(name)) ||
      contracts[index].relations.some(name=>!relations.includes(name))) vFail('QUERY_RELATION_SET',ids[index]);
}
