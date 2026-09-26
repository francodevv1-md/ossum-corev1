import { createHash } from 'node:crypto';
import { assertGeneratorSyntax, deriveGeneratorEvents } from './generate-authority.mjs';
export const EXPECTED={source:'35129309a4336027d72582da4f9bdec054575f1834a5d4ab15c4603a49aab234',
  blocks:'690329046e21fe16ecf5a76bbc915ea4e4257bdba4375edb4d1be3e3566cbe0f'};
export const hash = value => createHash('sha256').update(value).digest('hex');
export function domainHash(domain, value) {
  const bytes=Buffer.isBuffer(value)?value:Buffer.from(value);return hash(Buffer.concat([Buffer.from(domain),Buffer.from([0]),bytes]));
}
export function canonical(value) {
  const controls = { '\\b':'\\u0008', '\\t':'\\u0009', '\\n':'\\u000a',
    '\\f':'\\u000c', '\\r':'\\u000d' };return `${JSON.stringify(value).replace(/(?<!\\)\\[btnfr]/gu,x=>controls[x])}\n`;
}
export function fail(code, detail = '') {
  const error=new Error(detail||code);error.code=code;throw error;}
export function strictText(buffer, name) {
  const value=new TextDecoder('utf-8',{fatal:true}).decode(buffer);
  const bom=buffer[0]===0xef&&buffer[1]===0xbb&&buffer[2]===0xbf;
  const bad=bom||value.includes('\r')||value.includes('\0')||
    value.normalize('NFC') !== value || !value.endsWith('\n') ||
    value.endsWith('\n\n') || /[\t ]+$/mu.test(value);
  if(bad)fail('NON_CANONICAL_BYTES',name);return value;
}
export function exactKeys(value, expected, name) {
  const actual=value&&!Array.isArray(value)&&typeof value==='object'?Object.keys(value):[];
  if(actual.join('\0')!==expected.join('\0'))fail('UNKNOWN_OR_MISSING_FIELDS',name);}
export function lexSql(source) {
  const tokens=[];let offset=0;
  const push=(type,start,end,value=source.slice(start,end))=>tokens.push({type,start,end,value,upper:value.toUpperCase()});
  while (offset < source.length) {
    if (/\s/u.test(source[offset])) { offset += 1; continue; }
    if (source.startsWith('--', offset) || source.startsWith('/*', offset)) fail('SQL_COMMENT');
    const start=offset;
    if (source[offset] === "'") {
      for(offset+=1;offset<source.length;offset+=1){if(source[offset]!=="'")continue;
        if(source[offset+1]==="'"){offset+=1;continue;}offset+=1;break;}
      if(source[offset-1]!=="'")fail('SQL_UNTERMINATED_STRING');push('string',start,offset);continue;
    }
    if (source[offset] === '"') {
      for(offset+=1;offset<source.length;offset+=1){if(source[offset]!=='"')continue;
        if(source[offset+1]==='"'){offset+=1;continue;}offset+=1;break;}
      if(source[offset-1]!=='"')fail('SQL_UNTERMINATED_IDENTIFIER');
      const value=source.slice(start+1,offset-1).replaceAll('""','"');push('identifier',start,offset,value);continue;
    }
    const dollar=source.slice(offset).match(/^\$[a-z_][a-z0-9_]*\$/iu);
    if(dollar){offset+=dollar[0].length;push('delimiter',start,offset);continue;}
    const word=source.slice(offset).match(/^[A-Za-z_][A-Za-z0-9_$]*/u);
    if(word){offset+=word[0].length;push('word',start,offset);continue;}
    const number=source.slice(offset).match(/^\d+(?:\.\d+)?/u);
    if(number){offset+=number[0].length;push('number',start,offset);continue;}
    const operator=['->>','::','<=','>=','<>','!=',':=','||','->'].find(x=>source.startsWith(x,offset));
    if(operator){offset+=operator.length;push('symbol',start,offset);continue;}
    if('(),.;=<>+-*/~[]&|^%:'.includes(source[offset])){offset+=1;push('symbol',start,offset);continue;}
    fail('SQL_UNKNOWN_CHARACTER', `${source[offset]}@${offset}`);
  }
  return tokens;}
export function tokenName(tokens, index) {
  const first=tokens[index];if(!first||!['word','identifier'].includes(first.type))return null;
  if(tokens[index+1]?.value==='.'&&['word','identifier'].includes(tokens[index+2]?.type))
    return {schema:first.value,name:tokens[index+2].value,next:index+3};
  return {schema:null,name:first.value,next:index+1};}
function statementEnd(tokens,start){const index=tokens.findIndex((token,offset)=>offset>start&&token.value===';');
  if(index<0)fail('SQL_STATEMENT_UNTERMINATED');return index;}
function expressionEnd(tokens,start,stops){let depth=0,between=false;
  for (let index=start; index<tokens.length; index+=1) {
    const token=tokens[index];
    if (token.value === '(') depth += 1;
    else if (token.value === ')') { if (!depth) return index; depth -= 1; }
    else if (!depth && token.upper === 'BETWEEN') between = true;
    else if (!depth && token.upper === 'AND' && between) between = false;
    else if (!depth && !between && stops.has(token.upper)) return index;
  }return tokens.length;
}
const owned = (row, name) => (row.parserExpectations.manifestProjection?.[name] || []).filter(entry => {
  if (!Array.isArray(entry)) return [entry.objectId,entry.functionObjectId,entry.triggerObjectId].includes(row.objectId);
  const owner=name==='eventInventory'&&entry.length!==7?entry[0]:entry[1];return owner===row.objectId;
});
function expectedDependencies(row) {
  const projection=row.parserExpectations.manifestProjection||{};
  const global=projection.dependencyInventory||projection.dependencies||[],local=row.objectId.split(':').at(-1);
  const source = row.dependencies.length ? row.dependencies : global.filter(edge => {
    const owner=Array.isArray(edge)?edge[0]:edge.source;return String(owner).split(':').at(-1)===local;
  });
  return [...new Set(source.map(edge => {
    if(!Array.isArray(edge))return `${edge.kind}:${String(edge.target).replace(/^public\.|^function:/u,'')}`;
    const operation = edge.find(value => value === 'READS' || value === 'EXECUTES');
    const operationIndex=edge.indexOf(operation),tagged=['PHYSICAL_RELATION','GENERATED_OBJECT'].includes(edge[operationIndex+1]);
    const target=String(edge[operationIndex+(tagged?2:1)]);return `${operation}:${target.replace(/^public\.|^function:/u,'')}`;
  }))].sort();
}
function unwrap(tokens) {
  let value=tokens;
  while (value[0]?.value === '(' && value.at(-1)?.value === ')') {
    let depth=0,closes=-1;for(let index=0;index<value.length;index+=1){
      depth += value[index].value === '(' ? 1 : value[index].value === ')' ? -1 : 0;
      if(!depth){closes=index;break;}
    }if(closes!==value.length-1)break;value=value.slice(1,-1);
  }
  return value;}
function splitBoolean(tokens, operator) {
  const parts=[];let depth=0,between=false,start=0;
  for(let index=0;index<tokens.length;index+=1){const token=tokens[index];
    depth += token.value === '(' ? 1 : token.value === ')' ? -1 : 0;
    if (!depth && token.upper === 'BETWEEN') between = true;
    else if (!depth && token.upper === 'AND' && between) between = false;
    else if(!depth&&!between&&token.upper===operator){parts.push(tokens.slice(start,index));start=index+1;}
  }if(parts.length)parts.push(tokens.slice(start));return parts;
}
function booleanNode(tokens) {
  const value=unwrap(tokens);
  if (!value.length) fail('BOOLEAN_EMPTY');
  for(const operator of ['OR','AND']){const parts=splitBoolean(value,operator);
    if(parts.length)return {type:operator,children:parts.map(booleanNode)};}
  if (['TRUE','FALSE'].includes(value.at(-1)?.upper) && value.at(-2)?.upper === 'IS') {
    const rawPrefix=value.slice(0,-2),prefix=unwrap(rawPrefix);
    if(prefix.length!==rawPrefix.length||splitBoolean(prefix,'OR').length||splitBoolean(prefix,'AND').length)return booleanNode(prefix);
  }
  const valid = value.some(token => ['=','<>','!=','<','>','<=','>=','~'].includes(token.value) ||
    ['IS','IN','BETWEEN','EXISTS','TRUE','FALSE'].includes(token.upper));
  if (!valid) fail('BOOLEAN_UNKNOWN_SYNTAX',value.map(token=>token.value).join(' '));
  return {type:'ATOM',startByte:value[0].start,endByte:value.at(-1).end};
}
function flatten(node,output=[]){if(node.type==='ATOM')output.push(node);
  else node.children.forEach(child=>flatten(child,output));return output;}
function rootRecord(kind, tokens, source) {
  if (!tokens.length) fail('BOOLEAN_EMPTY',kind);
  const ast=booleanNode(tokens);
  const atoms=flatten(ast).map(atom=>{const expression=source.slice(atom.startByte,atom.endByte);
    const normalized=`${expression.replace(/\s+/gu,' ').trim()}\n`;
    return {...atom,expression:normalized.trim(),rawSha256:hash(expression),
      normalizedSha256:domainHash('C14P-ATOM-NORMALIZED-SQL-V2',normalized)};
  });
  const core = {kind,startByte:tokens[0].start,endByte:tokens.at(-1).end,ast};
  return {...core,rawSha256:hash(source.slice(core.startByte,core.endByte)),
    astSha256:domainHash('C14-BOOLEAN-AST-V1',canonical(core)),atoms};}
function checkTokens(tokens) {
  const at=tokens.findIndex(token=>token.upper==='CHECK');
  if (at < 0 || tokens[at+1]?.value !== '(') return null;
  let depth=0;
  for (let index=at+1; index<tokens.length; index+=1) {
    depth += tokens[index].value === '(' ? 1 : tokens[index].value === ')' ? -1 : 0;
    if(!depth)return tokens.slice(at+2,index);
  }
  fail('CHECK_UNTERMINATED');}
function deriveRoots(tokens, source) {
  const roots=[],stops=new Set(['GROUP','ORDER','HAVING','LIMIT','INTO','RETURNING','THEN','LOOP',';']);
  const add=(kind,part)=>roots.push(rootRecord(kind,part,source));
  for (let index=0; index<tokens.length; index+=1) {
    const token = tokens[index];
    if (['WHERE','HAVING'].includes(token.upper)) {
      const filter=tokens[index-1]?.value==='('&&tokens[index-2]?.upper==='FILTER';
      add(filter?'FILTER_WHERE':token.upper,tokens.slice(index+1,expressionEnd(tokens,index+1,stops)));
    } else if (token.upper === 'ON') {
      const before=tokens.slice(0,index);
      if (before.findLastIndex(item=>item.upper==='JOIN') > before.findLastIndex(item=>item.upper==='TRIGGER')) {
        add('ON',tokens.slice(index+1,expressionEnd(tokens,index+1,new Set([...stops,'JOIN','LEFT','RIGHT','FULL','WHERE']))));
      }
    } else if ((token.upper === 'IF' && tokens[index-1]?.upper !== 'END') || token.upper === 'ELSIF') {
      add(token.upper === 'ELSIF'?'IF':token.upper,
        tokens.slice(index+1,expressionEnd(tokens,index+1,new Set(['THEN']))));
    } else if (token.upper === 'WHEN') {
      const part=tokens.slice(index+1,expressionEnd(tokens,index+1,new Set(['THEN'])));
      if (part.some(item=>['=','<>','!=','<','>','<=','>=','~'].includes(item.value)||
          ['IS','IN','BETWEEN','EXISTS'].includes(item.upper))) add('WHEN',part);
    } else if (token.upper === 'SELECT') {
      const part=tokens.slice(index+1,expressionEnd(tokens,index+1,new Set(['FROM','INTO',';'])));
      const value=unwrap(part);
      if (splitBoolean(value,'OR').length || splitBoolean(value,'AND').length) add('SELECT',part);
    }
  }
  const check=checkTokens(tokens);if(check)add('CHECK',check);
  const unique=new Map(roots.map(root=>[`${root.kind}:${root.startByte}:${root.endByte}`,root]));
  return [...unique.values()].sort((a,b)=>a.startByte-b.startByte || a.endByte-b.endByte);
}
function expectedRoots(row) { return owned(row,'expressionInventory').map(entry => Array.isArray(entry) && entry.length===7 ?
  {id:entry[0],owner:entry[1],startByte:entry[3],endByte:entry[4],atomIds:entry[5],rawSha256:entry[6]} :
  {id:entry[0],owner:entry[1],atomCount:entry[2],sourceSpanId:entry[3]}); }
function expectedAtoms(row) { return owned(row,'atomInventory').map(entry => Array.isArray(entry) ?
  {id:entry[0],owner:entry[1],rootId:entry[2],startByte:entry[4],endByte:entry[5],expression:entry[6],rawSha256:entry[7]} :
  {id:entry.atomId,owner:entry.objectId,ordinal:entry.ordinal,expression:entry.expression}); }
function closeBoolean(row, roots) {
  const expectedRoot=expectedRoots(row),atoms=roots.flatMap(root=>root.atoms),expectedAtom=expectedAtoms(row);
  if (expectedAtom.length && atoms.length !== expectedAtom.length) fail('ATOM_INVENTORY_MISMATCH',row.objectId);
  expectedAtom.forEach((expected,index) => {
    const atom=atoms[index],mismatch=expected.owner!==row.objectId||expected.expression!==atom.expression||
      (expected.startByte !== undefined && (expected.startByte!==atom.startByte || expected.endByte!==atom.endByte ||
      expected.rawSha256!==atom.rawSha256));
    if(mismatch)fail('ATOM_INVENTORY_MISMATCH',`${row.objectId}:${expected.id}`);
    Object.assign(atom,{atomId:expected.id,rootId:expected.rootId||null,ordinal:expected.ordinal||index+1});
  });
  if (expectedRoot.length && roots.length !== expectedRoot.length) fail('ROOT_INVENTORY_MISMATCH',row.objectId);
  expectedRoot.forEach((expected,index) => {
    const root=roots[index],mismatch=expected.owner!==row.objectId||
      (expected.atomCount??expected.atomIds.length)!==root.atoms.length||
      (expected.startByte !== undefined && (expected.startByte!==root.startByte || expected.endByte!==root.endByte ||
      expected.rawSha256!==root.rawSha256));
    if(mismatch)fail('ROOT_INVENTORY_MISMATCH',`${row.objectId}:${expected.id}`);
    if(expected.atomIds&&expected.atomIds.join('|')!==root.atoms.map(atom=>atom.atomId).join('|'))
      fail('ROOT_ATOM_SET_MISMATCH',expected.id);
    Object.assign(root,{rootId:expected.id,sourceSpanId:expected.sourceSpanId || null});
  });
  return atoms.map(({type,...atom})=>atom);}
function statementKind(tokens,source) {
  const words=tokens.map(token=>token.upper);
  if(words[0]==='CREATE'&&words[1]==='FUNCTION')return 'CREATE_TRIGGER_FUNCTION';
  if(words[0]==='CREATE'&&words[1]==='CONSTRAINT'&&words[2]==='TRIGGER')return 'CREATE_CONSTRAINT_TRIGGER';
  if(words[0]==='CREATE'&&words[1]==='TRIGGER')return 'CREATE_TRIGGER';
  if(words[0]==='ALTER'&&words[1]==='TABLE'&&words.includes('EXCLUDE'))return 'ALTER_TABLE_ADD_EXCLUSION';
  if (words[0] === 'ALTER' && words[1] === 'TABLE' && words.includes('CHECK')) {
    const check=tokens.findIndex(token=>token.upper==='CHECK');return source.slice(tokens[check+1].end,tokens[check+2].start).includes('\n')?
      'ALTER_TABLE_ADD_CONSTRAINT':'ALTER_TABLE_ADD_CHECK';
  }
  fail('SQL_UNKNOWN_STATEMENT');}
const literal = token => token?.type === 'string' ? token.value.slice(1,-1).replaceAll("''", "'") : null;
function expectedErrors(row) {
  if (row.category!=='FUNCTION') return [];
  const entries=owned(row,'errorSiteInventory').length?owned(row,'errorSiteInventory'):owned(row,'errorInventory');
  if(!entries.length)return (row.parserExpectations.errors||[]).map(id=>({id,owner:row.objectId,
    triggerIds:[],operations:[],branchToken:id.match(/R\d+/u)?.[0]}));
  return entries.map(entry=>{
    if(!Array.isArray(entry))return {id:entry.errorId,owner:entry.functionObjectId,triggerIds:[entry.triggerObjectId],
      operations:entry.events,family:entry.family,branchToken:entry.branchToken,messageId:entry.messageId};
    if(entry.length>=7)return {id:entry[0],owner:entry[1],triggerIds:[entry[2]],operations:entry[3],
      family:entry[4],branchToken:entry[5],messageId:entry[6]};
    const paths=entry.at(-1);
    return {id:entry[0],owner:entry[1],triggerIds:Array.isArray(paths)?[...new Set(paths.map(x=>x.split('/')[0]))]:[],
      operations:Array.isArray(paths)?paths.map(x=>x.split('/')[1]):[],family:entry.length===6?entry[3]:entry[3],
      branchToken:entry.length===6?entry[2]:entry[4],messageId:entry.length===6?entry[4]:null};
  });}
function deriveErrors(row, tokens, source) {
  const errors=[];
  for (let index=0; index<tokens.length; index+=1) if (tokens[index].upper === 'RAISE') {
    const end=statementEnd(tokens,index),statement=tokens.slice(index,end+1);
    const field=name=>{const at=statement.findIndex(token=>token.upper===name);if(at<0||statement[at+1]?.value!=='=')return null;
      const part=statement.slice(at+2,statement.findIndex((token,cursor)=>cursor>at+1&&token.value===','));
      const value=part.filter(token=>token.type==='string').map(literal).join(''),startByte=part[0].start,endByte=part.at(-1).end;
      return {value,startByte,endByte,rawSha256:hash(source.slice(startByte,endByte))};};
    const sqlstate=field('ERRCODE'),message=field('MESSAGE'),detail=field('DETAIL'),hint=field('HINT');
    const error={startByte:tokens[index].start,endByte:tokens[end].end,sqlstate:sqlstate.value,message:message.value,
      detail:detail.value,hint:hint.value,branchToken:detail.value.match(/branch=([A-Z0-9]+)/u)?.[1],
      family:detail.value.match(/family=([A-Z0-9_]+)/u)?.[1],messageId:hint.value.match(/messageId=([A-Z0-9_]+)/u)?.[1],
      fieldSites:{sqlstate,message,detail,hint}};
    errors.push(error);}
  const expected=expectedErrors(row);
  if (!expected.length) return errors.map((error,index)=>{
    if (error.sqlstate!=='23514'||error.message!=='C14 invariant violation'||!error.branchToken||
        !error.family||!error.messageId) fail('ERROR_UNCLASSIFIED',row.objectId);
    return {...error,errorId:`DERIVED:${row.objectId}:ERR${index+1}`,triggerIds:[],operations:[]};
  });
  if(expected.length!==errors.length)fail('ERROR_INVENTORY_MISMATCH',row.objectId);
  expected.forEach((value,index)=>{const error=errors[index];
    const bad=value.owner!==row.objectId||error.sqlstate!=='23514'||error.message!=='C14 invariant violation'||
      (value.family&&value.family!==error.family) || value.branchToken!==error.branchToken ||
      (value.messageId && value.messageId!==error.messageId);
    if(bad)fail('ERROR_INVENTORY_MISMATCH',`${row.objectId}:${value.id}`);
    Object.assign(error,{errorId:value.id,triggerIds:value.triggerIds,operations:value.operations});
  });
  return errors;}
function actionName(tokens, result) {
  const text=tokens.map(token=>token.upper).join(' ');
  if(/RETURN NEW/u.test(text))return 'RETURN_NEW';if(/RETURN NULL/u.test(text))return 'RETURN_NULL';
  if(/RAISE EXCEPTION/u.test(text))return 'RAISE';if(/:= FALSE/u.test(text))return 'SET_FALSE';
  if(text.includes('SELECT')){
    if(['VERSION_INSERT','LINE_UPDATE_OR_DELETE'].includes(result))return 'SELECT_VISIBLE_LINE';
    if(result.startsWith('CONDITION_'))return 'SELECT_QUERY';
    return result === 'TG_TABLE_NAME_EQ_CAJAS_CONTROL' ? 'SELECT_HEADER_PARENT':'SELECT_LINE_OLD_NEW_PARENTS';
  }
  fail('BRANCH_UNKNOWN_ACTION',text.slice(0,80));}
function conditionName(tokens) {
  const text=tokens.map(token=>token.value).join(' ');
  if(/^v_(?:valid|coherent) IS TRUE$/iu.test(text))return 'IS_TRUE';
  if(/TG_TABLE_NAME = 'cajas_formula_version'.*TG_OP = 'INSERT'/iu.test(text))return 'VERSION_INSERT';
  if(/TG_TABLE_NAME = 'cajas_formula_line'.*TG_OP IN/iu.test(text))return 'LINE_UPDATE_OR_DELETE';
  if(/TG_TABLE_NAME = 'cajas_control'/iu.test(text))return 'TG_TABLE_NAME_EQ_CAJAS_CONTROL';
  return `CONDITION_${hash(text).slice(0,16)}`;
}
function branchBoundary(tokens, start) {
  let nested=0;for(let index=start;index<tokens.length;index+=1){
    if(tokens[index].upper==='IF'&&tokens[index-1]?.upper!=='END')nested+=1;
    if(tokens[index].upper==='END'&&tokens[index+1]?.upper==='IF'){if(!nested)return index;nested-=1;}
    if(!nested&&['ELSIF','ELSE'].includes(tokens[index].upper))return index;
  }fail('IF_UNTERMINATED');
}
function deriveBranches(row,tokens,errors,atoms) {
  const sites=[];for(let index=0;index<tokens.length;index+=1){
    if(tokens[index].upper!=='IF'||tokens[index-1]?.upper==='END')continue;
    let cursor=index;
    while (['IF','ELSIF'].includes(tokens[cursor].upper)) {
      const then=expressionEnd(tokens,cursor+1,new Set(['THEN'])),boundary=branchBoundary(tokens,then+1);
      const condition=tokens.slice(cursor+1,then),result=conditionName(condition),action=tokens.slice(then+1,boundary);
      sites.push({result,outcome:actionName(action,result),startByte:tokens[cursor].start,
        endByte:action.at(-1)?.end || tokens[then].end,conditionStart:condition[0].start,conditionEnd:condition.at(-1).end});
      cursor=boundary;}
    if (tokens[cursor].upper==='ELSE') {
      const boundary=branchBoundary(tokens,cursor+1),action=tokens.slice(cursor+1,boundary),outcome=actionName(action,'ELSE');
      sites.push({result:outcome==='SET_FALSE'?'UNSUPPORTED_CONTEXT':'ELSE',outcome,
        startByte:tokens[cursor].start,endByte:action.at(-1)?.end || tokens[cursor].end});
      cursor=boundary;}index=cursor+1;}
  if (!sites.length && errors.length) sites.push({result:'UNCONDITIONAL',outcome:'RAISE',
    startByte:errors[0].startByte,endByte:errors[0].endByte});
  const manifest=owned(row,'branchInventory');let expected=manifest.map(entry=>Array.isArray(entry)?
    {id:entry[0],owner:entry[1],result:entry[2],outcome:entry[3],errorId:entry[4]}:
    {id:entry.branchId,owner:entry.objectId,result:entry.result,outcome:entry.outcome,
      conditionAtomId:entry.conditionAtomId});
  if (!expected.length && row.parserExpectations.branches?.length) expected=row.parserExpectations.branches.map((id,index)=>{
    const outcome=['RETURN_NEW','RETURN_NULL','RAISE','SET_FALSE'].find(value=>id.endsWith(value));return {
      id:`${row.objectId}:B${index+1}`,owner:row.objectId,result:id.slice(0,-outcome.length-1),outcome,
      errorId:outcome==='RAISE'?errors[0]?.errorId:null};
  });
  expected.forEach(value=>{if(value.outcome==='RAISE'&&!value.errorId)value.errorId=errors[0]?.errorId;});
  if (!expected.length) return sites.map((site,index)=>({...site,
    branchId:`DERIVED:${row.objectId}:${index+1}`,errorId:errors[index]?.errorId||null,conditionAtomId:null}));
  if (manifest.length&&expected.length!==sites.length) fail('BRANCH_INVENTORY_MISMATCH',row.objectId);
  const matched=new Set();
  expected.forEach((value,index)=>{
    const siteIndex=manifest.length?index:sites.findIndex((item,offset)=>!matched.has(offset)&&
      item.result===value.result&&item.outcome===value.outcome);
    if(siteIndex<0)fail('BRANCH_INVENTORY_MISMATCH',`${row.objectId}:${value.id}`);matched.add(siteIndex);
    const site=sites[siteIndex],conditionAtom=site.conditionStart===undefined?
      atoms.find(atom=>atom.atomId===value.conditionAtomId):
      atoms.find(atom=>atom.startByte===site.conditionStart && atom.endByte===site.conditionEnd);
    const error=errors.find(item=>item.startByte>=site.startByte&&item.endByte<=site.endByte);
    if(value.owner!==row.objectId||value.result!==site.result||value.outcome!==site.outcome||
      (value.errorId||null)!==(error?.errorId||null) ||
      (value.conditionAtomId && value.conditionAtomId!==conditionAtom?.atomId)) {
      fail('BRANCH_INVENTORY_MISMATCH',`${row.objectId}:${value.id}`);}
    Object.assign(site,{branchId:value.id,errorId:error?.errorId||null,conditionAtomId:conditionAtom?.atomId||null});
  });
  return sites.map((site,index)=>site.branchId?site:{...site,branchId:`DERIVED:${row.objectId}:${index+1}`,
    errorId:null,conditionAtomId:null});
}
function closeLocators(row,bytes,tokens,kind) {
  const source=bytes.toString('utf8');
  const rawEnd=start=>{const end=source.indexOf(';',start);if(end<0)fail('SQL_STATEMENT_UNTERMINATED');return end+1;};
  const locators=[{kind:'FULL_OBJECT',startByte:0,endByte:bytes.length}],delimiters=tokens.filter(token=>token.type==='delimiter');
  if (delimiters.length===2) locators.push({kind:'FUNCTION_BODY',startByte:delimiters[0].end+2,
    endByte:delimiters[1].start});
  for (let index=0; index<tokens.length; index+=1) {
    if(tokens[index].upper==='SELECT'&&!source.slice(tokens[index].end,tokens[index+1]?.start).includes('\n'))
      locators.push({kind:'QUERY',startByte:tokens[index].start,endByte:rawEnd(tokens[index].start)});
    if(tokens[index].upper==='WITH'&&['BEGIN',';'].includes(tokens[index-1]?.upper||tokens[index-1]?.value)){
      locators.push({kind:'QUERY_WITH',startByte:tokens[index].start,
      endByte:rawEnd(tokens[index].start)});
    }
    if (tokens[index].upper==='RAISE') locators.push({kind:'RAISE',startByte:tokens[index].start,
      endByte:rawEnd(tokens[index].start)});
    if (kind==='CREATE_TRIGGER'&&tokens[index].upper==='EXECUTE'&&tokens[index+1]?.upper==='FUNCTION') locators.push({kind:'EXECUTES',
      startByte:tokens[index].start,endByte:rawEnd(tokens[index].start)});
    if ((tokens[index].upper==='IF'&&tokens[index-1]?.upper!=='END')||tokens[index].upper==='ELSIF') {
      const end=tokens.findIndex((token,offset)=>offset>index&&token.upper==='END'&&tokens[offset+1]?.upper==='IF');
      if(end<0)fail('IF_UNTERMINATED');
      locators.push({kind:'IF_DECISION',startByte:tokens[index].start+(tokens[index].upper==='ELSIF'?3:0),
        endByte:tokens[statementEnd(tokens,end)].end});
    }}
  const check=checkTokens(tokens);
  if (kind==='ALTER_TABLE_ADD_CHECK'&&check) {
    const predicate=check.at(-1)?.upper==='TRUE'&&check.at(-2)?.upper==='IS'?check.slice(0,-2):check;
    const wrapped=predicate[0]?.value==='('&&predicate.at(-1)?.value===')';
    locators.push({kind:'CHECK_PREDICATE',startByte:wrapped?predicate[0].end:predicate[0].start,
      endByte:wrapped?predicate.at(-1).start:predicate.at(-1).end});
  }
  const completed=locators.sort((a,b)=>a.startByte-b.startByte||b.endByte-a.endByte).map(locator=>{
    const slice=bytes.subarray(locator.startByte,locator.endByte);
    const terminated=slice.at(-1)===10?slice:Buffer.concat([slice,Buffer.from('\n')]);
    return {...locator,rawSha256:domainHash('C14A-SOURCE-SPAN-V1',slice),lfTerminatedSha256:hash(terminated)};
  });
  const expected=row.rendering.locators,mismatch=expected.length!==completed.length||expected.some((value,index)=>
    ['kind','startByte','endByte','rawSha256','lfTerminatedSha256'].some(key=>value[key]!==completed[index][key]));
  if (mismatch) fail('LOCATOR_INVENTORY_MISMATCH',row.objectId);
  return completed;
}
export function deriveFragment(row, bytes) {
  const source=strictText(bytes,row.objectId);
  if (!/^[\x00-\x7f]*$/u.test(source)) fail('SQL_NON_ASCII', row.objectId);
  const tokens=lexSql(source),kind=statementKind(tokens,source);assertGeneratorSyntax(row,tokens);
  if (kind!==row.rendering.ast.statementKind) fail('STATEMENT_KIND_MISMATCH',row.objectId);
  const dependencies=[],relations=new Set();
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (['FROM','JOIN'].includes(token.upper)) {
      const relation=tokenName(tokens,index+1);if(relation?.schema==='public')relations.add(relation.name);
    }
  }
  for (const relation of [...relations].sort()) dependencies.push(`READS:${relation}`);
  const execute = tokens.findIndex(token => token.upper === 'EXECUTE');
  if (execute >= 0 && tokens[execute + 1]?.upper === 'FUNCTION') {
    const target=tokenName(tokens,execute+2);if(target?.schema!=='public')fail('UNCLASSIFIED_EXECUTES',row.objectId);
    dependencies.push(`EXECUTES:${target.name}`);
  }
  const derivedDependencies = [...new Set(dependencies)].sort();
  if(JSON.stringify(derivedDependencies)!==JSON.stringify(expectedDependencies(row)))fail('DEPENDENCY_INVENTORY_MISMATCH',row.objectId);
  const events=deriveGeneratorEvents(row,tokens);
  const errors=deriveErrors(row,tokens,source);
  const roots=deriveRoots(tokens,source);
  const atoms=closeBoolean(row,roots);
  const branches=deriveBranches(row,tokens,errors,atoms);
  const locators=closeLocators(row,bytes,tokens,kind);
  return {statementKind:kind,dependencies:derivedDependencies,events,errors,branches,
    roots:roots.map(({atoms:discard,...root})=>root),atoms,atomCount:atoms.length,locators,
    rawSha256:hash(bytes), lfCount:bytes.filter(byte => byte === 10).length };
}
