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

  /* the six axes live in js/highlights.js now, with the rest of the Highlights section */

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
      if (unlock) unlock.addEventListener('click', function () {
        var pct = 100 * (input.value - input.min) / (input.max - input.min);
        row.style.setProperty('--at', pct + '%');
        row.classList.add('is-opening');                                   /* the handle becomes the thumb and the track draws in */
        setTimeout(function () { row.classList.add('is-open'); input.tabIndex = 0; input.focus({ preventScroll: true }); }, 400);
      });
      ttApply(row);
    });
    ttText.addEventListener('input', ttDirty);
    ttReset.addEventListener('click', function () {
      ttReset.classList.add('is-spun');
      setTimeout(function () { ttReset.classList.remove('is-spun'); }, 500);
      ttText.value = ttDefaultText;
      rows.forEach(function (row) { var i = row.querySelector('input'); i.value = i.defaultValue; row.classList.remove('is-open', 'is-opening'); i.tabIndex = -1; ttApply(row); });
    });
    window.addEventListener('resize', ttFit);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(ttFit);
  }

  /* the designspace materializes once it is in view; the nodes get staggered delays */
  var ds = document.getElementById('ds-block');
  if (ds && 'IntersectionObserver' in window) {
    var dsIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { ds.classList.add('is-in'); setTimeout(function () { ds.classList.add('is-live'); }, 2600); setTimeout(function () { ds.classList.add('is-settled'); }, 3700); dsIO.disconnect(); } });
    }, { threshold: 0.5 });
    dsIO.observe(ds.querySelector('.ds-panel--now'));
    /* the cube turns on its own, and by hand: drag turns it, pinch or ctrl-wheel zooms; a two-finger twist
       past a small threshold rolls it about the line of sight (it rights itself once left alone). Each frame the
       three fixed axes tether to their nearest corner glyph and pull it along their own axis. */
    var stage = ds.querySelector('.cube-stage'), cube = ds.querySelector('.cube');
    if (stage && cube) {
      var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      var rot = { x: -16, y: -32, z: 0.82, r: 0 }, vel = still ? 0 : 0.09, idle = 0, drag = null, pinch = null, twist = null, twistAcc = 0;
      var TWIST_AT = 10;                                       /* degrees of two-finger rotation before the roll engages */
      var spans = Array.prototype.slice.call(cube.querySelectorAll('.v > span'));
      var glyphs = Array.prototype.slice.call(cube.querySelectorAll('.v b'));
      /* depth: the nearer a corner, the larger perspective draws it; far corners and edges fade */
      var verts = Array.prototype.slice.call(cube.querySelectorAll('.v'));
      var vkey = verts.map(function (v) { return v.style.getPropertyValue('--x') + ',' + v.style.getPropertyValue('--y') + ',' + v.style.getPropertyValue('--z'); });
      var edges = Array.prototype.slice.call(cube.querySelectorAll('.e')).map(function (e) {
        var st = e.style, x = st.getPropertyValue('--x'), y = st.getPropertyValue('--y'), z = st.getPropertyValue('--z');
        var a = e.classList.contains('ex') ? ['-1,' + y + ',' + z, '1,' + y + ',' + z] : e.classList.contains('ey') ? [x + ',-1,' + z, x + ',1,' + z] : [x + ',' + y + ',-1', x + ',' + y + ',1'];
        return { el: e, a: vkey.indexOf(a[0]), b: vkey.indexOf(a[1]) };
      });
      glyphs.forEach(function (g) { g.dataset.base = g.style.fontVariationSettings; });
      /* each corner's label, by axis tag, so a pulled axis can show its live value lit */
      var labels = glyphs.map(function (g) {
        var m = {}; Array.prototype.forEach.call(g.parentElement.querySelectorAll('.vlab > span'), function (sp) { var tag = sp.querySelector('i').textContent; m[tag] = { el: sp, text: sp.lastChild, base: sp.lastChild.textContent }; });
        return m;
      });
      /* the virtual masters tie to every cube master; the lines fade with distance and the nearest corner is pulled */
      var vms = Array.prototype.slice.call(stage.querySelectorAll('.vm')), running = false;
      /* which cube masters each virtual master ties to: all of them, or only the opsz 10 row */
      var links = vms.map(function (a) {
        var idx = []; verts.forEach(function (v, i) { if (a.dataset.only !== 'opsz10' || v.style.getPropertyValue('--y') === '1') idx.push(i); });
        return { idx: idx, ties: idx.map(function () { var t = document.createElement('i'); t.className = 'tie'; stage.insertBefore(t, cube); return t; }) };
      });
      var AX = { GEOM: 25, YTAS: 1440, SHRP: 0, opsz: 10 };
      /* the two switches under the stage: the virtual masters' pull, and the Flex cut */
      var pull = true;
      /* with a mouse, a virtual master's influence is how near the pointer is to it, shown by the ring
         around it; the pull it exerts and its ties follow. Fingers can't hover, so on touch the geometric
         pull comes up while a finger is on the cube and goes the moment it lifts (touchUntil); at rest the cube is
         calm, no rings lit and no corners pulled (2026-10-06: all of it lit at once read as noise on a phone). */
      var fine = !(window.matchMedia && window.matchMedia('(pointer: coarse)').matches), mouse = null, inf = vms.map(function () { return 0; }), touchUntil = 0;
      /* and a touch stands in for the mouse: touch a virtual master and it is picked at once, moving the whole family
         it ties to as hovering it does on a desktop; touch it again, or tap nothing, and it lets go */
      var tapped = false, tapDown = null, tapIdx = -1, pickT0 = 0, PICK = 1400;
      /* letting go eases every axis back over REL ms: the master that was picked keeps its pick point until it is home */
      var relT0 = 0, relFrom = null, relIdx = -1, REL = 100;
      function release(idx) { relFrom = inf.slice(); relT0 = performance.now(); relIdx = idx; }
      function letGo() { var was = tapIdx; tapped = false; tapIdx = -1; if (was < 0) mouse = null; release(was); }
      /* which virtual master a touch lands on: inside the ring around its label (the GEOM master's reach spans most
         of the stage), and the point in stage coordinates */
      function hitAt(cx, cy) {
        var r = stage.getBoundingClientRect(), p = { x: cx - r.left, y: cy - r.top }, hit = -1;
        vms.forEach(function (a, i) { var ar = a.getBoundingClientRect(), rIn = parseFloat(a.style.getPropertyValue('--ring-in')) || 50; if (hit < 0 && Math.hypot(p.x - (ar.left + ar.width / 2 - r.left), p.y - (ar.top + ar.height / 2 - r.top)) < rIn) hit = i; });
        return { i: hit, p: p };
      }
      /* a tap anywhere off the cube lets go too */
      document.addEventListener('pointerdown', function (e) { if (tapped && e.pointerType !== 'mouse' && !stage.contains(e.target)) letGo(); }, { passive: true });
      var RING = 150;
      /* each master's ring: as large as the stage lets it be without touching an edge; the GEOM master's arc
         is the reach of its influence, 60% of the stage's width, and the stage crops it */
      var reachOf = vms.map(function () { return RING; });
      function sizeRings() {
        var sr = stage.getBoundingClientRect();
        vms.forEach(function (a, i) {
          var r = a.getBoundingClientRect(), cx = r.left + r.width / 2 - sr.left, cy = r.top + r.height / 2 - sr.top;
          a.style.setProperty('--ring-in', Math.max(24, Math.floor(Math.min(cx, cy, sr.width - cx, sr.height - cy)) - 4) + 'px');
          if (a.hasAttribute('data-arc')) { var arc = Math.round(sr.width * 0.6); a.style.setProperty('--ring-out', arc + 'px'); reachOf[i] = arc + 24; }   /* influence starts a run-in before the arc */
        });
      }
      sizeRings(); window.addEventListener('resize', sizeRings);
      Array.prototype.forEach.call(ds.querySelectorAll('.switch[data-cube]'), function (sw) {
        sw.addEventListener('click', function () {
          var on = sw.getAttribute('aria-checked') !== 'true'; sw.setAttribute('aria-checked', on);
          if (sw.dataset.cube === 'pull') { pull = on; stage.classList.toggle('no-pull', !on); }
          else stage.classList.toggle('is-flex', on);
        });
      });
      function place() {
        cube.style.transform = 'scale(' + rot.z + ') rotateZ(' + rot.r + 'deg) rotateX(' + rot.x + 'deg) rotateY(' + rot.y + 'deg)';
        var un = 'rotateY(' + (-rot.y) + 'deg) rotateX(' + (-rot.x) + 'deg) rotateZ(' + (-rot.r) + 'deg)';
        spans.forEach(function (sp) { sp.style.transform = un; });
      }
      function tick() {
        if (!running) return;
        if (!drag && !still) { idle++; if (idle > 90) { rot.y += vel; rot.r *= 0.97; if (Math.abs(rot.r) < 0.05) rot.r = 0; } }
        level(performance.now());
        if (reset) reset.hidden = !offHome() && !leveling;
        place();
        var sr = stage.getBoundingClientRect();
        var pts = glyphs.map(function (g) { var r = g.getBoundingClientRect(); return { x: r.left + r.width / 2 - sr.left, y: r.top + r.height / 2 - sr.top, w: r.width, g: g, add: {}, micro: 0, microOn: false }; });
        var ry = rot.y * Math.PI / 180, rx = rot.x * Math.PI / 180;
        var near = verts.map(function (v) {
          var x = +v.style.getPropertyValue('--x'), y = +v.style.getPropertyValue('--y'), z = +v.style.getPropertyValue('--z');
          var z1 = -x * Math.sin(ry) + z * Math.cos(ry);               /* rotateY, then rotateX, as the transform lists them */
          var z2 = y * Math.sin(rx) + z1 * Math.cos(rx);
          return (z2 / 1.74 + 1) / 2;
        });
        if (ds.classList.contains('is-live')) {
          spans.forEach(function (sp, i) { sp.style.opacity = 0.38 + 0.62 * near[i]; });
          edges.forEach(function (e) { e.el.style.opacity = 0.14 + 0.5 * (near[e.a] + near[e.b]) / 2; });
        }
        var reach = Math.min(sr.width, sr.height) * 0.7;
        var relU = relT0 ? Math.min(1, (performance.now() - relT0) / REL) : -1;
        vms.forEach(function (a, i) {
          var ar = a.getBoundingClientRect(), ax = ar.left + ar.width / 2 - sr.left, ay = ar.top + ar.height / 2 - sr.top;   /* the rings' centre: the whole master */
          /* influence: on a mouse, how close the pointer has come; eased so it breathes rather than snaps */
          var md = mouse ? Math.hypot(mouse.x - ax, mouse.y - ay) : Infinity;
          var want = !pull ? 0 : tapped ? (i === tapIdx ? 1 : 0) : !fine ? (performance.now() < touchUntil ? 1 : 0) : mouse ? Math.max(0, Math.min(1, 1 - md / reachOf[i])) : 0;
          inf[i] += (want - inf[i]) * 0.15; if (Math.abs(want - inf[i]) < 0.002) inf[i] = want;
          /* a picked master sweeps its family over PICK ms, eased, so the forms are seen moving along the axis (Cal
             Sans Flex's whole point) rather than landing at once */
          if (tapped && i === tapIdx) { var u = Math.min(1, (performance.now() - pickT0) / PICK); inf[i] = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; }
          else if (relU >= 0) inf[i] = relFrom[i] * (1 - relU) * (1 - relU);   /* easing out, home in REL ms */
          a.style.setProperty('--inf', inf[i].toFixed(3));
          var best = null, bd = Infinity;
          links[i].idx.forEach(function (j, n) {
            var p = pts[j], d = Math.hypot(p.x - ax, p.y - ay), t = links[i].ties[n];
            t.style.width = d + 'px';
            t.style.transform = 'translate(' + ax + 'px,' + ay + 'px) rotate(' + Math.atan2(p.y - ay, p.x - ax) + 'rad)';
            t.style.opacity = (0.08 + 0.5 * Math.max(0, 1 - d / reach)) * (0.3 + 0.7 * inf[i]);
            t.style.setProperty('--tie-a', (0.38 + 0.62 * inf[i]).toFixed(3));
            if (d < bd) { bd = d; best = p; }
          });
          if (inf[i] <= 0) return;
          /* holding pulls only the nearest corner, so only its tie lights; the rest stay at their resting strength */
          if (!fine && !tapped) links[i].ties.forEach(function (t, n) { if (pts[links[i].idx[n]] !== best) t.style.opacity = (+t.style.opacity * 0.3 / (0.3 + 0.7 * inf[i])).toFixed(3); });
          var axis = a.dataset.axis, to = parseFloat(a.dataset.to);
          if (fine || tapped || i === relIdx) {
            /* a virtual master moves the whole family it ties to, as it does in the file: every tied corner
               takes the influence, the near ones a little ahead of the far ones */
            var target = AX[axis] + (to - AX[axis]) * inf[i];
            if (a.hasAttribute('data-arc')) {
              /* the arc is GEOM 0 and the ring is GEOM 100: outside the arc the family rests at its default,
                 crossing it lands on 0 (a short run-in so nothing jumps), and the way in to the ring climbs to 100 */
              var rIn = parseFloat(a.style.getPropertyValue('--ring-in')) || 40, band = 24, rOut = reachOf[i] - band, lo = 0;
              target = md >= rOut + band ? AX[axis] : md >= rOut ? AX[axis] + (lo - AX[axis]) * (1 - (md - rOut) / band) : md <= rIn ? to : lo + (to - lo) * (1 - (md - rIn) / (rOut - rIn));
              if (tapped || i === relIdx) target = AX[axis] + (target - AX[axis]) * inf[i];   /* a touch pick sweeps there, so Flex's C's are seen interpolating */
            }
            links[i].idx.forEach(function (j) { var p = pts[j], d = Math.hypot(p.x - ax, p.y - ay), w = 0.85 + 0.15 * Math.max(0, 1 - d / reach); p.add[axis] = AX[axis] + (target - AX[axis]) * w; if (axis === 'opsz') { p.micro = inf[i] * w; p.microOn = inf[i] >= 0.85; } });
          } else {
            /* touch has no hover, so the geometry pulls: the nearest corner, full inside the near 40% of reach */
            var k = Math.max(0, Math.min(1, (reach - bd) / (reach * 0.6)));
            var kk = k * k * inf[i];
            best.add[axis] = AX[axis] + (to - AX[axis]) * kk; if (axis === 'opsz') { best.micro = kk; best.microOn = kk >= 0.85; }
          }
        });
        if (relU >= 1) { relT0 = 0; relFrom = null; if (relIdx >= 0 && !tapped) mouse = null; relIdx = -1; }
        pts.forEach(function (p, i) {
          var extra = Object.keys(p.add).map(function (k) { return "'" + k + "' " + p.add[k].toFixed(1); }).join(', ');
          p.g.style.fontVariationSettings = p.g.dataset.base + (extra ? ', ' + extra : '');
          /* the micro row: by the time a corner reaches the opsz 8 master it is tracked out 10 units (the
             font's cond_micro_8 kern) and wearing cv03 */
          var micro = p.micro || 0;
          p.g.style.letterSpacing = micro > 0.001 ? (micro * 10 / 2000).toFixed(4) + 'em' : '';
          p.g.style.fontFeatureSettings = p.microOn ? "'cv03' 1" : '';
          /* the label says what the glyph is doing, since YTAS and SHRP move far less than GEOM at this size */
          Object.keys(labels[i]).forEach(function (tag) {
            var l = labels[i][tag], on = tag in p.add, v = on ? (tag === 'opsz' ? p.add[tag].toFixed(1) : Math.round(p.add[tag]) + '') : l.base;
            if (l.text.textContent !== v) l.text.textContent = v;
            l.el.classList.toggle('hot', on);
          });
        });
        requestAnimationFrame(tick);
      }
      /* the level button: shows once tilt, roll or zoom has left home, and eases those three back
         while the turn (rot.y) keeps whatever spot it has reached */
      var HOME = { x: -16, z: 0.82, r: 0 }, reset = ds.querySelector('.cube-reset'), leveling = null, touched = false;
      /* dirty once a hand has moved it at all, a plain turn included: levelling then also hands the turn
         back to the auto-spin at once, so the button always does something visible */
      function offHome() { return touched || Math.abs(rot.x - HOME.x) > 0.5 || Math.abs(rot.z - HOME.z) > 0.01 || Math.abs(rot.r) > 0.5; }
      if (reset) {
        reset.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
        reset.addEventListener('click', function () {
          leveling = { t0: performance.now(), x: rot.x, z: rot.z, r: rot.r }; touched = false; idle = 91;
          reset.classList.remove('is-spun'); void reset.offsetWidth; reset.classList.add('is-spun');
        });
      }
      function level(now) {
        if (!leveling) return;
        var p = still ? 1 : Math.min(1, (now - leveling.t0) / 500), e = 1 - Math.pow(1 - p, 3);
        rot.x = leveling.x + (HOME.x - leveling.x) * e; rot.z = leveling.z + (HOME.z - leveling.z) * e; rot.r = leveling.r + (0 - leveling.r) * e;
        if (p >= 1) { leveling = null; rot.r = 0; }
      }
      place();
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { var was = running; running = e.isIntersecting; if (running && !was) requestAnimationFrame(tick); });
      }, { threshold: 0.1 }).observe(stage);
      /* hands */
      var ptrs = {};
      stage.addEventListener('pointerdown', function (e) {
        if (e.pointerType !== 'mouse') {
          /* a touch on a master picks it at once; a touch anywhere else holds (unless a master is picked) */
          var h = hitAt(e.clientX, e.clientY);
          tapDown = { x: e.clientX, y: e.clientY, t: performance.now(), hit: h.i, was: tapIdx };
          if (h.i >= 0 && h.i !== tapIdx) { relT0 = 0; relIdx = -1; tapped = true; tapIdx = h.i; mouse = h.p; touchUntil = 0; pickT0 = performance.now(); inf.forEach(function (v, i) { if (i !== h.i) inf[i] = 0; }); }   /* one master at a time: the last one drops at once */
          else if (h.i < 0 && !tapped) { relT0 = 0; relIdx = -1; touchUntil = Infinity; }
        }
        ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
        var ids = Object.keys(ptrs);
        if (ids.length === 1) { drag = { x: e.clientX, y: e.clientY }; stage.classList.add('is-grabbing'); stage.setPointerCapture(e.pointerId); }
        if (ids.length === 2) { drag = null; pinch = span(ids); twist = angle(ids); twistAcc = 0; }
        e.preventDefault();
      });
      function span(ids) { return Math.hypot(ptrs[ids[0]].x - ptrs[ids[1]].x, ptrs[ids[0]].y - ptrs[ids[1]].y); }
      function angle(ids) { return Math.atan2(ptrs[ids[1]].y - ptrs[ids[0]].y, ptrs[ids[1]].x - ptrs[ids[0]].x) * 180 / Math.PI; }
      function turn(dx, dy) { rot.y += dx * 0.45; rot.x -= dy * 0.35; idle = 0; touched = true; }   /* no tilt clamp: it can go right over */
      stage.addEventListener('pointermove', function (e) {
        if (e.pointerType === 'mouse' && !drag) { var r = stage.getBoundingClientRect(); mouse = { x: e.clientX - r.left, y: e.clientY - r.top }; }
        if (!ptrs[e.pointerId]) return;
        ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
        var ids = Object.keys(ptrs);
        if (ids.length === 2 && pinch) {
          var d = span(ids), a = angle(ids), da = a - twist;
          if (da > 180) da -= 360; else if (da < -180) da += 360;   /* the pair swinging through the seam at ±180 */
          rot.z = Math.max(0.5, Math.min(2.2, rot.z * d / pinch)); pinch = d; twist = a; idle = 0; touched = true;
          /* the roll waits for a deliberate twist, so a pinch with a little wobble in it stays a pinch */
          if (twistAcc === null) rot.r += da; else { twistAcc += da; if (Math.abs(twistAcc) >= TWIST_AT) twistAcc = null; }
        } else if (drag) {
          turn(e.clientX - drag.x, e.clientY - drag.y); drag = { x: e.clientX, y: e.clientY };
        }
      });
      stage.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') mouse = null; });   /* a finger leaves on every lift */
      function up(e) {
        /* a tap on nothing, or on the master already picked, lets go at once, as a lift does */
        if (e.pointerType !== 'mouse' && tapDown && Math.hypot(e.clientX - tapDown.x, e.clientY - tapDown.y) < 16 && performance.now() - tapDown.t < 500) {
          if (tapDown.hit < 0 ? tapped : tapDown.hit === tapDown.was) letGo();
        }
        tapDown = null;
        delete ptrs[e.pointerId]; if (!Object.keys(ptrs).length) { drag = null; pinch = null; twist = null; stage.classList.remove('is-grabbing'); if (touchUntil === Infinity) { touchUntil = 0; if (!tapped) release(-1); } } }   /* a hold lets go the moment the finger lifts, easing back */
      stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
      stage.addEventListener('wheel', function (e) {
        if (!e.ctrlKey && Math.abs(e.deltaY) < 1) return;
        e.preventDefault();
        rot.z = Math.max(0.5, Math.min(2.2, rot.z * (1 - e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)))); idle = 0; touched = true;
      }, { passive: false });
    }
  } else if (ds) { ds.classList.add('is-in'); ds.classList.add('is-live'); }

  /* deck pages: cycle while in view; a click advances and restarts the clock */
  document.querySelectorAll('.deck').forEach(function (deck) {
    var imgs = deck.querySelectorAll('img'), n = deck.querySelector('.deck-n'), i = 0, timer = null, every = +deck.dataset.every || 3600;
    function show(k) {
      var prev = i; i = (k + imgs.length) % imgs.length;
      imgs.forEach(function (im, j) { im.classList.toggle('is-on', j === i); });
      if (prev !== i) { imgs[prev].classList.add('was-on'); setTimeout(function () { imgs[prev].classList.remove('was-on'); }, 520); }
      if (n) n.textContent = (i + 1) + ' / ' + imgs.length;
    }
    function start() { stop(); timer = setInterval(function () { show(i + 1); }, every); }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    deck.addEventListener('click', function () { show(i + 1); start(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) start(); else stop(); }); }, { threshold: 0.4 }).observe(deck);
    } else start();
  });

  /* the statics sheet drifts on its own while in view, turns at the ends, and yields to a hand on it */
  var sheet = document.querySelector('.mb-scroll');
  if (sheet && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var dir = 1, pos = 0, hold = 0, inView = false, last = 0;
    function drift(now) {
      if (!inView) return;
      var dt = Math.min(50, now - last); last = now;
      if (hold > 0) hold -= dt;
      else {
        var max = sheet.scrollHeight - sheet.clientHeight;
        pos = sheet.scrollTop + dir * dt * 0.018;
        if (pos >= max) { pos = max; dir = -1; hold = 1200; }
        if (pos <= 0) { pos = 0; dir = 1; hold = 1200; }
        sheet.scrollTop = pos;
      }
      requestAnimationFrame(drift);
    }
    ['wheel', 'pointerdown', 'touchstart', 'keydown'].forEach(function (ev) { sheet.addEventListener(ev, function () { hold = 4000; }, { passive: true }); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { es.forEach(function (e) { var was = inView; inView = e.isIntersecting; if (inView && !was) { last = performance.now(); requestAnimationFrame(drift); } }); }, { threshold: 0.3 }).observe(sheet);
    }
  }

  /* feature switches */
  document.querySelectorAll('.switch').forEach(function (sw) {
    var target = document.getElementById(sw.dataset.target);
    if (!target) return;                                   /* the cube's switches wire themselves */
    sw.addEventListener('click', function () {
      var on = sw.getAttribute('aria-checked') !== 'true';
      sw.setAttribute('aria-checked', on);
      target.classList.toggle(sw.dataset.class || 'is-on', on);
    });
  });
})();

/* the numbers row counts up once, the first time it is on screen: card 4's curve (1.8 s, ease out), a step
   left to right. Each figure keeps its own format all the way up (13,362 with its comma, 1.6k with its
   decimal). The markup holds the real figures; without the observer, or with reduced motion, they stay put. */
(function () {
  var nums = document.querySelector('.nums'); if (!nums || !('IntersectionObserver' in window)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var figs = Array.prototype.slice.call(nums.querySelectorAll('.num b')).map(function (b) {
    var txt = b.textContent.trim(), m = txt.match(/^([\d,]*\.?\d+)(\D*)$/); if (!m) return null;
    var dec = (m[1].split('.')[1] || '').length, comma = m[1].indexOf(',') >= 0;
    return { b: b, end: txt, to: parseFloat(m[1].replace(/,/g, '')), dec: dec, comma: comma, unit: m[2] };
  }).filter(Boolean);
  function fmt(f, v) {
    var s = v.toFixed(f.dec);
    if (f.comma) s = s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return s + f.unit;
  }
  figs.forEach(function (f) { f.b.setAttribute('aria-label', f.end); f.b.textContent = fmt(f, 0); });
  var T = 1800, STEP = 120;
  function run() {
    var t0 = performance.now();
    (function frame(now) {
      var done = true;
      figs.forEach(function (f, i) {
        var k = Math.max(0, Math.min(1, (now - t0 - i * STEP) / T)), e = 1 - Math.pow(1 - k, 3);
        f.b.textContent = k >= 1 ? f.end : fmt(f, f.to * e);
        if (k < 1) done = false;
      });
      if (!done) requestAnimationFrame(frame);
    })(t0);
  }
  var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io.disconnect(); run(); } }, { threshold: 0.4 });
  io.observe(nums);
})();

/* the 2022 figure's labels never read under 10px: the svg fills its panel, 800 units across, so on a narrow panel a
   13-unit label pair scales up about its own top centre, an MVP under a pair grows with it and steps down by what the
   pair (33 units tall) gained, the 16-unit axis names scale about their top left, and "Text masters" moves below the
   lowest MVP, the drawing growing to fit. As svg transforms from here, not CSS: Safari resolved container units
   inside the svg against the wrong box (scale 7.7) and ignored transform-origin on text (2026-10-06). */
(function () {
  var figs = document.querySelectorAll('svg.ds'); if (!figs.length) return;
  function box(el) { return el._box || (el._box = el.getBBox()); }
  function place(el, ox, oy, s, dy) {
    if (s === 1 && !dy) el.removeAttribute('transform');
    else el.setAttribute('transform', 'translate(' + ox.toFixed(2) + ' ' + (oy + dy).toFixed(2) + ') scale(' + s.toFixed(4) + ') translate(' + (-ox).toFixed(2) + ' ' + (-oy).toFixed(2) + ')');
  }
  function fit() {
    figs.forEach(function (svg) {
      var w = svg.getBoundingClientRect().width; if (!w) return;
      var vb = svg._vb || (svg._vb = svg.getAttribute('viewBox').split(/\s+/).map(Number));
      var s = Math.max(1, 10 * 800 / 13 / w), sa = Math.max(1, 10 * 800 / 16 / w), low = 0;
      svg.querySelectorAll('.ds-grid, .ds-mvp').forEach(function (el) {
        var b = box(el), mvp = el.classList.contains('ds-mvp'), dy = mvp ? (s - 1) * 33 : 0;
        place(el, b.x + b.width / 2, b.y, s, dy);
        low = Math.max(low, b.y + dy + b.height * s);
      });
      var ax = svg.querySelectorAll('.ds-ax text'), h = vb[3];
      ax.forEach(function (el, i) {
        var b = box(el), dy = i === ax.length - 1 ? Math.max(0, low + 12 - b.y) : 0;
        place(el, b.x, b.y, sa, dy);
        h = Math.max(h, b.y + dy + b.height * sa + 8 - vb[1]);
      });
      svg.setAttribute('viewBox', vb[0] + ' ' + vb[1] + ' ' + vb[2] + ' ' + h.toFixed(1));
    });
  }
  fit();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { figs.forEach(function (svg) { svg.querySelectorAll('.ds-grid, .ds-mvp, .ds-ax text').forEach(function (el) { el._box = null; }); }); fit(); });
  if ('ResizeObserver' in window) { var ro = new ResizeObserver(fit); figs.forEach(function (svg) { ro.observe(svg); }); }
})();
