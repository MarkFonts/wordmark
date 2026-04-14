(function () {
  'use strict';

  var canvas  = document.getElementById('dek-canvas');
  var annotEl = document.getElementById('dek-annot');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');

  var FONT = '"CalSansUI", sans-serif';
  var CW, CH, dpr, LEFT_PAD;
  var isMobile = false;

  /* ── CalSansUI metrics (1000 UPM) ────────────────────────*/
  var ASC   = 0.800;
  var CAP_H = 0.710;
  var DESC  = 0.150;
  /* x-height varies with wght: 515 @ 400, 529 @ 700 */
  var X_H_400 = 0.515;
  var X_H_700 = 0.529;
  var X_H     = X_H_400;  // used for stable layout in init()

  var METRICS = [
    { label: 'CAP HEIGHT', val: '710',       frac:  CAP_H },
    { label: 'X-HEIGHT',   val: '515',       frac:  X_H_400 },  // val overridden live in frame()
    { label: 'BASELINE',   val: '0',         frac:  0     },
    { label: 'DESCENDER',  val: '\u2212150', frac: -DESC  },
  ];

  /* ── glyph list — CalSansUI coverage only ────────────────
     Two-fallback width test: if CalSansUI has the glyph,
     width is the same regardless of which system font follows.*/
  var RANGES = [
    [0x0021, 0x007E],
    [0x00A1, 0x00FF],
    [0x0100, 0x017F],
    [0x0180, 0x024F],
    [0x0259, 0x0259],
    [0x02B9, 0x02B9],
    [0x02BB, 0x02BC],
    [0x02C6, 0x02C8],
    [0x02D8, 0x02DD],
    [0x0300, 0x0312],
    [0x031B, 0x031B],
    [0x0323, 0x0324],
    [0x0326, 0x0328],
    [0x032E, 0x032E],
    [0x0331, 0x0331],
    [0x0335, 0x0335],
    [0x0338, 0x0338],
    [0x039E, 0x039E],
    [0x03A9, 0x03A9],
    [0x03C0, 0x03C0],
    [0x0E3F, 0x0E3F],
    [0x1E0C, 0x1E0D],
    [0x1E20, 0x1E21],
    [0x1E24, 0x1E25],
    [0x1E2A, 0x1E2B],
    [0x1E34, 0x1E3B],
    [0x1E40, 0x1E49],
    [0x1E5C, 0x1E5F],
    [0x1E62, 0x1E63],
    [0x1E6C, 0x1E6F],
    [0x1E80, 0x1E85],
    [0x1E8E, 0x1E8F],
    [0x1E92, 0x1E96],
    [0x1E9E, 0x1E9E],
    [0x1EA0, 0x1EF9],
    [0x2013, 0x2014],
    [0x2018, 0x201F],
    [0x2026, 0x2026],
    [0x2030, 0x2030],
    [0x2032, 0x2033],
    [0x2039, 0x203A],
    [0x203C, 0x203D],
    [0x2044, 0x2044],
    [0x2070, 0x2070],
    [0x2074, 0x2079],
    [0x2080, 0x2089],
    [0x20A1, 0x20A1],
    [0x20A4, 0x20A4],
    [0x20A6, 0x20A6],
    [0x20A8, 0x20AB],
    [0x20AC, 0x20AC],
    [0x20AD, 0x20AE],
    [0x20B1, 0x20B2],
    [0x20B4, 0x20B5],
    [0x20B8, 0x20BA],
    [0x20BC, 0x20BF],
    [0x2113, 0x2113],
    [0x2116, 0x2116],
    [0x2122, 0x2122],
    [0x2126, 0x2126],
    [0x212E, 0x212E],
    [0x2153, 0x2154],
    [0x215B, 0x215E],
    [0x2190, 0x2199],
    [0x2202, 0x2202],
    [0x2205, 0x2205],
    [0x220F, 0x220F],
    [0x2211, 0x2212],
    [0x2215, 0x2215],
    [0x221A, 0x221A],
    [0x221E, 0x221E],
    [0x222B, 0x222B],
    [0x2234, 0x2235],
    [0x2248, 0x2248],
    [0x2260, 0x2260],
    [0x2264, 0x2265],
    [0x235F, 0x235F],
    [0x24B9, 0x24B9],
    [0x25A0, 0x25A1],
    [0x25AA, 0x25AB],
    [0x25B2, 0x25C3],
    [0x25C6, 0x25C7],
    [0x25CA, 0x25CC],
    [0x25CF, 0x25CF],
    [0x25E6, 0x25E6],
    [0x25FC, 0x25FC],
    [0x2605, 0x2606],
    [0x2611, 0x2612],
    [0x2661, 0x2661],
    [0x2665, 0x2665],
    [0x2713, 0x2714],
    [0x2717, 0x2718],
    [0x2726, 0x2728],
    [0x2764, 0x2764],
    [0x27E8, 0x27E9],
    [0x2E18, 0x2E18],
    [0xA78B, 0xA78C],
    [0xFB01, 0xFB02]
  ];

  var glyphs = [];

  function buildGlyphList() {
    canvas.style.fontVariationSettings = '"wght" 400';
    RANGES.forEach(function (r) {
      for (var cp = r[0]; cp <= r[1]; cp++) {
        var ch = String.fromCodePoint(cp);
        ctx.font = '100px "CalSansUI", sans-serif';
        var wA   = ctx.measureText(ch).width;
        ctx.font = '100px "CalSansUI", monospace';
        var wB   = ctx.measureText(ch).width;
        if (wA > 1 && Math.abs(wA - wB) < 0.5) glyphs.push(cp);
      }
    });
    if (!glyphs.length) for (var i = 0x21; i <= 0x7E; i++) glyphs.push(i);
  }

  /* ── copy text layout (pre-computed) ─────────────────────
     Desktop: full-width in x-height zone, layered over glyph.
     Mobile:  not drawn on canvas — HTML header shown instead. */
  var DEK_TEXT   = 'At\u202FWordmark, we design custom typefaces and logotypes that make brands consistent, clear, and unmistakable.';
  var textLayout = null;

  function wrapText(text, maxW) {
    var words = text.split(' '), lines = [], line = '';
    words.forEach(function (w) {
      var test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; }
      else line = test;
    });
    if (line) lines.push(line);
    return lines;
  }

  function computeTextLayout(baseline_y, xH_y) {
    if (isMobile) { textLayout = null; return; }

    var zoneH  = baseline_y - xH_y;
    var textL  = LEFT_PAD;
    var textR  = Math.round(CW * 0.42);  // ~40% col — forces 4-5 line wrap
    var availW = textR - textL;
    if (availW < 60 || zoneH < 12) { textLayout = null; return; }

    canvas.style.fontVariationSettings = '"wght" 400';
    var fs   = Math.max(9, Math.round(zoneH / 7));
    ctx.font = fs + 'px ' + FONT;
    var lines  = wrapText(DEK_TEXT, availW);
    var lineH  = fs * 1.28;
    var totalH = lines.length * lineH;

    // only shrink if overflowing — never scale up
    if (totalH > zoneH * 0.92) {
      fs       = Math.max(9, Math.round(fs * (zoneH * 0.92) / totalH));
      ctx.font = fs + 'px ' + FONT;
      lines    = wrapText(DEK_TEXT, availW);
      lineH    = fs * 1.28;
      totalH   = lines.length * lineH;
    }

    textLayout = { fs, lines, lineH, x: textL, startY: xH_y + (zoneH - totalH) / 2 };
  }

  /* ── layout / resize ─────────────────────────────────────*/
  function init() {
    dpr      = Math.min(window.devicePixelRatio || 1, 2);
    isMobile = window.innerWidth <= 480;
    CW       = Math.max(Math.floor(canvas.parentElement.getBoundingClientRect().width), 320);

    // Mobile: exactly 50 vh; desktop: 60% of width capped at 52 vh
    CH = isMobile
      ? Math.round(window.innerHeight * 0.50)
      : Math.round(Math.min(CW * 0.60, window.innerHeight * 0.52));

    canvas.style.width  = CW + 'px';
    canvas.style.height = CH + 'px';
    canvas.width  = Math.round(CW * dpr);
    canvas.height = Math.round(CH * dpr);
    canvas.style.fontFeatureSettings = '"tnum" 1';

    LEFT_PAD = isMobile
      ? Math.min(Math.max(20, CW * 0.05), 40)
      : Math.min(Math.max(32, CW * 0.07), 112);

    var fs         = Math.round(CH * 0.90 / (ASC + DESC));  // fits with ~5% breathing top/bottom
    var baseline_y = CH / 2 + ((ASC - DESC) / 2) * fs;
    var xH_y       = baseline_y - X_H * fs;
    computeTextLayout(baseline_y, xH_y);
  }

  /* ── wght oscillation ────────────────────────────────────*/
  var WGHT_PERIOD = 18;
  function wghtVal(t) {
    return 400 + 300 * 0.5 * (1 + Math.sin((2 * Math.PI / WGHT_PERIOD) * t));
  }

  /* ── glyph cycling ───────────────────────────────────────*/
  var glyphIdx = 0;
  var HOLD_MS  = 100;
  var phaseMs  = 0;
  var prevNow  = null;
  var annotMs  = 0;

  /* ── theme ───────────────────────────────────────────────*/
  function getInk() {
    return getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || '#ffffff';
  }
  function getBg() {
    return getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()  || '#242424';
  }

  /* ── dust noise tile ────────────────────────────────────*/
  var dustTile = document.createElement('canvas');
  dustTile.width = dustTile.height = 64;
  var dustTCtx = dustTile.getContext('2d');
  var dustPat  = null;
  var _lastBg  = null;

  function updateDust(bg) {
    dustTCtx.fillStyle = bg;
    dustTCtx.fillRect(0, 0, 64, 64);
    var id = dustTCtx.getImageData(0, 0, 64, 64);
    var d  = id.data;
    var br = d[0], bg_ = d[1], bb = d[2];
    for (var i = 0; i < d.length; i += 4) {
      var n  = (Math.random() - 0.5) * 28;
      d[i]   = Math.max(0, Math.min(255, br  + n));
      d[i+1] = Math.max(0, Math.min(255, bg_ + n));
      d[i+2] = Math.max(0, Math.min(255, bb  + n));
    }
    dustTCtx.putImageData(id, 0, 0);
    dustPat = ctx.createPattern(dustTile, 'repeat');
  }

  /* ── frame ───────────────────────────────────────────────*/
  var startMs = null;

  function frame(nowMs) {
    requestAnimationFrame(frame);
    if (!glyphs.length) return;
    if (startMs === null) startMs = nowMs;

    var t   = (nowMs - startMs) / 1000;
    var dt  = prevNow === null ? 0 : nowMs - prevNow;
    prevNow = nowMs;

    phaseMs += dt;
    if (phaseMs >= HOLD_MS) {
      glyphIdx = (glyphIdx + 1) % glyphs.length;
      phaseMs  = phaseMs % HOLD_MS;
    }

    annotMs += dt;
    if (annotMs >= 250 && annotEl) {
      var h = glyphs[glyphIdx].toString(16).toUpperCase();
      while (h.length < 4) h = '0' + h;
      annotEl.textContent = 'U+' + h;
      annotMs = 0;
    }

    var wght = wghtVal(t);
    var fs   = Math.round(CH * 0.90 / (ASC + DESC));
    var ink  = getInk();
    var bg   = getBg();
    var ch   = String.fromCodePoint(glyphs[glyphIdx]);

    var xHFrac  = X_H_400 + (X_H_700 - X_H_400) * (wght - 400) / 300;
    var xHVal   = Math.round(515 + 14 * (wght - 400) / 300).toString();

    var baseline_y = CH / 2 + ((ASC - DESC) / 2) * fs;
    var capH_y     = baseline_y - CAP_H  * fs;
    var xH_y       = baseline_y - xHFrac * fs;
    var desc_y     = baseline_y + DESC   * fs;
    var metricYs   = [capH_y, xH_y, baseline_y, desc_y];

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, CW, CH);

    /* ── 1. Metric dashed rules — full width ── */
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = ink;
    ctx.lineWidth   = 0.5;
    ctx.setLineDash([4, 5]);
    metricYs.forEach(function (y) {
      if (y < 0 || y > CH) return;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CW, y); ctx.stroke();
    });
    ctx.setLineDash([]);
    ctx.restore();

    /* ── 2. Metric labels + values — indented ── */
    var labelSz = isMobile ? 6 : 8;
    var hex = glyphs[glyphIdx].toString(16).toUpperCase();
    while (hex.length < 4) hex = '0' + hex;
    var annotStr = 'U+' + hex;
    ctx.save();
    ctx.globalAlpha  = 0.28;
    ctx.fillStyle    = ink;
    ctx.textBaseline = 'bottom';
    canvas.style.fontVariationSettings = '"wght" 400';
    ctx.font = labelSz + 'px ' + FONT;
    METRICS.forEach(function (m, i) {
      var y = metricYs[i];
      if (y < 4 || y > CH) return;
      var val = (i === 1) ? xHVal : m.val;
      ctx.textAlign = 'left';  ctx.fillText(m.label, LEFT_PAD,      y - 3);
      ctx.textAlign = 'right'; ctx.fillText(val,      CW - LEFT_PAD, y - 3);
    });
    ctx.textAlign    = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(annotStr, CW - LEFT_PAD, (xH_y + baseline_y) / 2);
    ctx.restore();

    /* ── 3. Glyph: stroke then fill(bg) → clean outer outline ──
       strokeText draws on both sides of each path contour;
       fillText(bg) covers the interior, burying inner strokes. */
    ctx.save();
    canvas.style.fontVariationSettings = '"wght" ' + wght.toFixed(0);
    ctx.font         = fs + 'px ' + FONT;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.strokeStyle  = ink;
    ctx.lineWidth    = 3;        // fill covers inner half → ~1.5 px net visible
    ctx.lineJoin     = 'round';
    ctx.strokeText(ch, CW / 2, baseline_y);
    updateDust(bg);
    ctx.fillStyle = dustPat || bg;
    ctx.fillText(ch, CW / 2, baseline_y);
    ctx.restore();

    /* ── 4. Dek copy text layered on top (desktop only) ── */
    if (textLayout) {
      ctx.save();
      canvas.style.fontVariationSettings = '"wght" 400';
      ctx.font         = textLayout.fs + 'px ' + FONT;
      ctx.textAlign    = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle    = ink;
      ctx.globalAlpha  = 0.85;
      textLayout.lines.forEach(function (line, i) {
        ctx.fillText(line, textLayout.x, textLayout.startY + i * textLayout.lineH);
      });
      ctx.restore();
    }
  }

  document.fonts.ready.then(function () {
    init();
    buildGlyphList();
    requestAnimationFrame(frame);
    var rafR;
    window.addEventListener('resize', function () {
      cancelAnimationFrame(rafR);
      rafR = requestAnimationFrame(function () {
        isMobile = window.innerWidth <= 480;
        init();
      });
    });
  });
}());
