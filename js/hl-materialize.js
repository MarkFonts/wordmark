/* hl-materialize.js -- the materialization engine for the Cal Sans highlights (cards 1 and 2), lifted from the
   comparison pages' variants.js (round 5, 2026-10-04) without their page UI. Mark chose:
     card 1  D V3: Three typefaces (Inter 14/400) / on the homepage (Matter SemiBold, outlines) / became one family.
             cascading in, a hold, one-motion swaps into Cal Sans, the period sliding out before "family" condenses
     card 2  D logo: the acid rings draw first, then Cal.com condenses out of a faint haze
   The fog is the hero's thermal chain held at its pad (thermal()), condensed by cond(); a word's fog may only
   reach `spread` past its letters. Matter ships as outlines (#matter-words), never as a font. */
window.hlMaterialize = (function () {
  var SVG = 'http://www.w3.org/2000/svg';
  var uidN = 0; function uid() { return 'hm' + (++uidN); }
  function el(tag, attrs, parent) {
    var e = document.createElementNS(SVG, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function inkOf(node) {
    try {
      var cv = document.createElement('canvas'); cv.width = cv.height = 1;
      var x = cv.getContext('2d', { willReadFrequently: true });
      x.fillStyle = '#000'; x.fillStyle = getComputedStyle(node).color; x.fillRect(0, 0, 1, 1);
      var d = x.getImageData(0, 0, 1, 1).data; return [d[0] / 255, d[1] / 255, d[2] / 255];
    } catch (e) { return [0.9, 0.9, 0.9]; }
  }
  /* the hero's pass: the lead from START to FREEZE at V units/s; the stripe's period is 2000, the seam rides LAG behind the lead */
  var START = -1300, FREEZE = 3300 + 3 * 2000 - 640, V = 2640, W = 1954, LAG = 2000;
  var ease = function (t) { t = Math.max(0, Math.min(1, t)); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  var lin = function (t, a, b) { return Math.max(0, Math.min(1, (t - a) / (b - a))); };

  /* ── the engine ─────────────────────────────────────────────────────────────────────── */
  var HOT = [[0.02, 0.05, 0.1, 1, 1, 0.95, 0.9], [0.02, 0.2, 0.85, 1, 0.55, 0.1, 0.1], [0.25, 0.75, 0.95, 1, 0.1, 0.1, 0.6], [0, 0.05, 0.45, 1, 1, 1, 1]];
  var MONO = [[0, 0.3, 0.7, 1, 1, 1, 1], [0, 0.3, 0.7, 1, 1, 1, 1], [0, 0.3, 0.7, 1, 1, 1, 1], [0, 0.05, 0.45, 1, 1, 1, 1]];
  function flat(c) { return [Array(7).fill(c[0]), Array(7).fill(c[1]), Array(7).fill(c[2]), Array(7).fill(1)]; }
  function lerpT(a, b, u) { return a.map(function (row, i) { return row.map(function (x, j) { return x + (b[i][j] - x) * u; }); }); }
  var PAD = '#a0a0a0', LIT = '#c4c4c4', K = '#000';
  /* the hero's stripe over 8000 units: the held pad, three bands, the notch at 7000 (the lead), the pad again */
  var STOPS = [[0, PAD], [0.03, PAD], [0.095, K], [0.155, K], [0.22, LIT], [0.28, LIT], [0.345, K], [0.405, K], [0.47, LIT], [0.53, LIT], [0.595, K], [0.655, K], [0.72, LIT], [0.78, LIT], [0.845, K], [0.905, K], [0.97, PAD], [1, PAD]];
  /* a short stripe for the per-word pass: the pad, one band, the swap notch, the lead notch */
  var STOPS_SHORT = [[0, PAD], [0.28, PAD], [0.345, K], [0.405, K], [0.47, LIT], [0.53, LIT], [0.595, K], [0.655, K], [0.72, LIT], [0.78, LIT], [0.845, K], [0.905, K], [0.97, PAD], [1, PAD]];
  /* no bands: the held pad with one soft edge, black beyond it; the seam (gradient 5000) sits in the edge */
  var STOPS_FILL = [[0, PAD], [0.5925, PAD], [0.6575, K], [1, K]];

  function thermal(svg, id, box, opts) {
    opts = opts || {};
    var TABLE = opts.mono ? MONO : HOT, vert = !!opts.vertical, shift = opts.shift || 0, lag = opts.lag != null ? opts.lag : LAG, sw = opts.seamW || 120;
    var defs = el('defs', {}, svg);
    var ga = { id: id + 'S', gradientUnits: 'userSpaceOnUse', spreadMethod: 'pad' };
    if (vert) { ga.x1 = 0; ga.x2 = 0; ga.y1 = 0; ga.y2 = 8000; } else { ga.x1 = 0; ga.x2 = 8000; ga.y1 = 0; ga.y2 = 0; }
    var g = el('linearGradient', ga, defs);
    (opts.stops || STOPS).forEach(function (s) { el('stop', { offset: s[0], 'stop-color': s[1] }, g); });
    var region = { filterUnits: 'userSpaceOnUse', x: box.x, y: box.y, width: box.w, height: box.h, 'color-interpolation-filters': 'sRGB' };
    var mat = el('filter', Object.assign({ id: id + 'M' }, region), defs);
    el('feGaussianBlur', { in: 'SourceAlpha', stdDeviation: 30 }, mat);
    el('feComposite', { in2: 'SourceAlpha', operator: 'arithmetic', k2: -1, k3: 1 }, mat);
    el('feBlend', { in: 'SourceGraphic', mode: 'overlay' }, mat);
    var col = el('filter', Object.assign({ id: id + 'C' }, region), defs);
    /* materialization knobs: a low-frequency field that smears the source (opts.displace = { freq }), and an alpha
       threshold after the blur (opts.threshold) so the soft body can be pulled into blobs */
    var src = 'SourceGraphic', field = null, disp = null;
    if (opts.displace) {
      field = el('feTurbulence', { type: 'fractalNoise', baseFrequency: opts.displace.freq, numOctaves: 1, seed: 2, result: 'field' }, col);
      disp = el('feDisplacementMap', { in: 'SourceGraphic', in2: 'field', scale: 0, xChannelSelector: 'R', yChannelSelector: 'G', result: 'disp' }, col);
      src = 'disp';
    }
    var blur = el('feGaussianBlur', { in: src, stdDeviation: 5, result: 'soft' }, col);
    var thr = null, soft = 'soft';
    if (opts.threshold) { var ct = el('feComponentTransfer', { in: 'soft', result: 'softT' }, col); thr = el('feFuncA', { type: 'linear', slope: 1, intercept: 0 }, ct); soft = 'softT'; }
    el('feGaussianBlur', { in: src, stdDeviation: 26, result: 'halo0' }, col);
    var halo = el('feColorMatrix', { in: 'halo0', type: 'matrix', values: '0.5 0 0 0 0  0 0.5 0 0 0  0 0 0.5 0 0  0 0 0 0.9 0', result: 'halo' }, col);
    el('feComposite', { in: soft, in2: 'halo', operator: 'over', result: 'body' }, col);
    var noise = el('feTurbulence', { type: 'fractalNoise', baseFrequency: 0.8, numOctaves: 1, seed: 7, result: 'noise' }, col);
    el('feColorMatrix', { in: 'noise', type: 'matrix', values: '0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 1', result: 'grainBase' }, col);
    var grain = el('feComposite', { in: 'grainBase', in2: 'body', operator: 'arithmetic', k1: 0, k2: 0, k3: 1, k4: 0, result: 'mixed' }, col);
    /* the fog floor: a blur of 120 spreads a white shape so thin that alpha-from-luminance is nothing. While a piece
       is in its fog these two gains (slope g, clamped) lift the body's light and its alpha; at g = 1 they are identity */
    var gainC = el('feComponentTransfer', { in: 'mixed', result: 'gained' }, col);
    var gainRGB = ['feFuncR', 'feFuncG', 'feFuncB'].map(function (f) { return el(f, { type: 'linear', slope: 1, intercept: 0 }, gainC); });
    var alpha = el('feColorMatrix', { in: 'gained', type: 'matrix', values: '1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0.3 0.59 0.11 0 0', result: 'lumA' }, col);
    var lut = el('feComponentTransfer', { in: 'lumA', result: 'lumA_out' }, col);
    var funcs = ['feFuncR', 'feFuncG', 'feFuncB', 'feFuncA'].map(function (f, i) { return el(f, { type: 'table', tableValues: TABLE[i].join(' ') }, lut); });
    var gainA = el('feFuncA', { type: 'linear', slope: 1, intercept: 0 }, el('feComponentTransfer', { in: 'body', result: 'bodyG' }, col));
    el('feComposite', { in: 'lumA_out', in2: 'bodyG', operator: 'in', result: 'fog' }, col);
    /* the reach: how far past the letters the fog may spread. The crisp source's alpha, blurred and pushed
       (slope 6), is a soft-edged copy of the letters grown by about 1.5 sigma; the fog is cut to it. At the
       crisp end it covers the letters whole, so the end state never changes. Off: alpha 1 everywhere. */
    var reachBlur = el('feGaussianBlur', { in: 'SourceAlpha', stdDeviation: 1, result: 'reach0' }, col);
    var reachA = el('feFuncA', { type: 'linear', slope: 0, intercept: 1 }, el('feComponentTransfer', { in: 'reach0', result: 'reach' }, col));
    el('feComposite', { in: 'fog', in2: 'reach', operator: 'in' }, col);
    var sa = vert ? { x1: 0, x2: 0, y1: -sw, y2: sw } : { x1: -sw, x2: sw, y1: 0, y2: 0 };
    var seamL = el('linearGradient', Object.assign({ id: id + 'L', gradientUnits: 'userSpaceOnUse' }, sa), defs);
    el('stop', { offset: 0, 'stop-color': '#fff' }, seamL); el('stop', { offset: 1, 'stop-color': '#000' }, seamL);
    var seamR = el('linearGradient', Object.assign({ id: id + 'R', gradientUnits: 'userSpaceOnUse' }, sa), defs);
    el('stop', { offset: 0, 'stop-color': '#000' }, seamR); el('stop', { offset: 1, 'stop-color': '#fff' }, seamR);
    var rect = function (fill) { return { x: box.x, y: box.y, width: box.w, height: box.h, fill: fill }; };
    var sized = [mat, col];   /* everything cut to the region: the two filters, every mask, every region-sized rect */
    var mB = el('mask', Object.assign({ id: id + 'mB', maskUnits: 'userSpaceOnUse' }, rect('')), defs); sized.push(mB, el('rect', rect('url(#' + id + 'L)'), mB));
    var mA = el('mask', Object.assign({ id: id + 'mA', maskUnits: 'userSpaceOnUse' }, rect('')), defs); sized.push(mA, el('rect', rect('url(#' + id + 'R)'), mA));
    var tr = function (v) { return vert ? 'translate(0 ' + v.toFixed(1) + ')' : 'translate(' + v.toFixed(1) + ' 0)'; };
    var ctl = {
      hots: [], plains: [], mts: [], n: 0, matOn: true,
      /* the material pass (inner shadow + overlay) is the swipe's look; a condense runs without it, or its edge
         shading shows through the fog as glowing edges that vanish mid-move */
      material: function (on) {
        if (ctl.matOn === on) return; ctl.matOn = on;
        ctl.mts.forEach(function (m) { if (on) m.setAttribute('filter', 'url(#' + id + 'M)'); else m.removeAttribute('filter'); });
      },
      hot: function (shape) {
        var m = el('mask', Object.assign({ id: id + 'sh' + (++ctl.n), maskUnits: 'userSpaceOnUse' }, rect('')), defs); sized.push(m);
        m.appendChild(shape);
        var outer = el('g', { mask: 'url(#' + id + 'mB)' }, svg); ctl.hots.push(outer);
        var layer = el('g', { filter: 'url(#' + id + 'C)' }, outer);
        var mt = el('g', { filter: 'url(#' + id + 'M)' }, layer); ctl.mts.push(mt);
        var sh = el('g', { mask: 'url(#' + m.id + ')' }, mt);
        sized.push(el('rect', rect('url(#' + id + 'S)'), sh));
        return layer;
      },
      cold: function (node) { var outer = el('g', { mask: 'url(#' + id + 'mA)' }, svg); outer.appendChild(node); return outer; },
      /* a layer under no seam at all: the materializations fade it by hand */
      free: function (node) { var o = el('g', {}, svg); o.appendChild(node); return o; },
      noise: noise, field: field, disp: disp, thr: thr,
      /* g lifts the light fully; the alpha only a third as much, or a dense shape's cloud clamps into a slab */
      /* the chain's region, as the content it filters plus a margin: a filter surface costs by its area, and a
         whole-stage region for a single word is seven stage-sized surfaces per frame */
      region: function (b) {
        box = b;
        sized.forEach(function (n) { n.setAttribute('x', b.x.toFixed(1)); n.setAttribute('y', b.y.toFixed(1)); n.setAttribute('width', b.w.toFixed(1)); n.setAttribute('height', b.h.toFixed(1)); });
      },
      reach: function (units) {
        if (units == null || units >= 240) { reachA.setAttribute('slope', '0'); reachA.setAttribute('intercept', '1'); return; }
        reachBlur.setAttribute('stdDeviation', Math.max(0.5, units / 1.5).toFixed(2));
        reachA.setAttribute('slope', '6'); reachA.setAttribute('intercept', '0');
      },
      gain: function (g) { gainRGB.forEach(function (f) { f.setAttribute('slope', g.toFixed(3)); }); gainA.setAttribute('slope', (1 + (g - 1) * 0.35).toFixed(3)); },
      plain: function (node) { var p = el('g', { fill: 'currentColor', style: 'display:none' }, svg); p.appendChild(node); ctl.plains.push(p); return p; },
      finish: function (on) { ctl.hots.forEach(function (x) { x.style.display = on ? 'none' : ''; }); ctl.plains.forEach(function (p) { p.style.display = on ? '' : 'none'; }); },
      lead: function (x) {
        g.setAttribute('gradientTransform', tr(x - 7000 + shift));
        var seam = x - lag;
        seamL.setAttribute('gradientTransform', tr(seam));
        seamR.setAttribute('gradientTransform', tr(seam));
      },
      set: function (bl, gr, T, w, hh) {
        if (hh == null) hh = 1;
        halo.setAttribute('values', '0.5 0 0 0 0  0 0.5 0 0 0  0 0 0.5 0 0  0 0 0 ' + (0.9 * hh).toFixed(3) + ' 0');
        blur.setAttribute('stdDeviation', bl.toFixed(2));
        grain.setAttribute('k1', (gr * 2).toFixed(3)); grain.setAttribute('k3', (1 - gr).toFixed(3));
        alpha.setAttribute('values', '1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  ' + (0.3 * w).toFixed(3) + ' ' + (0.59 * w).toFixed(3) + ' ' + (0.11 * w).toFixed(3) + ' ' + (1 - w).toFixed(3) + ' 0');
        for (var i = 0; i < 4; i++) funcs[i].setAttribute('tableValues', T[i].map(function (v) { return v.toFixed(3); }).join(' '));
      },
      drain: function (z, ink) { ctl.set(8 * (1 - z), 0.5 * (1 - z), lerpT(TABLE, flat(ink), z), 1 - z, 1 - z); },
      /* the condense: from a fog (blur B0, grain G0, the hot LUT) to crisp ink, by e in 0..1 */
      /* the condense, by e in 0..1, on one rule: the light is conserved. The haze is the letters' own
         light spread thin by the blur -- alpha from luminance all the way -- so it is always DIMMER than
         the letters it gathers into; nothing is gained, nothing clips, nothing flashes. Blur and grain
         fall on expo curves; the luminance keying hands over to plain shape alpha only in the last 15%. */
      cond: function (e, ink, B0, G0) {
        /* round 4's condense, restored on round 5 (2026-10-04): the fog is the letters' own light until the last 15%,
           so a word materializes from a faint haze; the material pass stays on. The "one curve" version made the
           alpha solid early and read as on-and-blurry at once. */
        var q = 1 - e, k = Math.max(0, Math.min(1, (e - 0.85) / 0.15)), w = 1 - k * k * (3 - 2 * k);
        ctl.set(B0 * Math.pow(q, 1.7), G0 * Math.pow(q, 1.4), lerpT(TABLE, flat(ink), e), w, 0.5 * q);
        ctl.gain(1);
      }
    };
    ctl.set(8, 0.5, TABLE, 1, 1);
    return ctl;
  }

  /* ── content: the sentence, the logo. Each gives `units` (one, or one per word / glyph), every unit
     a hot shape, a cold node, a plain node and its extent; the variant wires units to engines. ── */
  var SENTENCE = 'Three typefaces on the homepage became one.';
  var FAM = ["'Matter', system-ui, sans-serif", "'Inter', system-ui, sans-serif", "'CalSans', sans-serif"];
  var CALVS = "'opsz' 45, 'GEOM' 50, 'wght' 600";
  function word(parent, text, fam, size, vs) {
    var t = el('text', { 'font-family': fam, 'font-size': size, 'font-weight': fam === FAM[2] ? 600 : 700 }, parent);
    if (vs) t.style.fontVariationSettings = vs;
    t.textContent = text; return t;
  }
  function unit() { return { shape: el('g', { fill: '#fff' }), coldG: el('g', { fill: 'currentColor' }), plainG: el('g'), x0: 0, x1: 0, y0: 0, y1: 0 }; }
  /* Matter comes as outlines of this one sentence (Cal.com's licence, not the site's): one path per word, in the
     PDF's points, with its cap height and baseline, scaled to Cal Sans's cap at the word size. Copied from
     js/highlights.js card 1 (matterWord + layout), not re-derived. */
  var mj = document.getElementById('matter-words'), MATTER = null; try { MATTER = mj ? JSON.parse(mj.textContent) : null; } catch (e) { MATTER = null; }
  var FACES_DEFAULT = [0, 1, 2, 0, 1, 2, 0];
  var mj3 = document.getElementById('matter-words-regular'), MATTER_REG = null; try { MATTER_REG = mj3 ? JSON.parse(mj3.textContent) : null; } catch (e) { MATTER_REG = null; }
  /* a card's weight pairing, over its cast: 'set' leaves it; '400' sets the Matter line in Matter Regular and its
     Cal Sans at opsz 10 / GEOM 25 / 400; '600' Matter SemiBold and Cal Sans opsz 16 / GEOM 25 / 600. Only line 2
     takes it: line 1 (Inter's) keeps the cast's own Cal Sans, and the final line is always FINAL (45 / 50 / 700). */
  var PAIRS = { '400': { reg: true, vs: "'opsz' 10, 'GEOM' 25, 'wght' 400" }, '600': { reg: false, vs: "'opsz' 16, 'GEOM' 25, 'wght' 600" } };
  function weighed(c, mode) {
    if (!mode || mode === 'set' || !PAIRS[mode]) return c;
    var P = PAIRS[mode], o = Object.assign({}, c), l1 = (c.lineVS || [CALVS])[0];
    o.matter = P.reg ? (MATTER_REG || c.matter || MATTER) : MATTER;   /* #matter-words is the SemiBold */
    o.lineVS = [l1, P.vs, FINAL];   /* the pairing is the Matter line's; the final line never changes */
    return o;
  }
  /* a cast: which face each word is set in before it becomes Cal Sans, and how.
       faces       per word: 0 Matter (outlines), 1 Inter, 2 Cal Sans
       words       the sentence as words; a word that starts with punctuation hangs on the one before (no gap)
       breakBefore word indices that start a new line
       matter      the outline set (MATTER bold by default, MATTER_REG the Regular)
       interVS / interW   Inter's settings and weight attribute
       lineVS      the Cal Sans each line becomes, by line; the last entry repeats
       late        a word that is not there at first and materializes in Cal Sans at the end; the hanging
                   punctuation after it starts against the word before and glides out to make room */
  function castOf(c) {
    if (Array.isArray(c) || !c) c = { faces: c };
    return {
      faces: c.faces || FACES_DEFAULT, words: c.words || SENTENCE.split(' '), breakBefore: c.breakBefore || [],
      matter: c.matter || MATTER, interVS: c.interVS || "'opsz' 32, 'wght' 700", interW: c.interW || 700,
      lineVS: c.lineVS || [CALVS], late: c.late == null ? -1 : c.late
    };
  }
  function matterIn(set, parent, text, size) {
    var m = set && set.words.filter(function (w) { return w.w === text; })[0];
    if (!m) return null;
    var k = size * 0.72 / set.cap;
    var g = el('g', {}, parent); el('path', { d: m.d }, g);
    g._place = function (x, y) { g.setAttribute('transform', 'translate(' + (x - m.x0 * k).toFixed(2) + ' ' + (y - set.base * k).toFixed(2) + ') scale(' + k.toFixed(4) + ')'); };
    g._w = (m.x1 - m.x0) * k;
    return g;
  }
  function makeSentence(svg, perWord, calExact, castIn, breakBefore) {
    var C = castOf(castIn); if (breakBefore) C.breakBefore = breakBefore;
    var faces = C.faces, words = C.words, units = [], cold = [];
    var meas = el('text', { opacity: 0, 'aria-hidden': 'true' }, svg);
    function wt(fam) { return fam === FAM[2] ? 600 : fam === FAM[1] ? C.interW : 700; }
    function measure(text, fam, size, vs) {
      meas.setAttribute('font-family', fam); meas.setAttribute('font-size', size); meas.setAttribute('font-weight', wt(fam));
      meas.style.fontVariationSettings = vs || ''; meas.textContent = text;
      var w = 0; try { w = meas.getComputedTextLength(); } catch (e) {}
      return w > 0 ? w : text.length * size * 0.55;
    }
    function setWord(parent, text, fam, size, vs) { var t = word(parent, text, fam, size, vs); t.setAttribute('font-weight', wt(fam)); return t; }
    function hangs(w) { return /^[.,;:!?]/.test(w); }
    for (var i = 0; i < (perWord ? words.length : 1); i++) units.push(unit());
    var ext = { x0: 0, x1: W, y0: 0, y1: 760 }, info = { late: C.late, slide: null, finalFrom: words.length, lineOf: [], xc: [] };
    function layout() {
      units.forEach(function (u) { u.shape.textContent = ''; u.coldG.textContent = ''; u.plainG.textContent = ''; u.coldG.removeAttribute('transform'); u.x0 = 1e9; u.x1 = -1e9; u.y0 = 1e9; u.y1 = -1e9; });
      cold = []; info.slide = null;
      var size = 200, lh = 215, maxW = W, x = 0, y = 230, ln = 0, lines = [], bx = [], bvs = [], bw = [];
      var off = [[1.03, 0], [0.97, 0], [1, 0], [0.98, 0], [1.03, 0], [0.97, 0], [1.02, 0]];
      var gap = size * 0.24;
      words.forEach(function (w, i) {
        var u = units[perWord ? i : 0];
        if (C.breakBefore.indexOf(i) >= 0 && x > 0) { x = 0; y += lh; ln++; }
        var vs = C.lineVS[Math.min(ln, C.lineVS.length - 1)], wb = measure(w, FAM[2], size, vs);
        if (hangs(w) && x > 0) x -= gap;
        else if (x + wb > maxW && x > 0) { x = 0; y += lh; ln++; vs = C.lineVS[Math.min(ln, C.lineVS.length - 1)]; wb = measure(w, FAM[2], size, vs); }
        var tb = setWord(u.shape, w, FAM[2], size, vs); tb.setAttribute('x', x); tb.setAttribute('y', y);
        var tp = setWord(u.plainG, w, FAM[2], size, vs); tp.setAttribute('x', x); tp.setAttribute('y', y);
        lines.push(y); bx.push(x); bvs.push(vs); bw.push(wb);
        u.x0 = Math.min(u.x0, x); u.x1 = Math.max(u.x1, x + wb); u.y0 = Math.min(u.y0, y - size * 0.78); u.y1 = Math.max(u.y1, y + size * 0.22);
        x += wb + gap;
      });
      var ax = 0, ay = -1, lastGap = 0;
      words.forEach(function (w, i) {
        var u = units[perWord ? i : 0], f = FAM[faces[i]], o = off[i % off.length], s = size * o[0], isCal = f === FAM[2];
        if (lines[i] !== ay) { ax = 0; ay = lines[i]; lastGap = 0; }
        var ta = null, wa;
        if (i === C.late) {   /* not in the mixed set: its mixed self is its final self, and the flow skips it */
          ta = setWord(u.coldG, w, FAM[2], size, bvs[i]); ta.setAttribute('x', bx[i]); ta.setAttribute('y', ay);
          cold.push(ta); u.x0 = Math.min(u.x0, bx[i]); u.x1 = Math.max(u.x1, bx[i] + bw[i]);
          return;
        }
        if (hangs(w)) ax -= lastGap;
        var afterLate = hangs(w) && i - 1 === C.late;
        if (calExact && isCal && !afterLate) { ax = bx[i]; s = size; }
        if (afterLate) s = size;
        if (f === FAM[0]) { ta = matterIn(C.matter, u.coldG, w, s); if (ta) { ta._place(ax, ay + o[1]); wa = ta._w; } }
        if (!ta) {
          var vs = isCal ? bvs[i] : C.interVS;
          ta = setWord(u.coldG, w, f, s, vs); ta.setAttribute('x', ax); ta.setAttribute('y', ay + (isCal ? 0 : o[1])); wa = measure(w, f, s, vs);
        }
        if (afterLate) info.slide = { i: i, dx: bx[i] - ax };
        cold.push(ta);
        u.x0 = Math.min(u.x0, ax, bx[i]); u.x1 = Math.max(u.x1, ax + wa, bx[i] + bw[i]);
        lastGap = (calExact && isCal) ? size * 0.24 : s * 0.26;
        ax += wa + lastGap;
      });
      info.finalFrom = lines.indexOf(lines[lines.length - 1]);   /* the first word of the final line */
      var ys = lines.filter(function (y, k) { return lines.indexOf(y) === k; });
      info.lineOf = lines.map(function (y) { return ys.indexOf(y); });
      info.xc = bx.map(function (x, k) { return (x + bw[k] / 2) / W; });   /* each word's centre, 0..1 across the line */
      ext = { x0: 0, x1: W, y0: 230 - 160, y1: y + 50 };
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + (y + 80));
    }
    layout();
    return {
      units: units, layout: layout, extent: function () { return ext; }, info: info,
      pre: function (t) { var T0 = 1.0, n = cold.length; cold.forEach(function (ta, i) { ta.setAttribute('opacity', (t >= 1e8 ? 1 : lin(t, i * (T0 / n), i * (T0 / n) + 0.25)).toFixed(3)); }); }
    };
  }
  /* kept for the older builders that call it by name */
  function matterWord(parent, text, size) { return matterIn(MATTER, parent, text, size); }

  var PATHS = []; try { PATHS = JSON.parse(document.getElementById('calcom-paths').textContent); } catch (e) { PATHS = []; }
  if (!PATHS.length) { /* fallback: a plain word, so the logo variants still play */ PATHS = null; }
  var RINGS = [[195, 204, 163], [488, 254, 114], [1038, 254, 114], [1314, 254, 113]], ARCHES = [[1663, 202, 64], [1848, 202, 64]];
  var RING_OF = { 0: [0], 1: [1], 4: [2], 5: [3] };
  function ringNodes(parent, attrs) {
    var out = [];
    RINGS.forEach(function (r) { var c = el('circle', Object.assign({ cx: r[0], cy: r[1], r: r[2] }, attrs), parent); out.push({ el: c, len: 2 * Math.PI * r[2] }); });
    /* the m's two arches as full rings, as the live card has always drawn them */
    ARCHES.forEach(function (r) { var c = el('circle', Object.assign({ cx: r[0], cy: r[1], r: r[2] }, attrs), parent); out.push({ el: c, len: 2 * Math.PI * r[2] }); });
    return out;
  }
  function makeLogo(svg, perGlyph) {
    var units = [], strokes = [];
    var stroke = { fill: 'none', stroke: 'currentColor', 'stroke-width': 3, 'vector-effect': 'non-scaling-stroke' };
    if (PATHS) {
      var n = perGlyph ? PATHS.length : 1;
      for (var i = 0; i < n; i++) units.push(unit());
      PATHS.forEach(function (d, i) {
        var u = units[perGlyph ? i : 0];
        el('path', { d: d }, u.shape); el('path', { d: d }, u.plainG);
        var tmp = el('path', { d: d, fill: 'none' }, svg), bb = { x: 0, y: 0, width: 0, height: 0 };
        try { bb = tmp.getBBox(); } catch (e) {} tmp.remove();
        if (perGlyph) { u.x0 = bb.x; u.x1 = bb.x + bb.width; u.y0 = bb.y; u.y1 = bb.y + bb.height; } else { u.x0 = 0; u.x1 = W; u.y0 = 0; u.y1 = 400; }
      });
      /* the rings, into the unit of the letter they ring (all into the one unit otherwise) */
      var all = ringNodes(el('g', {}), stroke);   /* detached: re-parented below */
      all.forEach(function (s, k) {
        var gi = k >= 4 ? 6 : [0, 1, 4, 5][k];
        units[perGlyph ? gi : 0].coldG.appendChild(s.el); strokes.push(s);
      });
    } else {
      var u = unit(); units.push(u);
      var tb = word(u.shape, 'Cal.com', FAM[2], 420, CALVS); tb.setAttribute('y', 380);
      var tp = word(u.plainG, 'Cal.com', FAM[2], 420, CALVS); tp.setAttribute('y', 380);
      u.x0 = 0; u.x1 = W; u.y0 = 0; u.y1 = 400;
    }
    strokes.forEach(function (s) { s.el.setAttribute('stroke-dasharray', s.len); s.el.setAttribute('stroke-dashoffset', s.len); });
    svg.setAttribute('viewBox', '-20 -20 ' + (W + 40) + ' 450');
    return {
      units: units, layout: function () {}, extent: function () { return { x0: 0, x1: W, y0: 0, y1: 400 }; }, strokes: strokes,
      /* the rings draw on, 0.12 s apart, each over 1 s */
      pre: function (t) { strokes.forEach(function (s, i) { var d = t >= 1e8 ? 1 : ease(lin(t, i * 0.12, i * 0.12 + 1.0)); s.el.setAttribute('stroke-dashoffset', (s.len * (1 - d)).toFixed(1)); }); }
    };
  }

  function stageSvg(stage, kind) {
    return el('svg', { viewBox: kind === 'logo' ? '-20 -20 ' + (W + 40) + ' 450' : '0 0 ' + W + ' 760', 'aria-hidden': 'true', focusable: 'false' }, stage);
  }
  function boxOf(kind) { return kind === 'logo' ? { x: -200, y: -300, w: W + 400, h: 1100 } : { x: -200, y: -300, w: W + 400, h: 1400 }; }
  function T1of(kind) { return kind === 'logo' ? 2.0 : 2.2; }
  function make(svg, kind, per, cast) { return kind === 'logo' ? makeLogo(svg, per) : makeSentence(svg, per, false, cast); }

  /* ── variant builders: each returns { run(t) -> over, mid() -> t, relayout() } ───────── */

  /* one engine, one pass; `eng` are the engine's knobs, `freeze` a number or a function of the extent */
  function fit(ctl, u, fx, eng) {
    var m = 4 * (fx.blur || 120) + 120 + (eng && eng.displace ? 120 : 0);   /* four sigmas plus the halo: the fog never meets the region edge */
    ctl.region({ x: u.x0 - m, y: u.y0 - m, w: (u.x1 - u.x0) + 2 * m, h: (u.y1 - u.y0) + 2 * m });
  }
  function bigBox(kind) { return kind === 'logo' ? { x: -600, y: -700, w: W + 1200, h: 1900 } : { x: -600, y: -700, w: W + 1200, h: 2200 }; }
  function materialize(kind, eng, fx) {
    fx = fx || {};
    return function (stage, card) {
      var svg = stageSvg(stage, kind), ctl = thermal(svg, uid(), bigBox(kind), eng), content = make(svg, kind, false), u = content.units[0];
      var hot = ctl.hot(u.shape), outer = hot.parentNode;
      var cold = ctl.free(u.coldG);
      ctl.plain(u.plainG);
      if (content.strokes) content.strokes.forEach(function (s) { s.el.style.stroke = 'var(--signal)'; });   /* the real card's rings, in the signal */
      var extra = el('g', {}, svg);
      content.layout(); fit(ctl, u, fx, eng);
      var logo = kind === 'logo';
      /* the logo, in order, nothing at once: the rings draw on first (t = 0 to ~1.6, a dash, not a fade) and hold;
         then the logo materializes in like a word (fog from RINGS_END, crisp 1.1 s later) while the rings draw
         back off; then plain. No opacity ramp anywhere.
         The sentence keeps the older H–M story: the old face fades into the fog from T1, the fog condenses over 2.5 s. */
      var RINGS_END = 2.0;
      var T1 = logo ? RINGS_END : T1of(kind), DUR = logo ? 1.1 : (fx.dur || 2.5), ink = inkOf(card);
      ctl.lead(1e6);   /* the pad everywhere, the seam off the stage: the hot layer is uniformly lit */
      var ctx = { ctl: ctl, hot: hot, outer: outer, cold: cold, extra: extra, content: content, unit: u, kind: kind, T1: T1, DUR: DUR };
      if (fx.setup) fx.setup(ctx);
      function rings(t) {
        (content.strokes || []).forEach(function (s, i) {
          var din = t >= 1e8 ? 1 : ease(lin(t, i * 0.12, i * 0.12 + 1.0)), dout = t >= 1e8 ? 1 : ease(lin(t, T1 + i * 0.06, T1 + 0.6 + i * 0.06));   /* the rings leave as the fog gathers, before the logo condenses */
          s.el.setAttribute('stroke-dashoffset', (s.len * (1 - din) - s.len * dout).toFixed(1));
        });
      }
      return {
        run: function (t) {
          var p = lin(t, T1, T1 + DUR), e = (fx.ease || ease)(p), T3 = T1 + DUR;
          if (logo) rings(t); else {
            content.pre(t);
            cold.setAttribute('opacity', (t >= 1e8 ? 0 : 1 - lin(t, T1, T1 + 1.0)).toFixed(3));   /* the old face into the fog over the first second */
          }
          ctl.cond(e, ink, fx.blur != null ? fx.blur : 120, fx.grain != null ? fx.grain : 0.65, fx.gain); ctl.reach(fx.spread);
          if (fx.frame) { if (fx.frame.length <= 2) fx.frame(ctl, e); else fx.frame(ctx, t, p, e); }   /* round 3's (ctl, e) or H–M's (ctx, t, p, e) */
          ctl.finish(t > T3);
          if (logo) hot.style.display = t < T1 ? 'none' : '';   /* nothing of the logo, not even its fog, until the rings are done */
          return t > T3 + 0.3;
        },
        mid: function () { return T1 + DUR * (fx.midAt || 0.5); },
        relayout: function () { content.layout(); fit(ctl, u, fx, eng); if (fx.setup) fx.setup(ctx); ink = inkOf(card); },
        svg: svg, plainG: u.plainG   /* for a caller that carries on after the logo lands */
      };
    };
  }
  function wordwise(eng, fx, cast, breakBefore) {
    fx = fx || {};
    var C = castOf(cast); if (breakBefore) C.breakBefore = breakBefore;
    var faces = C.faces;
    return function (stage, card) {
      var kind = 'sentence', svg = stageSvg(stage, kind), content = makeSentence(svg, true, true, C), ink = inkOf(card);
      var ws = content.units.map(function (u, i) {
        var ctl = thermal(svg, uid(), bigBox(kind), eng);
        var holder = el('g', {}), hot = ctl.hot(holder); holder.appendChild(u.shape);
        var mixedPlain = ctl.free(u.coldG);
        ctl.plain(u.plainG);
        ctl.lead(1e6);
        return { u: u, ctl: ctl, hot: hot, outer: hot.parentNode, holder: holder, mixedPlain: mixedPlain, mixedShape: null, isCal: faces[i] === 2, late: i === C.late };
      });
      content.layout();
      function fitAll() { ws.forEach(function (w) { fit(w.ctl, w.u, fx, eng); }); }
      fitAll();
      /* the mixed word as a mask shape too, so it can be fogged: a white clone of the plain mixed word */
      function setup() {
        ws.forEach(function (w) {
          if (w.mixedShape) w.mixedShape.remove();
          var m = w.u.coldG.cloneNode(true); m.setAttribute('fill', '#fff'); m.removeAttribute('opacity');
          w.holder.appendChild(m); w.mixedShape = m;
        });
      }
      setup();
      /* THE TIMELINE (2026-10-04, round 5): a cascade, one motion per word.
           arrive   a diagonal wave: 0.3 s per line down plus 0.6 s across a line, so the lines overlap and flow
           hold     0.8 s on the mixed sentence, every word crisp
           swap     the same wave over the words that swap; each word is ONE motion: fog rises (40%), the faces cross
                    inside the thick fog (the middle 40%), fog settles into Cal Sans (60%)
           family   after the last swap: the period slides out first (0.35 s), then "family" condenses into the gap
         random order shuffles the words of the lines before the last into one group; the final line follows */
      var WS = 0.06, IN_DUR = 1.1, HAND = 0.6, HOLD = 0.8, SWAP = 2.0, LATE_DUR = 1.3, GLIDE = 0.35, PEAK = 0.4, CASC_LINE = 0.3, CASC_X = 0.6;
      function B0() { return fx.blur != null ? fx.blur : 120; }   /* read live: the card's sliders change them */
      function G0() { return fx.grain != null ? fx.grain : 0.65; }
      var sine = function (p) { p = Math.max(0, Math.min(1, p)); return 0.5 - 0.5 * Math.cos(Math.PI * p); };
      var smooth = function (a, b, x) { var u = Math.max(0, Math.min(1, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
      /* the swap's fog: up to the peak in PEAK of the time, down over the rest; e = 1 - fog */
      function bell(u) { return u < PEAK ? Math.sin(Math.PI / 2 * u / PEAK) : Math.cos(Math.PI / 2 * (u - PEAK) / (1 - PEAK)); }
      function rng(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
      var plan = null, planKey = null;
      function schedule() {
        var key = (fx.random ? 'r' + fx.seed : 's') + '|' + content.info.lineOf.join(',');
        if (plan && planKey === key) return plan;
        var lineOf = content.info.lineOf, ff = content.info.finalFrom, r = rng(fx.seed || 1), P = { inAt: {}, outAt: {} };
        function shuffle(list) { for (var a = list.length - 1; a > 0; a--) { var b = Math.floor(r() * (a + 1)), t = list[a]; list[a] = list[b]; list[b] = t; } return list; }
        /* groups of word indices, in order: by line, or (random) the lines before the last as one shuffled group */
        function groups(list) {
          if (fx.random) {
            var head = shuffle(list.filter(function (i) { return i < ff; })), tail = list.filter(function (i) { return i >= ff; });
            return [head, tail].filter(function (g) { return g.length; });
          }
          var by = {}; list.forEach(function (i) { (by[lineOf[i]] = by[lineOf[i]] || []).push(i); });
          return Object.keys(by).sort(function (x, y) { return x - y; }).map(function (k) { return by[k]; });
        }
        /* the cascade: one diagonal wave over the sentence -- a word starts CASC_LINE per line down plus CASC_X across
           its line, so the next line is already moving while this one finishes; nothing waits for a block */
        function cascade(list, t0, dur, into) {
          var end = t0, lineOf = content.info.lineOf, xc = content.info.xc;
          var lines = list.map(function (i) { return lineOf[i]; }), l0 = Math.min.apply(null, lines.concat([0]));
          list.forEach(function (i) { into[i] = t0 + CASC_LINE * (lineOf[i] - l0) + CASC_X * (xc[i] || 0); end = Math.max(end, into[i] + dur); });
          return end;
        }
        /* lay groups out: words WS apart (a looser, uneven 0.12 s when shuffled), each group starting once the one
           before is HAND of the way through */
        function lay(gs, t0, dur, into) {
          var start = t0, end = t0;
          gs.forEach(function (g) {
            var step = fx.random && g[0] < ff ? 0.12 : WS, at = start;
            g.forEach(function (i, n) { var j = fx.random && i < ff ? (r() - 0.5) * 0.08 : 0; into[i] = Math.max(0.05, at + n * step + j); end = Math.max(end, into[i] + dur); });
            var gdur = (g.length - 1) * step + dur; start = start + HAND * gdur;
          });
          return end;
        }
        var all = ws.map(function (w, i) { return i; });
        var ins = all.filter(function (i) { return !ws[i].late; });
        var arrived = fx.random ? lay(groups(ins), 0.2, IN_DUR, P.inAt) : cascade(ins, 0.2, IN_DUR, P.inAt);
        /* hanging punctuation arrives with its word: "one" and "." come up together, as one */
        C.words.forEach(function (w, i) {
          if (!/^[.,;:!?]/.test(w) || ws[i].late) return;
          var j = i - 1; while (j >= 0 && ws[j].late) j--;
          if (j >= 0 && P.inAt[j] != null) P.inAt[i] = P.inAt[j];
        });
        P.T1 = arrived + HOLD;
        var swaps = all.filter(function (i) { return !ws[i].isCal && !ws[i].late; });
        P.swapEnd = !swaps.length ? P.T1 : fx.random ? lay(groups(swaps), P.T1, SWAP, P.outAt) : cascade(swaps, P.T1, SWAP, P.outAt);
        P.glideAt = P.swapEnd + 0.15; P.glideEnd = P.glideAt + GLIDE;
        P.lateAt = P.glideEnd - 0.05;
        all.forEach(function (i) { if (ws[i].late) P.inAt[i] = P.lateAt; });
        plan = P; planKey = key; return P;
      }
      function show(node, on) { node.style.display = on ? '' : 'none'; }
      function times(i) {
        var P = schedule(), w = ws[i], inAt = P.inAt[i], dur = w.late ? LATE_DUR : IN_DUR, outAt = P.outAt[i] != null ? P.outAt[i] : 1e9;
        return { inAt: inAt, inEnd: inAt + dur, outAt: outAt, outEnd: outAt + SWAP };
      }
      return {
        run: function (t) {
          var over = true, sl = content.info.slide, P = schedule();
          if (sl) {   /* the hanging period slides out first, then the late word fills the gap */
            var sp = t >= 1e8 ? 1 : easeOut3(lin(t, P.glideAt, P.glideEnd));
            content.units[sl.i].coldG.setAttribute('transform', 'translate(' + (sl.dx * sp).toFixed(2) + ' 0)');
          }
          ws.forEach(function (w, i) {
            var T = times(i), phase, e = 1, mixedOp = 1;
            if (t >= 1e8) phase = w.isCal ? 'mixed' : 'cal';
            else if (t < T.inAt) phase = 'before';
            else if (t < T.inEnd) { phase = 'hot'; e = sine(lin(t, T.inAt, T.inEnd)); }
            else if (w.isCal || t < T.outAt) phase = 'mixed';
            else if (t < T.outEnd) {
              var u = lin(t, T.outAt, T.outEnd);
              phase = 'hot'; e = 1 - bell(u);
              mixedOp = 1 - smooth(0.24, 0.65, u);   /* the faces cross while the fog is thickest */
            } else phase = 'cal';
            w.ctl.finish(phase === 'cal'); show(w.outer, phase === 'hot'); show(w.mixedPlain, phase === 'mixed');
            if (phase === 'hot') {
              w.ctl.cond(e, ink, B0(), G0(), fx.gain); w.ctl.reach(fx.spread);
              w.mixedShape.setAttribute('opacity', mixedOp.toFixed(3)); w.u.shape.setAttribute('opacity', (1 - mixedOp).toFixed(3));
              if (fx.frame) fx.frame(w.ctl, e);
            }
            if (t < (w.isCal ? T.inEnd : T.outEnd) + 0.3) over = false;
          });
          return over;
        },
        plan: function () { return schedule(); },   /* for checking the timeline from the console */
        /* the still: the first swapping word just past its fog peak */
        mid: function () { var P = schedule(), first = Object.keys(P.outAt).map(Number).sort(function (x, y) { return P.outAt[x] - P.outAt[y]; })[0]; return first != null ? P.outAt[first] + SWAP * 0.5 : 2; },
        relayout: function () { content.layout(); fitAll(); setup(); ink = inkOf(card); }
      };
    };
  }
  var easeOut3 = function (p) { p = Math.max(0, Math.min(1, p)); return 1 - Math.pow(1 - p, 3); };

  /* ── the API the case study uses ──────────────────────────────────────────────────────────────────────────── */
  var FINAL = "'opsz' 45, 'GEOM' 50, 'wght' 700";
  return {
    FINAL: FINAL,
    /* the sentence: a cast (faces per word, words, line breaks, Matter outlines, Inter settings, the Cal Sans
       each line becomes, a late word) and fx (blur, grain, spread); returns { run(t), mid(), relayout(), plan() } */
    sentence: function (stage, card, cast, fx, eng) { return wordwise(Object.assign({ mono: true }, eng || {}), fx || {}, cast)(stage, card); },
    /* the logo: the rings draw first, then Cal.com materializes; returns { run(t), mid(), relayout() } */
    logo: function (stage, card, fx, eng) { return materialize('logo', Object.assign({ mono: true }, eng || {}), fx || {})(stage, card); },
    MATTER: function () { return MATTER; }
  };
})();
