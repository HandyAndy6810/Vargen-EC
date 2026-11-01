import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { generationInput, cleanDraftKey, cleanGenerationId, captureGeneration } from './ai-capture';

describe('generationInput', () => {
  test('keeps the description, settings and clarify answers', () => {
    const got = JSON.parse(generationInput({
      description: 'Replace HWS', tradeType: 'Plumber', labourRate: 150, markupPercent: 80,
      markupLabour: false, labourCostRate: 60, callOutFee: 80, includeGST: true, targetPrice: 2000,
      clarifyAnswers: [{ q: 'Size?', a: '250L' }],
    }));
    assert.equal(got.description, 'Replace HWS');
    assert.equal(got.chargeOutRate, 150);
    assert.equal(got.markupLabour, false);
    assert.deepEqual(got.clarifyAnswers, [{ q: 'Size?', a: '250L' }]);
  });

  test('never stores image data, only that there was one', () => {
    const raw = generationInput({ description: 'x', imageBase64: 'data:image/jpeg;base64,AAAA' });
    assert.ok(!raw.includes('AAAA'));
    assert.equal(JSON.parse(raw).hadImage, true);
  });

  test('drops anything not on the list', () => {
    assert.ok(!generationInput({ description: 'x', password: 'hunter2' } as any).includes('hunter2'));
  });
});

describe('cleanDraftKey / cleanGenerationId', () => {
  test('draft keys are trimmed, capped, or null', () => {
    assert.equal(cleanDraftKey('  abc '), 'abc');
    assert.equal(cleanDraftKey('x'.repeat(500))!.length, 100);
    assert.equal(cleanDraftKey(''), null);
    assert.equal(cleanDraftKey(42), null);
  });
  test('generation ids are positive integers, or null', () => {
    assert.equal(cleanGenerationId(7), 7);
    assert.equal(cleanGenerationId('7'), 7);
    assert.equal(cleanGenerationId(0), null);
    assert.equal(cleanGenerationId(1.5), null);
    assert.equal(cleanGenerationId('abc'), null);
    assert.equal(cleanGenerationId(undefined), null);
  });
});

describe('captureGeneration', () => {
  test('returns the new id', async () => {
    assert.equal(await captureGeneration(async () => ({ id: 12 })), 12);
  });

  test('a failing insert returns null and is logged, never thrown', async () => {
    const logged: unknown[] = [];
    const id = await captureGeneration(
      async () => { throw new Error('relation "ai_generations" does not exist'); },
      (_m, e) => logged.push(e),
    );
    assert.equal(id, null);
    assert.equal(logged.length, 1);
  });
});
