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
(function () {
  function balanceHeadlines() {
    document.querySelectorAll('.work-headline').forEach(function (el) {
      el.style.fontSize = '';
      var copy = el.closest('.work-copy');
      if (!copy) return;
      var colW = copy.getBoundingClientRect().width;
      if (colW < 100) return;
      var words = el.textContent.trim().split(/\s+/);
      var ctx = document.createElement('canvas').getContext('2d');
      var lo = 18, hi = 48, best = lo;
      for (var iter = 0; iter < 14; iter++) {
        var mid = (lo + hi) / 2;
        ctx.font = '700 ' + mid + 'px CalSans, sans-serif';
        var maxW = 0;
        for (var i = 0; i < words.length; i++) {
          maxW = Math.max(maxW, ctx.measureText(words[i]).width);
        }
        if (maxW <= colW) { best = mid; lo = mid; }
        else { hi = mid; }
        if (hi - lo < 0.2) break;
      }
      el.style.fontSize = Math.round(best * 10) / 10 + 'px';
    });
  }
  document.fonts.ready.then(function () {
    balanceHeadlines();
    var rafResize;
    window.addEventListener('resize', function () {
      cancelAnimationFrame(rafResize);
      rafResize = requestAnimationFrame(balanceHeadlines);
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
