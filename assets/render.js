/* QR rendering service: matrix creation, SVG output, canvas drawing, contrast checks.
   Isolated so the underlying QR library can be swapped later. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./qrcode.js'));
  else root.QrRender = factory(root.qrcode);
})(typeof self !== 'undefined' ? self : this, function (qrcode) {
  'use strict';

  qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];

  function make(text, ecc) {
    var qr;
    try {
      qr = qrcode(0, ecc || 'M');
      qr.addData(text);
      qr.make();
    } catch (e) {
      throw new Error('TOO_LONG');
    }
    var count = qr.getModuleCount();
    return {
      count: count,
      version: (count - 17) / 4,
      isDark: function (r, c) { return qr.isDark(r, c); }
    };
  }

  function hexToRgb(hex) {
    var m = /^#?([0-9a-f]{6})$/i.exec(hex);
    if (!m) return null;
    var n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function luminance(rgb) {
    var c = rgb.map(function (v) {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }

  function contrast(fg, bg) {
    var a = hexToRgb(fg), b = hexToRgb(bg);
    if (!a || !b) return 0;
    var l1 = luminance(a), l2 = luminance(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }

  function isLighter(fg, bg) { return luminance(hexToRgb(fg)) > luminance(hexToRgb(bg)); }

  /** Integer module size so edges stay sharp; returns {cell, total, px}. */
  function layout(matrix, size, margin) {
    var total = matrix.count + margin * 2;
    var cell = Math.max(1, Math.floor(size / total));
    return { cell: cell, total: total, px: cell * total };
  }

  function drawCanvas(canvas, matrix, o) {
    var L = layout(matrix, o.size, o.margin);
    canvas.width = L.px;
    canvas.height = L.px;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = o.bg;
    ctx.fillRect(0, 0, L.px, L.px);
    ctx.fillStyle = o.fg;
    for (var r = 0; r < matrix.count; r++) {
      for (var c = 0; c < matrix.count; c++) {
        if (matrix.isDark(r, c)) ctx.fillRect((c + o.margin) * L.cell, (r + o.margin) * L.cell, L.cell, L.cell);
      }
    }
    return L.px;
  }

  function toSvg(matrix, o) {
    var total = matrix.count + o.margin * 2, d = '';
    for (var r = 0; r < matrix.count; r++) {
      var c = 0;
      while (c < matrix.count) {
        if (matrix.isDark(r, c)) {
          var start = c;
          while (c < matrix.count && matrix.isDark(r, c)) c++;
          d += 'M' + (start + o.margin) + ' ' + (r + o.margin) + 'h' + (c - start) + 'v1h-' + (c - start) + 'z';
        } else c++;
      }
    }
    return '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + total + ' ' + total + '" width="' + o.size + '" height="' + o.size + '" shape-rendering="crispEdges">' +
      '<rect width="' + total + '" height="' + total + '" fill="' + o.bg + '"/>' +
      '<path d="' + d + '" fill="' + o.fg + '"/></svg>';
  }

  /** RGBA pixel buffer, used for automated decode tests. */
  function toPixels(matrix, o) {
    var L = layout(matrix, o.size, o.margin);
    var f = hexToRgb(o.fg), b = hexToRgb(o.bg), data = new Uint8ClampedArray(L.px * L.px * 4);
    for (var y = 0; y < L.px; y++) {
      for (var x = 0; x < L.px; x++) {
        var mr = Math.floor(y / L.cell) - o.margin, mc = Math.floor(x / L.cell) - o.margin;
        var dark = mr >= 0 && mc >= 0 && mr < matrix.count && mc < matrix.count && matrix.isDark(mr, mc);
        var col = dark ? f : b, i = (y * L.px + x) * 4;
        data[i] = col[0]; data[i + 1] = col[1]; data[i + 2] = col[2]; data[i + 3] = 255;
      }
    }
    return { data: data, width: L.px, height: L.px };
  }

  return { make: make, contrast: contrast, isLighter: isLighter, layout: layout, drawCanvas: drawCanvas, toSvg: toSvg, toPixels: toPixels };
});
