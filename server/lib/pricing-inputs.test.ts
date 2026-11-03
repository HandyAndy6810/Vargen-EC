import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { resolvePricingInputs, enforceCallOut } from './pricing-inputs';

describe('resolvePricingInputs', () => {
  const saved = { tradeType: 'Plumber', labourRate: 150, markupPercent: 80, markupLabour: true, labourCostRate: 60, callOutFee: 120, callOutFeeEnabled: true, includeGST: true };
  const staleBody = { labourRate: 85, markupPercent: 15, markupLabour: false, callOutFee: 80, includeGST: false };

  test('the saved settings win over what the app sent (q5, q6, st4)', () => {
    const p = resolvePricingInputs(saved, staleBody);
    assert.equal(p.labourRate, 150);
    assert.equal(p.markupPercent, 80);
    assert.equal(p.markupLabour, true);
    assert.equal(p.callOutFee, 120);
    assert.equal(p.includeGST, true);
  });
  test('call-out switched off means no fee, whatever amount is saved or sent', () => {
    assert.equal(resolvePricingInputs({ ...saved, callOutFeeEnabled: false }, staleBody).callOutFee, 0);
  });
  test('no settings row: the body is used', () => {
    const p = resolvePricingInputs(null, { labourRate: 95, markupPercent: 20, includeGST: true, callOutFee: 50 });
    assert.equal(p.labourRate, 95);
    assert.equal(p.markupPercent, 20);
    assert.equal(p.callOutFee, 50);
  });
  test('nonsense is ignored', () => {
    const p = resolvePricingInputs({ labourRate: -5, markupPercent: -1, labourCostRate: 0 }, {});
    assert.equal(p.labourRate, null);
    assert.equal(p.markupPercent, 0);
    assert.equal(p.labourCostRate, null);
  });
});

describe('enforceCallOut', () => {
  const labour = { description: 'Labour', unitPrice: 150 };
  test('adds exactly one line at the saved fee when the AI left it out', () => {
    const out = enforceCallOut([labour], 120);
    assert.equal(out.filter((i: any) => /call-out/i.test(i.description)).length, 1);
    assert.equal((out.at(-1) as any).unitPrice, 120);
  });
  test('replaces the AI\'s own call-out lines (wrong price, or two of them)', () => {
    const out = enforceCallOut([labour, { description: 'Call out fee', unitPrice: 99 }, { description: 'Travel fee', unitPrice: 40 }], 120);
    const fees = out.filter((i: any) => /call[\s-]?out|travel/i.test(i.description));
    assert.equal(fees.length, 1);
    assert.equal((fees[0] as any).unitPrice, 120);
  });
  test('switched off: none, even if the AI added one', () => {
    assert.deepEqual(enforceCallOut([labour, { description: 'Callout fee', unitPrice: 80 }], 0), [labour]);
  });
  test('leaves ordinary lines alone', () => {
    const items = [labour, { description: 'Colorbond panel', unitPrice: 180 }];
    assert.equal(enforceCallOut(items, 0).length, 2);
  });
});
