import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kindOf, shareItems, shareMenu, itemsForAction, actionsFor, parseVCard, suggestionFromAi } from './share-intake';

test('what each shared file is', () => {
  assert.equal(kindOf({ mimeType: 'image/jpeg' }), 'image');
  assert.equal(kindOf({ mimeType: 'image/heic' }), 'image');
  assert.equal(kindOf({ mimeType: 'application/pdf' }), 'pdf');
  assert.equal(kindOf({ mimeType: 'application/octet-stream', fileName: 'INV-2231.pdf' }), 'pdf');
  assert.equal(kindOf({ mimeType: 'text/x-vcard' }), 'contact');
  assert.equal(kindOf({ mimeType: 'text/vcard' }), 'contact');
  assert.equal(kindOf({ mimeType: '', fileName: 'Sarah.vcf' }), 'contact');
  assert.equal(kindOf({ mimeType: 'image/svg+xml' }), 'unsupported');
  assert.equal(kindOf({ mimeType: 'video/mp4' }), 'unsupported');
  assert.equal(kindOf({ mimeType: 'application/zip', fileName: 'x.zip' }), 'unsupported');
});

test('the default for each kind follows the doc', () => {
  assert.equal(actionsFor('pdf')[0], 'expense');
  assert.equal(actionsFor('image')[0], 'expense');
  assert.equal(actionsFor('text')[0], 'quote_from_text');
  assert.equal(actionsFor('contact')[0], 'save_customer');
  assert.deepEqual(actionsFor('unsupported'), []);
});

test('the AI\'s suggestion goes first, only if it\'s one of the options', () => {
  const photo = shareItems({ files: [{ path: 'a.jpg', mimeType: 'image/jpeg' }] });
  assert.deepEqual(shareMenu(photo, 'job_photo').actions.slice(0, 2), ['job_photo', 'expense']);
  assert.equal(shareMenu(photo, 'save_customer').actions[0], 'expense'); // not an option for a photo
  assert.equal(shareMenu(photo, null).actions[0], 'expense');
});

test('several files: the first decides the menu; the choice applies to the ones that can take it', () => {
  const items = shareItems({ files: [
    { path: 'a.pdf', mimeType: 'application/pdf' },
    { path: 'b.jpg', mimeType: 'image/jpeg' },
    { path: 'c.zip', mimeType: 'application/zip' },
  ] });
  const menu = shareMenu(items);
  assert.equal(menu.kind, 'pdf');
  assert.deepEqual(menu.actions, ['expense', 'expense_job']);
  assert.equal(itemsForAction(items, 'expense').length, 2); // the PDF and the photo; not the zip
});

test('text, and only unsupported files', () => {
  const t = shareItems({ text: '  Hi, can you quote a new hot water system? ' });
  assert.deepEqual(t, [{ kind: 'text', text: 'Hi, can you quote a new hot water system?' }]);
  assert.equal(shareMenu(t).actions[0], 'quote_from_text');
  const bad = shareItems({ files: [{ path: 'x.mp4', mimeType: 'video/mp4' }] });
  assert.deepEqual(shareMenu(bad), { kind: 'unsupported', actions: [] });
  assert.deepEqual(shareMenu([]), { kind: 'unsupported', actions: [] });
});

test('a contact card from iOS (vCard 3.0)', () => {
  const vcf = [
    'BEGIN:VCARD', 'VERSION:3.0', 'N:Johnson;Sarah;;;', 'FN:Sarah Johnson', 'ORG:Johnson Builds;',
    'TEL;type=HOME;type=VOICE:(02) 9555 1234', 'TEL;type=CELL;type=VOICE;type=pref:0412 345 678',
    'EMAIL;type=INTERNET;type=HOME:sarah@example.com',
    'item1.ADR;type=HOME;type=pref:;;12 Smith St;Parramatta;NSW;2150;Australia', 'END:VCARD',
  ].join('\r\n');
  assert.deepEqual(parseVCard(vcf), {
    name: 'Sarah Johnson', phone: '0412 345 678', email: 'sarah@example.com',
    address: '12 Smith St, Parramatta, NSW, 2150, Australia', company: 'Johnson Builds',
  });
});

test('a contact card from Android (vCard 2.1, folded, no FN)', () => {
  const vcf = 'BEGIN:VCARD\nVERSION:2.1\nN:Nguyen;Tom;;;\nTEL;CELL:0400\n 111 222\nEND:VCARD\n';
  assert.deepEqual(parseVCard(vcf), { name: 'Tom Nguyen', phone: '0400111 222', email: null, address: null, company: null });
  assert.equal(parseVCard('not a card'), null);
  assert.equal(parseVCard('BEGIN:VCARD\nVERSION:3.0\nEND:VCARD'), null);
});

test('reading the AI\'s suggestion; anything unexpected means no suggestion', () => {
  assert.equal(suggestionFromAi('image', '{"kind":"receipt"}'), 'expense');
  assert.equal(suggestionFromAi('image', { kind: 'site' }), 'job_photo');
  assert.equal(suggestionFromAi('text', '{"kind":"request"}'), 'quote_from_text');
  assert.equal(suggestionFromAi('text', '{"kind":"note"}'), 'customer_note');
  assert.equal(suggestionFromAi('image', '{"kind":"cat"}'), null);
  assert.equal(suggestionFromAi('text', 'nonsense'), null);
});
