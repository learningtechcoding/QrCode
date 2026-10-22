(function () {
  'use strict';

  var TYPES = [
    ['url', 'Website'], ['text', 'Text'], ['wifi', 'Wi-Fi'], ['vcard', 'Contact'], ['email', 'Email'],
    ['phone', 'Phone'], ['sms', 'SMS'], ['whatsapp', 'WhatsApp'], ['location', 'Location'], ['event', 'Event'], ['social', 'Social']
  ];
  var THEMES = [
    ['Classic', '#000000', '#ffffff'], ['Ink', '#12201d', '#e9f0ee'], ['Forest', '#14532d', '#f0fdf4'],
    ['Ember', '#7c2d12', '#fff7ed'], ['Ocean', '#0c4a6e', '#e0f2fe'], ['Night', '#ffffff', '#111827']
  ];

  var $ = function (id) { return document.getElementById(id); };
  var form = $('form'), canvas = $('canvas'), statusEl = $('status');
  var dlPng = $('dlPng'), dlSvg = $('dlSvg');
  var current = 'url', touched = {}, timer = null, last = null;

  /* ---------- tabs ---------- */
  var tabsEl = $('tabs');
  TYPES.forEach(function (t) {
    var li = document.createElement('li'), b = document.createElement('button');
    b.type = 'button'; b.role = 'tab'; b.id = 'tab-' + t[0]; b.textContent = t[1];
    b.setAttribute('aria-selected', 'false'); b.tabIndex = -1; b.dataset.type = t[0];
    b.addEventListener('click', function () { selectType(t[0], true); });
    b.addEventListener('keydown', function (e) {
      var i = TYPES.findIndex(function (x) { return x[0] === current; }), n = null;
      if (e.key === 'ArrowRight') n = (i + 1) % TYPES.length;
      else if (e.key === 'ArrowLeft') n = (i + TYPES.length - 1) % TYPES.length;
      if (n !== null) { e.preventDefault(); selectType(TYPES[n][0], true); $('tab-' + TYPES[n][0]).focus(); }
    });
    li.appendChild(b); tabsEl.appendChild(li);
  });

  function selectType(type, pushHash) {
    if (!TYPES.some(function (t) { return t[0] === type; })) type = 'url';
    current = type; touched = {};
    TYPES.forEach(function (t) {
      var b = $('tab-' + t[0]), on = t[0] === type;
      b.setAttribute('aria-selected', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1;
    });
    Array.prototype.forEach.call(form.querySelectorAll('fieldset'), function (fs) { fs.hidden = fs.dataset.type !== type; });
    if (pushHash) { try { history.replaceState(null, '', '#' + type); } catch (e) {} }
    clearErrors(); update();
  }

  /* ---------- form values / errors ---------- */
  function activeSet() { return form.querySelector('fieldset[data-type="' + current + '"]'); }

  function values() {
    var v = {};
    Array.prototype.forEach.call(activeSet().querySelectorAll('[name]'), function (el) {
      v[el.name] = el.type === 'checkbox' ? el.checked : el.value;
    });
    return v;
  }

  function clearErrors() {
    Array.prototype.forEach.call(form.querySelectorAll('.err'), function (e) { e.remove(); });
    Array.prototype.forEach.call(form.querySelectorAll('[aria-invalid]'), function (e) { e.removeAttribute('aria-invalid'); e.removeAttribute('aria-describedby'); });
  }

  function showErrors(errors, all) {
    clearErrors();
    Array.prototype.forEach.call(activeSet().querySelectorAll('[name]'), function (el) {
      var msg = errors[el.name];
      if (!msg || !(all || touched[el.name])) return;
      var p = document.createElement('p'); p.className = 'err'; p.id = 'err-' + el.id; p.textContent = msg;
      el.setAttribute('aria-invalid', 'true'); el.setAttribute('aria-describedby', p.id);
      el.parentNode.appendChild(p);
    });
  }

  form.addEventListener('input', function (e) {
    if (e.target.name) touched[e.target.name] = true;
    schedule();
  });
  form.addEventListener('change', function (e) { if (e.target.name) touched[e.target.name] = true; schedule(); });
  form.addEventListener('focusout', function (e) { if (e.target.name) { touched[e.target.name] = true; schedule(); } });
  form.addEventListener('submit', function (e) { e.preventDefault(); });

  function schedule() { clearTimeout(timer); timer = setTimeout(update, 120); }

  /* ---------- customization ---------- */
  var themesEl = $('themes');
  THEMES.forEach(function (t) {
    var b = document.createElement('button'); b.type = 'button'; b.title = t[0]; b.setAttribute('aria-label', t[0] + ' theme');
    b.setAttribute('aria-pressed', 'false');
    b.style.background = 'linear-gradient(135deg,' + t[1] + ' 50%,' + t[2] + ' 50%)';
    b.addEventListener('click', function () { $('fg').value = t[1]; $('bg').value = t[2]; update(); });
    themesEl.appendChild(b);
  });

  ['fg', 'bg', 'ecc'].forEach(function (id) { $(id).addEventListener('input', update); });
  $('size').addEventListener('input', function () { $('sizeVal').textContent = this.value; update(); });
  $('margin').addEventListener('input', function () { $('marginVal').textContent = this.value; update(); });
  $('security').addEventListener('change', function () { $('pwBox').classList.toggle('hidden', this.value === 'nopass'); });
  $('text').addEventListener('input', function () {
    var n = this.value.length, bytes = new TextEncoder().encode(this.value).length;
    $('textCount').textContent = n ? '(' + n + ' characters, ' + bytes + ' bytes)' : '';
  });

  function opts() {
    return { fg: $('fg').value, bg: $('bg').value, size: +$('size').value, margin: +$('margin').value };
  }

  /* ---------- generate ---------- */
  function setStatus(html, cls) { statusEl.className = 'status ' + (cls || ''); statusEl.textContent = html; }

  function showEmpty(msg) {
    canvas.classList.add('hidden'); $('empty').classList.remove('hidden');
    if (msg) $('empty').textContent = msg;
    dlPng.disabled = dlSvg.disabled = true; last = null;
  }

  function update() {
    var themeBtns = themesEl.children;
    for (var i = 0; i < themeBtns.length; i++) {
      themeBtns[i].setAttribute('aria-pressed', String(THEMES[i][1] === $('fg').value.toLowerCase() && THEMES[i][2] === $('bg').value.toLowerCase()));
    }
    var res = QrPayload.build(current, values());
    showErrors(res.errors, false);
    if (!res.ok) {
      var anyTouched = Object.keys(touched).length > 0;
      showEmpty(anyTouched ? 'Fix the highlighted fields to generate your QR code.' : 'Fill in the form and your QR code appears here.');
      setStatus('');
      return;
    }
    var o = opts(), matrix;
    try { matrix = QrRender.make(res.payload, $('ecc').value); }
    catch (e) {
      showEmpty('That is too much data for a QR code.');
      setStatus('Too much content for this error-correction level. Shorten it or choose a lower level.', 'warn');
      return;
    }
    var px = QrRender.drawCanvas(canvas, matrix, o);
    canvas.style.width = Math.min(px, 340) + 'px';
    canvas.setAttribute('aria-label', 'QR code for ' + (TYPES.filter(function (t) { return t[0] === current; })[0][1]) + ' – ' + matrix.count + ' by ' + matrix.count + ' modules');
    canvas.classList.remove('hidden'); $('empty').classList.add('hidden');
    dlPng.disabled = dlSvg.disabled = false;
    last = { matrix: matrix, opts: o, px: px };

    var warns = [], ratio = QrRender.contrast(o.fg, o.bg);
    if (ratio < 3) warns.push('Very low contrast – this code may not scan.');
    else if (ratio < 4.5) warns.push('Contrast is low; test it carefully.');
    if (QrRender.isLighter(o.fg, o.bg)) warns.push('Light-on-dark codes are not read by every scanner.');
    if (o.margin < 4) warns.push('Quiet zone under 4 modules may hurt scanning when printed.');
    if (matrix.version >= 15) warns.push('Dense code – print it larger or shorten the content.');
    if (current === 'wifi') warns.push('Anyone who scans this can join the network.');
    if (warns.length) setStatus('⚠ ' + warns.join(' '), 'warn');
    else setStatus('✓ Ready – ' + px + '×' + px + ' px, ' + matrix.count + '×' + matrix.count + ' modules. Test-scan it before printing.', 'good');
  }

  /* ---------- download ---------- */
  function ensureValid() {
    var res = QrPayload.build(current, values());
    if (!res.ok) { Object.keys(res.errors).forEach(function (k) { touched[k] = true; }); showErrors(res.errors, true); return false; }
    return true;
  }

  function save(blob, name) {
    var a = document.createElement('a'), url = URL.createObjectURL(blob);
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  dlPng.addEventListener('click', function () {
    if (!last || !ensureValid()) return;
    canvas.toBlob(function (b) { if (b) save(b, 'qr-' + current + '.png'); }, 'image/png');
  });
  dlSvg.addEventListener('click', function () {
    if (!last || !ensureValid()) return;
    save(new Blob([QrRender.toSvg(last.matrix, last.opts)], { type: 'image/svg+xml' }), 'qr-' + current + '.svg');
  });

  /* ---------- init ---------- */
  window.addEventListener('hashchange', function () { selectType(location.hash.slice(1), false); });
  selectType(location.hash.slice(1) || 'url', false);
})();
