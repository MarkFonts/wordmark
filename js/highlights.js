/* The case study's Highlights: four cards, each an animation that plays once as it scrolls in
   and rests on its end state, or, in slideshow mode, one stage at a time with a play bar.

   The transitions reuse the hero's thermal chain (a striped fill under a material filter and
   a colour LUT, a seam that sweeps the stripe across while the layers swap under it, then every
   parameter drained to the page's ink), built here as a small engine any inline SVG can host.
   Plain script, no dependencies; dialHandle.js for the six axes. */
(function () {
  var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SVG = 'http://www.w3.org/2000/svg';
  function el(tag, attrs, parent) {
    var e = document.createElementNS(SVG, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  /* the page's ink as 0..1 rgb, whatever notation the stylesheet uses: resolved through a canvas pixel */
  function inkOf(node) {
    try {
      var cv = document.createElement('canvas'); cv.width = cv.height = 1;
      var x = cv.getContext('2d', { willReadFrequently: true });
      x.fillStyle = '#000'; x.fillStyle = getComputedStyle(node).color; x.fillRect(0, 0, 1, 1);
      var d = x.getImageData(0, 0, 1, 1).data; return [d[0] / 255, d[1] / 255, d[2] / 255];
    } catch (e) { return [0.9, 0.9, 0.9]; }
  }
  /* one pass of the stripe, the hero's: the lead from START to FREEZE at V units/s (the hero's 1320 at its SPEED 2) */
  var START = -1300, FREEZE = 3300 + 3 * 2000 - 640, V = 2640, PASS = (FREEZE - START) / V;
  var ease = function (t) { t = Math.max(0, Math.min(1, t)); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  var lin = function (t, a, b) { return Math.max(0, Math.min(1, (t - a) / (b - a))); };

  /* ── the thermal engine ──────────────────────────────────────────────────────────────────
     thermal(svg, id, box) builds the defs in `box` (the SVG's user space) and returns a
     controller. Host layers:
       ctl.hot(shapeNode)   a heated layer: the stripe seen through `shapeNode` (a mask child),
                            visible LEFT of the seam
       ctl.cold(node)       a plain layer, visible RIGHT of the seam
       ctl.lead(x)          where the stripe's first notch is; the swap rides 2000 behind it
       ctl.heat(b)          0..1: blur, grain, halo and the hot LUT, b=1 fully hot
       ctl.drain(z, ink)    0..1: everything to zero and the LUT to `ink` (0..1 rgb)
     The constants are the hero's: a stripe with a period of 2000 units, a seam 240 wide. */
  var HOT = [[0.02, 0.05, 0.1, 1, 1, 0.95, 0.9], [0.02, 0.2, 0.85, 1, 0.55, 0.1, 0.1], [0.25, 0.75, 0.95, 1, 0.1, 0.1, 0.6], [0, 0.05, 0.45, 1, 1, 1, 1]];
  function flat(c) { return [Array(7).fill(c[0]), Array(7).fill(c[1]), Array(7).fill(c[2]), Array(7).fill(1)]; }
  function lerpT(a, b, u) { return a.map(function (row, i) { return row.map(function (x, j) { return x + (b[i][j] - x) * u; }); }); }
  var MONO = [[0, 0.3, 0.7, 1, 1, 1, 1], [0, 0.3, 0.7, 1, 1, 1, 1], [0, 0.3, 0.7, 1, 1, 1, 1], [0, 0.05, 0.45, 1, 1, 1, 1]];   /* no colour: the stripe's light as white, with the grain and the blur */
  function thermal(svg, id, box, opts) {
    opts = opts || {};
    var TABLE = opts.mono ? MONO : HOT;
    var defs = el('defs', {}, svg);
    var g = el('linearGradient', { id: id + 'S', gradientUnits: 'userSpaceOnUse', x1: 0, x2: 8000, spreadMethod: 'pad' }, defs);
    [[0,'#a0a0a0'],[0.03,'#a0a0a0'],[0.095,'#000'],[0.155,'#000'],[0.22,'#c4c4c4'],[0.28,'#c4c4c4'],[0.345,'#000'],[0.405,'#000'],[0.47,'#c4c4c4'],[0.53,'#c4c4c4'],[0.595,'#000'],[0.655,'#000'],[0.72,'#c4c4c4'],[0.78,'#c4c4c4'],[0.845,'#000'],[0.905,'#000'],[0.97,'#a0a0a0'],[1,'#a0a0a0']].forEach(function (s) { el('stop', { offset: s[0], 'stop-color': s[1] }, g); });
    var region = { filterUnits: 'userSpaceOnUse', x: box.x, y: box.y, width: box.w, height: box.h, 'color-interpolation-filters': 'sRGB' };
    var mat = el('filter', Object.assign({ id: id + 'M' }, region), defs);
    el('feGaussianBlur', { in: 'SourceAlpha', stdDeviation: 30 }, mat);
    el('feComposite', { in2: 'SourceAlpha', operator: 'arithmetic', k2: -1, k3: 1 }, mat);
    el('feBlend', { in: 'SourceGraphic', mode: 'overlay' }, mat);
    var col = el('filter', Object.assign({ id: id + 'C' }, region), defs);
    var blur = el('feGaussianBlur', { stdDeviation: 5, result: 'soft' }, col);
    el('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: 26, result: 'halo0' }, col);
    var halo = el('feColorMatrix', { in: 'halo0', type: 'matrix', values: '0.5 0 0 0 0  0 0.5 0 0 0  0 0 0.5 0 0  0 0 0 0.9 0', result: 'halo' }, col);
    el('feComposite', { in: 'soft', in2: 'halo', operator: 'over', result: 'body' }, col);
    el('feTurbulence', { type: 'fractalNoise', baseFrequency: 0.8, numOctaves: 2, seed: 7, result: 'noise' }, col);
    el('feColorMatrix', { in: 'noise', type: 'matrix', values: '0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 1', result: 'grainBase' }, col);
    var grain = el('feComposite', { in: 'grainBase', in2: 'body', operator: 'arithmetic', k1: 0, k2: 0, k3: 1, k4: 0, result: 'mixed' }, col);
    var alpha = el('feColorMatrix', { in: 'mixed', type: 'matrix', values: '1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0.3 0.59 0.11 0 0', result: 'lumA' }, col);
    var lut = el('feComponentTransfer', { in: 'lumA' }, col);
    var funcs = ['feFuncR', 'feFuncG', 'feFuncB', 'feFuncA'].map(function (f, i) { return el(f, { type: 'table', tableValues: TABLE[i].join(' ') }, lut); });
    el('feComposite', { in2: 'body', operator: 'in' }, col);
    var seamL = el('linearGradient', { id: id + 'L', gradientUnits: 'userSpaceOnUse', x1: -120, x2: 120 }, defs);
    el('stop', { offset: 0, 'stop-color': '#fff' }, seamL); el('stop', { offset: 1, 'stop-color': '#000' }, seamL);
    var seamR = el('linearGradient', { id: id + 'R', gradientUnits: 'userSpaceOnUse', x1: -120, x2: 120 }, defs);
    el('stop', { offset: 0, 'stop-color': '#000' }, seamR); el('stop', { offset: 1, 'stop-color': '#fff' }, seamR);
    var rect = function (fill) { return { x: box.x, y: box.y, width: box.w, height: box.h, fill: fill }; };
    el('rect', rect('url(#' + id + 'L)'), el('mask', Object.assign({ id: id + 'mB', maskUnits: 'userSpaceOnUse' }, rect('')), defs));
    el('rect', rect('url(#' + id + 'R)'), el('mask', Object.assign({ id: id + 'mA', maskUnits: 'userSpaceOnUse' }, rect('')), defs));
    var ctl = {
      hots: [], plains: [],
      hot: function (shape) {
        var m = el('mask', Object.assign({ id: id + 'sh' + (++ctl.n), maskUnits: 'userSpaceOnUse' }, rect('')), defs);
        m.appendChild(shape);
        var outer = el('g', { mask: 'url(#' + id + 'mB)' }, svg); ctl.hots.push(outer);
        var layer = el('g', { filter: 'url(#' + id + 'C)' }, outer);
        var mt = el('g', { filter: 'url(#' + id + 'M)' }, layer);
        var sh = el('g', { mask: 'url(#' + m.id + ')' }, mt);
        el('rect', rect('url(#' + id + 'S)'), sh);
        return layer;
      },
      cold: function (node) { var outer = el('g', { mask: 'url(#' + id + 'mA)' }, svg); outer.appendChild(node); return outer; },
      /* the end state as plain ink, no filter: shown once the piece is over, so nothing heavy runs at rest */
      plain: function (node) { var g = el('g', { fill: 'currentColor', style: 'display:none' }, svg); g.appendChild(node); ctl.plains.push(g); return g; },
      finish: function (on) { ctl.hots.forEach(function (h) { h.style.display = on ? 'none' : ''; }); ctl.plains.forEach(function (p) { p.style.display = on ? '' : 'none'; }); },
      n: 0,
      /* the stripe as the hero runs it: `lead` is where its first notch is; the swap rides in the second
         notch, one period (2000) behind; the bands and the grey pad follow at one speed until the
         whole word sits in the pad, uniformly lit. One call per frame. */
      lead: function (x) {
        g.setAttribute('gradientTransform', 'translate(' + (x - 7000).toFixed(1) + ' 0)');
        var seam = x - 2000;
        seamL.setAttribute('gradientTransform', 'translate(' + seam.toFixed(1) + ' 0)');
        seamR.setAttribute('gradientTransform', 'translate(' + seam.toFixed(1) + ' 0)');
      },
      set: function (bl, gr, T, w, h) {
        if (h == null) h = 1;
        halo.setAttribute('values', '0.5 0 0 0 0  0 0.5 0 0 0  0 0 0.5 0 0  0 0 0 ' + (0.9 * h).toFixed(3) + ' 0');
        blur.setAttribute('stdDeviation', bl.toFixed(2));
        grain.setAttribute('k1', (gr * 2).toFixed(3)); grain.setAttribute('k3', (1 - gr).toFixed(3));
        alpha.setAttribute('values', '1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  ' + (0.3 * w).toFixed(3) + ' ' + (0.59 * w).toFixed(3) + ' ' + (0.11 * w).toFixed(3) + ' ' + (1 - w).toFixed(3) + ' 0');
        for (var i = 0; i < 4; i++) funcs[i].setAttribute('tableValues', T[i].map(function (v) { return v.toFixed(3); }).join(' '));
      },
      /* fully hot, or drained by z toward `ink` */
      drain: function (z, ink) { ctl.set(8 * (1 - z), 0.5 * (1 - z), lerpT(TABLE, flat(ink), z), 1 - z, 1 - z); }
    };
    ctl.set(8, 0.5, TABLE, 1, 1);
    return ctl;
  }

  /* a stage's box is put on the 3px line (its SVG or dials are any height), so the caption below it
     sits where the grid wants it; then the snapper is asked to look again */
  function snapStage(stage) {
    stage.style.height = '';
    if (stage.closest('.hl-grid.is-show')) return;   /* a full-height slide: its stages flex to fill, no fixed height */
    var h = stage.getBoundingClientRect().height, unit = 3;
    stage.style.height = Math.ceil(h / unit) * unit + 'px';
    if (window.wmGridSnap) window.wmGridSnap();
  }
  function snapAll() { document.querySelectorAll('.hl-stage').forEach(snapStage); }

  /* a card plays once when it scrolls in; its Replay button replays it; the slideshow calls play() itself */
  function player(card, run, opts) {
    opts = opts || {};
    var state = { playing: false, raf: 0, done: false };
    function play() {
      if (state.raf) cancelAnimationFrame(state.raf);
      var t0 = performance.now(); state.playing = true; state.done = false;
      card.classList.add('is-playing');
      var last = t0;
      (function frame(now) {
        var t = (now - t0) / 1000, over;
        try { over = run(still ? 1e9 : t); } catch (e) { console.warn('highlight', card.id, e); over = true; }
        last = now;
        if (over) { state.playing = false; state.done = true; card.classList.remove('is-playing'); card.classList.add('is-done'); if (opts.after) opts.after(); return; }
        state.raf = requestAnimationFrame(frame);
      })(t0);
      /* if the frames stop arriving while the piece is on (a throttled tab, a stalled compositor), finish it */
      clearInterval(state.dog);
      state.dog = setInterval(function () { if (!state.playing) { clearInterval(state.dog); return; } if (performance.now() - last > 1500) { clearInterval(state.dog); cancelAnimationFrame(state.raf); rest(); } }, 500);
    }
    function rest() { run(1e9); card.classList.add('is-done'); if (opts.after) opts.after(); }
    card._hl = { play: play, rest: rest, duration: opts.duration || 6 };
    if (still) rest(); else if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting && !card.closest('.is-show')) { play(); io.disconnect(); } }); }, { threshold: 0.5 });
      io.observe(card);
    } else play();
    /* Replay: the house restart icon and the word, at the card's bottom right (as the cube's "Level the cube") */
    var rb = document.createElement('button'); rb.type = 'button'; rb.className = 'hl-replay'; rb.setAttribute('aria-label', 'Replay');
    rb.innerHTML = '<span class="wm-icon material-symbols-outlined wm-icon--rest" style="font-size:18px;--icon-opsz:20;--icon-fill:0" aria-hidden="true" translate="no">restart_alt</span>Replay';
    rb.addEventListener('click', function () {
      rb.classList.remove('is-spun'); void rb.offsetWidth; rb.classList.add('is-spun');
      card.dispatchEvent(new Event('hl:restart'));
      if (!still) play(); else rest();
    });
    (card.querySelector(':scope > .hl-text') || card).appendChild(rb);   /* inside the caption: its line is the caption's last line, snapped or not */
    return card._hl;
  }

  /* ── 1 · three typefaces became one family ────────────────────────────────────────────
     Mark's pick from the comparison rounds (round 5, D V3, 2026-10-04): "Three typefaces" in Inter 14/400,
     "on the homepage" in Matter SemiBold (outlines), "became one" in Cal Sans. The words cascade in out of a
     faint haze (one and its period together), hold, then the first two lines condense into Cal Sans -- line 1
     at opsz 10 / GEOM 25 / 400, line 2 at opsz 16 / GEOM 25 / 600 -- and once they have, the period slides out
     and "family" condenses into the gap. The engine is js/hl-materialize.js. */
  var W = 1954;   /* every stage is this wide in user units, so the hero's constants hold */
  (function () {
    var card = document.getElementById('hl-one'); if (!card || !window.hlMaterialize) return;
    var stage = card.querySelector('.hl-stage'), M = window.hlMaterialize, SPEED = 1.3;
    var cast = {
      words: ['Three', 'typefaces', 'on', 'the', 'homepage', 'became', 'one', 'family', '.'],
      faces: [1, 1, 0, 0, 0, 2, 2, 2, 2], late: 7, breakBefore: [2, 5],
      interVS: "'opsz' 14, 'wght' 400", interW: 400,
      lineVS: ["'opsz' 10, 'GEOM' 25, 'wght' 400", "'opsz' 16, 'GEOM' 25, 'wght' 600", M.FINAL]
    };
    var piece = M.sentence(stage, card, cast, { blur: 30, grain: 1, spread: 44 });
    var P = piece.plan(), dur = (P.lateAt + 1.3 + 0.3) / SPEED;
    player(card, function (t) { return piece.run(t * SPEED); }, { duration: dur });
    function relay() { piece.relayout(); snapStage(stage); }
    stage.addEventListener('hl:relayout', relay);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(relay);
  })();

  /* ── 2 · day one: Cal.com reads as rings, in every weight ────────────────────────────
     Mark's pick (round 5, D logo): hairline rings in the signal through C, a, the period, c, o and both arches
     of m draw on first; Cal.com condenses out of a faint haze as they draw off. Then, with no dissolve, the drawn
     logo becomes live Cal Sans -- the same thing: opsz 45, wght 700, YTAS 1502 and the logo's own spacing
     (measured against the drawn outlines with HarfBuzz; 3.6% of pixels differ, all a hair at the period) -- and
     runs through the family, weight 400-700 and optical size 8-45 at the logo's width, then holds on the font. */
  (function () {
    var card = document.getElementById('hl-two'); if (!card || !window.hlMaterialize) return;
    var stage = card.querySelector('.hl-stage');
    var piece = window.hlMaterialize.logo(stage, card, { blur: 31, grain: 0.35, spread: 43 });
    var svg = piece.svg, plainBox = piece.plainG.parentNode;
    /* the logo in the font: the outlines' instance, size, origin and per-letter spacing (font units, 2000/em) */
    var BASE = { opsz: 45, GEOM: 50, wght: 700, YTAS: 1502 }, FS0 = 521.64, X0 = -13.04, Y0 = 391.23;
    var KERN = [0, 14.1, 38.0, -24.9, -60.3, -9.1, 50.6];   /* before each of C a l . c o m, on top of the font's own kerning */
    var text = el('text', { 'font-family': "'CalSans', sans-serif", fill: 'currentColor', y: Y0.toFixed(2), style: 'display:none' }, svg);
    text.textContent = 'Cal.com';
    function vs(o, w) { return "'opsz' " + o.toFixed(2) + ", 'GEOM' " + BASE.GEOM + ", 'wght' " + w.toFixed(2) + ", 'YTAS' " + BASE.YTAS; }
    function setSize(fs) {
      text.setAttribute('font-size', fs.toFixed(2)); text.setAttribute('x', (X0 * fs / FS0).toFixed(2));
      text.setAttribute('dx', KERN.map(function (k) { return (k / 2000 * fs).toFixed(3); }).join(' '));
    }
    /* through the run the logo keeps its width: each instance is re-fitted to the drawn logo's advance */
    var TW = 0;
    function len() { var L = 0; try { L = text.getComputedTextLength(); } catch (e) {} return L; }
    function place(o, w) {
      text.style.fontVariationSettings = vs(o, w); setSize(FS0);
      if (TW > 0) { var L = len(); if (L > 0) setSize(FS0 * TW / L); }
    }
    function measure() {
      var shown = text.style.display; text.style.display = '';
      text.style.fontVariationSettings = vs(BASE.opsz, BASE.wght); setSize(FS0); TW = len();
      text.style.display = shown;
    }
    measure();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    /* the readout: "logo" while the rings draw and the drawn logo condenses; once it is the font, its axes,
       each tag bold, the items an em space apart */
    var readout = el('text', { x: 1954, y: 482, 'text-anchor': 'end', 'font-family': "'CalSans', sans-serif", 'font-size': 40, fill: 'currentColor', opacity: 0.55, style: "font-variation-settings: 'opsz' 10, 'GEOM' 25, 'wght' 400; font-feature-settings: 'tnum' 1" }, svg);
    function say(items) {
      readout.textContent = '';
      items.forEach(function (it, k) {
        if (k) readout.appendChild(document.createTextNode('\u2003'));
        var tag = el('tspan', { style: "font-variation-settings: 'opsz' 10, 'GEOM' 25, 'wght' 700" }, readout); tag.textContent = it[0];
        if (it[1] != null) readout.appendChild(document.createTextNode(' ' + it[1]));
      });
    }
    var said = '';
    svg.setAttribute('viewBox', '-20 -20 ' + (1954 + 40) + ' 510');
    var LAND = 3.4, M0 = 3.7, M1 = M0 + 4.6, END = M1 + 0.3;
    player(card, function (t) {
      piece.run(t >= 1e8 ? t : Math.min(t, LAND + 0.01));
      var live = t >= LAND;   /* the drawn logo hands over with no dissolve: the font sits exactly on it */
      text.style.display = live ? '' : 'none'; plainBox.style.visibility = live ? 'hidden' : '';
      if (!live) { if (said !== 'logo') { say([['logo']]); said = 'logo'; } return false; }
      var u = t >= 1e8 ? 1 : Math.max(0, Math.min(1, (t - M0) / (M1 - M0))), env = Math.sin(Math.PI * u);
      /* weight down to 400 and up past home to the heaviest; optical size down to 8 and home, a quarter turn behind */
      var w = BASE.wght + env * (u < 0.5 ? (400 - BASE.wght) * Math.sin(Math.PI * u * 2) : 0);
      var o = BASE.opsz + (8 - BASE.opsz) * Math.pow(Math.sin(Math.PI * u), 2);
      place(o, w);
      var line = [['wght', Math.round(w)], ['opsz', Math.round(o)], ['GEOM', BASE.GEOM], ['YTAS', BASE.YTAS]], key = JSON.stringify(line);
      if (key !== said) { say(line); said = key; }
      return t > END;   /* and it holds on the font */
    }, { duration: END });
    stage.addEventListener('hl:relayout', function () { piece.relayout(); measure(); snapStage(stage); });
  })();

  /* ── 3 · six axes, one file, added as Cal.com grew ─────────────────────────────────────
     The word alone, stamped 2021. The dials arrive in release order, each stamped and each
     nudging the word once: wght and GEOM (2025), then opsz, YTAS, SHRP, ital (2026). End
     state: all six live and drifting on their harmonics until a hand stops them. */
  var AXES = [
    { tag: 'wght', label: 'Weight',          min: 400,  max: 700,  step: 1,    value: 600,  year: 2025 },
    { tag: 'GEOM', label: 'Geometry',        min: 0,    max: 100,  step: 1,    value: 50,   year: 2025 },
    { tag: 'opsz', label: 'Optical size',    min: 8,    max: 45,   step: 1,    value: 45,   year: 2026 },
    { tag: 'YTAS', label: 'Ascender height', min: 1440, max: 1600, step: 1,    value: 1440, year: 2026 },
    { tag: 'SHRP', label: 'Sharpness',       min: 0,    max: 100,  step: 1,    value: 0,    year: 2026 },
    { tag: 'ital', label: 'Italic',          min: 0,    max: 1,    step: 0.01, value: 0,    year: 2026 }
  ];
  /* the sample word fills its stage's width, whatever the card's width is */
  function fitSample() {
    document.querySelectorAll('.axes-sample').forEach(function (w) {
      /* measured on the widest the word gets: the UI face at full weight and geometry */
      var face = w.dataset.face, fvs = w.style.fontVariationSettings;
      w.dataset.face = 'ui'; w.style.fontVariationSettings = "'wght' 700, 'GEOM' 100"; w.style.fontSize = '100px';
      var range = document.createRange(); range.selectNodeContents(w);
      var tw = range.getBoundingClientRect().width, box = w.getBoundingClientRect().width;
      if (face) w.dataset.face = face; else delete w.dataset.face; w.style.fontVariationSettings = fvs;
      /* a bento card caps it at 160px; a full-screen slide lets it fill the width, up to a quarter of the screen's height */
      var cap = w.closest('.hl-grid.is-show') ? Math.max(160, Math.min(320, Math.round(innerHeight * 0.26))) : 160;
      if (tw > 0 && box > 0) w.style.fontSize = Math.max(40, Math.min(cap, Math.floor(100 * box / tw))) + 'px';
    });
  }
  fitSample();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { fitSample(); snapAll(); });
  window.addEventListener('resize', fitSample);
  document.querySelectorAll('[data-axes]').forEach(function (group) {
    if (!window.wmHandleDial) return;
    var card = group.closest('.hl') || group.parentElement;
    var target = document.getElementById(group.dataset.axes);
    var wrap = group.parentElement, reset = wrap.querySelector('.ax-reset'), ver = card.querySelector('.ax-ver');
    var verYear = ver && ver.querySelector('.ax-ver-year'), verPill = ver && ver.querySelector('.ax-ver-pill');
    /* the three releases: the word itself changes face as the years pass; the pill carries the version to
       where its year falls on the 2021-2026 line */
    var FACES = { 2021: ['v1', 'V1', 0], 2025: ['ui', '\u201cUI\u201d V1.6', 0.8], 2026: ['v2', 'V2', 1] };
    function setYear(year) {
      if (verYear && verYear.textContent !== String(year)) {
        verYear.textContent = String(year);
        if (verPill) { verPill.textContent = FACES[year][1]; verPill.style.setProperty('--p', FACES[year][2]); }
      }
      if (target.dataset.face === FACES[year][0]) return;
      target.dataset.face = FACES[year][0];
    }
    /* each dial keeps its exact value (d.v) for the font, which interpolates smoothly; only the number in its
       lozenge is rounded to the step. Rounding before the font made opsz move in visible one-unit jumps and
       made a value hovering near a rounding edge flick back and forth. */
    var dials = AXES.map(function (a) {
      var d = { a: a, v: a.value };
      d.h = wmHandleDial.mount(group, { label: a.label, caption: a.tag, min: a.min, max: a.max, step: a.step, value: a.value, orient: 'vertical',
        onChange: function () { d.v = d.h.get(); stopDrift(); apply(); dirty(); } });
      d.root = group.lastElementChild; d.root.style.setProperty('--enter', 0); d.root.classList.add('ax-in');
      return d;
    });
    function setV(d, x) { d.v = x; d.h.set(x, true); }   /* the lozenge glides on the exact value; the dial prints it to its step */
    var nudge = {};   /* a transient push per axis, decaying, so an arrival is felt once */
    function apply() {
      target.style.fontVariationSettings = dials.map(function (d) {
        var v = d.v, n = nudge[d.a.tag] || 0;
        if (n) v = Math.max(d.a.min, Math.min(d.a.max, v + n * (d.a.max - d.a.min) * 0.35));
        return "'" + d.a.tag + "' " + v.toFixed(d.a.step < 1 ? 3 : 2);
      }).join(', ');
    }
    function dirty() { if (reset) reset.hidden = !dials.some(function (d) { return d.h.get() !== d.a.value; }); }
    /* the drift: all six dials on harmonics of one 24 s period (ital 1, opsz 2, GEOM 3, wght 4, YTAS 5,
       SHRP 6), each a cosine phased through its own default, rounded to its step, until a hand stops it */
    var drift = null, driftT0 = 0, DRIFT = 24000, HARMONIC = { ital: 1, opsz: 2, GEOM: 3, wght: 4, YTAS: 5, SHRP: 6 };
    function driftFrame(now) {
      if (!drift) return;
      dials.forEach(function (d) {
        var span = d.a.max - d.a.min, phi = Math.acos(1 - 2 * (d.a.value - d.a.min) / span), n = HARMONIC[d.a.tag] || 1;
        var v = d.a.min + span * (1 - Math.cos(2 * Math.PI * n * (now - driftT0) / DRIFT + phi)) / 2;
        var k = Math.min(1, (now - driftT0) / 1800), amp = k * k * (3 - 2 * k);   /* the drift eases in over 1.8 s */
        v = d.a.value + amp * (v - d.a.value);
        setV(d, v);
      });
      apply(); drift = requestAnimationFrame(driftFrame);
    }
    function startDrift() { if (still || drift || wrap.classList.contains('is-touched')) return; wrap.classList.add('is-live'); if (reset) reset.hidden = true; driftT0 = performance.now(); drift = requestAnimationFrame(driftFrame); }
    function stopDrift() { if (!drift) return; cancelAnimationFrame(drift); drift = null; wrap.classList.remove('is-live'); }
    if (reset) reset.addEventListener('click', function () {
      reset.classList.add('is-spun'); setTimeout(function () { reset.classList.remove('is-spun'); }, 500);
      wrap.classList.remove('is-touched');
      dials.forEach(function (d) { setV(d, d.a.value); }); apply(); dirty(); startDrift();
    });
    card.addEventListener('hl:restart', function () { stopDrift(); wrap.classList.remove('is-touched'); dials.forEach(function (d) { setV(d, d.a.value); }); apply(); dirty(); });
    group.addEventListener('pointerdown', function () { wrap.classList.add('is-touched'); stopDrift(); dirty(); }, true);
    group.addEventListener('focusin', function () { wrap.classList.add('is-touched'); stopDrift(); dirty(); });
    /* the arrivals: 2021 the word alone in Cal Sans 1; 2025 Cal Sans UI 1.6, wght and GEOM arrive together
       and run their whole range twice; 2026 Cal Sans 2 and the other four, one by one, each nudging the word */
    /* the three stages, each handing off without a cut:
         2021  the word rises in, alone, in Cal Sans 1
         2025  crossfade to Cal Sans UI 1.6; weight and geometry wipe in and sweep their whole range twice. The
               sweep starts and ends ON each axis's default with its amplitude eased in and out, so the value
               never jumps and the motion never starts or stops at full speed
         2026  crossfade to Cal Sans 2; the other four arrive one by one, a beat after the face, each nudging the
               word with a bump that starts and ends at rest (sin squared); then the drift eases in */
    var AT = { wght: 1.25, GEOM: 1.35, opsz: 4.85, YTAS: 5.3, SHRP: 5.75, ital: 6.2 }, UI0 = 1.2, UI1 = 4.6, SW0 = 1.45, SW1 = 4.45, END = 7.4;
    /* a release change is the same condense as card 1: the word goes into a faint grained haze, the face
       changes while the haze is thickest (the two faces are different widths, so a crossfade showed both),
       and the haze settles into the new face. One motion: up in 40% of FOG_T, down over the rest. */
    var FOG_T = 1.3, FOG_PEAK = 0.4, fogF = null;
    function fogFilter() {
      if (fogF) return fogF;
      var NS = 'http://www.w3.org/2000/svg', box = document.createElementNS(NS, 'svg');
      box.setAttribute('width', '0'); box.setAttribute('height', '0'); box.setAttribute('aria-hidden', 'true'); box.style.position = 'absolute';
      box.innerHTML = '<filter id="ax-fog" x="-8%" y="-20%" width="116%" height="140%" color-interpolation-filters="sRGB">'
        + '<feGaussianBlur in="SourceGraphic" stdDeviation="0" result="soft"/>'
        + '<feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="1" seed="7" result="noise"/>'
        + '<feColorMatrix in="noise" type="matrix" values="0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 1" result="grainBase"/>'
        + '<feComposite in="grainBase" in2="soft" operator="arithmetic" k1="0" k2="0" k3="1" k4="0" result="mixed"/>'
        + '<feComposite in="mixed" in2="soft" operator="in" result="clip"/>'
        + '<feComponentTransfer in="clip"><feFuncA type="linear" slope="1"/></feComponentTransfer></filter>';
      document.body.appendChild(box);
      var f = box.querySelector('filter');
      fogF = { blur: f.querySelector('feGaussianBlur'), grain: f.querySelectorAll('feComposite')[0], alpha: f.querySelector('feFuncA') };
      return fogF;
    }
    function fog(t) {
      var f = 0;
      if (t < 1e8 && !still) [UI0, UI1].forEach(function (Tc) {
        var u = (t - (Tc - FOG_PEAK * FOG_T)) / FOG_T;
        if (u > 0 && u < 1) f = Math.max(f, u < FOG_PEAK ? Math.sin(Math.PI / 2 * u / FOG_PEAK) : Math.cos(Math.PI / 2 * (u - FOG_PEAK) / (1 - FOG_PEAK)));
      });
      if (f < 0.002) { if (target.style.filter) target.style.filter = ''; return; }
      var F = fogFilter(), fs = parseFloat(getComputedStyle(target).fontSize) || 120;
      F.blur.setAttribute('stdDeviation', (fs * 0.03 * Math.pow(f, 1.7)).toFixed(2));   /* a light haze, scaled with the word (Mark: way less) */
      var g = 0.15 * Math.pow(f, 1.4); F.grain.setAttribute('k1', (2 * g).toFixed(3)); F.grain.setAttribute('k3', (1 - g).toFixed(3));
      F.alpha.setAttribute('slope', (1 - 0.15 * f).toFixed(3));   /* fainter as it fogs: the light spread thin */
      target.style.filter = 'url(#ax-fog)';
    }
    function osc(a, u) {   /* two full turns through the default: value(0) = value(1) = default */
      var span = a.max - a.min, phi = Math.acos(1 - 2 * (a.value - a.min) / span);
      return a.min + span * (1 - Math.cos(2 * Math.PI * 2 * u + phi)) / 2;
    }
    player(card, function (t) {
      var year = t >= 1e8 ? 2026 : t >= UI1 ? 2026 : t >= UI0 ? 2025 : 2021;
      setYear(year); fog(t);
      /* 2021: the word rises 12px and comes up, out-eased */
      var r = t >= 1e8 ? 1 : 1 - Math.pow(1 - lin(t, 0, 0.6), 3);
      target.style.opacity = r.toFixed(3); target.style.transform = r < 1 ? 'translateY(' + ((1 - r) * 12).toFixed(1) + 'px)' : '';
      dials.forEach(function (d) {
        var at = AT[d.a.tag], e = t >= 1e8 ? 1 : ease(lin(t, at, at + 0.7));
        d.root.style.setProperty('--enter', e.toFixed(3));
        var sweeps = d.a.tag === 'wght' || d.a.tag === 'GEOM';
        if (sweeps) {
          nudge[d.a.tag] = 0;   /* the sweep is their arrival; no nudge on top of it */
          if (t < 1e8 && t >= SW0 && t < SW1) {
            var u = (t - SW0) / (SW1 - SW0), env = Math.min(1, u / 0.15, (1 - u) / 0.15); env = env * env * (3 - 2 * env);
            setV(d, d.a.value + env * (osc(d.a, u) - d.a.value));
          } else if (t < 1e8 && t >= SW1 && t < SW1 + 0.2) setV(d, d.a.value);
        } else {
          var p = t >= 1e8 ? 1 : lin(t, at + 0.1, at + 1.0), b = Math.sin(p * Math.PI);
          nudge[d.a.tag] = p > 0 && p < 1 ? b * b : 0;   /* starts and ends at rest */
        }
      });
      apply();
      return t > END;
    }, { duration: END, after: function () { startDrift(); } });
    /* out of view the drift stops; back in view it resumes, unless a hand has it */
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (!e.isIntersecting) stopDrift(); else if (card.classList.contains('is-done')) startDrift(); });
    }, { threshold: 0.2 }).observe(wrap);
    apply();
    group._axes = { dials: dials };
  });

  /* ── 4 · 1.4M views, 12.6K bookmarks ──────────────────────────────────────────────────
     Both figures count up from zero, tabular, once; beneath them the 187 outside posts tile
     into a reel in date order -- tiny grey cards with the post's own text, pictures as pictures,
     the most-read ones as full-height cards -- which then drifts
     left to right. Two copies sit end to end so the loop never shows a seam. */
  (function () {
    var card = document.getElementById('hl-four'); if (!card) return;
    var figs = Array.prototype.slice.call(card.querySelectorAll('[data-count]'));
    var reel = card.querySelector('.hl-reel'), tiles = card.querySelector('.hl-tiles'), N = +(tiles && tiles.dataset.n) || 187;
    var cells = [], copy = [];   /* cells: the first copy, in date order; copy: its twin, aria-hidden */
    var BIG = 14, V = 28;        /* how many posts get the full-height card; the drift, px per second */
    if (tiles) { for (var i = 0; i < N; i++) cells.push(tiles.appendChild(document.createElement('i'))); }
    var pop = card.querySelector('.hl-pop');
    function fmtN(n) { return n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(n >= 1e4 ? 0 : 1) + 'K' : String(n); }
    function stats(post) {
      return ['views', 'likes', 'reposts', 'bookmarks'].filter(function (k) { return post[k] != null; }).map(function (k) { return fmtN(post[k]) + ' ' + k; }).join(' · ');
    }
    function showPop(a, post) {
      if (!pop || !reel) return;
      pop.innerHTML = '';
      if (post.img) { var im = document.createElement('img'); im.src = post.img; im.alt = ''; im.loading = 'lazy'; pop.appendChild(im); }
      var who = document.createElement('b'); who.textContent = post.who; pop.appendChild(who);
      var when = document.createElement('time'); when.textContent = post.date; pop.appendChild(when);
      var txt = document.createElement('p'); txt.textContent = post.text; pop.appendChild(txt);
      var st = stats(post); if (st) { var sp = document.createElement('span'); sp.textContent = st; pop.appendChild(sp); }
      var stage = card.querySelector('.hl-stage'), sr = stage.getBoundingClientRect(), r = a.getBoundingClientRect();
      pop.hidden = false;
      var pw = pop.offsetWidth, ph = pop.offsetHeight;
      var x = Math.max(0, Math.min(sr.width - pw, r.left - sr.left + r.width / 2 - pw / 2));
      var y = r.top - sr.top - ph - 6; if (y < 0) y = Math.min(sr.height - ph, r.top - sr.top + r.height + 6);
      pop.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(Math.max(0, y)) + 'px)';
    }
    function hidePop() { if (pop) pop.hidden = true; }
    function clean(text) { return text.replace(/\s*(https?:\/\/\S+|pic\.twitter\.com\/\S+)\s*$/g, '').replace(/\n{3,}/g, '\n\n').trim(); }
    /* the full-height card: the picture across the top if there is one, handle, date, then the whole post, never cut */
    function bigTile(a, post) {
      a.classList.add('big');
      if (post.img) { var im = document.createElement('img'); im.src = post.img; im.alt = ''; im.loading = 'lazy'; a.appendChild(im); }
      var who = document.createElement('b'); who.textContent = post.who; a.appendChild(who);
      var when = document.createElement('time'); when.textContent = post.date; a.appendChild(when);
      var txt = document.createElement('p'); txt.textContent = clean(post.text); a.appendChild(txt);
      var st = stats(post); if (st) { var sp = document.createElement('span'); sp.textContent = st; a.appendChild(sp); }
    }
    function pace() {   /* the drift: one copy's width at V px/s; after a resize, keep the speed */
      if (!tiles) return;
      var w = tiles.scrollWidth / 2; if (w > 0) tiles.style.setProperty('--reel-t', Math.round(w / V) + 's');
    }
    if (tiles && window.fetch) fetch(tiles.dataset.src || 'data/posts.json').then(function (r) { return r.json(); }).then(function (posts) {
      posts = posts.slice(0, N);
      var big = {}, span = posts.length / BIG;   /* the most-read post of each stretch of the timeline, so the cards come evenly */
      for (var b = 0; b < BIG; b++) {
        var top = null;
        posts.slice(Math.round(b * span), Math.round((b + 1) * span)).forEach(function (p) { if (!top || (p.views || 0) > (top.views || 0)) top = p; });
        if (top) big[top.id] = true;
      }
      function make(post, i, twin) {
        var a = document.createElement('a'); a.href = post.url; a.target = '_blank'; a.rel = 'noopener';
        a.className = twin ? '' : cells[i].className; a.setAttribute('aria-label', post.who + ', ' + post.date);
        if (twin) { a.setAttribute('aria-hidden', 'true'); a.tabIndex = -1; }
        if (post.img) { a.classList.add('has-img'); if (!big[post.id]) a.style.backgroundImage = 'url(' + post.img + ')'; }
        if (big[post.id]) bigTile(a, post);
        else {
          if (!post.img) { var tw = document.createElement('b'); tw.textContent = post.who; a.appendChild(tw); var tt = document.createElement('p'); tt.textContent = clean(post.text); a.appendChild(tt); }
          a.addEventListener('mouseenter', function () { showPop(a, post); }); a.addEventListener('focus', function () { showPop(a, post); });
          a.addEventListener('mouseleave', hidePop); a.addEventListener('blur', hidePop);
        }
        return a;
      }
      posts.forEach(function (post, i) { var a = make(post, i, false); tiles.replaceChild(a, cells[i]); cells[i] = a; });
      posts.forEach(function (post, i) { copy.push(tiles.appendChild(make(post, i, true))); });
      pace();
      if (card.classList.contains('is-done')) cells.forEach(function (c, i) { c.classList.add('on'); copy[i].classList.add('on'); });
    }).catch(function () {});
    window.addEventListener('resize', pace);
    function fmt(v, spec) {   /* "1.4M" / "12.6K": one decimal and the unit the spec carries */
      var unit = spec.replace(/[\d.]/g, ''), n = parseFloat(spec) * v;
      return (unit ? n.toFixed(1) : Math.round(n).toLocaleString()) + unit;
    }
    var T1 = 1.8;
    player(card, function (t) {
      var p = ease(lin(t, 0.1, T1));
      figs.forEach(function (f) { f.textContent = fmt(p, f.dataset.count); });
      var k = Math.round(p * N);   /* in date order: the census fills as it happened */
      cells.forEach(function (c, i) { var on = i < k; c.classList.toggle('on', on); if (copy[i]) copy[i].classList.toggle('on', on); });
      return t > T1 + 0.3;
    }, { duration: T1 + 1 });
  })();

  /* ── bento or slideshow ──────────────────────────────────────────────────────────────── */
  (function () {
    var grid = document.querySelector('.hl-grid'), sec = document.getElementById('highlights'); if (!grid) return;
    var cards = Array.prototype.slice.call(grid.querySelectorAll('.hl')), chips = sec.querySelectorAll('.hl-mode .wm-chip');
    var bar = sec.querySelector('.hl-bar'), dots = bar ? Array.prototype.slice.call(bar.querySelectorAll('.hl-dot')) : [], playBtn = bar && bar.querySelector('.hl-play');
    var prevBtn = bar && bar.querySelector('.hl-prev'), nextBtn = bar && bar.querySelector('.hl-next');
    var cur = 0, timer = 0, running = true, seen = false;   /* seen: the section has come on screen; nothing plays before */
    function show(i, play) {
      cur = (i + cards.length) % cards.length;
      cards.forEach(function (c, j) { c.classList.toggle('is-current', j === cur); });
      dots.forEach(function (d, j) { d.classList.toggle('on', j === cur); d.setAttribute('aria-selected', j === cur); });
      var c = cards[cur];
      fitSample();   /* the word can only be measured once its slide is showing */
      c.querySelectorAll('.hl-stage').forEach(function (s) { s.dispatchEvent(new Event('hl:relayout')); });
      if (play !== false && c._hl && seen) { if (still) c._hl.rest(); else c._hl.play(); }
      arm();
    }
    function arm() {
      clearTimeout(timer);
      if (!running || !seen || !grid.classList.contains('is-show')) return;
      var c = cards[cur], d = still ? 4 : ((c._hl && c._hl.duration) || 5) + 3;
      timer = setTimeout(function () { show(cur + 1); }, d * 1000);
    }
    function mode(show_) {
      grid.classList.toggle('is-show', show_); sec.classList.toggle('is-show', show_);
      chips.forEach(function (ch) { var on = (ch.dataset.mode === 'show') === show_; ch.classList.toggle('on', on); ch.setAttribute('aria-pressed', on); });
      if (show_) { running = true; if (playBtn) playBtn.setAttribute('aria-pressed', 'true'); show(cur); }
      else { clearTimeout(timer); cards.forEach(function (c) { c.classList.remove('is-current'); c.querySelectorAll('.hl-stage').forEach(function (s) { s.dispatchEvent(new Event('hl:relayout')); }); }); }
      fitSample(); snapAll();
      try { localStorage.setItem('hl-mode', show_ ? 'show' : 'bento'); } catch (e) {}
    }
    chips.forEach(function (ch) { ch.addEventListener('click', function () { mode(ch.dataset.mode === 'show'); }); });
    /* any hand on the slides pauses the autoplay, so a slide can be looked at; play resumes it */
    function hold() {
      if (!running) return; running = false; clearTimeout(timer);
      if (playBtn) { playBtn.setAttribute('aria-pressed', 'false'); playBtn.setAttribute('aria-label', 'Play'); var ic = playBtn.querySelector('.wm-icon'); if (ic) ic.textContent = 'play_arrow'; }
    }
    function go(i) { hold(); show(i); }
    dots.forEach(function (d, j) { d.addEventListener('click', function () { go(j); }); });
    /* back and next: the bar's arrows, the keyboard's arrows while the section is on screen, a swipe on touch */
    if (prevBtn) prevBtn.addEventListener('click', function () { go(cur - 1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { go(cur + 1); });
    var onScreen = false;
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) {
      onScreen = es[0].isIntersecting;
      if (onScreen && !seen) { seen = true; if (grid.classList.contains('is-show')) show(cur); }   /* the first slide starts when it is seen */
    }, { threshold: 0.3 }).observe(grid);
    else seen = true;
    document.addEventListener('keydown', function (e) {
      if (!grid.classList.contains('is-show') || !onScreen || e.metaKey || e.ctrlKey || e.altKey) return;
      var el = document.activeElement; if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); go(cur + 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); go(cur - 1); }
    });
    var sx = null, sy = null;
    grid.addEventListener('pointerdown', function (e) { if (e.pointerType === 'touch' && grid.classList.contains('is-show')) { sx = e.clientX; sy = e.clientY; } });
    grid.addEventListener('pointerup', function (e) {
      if (sx == null) return; var dx = e.clientX - sx, dy = e.clientY - sy; sx = sy = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > 1.5 * Math.abs(dy)) go(cur + (dx < 0 ? 1 : -1));
    });
    /* the arrows are the shared icon face's chevrons; until a face that spells them arrives they are the system
       face's arrows (SF Pro on a Mac), never their names */
    function glyphCheck() {
      [prevBtn, nextBtn].forEach(function (b) {
        var ic = b && b.querySelector('.wm-icon'); if (!ic) return;
        var probe = ic.cloneNode(true); probe.style.cssText += ';position:absolute;visibility:hidden;width:auto;overflow:visible;white-space:nowrap';
        document.body.appendChild(probe); var ok = probe.getBoundingClientRect().width < 2 * parseFloat(getComputedStyle(probe).fontSize); probe.remove();
        b.classList.toggle('no-glyph', !ok);
        if (!ok) { ic.textContent = b === prevBtn ? '\u2190' : '\u2192'; ic.classList.remove('material-symbols-outlined'); ic.classList.add('hl-arrow-sys'); }
      });
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(glyphCheck); else glyphCheck();
    if (playBtn) playBtn.addEventListener('click', function () {
      running = !running; playBtn.setAttribute('aria-pressed', running); playBtn.setAttribute('aria-label', running ? 'Pause' : 'Play');
      var ic = playBtn.querySelector('.wm-icon'); if (ic) ic.textContent = running ? 'pause' : 'play_arrow';
      if (running) show(cur); else clearTimeout(timer);
    });
    var want = null; try { want = localStorage.getItem('hl-mode'); } catch (e) {}
    mode(want !== 'bento');   /* the slideshow is the default (the markup starts in it); bento is the option */
    window.addEventListener('resize', function () { fitSample(); grid.querySelectorAll('.hl-stage').forEach(function (s) { s.dispatchEvent(new Event('hl:relayout')); }); snapAll(); });
    snapAll();
  })();
})();
