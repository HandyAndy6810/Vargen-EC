import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { firstSendFields, publicBaseUrl, withPortalUrl, backfillSentFields } from './quote-send';

const now = new Date('2026-11-01T09:00:00Z');
const opts = { now, newToken: () => 'tok-1' };

describe('firstSendFields', () => {
  test('a new quote sent straight away gets a link, a sent date and follow-ups', () => {
    const f = firstSendFields(null, { followUpEnabled: true, followUpDays: '[3,7]' }, opts);
    assert.equal(f.shareToken, 'tok-1');
    assert.equal(f.sentAt, now);
    assert.deepEqual(JSON.parse(f.followUpSchedule!), [{ day: 3, status: 'pending' }, { day: 7, status: 'pending' }]);
  });

  test('follow-ups off: no schedule', () => {
    assert.equal(firstSendFields(null, { followUpEnabled: false }, opts).followUpSchedule, undefined);
    assert.equal(firstSendFields(null, null, opts).followUpSchedule, undefined);
  });

  test('default days when none are set', () => {
    const f = firstSendFields(null, { followUpEnabled: true, followUpDays: null }, opts);
    assert.deepEqual(JSON.parse(f.followUpSchedule!).map((d: any) => d.day), [3, 7, 14]);
  });

  test('sent again: keeps its link, first sent date and schedule', () => {
    const f = firstSendFields(
      { shareToken: 'old', sentAt: new Date('2026-10-01'), followUpSchedule: '[]' },
      { followUpEnabled: true }, opts);
    assert.deepEqual(f, {});
  });

  test('a malformed follow-up setting never fails the send', () => {
    const f = firstSendFields(null, { followUpEnabled: true, followUpDays: 'not json' }, opts);
    assert.equal(f.shareToken, 'tok-1');
    assert.equal(f.followUpSchedule, undefined);
  });
});

describe('publicBaseUrl / withPortalUrl', () => {
  const req = (proto: string, host: string) => ({ protocol: proto, get: (h: string) => (h === 'host' ? host : undefined) });

  test('PUBLIC_APP_URL wins, without a trailing slash', () => {
    assert.equal(publicBaseUrl({ PUBLIC_APP_URL: 'https://app.vargen.com.au/' }, req('http', 'x')), 'https://app.vargen.com.au');
  });
  test('falls back to the request origin', () => {
    assert.equal(publicBaseUrl({}, req('https', 'vargen.replit.app')), 'https://vargen.replit.app');
  });
  test('portalUrl only once there is a token', () => {
    assert.equal(withPortalUrl({ id: 1, shareToken: 'abc' }, 'https://x').portalUrl, 'https://x/portal/abc');
    assert.equal('portalUrl' in withPortalUrl({ id: 1, shareToken: null }, 'https://x'), false);
  });
});

describe('backfillSentFields', () => {
  const created = new Date('2026-09-10T03:00:00Z');
  test('a sent quote missing both gets a token and its created date as sent date', () => {
    assert.deepEqual(backfillSentFields({ status: 'sent', createdAt: created }, () => 't'), { shareToken: 't', sentAt: created });
  });
  test('only what is missing', () => {
    assert.deepEqual(backfillSentFields({ status: 'accepted', shareToken: 'x', createdAt: created }, () => 't'), { sentAt: created });
    assert.deepEqual(backfillSentFields({ status: 'invoiced', sentAt: created }, () => 't'), { shareToken: 't' });
  });
  test('drafts and complete quotes are left alone (so a second run changes nothing)', () => {
    assert.equal(backfillSentFields({ status: 'draft', createdAt: created }), null);
    assert.equal(backfillSentFields({ status: 'sent', shareToken: 'x', sentAt: created }), null);
  });
  test('never adds a follow-up schedule', () => {
    assert.equal('followUpSchedule' in (backfillSentFields({ status: 'sent', createdAt: created }) ?? {}), false);
  });
});
