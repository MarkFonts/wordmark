/* ============================================================
   CONFIG — hero (WORD / MARK, two rows)
   Edit this object to change the hero letterbox behaviour.
   ============================================================ */
var CONFIG = {
  words:           ['WORD', 'MARK'],
  largeFontFamily: '"CalSans", -apple-system, sans-serif',
  largeWeight:     700,
  fillFontFamily:  '"CalSansUI", -apple-system, sans-serif',
  fillWeight:      400,
  fillSize:        10,        // px at reference width
  widthFraction:   0.92,      // fraction of layout width the words fill
  verticalPad:     3,         // LINE_H units of padding above/below word block
  wordGap:         2.4,       // LINE_H units between rows
  axes: [
    { tag: 'wdth', min: 75,  max: 125, speed: 8, mult: 0.7 },
    { tag: 'SHRP', min: 0,   max: 100, speed: 8, mult: 0.9 }
  ],
  maxWidth:       850,        // layout cap (px); Infinity = full parent width
  heroHeightFrac: 0.7,        // fraction of vh used to vertically centre the block
  extraBottomPad: 310         // px (at 850px ref) of breathing room below letterforms
};

/* ============================================================
   CONFIG — footer (WORDMARK, one line, full browser width)
   ============================================================ */
var CONFIG_FOOTER = {
  words:           ['WORDMARK'],
  largeFontFamily: '"CalSans", -apple-system, sans-serif',
  largeWeight:     700,
  fillFontFamily:  '"CalSansUI", -apple-system, sans-serif',
  fillWeight:      400,
  fillSize:        10,
  widthFraction:   0.98,
  verticalPad:     0,
  wordGap:         0,
  axes: [
    { tag: 'wdth', min: 75,  max: 125, speed: 8, mult: 0.7 },
    { tag: 'SHRP', min: 0,   max: 100, speed: 8, mult: 0.9 }
  ],
  maxWidth:       Infinity,
  heroHeightFrac: 0,
  topPadVh:       0.2,        // 1/5 screen gap above letters — viewport-height based
  extraTopPad:    0,
  extraBottomPad: 0,
  minFillSize:    6
};

/* ============================================================
   Shared input state
   ============================================================ */
(function () {
  'use strict';

  var isMouseDown = false;
  window.addEventListener('mousedown', function () { isMouseDown = true; });
  window.addEventListener('mouseup',   function () { isMouseDown = false; });

  var LOREM = 'loremipsumdolorsitametconsecteturadipiscingelitseddoeiusmodtemporincididuntutlaboreetdoloremagnaaliquautenimadminimveniamquisnostrudexercitationullamcolaborisnisiutaliquipexeacommodoconsequatduisauteiruredolorinreprehenderitinvoluptatevelitessecillumdoloreeuefugiatnullapariaturexcepteursintoccaecatcupidatatnonproidentsuntinculpaquiofficiadeseruntmollitanimidestlaborumsedutperspiciatisaboreetdoloremagnaaliquautenimadminimveniamquisnostrudexercitationullamcolaborisnisiutundeomnisquisnostrudexercitationullamcolaborisnisiutistenaboreetdoloremagnaaliquautenimadminimveniamquisnostrudexercitationullamcolaborisnisiutuserrorsitvoluptatemaccusantiumdoloremquelaudantiumtotamremquisnostrudaperiameaaboreetdoloremagnaaliquautenimadminimveniamquisnostrudexercitationullamcolaborisnisiutinventoreveritatisetquasiarchitectobeatsequinesciuntvitaedictasuntexplicabonemoaboreetdoloremagnaaliquautenimadminimveniamquisnostrudexercitationullamcolaborisnisiutenimipsamvoluptatemquiavoluptassitaspernaturautodiquianonaboreetdoloremagnaaliquautenimadminimveniamquisnostrudexercitationullamcolaborisnisiutmagnamaliquamquaeratvoluptatemutenimadminimaveniamquisnostrumexercitationemullamcorporissuscipitlaboriosamnisiutaliquidexeacommodoconsequaturquisautemveleumiurereprehenderitquiineavoluptatevelitessequamnihilmolestiae';
  var POOL = LOREM.toLowerCase().repeat(5);

  /* ── helpers ──────────────────────────────────────────── */
  function getThemeColours() {
    var style = getComputedStyle(document.documentElement);
    var bg  = style.getPropertyValue('--bg').trim()  || '#242424';
    var ink = style.getPropertyValue('--ink').trim() || '#ffffff';
    return { bg: bg, ink: ink };
  }

  function buildFVS(axisValues) {
    if (!axisValues || !axisValues.length) return 'normal';
    return axisValues.map(function (a) {
      return '"' + a.tag + '" ' + a.value.toFixed(2);
    }).join(', ');
  }

  /* ============================================================
     Factory — one call per canvas
     ============================================================ */
  function createLetterbox(canvasEl, CFG) {
    if (!canvasEl) return;

    var ctx    = canvasEl.getContext('2d');
    var FILL_SZ = CFG.fillSize;
    var LINE_H  = Math.ceil(1.3 * FILL_SZ);

    /* ── scanWord ───────────────────────────────────────── */
    function scanWord(word, fontSize, SCAN_SZ) {
      var oc = document.createElement('canvas');
      oc.width = oc.height = SCAN_SZ;
      var c  = oc.getContext('2d');
      c.font = CFG.largeWeight + ' ' + fontSize + 'px ' + CFG.largeFontFamily;
      c.textBaseline = 'alphabetic';

      var mW  = c.measureText(word);
      var wid = mW.actualBoundingBoxLeft + mW.actualBoundingBoxRight;
      var cx  = (SCAN_SZ - wid) / 2 + mW.actualBoundingBoxLeft;
      var asc = mW.actualBoundingBoxAscent;
      var dsc = mW.actualBoundingBoxDescent;
      var cy  = (SCAN_SZ - (asc + dsc)) / 2 + asc;

      c.fillStyle = '#000';
      c.fillText(word, cx - mW.actualBoundingBoxLeft, cy);

      var px     = c.getImageData(0, 0, SCAN_SZ, SCAN_SZ).data;
      var yStart = Math.max(0, Math.floor(cy - asc - LINE_H * 0.5));
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

    /* ── buildAllChars ──────────────────────────────────── */
    function buildAllChars(CW, layoutCW, heroH) {
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
      var fontSize = (layoutCW * CFG.widthFraction / maxWid) * refSize;

      var SCAN_SZ         = Math.max(1000, Math.ceil(layoutCW * 1.1));
      var wordWidthInScan = fontSize * (maxWid / refSize);
      var scanLeftEdge    = (SCAN_SZ - wordWidthInScan) / 2;
      var displayLeftEdge = (CW - wordWidthInScan) / 2;
      var xShift          = displayLeftEdge - scanLeftEdge;

      var WORD_GAP = LINE_H * CFG.wordGap;
      var scans    = CFG.words.map(function (w) { return scanWord(w, fontSize, SCAN_SZ); });
      var totalH   = WORD_GAP * (scans.length - 1);
      for (var si = 0; si < scans.length; si++) totalH += scans[si].scanH;

      var refW2  = Math.min(CW, 850);
      var topPad = LINE_H * CFG.verticalPad + (CFG.extraTopPad || 0) * (refW2 / 850) + (CFG.topPadVh || 0) * window.innerHeight;
      var yOff   = Math.max(topPad, (heroH - totalH) / 2);

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
            var x0   = span.x + xShift;
            var x1   = (span.x + span.w) + xShift;
            var cx2  = x0;
            while (cx2 < x1) {
              var ch = POOL[pi % POOL.length]; pi++;
              var cw = sc.measureText(ch).width;
              if (cx2 + cw > x1) break;
              chars.push({ ch: ch, hx: cx2, hy: hy, dx: 0, dy: 0 });
              cx2 += cw;
            }
          }
        }
        yOff += scan.scanH + WORD_GAP;
      }

      return chars;
    }

    /* ── computeCanvasHeight ────────────────────────────── */
    function computeCanvasHeight(CW, layoutCW, heroH) {
      var probe   = document.createElement('canvas').getContext('2d');
      var refSize = 200;
      probe.font  = CFG.largeWeight + ' ' + refSize + 'px ' + CFG.largeFontFamily;
      var maxWid  = 0, totalScanH = 0;
      for (var i = 0; i < CFG.words.length; i++) {
        var m = probe.measureText(CFG.words[i]);
        var w = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
        if (w > maxWid) maxWid = w;
      }
      if (maxWid < 1) maxWid = refSize * (CFG.words[0].length || 4) * 0.6;
      var fontSize = (layoutCW * CFG.widthFraction / maxWid) * refSize;

      for (var wi = 0; wi < CFG.words.length; wi++) {
        var sc2 = document.createElement('canvas').getContext('2d');
        sc2.font = CFG.largeWeight + ' ' + fontSize + 'px ' + CFG.largeFontFamily;
        sc2.textBaseline = 'alphabetic';
        var mW2 = sc2.measureText(CFG.words[wi]);
        totalScanH += Math.ceil(mW2.actualBoundingBoxAscent + mW2.actualBoundingBoxDescent + LINE_H * 0.5);
      }

      var WORD_GAP = LINE_H * CFG.wordGap;
      var totalH   = totalScanH + WORD_GAP * (CFG.words.length - 1);
      var refW     = Math.min(CW, 850);
      var topPad   = LINE_H * CFG.verticalPad + (CFG.extraTopPad  || 0) * (refW / 850) + (CFG.topPadVh || 0) * window.innerHeight;
      var botPad   = LINE_H * CFG.verticalPad + (CFG.extraBottomPad || 0) * (refW / 850);
      var yOff     = Math.max(topPad, (heroH - totalH) / 2);
      return Math.ceil(yOff + totalH + botPad);
    }

    /* ── axis animation ─────────────────────────────────── */
    var startTime = null;

    function getCurrentAxisValues(nowMs) {
      if (startTime === null) startTime = nowMs;
      var elapsed = (nowMs - startTime) / 1000;
      return CFG.axes.map(function (axis) {
        var period = axis.speed * axis.mult;
        var t = Math.sin(Math.PI * (elapsed / period));
        var v = axis.min + (axis.max - axis.min) * t * t;
        return { tag: axis.tag, value: v };
      });
    }

    /* ── drawFrame ──────────────────────────────────────── */
    function drawFrame(chars, CW, CH, dpr, mp, nowMs) {
      var colours    = getThemeColours();
      var axisValues = getCurrentAxisValues(nowMs);
      var fvs        = buildFVS(axisValues);
      var fillFont   = CFG.fillWeight + ' ' + FILL_SZ + 'px ' + CFG.fillFontFamily;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, CW, CH);

      ctx.fillStyle             = colours.ink;
      ctx.font                  = fillFont;
      ctx.fontVariationSettings = fvs;
      ctx.textBaseline          = 'top';

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

    /* ── init / loop ────────────────────────────────────── */
    var chars = [], rafId = null, mp = null, CW, CH, dpr;

    function init() {
      dpr = window.devicePixelRatio || 1;
      var parentW  = Math.floor(canvasEl.parentElement.getBoundingClientRect().width);
      var capW     = isFinite(CFG.maxWidth) ? CFG.maxWidth : parentW;
      CW           = Math.max(Math.min(parentW, capW), 320);
      var layoutCW = CW;


      FILL_SZ = Math.max(CFG.minFillSize || 0, CFG.fillSize * Math.pow(Math.min(CW, 850) / 850, 1.4));
      LINE_H  = Math.ceil(1.3 * FILL_SZ);

      var heroH = CFG.heroHeightFrac > 0 ? Math.round(window.innerHeight * CFG.heroHeightFrac) : 0;
      CH = computeCanvasHeight(CW, layoutCW, heroH);

      canvasEl.style.width  = CW + 'px';
      canvasEl.style.height = CH + 'px';
      canvasEl.width  = Math.round(CW * dpr);
      canvasEl.height = Math.round(CH * dpr);

      chars = buildAllChars(CW, layoutCW, heroH);
      drawFrame(chars, CW, CH, dpr, mp, performance.now());
      if (!rafId) rafId = requestAnimationFrame(loop);
    }

    function loop(nowMs) {
      rafId = null;
      drawFrame(chars, CW, CH, dpr, mp, nowMs);
      rafId = requestAnimationFrame(loop);
    }

    canvasEl.addEventListener('mousemove', function (e) {
      var r = canvasEl.getBoundingClientRect();
      mp = { x: e.clientX - r.left, y: e.clientY - r.top };
    });
    canvasEl.addEventListener('mouseleave', function () { mp = null; });

    // Re-draw on theme change
    var observer = new MutationObserver(function () {
      if (chars.length) drawFrame(chars, CW, CH, dpr, mp, performance.now());
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    return init;  // expose init so the resize handler can call it
  }

  /* ── bootstrap both canvases ──────────────────────────── */
  var heroEl   = document.getElementById('lb-canvas');
  var footerEl = document.getElementById('lb-footer');

  // Draw immediately with whatever fonts are available to avoid blank frames
  var initHero   = createLetterbox(heroEl,   CONFIG);
  var initFooter = createLetterbox(footerEl, CONFIG_FOOTER);

  document.fonts.ready.then(function () {
    if (initHero)   initHero();
    if (initFooter) initFooter();

    var rafResize;
    window.addEventListener('resize', function () {
      cancelAnimationFrame(rafResize);
      rafResize = requestAnimationFrame(function () {
        if (initHero)   initHero();
        if (initFooter) initFooter();
      });
    });
  });

}());
