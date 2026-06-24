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

  var CYCLE_MS = 2600;   // hold per arrangement
  var li = 0;            // running letter counter → alternating weave depth

  function build(arr) {
    host.innerHTML = '';
    host.dataset.cols = arr.cols;
    host.style.setProperty('--step', '' + arr.step);   // unitless line count
    li = 0;

    arr.blocks.forEach(function (block, bi) {
      var b = document.createElement('div');
      b.className = 'fj-block';
      b.style.setProperty('--bi', bi);     // column index → stagger depth

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
  }

  // Debug: ?arr=N freezes a single arrangement (no cycling) for screenshots.
  var forced = new URLSearchParams(location.search).get('arr');
  if (forced !== null) { build(ARR[+forced] || ARR[0]); return; }

  var idx = 0;
  build(ARR[0]);

  var timer = null;
  function tick() { idx = (idx + 1) % ARR.length; build(ARR[idx]); }
  function start() { if (!timer) timer = setInterval(tick, CYCLE_MS); }
  function stop()  { clearInterval(timer); timer = null; }

  start();
  // Pause the recomposition when the tab is hidden (matches flapjack.js)
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop(); else start();
  });
}());
