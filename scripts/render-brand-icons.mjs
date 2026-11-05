/**
 * Renders every app icon and splash PNG from the SVG sources in
 * mobile/assets/brand. Never hand edit the PNGs: change an SVG (or a size
 * below) and run this again.
 *
 *   node scripts/render-brand-icons.mjs              # the app's PNGs
 *   node scripts/render-brand-icons.mjs --previews   # plus review images in docs/
 *
 * The bolt is read from icon-sunset.svg, so the Android layers, the splash and
 * the favicon always use exactly the icon's bolt.
 *
 * Sizes and why:
 *  - iOS icons: 1024 x 1024, opaque, square (iOS masks them; EAS makes the
 *    smaller sizes).
 *  - Android adaptive layers: 108 dp, of which only the inner 66 dp circle is
 *    never clipped by a launcher mask
 *    (https://developer.android.com/develop/ui/views/launch/icon_design_adaptive).
 *    On a 1024 canvas that circle has a radius of 313 px. The bolt's furthest
 *    tip is 413 px from the centre in the iOS artwork, so the foreground uses
 *    the bolt at ANDROID_SCALE of the iOS size (tip at ~306 px, inside the safe
 *    zone).
 *  - Splash: the icon's bolt on a transparent 1024 canvas. app.json shows it at
 *    imageWidth 200 (pt/dp), so the bolt is 160 tall and its furthest tip ~81
 *    from the centre, inside Android 12's 192 dp splash-icon circle. The intro
 *    animation (lib/intro-animation.ts) draws its first frame at exactly this
 *    size and position.
 */
import { Resvg } from '@resvg/resvg-js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const brand = path.join(root, 'mobile/assets/brand');
const images = path.join(root, 'mobile/assets/images');

const ANDROID_SCALE = 0.74;
const read = (f) => fs.readFileSync(path.join(brand, f), 'utf8');

const light = read('icon-sunset.svg');
const dark = read('icon-sunset-dark.svg');
const tinted = read('icon-sunset-tinted.svg');

// The bolt and its gradient, from the light source.
const polygon = light.match(/<polygon points="([^"]+)"/)[1];
const boltGradient = light.match(/<linearGradient id="bolt"[\s\S]*?<\/linearGradient>/)[0];

/** The bolt alone on a transparent 1024 canvas, scaled about the centre. */
const boltOnly = ({ scale = 1, fill = 'url(#bolt)' } = {}) => `
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>${boltGradient}</defs>
  <g transform="translate(512 512) scale(${scale}) translate(-512 -512)">
    <polygon points="${polygon}" fill="${fill}"/>
  </g>
</svg>`;

const render = (svg, size) =>
  new Resvg(svg, { fitTo: { mode: 'width', value: size }, background: 'rgba(0,0,0,0)' }).render().asPng();

const write = (dir, name, png) => {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), png);
  console.log(`${path.relative(root, path.join(dir, name))}  ${png.length} bytes`);
};

const outputs = [
  ['icon.png', light, 1024],                                       // top-level + iOS light
  ['icon-dark.png', dark, 1024],                                   // iOS dark
  ['icon-tinted.png', tinted, 1024],                               // iOS tinted
  ['adaptive-icon.png', boltOnly({ scale: ANDROID_SCALE }), 1024], // Android foreground (background #FFFFFF in app.json)
  ['adaptive-icon-monochrome.png', boltOnly({ scale: ANDROID_SCALE, fill: '#FFFFFF' }), 1024], // Android 13+ themed
  ['notification-icon.png', boltOnly({ scale: ANDROID_SCALE, fill: '#FFFFFF' }), 96],          // Android status bar: white on transparent
  ['splash-icon.png', boltOnly(), 1024],                           // splash, light and dark
  ['favicon.png', light, 64],                                      // web
];
for (const [name, svg, size] of outputs) write(images, name, render(svg, size));

if (process.argv.includes('--previews')) {
  const out = path.join(root, 'docs/pr-screenshots/icon-sunset');
  // iOS-style rounded previews at 1024, 180, 120 and 60, light / dark / tinted.
  const sizes = [1024, 180, 120, 60];
  const rounded = (svg, s) => {
    const inner = svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
    // iOS's continuous-corner mask is close to a 22.37% radius rounded rect.
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 1024 1024">
      <defs><clipPath id="m"><rect width="1024" height="1024" rx="229" ry="229"/></clipPath></defs>
      <g clip-path="url(#m)">${inner}</g></svg>`;
  };
  const row = (variants, bg) => {
    let x = 24;
    const parts = [];
    for (const [label, svg] of variants) {
      for (const s of sizes) {
        const b64 = render(rounded(svg, s), s).toString('base64');
        const y = 24 + (1024 - s) / 2;
        parts.push(`<image x="${x}" y="${y}" width="${s}" height="${s}" href="data:image/png;base64,${b64}"/>`);
        parts.push(`<text x="${x + s / 2}" y="${1024 + 70}" font-family="sans-serif" font-size="26" text-anchor="middle" fill="${bg === '#fff' ? '#333' : '#ddd'}">${label} ${s}</text>`);
        x += s + 40;
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${x}" height="${1024 + 100}" viewBox="0 0 ${x} ${1024 + 100}"><rect width="100%" height="100%" fill="${bg}"/>${parts.join('')}</svg>`;
  };
  write(out, 'ios-light.png', new Resvg(row([['light', light]], '#fff'), { fitTo: { mode: 'width', value: 1600 } }).render().asPng());
  write(out, 'ios-dark-tinted.png', new Resvg(row([['dark', dark], ['tinted', tinted]], '#000'), { fitTo: { mode: 'width', value: 2400 } }).render().asPng());

  // Android adaptive: the 108 dp layer, the 66 dp safe zone, and the result
  // under a circle, a squircle and a rounded square mask, plus the themed icon.
  const fg = render(boltOnly({ scale: ANDROID_SCALE }), 1024).toString('base64');
  const mono = render(boltOnly({ scale: ANDROID_SCALE, fill: '#3A3A3E' }), 1024).toString('base64');
  const v = 72 / 108 * 1024; // visible area of the 108 dp layer (72 dp)
  const o = (1024 - v) / 2;
  const tile = (x, clip, img, bg) => `
    <g transform="translate(${x} 40) scale(0.4)">
      <defs><clipPath id="c${x}">${clip}</clipPath></defs>
      <g clip-path="url(#c${x})">
        <g transform="translate(${-o} ${-o})">
          <rect width="1024" height="1024" fill="${bg}"/>
          <image width="1024" height="1024" href="data:image/png;base64,${img}"/>
        </g>
      </g>
    </g>`;
  const circle = `<circle cx="${v / 2}" cy="${v / 2}" r="${v / 2}"/>`;
  const squircle = `<rect width="${v}" height="${v}" rx="${v * 0.32}"/>`;
  const square = `<rect width="${v}" height="${v}" rx="${v * 0.12}"/>`;
  const layer = `
    <g transform="translate(40 40) scale(0.4)">
      <rect width="1024" height="1024" fill="#FFFFFF" stroke="#bbb" stroke-width="4"/>
      <image width="1024" height="1024" href="data:image/png;base64,${fg}"/>
      <circle cx="512" cy="512" r="${66 / 108 * 512}" fill="none" stroke="#2563eb" stroke-width="6" stroke-dasharray="20 14"/>
      <rect x="${o}" y="${o}" width="${v}" height="${v}" fill="none" stroke="#999" stroke-width="4" stroke-dasharray="8 8"/>
    </g>`;
  const label = (x, t) => `<text x="${x}" y="500" font-family="sans-serif" font-size="20" fill="#333">${t}</text>`;
  const adaptive = `<svg xmlns="http://www.w3.org/2000/svg" width="1700" height="540"><rect width="100%" height="100%" fill="#e9e9e6"/>
    ${layer}${label(40, '108 dp layer, 66 dp safe zone (blue)')}
    ${tile(520, circle, fg, '#FFFFFF')}${label(520, 'circle')}
    ${tile(800, squircle, fg, '#FFFFFF')}${label(800, 'squircle')}
    ${tile(1080, square, fg, '#FFFFFF')}${label(1080, 'rounded square')}
    ${tile(1360, circle, mono, '#D7E3F4')}${label(1360, 'themed (Android 13+)')}
  </svg>`;
  write(out, 'android-adaptive.png', new Resvg(adaptive, { fitTo: { mode: "width", value: 1700 } }).render().asPng());
}
