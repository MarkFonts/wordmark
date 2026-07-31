/* ============================================================
   CONFIG — hero (WORD / MARK, two rows)
   Edit this object to change the hero letterbox behaviour.
   ============================================================ */
var CONFIG = {
  words:           ['WORD', 'MARK'],
  largeFontFamily: '"CalSans", -apple-system, sans-serif',
  largeWeight:     700,
  fillFontFamily:  '"CalSans", -apple-system, sans-serif',
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
  fillFontFamily:  '"CalSans", -apple-system, sans-serif',
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

  // Letterbox fill — Jerome K. Jerome, "Three Men in a Boat" (1889), public domain.
  // Original case; word spaces render as thin spaces (U+2009) in the draw loop below.
  var POOL = "I do think that of all the silly irritating tomfoolishness by which we are plagued this weather forecast fraud is about the most aggravating It forecasts precisely what happened yesterday or the day before and precisely the opposite of what is going to happen to day I remember a holiday of mine being completely ruined one late autumn by our paying attention to the weather report of the local newspaper Heavy showers with thunderstorms may be expected to day it would say on Monday and so we would give up our picnic and stop indoors all day waiting for the rain And people would pass the house going off in wagonettes and coaches as jolly and merry as could be the sun shining out and not a cloud to be seen".repeat(6);

  /* Dev fill switcher (disabled) — re-enable to A/B different texts via ?fill= in the URL:
       lorem | twain | twain-sp | jerome | jerome-sp   ("-sp" keeps word spaces)
  var FILL_TEXTS = {"lorem": "loremipsumdolorsitametconsecteturadipiscingelitseddoeiusmodtemporincididuntutlaboreetdoloremagnaaliquautenimadminimveniamquisnostrudexercitationullamcolaborisnisiutaliquipexeacommodoconsequatduisauteiruredolorinreprehenderitinvoluptatevelitessecillumdoloreeuefugiatnullapariaturexcepteursintoccaecatcupidatatnonproidentsuntinculpaquiofficiadeseruntmollitanimidestlaborumsedutperspiciatisaboreetdoloremagnaaliquautenimadminimveniamquisnostrudexercitationullamcolaborisnisiutundeomnisquisnostrudexercitationullamcolaborisnisiutistenaboreetdoloremagnaaliquautenimadminimveniamquisnostrudexercitationullamcolaborisnisiutuserrorsitvoluptatemaccusantiumdoloremquelaudantiumtotamremquisnostrudaperiameaaboreetdoloremagnaaliquautenimadminimveniamquisnostrudexercitationullamcolaborisnisiutinventoreveritatisetquasiarchitectobeatsequinesciuntvitaedictasuntexplicabonemoaboreetdoloremagnaaliquautenimadminimveniamquisnostrudexercitationullamcolaborisnisiutenimipsamvoluptatemquiavoluptassitaspernaturautodiquianonaboreetdoloremagnaaliquautenimadminimveniamquisnostrudexercitationullamcolaborisnisiutmagnamaliquamquaeratvoluptatemutenimadminimaveniamquisnostrumexercitationemullamcorporissuscipitlaboriosamnisiutaliquidexeacommodoconsequaturquisautemveleumiurereprehenderitquiineavoluptatevelitessequamnihilmolestiae", "twain": "SomeauthoritiesholdthattheyoungoughtnottolieatallThatofcourseisputtingitratherstrongerthannecessarystillwhileIcannotgoquitesofarasthatIdomaintainandIbelieveIamrightthattheyoungoughttobetemperateintheuseofthisgreatartuntilpracticeandexperienceshallgivethemthatconfidenceeleganceandprecisionwhichalonecanmaketheaccomplishmentgracefulandprofitablePatiencediligencepainstakingattentiontodetailthesearerequirementstheseintimewillmakethestudentperfectupontheseonlymayherelyasthesurefoundationforfutureeminenceThinkwhattediousyearsofstudythoughtpracticeexperiencewenttotheequipmentofthatpeerlessoldmasterwhowasabletoimposeuponthewholeworldtheloftyandsoundingmaximthatTruthismightyandwillprevailthemostmajesticcompoundfractureoffactwhichanyofwomanbornhasyetachievedForthehistoryofourraceandeachindividualsexperiencearesewnthickwithevidencesthatatruthisnothardtokillandthataliewelltoldisimmortalWhyyoumightaswelltellthetruthatonceandbedonewithitAfinalwordbeginyourpracticeofthisgraciousandbeautifulartearlybeginnowIfIhadbegunearlierIcouldhavelearnedhow", "twain-sp": "Some authorities hold that the young ought not to lie at all That of course is putting it rather stronger than necessary still while I cannot go quite so far as that I do maintain and I believe I am right that the young ought to be temperate in the use of this great art until practice and experience shall give them that confidence elegance and precision which alone can make the accomplishment graceful and profitable Patience diligence painstaking attention to detail these are requirements these in time will make the student perfect upon these only may he rely as the sure foundation for future eminence Think what tedious years of study thought practice experience went to the equipment of that peerless old master who was able to impose upon the whole world the lofty and sounding maxim that Truth is mighty and will prevail the most majestic compound fracture of fact which any of woman born has yet achieved For the history of our race and each individuals experience are sewn thick with evidences that a truth is not hard to kill and that a lie well told is immortal Why you might as well tell the truth at once and be done with it A final word begin your practice of this gracious and beautiful art early begin now If I had begun earlier I could have learned how", "jerome": "IdothinkthatofallthesillyirritatingtomfoolishnessbywhichweareplaguedthisweatherforecastfraudisaboutthemostaggravatingItforecastspreciselywhathappenedyesterdayorthedaybeforeandpreciselytheoppositeofwhatisgoingtohappentodayIrememberaholidayofminebeingcompletelyruinedonelateautumnbyourpayingattentiontotheweatherreportofthelocalnewspaperHeavyshowerswiththunderstormsmaybeexpectedtodayitwouldsayonMondayandsowewouldgiveupourpicnicandstopindoorsalldaywaitingfortherainAndpeoplewouldpassthehousegoingoffinwagonettesandcoachesasjollyandmerryascouldbethesunshiningoutandnotacloudtobeseen", "jerome-sp": "I do think that of all the silly irritating tomfoolishness by which we are plagued this weather forecast fraud is about the most aggravating It forecasts precisely what happened yesterday or the day before and precisely the opposite of what is going to happen to day I remember a holiday of mine being completely ruined one late autumn by our paying attention to the weather report of the local newspaper Heavy showers with thunderstorms may be expected to day it would say on Monday and so we would give up our picnic and stop indoors all day waiting for the rain And people would pass the house going off in wagonettes and coaches as jolly and merry as could be the sun shining out and not a cloud to be seen"};
  var _fill = (new URLSearchParams(location.search).get('fill') || 'jerome-sp').toLowerCase();
  var POOL = (FILL_TEXTS[_fill] || FILL_TEXTS['jerome-sp']).repeat(6);
  */

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
  function createLetterbox(canvasEl, CFG, frontEls) {
    if (!canvasEl) return;

    var ctx    = canvasEl.getContext('2d');
    // Optional extra front-layer canvases (z-depth speckle). allCtxs[0] = back
    // (main canvas), allCtxs[1+] = front layers. Single-canvas when none passed.
    frontEls   = frontEls || [];
    var allEls  = [canvasEl].concat(frontEls);
    var allCtxs = allEls.map(function (el) { return el.getContext('2d'); });
    var NLAYERS = allCtxs.length;

    // Speckle "juggle": ~1/3 of glyphs are painted on BOTH canvases — full ink on
    // the back, oscillating alpha on the front. On the flat WORDMARK the back copy
    // makes them look solid (the fading front copy is invisible, ink over ink); but
    // where an image sits between the layers the back copy is hidden, so only the
    // fading front copy shows and those letters shimmer in/out over the image.
    // splitActive refreshed each build (buildAllChars) to handle breakpoint crossings.
    var splitActive   = true;
    var JUGGLE_GROUPS = 3;          // the "on top" third rotates through this many phase groups
    var JUGGLE_SPEED  = 0.0016;     // rad/ms → ~4s cycle
    function seededFrac(i, salt) {
      var x = Math.sin(i * 127.1 + 311.7 + salt) * 43758.5453;
      return x - Math.floor(x);
    }

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
      splitActive = window.matchMedia('(min-width: 681px)').matches;   // fresh per build
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
              var ch = POOL[pi % POOL.length];
              if (ch === ' ') ch = '\u2009';   // render every word-space as a thin space (U+2009)
              var cw = sc.measureText(ch).width;
              if (cx2 + cw > x1) break;   // doesn't fit — leave it for the next span, don't consume/drop it
              pi++;
              var idx = chars.length;
              var grp = Math.floor(seededFrac(idx, 5) * JUGGLE_GROUPS);
              chars.push({ ch: ch, hx: cx2, hy: hy, dx: 0, dy: 0,
                           jphase: grp * (6.2832 / JUGGLE_GROUPS) });   // front-alpha phase
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

    /* ── draw one glyph on a context (handles the mouse-scale size swap) ── */
    function drawGlyph(g, c, tx2, ty2, scale, fillFont) {
      if (scale > 1.05) {
        var sz = FILL_SZ * scale;
        g.font = CFG.fillWeight + ' ' + sz.toFixed(1) + 'px ' + CFG.fillFontFamily;
        g.fillText(c.ch, tx2, ty2 - (sz - FILL_SZ) * 0.5);
        g.font = fillFont;
      } else {
        g.fillText(c.ch, tx2, ty2);
      }
    }

    /* ── drawFrame ──────────────────────────────────────── */
    function drawFrame(chars, CW, CH, dpr, mp, nowMs) {
      var colours    = getThemeColours();
      var axisValues = getCurrentAxisValues(nowMs);
      var fvs        = buildFVS(axisValues);
      var fillFont   = CFG.fillWeight + ' ' + FILL_SZ + 'px ' + CFG.fillFontFamily;

      for (var li = 0; li < allCtxs.length; li++) {
        var lc = allCtxs[li];
        lc.setTransform(dpr, 0, 0, dpr, 0, 0);
        lc.clearRect(0, 0, CW, CH);
        lc.fillStyle             = colours.ink;   // all layers ink; z-order alone makes the speckle
        lc.font                  = fillFont;
        lc.fontVariationSettings = fvs;
        lc.textBaseline          = 'top';
      }

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

        // back canvas — every glyph at full ink (the flat WORDMARK stays complete)
        drawGlyph(allCtxs[0], c, tx2, ty2, scale, fillFont);
        // front canvas — same glyph at a group-phased alpha. Invisible on the flat
        // WORDMARK (ink over the full back copy), but over an image the back copy is
        // hidden so only this shows → the visible "top" third rotates over the image.
        if (splitActive && allCtxs[1]) {
          var a  = 0.5 + 0.5 * Math.sin(nowMs * JUGGLE_SPEED + c.jphase);
          var fc = allCtxs[1];
          fc.globalAlpha = a * a;            // squared → one third clearly dominates
          drawGlyph(fc, c, tx2, ty2, scale, fillFont);
          fc.globalAlpha = 1;
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

      for (var ei = 0; ei < allEls.length; ei++) {
        var el = allEls[ei];
        el.style.width  = CW + 'px';
        el.style.height = CH + 'px';
        el.width  = Math.round(CW * dpr);
        el.height = Math.round(CH * dpr);
      }

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
  var heroEl       = document.getElementById('lb-canvas');
  var footerEl     = document.getElementById('lb-footer');
  var footerFront  = document.getElementById('lb-footer-front');   // z-depth speckle layer

  // Draw immediately with whatever fonts are available to avoid blank frames
  var initHero   = createLetterbox(heroEl,   CONFIG);
  var initFooter = createLetterbox(footerEl, CONFIG_FOOTER, footerFront ? [footerFront] : null);

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
