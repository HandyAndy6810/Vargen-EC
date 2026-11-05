import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splashSquare, gapTarget, gapEnds, arcControl, quadAt, BOLT_HEIGHT_RATIO } from './intro-geometry';

const close = (a: number, b: number, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);

test('splash square is centred on the screen', () => {
  assert.deepEqual(splashSquare({ width: 390, height: 844 }, 200), { x: 95, y: 322, width: 200, height: 200 });
  close(200 * BOLT_HEIGHT_RATIO, 160); // the splash bolt is 160 pt tall
});

test('the gap is centred on the button and sized from its height', () => {
  // iPhone 14: button 350 wide, height clamp(round(350*0.24), 80, 96) = 84.
  const button = { x: 20, y: 300, width: 350, height: 84 };
  const t = gapTarget(button, 200);
  assert.deepEqual(t.center, { x: 195, y: 342 });
  close(t.gapHeight, 116 * 84 / 132);   // 73.8 px tip to tip
  close(t.scale, t.gapHeight / 160);     // ~0.461 of the splash bolt
});

test('the gap ends are the tips, 116 units apart', () => {
  const button = { x: 0, y: 0, width: 400, height: 132 }; // 1 unit = 1 px
  const e = gapEnds(button);
  assert.deepEqual(e.top, { x: 208, y: 8 });
  assert.deepEqual(e.bottom, { x: 192, y: 124 });
});

test('arc 0 is a straight line; the curve starts and ends at the ends', () => {
  const a = { x: 0, y: 0 }, b = { x: 0, y: 100 };
  assert.deepEqual(arcControl(a, b, 0), { x: 0, y: 50 });
  const c = arcControl(a, b, 0.34);
  close(c.x, -34); close(c.y, 50);   // bows sideways by 0.34 of the distance
  assert.deepEqual(quadAt(a, c, b, 0), a);
  const end = quadAt(a, c, b, 1); close(end.x, b.x); close(end.y, b.y);
});
