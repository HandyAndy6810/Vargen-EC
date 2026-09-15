import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { checkLinePrice, packSizeOf, PRICE_BANDS } from './price-sanity';

/**
 * Two things are being tested, and the second matters more.
 *
 *  1. That an absurd price is caught.
 *  2. That an ORDINARY price is not. A band that fires on normal variation trains
 *     tradies to ignore warnings, at which point the whole mechanism is worse than
 *     nothing. Every "does not flag" test below is guarding against that.
 */

describe('packSizeOf', () => {
  test('reads a pack size out of a description', () => {
    assert.equal(packSizeOf('5L paint bucket', 'L'), 5);
    assert.equal(packSizeOf('Dulux Wash&Wear 10 litre', 'L'), 10);
    assert.equal(packSizeOf('20kg bag of cement', 'kg'), 20);
    assert.equal(packSizeOf('2.7m copper pipe', 'm'), 2.7);
  });

  test('returns null rather than guessing', () => {
    assert.equal(packSizeOf('paint bucket', 'L'), null);
    assert.equal(packSizeOf('', 'L'), null);
  });

  test('does not read m² as m', () => {
    assert.equal(packSizeOf('18 m2 of membrane', 'm'), null);
    assert.equal(packSizeOf('18 m2 of membrane', 'm2'), 18);
  });
});

describe('the paint case that started this', () => {
  test('a 5L tin at $20 is flagged as too low', () => {
    // The real one: $20 for 5L is $4/L, when paint is nearer $30/L.
    const flag = checkLinePrice({ description: '5L paint bucket', unitPrice: 20, unit: 'ea' });
    assert.ok(flag, 'should be flagged');
    assert.equal(flag!.direction, 'low');
    assert.match(flag!.message, /per l/i);
  });

  test('a 5L tin at $150 is left alone', () => {
    assert.equal(checkLinePrice({ description: '5L paint bucket', unitPrice: 150, unit: 'ea' }), null);
  });

  test('a 10L tin at $220 is left alone', () => {
    assert.equal(checkLinePrice({ description: 'Interior low sheen paint 10L', unitPrice: 220, unit: 'ea' }), null);
  });

  test('paint with no pack size is not judged at all', () => {
    // Without a size there is nothing to divide by, and inventing one would be the
    // very thing this file exists to prevent.
    assert.equal(checkLinePrice({ description: 'paint', unitPrice: 20, unit: 'ea' }), null);
  });

  test('a paint BRUSH is not treated as paint', () => {
    assert.equal(checkLinePrice({ description: '100mm paint brush', unitPrice: 12, unit: 'ea' }), null);
  });
});

describe('labour', () => {
  test('$3 an hour is flagged', () => {
    const flag = checkLinePrice({ description: 'Labour — install downlights', unitPrice: 3, unit: 'hr' });
    assert.ok(flag);
    assert.equal(flag!.direction, 'low');
  });

  test('$2,000 an hour is flagged', () => {
    const flag = checkLinePrice({ description: 'Labour — install downlights', unitPrice: 2000, unit: 'hr' });
    assert.ok(flag);
    assert.equal(flag!.direction, 'high');
  });

  test('ordinary trade rates are left alone', () => {
    for (const rate of [55, 70, 85, 110, 150]) {
      assert.equal(
        checkLinePrice({ description: 'Labour — strip out and install', unitPrice: rate, unit: 'hr' }),
        null,
        `$${rate}/hr should not be flagged`,
      );
    }
  });

  test('a labour line priced per job is not judged against an hourly band', () => {
    assert.equal(
      checkLinePrice({ description: 'Labour — full bathroom install', unitPrice: 4200, unit: 'lot' }),
      null,
    );
  });
});

describe('other bands', () => {
  test('tiles at $2/m² are flagged, at $60/m² are not', () => {
    assert.ok(checkLinePrice({ description: 'Porcelain floor tiles', unitPrice: 2, unit: 'm2' }));
    assert.equal(checkLinePrice({ description: 'Porcelain floor tiles', unitPrice: 60, unit: 'm2' }), null);
  });

  test('tile adhesive is not judged as tiles', () => {
    assert.equal(checkLinePrice({ description: 'Tile adhesive 20kg', unitPrice: 45, unit: 'ea' }), null);
  });

  test('a downlight at $0.50 is flagged, at $35 is not', () => {
    assert.ok(checkLinePrice({ description: 'LED downlight', unitPrice: 0.5, unit: 'ea' }));
    assert.equal(checkLinePrice({ description: 'LED downlight', unitPrice: 35, unit: 'ea' }), null);
  });

  test('a skip bin at $15 is flagged, at $450 is not', () => {
    assert.ok(checkLinePrice({ description: 'Skip bin hire and tip fees', unitPrice: 15, unit: 'ea' }));
    assert.equal(checkLinePrice({ description: 'Skip bin hire and tip fees', unitPrice: 450, unit: 'ea' }), null);
  });
});

describe('restraint', () => {
  test('an unrecognised item is never flagged', () => {
    assert.equal(checkLinePrice({ description: 'Bespoke brass fitting, made to order', unitPrice: 1, unit: 'ea' }), null);
    assert.equal(checkLinePrice({ description: 'Scaffold hire', unitPrice: 9000, unit: 'ea' }), null);
  });

  test('a zero or missing price is not flagged', () => {
    // A $0 line is a deliberate inclusion, not a pricing error.
    assert.equal(checkLinePrice({ description: '5L paint', unitPrice: 0, unit: 'ea' }), null);
    assert.equal(checkLinePrice({ description: '5L paint', unitPrice: undefined, unit: 'ea' }), null);
    assert.equal(checkLinePrice({ description: '5L paint', unitPrice: 'abc', unit: 'ea' }), null);
  });

  test('an empty description is not flagged', () => {
    assert.equal(checkLinePrice({ description: '', unitPrice: 20, unit: 'ea' }), null);
  });

  test('every band is wide enough to be an absurdity check, not a price guide', () => {
    // A band narrower than 3x is too close to being an estimate, and will fire on
    // ordinary variation between suppliers and cities.
    for (const b of PRICE_BANDS) {
      assert.ok(b.max / b.min >= 3, `band "${b.id}" is too narrow (${b.min}–${b.max})`);
    }
  });
});
