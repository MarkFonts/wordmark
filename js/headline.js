/* ── Recomposing hero headline ───────────────────────────────────────────
   Fills #fj-headline with "Your words should feel like your brand." and
   cycles it through typesetting arrangements (1 line → 2/3/4 staggered
   blocks). Each WORD is one kerned span carrying a --lz z-depth so the
   flapjack wave canvases (--wzi) weave between words (per-word keeps the
   glyph run intact, so kerning still applies — per-letter spans would kill it).
   Layout owns sizing/stagger via [data-cols] + --step; see css/main.css. */
(function () {
  'use strict';

  var host = document.getElementById('fj-headline');
  if (!host) return;

  var WORDS = ['Your', 'words', 'should', 'feel', 'like', 'your', 'brand.'];

  // Each arrangement: blocks → lines → word indices.
  //   cols = grid columns ; step = per-column downward stagger, in LINES
  //   (CSS multiplies by --lh so blocks always land on the baseline grid)
  var ARR = [
    { cols: 1, step: 0, blocks: [ [[0, 1, 2, 3, 4, 5, 6]] ] },
    { cols: 2, step: 1, blocks: [ [[0, 1], [2, 3]], [[4, 5], [6]] ] },
    { cols: 3, step: 1, blocks: [ [[0], [1]], [[2], [3, 4]], [[5], [6]] ] },
    { cols: 4, step: 1, blocks: [ [[0, 1]], [[2, 3]], [[4, 5]], [[6]] ] }
  ];

  // Phones (<= 680px, the site's breakpoint). The 1-line and 4-column sets are wider than
  // a phone and clip, so they are desktop-only; these all fit a 320px screen. `fit` keys
  // the font-size in css/main.css, since [data-cols] sizes are tuned for wide screens.
  var ARR_M = [
    { cols: 1, step: 0, fit: 'c', blocks: [ [[0, 1], [2, 3], [4, 5], [6]] ] },
    { cols: 2, step: 1, fit: 'b', blocks: [ [[0], [1], [2]], [[3], [4], [5], [6]] ] },
    // `gap`: a pause before the block, in lines -- air where the comma would go.
    { cols: 1, step: 0, fit: 't', gap: 1,
      blocks: [ [[0, 1], [2]], [[3]], [[4, 5], [6]] ] },            // feel, alone
    // `wide`: span the screen; `at`: where each block sits (s left, e right, c centred, _ stretched).
    { cols: 1, step: 0, fit: 'o', wide: 1, at: 'sce',
      blocks: [ [[0, 1]], [[2, 3, 4]], [[5, 6]] ] },                // three rows, left / centre / right
    // `pause`: the air the stack wants, in px (see pause()). These two share it, so both are
    // the same height and "Your" and "brand." hold the same two corners from one to the next.
    // `va`: a block's vertical seat in its row (e = bottom, so "brand." shares a baseline
    // with "your", not "like").
    { cols: 2, step: 0, fit: 'c', wide: 1, pause: 200, at: 'sese', va: 'ssse',
      blocks: [ [[0], [1]], [[2], [3]], [[4], [5]], [[6]] ] },      // four corners, each pair stacked
    // `tall`: the pause is shared out between the rows. `spread`: a row's words pushed to the edges.
    { cols: 1, step: 0, fit: 'c', wide: 1, tall: 1, pause: 200, spread: 1, at: '___e',
      blocks: [ [[0, 1]], [[2, 3]], [[4, 5]], [[6]] ] }             // Your ... words, each row edge to edge
  ];
  var MQ = window.matchMedia('(max-width: 680px)');
  function set() { return MQ.matches ? ARR_M : ARR; }

  var CYCLE_MS = 2600;   // hold per arrangement
  var li = 0;            // running letter counter → alternating weave depth

  function build(arr) {
    host.innerHTML = '';
    host.style.fontSize = '';            // pause() may have shrunk the last one
    host.dataset.cols = arr.cols;
    if (arr.fit) host.dataset.fit = arr.fit; else delete host.dataset.fit;
    ['wide', 'tall', 'spread'].forEach(function (k) {
      if (arr[k]) host.dataset[k] = ''; else delete host.dataset[k];
    });
    host.style.setProperty('--step', '' + arr.step);   // unitless line count
    li = 0;

    arr.blocks.forEach(function (block, bi) {
      var b = document.createElement('div');
      b.className = 'fj-block';
      b.style.setProperty('--bi', bi);     // column index → stagger depth
      if (arr.at) b.style.justifySelf = { s: 'start', e: 'end', c: 'center' }[arr.at[bi]] || '';
      if (arr.va) b.style.alignSelf = { s: 'start', e: 'end' }[arr.va[bi]] || '';
      if (arr.gap && bi) b.style.marginTop = (arr.gap * 0.98) + 'em';   // pause, in lines (--lh)

      block.forEach(function (line) {
        var l = document.createElement('div');
        l.className = 'fj-line';
        line.forEach(function (wi) {
          var u = document.createElement('span');
          u.className = 'fj-word-unit';
          u.textContent = WORDS[wi];          // one kerned run per word
          // alternate in front of (9) / behind (2) the 5 wave layers
          u.style.setProperty('--lz', (li++ % 2) ? 9 : 2);
          l.appendChild(u);
        });
        b.appendChild(l);
      });
      host.appendChild(b);
    });
    host.style.height = host.style.rowGap = '';
    if (arr.pause) {
      var p = pause(arr.pause);
      if (arr.tall) host.style.height = p.height + 'px'; else host.style.rowGap = p.gap + 'px';
    }
    if (MQ.matches) centre();
  }

  /* Every phone arrangement shares one vertical centre: the midpoint between the
     nameplate's bottom and the pill's top. Each stack is measured after it is built and
     slid, whole, onto that line -- so the tall ones keep their spread and just move. */
  function centre() {
    var nm = document.getElementById('site-wordmark');
    var pill = document.querySelector('.hero-text');
    if (!nm || !pill) return;
    host.style.top = '';
    var lines = host.querySelectorAll('.fj-line');
    if (!lines.length) return;
    var top = Infinity, bot = -Infinity;
    for (var i = 0; i < lines.length; i++) {
      var r = lines[i].getBoundingClientRect();
      if (r.top < top) top = r.top;
      if (r.bottom > bot) bot = r.bottom;
    }
    var zoneTop = 60 + nm.offsetHeight - window.scrollY;             // pinned at top:60 (index.html)
    var zoneBot = pill.getBoundingClientRect().top;
    host.style.top = ((zoneTop + zoneBot) / 2 - (top + bot) / 2) + 'px';
  }

  /* The air in a stack: between the two rows of four corners, or shared out between the
     four rows of edge-to-edge. It wants `want` px and gives first: down to half the height
     of the lines themselves (one pair), below which it stops reading as a pause and starts
     reading as loose leading. Only then does the type shrink, keeping that proportion.
     AIR is kept clear under the nameplate and above the pill. Returns the gap and the
     stack's whole height, so two arrangements given the same `want` are the same height. */
  var AIR = 24;
  function pause(want) {
    var nm = document.getElementById('site-wordmark');
    var pill = document.querySelector('.hero-text');
    host.style.rowGap = '0px';
    var lines = host.querySelectorAll('.fj-line'), top = Infinity, bot = -Infinity;
    for (var i = 0; i < lines.length; i++) {
      var r = lines[i].getBoundingClientRect();
      if (r.top < top) top = r.top;
      if (r.bottom > bot) bot = r.bottom;
    }
    var rows = bot - top, floor = rows / 2;
    if (!nm || !pill) return { gap: want, height: rows + want };
    var room = pill.getBoundingClientRect().top - (60 + nm.offsetHeight - window.scrollY) - 2 * AIR;
    if (room - rows >= floor) {
      var gap = Math.min(want, room - rows);
      return { gap: gap, height: rows + gap };
    }
    var k = room / (rows + floor);
    host.style.fontSize = (parseFloat(getComputedStyle(host).fontSize) * k) + 'px';
    return { gap: floor * k, height: room };
  }

  /* centre() and pause() measure the face and the hero, and both arrive
     late: the font loads, and flapjack.js sets the hero's height (--fj-ch) after this
     script has already built once. So rebuild when the fonts land, when the viewport
     changes, and whenever the hero's own box does -- that last one is what a timer or a
     single fonts.ready cannot promise. */
  function watch(rebuild) {
    document.fonts.ready.then(rebuild);
    window.addEventListener('resize', rebuild);
    var box = document.getElementById('flapjack-text');
    if (box && window.ResizeObserver) new ResizeObserver(rebuild).observe(box);
  }

  // Debug: ?arr=N freezes a single arrangement (no cycling) for screenshots;
  // ?arr=3,7,0 cycles just those, in that order.
  var forced = new URLSearchParams(location.search).get('arr');
  var pick = forced === null ? null : forced.split(',').map(Number).filter(function (n) { return set()[n]; });
  if (pick && pick.length === 1) {
    build(set()[pick[0]]);
    watch(function () { build(set()[pick[0]]); });
    return;
  }
  var list = function () { return pick && pick.length ? pick.map(function (n) { return set()[n]; }) : set(); };

  var idx = 0;
  build(list()[0]);
  watch(function () { build(list()[idx]); });
  // Crossing the breakpoint (rotating a phone, resizing): restart on the right list.
  var onMQ = function () { idx = 0; build(list()[0]); };
  if (MQ.addEventListener) MQ.addEventListener('change', onMQ); else MQ.addListener(onMQ);

  var timer = null;
  function tick() { idx = (idx + 1) % list().length; build(list()[idx]); }
  function start() { if (!timer) timer = setInterval(tick, CYCLE_MS); }
  function stop()  { clearInterval(timer); timer = null; }

  start();
  // Pause the recomposition when the tab is hidden (matches flapjack.js)
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop(); else start();
  });
}());
