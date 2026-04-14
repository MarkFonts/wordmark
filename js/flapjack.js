(function () {
  'use strict';

  var canvas      = document.getElementById('flapjack-canvas');
  var wordEl      = document.getElementById('fj-word');
  var markEl      = document.getElementById('fj-mark');
  if (!canvas || !wordEl || !markEl) return;

  // Individual letter spans — WORD letters get word axis values, MARK get mark
  var wordLetters = Array.from(wordEl.querySelectorAll('.fj-letter'));
  var markLetters = Array.from(markEl.querySelectorAll('.fj-letter'));

  var ctx = canvas.getContext('2d');

  // Per-wave canvases — one per WAVES entry, drawn individually so they can
  // sit at different z-index values and interleave with the letter spans.
  var waveCanvases = Array.from(document.querySelectorAll('.fj-wave')).map(function (c) {
    return { el: c, ctx: c.getContext('2d') };
  });
  var MONO_FONT = '"CalSansUI", -apple-system, sans-serif';

  /* ── hidden canvas — Three.js CanvasTexture target ───── */
  // Keeps a live 2D render of WORD / MARK at current axis values so a
  // THREE.CanvasTexture can consume it. Exposed as window.wmTextCanvas.
  // Note: canvas 2D font strings map numeric weight → wght axis only;
  // FLIP and FLOP can't be set via ctx.font — resolve when Three.js scene lands.
  var hiddenCanvas     = document.createElement('canvas');
  var hctx             = hiddenCanvas.getContext('2d');
  window.wmTextCanvas  = hiddenCanvas; // THREE.CanvasTexture hook

  var FONT_POOL = [
    '"CalSansUI", sans-serif',
    '"Ambulia Text", serif',
    '"Anglev1", sans-serif',
    '"Gaussian", sans-serif',
    '"Horizon", sans-serif',
    '"Pang Serif", serif',
  ];

  /* ── wave configs ─────────────────────────────────────── */
  var WAVES = [
    { amp: 0.26, freq: 1.7, phase: 0.00, speed: 0.38 },
    { amp: 0.18, freq: 2.4, phase: 1.13, speed: 0.27 },
    { amp: 0.30, freq: 1.1, phase: 2.41, speed: 0.33 },
    { amp: 0.14, freq: 2.9, phase: 0.74, speed: 0.51 },
    { amp: 0.20, freq: 1.9, phase: 3.17, speed: 0.30 }
  ];

  /* ── travelling colour comet ─────────────────────────────
     One colour at a time sweeps left → right across all wave
     strokes. Each pass takes 2 × WGHT_PERIOD seconds; colours
     sequence: orange → purple → green → pink → repeat.       */
  var WGHT_PERIOD   = 18;                      // must match wghtSnap PERIOD
  var EPOCH_DUR     = WGHT_PERIOD * 2;         // 36 s per colour pass
  var TRAVEL_COLORS = ['#e8650a', '#7C00F6', '#00a67e', '#ff2d55']; // orange purple green pink

  function cometColorAt(s) {
    var idx = Math.floor(s / EPOCH_DUR) % TRAVEL_COLORS.length;
    var p   = (s % EPOCH_DUR) / EPOCH_DUR;
    var c   = TRAVEL_COLORS[idx];
    var n   = TRAVEL_COLORS[(idx + 1) % TRAVEL_COLORS.length];
    return 'rgb(' +
      Math.round(parseInt(c.slice(1,3),16)*(1-p) + parseInt(n.slice(1,3),16)*p) + ',' +
      Math.round(parseInt(c.slice(3,5),16)*(1-p) + parseInt(n.slice(3,5),16)*p) + ',' +
      Math.round(parseInt(c.slice(5,7),16)*(1-p) + parseInt(n.slice(5,7),16)*p) + ')';
  }

  function travelGradient(wxCtx, t) {
    var idx  = Math.floor(t / EPOCH_DUR) % TRAVEL_COLORS.length;
    var prog = (t % EPOCH_DUR) / EPOCH_DUR;   // 0 → 1 across the pass
    var hex  = TRAVEL_COLORS[idx];
    var r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    var rgba = function(a) { return 'rgba('+r+','+g+','+b+','+a.toFixed(2)+')'; };

    // Comet: long soft tail behind, short sharp lead ahead
    var TRAIL = 0.55, LEAD = 0.07;
    var pk = prog;

    // Build stops clamped to [0,1], sorted, duplicates merged
    var raw = [
      [0,          rgba(0)],
      [pk - TRAIL, rgba(0)],
      [pk,         rgba(1)],
      [pk + LEAD,  rgba(0)],
      [1,          rgba(0)]
    ].map(function(s) { return [Math.max(0, Math.min(1, s[0])), s[1]]; })
     .sort(function(a, b) { return a[0] - b[0]; });

    var grd  = wxCtx.createLinearGradient(0, 0, CW, 0);
    var last = -1;
    raw.forEach(function(s) {
      if (s[0] > last + 0.0001) { grd.addColorStop(s[0], s[1]); last = s[0]; }
    });
    return grd;
  }

  /* ── auto-oscillators ─────────────────────────────────── */
  var OSC = {
    wght: { lo: 100, hi: 990 }
    // FLIP / FLOP oscillators removed — axes only respond to mouse hover
    // wordFlip: { sp: 2.60, ph: 0.00, lo: 0, hi: 78 },
    // wordFlop: { sp: 0.628, ph: -1.571, lo: 0, hi: 78, linear: true },
    // markFlip: { sp: 2.30,  ph: 2.10,  lo: 0, hi: 78 },
    // markFlop: { sp: 0.628, ph: -1.571, lo: 0, hi: 78, linear: true }
  };

  // wght: slow, undramatic sine — drifts through the middle, barely grazes extremes.
  function wghtSnap(t) {
    var PERIOD = 18; // seconds per full cycle
    return OSC.wght.lo + (OSC.wght.hi - OSC.wght.lo) * 0.5 *
           (1 + Math.sin((2 * Math.PI / PERIOD) * t));
  }

  /* ── mouse / hover ────────────────────────────────────── */
  var mouse = { active: false, nx: 0.5, ny: 0.5 };

  function onMove(e) {
    var r = canvas.getBoundingClientRect();
    mouse.active = true;
    mouse.nx = Math.min(Math.max((e.clientX - r.left) / r.width,  0), 1);
    mouse.ny = Math.min(Math.max((e.clientY - r.top)  / r.height, 0), 1);
  }
  function onLeave() { mouse.active = false; }

  canvas.addEventListener('mousemove',  onMove);
  canvas.addEventListener('mouseleave', onLeave);
  document.getElementById('flapjack-text').style.pointerEvents = 'auto';
  document.getElementById('flapjack-text').addEventListener('mousemove',  onMove);
  document.getElementById('flapjack-text').addEventListener('mouseleave', onLeave);

  function axisValues(t) {
    if (mouse.active) {
      var w = wghtSnap(t);
      return {
        wordWght: w,
        wordFlip: mouse.ny * 79,
        wordFlop: mouse.nx * 78,
        markWght: w,
        markFlip: (1 - mouse.ny) * 79,
        markFlop: mouse.nx * 78
      };
    }
    // Idle: wght snaps between extremes; FLIP/FLOP held at 0
    var w = wghtSnap(t);
    return {
      wordWght: w,
      wordFlip: 0,
      wordFlop: 0,
      markWght: w,
      markFlip: 0,
      markFlop: 0
    };
  }

  /* ── theme ────────────────────────────────────────────── */
  function getColours() {
    var s = getComputedStyle(document.documentElement);
    return {
      bg:  s.getPropertyValue('--bg').trim()  || '#242424',
      ink: s.getPropertyValue('--ink').trim() || '#ffffff'
    };
  }

  /* ── layout ───────────────────────────────────────────── */
  var CW, CH, dpr;

  function init() {
    // Cap dpr at 2 — a 3× iPhone has 9× the pixels, tanking mobile fps
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    CW  = Math.max(Math.floor(canvas.parentElement.getBoundingClientRect().width), 320);

    CH = Math.round(window.innerHeight * 0.666) + 20;

    canvas.style.width  = CW + 'px';
    canvas.style.height = CH + 'px';
    canvas.width  = Math.round(CW * dpr);
    canvas.height = Math.round(CH * dpr);
    // Propagate tnum to ctx.font — Chromium reads feature settings from the
    // canvas element's CSS; Safari/Firefox fall back to proportional digits.
    canvas.style.fontFeatureSettings  = '"tnum" 1';
    canvas.style.fontVariantNumeric   = 'tabular-nums';

    // Size per-wave canvases to match main canvas
    waveCanvases.forEach(function (wc) {
      wc.el.width  = Math.round(CW * dpr);
      wc.el.height = Math.round(CH * dpr);
    });

    // Keep the text overlay sized to match the canvas
    document.documentElement.style.setProperty('--fj-ch', CH + 'px');
  }


  /* ── waves ────────────────────────────────────────────── */
  // Path drawn as cubic bezier segments (one per quarter period)
  // using the exact tangent at each anchor point, so the bezier
  // curves ARE the sine shape and the handles are the real control arms.
  // Handles shown only at half-period anchors (peaks + troughs).
  var waveReadout = [];

  // On narrow screens scale all amps so the largest reaches 80 % of CH
  var MAX_AMP = Math.max.apply(null, WAVES.map(function (w) { return w.amp; }));

  function drawWaves(t, clr) {
    waveReadout = [];
    var bIdx    = 0;
    // On narrow screens bump amps so they feel more dramatic, but cap at 0.42 of CH
    // (vs the original ~0.30 max) to avoid waves filling the entire canvas
    var ampMult = CW <= 480 ? (0.42 / MAX_AMP) : 1;

    for (var wi = 0; wi < WAVES.length; wi++) {
      var wv    = WAVES[wi];
      var amp   = wv.amp * CH * ampMult;
      var midY  = CH * 0.5;
      var k     = (2 * Math.PI * wv.freq) / CW;
      var phi   = wv.phase + t * wv.speed;
      var qStep = CW / (4 * wv.freq);
      var hStep = qStep * 2;

      // Draw wave path on its own canvas so z-index can interleave it with letters
      var wc = waveCanvases[wi];
      if (!wc) continue;
      var wx = wc.ctx;
      wx.setTransform(dpr, 0, 0, dpr, 0, 0);
      wx.clearRect(0, 0, CW, CH);

      // Wave curve — colour sweeps left → right via oscillator
      wx.beginPath();
      wx.strokeStyle = travelGradient(wx, t);
      wx.lineWidth   = 1;
      var px0 = -qStep;
      var py0 = midY + amp * Math.sin(k * px0 + phi);
      wx.moveTo(px0, py0);
      for (var px1 = px0 + qStep; px1 <= CW + qStep; px1 += qStep) {
        var py1 = midY + amp * Math.sin(k * px1 + phi);
        var dx  = px1 - px0;
        var s0  = amp * k * Math.cos(k * px0 + phi);
        var s1  = amp * k * Math.cos(k * px1 + phi);
        wx.bezierCurveTo(
          px0 + dx / 3, py0 + (dx / 3) * s0,
          px1 - dx / 3, py1 - (dx / 3) * s1,
          px1, py1
        );
        px0 = px1; py0 = py1;
      }
      wx.stroke();

      // Handles at half-period anchors (drawn on same per-wave canvas)
      var nearDist = Infinity;
      var nearLx = 0, nearLy = 0, nearRx = 0, nearRy = 0;

      for (var hx = hStep * 0.5; hx <= CW; hx += hStep) {
        var hy    = midY + amp * Math.sin(k * hx + phi);
        var slope = amp * k * Math.cos(k * hx + phi);
        var arm   = qStep / 3;
        var armY  = arm * slope;

        wx.beginPath();
        wx.strokeStyle = 'rgba(128,128,128,0.75)';
        wx.lineWidth   = 0.75;
        wx.moveTo(hx - arm, hy - armY);
        wx.lineTo(hx + arm, hy + armY);
        wx.stroke();

        [[hx - arm, hy - armY], [hx + arm, hy + armY]].forEach(function (p) {
          wx.beginPath();
          wx.arc(p[0], p[1], 2, 0, Math.PI * 2);
          wx.stroke();
        });

        wx.beginPath();
        wx.fillStyle = 'rgba(128,128,128,0.75)';
        wx.arc(hx, hy, 2.5, 0, Math.PI * 2);
        wx.fill();

        var dist = Math.abs(hx - CW / 2);
        if (dist < nearDist) {
          nearDist = dist;
          nearLx = hx - arm;  nearLy = hy - armY;
          nearRx = hx + arm;  nearRy = hy + armY;
        }
      }

      if (wi === 0 || wi === 2 || wi === 4) {
        var phiPx = phi / k;
        var fxL = ((nearLx - phiPx) % CW + CW) % CW;
        var fxR = ((nearRx - phiPx) % CW + CW) % CW;
        waveReadout.push(
          { label: 'B\u00E9zier\u202F' + (++bIdx), x: fxL, y: nearLy },
          { label: 'B\u00E9zier\u202F' + (++bIdx), x: fxR, y: nearRy }
        );
      }
    }
  }

  /* ── update DOM text via CSS font-variation-settings ──── */
  function updateText(t) {
    var av = axisValues(t);
    var wv = '"wght" ' + av.wordWght.toFixed(1) + ', "FLIP" ' + av.wordFlip.toFixed(1) + ', "FLOP" ' + av.wordFlop.toFixed(1);
    var mv = '"wght" ' + av.markWght.toFixed(1) + ', "FLIP" ' + av.markFlip.toFixed(1) + ', "FLOP" ' + av.markFlop.toFixed(1);
    wordLetters.forEach(function (el) { el.style.fontVariationSettings = wv; });
    markLetters.forEach(function (el) { el.style.fontVariationSettings = mv; });

    // Mirror state to hidden canvas so Three.js CanvasTexture stays in sync.
    // ctx.font weight approximates the wght axis; FLIP/FLOP require a full
    // Three.js shader approach — this gives the texture correct weight variation.
    var sz = 200;
    hiddenCanvas.width  = CW  * dpr;
    hiddenCanvas.height = 2   * sz * dpr;
    hctx.clearRect(0, 0, hiddenCanvas.width, hiddenCanvas.height);
    hctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    hctx.textAlign    = 'center';
    hctx.textBaseline = 'middle';
    hctx.fillStyle    = '#ffffff';
    hctx.font = Math.round(av.wordWght) + ' ' + sz + 'px "CalSansUI", sans-serif';
    hctx.fillText('WORD', CW / 2, sz * 0.5);
    hctx.font = Math.round(av.markWght) + ' ' + sz + 'px "CalSansUI", sans-serif';
    hctx.fillText('MARK', CW / 2, sz * 1.5);
    // if (textTexture) textTexture.needsUpdate = true; // uncomment when Three.js is added
  }

  /* ── HUD readout ──────────────────────────────────────── */
  function fmt(v) {
    return (v < 0 ? '' : '\u2009') + v.toFixed(4);
  }

  function fmtX(v) {
    var s = Math.abs(v).toFixed(4).split('.');
    while (s[0].length < 4) s[0] = '0' + s[0];
    return s[0] + '.' + s[1];
  }

  function drawHUD(clr) {
    if (waveReadout.length < 6) return;

    var canvasRect = canvas.getBoundingClientRect();
    var wordRect   = wordEl.getBoundingClientRect();
    var markRect   = markEl.getBoundingClientRect();
    var sy = CH / canvasRect.height;

    ctx.save();
    ctx.globalAlpha = 0.10;
    ctx.fillStyle   = clr.ink;
    ctx.textAlign   = 'center';
    var colW   = CW / 3;
    var FONT_SZ = (CW > 480 ? '8px ' : '6px ') + MONO_FONT;

    var LINE_H = 8; // px between stacked lines

    // Inline layout: "Bézier N  x…  y…" on one line
    function hudItem(c, cx, cy) {
      var coords = '\u2002x\u202F' + fmtX(c.x) + '\u2002y\u202F' + fmtX(c.y);

      canvas.style.fontVariationSettings = '"wght" 700';
      ctx.font = '700 ' + FONT_SZ;
      var labelW = ctx.measureText(c.label).width;

      canvas.style.fontVariationSettings = '"wght" 400';
      ctx.font = '400 ' + FONT_SZ;
      var coordsW = ctx.measureText(coords).width;

      var startX = cx - (labelW + coordsW) / 2;

      canvas.style.fontVariationSettings = '"wght" 700';
      ctx.font = '700 ' + FONT_SZ;
      ctx.textAlign = 'left';
      ctx.fillText(c.label, startX, cy);

      canvas.style.fontVariationSettings = '"wght" 400';
      ctx.font = '400 ' + FONT_SZ;
      ctx.fillText(coords, startX + labelW, cy);

      ctx.textAlign = 'center';
    }

    // Stacked layout: "Bézier N" on line 1, "x…  y…" on line 2
    // baseline is 'bottom' when growing up, 'top' when growing down
    function hudItemStacked(c, cx, cy, growUp) {
      var coords = 'x\u202F' + fmtX(c.x) + '\u2002y\u202F' + fmtX(c.y);
      var labelY  = growUp ? cy - LINE_H : cy;
      var coordsY = growUp ? cy          : cy + LINE_H;

      canvas.style.fontVariationSettings = '"wght" 700';
      ctx.font = '700 ' + FONT_SZ;
      ctx.textAlign = 'center';
      ctx.fillText(c.label, cx, labelY);

      canvas.style.fontVariationSettings = '"wght" 400';
      ctx.font = '400 ' + FONT_SZ;
      ctx.fillText(coords, cx, coordsY);
    }

    if (CW > 480) {
      // Desktop: 3×2 grid centred inside each line of WORDMARK
      var wordMidY = ((wordRect.top + wordRect.bottom) / 2 - canvasRect.top) * sy;
      var markMidY = ((markRect.top + markRect.bottom) / 2 - canvasRect.top) * sy;
      ctx.textBaseline = 'middle';
      for (var i = 0; i < 3; i++) {
        hudItem(waveReadout[i],     colW * i + colW * 0.5, wordMidY);
      }
      for (var j = 0; j < 3; j++) {
        hudItem(waveReadout[j + 3], colW * j + colW * 0.5, markMidY);
      }
    } else {
      // Mobile: stacked 2-line entries, group above WORD and below MARK
      var wordTop    = (wordRect.top    - canvasRect.top) * sy;
      var markBottom = (markRect.bottom - canvasRect.top) * sy;
      var GAP = 26;
      ctx.textBaseline = 'bottom';
      for (var i = 0; i < 3; i++) {
        hudItemStacked(waveReadout[i],     colW * i + colW * 0.5, wordTop - GAP, true);
      }
      ctx.textBaseline = 'top';
      for (var j = 0; j < 3; j++) {
        hudItemStacked(waveReadout[j + 3], colW * j + colW * 0.5, markBottom + GAP, false);
      }
    }
    ctx.restore();
  }

  /* ── loop ─────────────────────────────────────────────── */
  var startTime = null, prevT = null, rafId = null;

  function frame(nowMs) {
    rafId = null;
    if (startTime === null) startTime = nowMs;
    var t   = (nowMs - startTime) / 1000;
    var dt  = prevT === null ? 0 : t - prevT;
    prevT   = t;
    var clr = getColours();

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, CW, CH); // bg handled by CSS so theme transition matches

    drawWaves(t, clr);
    drawHUD(clr);
    updateText(t);   // CSS update, not canvas

    // Expose live comet colours for pill hover gradient
    var root = document.documentElement;
    root.style.setProperty('--comet-a', cometColorAt(t));
    root.style.setProperty('--comet-b', cometColorAt(t + EPOCH_DUR * 0.5));

    rafId = requestAnimationFrame(frame);
  }

  function start() {
    init();
    if (!rafId) rafId = requestAnimationFrame(frame);
  }

  new MutationObserver(function () {}).observe(
    document.documentElement, { attributes: true, attributeFilter: ['data-theme'] }
  );

  start();
  document.fonts.ready.then(function () {
    start();
    var rafResize;
    window.addEventListener('resize', function () {
      cancelAnimationFrame(rafResize);
      rafResize = requestAnimationFrame(start);
    });
  });

}());
