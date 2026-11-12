import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseUpload, MAX_ATTACHMENT_BYTES } from './attachment-upload';

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0]).toString('base64');
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52]).toString('base64');
const PDF = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n').toString('base64');

test('a photo or PDF on exactly one record', () => {
  const j = parseUpload({ jobId: 4, data: `data:image/jpeg;base64,${JPEG}`, fileName: 'site.jpg' });
  assert.ok(j.ok && j.mimeType === 'image/jpeg' && 'jobId' in j.parent && j.parent.jobId === 4);
  const p = parseUpload({ receiptId: '9', data: PDF, fileName: 'INV-88213.pdf' });
  assert.ok(p.ok && p.mimeType === 'application/pdf' && p.fileName === 'INV-88213.pdf');
  assert.ok(parseUpload({ quoteId: 2, data: PNG }).ok);
  assert.equal((parseUpload({ data: JPEG }) as any).status, 400);
  assert.equal((parseUpload({ jobId: 1, quoteId: 2, data: JPEG }) as any).status, 400);
  assert.equal((parseUpload({ jobId: -1, data: JPEG }) as any).status, 400);
});

test('the type comes from the bytes: a mislabelled or unknown file is refused plainly', () => {
  const zip = Buffer.from('PK\u0003\u0004 not a photo').toString('base64');
  const r = parseUpload({ jobId: 1, data: `data:image/jpeg;base64,${zip}` });
  assert.deepEqual(r, { ok: false, status: 415, message: "Vargen can't use this kind of file." });
  assert.equal((parseUpload({ jobId: 1, data: '' }) as any).status, 400);
  assert.equal((parseUpload({ jobId: 1, data: '<<not base64>>' }) as any).status, 400);
});

test('too big is refused before decoding', () => {
  const big = 'A'.repeat(Math.ceil((MAX_ATTACHMENT_BYTES + 1024) * 4 / 3));
  assert.equal((parseUpload({ jobId: 1, data: big }) as any).status, 413);
});

test('a file name is a name only', () => {
  const r = parseUpload({ jobId: 1, data: JPEG, fileName: '../../etc/passwd\u0000' });
  assert.ok(r.ok && r.fileName === 'passwd');
});
