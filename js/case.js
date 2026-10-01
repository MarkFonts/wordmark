/* Case-study pages: the hero word fit, the axis sliders, the closer-look tabs and the
   feature switches. No dependencies; every demo is live text in the page's own face. */
(function () {
  /* the highlight samples: Cal.com fitted to its card at 700, the heaviest it gets, and the
     Geometry sample pinned to that size, so side by side the two share a baseline */
  var grid = document.querySelector('.hl-grid');
  var word = document.querySelector('.cal-word');
  function fitWord() {
    if (!grid || !word) return;
    var save = { fs: word.style.fontSize, fv: word.style.fontVariationSettings, an: word.style.animation };
    word.style.fontSize = '100px';
    word.style.animation = 'none';
    word.style.fontVariationSettings = "'opsz' 45, 'GEOM' 50, 'wght' 700";
    var range = document.createRange(); range.selectNodeContents(word);
    var w = range.getBoundingClientRect().width;          /* the text run, not the block */
    var box = word.getBoundingClientRect().width;          /* the block spans the card's content width */
    word.style.fontSize = save.fs; word.style.animation = save.an; word.style.fontVariationSettings = save.fv;
    if (w > 0 && box > 0) grid.style.setProperty('--hl-size', Math.max(40, Math.floor(100 * box / w)) + 'px');
  }
  fitWord();
  window.addEventListener('resize', fitWord);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitWord);

  /* six sliders, one font-variation-settings string */
  document.querySelectorAll('[data-axes]').forEach(function (group) {
    var target = document.getElementById(group.dataset.axes);
    var inputs = group.querySelectorAll('input[data-axis]');
    function apply() {
      var parts = [];
      inputs.forEach(function (i) {
        parts.push("'" + i.dataset.axis + "' " + i.value);
        i.parentElement.querySelector('output').textContent = i.value;
      });
      target.style.fontVariationSettings = parts.join(', ');
    }
    inputs.forEach(function (i) { i.addEventListener('input', apply); });
    apply();
  });

  /* a single axis moved through its custom property (the booking card's GEOM) */
  document.querySelectorAll('input[data-var]').forEach(function (i) {
    var target = document.getElementById(i.dataset.target);
    function apply() {
      target.style.setProperty(i.dataset.var, i.value);
      i.parentElement.querySelector('output').textContent = i.value;
    }
    i.addEventListener('input', apply);
    apply();
  });

  /* closer look: tabs on desktop; on phones every feature is simply open */
  var items = document.querySelectorAll('.look-item');
  items.forEach(function (item) {
    var tab = item.querySelector('.look-tab');
    tab.addEventListener('click', function () {
      items.forEach(function (o) {
        var on = o === item;
        o.classList.toggle('is-active', on);
        o.querySelector('.look-tab').setAttribute('aria-expanded', on);
      });
    });
  });

  /* size waterfall: each row says as much as its width allows */
  var FALL = ['A billion meetings by 2030', 'Shall meet', 'Cal'];
  function fitFall() {
    document.querySelectorAll('.d-fall div:not(.mon)').forEach(function (row) {
      var span = row.querySelector('span');
      if (!row.clientWidth) return;
      for (var k = 0; k < FALL.length; k++) {
        span.textContent = FALL[k];
        if (span.getBoundingClientRect().right <= row.getBoundingClientRect().right + 0.5) break;
      }
    });
    /* the monster: as big as the leftover height allows, capped by the row's width */
    var mon = document.querySelector('.d-fall .mon');
    if (!mon || !mon.clientWidth) return;
    var fall = mon.parentElement, used = 0;
    mon.style.fontSize = '100px';
    fall.querySelectorAll('div:not(.mon)').forEach(function (r) { if (r.offsetHeight) used += r.offsetHeight + 6; });
    var span = mon.querySelector('span'), label = mon.querySelector('i');
    var byHeight = fall.clientHeight - used;
    var byWidth = 100 * (mon.clientWidth - span.offsetLeft + mon.offsetLeft) / span.offsetWidth;
    var size = Math.max(96, Math.floor(Math.min(byHeight, byWidth)));
    mon.style.fontSize = size + 'px';
    label.textContent = size;
  }
  fitFall();
  window.addEventListener('resize', fitFall);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitFall);

  /* default spacing: the headline sits at 0 for a while, tracks out to +55 and comes back in */
  var head = document.getElementById('d-headline'), track = document.getElementById('d-track');
  if (head) {
    var num = track.querySelector('b'), why = track.querySelector('span');
    var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    /* the figure's slot is as wide as its widest value, so the caption holds still */
    function slot() { num.textContent = '+55'; num.style.minWidth = Math.ceil(num.getBoundingClientRect().width) + 'px'; }
    slot();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(slot);
    window.addEventListener('resize', slot);
    /* one eased value drives both the tracking and the figure, so they can't drift apart */
    function run(from, to, done) {
      var t0 = performance.now(), dur = still ? 0 : 700;
      (function frame(now) {
        var p = dur ? Math.min(1, (now - t0) / dur) : 1, e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        var v = Math.round(from + (to - from) * e);
        head.style.letterSpacing = (v / 1000) + 'em';
        num.textContent = (v > 0 ? '+' : '') + v;
        if (p < 1) requestAnimationFrame(frame); else done();
      })(t0);
    }
    (function step(out) {
      why.textContent = out ? 'tracking. Where comparable fonts start.' : 'tracking. Out of the box.';
      run(out ? 0 : 55, out ? 55 : 0, function () {
        setTimeout(function () { step(!out); }, out ? 2200 : 3000);
      });
    })(true);
  }

  /* the type tester: every control writes one custom property on the card; the two
     segmented controls unlock into their slider; reset shows once anything has moved */
  var tester = document.getElementById('tester');
  if (tester) {
    var ttText = document.getElementById('tt-text'), ttReset = document.getElementById('tt-reset');
    var ttDefaultText = ttText.value, ttClamp = tester.querySelector('.tt-clamp');
    var PROP = { size: '--tt-size', wght: '--tt-wght', opsz: '--tt-opsz', track: '--tt-track', YTAS: '--tt-ytas', SHRP: '--tt-shrp', ital: '--tt-ital', GEOM: '--tt-geom' };
    var UNIT = { size: 'px', opsz: 'pt', track: '%', ital: '%', GEOM: '%' };
    var rows = tester.querySelectorAll('.tt-row');
    function ttOut(row, key, v) {
      var shown = key === 'ital' ? Math.round(v * 100) : Math.round(v * 2) / 2;
      row.querySelector('output').textContent = shown + (UNIT[key] || '');
    }
    function ttApply(row) {
      var key = row.dataset.key || row.querySelector('input').dataset.key, input = row.querySelector('input'), v = parseFloat(input.value);
      tester.style.setProperty(PROP[key], key === 'size' ? v + 'px' : key === 'track' ? (v / 100) + 'em' : v);
      ttOut(row, key, v);
      row.querySelectorAll('.tt-seg button').forEach(function (b) { b.setAttribute('aria-pressed', parseFloat(b.dataset.v) === v); });
      ttDirty();
    }
    function ttFit() {
      ttText.style.height = 'auto';
      ttText.style.height = Math.min(ttText.scrollHeight, ttClamp.clientHeight) + 'px';
    }
    function ttDirty() {
      var dirty = ttText.value !== ttDefaultText;
      rows.forEach(function (row) { var i = row.querySelector('input'); if (i.value !== i.defaultValue) dirty = true; });
      ttReset.hidden = !dirty;
      ttFit();
    }
    /* a phone starts smaller; the slider's default follows so reset returns there */
    var sizeInput = tester.querySelector('input[data-key="size"]');
    if (tester.clientWidth < 600) { sizeInput.value = 56; sizeInput.defaultValue = 56; }
    rows.forEach(function (row) {
      var input = row.querySelector('input');
      input.addEventListener('input', function () { ttApply(row); });
      row.querySelectorAll('.tt-seg button').forEach(function (b) {
        b.addEventListener('click', function () { input.value = b.dataset.v; ttApply(row); });
      });
      var unlock = row.querySelector('.tt-unlock');
      if (unlock) unlock.addEventListener('click', function () { row.classList.add('is-open'); input.tabIndex = 0; input.focus(); });
      ttApply(row);
    });
    ttText.addEventListener('input', ttDirty);
    ttReset.addEventListener('click', function () {
      ttReset.classList.add('is-spun');
      setTimeout(function () { ttReset.classList.remove('is-spun'); }, 500);
      ttText.value = ttDefaultText;
      rows.forEach(function (row) { var i = row.querySelector('input'); i.value = i.defaultValue; row.classList.remove('is-open'); i.tabIndex = -1; ttApply(row); });
    });
    window.addEventListener('resize', ttFit);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(ttFit);
  }

  /* the designspace materializes once it is in view; the nodes get staggered delays, and a click replays */
  var ds = document.getElementById('ds-block');
  if (ds && 'IntersectionObserver' in window) {
    var dsIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { ds.classList.add('is-in'); dsIO.disconnect(); } });
    }, { threshold: 0.5 });
    dsIO.observe(ds.querySelector('.ds-panel--now'));
    /* the cube turns on its own, and by hand: drag turns it, pinch or ctrl-wheel zooms. Each frame the
       three fixed axes tether to their nearest corner glyph and pull it along their own axis. */
    var stage = ds.querySelector('.cube-stage'), cube = ds.querySelector('.cube');
    if (stage && cube) {
      var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      var rot = { x: -16, y: -32, z: 1 }, vel = still ? 0 : 0.09, idle = 0, drag = null, pinch = null;
      var spans = Array.prototype.slice.call(cube.querySelectorAll('.v > span'));
      var glyphs = Array.prototype.slice.call(cube.querySelectorAll('.v b'));
      glyphs.forEach(function (g) { g.dataset.base = g.style.fontVariationSettings; });
      var anchors = Array.prototype.slice.call(stage.querySelectorAll('.cube-anchor'));
      var tethers = stage.querySelectorAll('.cube-tether'), running = false;
      var AX = { GEOM: 25, YTAS: 1440, SHRP: 0 };
      function place() {
        cube.style.transform = 'scale(' + rot.z + ') rotateX(' + rot.x + 'deg) rotateY(' + rot.y + 'deg)';
        var un = 'rotateY(' + (-rot.y) + 'deg) rotateX(' + (-rot.x) + 'deg)';
        spans.forEach(function (sp) { sp.style.transform = un; });
      }
      function tick() {
        if (!running) return;
        if (!drag && !still) { idle++; if (idle > 90) rot.y += vel; }
        place();
        var sr = stage.getBoundingClientRect();
        var pts = glyphs.map(function (g) { var r = g.getBoundingClientRect(); return { x: r.left + r.width / 2 - sr.left, y: r.top + r.height / 2 - sr.top, g: g, add: {} }; });
        var reach = Math.min(sr.width, sr.height) * 0.6;
        anchors.forEach(function (a, i) {
          var ar = a.getBoundingClientRect(), ax = ar.left + ar.width / 2 - sr.left, ay = ar.top + ar.height / 2 - sr.top;
          var best = null, bd = Infinity;
          pts.forEach(function (p) { var d = Math.hypot(p.x - ax, p.y - ay); if (d < bd) { bd = d; best = p; } });
          var k = Math.max(0, Math.min(1, 1 - bd / reach));
          best.add[a.dataset.axis] = AX[a.dataset.axis] + (parseFloat(a.dataset.to) - AX[a.dataset.axis]) * k * k;
          var t = tethers[i];
          t.style.width = bd + 'px';
          t.style.transform = 'translate(' + ax + 'px,' + ay + 'px) rotate(' + Math.atan2(best.y - ay, best.x - ax) + 'rad)';
          t.style.opacity = 0.25 + 0.75 * k;
        });
        pts.forEach(function (p) {
          var extra = Object.keys(p.add).map(function (k) { return "'" + k + "' " + p.add[k].toFixed(1); }).join(', ');
          p.g.style.fontVariationSettings = p.g.dataset.base + (extra ? ', ' + extra : '');
        });
        requestAnimationFrame(tick);
      }
      place();
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { var was = running; running = e.isIntersecting; if (running && !was) requestAnimationFrame(tick); });
      }, { threshold: 0.1 }).observe(stage);
      /* hands */
      var ptrs = {};
      stage.addEventListener('pointerdown', function (e) {
        ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
        var ids = Object.keys(ptrs);
        if (ids.length === 1) { drag = { x: e.clientX, y: e.clientY }; stage.classList.add('is-grabbing'); stage.setPointerCapture(e.pointerId); }
        if (ids.length === 2) { drag = null; pinch = Math.hypot(ptrs[ids[0]].x - ptrs[ids[1]].x, ptrs[ids[0]].y - ptrs[ids[1]].y); }
        e.preventDefault();
      });
      stage.addEventListener('pointermove', function (e) {
        if (!ptrs[e.pointerId]) return;
        ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
        var ids = Object.keys(ptrs);
        if (ids.length === 2 && pinch) {
          var d = Math.hypot(ptrs[ids[0]].x - ptrs[ids[1]].x, ptrs[ids[0]].y - ptrs[ids[1]].y);
          rot.z = Math.max(0.5, Math.min(2.2, rot.z * d / pinch)); pinch = d; idle = 0;
        } else if (drag) {
          rot.y += (e.clientX - drag.x) * 0.45; rot.x = Math.max(-80, Math.min(80, rot.x - (e.clientY - drag.y) * 0.35));
          drag = { x: e.clientX, y: e.clientY }; idle = 0;
        }
      });
      function up(e) { delete ptrs[e.pointerId]; if (!Object.keys(ptrs).length) { drag = null; pinch = null; stage.classList.remove('is-grabbing'); } }
      stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
      stage.addEventListener('wheel', function (e) {
        if (!e.ctrlKey && Math.abs(e.deltaY) < 1) return;
        e.preventDefault();
        rot.z = Math.max(0.5, Math.min(2.2, rot.z * (1 - e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)))); idle = 0;
      }, { passive: false });
    }
  } else if (ds) { ds.classList.add('is-in'); }

  /* feature switches */
  document.querySelectorAll('.switch').forEach(function (sw) {
    var target = document.getElementById(sw.dataset.target);
    sw.addEventListener('click', function () {
      var on = sw.getAttribute('aria-checked') !== 'true';
      sw.setAttribute('aria-checked', on);
      target.classList.toggle('is-on', on);
    });
  });
})();
