import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { mixHex } from './color';

// Each channel within 1 of the expected hex: the brief's table was mixed by hand.
const near = (got: string, want: string) => {
  const ch = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [g, w] = [ch(got), ch(want)];
  assert.ok(g.every((v, i) => Math.abs(v - w[i]) <= 1), `${got} vs ${want}`);
};

describe('mixHex', () => {
  test('the ends are the inputs', () => {
    assert.equal(mixHex('#F26A2A', '#F2F2F0', 1), '#F26A2A');
    assert.equal(mixHex('#F26A2A', '#F2F2F0', 0), '#F2F2F0');
  });
  test('reproduces the approved Home gradient, light (orange into paper at 100/60/18/0%)', () => {
    near(mixHex('#F26A2A', '#F2F2F0', 0.6), '#F2A079');
    near(mixHex('#F26A2A', '#F2F2F0', 0.18), '#F2DACC');
  });
  test('reproduces the approved Home gradient, dark (78/42/12/0%)', () => {
    near(mixHex('#F26A2A', '#141416', 0.78), '#C15726');
    near(mixHex('#F26A2A', '#141416', 0.42), '#71381E');
    near(mixHex('#F26A2A', '#141416', 0.12), '#2F1E18');
  });
  test('accepts lower-case and clamps t', () => {
    assert.equal(mixHex('#f26a2a', '#141416', 2), '#F26A2A');
    assert.equal(mixHex('#f26a2a', '#141416', -1), '#141416');
  });
  test('refuses non-hex input rather than producing garbage', () => {
    assert.throws(() => mixHex('rgba(0,0,0,1)', '#000000', 0.5));
  });
});
