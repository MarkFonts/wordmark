/* ============================================================
   CONFIG — edit this object to change behaviour.
   To swap fonts: change fillFontFamily / largeFontFamily and
   update axes to match your font's axis tags and ranges.
   ============================================================ */
var CONFIG = {
  // The two words rendered as the letterbox header
  words: ['WORD', 'MARK'],

  // Font used for the large scanned letterforms
  largeFontFamily: '"CalSans", -apple-system, sans-serif',
  largeWeight: 700,

  // Font used for the small fill text inside the letterforms
  fillFontFamily: '"CalSansUI", -apple-system, sans-serif',
  fillWeight: 400,
  fillSize: 10,           // px — matches letterbox.sh fill=10

  // Fraction of canvas width the words fill (0–1)
  widthFraction: 0.92,

  // Vertical padding in LINE_H units above/below the word block
  verticalPad: 3,

  // Gap between WORD and MARK rows, in LINE_H units
  wordGap: 2.4,

  // Variable font axes to animate on the FILL text only.
  // speed:   seconds for one full 0→100→0 cycle
  // mult:    speed multiplier per axis (so they drift out of phase)
  // min/max: axis value range
  // tag:     CSS font-variation-settings tag name
  axes: [
    { tag: 'wdth', min: 75,  max: 125, speed: 8, mult: 0.7 },
    { tag: 'SHRP', min: 0,   max: 100, speed: 8, mult: 0.9 }
  ]
};
/* ============================================================ */

(function () {
  'use strict';

  var CFG      = CONFIG;
  var FILL_SZ  = CFG.fillSize;
  var LINE_H   = Math.ceil(1.3 * FILL_SZ);
  var SCAN_SZ  = 1000;

  var LOREM = 'loremipsumdolorsitametconsecteturadipiscingelitseddoeiusmodtemporincididuntutlaboreetdoloremagnaaliquautenimadminimveniamquisnostrudexercitationullamcolaborisnisiutaliquipexeacommodoconsequatduisauteiruredolorinreprehenderitinvoluptatevelitessecillumdoloreeuefugiatnullapariaturexcepteursintoccaecatcupidatatnonproidentsuntinculpaquiofficiadeseruntmollitanimidestlaborumsedutperspiciatisaboreetdoloremagnaaliquautenimadminimveniamquisnostrudexercitationullamcolaborisnisiutundeomnisquisnostrudexercitationullamcolaborisnisiutistenaboreetdoloremagnaaliquautenimadminimveniamquisnostrudexercitationullamcolaborisnisiutuserrorsitvoluptatemaccusantiumdoloremquelaudantiumtotamremquisnostrudaperiameaaboreetdoloremagnaaliquautenimadminimveniamquisnostrudexercitationullamcolaborisnisiutinventoreveritatisetquasiarchitectobeatsequinesciuntvitaedictasuntexplicabonemoaboreetdoloremagnaaliquautenimadminimveniamquisnostrudexercitationullamcolaborisnisiutenimipsamvoluptatemquiavoluptassitaspernaturautodiquianonaboreetdoloremagnaaliquautenimadminimveniamquisnostrudexercitationullamcolaborisnisiutmagnamaliquamquaeratvoluptatemutenimadminimaveniamquisnostrumexercitationemullamcorporissuscipitlaboriosamnisiutaliquidexeacommodoconsequaturquisautemveleumiurereprehenderitquiineavoluptatevelitessequamnihilmolestiae';
  var POOL = LOREM.toLowerCase().repeat(5);

  var isMouseDown = false;
  window.addEventListener('mousedown', function () { isMouseDown = true; });
  window.addEventListener('mouseup',   function () { isMouseDown = false; });

  var canvas = document.getElementById('lb-canvas');
  var ctx    = canvas.getContext('2d');

  /* ── helpers ──────────────────────────────────────────── */

  // Returns the resolved bg/ink colours from CSS custom props
  function getThemeColours() {
    var style = getComputedStyle(document.documentElement);
    var bg  = style.getPropertyValue('--bg').trim()  || '#242424';
    var ink = style.getPropertyValue('--ink').trim() || '#ffffff';
    return { bg: bg, ink: ink };
  }

  // Build the font-variation-settings string for the FILL font,
  // given an array of { tag, value } pairs.
  function buildFVS(axisValues) {
    if (!axisValues || !axisValues.length) return 'normal';
    return axisValues.map(function (a) {
      return '"' + a.tag + '" ' + a.value.toFixed(2);
    }).join(', ');
  }

  /* ── scanWord ─────────────────────────────────────────── */
  function scanWord(word, fontSize) {
    var oc  = document.createElement('canvas');
    oc.width = oc.height = SCAN_SZ;
    var c   = oc.getContext('2d');
    c.font  = CFG.largeWeight + ' ' + fontSize + 'px ' + CFG.largeFontFamily;
    c.textBaseline = 'alphabetic';

    var mA  = c.measureText('A');
    var asc = mA.actualBoundingBoxAscent;
    var dsc = mA.actualBoundingBoxDescent;
    var cy  = (SCAN_SZ - (asc + dsc)) / 2 + asc;

    var mW  = c.measureText(word);
    var wid = mW.actualBoundingBoxLeft + mW.actualBoundingBoxRight;
    var cx  = (SCAN_SZ - wid) / 2 + mW.actualBoundingBoxLeft;

    c.fillStyle = '#000';
    c.fillText(word, cx - mW.actualBoundingBoxLeft, cy);

    var px     = c.getImageData(0, 0, SCAN_SZ, SCAN_SZ).data;
    var yStart = Math.max(0, Math.floor(cy - asc));
    var yEnd   = Math.min(SCAN_SZ, Math.ceil(cy + dsc));
    var rows   = [];

    for (var row = yStart; row < yEnd; row += LINE_H) {
      var col = new Uint8Array(SCAN_SZ);
      var end = Math.min(row + LINE_H, yEnd);
      for (var y = row; y < end; y++) {
        var base = y * SCAN_SZ * 4;
        for (var x = 0; x < SCAN_SZ; x++) {
          if (px[base + x * 4 + 3] > 60) col[x] = 1;
        }
      }
      var spans = [], s = -1;
      for (var x2 = 0; x2 <= SCAN_SZ; x2++) {
        if (x2 < SCAN_SZ && col[x2]) {
          if (s === -1) s = x2;
        } else if (s !== -1) {
          if (x2 - s > 4) spans.push({ x: s, w: x2 - s });
          s = -1;
        }
      }
      rows.push(spans);
    }

    return { rows: rows, scanH: Math.max(1, yEnd - yStart) };
  }

  /* ── buildAllChars ────────────────────────────────────── */
  function buildAllChars(CW, CH) {
    // Probe at a known size to derive fontSize
    var probe   = document.createElement('canvas').getContext('2d');
    var refSize = 200;
    probe.font  = CFG.largeWeight + ' ' + refSize + 'px ' + CFG.largeFontFamily;
    var maxWid  = 0;
    for (var i = 0; i < CFG.words.length; i++) {
      var m = probe.measureText(CFG.words[i]);
      var w = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
      if (w > maxWid) maxWid = w;
    }
    if (maxWid < 1) maxWid = refSize * (CFG.words[0].length || 4) * 0.6;
    var fontSize = (CW * CFG.widthFraction / maxWid) * refSize;

    var wordWidthInScan    = fontSize * (maxWid / refSize);
    var scanLeftEdge       = (SCAN_SZ - wordWidthInScan) / 2;
    var displayLeftEdge    = (CW - CW * CFG.widthFraction) / 2;
    var scaleX = (CW * CFG.widthFraction) / wordWidthInScan;
    var xShift = displayLeftEdge - scanLeftEdge * scaleX;

    var WORD_GAP = LINE_H * CFG.wordGap;
    var scans  = CFG.words.map(function (w) { return scanWord(w, fontSize); });
    var totalH = WORD_GAP * (scans.length - 1);
    for (var si = 0; si < scans.length; si++) totalH += scans[si].scanH;

    var yOff = Math.max(LINE_H * CFG.verticalPad, (CH - totalH) / 2);

    var sc = document.createElement('canvas').getContext('2d');
    sc.font = CFG.fillWeight + ' ' + FILL_SZ + 'px ' + CFG.fillFontFamily;

    var chars = [], pi = 0;

    for (var wi = 0; wi < scans.length; wi++) {
      var scan = scans[wi];

      for (var ri = 0; ri < scan.rows.length; ri++) {
        var hy    = yOff + ri * LINE_H;
        var spans = scan.rows[ri];

        for (var spi = 0; spi < spans.length; spi++) {
          var span = spans[spi];
          var x0   = span.x * scaleX + xShift;
          var x1   = (span.x + span.w) * scaleX + xShift;
          var cx   = x0;

          while (cx < x1) {
            var ch = POOL[pi % POOL.length]; pi++;
            var cw = sc.measureText(ch).width;
            if (cx + cw > x1) break;
            chars.push({ ch: ch, hx: cx, hy: hy, dx: 0, dy: 0 });
            cx += cw;
          }
        }
      }

      yOff += scan.scanH + WORD_GAP;
    }

    return chars;
  }

  /* ── computeCanvasHeight ──────────────────────────────── */
  function computeCanvasHeight(CW) {
    var probe   = document.createElement('canvas').getContext('2d');
    var refSize = 200;
    probe.font  = CFG.largeWeight + ' ' + refSize + 'px ' + CFG.largeFontFamily;
    var maxWid  = 0, totalScanH = 0;
    for (var i = 0; i < CFG.words.length; i++) {
      var m   = probe.measureText(CFG.words[i]);
      var w   = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
      if (w > maxWid) maxWid = w;
    }
    if (maxWid < 1) maxWid = refSize * (CFG.words[0].length || 4) * 0.6;
    var fontSize = (CW * CFG.widthFraction / maxWid) * refSize;

    for (var wi = 0; wi < CFG.words.length; wi++) {
      var sc2 = document.createElement('canvas').getContext('2d');
      sc2.font = CFG.largeWeight + ' ' + fontSize + 'px ' + CFG.largeFontFamily;
      sc2.textBaseline = 'alphabetic';
      var mA  = sc2.measureText('A');
      totalScanH += Math.ceil(mA.actualBoundingBoxAscent + mA.actualBoundingBoxDescent);
    }

    var WORD_GAP = LINE_H * CFG.wordGap;
    var totalH   = totalScanH + WORD_GAP * (CFG.words.length - 1);
    return Math.ceil(totalH + LINE_H * CFG.verticalPad * 2);
  }

  /* ── axis animation ──────────────────────────────────── */
  var startTime = null;

  function getCurrentAxisValues(nowMs) {
    if (startTime === null) startTime = nowMs;
    var elapsed = (nowMs - startTime) / 1000;
    return CFG.axes.map(function (axis) {
      var period = axis.speed * axis.mult;
      var phase  = elapsed / period;
      var t = Math.sin(Math.PI * phase);
      var v = axis.min + (axis.max - axis.min) * t * t;
      return { tag: axis.tag, value: v };
    });
  }

  /* ── drawFrame ────────────────────────────────────────── */
  function drawFrame(chars, CW, CH, dpr, mp, nowMs) {
    var colours    = getThemeColours();
    var axisValues = getCurrentAxisValues(nowMs);
    var fvs        = buildFVS(axisValues);
    var fillFont   = CFG.fillWeight + ' ' + FILL_SZ + 'px ' + CFG.fillFontFamily;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = colours.bg;
    ctx.fillRect(0, 0, CW, CH);

    ctx.fillStyle        = colours.ink;
    ctx.font             = fillFont;
    ctx.fontVariationSettings = fvs;
    ctx.textBaseline     = 'top';

    var radius   = isMouseDown ? 250 : 100;
    var strength = isMouseDown ? 105 : 35;
    var scalePk  = isMouseDown ? 6   : 4;

    for (var i = 0; i < chars.length; i++) {
      var c = chars[i];

      if (mp) {
        var tx   = c.hx + c.dx;
        var ty   = c.hy + c.dy;
        var rx   = tx - mp.x;
        var ry   = ty - mp.y;
        var dist = Math.sqrt(rx * rx + ry * ry);
        if (dist < radius && dist > 0) {
          var f = (1 - dist / radius) * strength * 0.3;
          c.dx += (rx / dist) * f;
          c.dy += (ry / dist) * f;
        }
      }
      c.dx *= 0.94;
      c.dy *= 0.94;

      var tx2 = c.hx + c.dx;
      var ty2 = c.hy + c.dy;
      var scale = 1;

      if (mp) {
        var d2 = Math.sqrt((tx2 - mp.x) * (tx2 - mp.x) + (ty2 - mp.y) * (ty2 - mp.y));
        if (d2 < radius) scale = 1 + (scalePk - 1) * (1 - d2 / radius);
      }

      if (scale > 1.05) {
        var sz = FILL_SZ * scale;
        ctx.font = CFG.fillWeight + ' ' + sz.toFixed(1) + 'px ' + CFG.fillFontFamily;
        ctx.fillText(c.ch, tx2, ty2 - (sz - FILL_SZ) * 0.5);
        ctx.font = fillFont;
      } else {
        ctx.fillText(c.ch, tx2, ty2);
      }
    }
  }

  /* ── init / loop ──────────────────────────────────────── */
  var chars = [], rafId = null, mp = null, CW, CH, dpr;

  function init() {
    dpr = window.devicePixelRatio || 1;
    CW  = canvas.offsetWidth;

    var isMobile = CW < 680;
    CFG.words         = isMobile ? ['WO','RD','MA','RK'] : CONFIG.words;
    CFG.widthFraction = isMobile ? 0.72 : CONFIG.widthFraction;
    CFG.wordGap       = isMobile ? 1.6  : CONFIG.wordGap;
    CH  = computeCanvasHeight(CW);

    canvas.style.height = CH + 'px';
    canvas.width  = Math.round(CW * dpr);
    canvas.height = Math.round(CH * dpr);

    chars = buildAllChars(CW, CH);
    if (!rafId) rafId = requestAnimationFrame(loop);
  }

  function loop(nowMs) {
    rafId = null;
    drawFrame(chars, CW, CH, dpr, mp, nowMs);
    rafId = requestAnimationFrame(loop);
  }

  canvas.addEventListener('mousemove', function (e) {
    var r = canvas.getBoundingClientRect();
    mp = { x: e.clientX - r.left, y: e.clientY - r.top };
  });
  canvas.addEventListener('mouseleave', function () { mp = null; });

  document.fonts.ready.then(function () {
    init();
    var t;
    window.addEventListener('resize', function () {
      clearTimeout(t);
      t = setTimeout(init, 200);
    });
  });

  // Re-draw on theme change (colours update from CSS vars)
  var observer = new MutationObserver(function () {
    if (chars.length) drawFrame(chars, CW, CH, dpr, mp, performance.now());
  });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

}());
