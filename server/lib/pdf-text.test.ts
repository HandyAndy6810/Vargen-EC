import { test } from 'node:test';
import assert from 'node:assert/strict';
import { jsPDF } from 'jspdf';
import { pdfText } from './pdf-text';

test('a made-up supplier PDF invoice reads back as text', async () => {
  const doc = new jsPDF();
  doc.text('REECE PLUMBING  Tax Invoice  INV-88213  Date: 20/10/2026', 10, 20);
  doc.text('SL82 MESH 6X2.4      4  EA   141.35    565.40', 10, 40);
  doc.text('Total (inc GST) 565.40', 10, 60);
  const text = await pdfText(Buffer.from(doc.output('arraybuffer')));
  assert.match(text, /REECE PLUMBING/);
  assert.match(text, /SL82 MESH 6X2\.4\s+4\s+EA\s+141\.35\s+565\.40/);
});

test('a PDF with no text (a scan saved as PDF) gives an empty string', async () => {
  const doc = new jsPDF();
  doc.rect(10, 10, 50, 50, 'F');
  assert.equal(await pdfText(Buffer.from(doc.output('arraybuffer'))), '');
});

test('not a PDF throws (the route turns that into a plain message)', async () => {
  await assert.rejects(() => pdfText(Buffer.from('not a pdf')));
});
