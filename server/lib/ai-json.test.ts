import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { extractJsonObject, receiptTotal } from './ai-json';

const RECEIPT = { vendor: 'Bunnings', date: '2026-09-28', total: 84.5 };

describe('extractJsonObject', () => {
  test('plain JSON', () => {
    assert.deepEqual(extractJsonObject(JSON.stringify(RECEIPT)), RECEIPT);
  });
  test('in a ```json fence', () => {
    assert.deepEqual(extractJsonObject('```json\n' + JSON.stringify(RECEIPT) + '\n```'), RECEIPT);
  });
  test('after a reasoning model thinks out loud', () => {
    const raw = '<think>The total looks like 84.50, the date {maybe} 28/9.</think>\n' + JSON.stringify(RECEIPT);
    assert.deepEqual(extractJsonObject(raw), RECEIPT);
  });
  test('with prose either side', () => {
    const raw = 'Here is the receipt:\n' + JSON.stringify(RECEIPT) + '\nLet me know if you need more.';
    assert.deepEqual(extractJsonObject(raw), RECEIPT);
  });
  test('thinking cut off by the token limit leaves nothing to parse', () => {
    assert.equal(extractJsonObject('<think>Reading the receipt, the vendor is'), null);
  });
  test('nothing usable', () => {
    assert.equal(extractJsonObject(''), null);
    assert.equal(extractJsonObject('Sorry, I cannot read this image.'), null);
    assert.equal(extractJsonObject(undefined), null);
    assert.equal(extractJsonObject('[1,2,3]'), null);
  });
});

describe('receiptTotal', () => {
  test('numbers and money strings', () => {
    assert.equal(receiptTotal(84.5), 84.5);
    assert.equal(receiptTotal('$1,204.60'), 1204.6);
    assert.equal(receiptTotal('12.345'), 12.35);
  });
  test('nothing a receipt could be: zero, negative, missing, words', () => {
    assert.equal(receiptTotal(0), null);
    assert.equal(receiptTotal('-5'), null);
    assert.equal(receiptTotal(undefined), null);
    assert.equal(receiptTotal('unknown'), null);
  });
});
