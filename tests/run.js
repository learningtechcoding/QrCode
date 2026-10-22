// Run: node tests/run.js  (decode checks need `jsqr`: npm i jsqr, or set NODE_PATH)
const assert = require('assert');
const P = require('../assets/payload.js');
const R = require('../assets/render.js');
let jsQR; try { jsQR = require('jsqr'); } catch (e) { console.log('jsqr not installed: decode checks skipped'); }

let pass = 0, fail = 0;
function t(name, fn) { try { fn(); pass++; } catch (e) { fail++; console.log('FAIL', name, '-', e.message); } }
const ok = (type, v) => { const r = P.build(type, v); assert(r.ok, JSON.stringify(r.errors)); return r.payload; };
const bad = (type, v, field) => { const r = P.build(type, v); assert(!r.ok && r.errors[field], 'expected error on ' + field); };

t('url normalize', () => assert.strictEqual(ok('url', { url: 'example.com' }), 'https://example.com/'));
t('url keeps http', () => assert.strictEqual(ok('url', { url: 'http://example.com/x?y=1' }), 'http://example.com/x?y=1'));
t('url localhost port', () => ok('url', { url: 'localhost:3000' }));
t('url blocks js', () => bad('url', { url: 'javascript:alert(1)' }, 'url'));
t('url blocks data', () => bad('url', { url: 'data:text/html,hi' }, 'url'));
t('url blocks ftp', () => bad('url', { url: 'ftp://example.com' }, 'url'));
t('url empty', () => bad('url', { url: '  ' }, 'url'));
t('url spaces', () => bad('url', { url: 'exa mple.com' }, 'url'));
t('url no tld', () => bad('url', { url: 'hello' }, 'url'));
t('text', () => assert.strictEqual(ok('text', { text: 'hi\nمرحبا' }), 'hi\nمرحبا'));
t('text empty', () => bad('text', { text: ' ' }, 'text'));
t('wifi', () => assert.strictEqual(ok('wifi', { ssid: 'My;Net', security: 'WPA', password: 'pass:word1', hidden: true }), 'WIFI:T:WPA;S:My\\;Net;P:pass\\:word1;H:true;;'));
t('wifi open', () => assert.strictEqual(ok('wifi', { ssid: 'Cafe', security: 'nopass' }), 'WIFI:T:nopass;S:Cafe;;'));
t('wifi short pw', () => bad('wifi', { ssid: 'a', security: 'WPA', password: '123' }, 'password'));
t('wifi no ssid', () => bad('wifi', { ssid: '', security: 'WPA', password: '12345678' }, 'ssid'));
t('vcard', () => {
  const p = ok('vcard', { firstName: 'Ann', lastName: 'Lee', org: 'A, B', phone: '+1 415 555 0123', email: 'a@b.co', website: 'b.co' });
  assert(p.includes('FN:Ann Lee') && p.includes('ORG:A\\, B') && p.includes('TEL;TYPE=CELL:+14155550123') && p.endsWith('END:VCARD'));
});
t('vcard needs name', () => bad('vcard', {}, 'firstName'));
t('vcard bad email', () => bad('vcard', { firstName: 'A', email: 'x' }, 'email'));
t('email', () => assert.strictEqual(ok('email', { to: 'a@b.co', subject: 'Hi there', body: 'x&y' }), 'mailto:a@b.co?subject=Hi%20there&body=x%26y'));
t('email bad', () => bad('email', { to: 'nope' }, 'to'));
t('phone', () => assert.strictEqual(ok('phone', { phone: '(415) 555-0123' }), 'tel:4155550123'));
t('phone bad', () => bad('phone', { phone: 'abc' }, 'phone'));
t('sms', () => assert.strictEqual(ok('sms', { phone: '+14155550123', message: 'yo' }), 'SMSTO:+14155550123:yo'));
t('whatsapp', () => assert.strictEqual(ok('whatsapp', { phone: '+1 415 555 0123', message: 'Hi there' }), 'https://wa.me/14155550123?text=Hi%20there'));
t('whatsapp needs +', () => bad('whatsapp', { phone: '4155550123' }, 'phone'));
t('location', () => assert.strictEqual(ok('location', { lat: '40.7', lng: '-74' }), 'https://www.google.com/maps?q=40.7,-74'));
t('location range', () => bad('location', { lat: '91', lng: '0' }, 'lat'));
t('event', () => {
  const p = ok('event', { title: 'Party', start: '2026-12-01T18:00', end: '2026-12-01T20:30', location: 'Home' });
  assert(p.includes('DTSTART:20261201T180000') && p.includes('DTEND:20261201T203000'));
});
t('event end<start', () => bad('event', { title: 'x', start: '2026-12-01T18:00', end: '2026-12-01T17:00' }, 'end'));
t('social username', () => assert.strictEqual(ok('social', { platform: 'instagram', profile: '@foo' }), 'https://www.instagram.com/foo'));
t('social wrong host', () => bad('social', { platform: 'instagram', profile: 'https://evil.com/foo' }, 'profile'));
t('social url', () => ok('social', { platform: 'x', profile: 'https://twitter.com/foo' }));

t('too long', () => assert.throws(() => R.make('a'.repeat(5000), 'H'), /TOO_LONG/));
t('contrast', () => { assert(R.contrast('#000000', '#ffffff') > 20); assert(R.contrast('#777777', '#888888') < 2); });
t('svg shape', () => {
  const s = R.toSvg(R.make('hi', 'M'), { fg: '#000000', bg: '#ffffff', margin: 4, size: 256 });
  assert(s.includes('<svg') && s.includes('viewBox'));
});

if (jsQR) {
  const samples = [
    ['url', { url: 'https://example.com/path?a=1&b=2' }],
    ['text', { text: 'Hello مرحبا 你好 😀\nline2' }],
    ['wifi', { ssid: 'Home;Net', security: 'WPA', password: 'p@ss:w;ord1', hidden: true }],
    ['vcard', { firstName: 'Ann', lastName: 'Lee', org: 'Acme', title: 'CEO', phone: '+14155550123', email: 'a@b.co', website: 'b.co', address: '1 Main St, Town' }],
    ['email', { to: 'a@b.co', subject: 'Hello', body: 'Body text' }],
    ['phone', { phone: '+14155550123' }],
    ['sms', { phone: '+14155550123', message: 'Hi' }],
    ['whatsapp', { phone: '+14155550123', message: 'Hello there' }],
    ['location', { lat: '40.7128', lng: '-74.006' }],
    ['event', { title: 'Party', start: '2026-12-01T18:00', end: '2026-12-01T20:00', location: 'Home', description: 'Fun' }],
    ['social', { platform: 'tiktok', profile: 'foo' }],
  ];
  const styles = [
    { fg: '#000000', bg: '#ffffff', margin: 4, size: 512 },
    { fg: '#1d4ed8', bg: '#fef9c3', margin: 2, size: 300 },
  ];
  for (const [type, vals] of samples) for (const ecc of ['L', 'M', 'Q', 'H']) for (const opt of styles) {
    t(`decode ${type} ${ecc} ${opt.fg}`, () => {
      const payload = ok(type, vals), m = R.make(payload, ecc);
      const px = R.toPixels(m, opt);
      const res = jsQR(px.data, px.width, px.height);
      assert(res, 'not decoded');
      assert.strictEqual(res.data, payload);
    });
  }
}
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
