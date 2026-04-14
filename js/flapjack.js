(function () {
  'use strict';

  var canvas      = document.getElementById('flapjack-canvas');
  var floatCanvas = document.getElementById('fj-floaters');
  var wordEl      = document.getElementById('fj-word');
  var markEl      = document.getElementById('fj-mark');
  if (!canvas || !wordEl || !markEl) return;

  // Individual letter spans — WORD letters get word axis values, MARK get mark
  var wordLetters = Array.from(wordEl.querySelectorAll('.fj-letter'));
  var markLetters = Array.from(markEl.querySelectorAll('.fj-letter'));

  var ctx      = canvas.getContext('2d');
  var fctx     = floatCanvas ? floatCanvas.getContext('2d') : null;

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

  /* ── colour oscillators (gradient sweep left → right) ─── */
  var WAVE_COLORS = ['#7C00F6', '#ff2d55', '#e8650a', '#00a67e'];

  var COLOR_OSC = [
    { sp: 0.37, ph: 0.00 },
    { sp: 0.22, ph: 1.57 },
    { sp: 0.51, ph: 3.14 },
    { sp: 0.18, ph: 4.71 },
  ];

  // Convert hex + alpha → rgba() string
  function hexAlpha(hex, a) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a.toFixed(2) + ')';
  }

  // Linear gradient whose peak sweeps left → right over time
  function sweepGradient(wxCtx, wi, t) {
    var co  = COLOR_OSC[wi % 4];
    var col = WAVE_COLORS[wi % 4];
    // peakX: 0→CW and back, driven by sine oscillator
    var peakX = CW * 0.5 * (1 + Math.sin(co.sp * t + co.ph));
    var grd = wxCtx.createLinearGradient(0, 0, CW, 0);
    var lo  = hexAlpha(col, 0.20);
    var hi  = hexAlpha(col, 1.00);
    grd.addColorStop(0,            lo);
    grd.addColorStop(peakX / CW,   hi);
    grd.addColorStop(1,            lo);
    return grd;
  }

  /* ── auto-oscillators ─────────────────────────────────── */
  var OSC = {
    wght:     { sp: 0.80, ph: 0.50, lo: 100, hi: 990 },  // shared across both lines
    wordFlip: { sp: 2.60, ph: 0.00, lo: 0,   hi: 78  },
    wordFlop: { sp: 0.628, ph: -1.571, lo: 0, hi: 78, linear: true },
    markFlip: { sp: 2.30,  ph: 2.10,  lo: 0, hi: 78  },
    markFlop: { sp: 0.628, ph: -1.571, lo: 0, hi: 78, linear: true }
  };

  function osc(o, t) {
    if (o.linear) {
      // Triangle wave — same period/phase as sine but constant rate (no ease)
      var x   = o.sp * t + o.ph;
      var pos = (((x + Math.PI / 2) / (2 * Math.PI)) % 1 + 1) % 1;
      var raw = pos < 0.5 ? (4 * pos - 1) : (3 - 4 * pos);
      return o.lo + (o.hi - o.lo) * 0.5 * (1 + raw);
    }
    return o.lo + (o.hi - o.lo) * 0.5 * (1 + Math.sin(o.sp * t + o.ph));
  }

  /* ── mouse / hover ────────────────────────────────────── */
  var mouse = { active: false, nx: 0.5, ny: 0.5 };

  // Capture mouse on both canvas (waves) and text overlay
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
      var w = 100 + mouse.nx * 890;       // shared wght from mouse x
      return {
        wordWght: w,
        wordFlip: mouse.ny * 79,
        wordFlop: osc(OSC.wordFlop, t),
        markWght: w,
        markFlip: (1 - mouse.ny) * 79,
        markFlop: osc(OSC.markFlop, t)
      };
    }
    var w = osc(OSC.wght, t);
    return {
      wordWght: w,
      wordFlip: osc(OSC.wordFlip, t),
      wordFlop: osc(OSC.wordFlop, t),
      markWght: w,
      markFlip: osc(OSC.markFlip, t),
      markFlop: osc(OSC.markFlop, t)
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

    if (floatCanvas) {
      floatCanvas.style.width  = CW + 'px';
      floatCanvas.style.height = CH + 'px';
      floatCanvas.width  = Math.round(CW * dpr);
      floatCanvas.height = Math.round(CH * dpr);
    }

    // Size per-wave canvases to match main canvas
    waveCanvases.forEach(function (wc) {
      wc.el.width  = Math.round(CW * dpr);
      wc.el.height = Math.round(CH * dpr);
    });

    // Keep the text overlay sized to match the canvas
    document.documentElement.style.setProperty('--fj-ch', CH + 'px');
  }

  /* ── floating glyphs ─────────────────────────────────── */
  var GLYPH_POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var floaters   = [];

  function spawnFloater() {
    var fam = FONT_POOL[Math.floor(Math.random() * FONT_POOL.length)];
    var isUI = fam.indexOf('CalSansUI') !== -1;
    return {
      ch:    GLYPH_POOL[Math.floor(Math.random() * GLYPH_POOL.length)],
      x:     Math.random() * CW,
      y:     (0.05 + Math.random() * 0.90) * CH,
      sz:    18 + Math.random() * 44,
      vx:    5 + Math.random() * 18,
      vr:    (Math.random() - 0.5) * 1.0,
      rot:   Math.random() * Math.PI * 2,
      alpha: 0.45 + Math.random() * 0.45,
      fam:   fam,
      wght:  isUI ? Math.round(400 + Math.random() * 300) : 400
    };
  }

  function initFloaters() {
    floaters = [];
    for (var i = 0; i < 30; i++) floaters.push(spawnFloater());
  }

  function drawFloaters(dt) {
    if (!fctx) return;
    fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    fctx.clearRect(0, 0, CW, CH);
    fctx.save();
    fctx.textAlign    = 'center';
    fctx.textBaseline = 'middle';
    for (var i = 0; i < floaters.length; i++) {
      var f = floaters[i];
      f.x   += f.vx * dt;
      f.rot += f.vr * dt;
      if (f.x > CW + f.sz) {
        var nf = spawnFloater();
        nf.x = -nf.sz;
        floaters[i] = nf;
        f = nf;
      }
      fctx.save();
      fctx.globalAlpha = f.alpha;
      fctx.translate(f.x, f.y);
      fctx.rotate(f.rot);
      fctx.fillStyle = '#fff';
      fctx.font = f.wght + ' ' + Math.round(f.sz) + 'px ' + f.fam;
      fctx.fillText(f.ch, 0, 0);
      fctx.restore();
    }
    fctx.restore();
  }

  /* ── waves ────────────────────────────────────────────── */
  // Path drawn as cubic bezier segments (one per quarter period)
  // using the exact tangent at each anchor point, so the bezier
  // curves ARE the sine shape and the handles are the real control arms.
  // Handles shown only at half-period anchors (peaks + troughs).
  var waveReadout = [];

  function drawWaves(t, clr) {
    waveReadout = [];
    var bIdx = 0;

    for (var wi = 0; wi < WAVES.length; wi++) {
      var wv    = WAVES[wi];
      var amp   = wv.amp * CH;
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
      wx.strokeStyle = sweepGradient(wx, wi, t);
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
        wx.strokeStyle = '#808080';
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
        wx.fillStyle = '#808080';
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
    if (!waveReadout.length) return;
    ctx.save();
    ctx.globalAlpha      = 0.30;
    ctx.fillStyle        = clr.ink;
    ctx.font             = '400 7px ' + MONO_FONT;
    ctx.textAlign        = 'right';
    ctx.textBaseline     = 'bottom';

    var rowH = 9, rightX = CW - 10, baseY = CH - 8;
    waveReadout.forEach(function (c, i) {
      ctx.fillText(
        c.label + '\u2002x\u202F' + fmtX(c.x) + '\u2002y\u202F' + fmtX(c.y),
        rightX,
        baseY - (waveReadout.length - 1 - i) * rowH
      );
    });
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
    ctx.clearRect(0, 0, CW, CH);
    ctx.clearRect(0, 0, CW, CH); // bg handled by CSS so theme transition matches

    drawFloaters(dt);
    drawWaves(t, clr);
    drawHUD(clr);
    updateText(t);   // CSS update, not canvas

    rafId = requestAnimationFrame(frame);
  }

  function start() {
    init();
    initFloaters();
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
