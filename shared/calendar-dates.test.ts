// The phone's zone for these tests. Node reads TZ when it changes.
process.env.TZ = 'Australia/Sydney';
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { weekPosition, sameLocalDay, jobDayOptions, dayChipLabel } from './calendar-dates';

describe('j1: a job for 9am tomorrow, Sydney time', () => {
  // Thursday 5 Nov 2026, 9:35am in Sydney (AEDT, UTC+11): late on the 4th in UTC.
  const now = new Date(2026, 10, 5, 9, 35);
  const job = new Date(2026, 10, 6, 9, 0);          // what New job saves: Fri 9:00 local
  const wire = job.toISOString();                   // what goes to and comes back from the server
  test('travels as UTC and comes back as the same moment', () => {
    assert.equal(wire, '2026-11-05T22:00:00.000Z');
    const back = new Date(wire);
    assert.equal(back.getDate(), 6);
    assert.equal(back.getHours(), 9);
  });
  test('lands on Friday of this week, not Thursday (the UTC date)', () => {
    assert.deepEqual(weekPosition(new Date(wire), now), { weekOffset: 0, dayIdx: 4 });
    assert.ok(sameLocalDay(wire, new Date(2026, 10, 6)));
    assert.ok(!sameLocalDay(wire, new Date(2026, 10, 5)));
  });
  test('Sunday night and Monday morning fall in the right weeks', () => {
    assert.deepEqual(weekPosition(new Date(2026, 10, 8, 23, 30), now), { weekOffset: 0, dayIdx: 6 });
    assert.deepEqual(weekPosition(new Date(2026, 10, 9, 0, 30), now), { weekOffset: 1, dayIdx: 0 });
    assert.deepEqual(weekPosition(new Date(2026, 10, 1, 9), now), { weekOffset: -1, dayIdx: 6 });
  });
  test('across the daylight saving change (4 Oct 2026)', () => {
    const before = new Date(2026, 9, 3, 9);
    const after = new Date(2026, 9, 5, 9);
    assert.equal(new Date(before.toISOString()).getHours(), 9);
    assert.equal(new Date(after.toISOString()).getHours(), 9);
    assert.deepEqual(weekPosition(after, now), { weekOffset: -4, dayIdx: 0 });
  });
});

describe('jobDayOptions', () => {
  const today = new Date(2026, 10, 5, 14, 0);
  test('today and the next 29 days', () => {
    const days = jobDayOptions(today);
    assert.equal(days.length, 30);
    assert.equal(days[0].getDate(), 5);
    assert.equal(days[0].getHours(), 0);
  });
  test('editing a past or far-off job keeps its own day', () => {
    const past = jobDayOptions(today, new Date(2026, 9, 20, 9));
    assert.equal(past.length, 31);
    assert.equal(past[0].getDate(), 20);
    const far = jobDayOptions(today, new Date(2027, 0, 20, 9));
    assert.equal(far.length, 31);
    assert.equal(far[30].getMonth(), 0);
    assert.equal(jobDayOptions(today, new Date(2026, 10, 10, 9)).length, 30);
  });
  test('chip labels', () => {
    const wd = (d: Date) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
    assert.equal(dayChipLabel(new Date(2026, 10, 5), today, wd), 'Today');
    assert.equal(dayChipLabel(new Date(2026, 10, 6), today, wd), 'Tomorrow');
    assert.equal(dayChipLabel(new Date(2026, 10, 4), today, wd), 'Yesterday');
    assert.equal(dayChipLabel(new Date(2026, 10, 9), today, wd), 'Mon');
  });
});
