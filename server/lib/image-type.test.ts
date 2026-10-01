import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { sniffImage, imageDataUri } from './image-type';

const b64 = (bytes: number[], pad = 16) =>
  Buffer.from([...bytes, ...new Array(pad).fill(0)]).toString('base64');
const ascii = (s: string) => [...s].map((ch) => ch.charCodeAt(0));

const JPEG = b64([0xff, 0xd8, 0xff, 0xe0]);
const PNG = b64([0x89, ...ascii('PNG'), 0x0d, 0x0a, 0x1a, 0x0a]);
const WEBP = b64([...ascii('RIFF'), 0, 0, 0, 0, ...ascii('WEBP')]);
const HEIC = b64([0, 0, 0, 0x18, ...ascii('ftypheic')]);

describe('sniffImage', () => {
  test('reads the real format from the bytes', () => {
    assert.equal(sniffImage(JPEG), 'jpeg');
    assert.equal(sniffImage(PNG), 'png');
    assert.equal(sniffImage(WEBP), 'webp');
    assert.equal(sniffImage(HEIC), 'heic');
  });
  test('garbage and too-short input are unknown', () => {
    assert.equal(sniffImage(''), 'unknown');
    assert.equal(sniffImage('not base64 at all!!'), 'unknown');
    assert.equal(sniffImage(b64([1, 2, 3, 4])), 'unknown');
  });
});

describe('imageDataUri', () => {
  test('labels by content, whatever the client claimed', () => {
    assert.equal(imageDataUri(PNG).uri, `data:image/png;base64,${PNG}`);
    assert.equal(imageDataUri(JPEG).uri, `data:image/jpeg;base64,${JPEG}`);
  });
  test('HEIC — an iPhone photo sent as-is — is refused, not mislabelled', () => {
    assert.deepEqual(imageDataUri(HEIC), { uri: null, kind: 'heic' });
  });
});
