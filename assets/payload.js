/* Payload builders: turn form values into QR content. Pure functions, no DOM. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.QrPayload = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var BLOCKED_SCHEMES = /^(javascript|data|vbscript|file|blob):/i;

  function trim(v) { return (v == null ? '' : String(v)).trim(); }

  function normalizeUrl(raw) {
    var v = trim(raw);
    if (!v) return { error: 'Enter a website address.' };
    if (/\s/.test(v)) return { error: 'The address cannot contain spaces.' };
    if (BLOCKED_SCHEMES.test(v)) return { error: 'This kind of link is not allowed for safety reasons.' };
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(v)) {
      if (/^[a-z][a-z0-9+.-]*:/i.test(v) && !/^[^/]*\.[^/]*:\d+/.test(v) && !/^localhost:\d+/i.test(v)) {
        return { error: 'Only http:// and https:// links are supported. Remove the "' + v.split(':')[0] + ':" prefix.' };
      }
      v = 'https://' + v;
    }
    var u;
    try { u = new URL(v); } catch (e) { return { error: 'That does not look like a valid web address.' }; }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return { error: 'Only http:// and https:// links are supported.' };
    var host = u.hostname;
    if (!(host === 'localhost' || /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || /^[^.]+(\.[^.]+)*\.[a-z0-9-]{2,}$/i.test(host) || host.indexOf('xn--') > -1)) {
      return { error: 'The address needs a valid domain, for example example.com.' };
    }
    return { value: u.href };
  }

  function cleanPhone(raw) {
    var v = trim(raw).replace(/[\s().-]/g, '');
    if (!/^\+?\d{5,15}$/.test(v)) return null;
    return v;
  }

  function isEmail(v) { return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/.test(v); }

  function escWifi(s) { return String(s).replace(/([\\;,:"])/g, '\\$1'); }
  function escVcard(s) { return String(s).replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/([;,])/g, '\\$1'); }

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function icsDate(local) { // "YYYY-MM-DDTHH:MM" -> "YYYYMMDDTHHMM00"
    var m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(local || '');
    if (!m) return null;
    return m[1] + m[2] + m[3] + 'T' + m[4] + m[5] + '00';
  }
  function icsEsc(s) { return String(s).replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/([;,])/g, '\\$1'); }

  var SOCIAL = {
    instagram: { base: 'https://www.instagram.com/', hosts: ['instagram.com'] },
    facebook: { base: 'https://www.facebook.com/', hosts: ['facebook.com', 'fb.com'] },
    x: { base: 'https://x.com/', hosts: ['x.com', 'twitter.com'] },
    linkedin: { base: 'https://www.linkedin.com/in/', hosts: ['linkedin.com'] },
    youtube: { base: 'https://www.youtube.com/@', hosts: ['youtube.com', 'youtu.be'] },
    tiktok: { base: 'https://www.tiktok.com/@', hosts: ['tiktok.com'] },
    other: { base: '', hosts: null }
  };

  function hostMatches(host, list) {
    host = host.replace(/^www\./, '');
    return list.some(function (h) { return host === h || host.slice(-h.length - 1) === '.' + h; });
  }

  var builders = {
    url: function (v, err) {
      var r = normalizeUrl(v.url);
      if (r.error) { err.url = r.error; return null; }
      return r.value;
    },
    text: function (v, err) {
      var t = v.text == null ? '' : String(v.text);
      if (!t.trim()) { err.text = 'Enter some text.'; return null; }
      return t;
    },
    wifi: function (v, err) {
      var ssid = trim(v.ssid), sec = v.security || 'WPA', pw = v.password == null ? '' : String(v.password);
      if (!ssid) err.ssid = 'Enter the network name (SSID).';
      else if (ssid.length > 32) err.ssid = 'Network names are at most 32 characters.';
      if (sec !== 'nopass') {
        if (!pw) err.password = 'Enter the password, or choose "No password".';
        else if (sec === 'WPA' && (pw.length < 8 || pw.length > 63)) err.password = 'WPA passwords are 8 to 63 characters.';
        else if (sec === 'WEP' && !/^([0-9a-f]{10}|[0-9a-f]{26}|.{5}|.{13})$/i.test(pw)) err.password = 'WEP keys are 5 or 13 characters (or 10/26 hex digits).';
      }
      if (err.ssid || err.password) return null;
      return 'WIFI:T:' + (sec === 'nopass' ? 'nopass' : sec) + ';S:' + escWifi(ssid) + ';' +
        (sec === 'nopass' ? '' : 'P:' + escWifi(pw) + ';') + (v.hidden ? 'H:true;' : '') + ';';
    },
    vcard: function (v, err) {
      var first = trim(v.firstName), last = trim(v.lastName);
      if (!first && !last) err.firstName = 'Enter at least a first or last name.';
      var email = trim(v.email), phone = trim(v.phone), site = trim(v.website);
      if (email && !isEmail(email)) err.email = 'Enter a valid email address.';
      var tel = null;
      if (phone) { tel = cleanPhone(phone); if (!tel) err.phone = 'Enter a valid phone number, e.g. +14155550123.'; }
      var web = null;
      if (site) { var r = normalizeUrl(site); if (r.error) err.website = r.error; else web = r.value; }
      if (Object.keys(err).length) return null;
      var L = ['BEGIN:VCARD', 'VERSION:3.0',
        'N:' + escVcard(last) + ';' + escVcard(first) + ';;;',
        'FN:' + escVcard((first + ' ' + last).trim())];
      if (trim(v.org)) L.push('ORG:' + escVcard(trim(v.org)));
      if (trim(v.title)) L.push('TITLE:' + escVcard(trim(v.title)));
      if (tel) L.push('TEL;TYPE=CELL:' + tel);
      if (email) L.push('EMAIL:' + email);
      if (web) L.push('URL:' + web);
      if (trim(v.address)) L.push('ADR;TYPE=WORK:;;' + escVcard(trim(v.address)) + ';;;;');
      L.push('END:VCARD');
      return L.join('\n');
    },
    email: function (v, err) {
      var to = trim(v.to);
      if (!to) err.to = 'Enter an email address.';
      else if (!isEmail(to)) err.to = 'Enter a valid email address.';
      if (err.to) return null;
      var q = [];
      if (trim(v.subject)) q.push('subject=' + encodeURIComponent(trim(v.subject)));
      if (v.body && String(v.body).trim()) q.push('body=' + encodeURIComponent(String(v.body)));
      return 'mailto:' + to + (q.length ? '?' + q.join('&') : '');
    },
    phone: function (v, err) {
      var n = cleanPhone(v.phone);
      if (!n) { err.phone = 'Enter a valid phone number, e.g. +14155550123.'; return null; }
      return 'tel:' + n;
    },
    sms: function (v, err) {
      var n = cleanPhone(v.phone);
      if (!n) { err.phone = 'Enter a valid phone number, e.g. +14155550123.'; return null; }
      var m = v.message == null ? '' : String(v.message);
      return 'SMSTO:' + n + ':' + m;
    },
    whatsapp: function (v, err) {
      var n = cleanPhone(v.phone);
      if (!n || n.charAt(0) !== '+') { err.phone = 'Use international format starting with +, e.g. +14155550123.'; return null; }
      var m = v.message == null ? '' : String(v.message).trim();
      return 'https://wa.me/' + n.slice(1) + (m ? '?text=' + encodeURIComponent(m) : '');
    },
    location: function (v, err) {
      var lat = trim(v.lat), lng = trim(v.lng);
      var la = Number(lat), lo = Number(lng);
      if (lat === '' || isNaN(la) || la < -90 || la > 90) err.lat = 'Latitude must be a number from -90 to 90.';
      if (lng === '' || isNaN(lo) || lo < -180 || lo > 180) err.lng = 'Longitude must be a number from -180 to 180.';
      if (err.lat || err.lng) return null;
      return 'https://www.google.com/maps?q=' + la + ',' + lo;
    },
    event: function (v, err) {
      var title = trim(v.title), s = icsDate(v.start), e = icsDate(v.end);
      if (!title) err.title = 'Enter an event name.';
      if (!s) err.start = 'Choose a start date and time.';
      if (v.end && !e) err.end = 'Choose a valid end date and time.';
      if (s && e && e < s) err.end = 'The end must be after the start.';
      if (Object.keys(err).length) return null;
      var L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VEVENT', 'SUMMARY:' + icsEsc(title), 'DTSTART:' + s];
      if (e) L.push('DTEND:' + e);
      if (trim(v.location)) L.push('LOCATION:' + icsEsc(trim(v.location)));
      if (trim(v.description)) L.push('DESCRIPTION:' + icsEsc(trim(v.description)));
      L.push('END:VEVENT', 'END:VCALENDAR');
      return L.join('\n');
    },
    social: function (v, err) {
      var p = SOCIAL[v.platform] || SOCIAL.other, raw = trim(v.profile);
      if (!raw) { err.profile = 'Enter a profile link or username.'; return null; }
      if (p.base && !/[/.]/.test(raw)) { // bare username
        var name = raw.replace(/^@/, '');
        if (!/^[\w.-]{1,100}$/.test(name)) { err.profile = 'That username has invalid characters.'; return null; }
        return p.base + name;
      }
      var r = normalizeUrl(raw);
      if (r.error) { err.profile = r.error; return null; }
      if (p.hosts && !hostMatches(new URL(r.value).hostname, p.hosts)) {
        err.profile = 'That link does not belong to ' + (v.platform === 'x' ? 'X/Twitter' : v.platform) + '.';
        return null;
      }
      return r.value;
    }
  };

  /** build(type, values) -> { ok, payload, errors } */
  function build(type, values) {
    var errors = {};
    var fn = builders[type];
    if (!fn) return { ok: false, errors: { _: 'Unknown QR type.' } };
    var payload = fn(values || {}, errors);
    if (payload == null || Object.keys(errors).length) return { ok: false, errors: errors };
    return { ok: true, payload: payload, errors: {} };
  }

  return { build: build, normalizeUrl: normalizeUrl, types: Object.keys(builders) };
});
