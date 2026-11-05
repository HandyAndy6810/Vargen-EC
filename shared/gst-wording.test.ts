import { test } from 'node:test';
import assert from 'node:assert/strict';
import { totalLabel, gstTag, NO_GST_NOTE } from './gst-wording';

test('GST on: say it is included', () => {
  assert.equal(totalLabel(true), 'Total (inc. GST)');
  assert.equal(gstTag(true), 'inc GST');
});
test('GST off: plain total, never "ex GST" or "not included"', () => {
  assert.equal(totalLabel(false), 'Total');
  assert.equal(gstTag(false), 'No GST charged');
  for (const s of [totalLabel(false), gstTag(false), NO_GST_NOTE]) assert.doesNotMatch(s, /ex\.? ?GST|not included|excl/i);
});
