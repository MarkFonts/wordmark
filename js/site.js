/* ── theme toggle ───────────────────────────────────────── */
(function () {
  var html    = document.documentElement;
  var buttons = document.querySelectorAll('#theme-toggle button');

  var saved = localStorage.getItem('wm-theme') || 'auto';
  html.setAttribute('data-theme', saved);
  setActive(saved);

  buttons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var mode = btn.getAttribute('data-mode');
      html.setAttribute('data-theme', mode);
      localStorage.setItem('wm-theme', mode);
      setActive(mode);
    });
  });

  function setActive(mode) {
    buttons.forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-mode') === mode);
    });
  }
}());

/* ── inline SVG logos (enables currentColor theming) ───── */
(function () {
  // Cache fetches so duplicate slides reuse the same request
  var cache = {};
  document.querySelectorAll('img.svg-logo').forEach(function (img) {
    var src = img.src;
    var alt = img.alt;
    var doInline = function (text) {
      var tmp = document.createElement('div');
      tmp.innerHTML = text;
      var svg = tmp.querySelector('svg');
      if (!svg) return;
      svg.removeAttribute('id');
      if (alt) { svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', alt); }
      else      { svg.setAttribute('aria-hidden', 'true'); }
      img.parentNode.replaceChild(svg, img);
    };
    if (cache[src]) {
      cache[src].then(doInline);
    } else {
      cache[src] = fetch(src).then(function (r) { return r.text(); });
      cache[src].then(doInline).catch(function () {});
    }
  });
}());


/* ── balanced work headlines (issue #7) ─────────────────── */
// Canvas-measures every headline at its live font size, finds the most
// balanced 2-line split for each, then applies the widest of those splits
// as a shared max-width — so all headlines break at the same column width.
// Only runs above 755 px; clears on resize to narrow viewports.
(function () {
  var mq = window.matchMedia('(min-width: 756px)');

  function run() {
    var headlines = document.querySelectorAll('.work-headline');
    if (!mq.matches) {
      headlines.forEach(function (el) { el.style.maxWidth = ''; });
      return;
    }

    var cv  = document.createElement('canvas');
    var ctx = cv.getContext('2d');
    var maxBreakW = 0;

    headlines.forEach(function (el) {
      var fs    = parseFloat(getComputedStyle(el).fontSize);
      ctx.font  = '700 ' + fs + 'px CalSans, sans-serif';
      var words = el.textContent.trim().split(/\s+/);
      if (words.length < 2) return;

      var bestDiff = Infinity, bestW = 0;
      for (var s = 1; s < words.length; s++) {
        var w1 = ctx.measureText(words.slice(0, s).join(' ')).width;
        var w2 = ctx.measureText(words.slice(s).join(' ')).width;
        var diff = Math.abs(w1 - w2);
        if (diff < bestDiff) { bestDiff = diff; bestW = Math.max(w1, w2); }
      }
      if (bestW > maxBreakW) maxBreakW = bestW;
    });

    if (maxBreakW > 0) {
      headlines.forEach(function (el) {
        el.style.maxWidth = Math.ceil(maxBreakW) + 'px';
      });
    }
  }

  document.fonts.ready.then(function () {
    run();
    var raf;
    window.addEventListener('resize', function () {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(run);
    });
  });
}());

/* ── image slide-in ─────────────────────────────────────── */
(function () {
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.work-img').forEach(function (el) { io.observe(el); });
}());
