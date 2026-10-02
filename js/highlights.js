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
    var h = stage.getBoundingClientRect().height, unit = 3;
    stage.style.height = Math.ceil(h / unit) * unit + 'px';
    if (window.wmGridSnap) window.wmGridSnap();
  }
  function snapAll() { document.querySelectorAll('.hl-stage').forEach(snapStage); }

  /* a card plays once when it scrolls in; a tap replays it; the slideshow calls play() itself */
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
    var stage = card.querySelector('.hl-stage');
    if (stage) stage.addEventListener('click', function () { if (!still) play(); });
    return card._hl;
  }

  /* ── 1 · three typefaces became one ───────────────────────────────────────────────────
     The sentence sets word by word in Matter, Inter and Cal Sans, sizes and baselines off,
     the way the 2025 homepage was; holds; then the seam sweeps it into Cal Sans. */
  var W = 1954;   /* every stage is this wide in user units, so the hero's constants hold */
  (function () {
    var card = document.getElementById('hl-one'); if (!card) return;
    var stage = card.querySelector('.hl-stage');
    var words = (stage.dataset.words || '').split(' ');
    /* Matter comes as outlines of this one sentence (Cal.com's licence, not the site's): one path per word,
       in the PDF's points, with its cap height and baseline, scaled here to Cal Sans's cap at the word size */
    var mj = document.getElementById('matter-words'), MATTER = mj ? JSON.parse(mj.textContent) : null;
    var FAM = ["'Matter', system-ui, sans-serif", "'Inter', system-ui, sans-serif", "'CalSans', sans-serif"];
    var svg = el('svg', { viewBox: '0 0 ' + W + ' 760', 'aria-hidden': 'true', focusable: 'false' }, stage);
    var ctl = thermal(svg, 'h1', { x: -200, y: -300, w: W + 400, h: 1400 }, { mono: stage.hasAttribute('data-mono') });
    var shape = el('g', { fill: '#fff' });
    var hot = ctl.hot(shape), coldG = el('g', { fill: 'currentColor' }), cold = ctl.cold(coldG);
    var plainG = el('g'), plain = ctl.plain(plainG);
    var A = [], B = [], P = [], laid = false;
    function word(parent, text, fam, size, vs) {
      var t = el('text', { 'font-family': fam, 'font-size': size, 'font-weight': fam === FAM[2] ? 600 : 700 }, parent);
      if (vs) t.style.fontVariationSettings = vs;
      t.textContent = text; return t;
    }
    /* a Matter word from its outline: placed so its baseline is y and its cap height is Cal Sans's at `size` */
    function matterWord(parent, text, size) {
      var m = MATTER && MATTER.words.filter(function (w) { return w.w === text; })[0];
      if (!m) return null;
      var k = size * 0.72 / MATTER.cap;   /* Cal Sans cap 1440/2000 */
      var g = el('g', {}, parent), path = el('path', { d: m.d }, g);
      g._place = function (x, y) { g.setAttribute('transform', 'translate(' + (x - m.x0 * k).toFixed(2) + ' ' + (y - MATTER.base * k).toFixed(2) + ') scale(' + k.toFixed(4) + ')'); };
      g._w = (m.x1 - m.x0) * k;
      return g;
    }
    /* the two layers, each its own line breaking: Cal Sans straight (B); the mixed set (A)
       on the same line breaks, a little off in size and baseline, so the swap under the
       seam snaps it straight */
    function layout() {
      A.forEach(function (t) { t.remove(); }); B.forEach(function (t) { t.remove(); }); P.forEach(function (t) { t.remove(); }); A = []; B = []; P = [];
      var size = 200, lh = 215, maxW = W, x = 0, y = 230, lines = [];
      var off = [[1.06, 10], [0.94, -8], [1, 0], [0.97, 7], [1.05, -6], [0.95, 9], [1.03, -4]];
      /* B, Cal Sans, sets the lines; A keeps those lines but each word advances by its own face's width,
         so Inter is spaced as Inter and Matter as Matter, never as Cal Sans */
      words.forEach(function (w, i) {
        var tb = word(shape, w, FAM[2], size, "'opsz' 45, 'GEOM' 50, 'wght' 600");
        var wb = tb.getComputedTextLength(), gap = size * 0.24;
        if (x + wb > maxW && x > 0) { x = 0; y += lh; }
        tb.setAttribute('x', x); tb.setAttribute('y', y);
        var tp = word(plainG, w, FAM[2], size, "'opsz' 45, 'GEOM' 50, 'wght' 600"); tp.setAttribute('x', x); tp.setAttribute('y', y);
        B.push(tb); P.push(tp); lines.push(y);
        x += wb + gap;
      });
      var ax = 0, ay = -1;
      words.forEach(function (w, i) {
        var f = FAM[i % 3], o = off[i % off.length], s = size * o[0];
        if (lines[i] !== ay) { ax = 0; ay = lines[i]; }
        var ta = null, wa;
        if (f === FAM[0]) { ta = matterWord(coldG, w, s); if (ta) { ta._place(ax, ay + o[1]); wa = ta._w; } }
        if (!ta) {
          ta = word(coldG, w, f === FAM[0] ? FAM[0] : f, s, f === FAM[2] ? "'opsz' 45, 'GEOM' 50, 'wght' 600" : "'wght' 700");
          ta.setAttribute('x', ax); ta.setAttribute('y', ay + o[1]); wa = ta.getComputedTextLength();
        }
        A.push(ta);
        ax += wa + s * 0.26;
      });
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + (y + 80));
      laid = true;
    }
    layout();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
    var ink = inkOf(card);
    /* the piece: words in (0–1.0s), hold to 2.2, the stripe's pass, a beat uniformly lit, the drain */
    var T0 = 1.0, T1 = 2.2, T2 = T1 + PASS + 0.3, T3 = T2 + 1.0;
    player(card, function (t) {
      A.forEach(function (ta, i) { ta.setAttribute('opacity', (t >= 1e8 ? 1 : lin(t, i * (T0 / A.length), i * (T0 / A.length) + 0.25)).toFixed(3)); });
      ctl.lead(Math.min(START + Math.max(0, t - T1) * V, FREEZE));
      var z = ease(lin(t, T2, T3));
      ctl.drain(z, inkOf(card));
      ctl.finish(t > T3);
      return t > T3 + 0.2;
    }, { duration: T3 });
    stage.addEventListener('hl:relayout', function () { layout(); snapStage(stage); });
  })();

  /* ── 2 · day one: Cal.com reads as rings ──────────────────────────────────────────────
     Hairline rings through C, a, c, o and the arches of m draw on; then one pass of the
     stripe reveals the letters and takes the rings with it. */
  (function () {
    var card = document.getElementById('hl-two'); if (!card) return;
    var stage = card.querySelector('.hl-stage'), src = document.getElementById('calcom-paths');
    if (!src) return;
    var paths = JSON.parse(src.textContent);
    var svg = el('svg', { viewBox: '-20 -20 ' + (W + 40) + ' 450', 'aria-hidden': 'true', focusable: 'false' }, stage);
    var ctl = thermal(svg, 'h2', { x: -200, y: -300, w: W + 400, h: 1100 }, { mono: stage.hasAttribute('data-mono') });
    var shape = el('g', { fill: '#fff' }), plainG = el('g');
    paths.forEach(function (d) { el('path', { d: d }, shape); el('path', { d: d }, plainG); });
    ctl.hot(shape); ctl.plain(plainG);
    /* the rings: through the stroke of each round letter; the m's two arches as half rings */
    /* the rings in the signal colour, through the stroke of C, a, c, o, and the two arches of m as full rings */
    var rings = el('g', { fill: 'none', 'stroke-width': 3, style: 'stroke: var(--signal)' });
    var RINGS = [[195, 204, 163], [488, 254, 114], [1038, 254, 114], [1314, 254, 113], [1663, 202, 64], [1848, 202, 64]];
    var strokes = RINGS.map(function (r) { var c = el('circle', { cx: r[0], cy: r[1], r: r[2] }, rings); return { el: c, len: 2 * Math.PI * r[2] }; });
    strokes.forEach(function (s) { s.el.setAttribute('stroke-dasharray', s.len); s.el.setAttribute('stroke-dashoffset', s.len); });
    ctl.cold(rings);
    var T0 = 1.4, T1 = 2.0, T2 = T1 + PASS + 0.3, T3 = T2 + 1.0;
    player(card, function (t) {
      strokes.forEach(function (s, i) { var d = ease(lin(t, i * 0.12, i * 0.12 + 1.0)); s.el.setAttribute('stroke-dashoffset', (s.len * (1 - d)).toFixed(1)); });
      ctl.lead(Math.min(START + Math.max(0, t - T1) * V, FREEZE));
      ctl.drain(ease(lin(t, T2, T3)), inkOf(card));
      ctl.finish(t > T3);
      return t > T3 + 0.2;
    }, { duration: T3 });
  })();

  /* ── 3 · six axes, one file, added as Cal.com grew ─────────────────────────────────────
     The word alone, stamped 2021. The dials arrive in release order, each stamped and each
     nudging the word once: wght and GEOM (2025), then opsz, YTAS, SHRP, ital (2026). End
     state: all six live and one of them drifting on its own until a hand stops it. */
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
      w.style.fontSize = '100px';
      var range = document.createRange(); range.selectNodeContents(w);
      var tw = range.getBoundingClientRect().width, box = w.getBoundingClientRect().width;
      if (tw > 0 && box > 0) w.style.fontSize = Math.max(40, Math.min(160, Math.floor(100 * box / tw))) + 'px';
    });
  }
  fitSample();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { fitSample(); snapAll(); });
  window.addEventListener('resize', fitSample);
  document.querySelectorAll('[data-axes]').forEach(function (group) {
    if (!window.wmHandleDial) return;
    var card = group.closest('.hl') || group.parentElement;
    var target = document.getElementById(group.dataset.axes);
    var wrap = group.parentElement, reset = wrap.querySelector('.ax-reset'), stamp = card.querySelector('.ax-stamp');
    var stampYear = stamp && stamp.querySelector('b'), stampFace = stamp && stamp.querySelector('i');
    /* the three releases: the word itself changes face as the years pass */
    var FACES = { 2021: ['v1', 'Cal Sans 1.000'], 2025: ['ui', 'Cal Sans UI 1.6'], 2026: ['v2', 'Cal Sans 2.000'] };
    function setYear(year) {
      if (stampYear && stampYear.textContent !== String(year)) { stampYear.textContent = String(year); if (stampFace) stampFace.textContent = FACES[year][1]; }
      if (target.dataset.face !== FACES[year][0]) target.dataset.face = FACES[year][0];
    }
    var dials = AXES.map(function (a) {
      var h = wmHandleDial.mount(group, { label: a.label, caption: a.tag, min: a.min, max: a.max, step: a.step, value: a.value, orient: 'vertical',
        onChange: function () { stopDrift(); apply(); dirty(); } });
      var root = group.lastElementChild; root.style.setProperty('--enter', 0); root.classList.add('ax-in');
      return { a: a, h: h, root: root };
    });
    var nudge = {};   /* a transient push per axis, decaying, so an arrival is felt once */
    function apply() {
      target.style.fontVariationSettings = dials.map(function (d) {
        var v = d.h.get(), n = nudge[d.a.tag] || 0;
        if (n) v = Math.max(d.a.min, Math.min(d.a.max, v + n * (d.a.max - d.a.min) * 0.35));
        return "'" + d.a.tag + "' " + (d.a.step < 1 ? v.toFixed(2) : Math.round(v));
      }).join(', ');
    }
    function dirty() { if (reset) reset.hidden = !dials.some(function (d) { return d.h.get() !== d.a.value; }); }
    /* the drift: one axis, GEOM, on a slow cosine through its default, until touched */
    var drift = null, driftT0 = 0, DRIFT = 24000, DRIFT_AXIS = 'GEOM';
    function driftFrame(now) {
      if (!drift) return;
      var d = dials.filter(function (d) { return d.a.tag === DRIFT_AXIS; })[0];
      var span = d.a.max - d.a.min, phi = Math.acos(1 - 2 * (d.a.value - d.a.min) / span);
      d.h.set(Math.round(d.a.min + span * (1 - Math.cos(2 * Math.PI * (now - driftT0) / DRIFT + phi)) / 2), true);
      apply(); drift = requestAnimationFrame(driftFrame);
    }
    function startDrift() { if (still || drift || wrap.classList.contains('is-touched')) return; wrap.classList.add('is-live'); if (reset) reset.hidden = true; driftT0 = performance.now(); drift = requestAnimationFrame(driftFrame); }
    function stopDrift() { if (!drift) return; cancelAnimationFrame(drift); drift = null; wrap.classList.remove('is-live'); }
    if (reset) reset.addEventListener('click', function () {
      reset.classList.add('is-spun'); setTimeout(function () { reset.classList.remove('is-spun'); }, 500);
      wrap.classList.remove('is-touched');
      dials.forEach(function (d) { d.h.set(d.a.value, true); }); apply(); dirty(); startDrift();
    });
    group.addEventListener('pointerdown', function () { wrap.classList.add('is-touched'); stopDrift(); dirty(); }, true);
    group.addEventListener('focusin', function () { wrap.classList.add('is-touched'); stopDrift(); dirty(); });
    /* the arrivals: 2021 the word alone in Cal Sans 1; 2025 Cal Sans UI 1.6, wght and GEOM arrive together
       and run their whole range twice; 2026 Cal Sans 2 and the other four, one by one, each nudging the word */
    var AT = { wght: 1.2, GEOM: 1.2, opsz: 4.6, YTAS: 5.05, SHRP: 5.5, ital: 5.95 }, UI0 = 1.2, UI1 = 4.6, END = 7.2;
    player(card, function (t) {
      var year = t >= 1e8 ? 2026 : t >= UI1 ? 2026 : t >= UI0 ? 2025 : 2021;
      setYear(year);
      dials.forEach(function (d) {
        var at = AT[d.a.tag], e = t >= 1e8 ? 1 : ease(lin(t, at, at + 0.7));
        d.root.style.setProperty('--enter', e.toFixed(3));
        var p = t >= 1e8 ? 1 : lin(t, at + 0.1, at + 1.0); nudge[d.a.tag] = p > 0 && p < 1 ? Math.sin(p * Math.PI) : 0;
        /* the UI phase: weight and geometry sweep end to end, twice, a quarter turn apart */
        if (t < 1e8 && t >= UI0 + 0.7 && t < UI1 && (d.a.tag === 'wght' || d.a.tag === 'GEOM')) {
          var u = (t - UI0 - 0.7) / (UI1 - UI0 - 0.7), ph = d.a.tag === 'GEOM' ? Math.PI / 2 : 0;
          var v = d.a.min + (d.a.max - d.a.min) * (1 - Math.cos(2 * Math.PI * 2 * u + ph)) / 2;
          d.h.set(Math.round(v), true); nudge[d.a.tag] = 0;
        } else if (t < 1e8 && t >= UI1 && t < UI1 + 0.6 && (d.a.tag === 'wght' || d.a.tag === 'GEOM')) {
          d.h.set(d.a.value, true);   /* 2026 opens on the defaults */
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
     Both figures count up from zero, tabular, once; behind them the 187 outside posts tile in
     as faint cards, filling as the count climbs. */
  (function () {
    var card = document.getElementById('hl-four'); if (!card) return;
    var figs = Array.prototype.slice.call(card.querySelectorAll('[data-count]'));
    var tiles = card.querySelector('.hl-tiles'), N = +(tiles && tiles.dataset.n) || 187, cells = [];
    /* the posts themselves, in date order, each tile a link; until they load, blanks keep the count */
    if (tiles) { for (var i = 0; i < N; i++) cells.push(tiles.appendChild(document.createElement('i'))); }
    var pop = card.querySelector('.hl-pop');
    function fmtN(n) { return n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(n >= 1e4 ? 0 : 1) + 'K' : String(n); }
    function showPop(a, post) {
      if (!pop) return;
      pop.innerHTML = '';
      if (post.img) { var im = document.createElement('img'); im.src = post.img; im.alt = ''; im.loading = 'lazy'; pop.appendChild(im); }
      var who = document.createElement('b'); who.textContent = post.who; pop.appendChild(who);
      var when = document.createElement('time'); when.textContent = post.date; pop.appendChild(when);
      var txt = document.createElement('p'); txt.textContent = post.text; pop.appendChild(txt);
      var stats = ['views', 'likes', 'reposts', 'bookmarks'].filter(function (k) { return post[k] != null; }).map(function (k) { return fmtN(post[k]) + ' ' + k; });
      if (stats.length) { var st = document.createElement('span'); st.textContent = stats.join(' · '); pop.appendChild(st); }
      var sr = tiles.getBoundingClientRect(), r = a.getBoundingClientRect();
      pop.hidden = false;
      var pw = pop.offsetWidth, ph = pop.offsetHeight;
      var x = Math.max(0, Math.min(sr.width - pw, r.left - sr.left + r.width / 2 - pw / 2));
      var y = r.top - sr.top + r.height + 6; if (y + ph > sr.height) y = Math.max(0, r.top - sr.top - ph - 6);
      pop.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px)';
    }
    function hidePop() { if (pop) pop.hidden = true; }
    if (tiles && window.fetch) fetch(tiles.dataset.src || 'data/posts.json').then(function (r) { return r.json(); }).then(function (posts) {
      posts.slice(0, N).forEach(function (post, i) {
        var a = document.createElement('a'); a.href = post.url; a.target = '_blank'; a.rel = 'noopener';
        a.className = cells[i].className; a.setAttribute('aria-label', post.who + ', ' + post.date);
        if (post.img) { a.classList.add('has-img'); a.style.backgroundImage = 'url(' + post.img + ')'; }
        a.addEventListener('mouseenter', function () { showPop(a, post); }); a.addEventListener('focus', function () { showPop(a, post); });
        a.addEventListener('mouseleave', hidePop); a.addEventListener('blur', hidePop);
        tiles.replaceChild(a, cells[i]); cells[i] = a;
      });
    }).catch(function () {});
    var order = cells.map(function (_, i) { return i; });   /* in date order: the census fills as it happened */
    function fmt(v, spec) {   /* "1.4M" / "12.6K": one decimal and the unit the spec carries */
      var unit = spec.replace(/[\d.]/g, ''), n = parseFloat(spec) * v;
      return (unit ? n.toFixed(1) : Math.round(n).toLocaleString()) + unit;
    }
    var T1 = 1.8;
    player(card, function (t) {
      var p = ease(lin(t, 0.1, T1));
      figs.forEach(function (f) { f.textContent = fmt(p, f.dataset.count); });
      var k = Math.round(p * N);
      order.forEach(function (idx, j) { cells[idx].classList.toggle('on', j < k); });
      return t > T1 + 0.3;
    }, { duration: T1 + 1 });
  })();

  /* ── bento or slideshow ──────────────────────────────────────────────────────────────── */
  (function () {
    var grid = document.querySelector('.hl-grid'), sec = document.getElementById('highlights'); if (!grid) return;
    var cards = Array.prototype.slice.call(grid.querySelectorAll('.hl')), chips = sec.querySelectorAll('.hl-mode .wm-chip');
    var bar = sec.querySelector('.hl-bar'), dots = bar ? Array.prototype.slice.call(bar.querySelectorAll('.hl-dot')) : [], playBtn = bar && bar.querySelector('.hl-play');
    var cur = 0, timer = 0, running = true;
    function show(i, play) {
      cur = (i + cards.length) % cards.length;
      cards.forEach(function (c, j) { c.classList.toggle('is-current', j === cur); });
      dots.forEach(function (d, j) { d.classList.toggle('on', j === cur); d.setAttribute('aria-selected', j === cur); });
      var c = cards[cur];
      c.querySelectorAll('.hl-stage').forEach(function (s) { s.dispatchEvent(new Event('hl:relayout')); });
      if (play !== false && c._hl) { if (still) c._hl.rest(); else c._hl.play(); }
      arm();
    }
    function arm() {
      clearTimeout(timer);
      if (!running || !grid.classList.contains('is-show')) return;
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
    dots.forEach(function (d, j) { d.addEventListener('click', function () { show(j); }); });
    if (playBtn) playBtn.addEventListener('click', function () {
      running = !running; playBtn.setAttribute('aria-pressed', running); playBtn.setAttribute('aria-label', running ? 'Pause' : 'Play');
      var ic = playBtn.querySelector('.wm-icon'); if (ic) ic.textContent = running ? 'pause' : 'play_arrow';
      if (running) show(cur); else clearTimeout(timer);
    });
    var want = null; try { want = localStorage.getItem('hl-mode'); } catch (e) {}
    if (want === 'show') mode(true);
    window.addEventListener('resize', function () { fitSample(); grid.querySelectorAll('.hl-stage').forEach(function (s) { s.dispatchEvent(new Event('hl:relayout')); }); snapAll(); });
    snapAll();
  })();
})();
