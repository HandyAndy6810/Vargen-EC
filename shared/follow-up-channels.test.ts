import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chaseChannels } from './follow-up-channels';

test('both, no preference: email, sms, share', () => {
  assert.deepEqual(chaseChannels({ email: 'a@b.co', phone: '0412' }), ['email', 'sms', 'share']);
});
test('preferred contact goes first', () => {
  assert.deepEqual(chaseChannels({ email: 'a@b.co', phone: '0412', preferredContact: 'sms' }), ['sms', 'email', 'share']);
  assert.deepEqual(chaseChannels({ email: 'a@b.co', phone: '0412', preferredContact: 'call' }), ['sms', 'email', 'share']);
  assert.deepEqual(chaseChannels({ email: 'a@b.co', phone: '0412', preferredContact: 'email' }), ['email', 'sms', 'share']);
});
test('only what they have; share link always', () => {
  assert.deepEqual(chaseChannels({ phone: '0412', preferredContact: 'email' }), ['sms', 'share']);
  assert.deepEqual(chaseChannels({ email: ' ' }), ['share']);
  assert.deepEqual(chaseChannels(null), ['share']);
});
