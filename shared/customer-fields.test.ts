import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { abnProblem, normaliseAbn, formatAbn, invoiceAddress, uniqueNameMatch, nameKey, customerTypeLabel } from './customer-fields';

describe('ABN', () => {
  test('a real ABN passes, with or without spaces', () => {
    // The ATO's own published example.
    assert.equal(abnProblem('51 824 753 556'), null);
    assert.equal(abnProblem('51824753556'), null);
    assert.equal(normaliseAbn(' 51 824 753 556 '), '51824753556');
  });
  test('blank is fine (the field is optional)', () => {
    assert.equal(abnProblem(''), null);
    assert.equal(abnProblem(null), null);
    assert.equal(abnProblem('   '), null);
  });
  test('wrong length or letters', () => {
    assert.match(abnProblem('5182475355')!, /11 digits/);
    assert.match(abnProblem('518247535561')!, /11 digits/);
    assert.match(abnProblem('51 824 753 55A')!, /11 digits/);
  });
  test('one mistyped digit fails the checksum', () => {
    assert.match(abnProblem('51 824 753 557')!, /check out/);
    assert.match(abnProblem('12 345 678 901')!, /check out/);
  });
  test('formats the way the ATO prints it', () => {
    assert.equal(formatAbn('51824753556'), '51 824 753 556');
    assert.equal(formatAbn('123'), '123');
  });
});

describe('invoiceAddress', () => {
  test('billing address wins when set', () => {
    assert.equal(invoiceAddress({ billingAddress: 'PO Box 1, Sydney', address: '1 Site St' }), 'PO Box 1, Sydney');
  });
  test('otherwise the site address', () => {
    assert.equal(invoiceAddress({ billingAddress: '  ', address: '1 Site St' }), '1 Site St');
    assert.equal(invoiceAddress({ address: '1 Site St' }), '1 Site St');
    assert.equal(invoiceAddress({}), null);
    assert.equal(invoiceAddress(null), null);
  });
});

describe('uniqueNameMatch', () => {
  const people = [
    { id: 1, name: 'Sarah Johnson' },
    { id: 2, name: 'Tom Nguyen' },
    { id: 3, name: 'tom  nguyen ' },
    { id: 4, name: 'Marco Rossi' },
  ];
  test('case and spaces ignored', () => {
    assert.equal(nameKey('  SARAH   johnson '), 'sarah johnson');
    const r = uniqueNameMatch(people, '  sarah JOHNSON ');
    assert.equal(r.match?.id, 1);
  });
  test('two customers with the same name: no link', () => {
    const r = uniqueNameMatch(people, 'Tom Nguyen');
    assert.equal(r.match, null);
    assert.equal(r.reason, 'ambiguous');
  });
  test('no match, and a blank name', () => {
    assert.equal(uniqueNameMatch(people, 'Priya').reason, 'none');
    assert.equal(uniqueNameMatch(people, '  ').reason, 'blank');
    assert.equal(uniqueNameMatch(people, null).reason, 'blank');
  });
  test('a partial name is not a match', () => {
    assert.equal(uniqueNameMatch(people, 'Sarah').match, null);
  });
});

test('customer type labels', () => {
  assert.equal(customerTypeLabel('real_estate'), 'Real estate');
  assert.equal(customerTypeLabel('nonsense'), null);
  assert.equal(customerTypeLabel(null), null);
});
