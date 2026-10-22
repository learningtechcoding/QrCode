// Generates the brand assets (logo + favicons) from one geometry definition.
// Run: node tools/make-icons.js   (needs `pngjs`: npm i pngjs, or set NODE_PATH)
const fs = require('fs'), path = require('path');
const { PNG } = require('pngjs');
const out = path.join(__dirname, '..');

const INK = '#12201d', PAPER = '#e9f0ee', ACCENT = '#c2410c', ACCENT_DK = '#f08a5d';

// Mark on a 9x9 grid: a QR finder eye (ring + core) whose corner is overtaken by an accent
// module, which also reads as the tail of a "Q".
const RING = 'M0 0h7v7H0zM1 1v5h5V1z';
const CORE = [2, 2, 3, 3];
const TAIL = [6, 6, 3, 3];

function markSvgBody(ink, accent) {
  return `<path d="${RING}" fill="${ink}" fill-rule="evenodd"/><rect x="${CORE[0]}" y="${CORE[1]}" width="${CORE[2]}" height="${CORE[3]}" fill="${ink}"/><rect x="${TAIL[0]}" y="${TAIL[1]}" width="${TAIL[2]}" height="${TAIL[3]}" fill="${accent}"/>`;
}

// logo.svg: transparent, adapts to light/dark when used as <img>
fs.writeFileSync(path.join(out, 'assets', 'logo.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 9 9" width="72" height="72"><title>QR Studio</title>` +
  `<style>.i{fill:${INK}}.a{fill:${ACCENT}}@media(prefers-color-scheme:dark){.i{fill:${PAPER}}.a{fill:${ACCENT_DK}}}</style>` +
  `<path class="i" d="${RING}" fill-rule="evenodd"/><rect class="i" x="2" y="2" width="3" height="3"/><rect class="a" x="6" y="6" width="3" height="3"/></svg>\n`);

// favicon.svg: ink tile with the mark in paper/accent (reads on any tab color)
const TILE = 16, OFF = 3.5;
fs.writeFileSync(path.join(out, 'favicon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${TILE} ${TILE}"><rect width="${TILE}" height="${TILE}" rx="3" fill="${INK}"/>` +
  `<g transform="translate(${OFF} ${OFF})">${markSvgBody(PAPER, ACCENT_DK)}</g></svg>\n`);

// Rasterize the same geometry with 4x4 supersampling.
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
function inRoundRect(x, y, s, r) {
  const cx = Math.min(Math.max(x, r), s - r), cy = Math.min(Math.max(y, r), s - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}
function sample(x, y) { // x,y in tile units; returns [r,g,b,a]
  if (!inRoundRect(x, y, TILE, 3)) return [0, 0, 0, 0];
  const mx = x - OFF, my = y - OFF;
  const inR = (a, b, w, h) => mx >= a && mx < a + w && my >= b && my < b + h;
  if (inR(...TAIL)) return [...hex(ACCENT_DK), 255];
  const ring = inR(0, 0, 7, 7) && !inR(1, 1, 5, 5);
  if (ring || inR(...CORE)) return [...hex(PAPER), 255];
  return [...hex(INK), 255];
}
function png(size) {
  const p = new PNG({ width: size, height: size }), N = 4;
  for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) {
    let acc = [0, 0, 0, 0];
    for (let sy = 0; sy < N; sy++) for (let sx = 0; sx < N; sx++) {
      const c = sample(((px + (sx + .5) / N) / size) * TILE, ((py + (sy + .5) / N) / size) * TILE);
      acc[0] += c[0] * c[3]; acc[1] += c[1] * c[3]; acc[2] += c[2] * c[3]; acc[3] += c[3];
    }
    const i = (py * size + px) * 4, a = acc[3];
    p.data[i] = a ? Math.round(acc[0] / a) : 0; p.data[i + 1] = a ? Math.round(acc[1] / a) : 0;
    p.data[i + 2] = a ? Math.round(acc[2] / a) : 0; p.data[i + 3] = Math.round(a / (N * N));
  }
  return PNG.sync.write(p);
}
const sizes = { 'favicon-16.png': 16, 'favicon-32.png': 32, 'apple-touch-icon.png': 180, 'icon-192.png': 192, 'icon-512.png': 512 };
for (const [f, s] of Object.entries(sizes)) fs.writeFileSync(path.join(out, f), png(s));

// favicon.ico with embedded 16 + 32 + 48 PNGs
const ico = [16, 32, 48].map(s => png(s));
const head = Buffer.alloc(6); head.writeUInt16LE(1, 2); head.writeUInt16LE(ico.length, 4);
let offset = 6 + 16 * ico.length;
const dirs = ico.map((b, i) => {
  const s = [16, 32, 48][i], d = Buffer.alloc(16);
  d[0] = s; d[1] = s; d.writeUInt16LE(1, 4); d.writeUInt16LE(32, 6); d.writeUInt32LE(b.length, 8); d.writeUInt32LE(offset, 12);
  offset += b.length; return d;
});
fs.writeFileSync(path.join(out, 'favicon.ico'), Buffer.concat([head, ...dirs, ...ico]));

fs.writeFileSync(path.join(out, 'site.webmanifest'), JSON.stringify({
  name: 'QR Studio', short_name: 'QR Studio', start_url: '/generator.html', display: 'standalone',
  background_color: PAPER, theme_color: INK,
  icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }]
}, null, 2) + '\n');
console.log('icons written');
