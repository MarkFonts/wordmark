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
