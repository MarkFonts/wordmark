(function () {
  'use strict';

  var canvas  = document.getElementById('flapjack-canvas');
  var wordEl  = document.getElementById('fj-word');
  var markEl  = document.getElementById('fj-mark');
  if (!canvas || !wordEl || !markEl) return;

  var ctx = canvas.getContext('2d');
  var MONO_FONT = '"CalSansUI", -apple-system, sans-serif';

  /* ── wave configs ─────────────────────────────────────── */
  var WAVES = [
    { amp: 0.13, freq: 1.7, phase: 0.00, speed: 0.38 },
    { amp: 0.09, freq: 2.4, phase: 1.13, speed: 0.27 },
    { amp: 0.15, freq: 1.1, phase: 2.41, speed: 0.33 },
    { amp: 0.07, freq: 2.9, phase: 0.74, speed: 0.51 },
    { amp: 0.10, freq: 1.9, phase: 3.17, speed: 0.30 }
  ];

  /* ── auto-oscillators ─────────────────────────────────── */
  var OSC = {
    wght:     { sp: 0.80, ph: 0.50, lo: 100, hi: 990 },  // shared across both lines
    wordFlip: { sp: 2.60, ph: 0.00, lo: 0,   hi: 79  },
    wordFlop: { sp: 1.90, ph: 1.20, lo: 0,   hi: 79  },
    markFlip: { sp: 2.30, ph: 2.10, lo: 0,   hi: 79  },
    markFlop: { sp: 2.80, ph: 3.70, lo: 0,   hi: 79  }
  };

  function osc(o, t) {
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
    dpr = window.devicePixelRatio || 1;
    CW  = Math.max(Math.floor(canvas.parentElement.getBoundingClientRect().width), 320);
    // Canvas height matches the hero section so waves fill the same space
    CH  = Math.max(Math.floor(canvas.parentElement.getBoundingClientRect().height), 200);

    canvas.style.width  = CW + 'px';
    canvas.style.height = CH + 'px';
    canvas.width  = Math.round(CW * dpr);
    canvas.height = Math.round(CH * dpr);
  }

  /* ── waves ────────────────────────────────────────────── */
  // Path drawn as cubic bezier segments (one per quarter period)
  // using the exact tangent at each anchor point, so the bezier
  // curves ARE the sine shape and the handles are the real control arms.
  // Handles shown only at half-period anchors (peaks + troughs).
  var waveReadout = [];

  function drawWaves(t, clr) {
    waveReadout = [];
    ctx.save();
    ctx.globalAlpha = 0.20;

    for (var wi = 0; wi < WAVES.length; wi++) {
      var wv    = WAVES[wi];
      var amp   = wv.amp * CH;
      var midY  = CH * 0.5;
      var k     = (2 * Math.PI * wv.freq) / CW;
      var phi   = wv.phase + t * wv.speed;
      var qStep = CW / (4 * wv.freq);
      var hStep = qStep * 2;

      // Cubic bezier wave path
      ctx.beginPath();
      ctx.strokeStyle = clr.ink;
      ctx.lineWidth   = 1;

      var px0 = 0;
      var py0 = midY + amp * Math.sin(phi);
      ctx.moveTo(px0, py0);

      for (var px1 = qStep; px1 <= CW + qStep * 0.01; px1 += qStep) {
        px1  = Math.min(px1, CW);
        var py1  = midY + amp * Math.sin(k * px1 + phi);
        var dx   = px1 - px0;
        var s0   = amp * k * Math.cos(k * px0 + phi);
        var s1   = amp * k * Math.cos(k * px1 + phi);
        ctx.bezierCurveTo(
          px0 + dx / 3, py0 + (dx / 3) * s0,
          px1 - dx / 3, py1 - (dx / 3) * s1,
          px1, py1
        );
        px0 = px1; py0 = py1;
      }
      ctx.stroke();

      // Handles at half-period anchors (peaks and troughs)
      var nearX = 0, nearY = 0, nearDist = Infinity;

      for (var hx = hStep * 0.5; hx <= CW; hx += hStep) {
        var hy    = midY + amp * Math.sin(k * hx + phi);
        var slope = amp * k * Math.cos(k * hx + phi);
        var arm   = qStep / 3;
        var armY  = arm * slope;

        ctx.beginPath();
        ctx.strokeStyle = clr.ink;
        ctx.lineWidth   = 0.75;
        ctx.moveTo(hx - arm, hy - armY);
        ctx.lineTo(hx + arm, hy + armY);
        ctx.stroke();

        [[hx - arm, hy - armY], [hx + arm, hy + armY]].forEach(function (p) {
          ctx.beginPath();
          ctx.arc(p[0], p[1], 2, 0, Math.PI * 2);
          ctx.stroke();
        });

        ctx.beginPath();
        ctx.fillStyle = clr.ink;
        ctx.arc(hx, hy, 2.5, 0, Math.PI * 2);
        ctx.fill();

        var dist = Math.abs(hx - CW / 2);
        if (dist < nearDist) { nearDist = dist; nearX = hx; nearY = hy; }
      }

      waveReadout.push({ x: nearX, y: nearY });
    }

    ctx.restore();
  }

  /* ── update DOM text via CSS font-variation-settings ──── */
  function updateText(t) {
    var av = axisValues(t);
    var wv = '"wght" ' + av.wordWght.toFixed(1) + ', "FLIP" ' + av.wordFlip.toFixed(1) + ', "FLOP" ' + av.wordFlop.toFixed(1);
    var mv = '"wght" ' + av.markWght.toFixed(1) + ', "FLIP" ' + av.markFlip.toFixed(1) + ', "FLOP" ' + av.markFlop.toFixed(1);
    wordEl.style.fontVariationSettings = wv;
    markEl.style.fontVariationSettings = mv;
  }

  /* ── HUD readout ──────────────────────────────────────── */
  function fmt(v) {
    return (v < 0 ? '' : '\u2009') + v.toFixed(4);
  }

  function drawHUD(clr) {
    if (!waveReadout.length) return;
    ctx.save();
    ctx.globalAlpha      = 0.30;
    ctx.fillStyle        = clr.ink;
    ctx.font             = '400 7px ' + MONO_FONT;
    ctx.fontVariationSettings = '"wght" 400';
    ctx.textAlign        = 'right';
    ctx.textBaseline     = 'bottom';

    var rowH = 9, rightX = CW - 10, baseY = CH - 8;
    waveReadout.forEach(function (c, i) {
      ctx.fillText(
        'W' + (i + 1) + '\u2002x\u202F' + fmt(c.x) + '\u2002y\u202F' + fmt(c.y),
        rightX,
        baseY - (waveReadout.length - 1 - i) * rowH
      );
    });
    ctx.restore();
  }

  /* ── loop ─────────────────────────────────────────────── */
  var startTime = null, rafId = null;

  function frame(nowMs) {
    rafId = null;
    if (startTime === null) startTime = nowMs;
    var t   = (nowMs - startTime) / 1000;
    var clr = getColours();

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, CW, CH);
    ctx.fillStyle = clr.bg;
    ctx.fillRect(0, 0, CW, CH);

    drawWaves(t, clr);
    drawHUD(clr);
    updateText(t);   // CSS update, not canvas

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
