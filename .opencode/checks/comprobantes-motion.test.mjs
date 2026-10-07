// Run: node .opencode/checks/comprobantes-motion.test.mjs
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const path = 'src/components/expediente/ComprobantesAsociados.tsx';
const source = readFileSync(path, 'utf8').replaceAll('\r\n', '\n');
const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
assert.equal(file.parseDiagnostics.length, 0, 'Invalid TSX');
const hash = value => createHash('sha256').update(value).digest('hex');
const prefix = source.slice(0, source.indexOf('\n  return (\n')).replace('  const [pointerMotion, setPointerMotion] = useState(false)\n', '');
// Baseline eb489b0 includes the separately committed remito PDF integration.
assert.equal(hash(prefix), '1f4d37ced538d64e548748e31712f4ff09eb5c55d0002a7cc9aea59de7202ab9', 'Data/filter/printing/PDF logic changed');
const events = [];
const properties = {};
function visit(node) {
  if (ts.isJsxAttribute(node) && /^(onClick|onChange|onSelect|disabled)$/.test(node.name.getText(file))) events.push(node.getText(file));
  if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(file) === 'motion.span') {
    for (const prop of node.attributes.properties) {
      if (ts.isJsxAttribute(prop) && ['layoutId', 'transition'].includes(prop.name.getText(file))) properties[prop.name.getText(file)] = prop.initializer.expression.getText(file);
    }
  }
  ts.forEachChild(node, visit);
}
visit(file);
assert.equal(hash(JSON.stringify(events)), '5b6bcd9854bde3be4d1ef4e16badfdbf1c7f45d143d72c3edcec03ead5d958f2', 'Business event/disabled behavior changed');
const evaluate = expression => new Function('reducedMotion', 'pointerMotion', 'indicatorId', `return (${expression});`);
for (const reduced of [false, true]) for (const pointer of [false, true]) {
  const enabled = !reduced && pointer;
  assert.equal(evaluate(properties.layoutId)(reduced, pointer, 'indicator'), enabled ? 'indicator' : undefined);
  assert.deepEqual(evaluate(properties.transition)(reduced, pointer, 'indicator'), enabled ? { type: 'spring', duration: 0.22, bounce: 0 } : { duration: 0 });
}
assert(source.includes('onPointerDownCapture={() => setPointerMotion(true)} onKeyDownCapture={() => setPointerMotion(false)}'));
assert(!source.includes('motion.tr'), 'Rows should render immediately without entrance choreography');
assert(source.includes('motion-safe:[&:not(:focus-visible):active]:scale-[0.98]'));
assert(source.includes('motion-reduce:transition-none focus-visible:transition-none'));
console.log('PASS: pointer/keyboard/reduced-motion branches, immediate rows, syntax and preserved business logic. Browser acceptance not covered.');
