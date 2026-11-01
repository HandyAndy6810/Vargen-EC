import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { labourLineCost } from './labour-cost';
import { unitSell } from '../../shared/money';

describe('labourLineCost', () => {
  test('markup on labour: the rate is the cost, as before', () => {
    assert.equal(labourLineCost({ rate: 150, markupLabour: true, costRate: 60 }), 150);
  });
  test('markup off: what an hour costs you, when set and within the rate', () => {
    assert.equal(labourLineCost({ rate: 150, markupLabour: false, costRate: 60 }), 60);
  });
  test('markup off with no hour cost, or one above the rate: unknown', () => {
    assert.equal(labourLineCost({ rate: 150, markupLabour: false, costRate: null }), null);
    assert.equal(labourLineCost({ rate: 150, markupLabour: false, costRate: 200 }), null);
  });
  test('no rate: nothing to impose', () => {
    assert.equal(labourLineCost({ rate: null, markupLabour: true, costRate: 60 }), null);
  });

  test('a build from before the setting gets $150/hr, not $270', () => {
    // It sends neither markupLabour nor labourCostRate, and its money code had no
    // labour rule: any line with a cost was marked up. Simulate that with
    // markupLabour = true in unitSell, i.e. the old behaviour.
    const cost = labourLineCost({ rate: 150, markupLabour: false, costRate: null });
    const line = { qty: '2', price: '150', cost: cost == null ? undefined : String(cost), category: 'labour' };
    assert.equal(unitSell(line, 80, true), 150);
  });
});
