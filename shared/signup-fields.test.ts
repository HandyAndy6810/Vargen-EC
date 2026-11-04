import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { emailProblem, optionalEmailProblem, normaliseAuMobile, mobileProblem } from './signup-fields';

describe('emailProblem (su2)', () => {
  test('good addresses pass, spaces around them ignored', () => {
    for (const e of ['sam@example.com', ' Sam.Smith+jobs@mail.example.com.au ', 'a@b.co']) assert.equal(emailProblem(e), null, e);
  });
  test('the typos people make', () => {
    for (const e of ['sam', 'sam@', 'sam@example', '@example.com', 'sam example@x.com', 'sam@@example.com', 'sam@example..com', '.sam@example.com', 'sam.@example.com', 'sa..m@example.com', 'sam@-example.com', 'sam@example.c']) {
      assert.match(emailProblem(e)!, /doesn’t look right/, e);
    }
  });
  test('blank is missing; optional blank is fine', () => {
    assert.match(emailProblem('  ')!, /Enter your email/);
    assert.equal(optionalEmailProblem(''), null);
    assert.match(optionalEmailProblem('nope')!, /doesn’t look right/);
  });
});

describe('Australian mobile (su3)', () => {
  test('04 numbers, with spaces and punctuation', () => {
    assert.equal(normaliseAuMobile('0412345678'), '+61412345678');
    assert.equal(normaliseAuMobile('0412 345 678'), '+61412345678');
    assert.equal(normaliseAuMobile('(0412) 345-678'), '+61412345678');
  });
  test('+61 4 numbers', () => {
    assert.equal(normaliseAuMobile('+61412345678'), '+61412345678');
    assert.equal(normaliseAuMobile('+61 412 345 678'), '+61412345678');
    assert.equal(normaliseAuMobile('61412345678'), '+61412345678');
  });
  test('not mobiles: landlines, short, long, letters, foreign', () => {
    for (const p of ['0298765432', '041234567', '04123456789', '0412 34A 678', '+64 21 123 4567', '+61 2 9876 5432', '412345678', '+0412345678']) {
      assert.equal(normaliseAuMobile(p), null, p);
      assert.match(mobileProblem(p)!, /Australian mobile/, p);
    }
  });
  test('optional: blank is fine', () => {
    assert.equal(mobileProblem(''), null);
    assert.equal(mobileProblem(null), null);
    assert.equal(normaliseAuMobile(' '), null);
  });
});
