/* about-ring.js -- the ABOUT WORDMARK ring (css/about-ring.css). Mouse: the ring replaces the
   pointer over the desk portrait and trails it with a little lag. Phone: a persistent ring on
   the portrait's corner. Mouse: three bold repeats; phone: two (Mark, 2026-11-10).
   HDR screens get the ring as live DOM letters filled from a 1000-nit PQ swatch
   (background-clip: text, the one route that ships); everything else gets SVG text on a
   circle in white difference blend. ?reps= and ?sdr override for comparison. */
(function () {
  /* every [data-ring] is a ring target: its data-ring is the text; data-ring-corner marks the
     one that carries the persistent phone ring */
  var targets = Array.prototype.slice.call(document.querySelectorAll('[data-ring]'));
  var me = document.querySelector('[data-ring-corner]');
  if (!targets.length) return;
  var q = new URLSearchParams(location.search);
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  /* HDR letters only on an HDR screen AND in the dark theme (Mark: light mode has no HDR,
     only the difference paint). The theme switch is live, so the ring rebuilds on change. */
  var darkMQ = window.matchMedia('(prefers-color-scheme: dark)');
  function isDark() {
    var t = document.documentElement.getAttribute('data-theme');   /* 'dark' | 'light' | 'auto' */
    return t === 'dark' || (t !== 'light' && darkMQ.matches);
  }
  var hdrScreen = q.has('hdr') || (window.matchMedia('(dynamic-range: high)').matches && !q.has('sdr'));
  var hdr = false;
  var reps = +q.get('reps') || (fine ? 3 : 2);
  var centre = q.get('center') === '0' ? '' : (fine ? '[click]' : '>tap<');   /* the word in the middle */
  var n = 0;
  function pathText(txt) { return (txt + '  ').repeat(reps); }

  /* SDR: SVG textPath. The repeats close the circle exactly: measure the natural run once
     the font is in and spread the difference over the characters as letter-spacing. */
  function ringSVG(cls, txt) {
    var id = 'about-ring-path-' + (++n);
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 200 200');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('class', 'about-ring about-ring--svg ' + cls);
    svg.setAttribute('data-reps', reps);
    var r = 78, c = 2 * Math.PI * r;
    svg.innerHTML =
      '<defs><path id="' + id + '" d="M100,100 m-' + r + ',0 a' + r + ',' + r + ' 0 1,1 ' + 2 * r + ',0 a' + r + ',' + r + ' 0 1,1 -' + 2 * r + ',0"/></defs>' +
      '<g class="about-ring__g"><text><textPath href="#' + id + '">' + pathText(txt) + '</textPath></text></g>' +
      (centre ? '<text class="about-ring__c" x="100" y="100" text-anchor="middle" dominant-baseline="central">' + centre.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</text>' : '');
    var t = svg.querySelector('text'), len = t.textContent.length;
    svg.__layout = function () {
      t.style.letterSpacing = '0';
      var l = t.getComputedTextLength();
      if (l) t.style.letterSpacing = ((c - l) / len).toFixed(3) + 'px';
    };
    return svg;
  }

  /* HDR: one span per letter, each rotated onto the circle, filled from the PQ swatch. The
     letters sit the way the SVG's do: baseline on the 78/200 radius, reading clockwise from
     the left. Spacing closes the circle the same way. */
  function ringHTML(cls, txt) {
    var el = document.createElement('div');
    el.className = 'about-ring about-ring--hdr ' + cls;
    el.setAttribute('aria-hidden', 'true');
    el.setAttribute('data-reps', reps);
    var g = document.createElement('div');
    g.className = 'about-ring__g';
    el.appendChild(g);
    if (centre) {
      var c = document.createElement('span');
      c.className = 'about-ring__c'; c.textContent = centre;
      el.appendChild(c);
    }
    var spans = pathText(txt).toUpperCase().split('').map(function (ch) {
      var s = document.createElement('span');
      s.textContent = ch;
      g.appendChild(s);
      return s;
    });
    el.__layout = function () {
      var d = el.offsetWidth;
      if (!d) return;
      var R = d * 78 / 200, C = 2 * Math.PI * R;
      var fs = parseFloat(getComputedStyle(spans[0]).fontSize);
      var ws = spans.map(function (s) { s.style.transform = ''; return s.getBoundingClientRect().width; });
      var total = ws.reduce(function (a, b) { return a + b; }, 0);
      var extra = (C - total) / ws.length, cum = 0;
      spans.forEach(function (s, i) {
        var mid = cum + (ws[i] + extra) / 2;
        cum += ws[i] + extra;
        var deg = -90 + mid / R * 180 / Math.PI;
        /* line-height 1: the box centre sits ~0.3em above the baseline, so lift by R + 0.3em
           to put the baseline on the radius */
        s.style.transform = 'translate(-50%, -50%) rotate(' + deg.toFixed(2) + 'deg) translateY(' + (-(R + 0.3 * fs)).toFixed(1) + 'px)';
      });
    };
    return el;
  }

  function ring(cls, txt) { return hdr ? ringHTML(cls, txt) : ringSVG(cls, txt); }
  function layout(el) {
    el.__layout();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(el.__layout);
    requestAnimationFrame(el.__layout);
    window.addEventListener('resize', el.__layout);
  }
  function teardown(el) {
    window.removeEventListener('resize', el.__layout);
    el.remove();
  }

  targets.forEach(function (t) {
    t.addEventListener('click', function () {
      if (typeof gtag === 'function') gtag('event', 'about_entry', { source: t.getAttribute('data-ring-src') || 'ring' });
    });
  });
  /* press: the letters slide to the ital axis; release: back to roman (css transitions it) */
  var rings = [];
  function down() { rings.forEach(function (r) { r.classList.add('is-down'); }); }
  function up()   { rings.forEach(function (r) { r.classList.remove('is-down'); }); }
  targets.forEach(function (t) { t.addEventListener('pointerdown', down); });
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
  window.addEventListener('pagehide', up);

  var x = 0, y = 0, tx = 0, ty = 0, raf = 0, on = false, el = null, cur = null;
  var byTarget = new Map();
  function build() {
    hdr = hdrScreen && isDark();
    rings.forEach(teardown); rings = []; byTarget.clear();
    if (fine) {
      targets.forEach(function (t) {
        var r = ring('about-ring--cursor', t.getAttribute('data-ring'));
        rings.push(r); byTarget.set(t, r);
        r.classList.add('is-idle');
        document.body.appendChild(r);
        layout(r);
        r.style.translate = x.toFixed(1) + 'px ' + y.toFixed(1) + 'px';
      });
      el = cur ? byTarget.get(cur) : rings[0];
      if (on && el) el.classList.remove('is-idle'), el.classList.add('is-on');
    } else if (me) {
      var corner = ring('about-ring--corner', me.getAttribute('data-ring'));
      rings.push(corner);
      /* pixel fallback for the CSS size, so a stale stylesheet can never let it go 100% wide */
      var d = Math.round(window.innerWidth * 0.41) + 'px';
      corner.style.width = d; corner.style.height = d;
      me.appendChild(corner);
      layout(corner);
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (es) {
          corner.classList.toggle('is-off', !es[0].isIntersecting);
        }, { rootMargin: '10% 0px' }).observe(me);
      }
    }
  }
  build();
  new MutationObserver(build).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  if (darkMQ.addEventListener) darkMQ.addEventListener('change', build);

  if (fine) {
    var out = 0;
    function frame() {
      x += (tx - x) * 0.22; y += (ty - y) * 0.22;
      /* the translate PROPERTY, not transform: it is applied before the scale property, so
         the grow-in stays centred on the pointer instead of sliding toward the page origin */
      el.style.translate = x.toFixed(1) + 'px ' + y.toFixed(1) + 'px';
      if (on || out || Math.abs(tx - x) + Math.abs(ty - y) > 0.3) raf = requestAnimationFrame(frame);
      else raf = 0;
    }
    /* the pointer is tracked at the window, so the ring keeps following while it fades out
       and crossfades with the returning cursor instead of drooping off where it was */
    window.addEventListener('pointermove', function (e) { tx = e.clientX; ty = e.clientY; }, { passive: true });
    targets.forEach(function (t) {
      t.addEventListener('pointerenter', function (e) {
        if (el && el !== byTarget.get(t)) { el.classList.remove('is-on', 'is-out'); }
        cur = t; el = byTarget.get(t);
        on = true; x = tx = e.clientX; y = ty = e.clientY;
        clearTimeout(out); out = 0;
        el.classList.remove('is-out', 'is-idle');
        el.classList.add('is-on');
        if (!raf) frame();
      });
      t.addEventListener('pointerleave', function () {
        var r = byTarget.get(t);
        on = false;
        r.classList.remove('is-on');
        r.classList.add('is-out');
        out = setTimeout(function () { r.classList.remove('is-out'); r.classList.add('is-idle'); out = 0; }, 320);
      });
    });
  }
})();
