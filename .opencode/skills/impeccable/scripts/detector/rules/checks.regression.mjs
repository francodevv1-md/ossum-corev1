import assert from 'node:assert/strict';
import test from 'node:test';

import { finding } from '../findings.mjs';
import { detectText } from '../engines/regex/detect-text.mjs';
import { isAdvisoryRule } from '../registry/antipatterns.mjs';
import {
  checkElementBlinkingCursorDOM,
  checkEmDashOveruse,
  parseAnyColor,
  scanCssTextForGlow,
  scanCssTextForInsetStripe,
  scanCssTextForPseudoStripe,
  scanCssTextForPulsingDot,
} from './checks.mjs';

test('registry advisory severity is propagated to CLI findings', () => {
  const flagged = finding('em-dash-overuse', 'fixture.html', 'fixture');
  const severity = finding('blinking-cursor', 'fixture.html', 'fixture');
  assert.equal(flagged.advisory, true);
  assert.equal(severity.severity, 'advisory');
  assert.equal(severity.advisory, true);
  assert.equal(isAdvisoryRule('blinking-cursor'), true);
});

test('CSS RGB parsing supports percentage channels and alpha', () => {
  assert.deepEqual(parseAnyColor('rgb(100% 0% 0%)'), { r: 255, g: 0, b: 0, a: 1 });
  assert.deepEqual(parseAnyColor('rgb(255 0 0 / 50%)'), { r: 255, g: 0, b: 0, a: 0.5 });
});

test('em-dash advisory counts spaced double hyphens', () => {
  assert.equal(checkEmDashOveruse('word -- '.repeat(8)).length, 1);
  const findings = detectText(
    `<!doctype html><html><head><title>Test</title></head><body><p>${'word -- '.repeat(8)}</p></body></html>`,
    'page.html',
  );
  assert.equal(findings.some(item => item.antipattern === 'em-dash-overuse'), true);
});

test('standalone CSS runs page-independent visual analyzers', () => {
  const css = `body { background: #111111; } .chip { box-shadow: 4px 4px 8px #ff0000; }`;
  const findings = detectText(css, 'styles.css');
  assert.equal(findings.some(item => item.antipattern === 'dark-glow'), true);
});

test('blinking cursor detection pairs animation names with iteration counts', () => {
  const previousDocument = globalThis.document;
  const previousGetComputedStyle = globalThis.getComputedStyle;
  globalThis.document = { styleSheets: [] };
  globalThis.getComputedStyle = () => ({
    animationIterationCount: '1, infinite',
    animationName: 'blink, slide',
  });

  try {
    const element = { tagName: 'SPAN' };
    assert.deepEqual(checkElementBlinkingCursorDOM(element), []);
  } finally {
    globalThis.document = previousDocument;
    globalThis.getComputedStyle = previousGetComputedStyle;
  }
});

test('dark component backgrounds do not mark a light page as dark', () => {
  const css = `
    body { background: #ffffff; }
    .chip { background: #111111; box-shadow: 4px 4px 8px #ff0000; }
  `;

  assert.deepEqual(scanCssTextForGlow(css), []);
});

test('dark root backgrounds still enable dark-page glow detection', () => {
  const css = `
    body { background: #111111; }
    .chip { box-shadow: 4px 4px 8px #ff0000; }
  `;

  assert.equal(scanCssTextForGlow(css).length, 1);
});

test('bright saturated root colors are not classified as dark', () => {
  const css = `
    body { background: #20ffff; }
    .chip { box-shadow: 4px 4px 8px #ff0000; }
  `;

  assert.deepEqual(scanCssTextForGlow(css), []);
});

test('qualified and single-quoted body roots are detected', () => {
  const qualified = `body.dark { background: #111111; } .chip { box-shadow: 4px 4px 8px #ff0000; }`;
  const inline = `<body style='background: #111111'><div style="box-shadow: 4px 4px 8px #ff0000"></div></body>`;

  assert.equal(scanCssTextForGlow(qualified).length, 1);
  assert.equal(scanCssTextForGlow(inline).length, 1);
});

test('selected vertical pseudo stripes remain valid state indicators', () => {
  const css = `
    .tab.active::before {
      position: absolute;
      width: 4px;
      height: 100%;
      left: 0;
      background: #ff0000;
    }
  `;

  assert.deepEqual(scanCssTextForPseudoStripe(css), []);
});

test('status-region pseudo and inset stripes are exempt', () => {
  const css = `
    [role="status"]::before {
      position: absolute;
      width: 4px;
      height: 100%;
      left: 0;
      background: #ff0000;
    }
    [aria-live="polite"] {
      box-shadow: inset 4px 0 0 #ff0000;
    }
  `;

  assert.deepEqual(scanCssTextForPseudoStripe(css), []);
  assert.deepEqual(scanCssTextForInsetStripe(css), []);
});

test('Tailwind pulsing dots require size or both dimensions', () => {
  const oneDimension = '<span class="animate-pulse rounded-full w-2"></span>';
  const square = '<span class="animate-pulse rounded-full w-2 h-2"></span>';

  assert.deepEqual(scanCssTextForPulsingDot(oneDimension), []);
  assert.equal(scanCssTextForPulsingDot(square).length, 1);
});

test('static pulsing-dot detection pairs names with iteration counts', () => {
  const css = `
    @keyframes pulse { from { opacity: 1; } to { opacity: 0; } }
    @keyframes slide { from { transform: translateX(0); } to { transform: translateX(10px); } }
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      animation-name: pulse, slide;
      animation-iteration-count: 1, infinite;
    }
  `;

  assert.deepEqual(scanCssTextForPulsingDot(css), []);
});
