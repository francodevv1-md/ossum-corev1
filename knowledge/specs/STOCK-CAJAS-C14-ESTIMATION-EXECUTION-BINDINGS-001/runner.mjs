import assert from 'node:assert/strict';
import { execFile as execFileCallback, execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { constants as fsConstants, closeSync, existsSync, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync, readdirSync, realpathSync, renameSync, statSync, writeFileSync, writeSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { hostname } from 'node:os';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFile = promisify(execFileCallback);
const HERE = dirname(fileURLToPath(import.meta.url));
const BINDINGS = join(HERE, 'bindings');
const HASH_FILE = join(HERE, 'hashes.sha256');
const EXPECTED_FILES = ['CHANGE_PACK.md', 'bindings/commands.json', 'bindings/cx-catalog.json', 'bindings/cx-occurrences.jsonl', 'bindings/cx-vectors.jsonl', 'bindings/evidence-layout.json', 'bindings/isolation.json', 'bindings/projection-manifest.jsonl', 'bindings/toolchain.json', 'runner.mjs', 'runner.test.mjs'];
const STAGES = Object.freeze({ S12: 12, S13: 13, S14: 14, S15: 15, S16: 16, S17: 17, S18: 18, S19: 19, S20: 20, S21: 21 });
const JSON_OPTIONS = Object.freeze({ encoding: 'utf8' });
const FSUTIL = 'C:\\Windows\\System32\\fsutil.exe';
export const PARSER_SELF_TEST_CASE_IDS = Object.freeze(['prisma-nested-comments', 'prisma-malformed-source', 'projection-excluded-inverse', 'projection-retained-target', 'sql-safe-create-table', 'sql-standard-function-blocked', 'sql-escaped-function-blocked', 'sql-dollar-procedure-blocked', 'sql-trigger-blocked', 'sql-line-classes', 'sql-no-op-evidence', 'prisma-semantic-identity']);

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

export function normalizeDeclaration(value, trimIndent = false) {
  const lines = String(value).replace(/\r\n?/g, '\n').split('\n').map((line) => line.replace(/[\t ]+$/u, ''));
  while (lines.length && lines[0] === '') lines.shift();
  while (lines.length && lines.at(-1) === '') lines.pop();
  if (trimIndent && lines.length) {
    const indent = lines[0].match(/^[\t ]*/u)?.[0].length ?? 0;
    for (let i = 0; i < lines.length; i += 1) lines[i] = lines[i].slice(Math.min(indent, lines[i].match(/^[\t ]*/u)?.[0].length ?? 0));
  }
  return `${lines.join('\n')}\n`;
}

function fail(message) { throw new Error(message); }
function isIdStart(ch) { return /[A-Za-z_]/u.test(ch); }
function isId(ch) { return /[A-Za-z0-9_]/u.test(ch); }
function skipSpace(code, i) { while (i < code.length && /\s/u.test(code[i])) i += 1; return i; }
function readIdentifier(code, i) {
  if (!isIdStart(code[i] ?? '')) return null;
  let end = i + 1;
  while (end < code.length && isId(code[end])) end += 1;
  return { end, start: i, value: code.slice(i, end) };
}

/** Masks comments and quoted content without changing offsets or newlines. */
export function maskPrismaSource(source) {
  const text = String(source).replace(/\r\n?/g, '\n');
  const out = [...text];
  let i = 0;
  let blockDepth = 0;
  let state = 'code';
  while (i < text.length) {
    const a = text[i];
    const b = text[i + 1];
    if (state === 'line') {
      if (a === '\n') state = 'code'; else out[i] = ' ';
      i += 1; continue;
    }
    if (state === 'block') {
      if (a === '/' && b === '*') { out[i] = out[i + 1] = ' '; blockDepth += 1; i += 2; continue; }
      if (a === '*' && b === '/') { out[i] = out[i + 1] = ' '; blockDepth -= 1; i += 2; if (!blockDepth) state = 'code'; continue; }
      if (a !== '\n') out[i] = ' ';
      i += 1; continue;
    }
    if (state === 'string') {
      if (a === '\\') { out[i] = ' '; if (i + 1 < text.length) out[i + 1] = text[i + 1] === '\n' ? '\n' : ' '; i += 2; continue; }
      if (a === '"') { out[i] = ' '; state = 'code'; i += 1; continue; }
      if (a === '\n') fail('Unterminated Prisma string');
      out[i] = ' '; i += 1; continue;
    }
    if (a === '/' && b === '/') { out[i] = out[i + 1] = ' '; state = 'line'; i += 2; continue; }
    if (a === '/' && b === '*') { out[i] = out[i + 1] = ' '; state = 'block'; blockDepth = 1; i += 2; continue; }
    if (a === '"') { out[i] = ' '; state = 'string'; i += 1; continue; }
    i += 1;
  }
  if (state === 'block') fail('Unterminated Prisma block comment');
  if (state === 'string') fail('Unterminated Prisma string');
  return { code: out.join(''), text };
}

function parseModelFields(declaration, source) {
  if (declaration.kind !== 'model' && declaration.kind !== 'type' && declaration.kind !== 'view') return [];
  const bodyStart = declaration.open + 1;
  const bodyEnd = declaration.end - 1;
  const { code } = maskPrismaSource(source.slice(bodyStart, bodyEnd));
  const fields = [];
  const names = new Set();
  let offset = 0;
  for (const line of code.split('\n')) {
    const nonspace = line.search(/\S/u);
    if (nonspace >= 0 && line[nonspace] !== '@') {
      const first = readIdentifier(line, nonspace);
      const secondAt = first ? skipSpace(line, first.end) : -1;
      const second = first ? readIdentifier(line, secondAt) : null;
      if (first && second) {
        if (names.has(first.value)) fail(`Duplicate field ${declaration.name}.${first.value}`);
        names.add(first.value);
        const rawStart = bodyStart + offset;
        const rawEnd = Math.min(bodyEnd, rawStart + line.length + 1);
        fields.push({ name: first.value, type: second.value + (line.slice(second.end).match(/^([?]|\[\])/u)?.[1] ?? ''), start: rawStart, end: rawEnd, source: source.slice(rawStart, rawEnd) });
      }
    }
    offset += line.length + 1;
  }
  return fields;
}

export function parsePrisma(source) {
  const { code, text } = maskPrismaSource(source);
  const allowed = new Set(['generator', 'datasource', 'model', 'enum', 'type', 'view']);
  const declarations = [];
  const names = new Set();
  let i = 0;
  while ((i = skipSpace(code, i)) < code.length) {
    const keyword = readIdentifier(code, i);
    if (!keyword || !allowed.has(keyword.value)) fail(`Unknown top-level Prisma declaration at offset ${i}`);
    i = skipSpace(code, keyword.end);
    const name = readIdentifier(code, i);
    if (!name) fail(`Missing ${keyword.value} declaration name at offset ${i}`);
    const key = `${keyword.value}:${name.value}`;
    if (names.has(key)) fail(`Duplicate top-level declaration ${key}`);
    names.add(key);
    i = skipSpace(code, name.end);
    if (code[i] !== '{') fail(`Missing opening brace for ${key}`);
    const open = i;
    let depth = 1;
    i += 1;
    while (i < code.length && depth) {
      if (code[i] === '{') depth += 1;
      else if (code[i] === '}') depth -= 1;
      i += 1;
    }
    if (depth) fail(`Unbalanced braces for ${key}`);
    let end = i;
    while (end < code.length && (code[end] === ' ' || code[end] === '\t')) end += 1;
    if (code[end] === '\n') end += 1;
    const declaration = { kind: keyword.value, name: name.value, start: keyword.start, open, end, source: text.slice(keyword.start, end) };
    declaration.fields = parseModelFields(declaration, text);
    declarations.push(declaration);
    i = end;
  }
  for (let n = 1; n < declarations.length; n += 1) if (declarations[n - 1].end > declarations[n].start) fail('Overlapping Prisma declaration spans');
  return { declarations, source: text };
}

export function loadJsonl(text) {
  return String(text).split(/\r?\n/u).filter(Boolean).map((line, index) => {
    try { return JSON.parse(line); } catch (error) { fail(`Invalid JSONL row ${index + 1}: ${error.message}`); }
  });
}

export function verifyManifestAgainstS00(s00, rows) {
  const parsed = parsePrisma(s00);
  const models = rows.filter((r) => r.kind === 'model');
  const enums = rows.filter((r) => r.kind === 'enum');
  const inverses = rows.filter((r) => r.kind === 'inverse');
  assert.equal(models.length, 32); assert.equal(enums.length, 14); assert.equal(inverses.length, 57);
  const findDeclaration = (kind, name) => parsed.declarations.find((d) => d.kind === kind && d.name === name) ?? fail(`Missing S00 ${kind} ${name}`);
  for (const row of [...models, ...enums]) {
    const declaration = findDeclaration(row.kind, row.name);
    assert.equal(sha256(normalizeDeclaration(declaration.source)), row.sha256, `S00 hash drift ${row.kind} ${row.name}`);
  }
  for (const row of inverses) {
    const field = findDeclaration('model', row.owner).fields.find((f) => f.name === row.field) ?? fail(`Missing S00 inverse ${row.owner}.${row.field}`);
    assert.equal(field.type, row.type, `S00 inverse type drift ${row.owner}.${row.field}`);
    assert.equal(sha256(normalizeDeclaration(field.source, true)), row.sha256, `S00 inverse hash drift ${row.owner}.${row.field}`);
  }
  return { enums: enums.length, inverses: inverses.length, models: models.length };
}

export function canonicalPrismaFieldHash(source) {
  const normalized = normalizeDeclaration(source, true).trim();
  let output = ''; let quoted = false; let escaped = false; let pendingSpace = false;
  for (const char of normalized) {
    if (quoted) {
      output += char;
      if (escaped) escaped = false; else if (char === '\\') escaped = true; else if (char === '"') quoted = false;
    } else if (char === '"') { if (pendingSpace && output) output += ' '; pendingSpace = false; quoted = true; output += char; }
    else if (/\s/u.test(char)) pendingSpace = true;
    else { if (pendingSpace && output) output += ' '; pendingSpace = false; output += char; }
  }
  return sha256(`${output}\n`);
}

export function prepareProjectionRows(s00, rows, { verifyManifest = true } = {}) {
  if (verifyManifest) verifyManifestAgainstS00(s00, rows);
  const parsed = parsePrisma(s00);
  return rows.map((row) => {
    if (row.kind !== 'inverse') return row;
    const owner = parsed.declarations.find((declaration) => declaration.kind === 'model' && declaration.name === row.owner);
    const field = owner?.fields.find((candidate) => candidate.name === row.field) ?? fail(`Missing S00 inverse ${row.owner}.${row.field}`);
    return { ...row, removalCanonicalSha256: canonicalPrismaFieldHash(field.source) };
  });
}

export function prismaSemanticSha256(source) {
  const declarations = parsePrisma(source).declarations.map((declaration) => ({ kind: declaration.kind, name: declaration.name, sha256: sha256(normalizeDeclaration(declaration.source)) }));
  return sha256(canonicalJson(declarations));
}

function stageNumber(stage) { return stage == null ? Number.POSITIVE_INFINITY : STAGES[stage] ?? fail(`Unknown stage ${stage}`); }
function spliceOut(source, spans) {
  let output = source;
  for (const span of [...spans].sort((a, b) => b.start - a.start)) output = output.slice(0, span.start) + output.slice(span.end);
  return output;
}

export function projectSnapshot(source, snapshotNumber, rows, { includeEvidence = false } = {}) {
  if (!Number.isInteger(snapshotNumber) || snapshotNumber < 0 || snapshotNumber > 24) fail('Snapshot number must be 0..24');
  const parsed = parsePrisma(source);
  const modelRows = rows.filter((r) => r.kind === 'model');
  const enumRows = rows.filter((r) => r.kind === 'enum');
  const inverseRows = rows.filter((r) => r.kind === 'inverse');
  const retained = new Set(modelRows.filter((r) => r.disposition === 'accepted' && stageNumber(r.acceptedFrom) <= snapshotNumber).map((r) => r.name));
  const spans = [];
  const inverseRemovals = [];
  const exclusions = [];
  const declarationMap = new Map(parsed.declarations.map((d) => [`${d.kind}:${d.name}`, d]));
  for (const row of modelRows) {
    const declaration = declarationMap.get(`model:${row.name}`);
    if (declaration && !retained.has(row.name)) { spans.push(declaration); exclusions.push(`model:${row.name}`); }
    if (!declaration && retained.has(row.name)) fail(`Retained model absent: ${row.name}`);
  }
  for (const row of inverseRows) {
    const owner = declarationMap.get(`model:${row.owner}`) ?? fail(`Inverse owner absent: ${row.owner}`);
    const field = owner.fields.find((candidate) => candidate.name === row.field);
    if (field && !retained.has(row.target)) {
      if (field.type !== row.type) fail(`Inverse type drift ${row.owner}.${row.field}`);
      const rawMatches = sha256(normalizeDeclaration(field.source, true)) === row.sha256;
      const canonicalMatches = row.removalCanonicalSha256 && canonicalPrismaFieldHash(field.source) === row.removalCanonicalSha256;
      if (!rawMatches && !canonicalMatches) fail(`Inverse hash drift ${row.owner}.${row.field}`);
      spans.push(field); inverseRemovals.push(`${row.owner}.${row.field}`);
    }
  }
  const referencedEnums = new Set();
  for (const declaration of parsed.declarations.filter((d) => d.kind === 'model' && (!modelRows.some((r) => r.name === d.name) || retained.has(d.name)))) {
    for (const field of declaration.fields) referencedEnums.add(field.type.replace(/\[\]|\?/gu, ''));
  }
  for (const row of enumRows) {
    const declaration = declarationMap.get(`enum:${row.name}`);
    const include = row.disposition === 'referenced' && referencedEnums.has(row.name);
    if (declaration && !include) { spans.push(declaration); exclusions.push(`enum:${row.name}`); }
    if (!declaration && include) fail(`Referenced enum absent: ${row.name}`);
  }
  const result = normalizeDeclaration(spliceOut(parsed.source, spans));
  const projected = parsePrisma(result);
  const forbidden = projected.declarations.filter((d) => (d.kind === 'model' || d.kind === 'enum') && ((modelRows.some((r) => r.name === d.name) && !retained.has(d.name)) || enumRows.some((r) => r.name === d.name && r.disposition === 'never')));
  if (forbidden.length) fail(`Projection retained forbidden identities: ${forbidden.map((d) => d.name).join(',')}`);
  if (snapshotNumber === 0 && projected.declarations.some((d) => /^(Stock|Cajas)/u.test(d.name))) fail('P00 contains projected Stock/Cajas identity');
  const evidence = { enumReferences: [...referencedEnums].filter((name) => enumRows.some((row) => row.name === name)).sort(), exclusions: exclusions.sort(), inverseRemovals: inverseRemovals.sort(), retainedStageSet: [...retained].sort() };
  return includeEvidence ? { evidence, source: result } : result;
}

export function lexPostgres(buffer, { enforceOperationPolicy = true } = {}) {
  const bytes = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  if (bytes.includes(0) || bytes.includes(13)) fail('SQL contains NUL or CR bytes');
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  const tokens = [];
  const comments = [];
  let statementStart = 0;
  let i = 0;
  let blockDepth = 0;
  const push = (type, start, end) => tokens.push({ type, value: text.slice(start, end), start, end });
  while (i < text.length) {
    const start = i;
    if (/\s/u.test(text[i])) { while (i < text.length && /\s/u.test(text[i])) i += 1; continue; }
    if (text.startsWith('--', i)) { i = text.indexOf('\n', i); if (i < 0) i = text.length; comments.push({ start, end: i }); continue; }
    if (text.startsWith('/*', i)) {
      blockDepth = 1; i += 2;
      while (i < text.length && blockDepth) { if (text.startsWith('/*', i)) { blockDepth += 1; i += 2; } else if (text.startsWith('*/', i)) { blockDepth -= 1; i += 2; } else i += 1; }
      if (blockDepth) fail('Unterminated SQL block comment'); comments.push({ start, end: i }); continue;
    }
    const escaped = (text[i] === 'E' || text[i] === 'e') && text[i + 1] === "'";
    if (text[i] === "'" || escaped) {
      if (escaped) i += 1;
      i += 1;
      while (i < text.length) {
        if (text[i] === "'" && text[i + 1] === "'") { i += 2; continue; }
        if (escaped && text[i] === '\\') { i += 2; continue; }
        if (text[i] === "'") { i += 1; break; }
        i += 1;
      }
      if (text[i - 1] !== "'") fail('Unterminated SQL string'); push('string', start, i); continue;
    }
    if (text[i] === '"') {
      i += 1;
      while (i < text.length) { if (text[i] === '"' && text[i + 1] === '"') i += 2; else if (text[i] === '"') { i += 1; break; } else i += 1; }
      if (text[i - 1] !== '"') fail('Unterminated quoted identifier'); push('identifier', start, i); continue;
    }
    if (text[i] === '$') {
      const match = text.slice(i).match(/^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/u);
      if (match) { const tag = match[0]; i += tag.length; const end = text.indexOf(tag, i); if (end < 0) fail('Unterminated dollar quote'); i = end + tag.length; push('dollar', start, i); continue; }
    }
    if (text[i] === ';') { push('semicolon', i, i + 1); i += 1; continue; }
    if (isIdStart(text[i])) { i += 1; while (i < text.length && isId(text[i])) i += 1; push('word', start, i); continue; }
    if (/[0-9]/u.test(text[i])) { i += 1; while (i < text.length && /[0-9.eE+-]/u.test(text[i])) i += 1; push('number', start, i); continue; }
    i += 1; push('operator', start, i);
  }
  const statements = [];
  let group = [];
  for (const token of tokens) {
    group.push(token);
    if (token.type === 'semicolon') { statements.push(enforceOperationPolicy ? classifyStatement(text, group, statementStart, token.end) : { end: token.end, sha256: sha256(Buffer.from(text.slice(statementStart, token.end))), start: statementStart }); statementStart = token.end; group = []; }
  }
  if (group.length) fail('SQL semantic statement lacks terminating semicolon');
  const lineSpans = [];
  let lineStart = 0;
  for (let cursor = 0; cursor <= text.length; cursor += 1) if (cursor === text.length || text[cursor] === '\n') { if (cursor > lineStart || cursor < text.length) lineSpans.push({ start: lineStart, end: cursor }); lineStart = cursor + 1; }
  const lineCounts = { blank: 0, code: 0, comment: 0 };
  for (const line of lineSpans) {
    const raw = text.slice(line.start, line.end);
    const hasCode = tokens.some((token) => token.start < line.end && token.end > line.start);
    const hasComment = comments.some((comment) => comment.start < line.end && comment.end > line.start);
    if (hasCode) lineCounts.code += 1; else if (hasComment) lineCounts.comment += 1; else if (/^\s*$/u.test(raw)) lineCounts.blank += 1; else fail('Unclassified SQL physical line');
  }
  return { comments, lineCounts, physicalLines: lineSpans.length, rawBytes: bytes.length, rawSha256: sha256(bytes), statements, tokens };
}

function classifyStatement(source, tokens, start, end) {
  const words = tokens.filter((t) => t.type === 'word').map((t) => t.value.toUpperCase());
  const joined = words.join(' ');
  let category = 'OTHER';
  if (words[0] === 'CREATE' && words[1] === 'EXTENSION') category = 'CREATE_EXTENSION';
  else if (words[0] === 'CREATE' && words[1] === 'TYPE' && words.includes('ENUM')) category = 'CREATE_ENUM';
  else if (words[0] === 'ALTER' && words[1] === 'TYPE') category = 'ALTER_ENUM';
  else if (words[0] === 'CREATE' && words[1] === 'TABLE') category = 'CREATE_TABLE';
  else if (words[0] === 'ALTER' && words[1] === 'TABLE' && words.includes('ADD') && words.includes('COLUMN')) category = 'ALTER_TABLE_ADD_COLUMN';
  else if (words[0] === 'ALTER' && words[1] === 'TABLE' && words.includes('ALTER') && words.includes('COLUMN')) category = 'ALTER_TABLE_ALTER_COLUMN';
  else if (words[0] === 'ALTER' && words[1] === 'TABLE' && words.includes('ADD') && words.includes('CONSTRAINT')) category = 'ALTER_TABLE_ADD_CONSTRAINT';
  else if (words[0] === 'CREATE' && words.includes('UNIQUE') && words.includes('INDEX')) category = 'CREATE_UNIQUE_INDEX';
  else if (words[0] === 'CREATE' && words.includes('INDEX')) category = 'CREATE_INDEX';
  else if (words[0] === 'CREATE' && words.includes('CONSTRAINT') && words.includes('TRIGGER')) category = 'CREATE_CONSTRAINT_TRIGGER';
  else if (words[0] === 'CREATE' && words.includes('TRIGGER')) category = 'CREATE_TRIGGER';
  else if (words[0] === 'CREATE' && words.includes('FUNCTION')) category = 'CREATE_FUNCTION';
  else if (words[0] === 'CREATE' && words.includes('PROCEDURE')) category = 'CREATE_PROCEDURE';
  else if (words[0] === 'COMMENT') category = 'COMMENT';
  else if (['BEGIN', 'COMMIT', 'ROLLBACK'].includes(words[0])) category = 'TRANSACTION';
  else if (words[0] === 'DROP' || words.includes('DROP')) category = 'DROP';
  const destructiveWords = new Set(['DROP', 'TRUNCATE', 'DELETE', 'UPDATE', 'INSERT', 'MERGE', 'RENAME']);
  const procedural = new Set(['CREATE_FUNCTION', 'CREATE_PROCEDURE', 'CREATE_TRIGGER', 'CREATE_CONSTRAINT_TRIGGER']).has(category) || words[0] === 'DO';
  const destructive = words.some((word) => destructiveWords.has(word)) || procedural || tokens.some((t) => t.type === 'dollar');
  if (category === 'OTHER' || destructive) fail(`Blocked SQL operation ${category}: ${joined.slice(0, 160)}`);
  const identifiers = tokens.filter((token) => token.type === 'identifier' || token.type === 'word').map((token) => token.value.replace(/^"|"$/gu, '').replace(/""/gu, '"'));
  const keywords = new Set(['CREATE', 'ALTER', 'TABLE', 'TYPE', 'ENUM', 'EXTENSION', 'INDEX', 'UNIQUE', 'ADD', 'COLUMN', 'CONSTRAINT', 'COMMENT', 'ON', 'IS', 'BEGIN', 'COMMIT', 'ROLLBACK', 'IF', 'NOT', 'EXISTS']);
  const affectedIdentifiers = [...new Set(identifiers.filter((value) => !keywords.has(value.toUpperCase())))];
  const operationVerb = category.split('_').slice(0, category.startsWith('ALTER_TABLE') ? 3 : 2).join(' ');
  return { affectedIdentifiers, category, destructive, end, operationVerb, sha256: sha256(Buffer.from(source.slice(start, end))), start };
}

export function buildNoOpEvidence(analysis, previousProjection, currentProjection) {
  const previous = Buffer.isBuffer(previousProjection) ? previousProjection : Buffer.from(previousProjection);
  const current = Buffer.isBuffer(currentProjection) ? currentProjection : Buffer.from(currentProjection);
  return Object.freeze({ commentSpans: analysis.comments, lineCounts: analysis.lineCounts, projectionByteIdentical: previous.equals(current), previousProjectionSha256: sha256(previous), currentProjectionSha256: sha256(current), rawBytes: analysis.rawBytes, rawSha256: analysis.rawSha256, semanticStatements: analysis.statements.length, statementSpans: analysis.statements.map(({ start, end, sha256: hash }) => ({ end, sha256: hash, start })), verdict: previous.equals(current) && analysis.statements.length === 0 ? 'PASS' : 'FAIL' });
}

function requireThrows(fn, pattern) {
  let error;
  try { fn(); } catch (caught) { error = caught; }
  if (!error || !pattern.test(error.message)) fail(`Expected failure matching ${pattern}`);
  return error.message;
}

export function runParserSelfTests() {
  const fixtures = {
    'prisma-nested-comments': () => ({ declarations: parsePrisma('model A {\n value String @default("} //")\n /* a /* nested */ b */\n}\n').declarations.map(({ kind, name }) => ({ kind, name })) }),
    'prisma-malformed-source': () => ({ blocked: requireThrows(() => parsePrisma('model A { /* unterminated'), /Unterminated/u) }),
    'projection-excluded-inverse': () => {
      const field = '  legacy Target[]\n'; const rows = [{ acceptedFrom: 'S12', disposition: 'accepted', kind: 'model', name: 'Target' }, { field: 'legacy', kind: 'inverse', owner: 'Owner', sha256: sha256(normalizeDeclaration(field, true)), target: 'Target', type: 'Target[]' }];
      return { sha256: sha256(projectSnapshot(`model Owner {\n${field}}\nmodel Target {\n id Int\n}\n`, 11, rows)) };
    },
    'projection-retained-target': () => ({ preserved: projectSnapshot('model Owner {\n acceptedRenamed Target[]\n}\nmodel Target {\n id Int\n}\n', 12, [{ acceptedFrom: 'S12', disposition: 'accepted', kind: 'model', name: 'Target' }, { field: 'old', kind: 'inverse', owner: 'Owner', sha256: '0'.repeat(64), target: 'Target', type: 'Target[]' }]).includes('acceptedRenamed') }),
    'sql-safe-create-table': () => lexPostgres(Buffer.from('CREATE TABLE "Box" (id int);\n')).statements[0],
    'sql-standard-function-blocked': () => ({ blocked: requireThrows(() => lexPostgres(Buffer.from("CREATE FUNCTION f() RETURNS void AS 'BEGIN DELETE FROM x; END' LANGUAGE plpgsql;\n")), /Blocked SQL operation/u) }),
    'sql-escaped-function-blocked': () => ({ blocked: requireThrows(() => lexPostgres(Buffer.from("CREATE FUNCTION f() RETURNS void AS E'BEGIN INSERT INTO x VALUES (1); END' LANGUAGE plpgsql;\n")), /Blocked SQL operation/u) }),
    'sql-dollar-procedure-blocked': () => ({ blocked: requireThrows(() => lexPostgres(Buffer.from('CREATE PROCEDURE p() AS $$ BEGIN UPDATE x SET y=1; END $$ LANGUAGE plpgsql;\n')), /Blocked SQL operation/u) }),
    'sql-trigger-blocked': () => ({ blocked: requireThrows(() => lexPostgres(Buffer.from('CREATE CONSTRAINT TRIGGER t AFTER UPDATE ON x EXECUTE FUNCTION f();\n')), /Blocked SQL operation/u) }),
    'sql-line-classes': () => lexPostgres(Buffer.from('\n-- comment\nCREATE TABLE x (id int);\n')).lineCounts,
    'sql-no-op-evidence': () => buildNoOpEvidence(lexPostgres(Buffer.from('-- no-op\n')), Buffer.from('same'), Buffer.from('same')),
    'prisma-semantic-identity': () => ({ equal: prismaSemanticSha256('model A {\n id Int\n}\nmodel B {\n id Int\n}\n') === prismaSemanticSha256('model A {\n id Int\n}\n\nmodel B {\n id Int\n}\n') })
  };
  assert.deepEqual(Object.keys(fixtures), [...PARSER_SELF_TEST_CASE_IDS]);
  const cases = PARSER_SELF_TEST_CASE_IDS.map((id) => {
    try { const result = fixtures[id](); return { id, result, resultSha256: sha256(canonicalJson(result)), status: 'PASS' }; }
    catch (error) { const result = { error: error.message }; return { id, result, resultSha256: sha256(canonicalJson(result)), status: 'FAIL' }; }
  });
  return Object.freeze({ caseInventoryHash: sha256(canonicalJson(PARSER_SELF_TEST_CASE_IDS)), cases, mode: 'parser-self-test', overallVerdict: cases.every((entry) => entry.status === 'PASS') ? 'PASS' : 'FAIL', version: 'c14-parser-self-test-v1' });
}

export function validateParserSelfTestReport(report) {
  assert.equal(report?.mode, 'parser-self-test'); assert.equal(report?.version, 'c14-parser-self-test-v1'); assert.equal(report?.overallVerdict, 'PASS');
  assert.equal(report?.caseInventoryHash, sha256(canonicalJson(PARSER_SELF_TEST_CASE_IDS)));
  assert.deepEqual(report?.cases?.map((entry) => entry.id), [...PARSER_SELF_TEST_CASE_IDS]);
  for (const entry of report.cases) { assert.equal(entry.status, 'PASS'); assert.match(entry.resultSha256, /^[0-9a-f]{64}$/u); assert.equal(entry.resultSha256, sha256(canonicalJson(entry.result))); }
  return true;
}

export function sanitizeEnvironment(hostEnv, externalRoot) {
  for (const key of ['SystemRoot', 'WINDIR']) if ((hostEnv[key] ?? '').toLowerCase() !== 'c:\\windows') fail(`${key} must equal C:\\Windows`);
  return Object.freeze({ CHECKPOINT_DISABLE: '1', NO_COLOR: '1', PRISMA_HIDE_UPDATE_MESSAGE: '1', SystemRoot: hostEnv.SystemRoot, TEMP: join(externalRoot, 'scratch', 'tmp'), TMP: join(externalRoot, 'scratch', 'tmp'), TZ: 'UTC', WINDIR: hostEnv.WINDIR });
}

export function sanitizeGitEnvironment(hostEnv) {
  for (const key of ['SystemRoot', 'WINDIR']) if ((hostEnv[key] ?? '').toLowerCase() !== 'c:\\windows') fail(`${key} must equal C:\\Windows`);
  return Object.freeze({ GCM_INTERACTIVE: 'Never', GIT_CONFIG_GLOBAL: 'NUL', GIT_CONFIG_NOSYSTEM: '1', GIT_OPTIONAL_LOCKS: '0', GIT_TERMINAL_PROMPT: '0', LC_ALL: 'C', SystemRoot: hostEnv.SystemRoot, TZ: 'UTC', WINDIR: hostEnv.WINDIR });
}

function sanitizeWindowsUtilityEnvironment(hostEnv) {
  for (const key of ['SystemRoot', 'WINDIR']) if ((hostEnv[key] ?? '').toLowerCase() !== 'c:\\windows') fail(`${key} must equal C:\\Windows`);
  return { SystemRoot: hostEnv.SystemRoot, WINDIR: hostEnv.WINDIR };
}

export function createWindowsPathAdapter({ fsutilPath = FSUTIL, hostEnv = process.env } = {}) {
  return {
    exists: existsSync,
    finalPath(path) { const fd = openSync(path, fsConstants.O_RDONLY); try { return realpathSync.native(path); } finally { closeSync(fd); } },
    isReparse(path) {
      const result = spawnSync(fsutilPath, ['reparsepoint', 'query', path], { encoding: 'utf8', env: sanitizeWindowsUtilityEnvironment(hostEnv), shell: false, windowsHide: true });
      if (result.status === 0) return true;
      if (result.status === 1 && /(?:Error\s+4390|4390:)/iu.test(`${result.stdout}\n${result.stderr}`)) return false;
      fail(`fsutil reparse query failed for ${path}: status=${result.status} ${String(result.stderr || result.stdout).trim()}`);
    },
    lstat: lstatSync,
    realpath: realpathSync.native
  };
}

export function verifyPathChain(candidate, boundary, adapter = createWindowsPathAdapter()) {
  if (!isAbsolute(candidate) || !isAbsolute(boundary)) fail('Path chain inputs must be absolute');
  const normalizeCase = (value) => resolve(value).toLowerCase();
  const boundaryReal = normalizeCase(adapter.finalPath ? adapter.finalPath(boundary) : adapter.realpath(boundary));
  let current = resolve(candidate); const pending = [];
  while (!adapter.exists(current)) { pending.unshift(basename(current)); const next = dirname(current); if (next === current) fail('No existing path ancestor'); current = next; }
  const currentReal = normalizeCase(adapter.finalPath ? adapter.finalPath(current) : adapter.realpath(current));
  const relativeExisting = relative(boundaryReal, currentReal);
  if (relativeExisting.startsWith('..') || isAbsolute(relativeExisting)) fail('Path escapes containment boundary');
  const pieces = relative(resolve(boundary), current).split(sep).filter(Boolean); let component = resolve(boundary);
  for (const piece of ['', ...pieces]) {
    if (piece) component = join(component, piece);
    const stats = adapter.lstat(component);
    if (stats.isSymbolicLink() || adapter.isReparse?.(component)) fail(`Reparse/symlink path rejected: ${component}`);
    const opened = normalizeCase(adapter.finalPath ? adapter.finalPath(component) : adapter.realpath(component));
    if (opened !== normalizeCase(adapter.realpath(component))) fail(`Final-path mismatch: ${component}`);
  }
  return normalizeCase(join(currentReal, ...pending));
}

export function assertContainedPath(candidate, parent, repository, adapter = createWindowsPathAdapter()) {
  if (!isAbsolute(candidate) || !isAbsolute(parent) || !isAbsolute(repository)) fail('Containment paths must be absolute');
  const normalizeCase = (value) => resolve(value).toLowerCase();
  const parentReal = normalizeCase(adapter.finalPath ? adapter.finalPath(parent) : adapter.realpath(parent));
  const repositoryReal = normalizeCase(adapter.finalPath ? adapter.finalPath(repository) : adapter.realpath(repository));
  const finalPath = verifyPathChain(candidate, parent, adapter);
  if (!(finalPath === parentReal || finalPath.startsWith(`${parentReal}${sep}`))) fail('External path escapes approved parent');
  if (finalPath === repositoryReal || finalPath.startsWith(`${repositoryReal}${sep}`)) fail('External path overlaps repository');
  return finalPath;
}

export function validateCommandArgv(kind, argv, root) {
  if (!['format', 'validate', 'diff'].includes(kind)) fail(`Unknown command kind ${kind}`);
  if (argv.some((value) => typeof value !== 'string' || /(?:^|\s)(?:--url|--config|--from-url|--to-url)(?:$|=)/iu.test(value))) fail('Forbidden Prisma argument');
  const shape = kind === 'diff'
    ? argv.length === 7 && argv[0] === 'migrate' && argv[1] === 'diff' && argv[2] === '--from-schema' && argv[4] === '--to-schema' && argv[6] === '--script'
    : argv.length === 3 && argv[0] === kind && argv[1] === '--schema';
  if (!shape) fail(`Invalid ${kind} argv`);
  for (const value of argv.filter(isAbsolute)) if (!resolve(value).toLowerCase().startsWith(`${resolve(root).toLowerCase()}${sep}`)) fail('Prisma path outside external root');
  return true;
}

export function evaluateRunEligibility({ catalog, cxRows, toolchain, bindingSetRoot }) {
  const reasons = [];
  if (cxRows.length !== 13) reasons.push(`Expected 13 CX rows, got ${cxRows.length}`);
  const countFields = ['extensionCount', 'checkCount', 'functionCount', 'triggerCount', 'exclusionCount', 'constraintTriggerCount', 'predicateCount', 'branchCount', 'dependencyCount', 'eventCount', 'lowerLines', 'pointLines', 'upperLines'];
  for (const row of cxRows) {
    if (row.unresolved || !['approved', 'approved-documentary'].includes(row.reviewStatus) || countFields.some((field) => !Number.isInteger(row[field])) || !row.catalogVersion || !row.namedObjects?.length || !row.namedInvariants?.length || row.semanticQuestions?.length || row.upperLines > 350 || row.splitRequired) reasons.push(`${row.id} unresolved or incomplete`);
  }
  if (catalog.unresolved || !['approved', 'approved-documentary'].includes(catalog.approvalStatus) || !catalog.catalogVersion) reasons.push('CX catalog unresolved');
  const approval = toolchain.executionApproval;
  if (!approval?.approved || approval.bindingSetRoot !== bindingSetRoot || approval.parentEstimationBlob !== '89964f21fbfe758f80a302cd7e59a5dbfaa5a67e' || approval.topologyBlob !== 'b8608a922d2d9adf5d776673252f709c52d4a518') reasons.push('Exact execution approval absent or does not bind this set');
  return Object.freeze({ eligible: reasons.length === 0, reasons });
}

function readBindings() {
  return {
    catalog: JSON.parse(readFileSync(join(BINDINGS, 'cx-catalog.json'), JSON_OPTIONS)),
    commands: JSON.parse(readFileSync(join(BINDINGS, 'commands.json'), JSON_OPTIONS)),
    cxOccurrences: loadJsonl(readFileSync(join(BINDINGS, 'cx-occurrences.jsonl'), JSON_OPTIONS)),
    cxRows: loadJsonl(readFileSync(join(BINDINGS, 'cx-vectors.jsonl'), JSON_OPTIONS)),
    evidence: JSON.parse(readFileSync(join(BINDINGS, 'evidence-layout.json'), JSON_OPTIONS)),
    isolation: JSON.parse(readFileSync(join(BINDINGS, 'isolation.json'), JSON_OPTIONS)),
    projectionRows: loadJsonl(readFileSync(join(BINDINGS, 'projection-manifest.jsonl'), JSON_OPTIONS)),
    toolchain: JSON.parse(readFileSync(join(BINDINGS, 'toolchain.json'), JSON_OPTIONS))
  };
}

export function parseHashManifest(text) {
  const rows = String(text).split('\n').filter(Boolean).map((line) => {
    const match = line.match(/^([0-9a-f]{64})  ([A-Za-z0-9._/-]+)$/u);
    if (!match) fail(`Invalid hashes.sha256 line: ${line}`);
    return { hash: match[1], path: match[2] };
  });
  const paths = rows.map((row) => row.path);
  assert.deepEqual(paths, [...paths].sort(), 'hash manifest paths are not lexically sorted');
  assert.deepEqual(paths, EXPECTED_FILES, 'hash manifest file set mismatch');
  return rows;
}

function verifyFileHashes() {
  const bytes = readFileSync(HASH_FILE);
  const rows = parseHashManifest(bytes.toString('utf8'));
  for (const row of rows) assert.equal(sha256(readFileSync(join(HERE, ...row.path.split('/')))), row.hash, `Binding hash mismatch ${row.path}`);
  return { bindingSetRoot: sha256(bytes), rows };
}

function verifyJsonBindings(bindings) {
  const counts = Object.groupBy(bindings.projectionRows, (row) => row.kind);
  assert.equal(counts.model?.length, 32); assert.equal(counts.enum?.length, 14); assert.equal(counts.inverse?.length, 57);
  assert.equal(bindings.projectionRows.filter((r) => r.kind === 'model' && r.disposition === 'accepted').length, 24);
  assert.equal(bindings.projectionRows.filter((r) => r.kind === 'model' && r.disposition === 'never').length, 8);
  validateFinalizedBindings(bindings.catalog, bindings.cxRows, bindings.cxOccurrences);
  assert.deepEqual(bindings.commands.parserSelfTest.caseIds, [...PARSER_SELF_TEST_CASE_IDS]);
  assert.deepEqual(bindings.commands.parserSelfTest.argv, ['<exact-runner-path>', 'parser-self-test']);
}

const FINAL_CX_TOPOLOGY = Object.freeze([
  ['CX01', 'C14-01', 'baseline', []], ['CX02', 'C14-06', 'S04', ['S04']],
  ['CX03', 'C14-08', 'S05', ['S05']], ['CX04', 'C14-10', 'S06', ['S06']],
  ['CX05', 'C14-12', 'S07', ['S07']], ['CX06', 'C14-14', 'S08', ['S08']],
  ['CX07', 'C14-16', 'S09', ['S09']], ['CX08', 'C14-18', 'S10', ['S10']],
  ['CX09', 'C14-20', 'S11', ['S11']], ['CX10', 'C14-22', 'S12', ['S12']],
  ['CX11', 'C14-26', 'S15', ['S13', 'S14', 'S15']],
  ['CX12', 'C14-33', 'S21', ['S16', 'S17', 'S18', 'S19', 'S20', 'S21']],
  ['CX13', 'C14-37', 'S24', ['S24']]
]);
const FINAL_OBJECT_COUNT_FIELDS = Object.freeze({ check: 'checkCount', constraintTrigger: 'constraintTriggerCount', exclusion: 'exclusionCount', extension: 'extensionCount', function: 'functionCount', trigger: 'triggerCount' });
const REQUIRED_CATALOG_UNITS = Object.freeze(['branch', 'check', 'constraintTrigger', 'dependency', 'event', 'exclusion', 'extension', 'function', 'predicate', 'transactionProvenanceScaffold', 'trigger']);

export function validateFinalizedBindings(catalog, cxRows, cxOccurrences) {
  assert.equal(catalog.unresolved, false, 'CX catalog must be finalized');
  assert.equal(catalog.approvalStatus, 'approved-documentary');
  assert.equal(catalog.executionBlocked, true);
  assert.match(catalog.catalogVersion, /^c14-cx-catalog-v\d+-[0-9a-f]{8}$/u);
  assert.deepEqual(Object.keys(catalog.units).sort(), [...REQUIRED_CATALOG_UNITS]);
  for (const name of REQUIRED_CATALOG_UNITS) {
    const unit = catalog.units[name];
    for (const field of catalog.requiredTemplateFields) assert.notEqual(unit[field], undefined, `${name}.${field} missing`);
    assert.equal(sha256(unit.canonicalUtf8LfBytes), unit.templateSha256, `${name} template hash drift`);
    assert.equal(sha256(`${unit.namedAuthorityCitation}\n`), unit.sourceSha256, `${name} source hash drift`);
    assert.equal(sha256(canonicalJson({ one: unit.renderedBytes.one, zero: unit.renderedBytes.zero })), unit.fixtureSha256, `${name} fixture hash drift`);
    assert.equal(unit.oneOccurrenceFixture.renderedBytes, unit.renderedBytes.one);
    assert.equal(unit.zeroOccurrenceFixture.renderedBytes, unit.renderedBytes.zero);
    assert.equal(unit.physicalLines, unit.oneOccurrenceFixture.physicalLines - unit.zeroOccurrenceFixture.physicalLines, `${name} line delta drift`);
  }
  assert.equal(cxRows.length, FINAL_CX_TOPOLOGY.length);
  assert.ok(Array.isArray(cxOccurrences) && cxOccurrences.length > 0, 'CX occurrence ledger missing');
  const allowedCategories = new Set(['object', 'predicate', 'branch', 'dependency', 'event']);
  const occurrenceIds = new Set(); const occurrenceHashes = new Set();
  const citationPattern = /^(?:Engram:#4751\/CX\d{2}\/(?:Object|Check|Logic|Dependency|Event)\/.+|RECOMMENDED_PACKAGES\.md:0fd2959cd149d3c37b4162cdb2c232dd9dd35a71\/(?:T\d{2}-R\d{2}|D3-row-(?:[1-9]|1[0-5]))|BINDING_FINALIZATION_ADDENDUM\.md:a860049af04a6ff07fbe9fae6ddb512a8ef0adc8\/[ABCD](?:\/.+)?)$/u;
  for (const occurrence of cxOccurrences) {
    assert.equal(occurrence.ledgerVersion, 'c14-cx-occurrences-v1');
    assert.ok(allowedCategories.has(occurrence.category), `${occurrence.id} unknown category`);
    assert.match(occurrence.id, /^CX\d{2}-(?:OBJECT|PREDICATE|BRANCH|DEPENDENCY|EVENT)-\d{3}$/u);
    assert.equal(occurrence.id.startsWith(`${occurrence.cx}-`), true, `${occurrence.id} misowned`);
    assert.equal(FINAL_CX_TOPOLOGY.some(([id]) => id === occurrence.cx), true, `${occurrence.id} unknown CX`);
    assert.equal(occurrenceIds.has(occurrence.id), false, `duplicate occurrence ${occurrence.id}`); occurrenceIds.add(occurrence.id);
    assert.equal(occurrenceHashes.has(occurrence.sha256), false, `duplicate occurrence hash ${occurrence.id}`); occurrenceHashes.add(occurrence.sha256);
    const core = { category: occurrence.category, citation: occurrence.citation, cx: occurrence.cx, data: occurrence.data, id: occurrence.id, ledgerVersion: occurrence.ledgerVersion };
    assert.equal(occurrence.sha256, sha256(canonicalJson(core)), `${occurrence.id} hash drift`);
    assert.match(occurrence.citation, citationPattern, `${occurrence.id} bad citation`);
  }
  const objectOwners = new Map();
  for (let index = 0; index < FINAL_CX_TOPOLOGY.length; index += 1) {
    const row = cxRows[index]; const [id, child, attachment, snapshots] = FINAL_CX_TOPOLOGY[index];
    assert.equal(row.id, id); assert.equal(row.c14Child, child); assert.equal(row.attachmentAfter, attachment); assert.deepEqual(row.coversSnapshots, snapshots);
    assert.equal(row.catalogVersion, catalog.catalogVersion); assert.equal(row.unresolved, false); assert.equal(row.reviewStatus, 'approved-documentary'); assert.equal(row.splitRequired, false);
    assert.deepEqual(row.semanticQuestions, []); assert.ok(row.namedObjects.length > 0); assert.ok(row.namedInvariants.length > 0); assert.ok(row.sourceAuthorities.includes('BINDING_FINALIZATION_ADDENDUM.md:a860049af04a6ff07fbe9fae6ddb512a8ef0adc8'));
    const ownOccurrences = cxOccurrences.filter((occurrence) => occurrence.cx === id);
    assert.equal(row.occurrenceLedgerCount, ownOccurrences.length, `${id} ledger count drift`);
    assert.equal(row.occurrenceLedgerSha256, sha256(Buffer.from(ownOccurrences.map((occurrence) => `${JSON.stringify(occurrence)}\n`).join(''))), `${id} ledger hash drift`);
    const objectOccurrences = ownOccurrences.filter((occurrence) => occurrence.category === 'object');
    assert.deepEqual(objectOccurrences.map((occurrence) => occurrence.data.identity), row.namedObjects, `${id} object ledger mismatch`);
    const actual = Object.fromEntries(Object.values(FINAL_OBJECT_COUNT_FIELDS).map((field) => [field, 0]));
    const ownObjectSet = new Set(row.namedObjects);
    for (const occurrence of objectOccurrences) {
      const object = occurrence.data.identity; const kind = occurrence.data.objectClass; const field = FINAL_OBJECT_COUNT_FIELDS[kind]; assert.ok(field, `${id} unknown object class ${kind}`); assert.equal(object.startsWith(`${kind}:`), true); actual[field] += 1;
      assert.equal(objectOwners.has(object), false, `${object} overlaps ${objectOwners.get(object)} and ${id}`); objectOwners.set(object, id);
    }
    for (const [field, count] of Object.entries(actual)) assert.equal(row[field], count, `${id}.${field} drift`);
    for (const [category, field] of [['predicate', 'predicateCount'], ['branch', 'branchCount'], ['dependency', 'dependencyCount'], ['event', 'eventCount']]) assert.equal(row[field], ownOccurrences.filter((occurrence) => occurrence.category === category).length, `${id}.${field} ledger drift`);
    for (const occurrence of ownOccurrences.filter((entry) => entry.category === 'predicate')) assert.ok(ownObjectSet.has(occurrence.data.ownerObject), `${occurrence.id} predicate owner missing`);
    for (const occurrence of ownOccurrences.filter((entry) => entry.category === 'dependency')) { assert.ok(ownObjectSet.has(occurrence.data.from), `${occurrence.id} dependency source missing`); assert.ok(ownObjectSet.has(occurrence.data.to) || occurrence.data.to === 'extension:btree_gist', `${occurrence.id} dependency target missing`); }
    for (const occurrence of ownOccurrences.filter((entry) => entry.category === 'event')) { assert.ok(ownObjectSet.has(occurrence.data.trigger), `${occurrence.id} event trigger missing`); assert.ok(['INSERT', 'UPDATE', 'DELETE'].includes(occurrence.data.event), `${occurrence.id} event keyword invalid`); }
    const forecast = catalog.units.transactionProvenanceScaffold.physicalLines + row.extensionCount * catalog.units.extension.physicalLines + row.checkCount * catalog.units.check.physicalLines + row.functionCount * catalog.units.function.physicalLines + row.triggerCount * catalog.units.trigger.physicalLines + row.exclusionCount * catalog.units.exclusion.physicalLines + row.constraintTriggerCount * catalog.units.constraintTrigger.physicalLines + row.predicateCount * catalog.units.predicate.physicalLines + row.branchCount * catalog.units.branch.physicalLines + row.dependencyCount * catalog.units.dependency.physicalLines + row.eventCount * catalog.units.event.physicalLines;
    assert.equal(row.lowerLines, forecast); assert.equal(row.pointLines, forecast); assert.equal(row.upperLines, forecast); assert.ok(forecast <= 350, `${id} exceeds 350 lines`);
    assert.ok(row.prohibitedOverlap.includes('Prisma-supported tables/enums/columns/PKs/FKs/uniques/indexes'));
  }
  const minimumEvents = (cx) => cxOccurrences.filter((occurrence) => occurrence.cx === cx && occurrence.category === 'event' && /min_line/u.test(occurrence.data.trigger)).length;
  assert.equal(minimumEvents('CX10'), 3); assert.equal(cxRows.find((row) => row.id === 'CX10').minimumLineEventCount, minimumEvents('CX10'));
  assert.equal(minimumEvents('CX11'), 3); assert.equal(cxRows.find((row) => row.id === 'CX11').minimumLineEventCount, minimumEvents('CX11'));
  assert.equal(minimumEvents('CX12'), 0); assert.equal(cxRows.find((row) => row.id === 'CX12').minimumLineEventCount, minimumEvents('CX12'));
  assert.equal(minimumEvents('CX13'), 9); assert.equal(cxRows.find((row) => row.id === 'CX13').minimumLineEventCount, minimumEvents('CX13'));
  for (const cx of ['CX03', 'CX04', 'CX07', 'CX08', 'CX11', 'CX12']) assert.equal(cxOccurrences.some((occurrence) => occurrence.cx === cx && occurrence.category === 'predicate' && occurrence.data.atomicTest === 'Addendum-A-serialization'), true, `${cx} missing Addendum A occurrence`);
  assert.deepEqual(cxOccurrences.filter((occurrence) => occurrence.cx === 'CX01' && occurrence.category === 'branch').map((occurrence) => occurrence.data.arm), ['CX01-absent', 'CX01-exact', 'CX01-mismatch']);
  assert.equal(cxRows.find((row) => row.id === 'CX09').namedObjects.includes('check:ck_spp_available'), false);
  assert.equal(cxRows.find((row) => row.id === 'CX09').namedObjects.some((name) => /projection_fold/iu.test(name)), false);
  return Object.freeze({ catalogUnits: REQUIRED_CATALOG_UNITS.length, customObjects: objectOwners.size, finalizedCx: cxRows.length, occurrences: cxOccurrences.length });
}

function localPinnedFiles(toolchain) {
  return [toolchain.node, toolchain.git, toolchain.fsutil, toolchain.prisma.cli, { path: toolchain.prisma.package.packagePath, bytes: toolchain.prisma.package.packageBytes, sha256: toolchain.prisma.package.packageSha256 }, { path: toolchain.prisma.client.packagePath, bytes: toolchain.prisma.client.packageBytes, sha256: toolchain.prisma.client.packageSha256 }, toolchain.prisma.engine, toolchain.prisma.shim];
}

function boundaryForPinnedPath(path, toolchain) {
  const lower = path.toLowerCase();
  if (lower.startsWith(toolchain.repository.path.toLowerCase())) return toolchain.repository.path;
  if (lower.startsWith('c:\\program files\\git\\')) return 'C:\\Program Files\\Git';
  if (lower.startsWith('c:\\program files\\nodejs\\')) return 'C:\\Program Files\\nodejs';
  if (lower.startsWith('c:\\windows\\')) return 'C:\\Windows';
  fail(`No approved containment boundary for ${path}`);
}

function verifyPinnedLocalFiles(toolchain, adapter = createWindowsPathAdapter({ fsutilPath: toolchain.fsutil.path })) {
  for (const item of localPinnedFiles(toolchain)) {
    verifyPathChain(item.path, boundaryForPinnedPath(item.path, toolchain), adapter);
    const bytes = readFileSync(item.path); assert.equal(bytes.length, item.bytes, `Byte length drift ${item.path}`); assert.equal(sha256(bytes), item.sha256, `SHA-256 drift ${item.path}`);
  }
  verifyPathChain(toolchain.repository.packageManifestPath, toolchain.repository.path, adapter);
  verifyPathChain(toolchain.repository.packageLockPath, toolchain.repository.path, adapter);
}

function verifyPinnedFiles(toolchain, adapter) {
  verifyPinnedLocalFiles(toolchain, adapter);
  assert.equal(process.execPath.toLowerCase(), toolchain.node.path.toLowerCase());
  assert.equal(process.versions.node, toolchain.node.version);
  const git = toolchain.git.path;
  const gitRun = (argv, encoding = null) => execFileSync(git, argv, { cwd: toolchain.repository.path, encoding, env: sanitizeGitEnvironment(process.env), shell: false, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  for (const item of [toolchain.packageManifest, toolchain.packageLock]) {
    const bytes = gitRun(['cat-file', 'blob', item.blob]);
    assert.equal(bytes.length, item.bytes, `Git blob byte length drift ${item.path}`);
    assert.equal(sha256(bytes), item.sha256, `Git blob SHA-256 drift ${item.path}`);
  }
  assert.equal(gitRun(['rev-parse', `${toolchain.finalC13.commit}^{tree}`], 'utf8').trim(), toolchain.finalC13.tree);
  assert.equal(gitRun(['rev-parse', `${toolchain.finalC13.commit}^`], 'utf8').trim(), toolchain.finalC13.parent);
  assert.equal(gitRun(['rev-parse', `${toolchain.finalC13.commit}:prisma/schema.prisma`], 'utf8').trim(), toolchain.finalC13.schemaBlob);
  assert.equal(gitRun(['rev-parse', `${toolchain.finalC13.commit}:prisma/migrations`], 'utf8').trim(), toolchain.finalC13.migrationTree);
  for (const [, commit, blob] of toolchain.snapshots) assert.equal(gitRun(['rev-parse', `${commit}:prisma/schema.prisma`], 'utf8').trim(), blob);
}

export function verifyBindings({ verifyHost = true } = {}) {
  const hashes = verifyFileHashes();
  const bindings = readBindings();
  verifyJsonBindings(bindings);
  if (verifyHost) verifyPinnedFiles(bindings.toolchain);
  const eligibility = evaluateRunEligibility({ ...bindings, bindingSetRoot: hashes.bindingSetRoot });
  return { ...hashes, eligibility, manifestCounts: { enums: 14, inverses: 57, models: 32 }, unresolvedCx: bindings.cxRows.filter((row) => row.unresolved).length };
}

function gitBlobId(bytes) {
  return createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex');
}

export function verifyProjections({ bindings = readBindings(), hostEnv = process.env } = {}) {
  verifyJsonBindings(bindings);
  const gitBytesOnDisk = readFileSync(bindings.toolchain.git.path);
  assert.equal(gitBytesOnDisk.length, bindings.toolchain.git.bytes, 'Pinned Git byte length drift');
  assert.equal(sha256(gitBytesOnDisk), bindings.toolchain.git.sha256, 'Pinned Git SHA-256 drift');
  const env = sanitizeGitEnvironment(hostEnv);
  const gitRun = (argv) => execFileSync(bindings.toolchain.git.path, argv, { cwd: bindings.toolchain.repository.path, encoding: null, env, shell: false, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  const projections = []; const evidence = []; let projectionRows = bindings.projectionRows;
  for (let n = 0; n <= 24; n += 1) {
    const [id, commit, blob] = bindings.toolchain.snapshots[n];
    const cat = gitRun(['cat-file', 'blob', blob]);
    const shown = gitRun(['show', `${commit}:prisma/schema.prisma`]);
    assert.deepEqual(cat, shown, `${id} Git materializations differ`);
    assert.equal(gitBlobId(cat), blob, `${id} Git blob identity drift`);
    if (n === 0) projectionRows = prepareProjectionRows(cat.toString('utf8'), bindings.projectionRows);
    const projected = projectSnapshot(cat.toString('utf8'), n, projectionRows, { includeEvidence: true });
    projections.push(Buffer.from(projected.source)); evidence.push({ ...projected.evidence, bytes: Buffer.byteLength(projected.source), id: `P${String(n).padStart(2, '0')}`, sha256: sha256(projected.source), sourceBlob: blob, sourceCommit: commit });
  }
  assert.equal(prismaSemanticSha256(projections[22].toString('utf8')), prismaSemanticSha256(projections[21].toString('utf8')), 'P22 must semantically equal P21 before format');
  assert.equal(prismaSemanticSha256(projections[24].toString('utf8')), prismaSemanticSha256(projections[23].toString('utf8')), 'P24 must semantically equal P23 before format');
  return Object.freeze({ evidence, gitEnvironmentKeys: Object.keys(env).sort(), p22EqualsP21: true, p24EqualsP23: true, projectionCount: 25 });
}

export function writeOnce(path, bytes) {
  if (existsSync(path)) fail(`Write-once target exists: ${path}`);
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}-${Date.now()}`;
  const fd = openSync(temporary, fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_WRONLY, 0o444);
  try { writeSync(fd, bytes); fsyncSync(fd); } finally { closeSync(fd); }
  if (existsSync(path)) fail(`Write-once race: ${path}`);
  renameSync(temporary, path);
}

export async function capturedExec(state, category, executable, argv, options = {}) {
  const id = `C${String(++state.command).padStart(4, '0')}-${category}`;
  const startedAt = Date.now(); const started = new Date(startedAt).toISOString();
  let stdout = Buffer.alloc(0); let stderr = Buffer.alloc(0); let result;
  try {
    const response = await execFile(executable, argv, { ...options, encoding: 'buffer', maxBuffer: 64 * 1024 * 1024, shell: false, timeout: 120000, windowsHide: true });
    stdout = response.stdout; stderr = response.stderr; result = { code: 0, error: null, signal: null, timedOut: false };
  } catch (error) {
    stdout = Buffer.isBuffer(error.stdout) ? error.stdout : Buffer.from(error.stdout ?? ''); stderr = Buffer.isBuffer(error.stderr) ? error.stderr : Buffer.from(error.stderr ?? '');
    result = { code: Number.isInteger(error.code) ? error.code : null, error: String(error.message).replace(/(?:postgres(?:ql)?:\/\/|DATABASE_URL=|DIRECT_URL=)\S+/giu, '[REDACTED]'), signal: error.signal ?? null, timedOut: error.killed === true };
  }
  const base = join(state.root, 'commands', id);
  const artifactLinks = options.artifactLinks ?? [];
  const expectedOutputPolicy = options.expectedOutputPolicy ?? 'raw bytes retained; exit code zero required';
  writeOnce(join(base, 'request.json'), canonicalJson({ argv, artifactLinks, category, cwd: options.cwd, environmentKeys: Object.keys(options.env ?? {}).sort(), executable, expectedOutputPolicy, id, started, timeoutMilliseconds: 120000 }));
  writeOnce(join(base, 'stdout.bin'), stdout); writeOnce(join(base, 'stderr.bin'), stderr);
  writeOnce(join(base, 'stdout.sha256'), Buffer.from(`${sha256(stdout)}\n`)); writeOnce(join(base, 'stderr.sha256'), Buffer.from(`${sha256(stderr)}\n`));
  writeOnce(join(base, 'result.json'), canonicalJson({ ...result, artifactLinks, durationMilliseconds: Date.now() - startedAt, ended: new Date().toISOString(), id, stderrBytes: stderr.length, stderrSha256: sha256(stderr), stdoutBytes: stdout.length, stdoutSha256: sha256(stdout) }));
  state.commands?.push(id);
  if (result.code !== 0) fail(`Command ${id} failed: ${result.error}`);
  return { id, stderr, stdout };
}

export async function captureParserSelfTest(state, { cwd, env, expectedRunnerSha256, nodePath = process.execPath, runnerPath = fileURLToPath(import.meta.url) }) {
  const runnerBytes = readFileSync(runnerPath);
  assert.equal(sha256(runnerBytes), expectedRunnerSha256, 'Parser self-test runner identity drift');
  const capture = await capturedExec(state, 'parser-self-test', nodePath, [runnerPath, 'parser-self-test'], { artifactLinks: ['reports/parser-tests.json'], cwd, env, expectedOutputPolicy: 'canonical parser-self-test JSON; complete approved case inventory; overall PASS' });
  let report;
  try { report = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(capture.stdout)); } catch (error) { fail(`Invalid parser self-test JSON: ${error.message}`); }
  validateParserSelfTestReport(report);
  assert.deepEqual(capture.stdout, canonicalJson(report), 'Parser self-test stdout is not canonical JSON');
  return Object.freeze({ captureId: capture.id, report, stdout: capture.stdout });
}

function sortDeep(value) {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortDeep(value[key])]));
  return value;
}
function canonicalJson(value) { return Buffer.from(`${JSON.stringify(sortDeep(value), null, 2)}\n`); }

async function gitBytes(state, git, argv, artifactLinks = []) { return (await capturedExec(state, 'git', git, argv, { artifactLinks, cwd: state.repository, env: state.gitEnv, expectedOutputPolicy: 'read-only Git stdout/stderr captured verbatim' })).stdout; }

export function eventBytes({ actor, closureRoot = null, evidenceState, ordinal, previousSha256, reason, state, utc = new Date().toISOString() }) {
  if (!actor || !evidenceState || !reason || !Number.isInteger(ordinal)) fail('Incomplete event record');
  return canonicalJson({ actor, closureRoot, evidenceState, ordinal, previousSha256, reason, state, utc });
}

export function buildRunLock({ acquiredAt = new Date().toISOString(), bindingSetRoot, externalRoot, host, owner, protocolBlob, repository, runnerSha256 }) {
  for (const [key, value] of Object.entries({ bindingSetRoot, externalRoot, host, owner, protocolBlob, repository, runnerSha256 })) if (!value) fail(`Incomplete run.lock field ${key}`);
  return canonicalJson({ acquiredAt, bindingSetRoot, externalRoot, host, owner, protocolBlob, repository, runnerSha256 });
}

export function buildProtocol({ bindingSetRoot, bindings, commandBytes = readFileSync(join(BINDINGS, 'commands.json')) }) {
  return {
    allowedCli: {
      'parser-self-test': [bindings.toolchain.node.path, '<exact-runner-path>', 'parser-self-test'],
      'verify-bindings': [bindings.toolchain.node.path, '<binding-runner-path>', 'verify-bindings'],
      'verify-projections': [bindings.toolchain.node.path, '<binding-runner-path>', 'verify-projections'],
      run: [bindings.toolchain.node.path, '<binding-runner-path>', 'run']
    },
    bindingSetRoot,
    commandBinding: bindings.commands,
    commandBindingSha256: sha256(commandBytes),
    commandTemplates: bindings.commands.allowed,
    commandTemplatesSha256: sha256(canonicalJson(bindings.commands.allowed)),
    constants: { cxChildren: 13, maxChildLines: 350, parserSelfTestCases: PARSER_SELF_TEST_CASE_IDS.length, projections: 25, structuralDiffs: 24 },
    documentationSources: [
      { accessed: '2026-08-03', purpose: 'Prisma schema formatting and validation CLI', url: 'https://www.prisma.io/docs/orm/reference/prisma-cli-reference' },
      { accessed: '2026-08-03', purpose: 'Prisma migrate diff schema-file sources and script stdout', url: 'https://www.prisma.io/docs/orm/reference/prisma-cli-reference#migrate-diff' }
    ],
    parentEstimationBlob: '89964f21fbfe758f80a302cd7e59a5dbfaa5a67e',
    stopRules: ['identity drift', 'reparse point', 'repository mutation', 'parser self-test missing/invalid/failing', 'Prisma failure', 'non-idempotent format', 'destructive/procedural/OTHER SQL', 'P22/P24 non-no-op', 'CX unresolved or above 350', 'exact detached-root execution approval absent'],
    topologyBlob: 'b8608a922d2d9adf5d776673252f709c52d4a518',
    versions: { binding: bindings.toolchain.bindingVersion, catalog: bindings.catalog.catalogVersion, command: 'c14-shell-free-v3', evidence: 'c14-write-once-v2', node: bindings.toolchain.node.version, normalization: 'utf8-lf-terminal-lf-v1', parser: 'c14-prisma-pg-v3', prisma: bindings.toolchain.prisma.package.version, prismaEngine: bindings.toolchain.prisma.engine.commit, projection: 'c14-independent-projection-v2', selfTest: 'c14-parser-self-test-v1', sqlPolicy: 'c14-ps-sql-blocker-v2' }
  };
}

export function buildExecutionManifest({ bindingSetRoot, bindings, lockBytes, resolvedRepository, resolvedRoot, runnerBytes, runnerPath }) {
  const lock = JSON.parse(lockBytes);
  const exclusions = ['accepted SQL', 'migration files/directories', 'SQL transformation or pruning', 'database access or introspection', 'network endpoints', 'provider/environment changes', 'repository writes', 'Git staging/commit/remotes', 'deployment/production'];
  return {
    approvalBindings: { executionApproval: bindings.toolchain.executionApproval, parentEstimationBlob: '89964f21fbfe758f80a302cd7e59a5dbfaa5a67e', topologyBlob: 'b8608a922d2d9adf5d776673252f709c52d4a518' },
    bindingSetRoot,
    expectedEvidencePaths: { commandPattern: bindings.evidence.commandCapture.directoryPattern, events: bindings.evidence.events, immutable: bindings.evidence.immutable, reports: bindings.evidence.reports, scratch: bindings.evidence.scratch },
    exclusions,
    finalC13: bindings.toolchain.finalC13,
    isolation: bindings.isolation,
    nonAuthority: 'Estimator evidence only. No generated SQL is accepted migration SQL or implementation authority.',
    ownerLock: { lockPath: 'run.lock', lockSha256: sha256(lockBytes), ...lock },
    paths: { externalRoot: resolvedRoot, repository: resolvedRepository },
    runner: { bytes: runnerBytes.length, gitBlob: gitBlobId(runnerBytes), path: runnerPath, sha256: sha256(runnerBytes) },
    toolchain: bindings.toolchain
  };
}

export function listPayloadFiles(root, current = root) {
  const files = [];
  for (const name of readdirSync(current)) {
    const absolute = join(current, name); const rel = relative(root, absolute).split(sep).join('/');
    if (rel === 'hashes.sha256' || rel === 'completion.json' || rel === 'completion.sha256' || rel === 'events/0003-review-held.json' || rel === 'scratch' || rel.startsWith('scratch/')) continue;
    if (statSync(absolute).isDirectory()) files.push(...listPayloadFiles(root, absolute)); else files.push(rel);
  }
  return files.sort();
}

export function finalizeEvidence(root, summary, { beforeCompletion, finalEvent } = {}) {
  const writeOrder = [];
  const payloadLines = listPayloadFiles(root).map((rel) => `${sha256(readFileSync(join(root, ...rel.split('/'))))}  ${rel}\n`).join('');
  writeOnce(join(root, 'hashes.sha256'), Buffer.from(payloadLines)); writeOrder.push('hashes.sha256');
  beforeCompletion?.();
  const completion = canonicalJson({ ...summary, finalization: 'PASS', hashesSha256: sha256(Buffer.from(payloadLines)), manifestSha256: sha256(readFileSync(join(root, 'manifest.json'))), verdict: 'PASS' });
  writeOnce(join(root, 'completion.json'), completion); writeOrder.push('completion.json');
  const completionRoot = sha256(completion);
  writeOnce(join(root, 'completion.sha256'), Buffer.from(`${completionRoot}\n`)); writeOrder.push('completion.sha256');
  if (finalEvent) {
    writeOnce(join(root, 'events', '0003-review-held.json'), eventBytes({ ...finalEvent, closureRoot: completionRoot })); writeOrder.push('events/0003-review-held.json');
  }
  return Object.freeze({ completionRoot, payloadCount: payloadLines.split('\n').filter(Boolean).length, writeOrder });
}

function verifyPrismaLaunchIdentity(toolchain, externalRoot, paths, adapter) {
  verifyPinnedLocalFiles(toolchain, adapter);
  assert.equal(process.execPath.toLowerCase(), toolchain.node.path.toLowerCase(), 'Node executable path drift');
  for (const path of paths) verifyPathChain(path, externalRoot, adapter);
}

/** Complete external-only pipeline. It is unreachable while exact detached-root execution approval is absent. */
export async function executeApprovedRun(bindings, bindingSetRoot, adapters = {}) {
  const eligibility = evaluateRunEligibility({ ...bindings, bindingSetRoot });
  if (!eligibility.eligible) fail(`RUN BLOCKED BEFORE ROOT CREATION: ${eligibility.reasons.join('; ')}`);
  const root = bindings.toolchain.externalRoot;
  const repository = bindings.toolchain.repository.path;
  const pathAdapter = adapters.pathAdapter ?? createWindowsPathAdapter({ fsutilPath: bindings.toolchain.fsutil.path });
  assertContainedPath(root, bindings.isolation.filesystem.approvedParent, repository, pathAdapter);
  if (existsSync(root)) fail('External root already exists');
  verifyPinnedFiles(bindings.toolchain, pathAdapter);
  const git = bindings.toolchain.git.path;
  const gitEnv = sanitizeGitEnvironment(process.env);
  const beforeStarted = new Date().toISOString();
  const beforeStartMs = Date.now();
  const before = await execFile(git, ['status', '--porcelain=v2', '-z', '--untracked-files=all'], { cwd: repository, encoding: 'buffer', env: gitEnv, shell: false });
  mkdirSync(root);
  const state = { command: 1, commands: ['C0001-repo-before'], gitEnv, repository, root };
  const runnerBytes = readFileSync(fileURLToPath(import.meta.url));
  const resolvedRoot = realpathSync.native(root); const resolvedRepository = realpathSync.native(repository);
  const lockBytes = buildRunLock({ bindingSetRoot, externalRoot: resolvedRoot, host: hostname(), owner: { pid: process.pid, role: 'single-writer-runner' }, protocolBlob: '89964f21fbfe758f80a302cd7e59a5dbfaa5a67e', repository: resolvedRepository, runnerSha256: sha256(runnerBytes) });
  writeOnce(join(root, 'run.lock'), lockBytes);
  const actor = `runner:${process.pid}@${hostname()}`;
  const reserved = eventBytes({ actor, evidenceState: 'lock-only', ordinal: 1, previousSha256: null, reason: 'Exclusive immutable lock acquired', state: 'reserved' });
  writeOnce(join(root, 'events', '0001-reserved.json'), reserved);
  const running = eventBytes({ actor, evidenceState: 'protocol-bound', ordinal: 2, previousSha256: sha256(reserved), reason: 'Identity verification and external evidence construction started', state: 'running' });
  writeOnce(join(root, 'events', '0002-running.json'), running);
  const externalRunnerPath = join(root, 'runner', 'runner.mjs');
  writeOnce(externalRunnerPath, runnerBytes);
  writeOnce(join(root, 'runner', 'runner.sha256'), Buffer.from(`${sha256(runnerBytes)}\n`));
  writeOnce(join(root, 'protocol.json'), canonicalJson(buildProtocol({ bindingSetRoot, bindings })));
  writeOnce(join(root, 'manifest.json'), canonicalJson(buildExecutionManifest({ bindingSetRoot, bindings, lockBytes, resolvedRepository, resolvedRoot, runnerBytes, runnerPath: externalRunnerPath })));
  writeOnce(join(root, 'quarantine-manifest.json'), canonicalJson({ rows: bindings.projectionRows, s00: bindings.toolchain.snapshots[0] }));
  writeOnce(join(root, 'reports', 'repo-before.porcelain-v2-z'), before.stdout);
  const beforeBase = join(root, 'commands', 'C0001-repo-before');
  writeOnce(join(beforeBase, 'request.json'), canonicalJson({ argv: ['status', '--porcelain=v2', '-z', '--untracked-files=all'], artifactLinks: ['reports/repo-before.porcelain-v2-z'], category: 'repo-before', cwd: repository, environmentKeys: Object.keys(gitEnv).sort(), executable: git, expectedOutputPolicy: 'raw porcelain-v2 -z bytes retained', id: 'C0001-repo-before', started: beforeStarted, timeoutMilliseconds: 120000 }));
  writeOnce(join(beforeBase, 'stdout.bin'), before.stdout); writeOnce(join(beforeBase, 'stderr.bin'), before.stderr);
  writeOnce(join(beforeBase, 'stdout.sha256'), Buffer.from(`${sha256(before.stdout)}\n`)); writeOnce(join(beforeBase, 'stderr.sha256'), Buffer.from(`${sha256(before.stderr)}\n`));
  writeOnce(join(beforeBase, 'result.json'), canonicalJson({ artifactLinks: ['reports/repo-before.porcelain-v2-z'], code: 0, durationMilliseconds: Date.now() - beforeStartMs, ended: new Date().toISOString(), error: null, id: 'C0001-repo-before', signal: null, stderrBytes: before.stderr.length, stderrSha256: sha256(before.stderr), stdoutBytes: before.stdout.length, stdoutSha256: sha256(before.stdout), timedOut: false }));
  mkdirSync(join(root, 'scratch', 'tmp'), { recursive: true });
  verifyPinnedLocalFiles(bindings.toolchain, pathAdapter); assert.equal(process.execPath.toLowerCase(), bindings.toolchain.node.path.toLowerCase()); verifyPathChain(externalRunnerPath, root, pathAdapter);
  const parserWorker = await captureParserSelfTest(state, { cwd: root, env: sanitizeEnvironment(process.env, root), expectedRunnerSha256: sha256(runnerBytes), nodePath: process.execPath, runnerPath: externalRunnerPath });
  writeOnce(join(root, 'reports', 'parser-tests.json'), parserWorker.stdout);
  const migrationNames = (await gitBytes(state, git, ['ls-tree', '-r', '--name-only', bindings.toolchain.finalC13.commit, 'prisma/migrations'])).toString('utf8').split(/\r?\n/u).filter((name) => name.endsWith('/migration.sql'));
  assert.equal(migrationNames.length, bindings.toolchain.finalC13.migrationCount, 'Canonical migration count drift');
  for (const name of migrationNames) {
    const sql = await gitBytes(state, git, ['show', `${bindings.toolchain.finalC13.commit}:${name}`]);
    const lexical = lexPostgres(sql, { enforceOperationPolicy: false });
    const forbidden = lexical.tokens.filter((token) => token.type === 'word' || token.type === 'identifier').map((token) => token.value.replace(/^"|"$/gu, '').replace(/""/gu, '"')).find((identifier) => /^(?:stock|cajas)/iu.test(identifier));
    if (forbidden) fail(`Canonical migration contains forbidden Stock/Cajas identifier ${forbidden} in ${name}`);
  }
  let rows = bindings.projectionRows;
  const projections = [];
  const projectionEvidence = [];
  for (let n = 0; n <= 24; n += 1) {
    const [id, commit, blob] = bindings.toolchain.snapshots[n];
    const cat = await gitBytes(state, git, ['cat-file', 'blob', blob]);
    const shown = await gitBytes(state, git, ['show', `${commit}:prisma/schema.prisma`]);
    assert.deepEqual(cat, shown, `${id} Git materializations differ`);
    const inputPath = join(root, 'inputs', `${id}.prisma`);
    writeOnce(inputPath, cat);
    const hashed = (await gitBytes(state, git, ['hash-object', inputPath])).toString('utf8').trim();
    assert.equal(hashed, blob, `${id} blob identity drift`);
    if (n === 0) rows = prepareProjectionRows(cat.toString('utf8'), rows);
    const projected = projectSnapshot(cat.toString('utf8'), n, rows, { includeEvidence: true });
    const candidate = projected.source;
    const projectionPath = join(root, 'scratch', 'projections', `P${String(n).padStart(2, '0')}.prisma`);
    mkdirSync(dirname(projectionPath), { recursive: true }); writeFileSync(projectionPath, candidate, { flag: 'wx' });
    const env = sanitizeEnvironment(process.env, root);
    const argv = ['format', '--schema', projectionPath]; validateCommandArgv('format', argv, root); verifyPrismaLaunchIdentity(bindings.toolchain, root, [projectionPath], pathAdapter);
    const format1 = await capturedExec(state, 'prisma-format-1', process.execPath, [bindings.toolchain.prisma.cli.path, ...argv], { artifactLinks: [`scratch/projections/P${String(n).padStart(2, '0')}.prisma`], cwd: root, env });
    const first = readFileSync(projectionPath); verifyPrismaLaunchIdentity(bindings.toolchain, root, [projectionPath], pathAdapter);
    const format2 = await capturedExec(state, 'prisma-format-2', process.execPath, [bindings.toolchain.prisma.cli.path, ...argv], { artifactLinks: [`scratch/projections/P${String(n).padStart(2, '0')}.prisma`], cwd: root, env });
    const second = readFileSync(projectionPath); assert.deepEqual(second, first, `P${n} format is not idempotent`);
    const validateArgv = ['validate', '--schema', projectionPath]; validateCommandArgv('validate', validateArgv, root); verifyPrismaLaunchIdentity(bindings.toolchain, root, [projectionPath], pathAdapter);
    const validation = await capturedExec(state, 'prisma-validate', process.execPath, [bindings.toolchain.prisma.cli.path, ...validateArgv], { artifactLinks: [`projections/P${String(n).padStart(2, '0')}.prisma`], cwd: root, env });
    const inventory = parsePrisma(second.toString('utf8')).declarations;
    writeOnce(join(root, 'projections', `P${String(n).padStart(2, '0')}.prisma`), second); projections.push(second);
    projectionEvidence.push({ ...projected.evidence, bytes: second.length, captureIds: { formatPass1: format1.id, formatPass2: format2.id, validate: validation.id }, formattedSha256: sha256(second), formatPass1Sha256: sha256(first), formatPass2Sha256: sha256(second), id: `P${String(n).padStart(2, '0')}`, inventory: { enums: inventory.filter((d) => d.kind === 'enum').length, models: inventory.filter((d) => d.kind === 'model').length }, preFormatBytes: Buffer.byteLength(candidate), preFormatSha256: sha256(candidate), sourceBlob: blob, sourceCommit: commit });
  }
  assert.deepEqual(projections[22], projections[21], 'P22 must equal P21'); assert.deepEqual(projections[24], projections[23], 'P24 must equal P23');
  const operations = []; const counts = []; const noOps = [];
  for (let n = 1; n <= 24; n += 1) {
    const previous = join(root, 'projections', `P${String(n - 1).padStart(2, '0')}.prisma`); const current = join(root, 'projections', `P${String(n).padStart(2, '0')}.prisma`);
    const argv = ['migrate', 'diff', '--from-schema', previous, '--to-schema', current, '--script']; validateCommandArgv('diff', argv, root);
    verifyPrismaLaunchIdentity(bindings.toolchain, root, [previous, current], pathAdapter);
    const capture = await capturedExec(state, 'prisma-diff', process.execPath, [bindings.toolchain.prisma.cli.path, ...argv], { artifactLinks: [`ps/PS${String(n).padStart(2, '0')}/raw.sql`], cwd: root, env: sanitizeEnvironment(process.env, root) });
    const analysis = lexPostgres(capture.stdout); if ((n === 22 || n === 24) && analysis.statements.length) fail(`PS${n} must be a semantic no-op`);
    writeOnce(join(root, 'ps', `PS${String(n).padStart(2, '0')}`, 'raw.sql'), capture.stdout);
    operations.push({ id: `PS${String(n).padStart(2, '0')}`, statements: analysis.statements });
    counts.push({ ...analysis.lineCounts, id: `PS${String(n).padStart(2, '0')}`, physicalLines: analysis.physicalLines, rawBytes: analysis.rawBytes, rawSha256: analysis.rawSha256, semanticStatements: analysis.statements.length });
    if (n === 22 || n === 24) noOps.push({ id: `PS${n}`, ...buildNoOpEvidence(analysis, projections[n - 1], projections[n]) });
  }
  for (const row of bindings.cxRows) writeOnce(join(root, 'cx', row.id, 'manifest.json'), canonicalJson(row));
  writeOnce(join(root, 'projection-manifest.json'), canonicalJson(projectionEvidence));
  writeOnce(join(root, 'reports', 'operations.json'), canonicalJson(operations));
  writeOnce(join(root, 'reports', 'counts.csv'), Buffer.from(`id,rawBytes,rawSha256,physicalLines,blankLines,commentLines,codeLines,semanticStatements\n${counts.map((r) => `${r.id},${r.rawBytes},${r.rawSha256},${r.physicalLines},${r.blank},${r.comment},${r.code},${r.semanticStatements}`).join('\n')}\n`));
  writeOnce(join(root, 'reports', 'no-op.json'), canonicalJson(noOps));
  writeOnce(join(root, 'reports', 'split.json'), canonicalJson({ cx: bindings.cxRows.map((row) => ({ id: row.id, upperLines: row.upperLines })), ps: counts.map((row) => ({ id: row.id, physicalLines: row.physicalLines })) }));
  const afterCapture = await capturedExec(state, 'repo-after', git, ['status', '--porcelain=v2', '-z', '--untracked-files=all'], { artifactLinks: ['reports/repo-after.porcelain-v2-z'], cwd: repository, env: gitEnv, expectedOutputPolicy: 'raw porcelain-v2 -z bytes retained' });
  writeOnce(join(root, 'reports', 'repo-after.porcelain-v2-z'), afterCapture.stdout); assert.deepEqual(afterCapture.stdout, before.stdout, 'Repository status changed during run');
  writeOnce(join(root, 'reports', 'repo-guard.json'), canonicalJson({ afterSha256: sha256(afterCapture.stdout), beforeSha256: sha256(before.stdout), identical: true }));
  writeOnce(join(root, 'run.json'), canonicalJson({ commandCount: state.command, commandIndex: state.commands, diffCount: 24, phaseVerdicts: { cx: 'PASS', diffs: 'PASS', finalization: 'PENDING', parserSelfTest: 'PASS', projections: 'PASS', repositoryGuard: 'PASS', toolchain: 'PASS' }, projectionCount: 25, status: 'pre-final' }));
  const completion = finalizeEvidence(root, { commandCount: state.command, eventCount: 3, repositoryGuardSha256: sha256(afterCapture.stdout), retainedScratchFiles: listPayloadFiles(join(root, 'scratch')).length }, { finalEvent: { actor, evidenceState: 'completion-bound', ordinal: 3, previousSha256: sha256(running), reason: 'Hashes and completion PASS finalized; evidence retained for independent review', state: 'review-held' } });
  return { commandCount: state.command, completionRoot: completion.completionRoot, root };
}

async function main(argv) {
  if (argv.length !== 1 || !['parser-self-test', 'verify-bindings', 'verify-projections', 'run'].includes(argv[0])) fail('Usage: node runner.mjs <parser-self-test|verify-bindings|verify-projections|run>');
  if (argv[0] === 'parser-self-test') {
    const report = runParserSelfTests(); process.stdout.write(canonicalJson(report)); if (report.overallVerdict !== 'PASS') process.exitCode = 1; return;
  }
  const verification = verifyBindings({ verifyHost: argv[0] !== 'verify-projections' });
  if (argv[0] === 'verify-bindings') {
    console.log(JSON.stringify({ bindingSetRoot: verification.bindingSetRoot, executionBlocked: !verification.eligibility.eligible, manifestCounts: verification.manifestCounts, status: 'verified', unresolvedCx: verification.unresolvedCx }));
    return;
  }
  if (argv[0] === 'verify-projections') {
    const projections = verifyProjections();
    console.log(JSON.stringify({ bindingSetRoot: verification.bindingSetRoot, executionBlocked: true, gitEnvironmentKeys: projections.gitEnvironmentKeys, p22EqualsP21: projections.p22EqualsP21, p24EqualsP23: projections.p24EqualsP23, projectionCount: projections.projectionCount, status: 'verified-read-only' }));
    return;
  }
  if (!verification.eligibility.eligible) fail(`RUN BLOCKED BEFORE ROOT CREATION: ${verification.eligibility.reasons.join('; ')}`);
  await executeApprovedRun(readBindings(), verification.bindingSetRoot);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
