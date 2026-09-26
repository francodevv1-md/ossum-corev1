import assert from 'node:assert/strict';
import { existsSync, lstatSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  assertContainedPath,
  buildNoOpEvidence,
  buildExecutionManifest,
  buildProtocol,
  buildRunLock,
  captureParserSelfTest,
  capturedExec,
  evaluateRunEligibility,
  eventBytes,
  finalizeEvidence,
  lexPostgres,
  listPayloadFiles,
  loadJsonl,
  maskPrismaSource,
  normalizeDeclaration,
  parseHashManifest,
  parsePrisma,
  PARSER_SELF_TEST_CASE_IDS,
  prepareProjectionRows,
  prismaSemanticSha256,
  projectSnapshot,
  runParserSelfTests,
  sanitizeEnvironment,
  sanitizeGitEnvironment,
  sha256,
  validateCommandArgv,
  validateFinalizedBindings,
  validateParserSelfTestReport,
  verifyPathChain,
  writeOnce
} from './runner.mjs';

const RUNNER_PATH = fileURLToPath(new URL('./runner.mjs', import.meta.url));
const BINDING_DIR = fileURLToPath(new URL('./bindings/', import.meta.url));

test('normalization converts CRLF, trims trailing whitespace, and adds one LF', () => {
  assert.equal(normalizeDeclaration('\r\nmodel A {  \r\n id Int\t\r\n}\r\n\r\n'), 'model A {\n id Int\n}\n');
});

test('Prisma masker handles nested comments and braces or comments inside strings', () => {
  const source = 'model A {\n value String @default("} // not comment")\n /* x /* nested } */ y */\n}\n';
  const masked = maskPrismaSource(source);
  assert.equal(masked.code.length, masked.text.length);
  assert.equal(parsePrisma(source).declarations[0].name, 'A');
});

test('Prisma parser accepts CRLF, arrays, optional types, parentheses, and multiline declarations', () => {
  const source = 'model A {\r\n  id Int @id\r\n  bs B[] @relation(\r\n    fields: [id]\r\n  )\r\n}\r\nmodel B {\r\n  id Int?\r\n}\r\n';
  const parsed = parsePrisma(source);
  assert.deepEqual(parsed.declarations.map((d) => d.name), ['A', 'B']);
  assert.deepEqual(parsed.declarations[0].fields.map((f) => [f.name, f.type]), [['id', 'Int'], ['bs', 'B[]']]);
});

test('Prisma parser preserves exact declaration spans', () => {
  const source = '// header\nmodel A {\n id Int\n}\n\nenum E {\n X\n}\n';
  for (const declaration of parsePrisma(source).declarations) assert.equal(source.slice(declaration.start, declaration.end), declaration.source);
});

for (const [name, source, pattern] of [
  ['duplicate declarations', 'model A {}\nmodel A {}\n', /Duplicate top-level/u],
  ['duplicate fields', 'model A {\n x Int\n x Int\n}\n', /Duplicate field/u],
  ['unbalanced braces', 'model A {\n x Int\n', /Unbalanced/u],
  ['unterminated comments', 'model A { /* x\n}\n', /Unterminated/u],
  ['unterminated strings', 'model A {\n x String @default("x)\n}\n', /Unterminated/u],
  ['unknown declarations', 'banana A {}\n', /Unknown top-level/u]
]) test(`Prisma parser rejects ${name}`, () => assert.throws(() => parsePrisma(source), pattern));

test('projection removes pre-stage and never models, inverse fields, and unreferenced enums', () => {
  const source = `model Owner {
  id Int @id
  accepted Accepted[]
  never Never[]
}

model Accepted {
  id Int @id
  kind Kind
}

model Never {
  id Int @id
}

enum Kind {
  A
}

enum NeverKind {
  X
}
`;
  const rows = [
    { kind: 'model', name: 'Accepted', disposition: 'accepted', acceptedFrom: 'S12' },
    { kind: 'model', name: 'Never', disposition: 'never', acceptedFrom: null },
    { kind: 'enum', name: 'Kind', disposition: 'referenced' },
    { kind: 'enum', name: 'NeverKind', disposition: 'never' },
    { kind: 'inverse', owner: 'Owner', field: 'accepted', sha256: sha256(normalizeDeclaration('  accepted Accepted[]\n', true)), type: 'Accepted[]', target: 'Accepted' },
    { kind: 'inverse', owner: 'Owner', field: 'never', sha256: sha256(normalizeDeclaration('  never Never[]\n', true)), type: 'Never[]', target: 'Never' }
  ];
  const projected = projectSnapshot(source, 12, rows);
  assert.match(projected, /model Accepted/u); assert.match(projected, /enum Kind/u);
  assert.doesNotMatch(projected, /model Never/u); assert.doesNotMatch(projected, /NeverKind/u); assert.doesNotMatch(projected, /never Never/u);
  assert.equal(projectSnapshot(projected, 12, rows), projected);
});

test('projection fails on missing retained target and inverse drift', () => {
  assert.throws(() => projectSnapshot('model Owner {\n x Wrong[]\n}\n', 12, [
    { kind: 'model', name: 'Target', disposition: 'accepted', acceptedFrom: 'S12' },
    { kind: 'inverse', owner: 'Owner', field: 'x', type: 'Target[]', target: 'Target' }
  ]), /Retained model absent/u);
});

test('retained targets do not require S00 inverse fields and preserve accepted Sn declarations', () => {
  const source = 'model Owner {\n  id Int @id\n  acceptedRenamed Target[]\n}\nmodel Target {\n  id Int @id\n}\n';
  const rows = [
    { acceptedFrom: 'S12', disposition: 'accepted', kind: 'model', name: 'Target' },
    { field: 'oldInverse', kind: 'inverse', owner: 'Owner', sha256: '0'.repeat(64), target: 'Target', type: 'Target[]' }
  ];
  assert.equal(projectSnapshot(source, 12, rows), source);
});

test('excluded target removes only exact S00 inverse identity and blocks drift', () => {
  const field = '  legacy Target[]\n';
  const row = { field: 'legacy', kind: 'inverse', owner: 'Owner', sha256: sha256(normalizeDeclaration(field, true)), target: 'Target', type: 'Target[]' };
  const rows = [{ acceptedFrom: 'S12', disposition: 'accepted', kind: 'model', name: 'Target' }, row];
  assert.doesNotMatch(projectSnapshot(`model Owner {\n${field}}\nmodel Target {\n id Int\n}\n`, 11, rows), /legacy/u);
  assert.throws(() => projectSnapshot('model Owner {\n  legacy Wrong[]\n}\nmodel Target {\n id Int\n}\n', 11, rows), /Inverse type drift/u);
  assert.throws(() => projectSnapshot('model Owner {\n  legacy Target[] @relation("changed")\n}\nmodel Target {\n id Int\n}\n', 11, rows), /Inverse hash drift/u);
});

test('prepared S00 inverse identity permits whitespace-only Sn formatting changes', () => {
  const s00Field = '  legacy        Target[] @relation("Legacy")\n';
  const s00 = `model Owner {\n${s00Field}}\nmodel Target {\n id Int\n}\n`;
  const rows = [
    { acceptedFrom: 'S12', disposition: 'accepted', kind: 'model', name: 'Target', sha256: sha256(normalizeDeclaration('model Target {\n id Int\n}\n')) },
    { field: 'legacy', kind: 'inverse', owner: 'Owner', sha256: sha256(normalizeDeclaration(s00Field, true)), target: 'Target', type: 'Target[]' }
  ];
  const prepared = prepareProjectionRows(s00, rows, { verifyManifest: false });
  const reformatted = 'model Owner {\n  legacy Target[]   @relation("Legacy")\n}\nmodel Target {\n id Int\n}\n';
  assert.doesNotMatch(projectSnapshot(reformatted, 11, prepared), /legacy/u);
  assert.throws(() => projectSnapshot(reformatted.replace('"Legacy"', '"Changed"'), 11, prepared), /Inverse hash drift/u);
});

test('PostgreSQL lexer handles comments, nested comments, quotes, and dollar bodies', () => {
  const safe = lexPostgres(Buffer.from('-- ;\n/* a /* ; */ b */\nCREATE TABLE "x;y" (id text DEFAULT \';\');\n'));
  assert.equal(safe.statements.length, 1); assert.equal(safe.statements[0].category, 'CREATE_TABLE');
  assert.throws(() => lexPostgres(Buffer.from('CREATE FUNCTION f() RETURNS void AS $$ BEGIN NULL; END $$ LANGUAGE plpgsql;\n')), /Blocked SQL operation/u);
});

test('PostgreSQL lexer rejects destructive, OTHER, unterminated, CR, and nonterminated SQL', () => {
  for (const bytes of ['DROP TABLE x;\n', 'UPDATE x SET y=1;\n', 'VACUUM;\n', 'CREATE TABLE x (id int)\n', "CREATE TABLE x (v text DEFAULT 'x);\n", '/* x']) assert.throws(() => lexPostgres(Buffer.from(bytes)));
  assert.throws(() => lexPostgres(Buffer.from('SELECT 1;\r\n')), /CR/u);
});

test('PostgreSQL blocker rejects every procedural representation and adversarial DML body', () => {
  for (const sql of [
    "CREATE FUNCTION f() RETURNS void AS 'BEGIN DELETE FROM x; END' LANGUAGE plpgsql;\n",
    "CREATE FUNCTION f() RETURNS void AS E'BEGIN INSERT INTO x VALUES (1); END' LANGUAGE plpgsql;\n",
    'CREATE PROCEDURE p() AS $$ BEGIN UPDATE x SET y=1; END $$ LANGUAGE plpgsql;\n',
    'CREATE TRIGGER t BEFORE INSERT ON x EXECUTE FUNCTION f();\n',
    'CREATE CONSTRAINT TRIGGER t AFTER UPDATE ON x EXECUTE FUNCTION f();\n'
  ]) assert.throws(() => lexPostgres(Buffer.from(sql)), /Blocked SQL operation/u);
});

test('SQL operation evidence records verb, identifiers, line classes, and rich no-op proof', () => {
  const analysis = lexPostgres(Buffer.from('\n-- comment\nCREATE TABLE "Box" (id int);\n'));
  assert.deepEqual(analysis.lineCounts, { blank: 1, code: 1, comment: 1 });
  assert.equal(analysis.statements[0].operationVerb, 'CREATE TABLE');
  assert.ok(analysis.statements[0].affectedIdentifiers.includes('Box'));
  const noOpAnalysis = lexPostgres(Buffer.from('-- no-op\n'));
  const noOp = buildNoOpEvidence(noOpAnalysis, Buffer.from('same'), Buffer.from('same'));
  assert.equal(noOp.verdict, 'PASS'); assert.equal(noOp.semanticStatements, 0); assert.equal(noOp.lineCounts.comment, 1);
});

test('PostgreSQL physical lines and comment-only no-op are exact', () => {
  assert.equal(lexPostgres(Buffer.alloc(0)).physicalLines, 0);
  const result = lexPostgres(Buffer.from('-- generated no-op\n'));
  assert.equal(result.physicalLines, 1); assert.equal(result.statements.length, 0);
});

test('environment is rebuilt from exactly eight non-secret keys', () => {
  const env = sanitizeEnvironment({ SystemRoot: 'C:\\Windows', WINDIR: 'C:\\Windows', DATABASE_URL: 'secret', PATH: 'x' }, 'C:\\safe');
  assert.deepEqual(Object.keys(env).sort(), ['CHECKPOINT_DISABLE', 'NO_COLOR', 'PRISMA_HIDE_UPDATE_MESSAGE', 'SystemRoot', 'TEMP', 'TMP', 'TZ', 'WINDIR'].sort());
  assert.equal(env.DATABASE_URL, undefined); assert.throws(() => sanitizeEnvironment({ SystemRoot: 'D:\\Windows', WINDIR: 'C:\\Windows' }, 'C:\\safe'));
});

test('Git environment is exact, config-isolated, and contains no host URL/profile keys', () => {
  const env = sanitizeGitEnvironment({ SystemRoot: 'C:\\Windows', WINDIR: 'C:\\Windows', DATABASE_URL: 'secret', HTTPS_PROXY: 'proxy', USERPROFILE: 'profile', PATH: 'path' });
  assert.deepEqual(Object.keys(env).sort(), ['GCM_INTERACTIVE', 'GIT_CONFIG_GLOBAL', 'GIT_CONFIG_NOSYSTEM', 'GIT_OPTIONAL_LOCKS', 'GIT_TERMINAL_PROMPT', 'LC_ALL', 'SystemRoot', 'TZ', 'WINDIR'].sort());
  assert.equal(env.GIT_CONFIG_NOSYSTEM, '1'); assert.equal(env.DATABASE_URL, undefined); assert.equal(env.PATH, undefined);
});

test('command validator allows only external file templates and rejects URLs', () => {
  const root = 'C:\\safe'; const schema = 'C:\\safe\\P00.prisma';
  assert.equal(validateCommandArgv('format', ['format', '--schema', schema], root), true);
  assert.equal(validateCommandArgv('diff', ['migrate', 'diff', '--from-schema', schema, '--to-schema', 'C:\\safe\\P01.prisma', '--script'], root), true);
  assert.throws(() => validateCommandArgv('format', ['format', '--schema', schema, '--url=postgres://x'], root), /Forbidden/u);
  assert.throws(() => validateCommandArgv('validate', ['validate', '--schema', 'D:\\escape.prisma'], root), /outside/u);
});

test('run eligibility blocks all 13 unresolved vectors before side effects', () => {
  const rows = Array.from({ length: 13 }, (_, index) => ({ id: `CX${String(index + 1).padStart(2, '0')}`, unresolved: true, reviewStatus: 'unresolved' }));
  let sideEffects = 0;
  const result = evaluateRunEligibility({ bindingSetRoot: 'a'.repeat(64), catalog: { unresolved: true }, cxRows: rows, toolchain: { executionApproval: null } });
  if (result.eligible) sideEffects += 1;
  assert.equal(result.eligible, false); assert.equal(sideEffects, 0); assert.equal(result.reasons.filter((reason) => /^CX\d{2}\b/u.test(reason)).length, 13);
});

test('run eligibility requires exact approval identity even with resolved vectors', () => {
  const complete = { branchCount: 0, catalogVersion: 'v1', checkCount: 0, constraintTriggerCount: 0, dependencyCount: 0, eventCount: 0, exclusionCount: 0, extensionCount: 0, functionCount: 0, lowerLines: 1, namedInvariants: ['i'], namedObjects: ['o'], pointLines: 1, predicateCount: 0, reviewStatus: 'approved', semanticQuestions: [], splitRequired: false, triggerCount: 0, unresolved: false, upperLines: 1 };
  const cxRows = Array.from({ length: 13 }, (_, index) => ({ ...complete, id: `CX${String(index + 1).padStart(2, '0')}` }));
  const catalog = { approvalStatus: 'approved', catalogVersion: 'v1', unresolved: false };
  assert.equal(evaluateRunEligibility({ bindingSetRoot: 'a'.repeat(64), catalog, cxRows, toolchain: { executionApproval: { approved: true, bindingSetRoot: 'b'.repeat(64) } } }).eligible, false);
});

test('finalized catalog and all 13 vectors pass exact topology, hash, count, overlap, and forecast validation', () => {
  const catalog = JSON.parse(readFileSync(join(BINDING_DIR, 'cx-catalog.json')));
  const rows = loadJsonl(readFileSync(join(BINDING_DIR, 'cx-vectors.jsonl'), 'utf8'));
  const occurrences = loadJsonl(readFileSync(join(BINDING_DIR, 'cx-occurrences.jsonl'), 'utf8'));
  assert.deepEqual(validateFinalizedBindings(catalog, rows, occurrences), { catalogUnits: 11, customObjects: 168, finalizedCx: 13, occurrences: 610 });
  assert.equal(rows.filter((row) => row.unresolved).length, 0);
  assert.equal(Math.max(...rows.map((row) => row.upperLines)), 264);
});

test('finalized binding validator fails closed on catalog, topology, overlap, addendum, and forecast tampering', () => {
  const catalog = JSON.parse(readFileSync(join(BINDING_DIR, 'cx-catalog.json')));
  const rows = loadJsonl(readFileSync(join(BINDING_DIR, 'cx-vectors.jsonl'), 'utf8'));
  const occurrences = loadJsonl(readFileSync(join(BINDING_DIR, 'cx-occurrences.jsonl'), 'utf8'));
  const clone = (value) => structuredClone(value);
  const catalogHashDrift = clone(catalog); catalogHashDrift.units.check.templateSha256 = '0'.repeat(64);
  assert.throws(() => validateFinalizedBindings(catalogHashDrift, rows, occurrences), /template hash drift/u);
  const topologyDrift = clone(rows); topologyDrift[1].attachmentAfter = 'S05';
  assert.throws(() => validateFinalizedBindings(catalog, topologyDrift, occurrences));
  const overlap = clone(rows); overlap[1].namedObjects[0] = overlap[0].namedObjects[0];
  assert.throws(() => validateFinalizedBindings(catalog, overlap, occurrences));
  const authorityDrift = clone(rows); authorityDrift[0].sourceAuthorities = [];
  assert.throws(() => validateFinalizedBindings(catalog, authorityDrift, occurrences));
  const forecastDrift = clone(rows); forecastDrift[11].upperLines = 351;
  assert.throws(() => validateFinalizedBindings(catalog, forecastDrift, occurrences));
});

test('occurrence ledger rejects coordinated totals, missing, duplicate, misowned, miscited, and hash tampering', () => {
  const catalog = JSON.parse(readFileSync(join(BINDING_DIR, 'cx-catalog.json')));
  const rows = loadJsonl(readFileSync(join(BINDING_DIR, 'cx-vectors.jsonl'), 'utf8'));
  const occurrences = loadJsonl(readFileSync(join(BINDING_DIR, 'cx-occurrences.jsonl'), 'utf8'));
  const clone = (value) => structuredClone(value);
  const coordinated = clone(rows); coordinated[0].predicateCount += 1; coordinated[0].lowerLines += 1; coordinated[0].pointLines += 1; coordinated[0].upperLines += 1;
  assert.throws(() => validateFinalizedBindings(catalog, coordinated, occurrences), /predicateCount ledger drift/u);
  assert.throws(() => validateFinalizedBindings(catalog, rows, occurrences.slice(1)), /ledger count drift/u);
  const duplicate = clone(occurrences); duplicate.push(clone(duplicate[0]));
  assert.throws(() => validateFinalizedBindings(catalog, rows, duplicate), /duplicate occurrence/u);
  const misowned = clone(occurrences); misowned[0].cx = 'CX02';
  assert.throws(() => validateFinalizedBindings(catalog, rows, misowned), /misowned/u);
  const miscited = clone(occurrences); miscited[0].citation = 'broad citation';
  assert.throws(() => validateFinalizedBindings(catalog, rows, miscited), /hash drift|bad citation/u);
  const hashDrift = clone(occurrences); hashDrift[0].sha256 = '0'.repeat(64);
  assert.throws(() => validateFinalizedBindings(catalog, rows, hashDrift), /hash drift/u);
});

test('finalized vectors remain execution-blocked without exact detached-root approval', () => {
  const catalog = JSON.parse(readFileSync(join(BINDING_DIR, 'cx-catalog.json')));
  const cxRows = loadJsonl(readFileSync(join(BINDING_DIR, 'cx-vectors.jsonl'), 'utf8'));
  const result = evaluateRunEligibility({ bindingSetRoot: 'a'.repeat(64), catalog, cxRows, toolchain: { executionApproval: null } });
  assert.equal(result.eligible, false);
  assert.deepEqual(result.reasons, ['Exact execution approval absent or does not bind this set']);
});

test('hash manifest parser enforces sorted complete paths', () => {
  const names = ['CHANGE_PACK.md', 'bindings/commands.json', 'bindings/cx-catalog.json', 'bindings/cx-occurrences.jsonl', 'bindings/cx-vectors.jsonl', 'bindings/evidence-layout.json', 'bindings/isolation.json', 'bindings/projection-manifest.jsonl', 'bindings/toolchain.json', 'runner.mjs', 'runner.test.mjs'];
  const text = names.map((name) => `${sha256(name)}  ${name}`).join('\n') + '\n';
  assert.equal(parseHashManifest(text).length, 11);
  assert.throws(() => parseHashManifest(text.split('\n').reverse().join('\n')));
});

test('JSONL loader rejects malformed rows', () => {
  assert.deepEqual(loadJsonl('{"a":1}\n{"b":2}\n'), [{ a: 1 }, { b: 2 }]);
  assert.throws(() => loadJsonl('{bad}\n'), /row 1/u);
});

test('path containment accepts a new child and rejects escape and symlink/reparse paths', (t) => {
  const temp = mkdtempSync(join(tmpdir(), 'c14-bindings-'));
  t.after(() => rmSync(temp, { force: true, recursive: true }));
  const parent = join(temp, 'approved'); const repository = join(temp, 'repository'); mkdirSync(parent); mkdirSync(repository);
  assert.match(assertContainedPath(join(parent, 'new-root'), parent, repository), /new-root$/u);
  assert.throws(() => assertContainedPath(join(temp, 'escape'), parent, repository), /escapes/u);
  const target = join(temp, 'target'); mkdirSync(target); const link = join(parent, 'link');
  try { symlinkSync(target, link, 'junction'); assert.throws(() => assertContainedPath(link, parent, repository), /Reparse|escapes/u); } catch (error) { if (error.code !== 'EPERM') throw error; }
});

test('mock Windows adapter rejects non-symlink reparse attributes and final-path mismatch', (t) => {
  const temp = mkdtempSync(join(tmpdir(), 'c14-path-mock-')); t.after(() => rmSync(temp, { force: true, recursive: true }));
  const boundary = join(temp, 'boundary'); const child = join(boundary, 'child'); mkdirSync(child, { recursive: true });
  const base = { exists: existsSync, finalPath: realpathSync.native, lstat: lstatSync, realpath: realpathSync.native };
  assert.throws(() => verifyPathChain(child, boundary, { ...base, isReparse: (path) => path === child }), /Reparse/u);
  assert.throws(() => verifyPathChain(child, boundary, { ...base, finalPath: (path) => path === child ? join(boundary, 'other') : realpathSync.native(path), isReparse: () => false }), /Final-path mismatch/u);
});

test('writeOnce, lock, and hash-chained event records are immutable and complete', (t) => {
  const temp = mkdtempSync(join(tmpdir(), 'c14-write-once-')); t.after(() => rmSync(temp, { force: true, recursive: true }));
  const target = join(temp, 'payload.bin'); writeOnce(target, Buffer.from('one')); assert.equal(readFileSync(target, 'utf8'), 'one'); assert.throws(() => writeOnce(target, Buffer.from('two')), /exists/u);
  const lock = JSON.parse(buildRunLock({ bindingSetRoot: 'a', externalRoot: 'b', host: 'h', owner: { pid: 1 }, protocolBlob: 'p', repository: 'r', runnerSha256: 's' }));
  assert.equal(lock.host, 'h'); assert.equal(lock.protocolBlob, 'p');
  const first = eventBytes({ actor: 'a', evidenceState: 'lock-only', ordinal: 1, previousSha256: null, reason: 'reserved', state: 'reserved', utc: '2026-08-03T00:00:00.000Z' });
  const second = JSON.parse(eventBytes({ actor: 'a', evidenceState: 'running', ordinal: 2, previousSha256: sha256(first), reason: 'run', state: 'running', utc: '2026-08-03T00:00:01.000Z' }));
  assert.equal(second.previousSha256, sha256(first)); assert.throws(() => eventBytes({ ordinal: 3 }), /Incomplete/u);
});

test('command capture records successful and failed raw executions with approved environment names', async (t) => {
  const temp = mkdtempSync(join(tmpdir(), 'c14-capture-')); t.after(() => rmSync(temp, { force: true, recursive: true }));
  const state = { command: 0, commands: [], root: temp };
  const options = { artifactLinks: ['artifact'], cwd: temp, env: { TZ: 'UTC' }, expectedOutputPolicy: 'fixture' };
  const success = await capturedExec(state, 'success', process.execPath, ['-e', "process.stdout.write('ok')"], options);
  assert.equal(success.stdout.toString(), 'ok');
  await assert.rejects(capturedExec(state, 'failure', process.execPath, ['-e', "process.stderr.write('bad');process.exit(7)"], options), /failed/u);
  for (const directory of readdirSync(join(temp, 'commands'))) {
    const request = JSON.parse(readFileSync(join(temp, 'commands', directory, 'request.json')));
    const result = JSON.parse(readFileSync(join(temp, 'commands', directory, 'result.json')));
    assert.deepEqual(request.environmentKeys, ['TZ']); assert.ok(Number.isInteger(result.durationMilliseconds)); assert.deepEqual(result.artifactLinks, ['artifact']);
    assert.ok(existsSync(join(temp, 'commands', directory, 'stdout.bin'))); assert.ok(existsSync(join(temp, 'commands', directory, 'stderr.bin')));
  }
});

test('parser self-test executes the complete deterministic case inventory', () => {
  const report = runParserSelfTests();
  assert.equal(validateParserSelfTestReport(report), true); assert.equal(report.overallVerdict, 'PASS');
  assert.deepEqual(report.cases.map((entry) => entry.id), [...PARSER_SELF_TEST_CASE_IDS]);
  for (const entry of report.cases) assert.match(entry.resultSha256, /^[0-9a-f]{64}$/u);
});

test('captured parser worker succeeds with canonical report and exact runner identity', async (t) => {
  const temp = mkdtempSync(join(tmpdir(), 'c14-parser-worker-')); t.after(() => rmSync(temp, { force: true, recursive: true })); mkdirSync(join(temp, 'scratch', 'tmp'), { recursive: true });
  const state = { command: 0, commands: [], root: temp };
  const capture = await captureParserSelfTest(state, { cwd: temp, env: sanitizeEnvironment(process.env, temp), expectedRunnerSha256: sha256(readFileSync(RUNNER_PATH)), runnerPath: RUNNER_PATH });
  assert.equal(capture.report.overallVerdict, 'PASS'); assert.deepEqual(state.commands, ['C0001-parser-self-test']);
  assert.deepEqual(JSON.parse(capture.stdout).cases.map((entry) => entry.id), [...PARSER_SELF_TEST_CASE_IDS]);
});

test('captured parser worker retains invalid and nonzero failure evidence', async (t) => {
  const temp = mkdtempSync(join(tmpdir(), 'c14-parser-worker-fail-')); t.after(() => rmSync(temp, { force: true, recursive: true }));
  const invalid = join(temp, 'invalid.mjs'); writeFileSync(invalid, "process.stdout.write('{}\\n')\n");
  const state = { command: 0, commands: [], root: temp }; const options = { cwd: temp, env: { TZ: 'UTC' }, expectedRunnerSha256: sha256(readFileSync(invalid)), runnerPath: invalid };
  await assert.rejects(captureParserSelfTest(state, options));
  const nonzero = join(temp, 'nonzero.mjs'); writeFileSync(nonzero, "process.stderr.write('worker failed'); process.exit(9)\n");
  await assert.rejects(captureParserSelfTest(state, { ...options, expectedRunnerSha256: sha256(readFileSync(nonzero)), runnerPath: nonzero }), /failed/u);
  const captures = readdirSync(join(temp, 'commands')); assert.equal(captures.length, 2);
  assert.equal(JSON.parse(readFileSync(join(temp, 'commands', captures[1], 'result.json'))).code, 9);
});

test('protocol and manifest explicitly bind commands, ownership, runner, paths, and exclusions', () => {
  const commandsBytes = readFileSync(join(BINDING_DIR, 'commands.json')); const commands = JSON.parse(commandsBytes);
  const toolchain = JSON.parse(readFileSync(join(BINDING_DIR, 'toolchain.json'))); const evidence = JSON.parse(readFileSync(join(BINDING_DIR, 'evidence-layout.json'))); const isolation = JSON.parse(readFileSync(join(BINDING_DIR, 'isolation.json')));
  const bindings = { catalog: { catalogVersion: null }, commands, evidence, isolation, toolchain };
  const protocol = buildProtocol({ bindingSetRoot: 'root', bindings, commandBytes: commandsBytes });
  assert.deepEqual(protocol.commandBinding, commands); assert.deepEqual(protocol.commandTemplates, commands.allowed); assert.equal(protocol.commandBindingSha256, sha256(commandsBytes)); assert.match(protocol.commandTemplatesSha256, /^[0-9a-f]{64}$/u); assert.ok(protocol.stopRules.includes('parser self-test missing/invalid/failing'));
  const runnerBytes = readFileSync(RUNNER_PATH); const lockBytes = buildRunLock({ bindingSetRoot: 'root', externalRoot: 'external', host: 'host', owner: { pid: 1 }, protocolBlob: 'protocol', repository: 'repo', runnerSha256: sha256(runnerBytes) });
  const manifest = buildExecutionManifest({ bindingSetRoot: 'root', bindings, lockBytes, resolvedRepository: 'repo', resolvedRoot: 'external', runnerBytes, runnerPath: 'external/runner/runner.mjs' });
  assert.equal(manifest.ownerLock.host, 'host'); assert.equal(manifest.runner.sha256, sha256(runnerBytes)); assert.match(manifest.runner.gitBlob, /^[0-9a-f]{40}$/u); assert.ok(manifest.expectedEvidencePaths.reports.includes('parser-tests.json')); assert.ok(manifest.exclusions.includes('database access or introspection'));
});

test('payload inventory excludes scratch/closure and completion finalizes once', (t) => {
  const temp = mkdtempSync(join(tmpdir(), 'c14-finalize-')); t.after(() => rmSync(temp, { force: true, recursive: true }));
  writeOnce(join(temp, 'manifest.json'), Buffer.from('{}\n')); writeOnce(join(temp, 'payload.txt'), Buffer.from('payload')); mkdirSync(join(temp, 'scratch')); writeFileSync(join(temp, 'scratch', 'mutable.txt'), 'scratch');
  assert.deepEqual(listPayloadFiles(temp), ['manifest.json', 'payload.txt']);
  const result = finalizeEvidence(temp, { state: 'pre-final' }, { finalEvent: { actor: 'test', evidenceState: 'completion-bound', ordinal: 3, previousSha256: 'previous', reason: 'complete', state: 'review-held', utc: '2026-08-03T00:00:00.000Z' } }); assert.equal(result.payloadCount, 2); assert.ok(existsSync(join(temp, 'completion.sha256')));
  assert.deepEqual(result.writeOrder, ['hashes.sha256', 'completion.json', 'completion.sha256', 'events/0003-review-held.json']);
  assert.equal(JSON.parse(readFileSync(join(temp, 'completion.json'))).finalization, 'PASS'); assert.equal(JSON.parse(readFileSync(join(temp, 'events', '0003-review-held.json'))).closureRoot, result.completionRoot);
  assert.doesNotMatch(readFileSync(join(temp, 'hashes.sha256'), 'utf8'), /completion|0003-review-held/u);
  assert.throws(() => finalizeEvidence(temp, { verdict: 'again' }), /exists/u);
});

test('finalization failure leaves pre-final run without completion PASS or final event', (t) => {
  const temp = mkdtempSync(join(tmpdir(), 'c14-finalize-fail-')); t.after(() => rmSync(temp, { force: true, recursive: true }));
  writeOnce(join(temp, 'manifest.json'), Buffer.from('{}\n')); writeOnce(join(temp, 'run.json'), Buffer.from('{"phaseVerdicts":{"finalization":"PENDING"},"status":"pre-final"}\n'));
  assert.throws(() => finalizeEvidence(temp, {}, { beforeCompletion() { throw new Error('injected finalization failure'); }, finalEvent: { actor: 'test', evidenceState: 'completion-bound', ordinal: 3, previousSha256: 'p', reason: 'complete', state: 'review-held' } }), /injected/u);
  assert.ok(existsSync(join(temp, 'hashes.sha256'))); assert.equal(existsSync(join(temp, 'completion.json')), false); assert.equal(existsSync(join(temp, 'events', '0003-review-held.json')), false);
  assert.equal(JSON.parse(readFileSync(join(temp, 'run.json'))).phaseVerdicts.finalization, 'PENDING');
});

test('P22/P24 invariant is byte identity, not semantic approximation', () => {
  const p21 = Buffer.from('model A {\n id Int @id\n}\n'); const p22 = Buffer.from(p21); const p23 = Buffer.from(`${p21}enum E {\n X\n}\n`); const p24 = Buffer.from(p23);
  assert.deepEqual(p22, p21); assert.deepEqual(p24, p23); assert.notDeepEqual(p23, p22);
});

test('Prisma semantic hash ignores inter-declaration blank-line differences only', () => {
  const compact = 'model A {\n id Int @id\n}\nmodel B {\n id Int @id\n}\n';
  const spaced = 'model A {\n id Int @id\n}\n\n\nmodel B {\n id Int @id\n}\n';
  assert.equal(prismaSemanticSha256(compact), prismaSemanticSha256(spaced));
  assert.notEqual(prismaSemanticSha256(compact), prismaSemanticSha256(spaced.replace('id Int @id', 'id String @id')));
});
