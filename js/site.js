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

/* ── hero pill: sliding gradient synced to comet (issue #25) */
(function () {
  var pill = document.querySelector('.hero-pill');
  if (!pill) return;

  // CSS handles background-image/size/repeat on :hover.
  // JS only keeps background-position-x pre-synced to the current comet slot
  // so the correct colour appears the instant the user hovers.

  var EPOCH_DUR = 36;       // must match flapjack.js
  var HOLD_FRAC = 32 / 36;  // hold for 32 s, ease over final 4 s
  var lastIdx   = -1;
  var curPos    = 0;        // current bg-pos-x in %

  function easeExpoOut(x) { return 1 - Math.pow(2, -10 * x); }

  function pillRaf() {
    requestAnimationFrame(pillRaf);
    var wc = window.wmComet;
    if (!wc) return;

    var idx      = wc.idx;       // 0–3
    var progress = wc.progress;  // 0→1 within epoch

    // Snap bg-pos to 0% the moment epoch wraps pink → orange (both show orange)
    if (lastIdx === 3 && idx === 0) curPos = 0;
    lastIdx = idx;

    var fromPos = idx * 25;       // 0, 25, 50, 75
    var toPos   = (idx + 1) * 25; // 25, 50, 75, 100

    if (progress < HOLD_FRAC) {
      curPos = fromPos;
    } else {
      var t     = (progress - HOLD_FRAC) / (1 - HOLD_FRAC); // 0→1
      curPos    = fromPos + (toPos - fromPos) * easeExpoOut(t);
    }

    pill.style.backgroundPositionX = curPos.toFixed(2) + '%';
  }

  requestAnimationFrame(pillRaf);
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
  document.querySelectorAll('.work-fig').forEach(function (el) { io.observe(el); });
}());

/* ── mobile rule height: match figcaption exactly ───────── */
(function () {
  var cs       = getComputedStyle(document.documentElement);
  var MOBILE_MQ = window.matchMedia('(max-width: 680px)');

  function sizeRules() {
    var inset    = parseFloat(cs.getPropertyValue('--fig-shape-inset'))  || 20;
    var shape    = parseFloat(cs.getPropertyValue('--fig-shape-size'))   || 7;
    var toShape  = inset + shape / 2;   /* distance from image top to shape centre */

    document.querySelectorAll('.work-fig').forEach(function (fig) {
      var caption = fig.querySelector('.work-figcaption');
      var rule    = fig.querySelector('.fig-rule');
      if (!caption || !rule) return;

      if (MOBILE_MQ.matches) {
        var capH = caption.offsetHeight;
        rule.style.top    = '-' + capH + 'px';
        rule.style.height = (capH + toShape) + 'px';
      } else {
        rule.style.top    = '';
        rule.style.height = '';
      }
    });
  }

  document.fonts.ready.then(function () {
    sizeRules();
    var raf;
    window.addEventListener('resize', function () {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(sizeRules);
    });
  });
}());

/* ── letterbox anchor: WORDMARK always 15px below footer ─── */
// CONFIG_FOOTER.topPadVh = 0.2 reserves 20vh of blank canvas above the letters.
// We pull the letterbox div up by (20vh - 15px) so that blank space slides
// behind the footer and the letters land exactly 15px below footer's bottom edge.
(function () {
  var lb  = document.getElementById('footer-letterbox');
  if (!lb) return;

  var TOP_PAD_VH = 0.2;   // must match CONFIG_FOOTER.topPadVh in letterbox.js
  var GAP        = 15;    // px between footer bottom edge and WORDMARK letters

  function anchor() {
    lb.style.marginTop = -(TOP_PAD_VH * window.innerHeight - GAP) + 'px';
  }

  anchor();
  var raf;
  window.addEventListener('resize', function () {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(anchor);
  });
}());

/* ── letterbox progressive reveal (branch: letterbox-reveal) ─────────
   Desktop-only, additive to the anchor above. A low-parallax progressive
   disclosure: the whole letterbox creeps up with scroll — hidden through the
   hero, gradually to a ~3-row peek across the work blocks, then up to full as
   the footer arrives. Whole-unit translate driven per frame, NO clip, so the
   explode radius is never cut. */
(function () {
  if (window.matchMedia('(max-width: 680px)').matches) return;   // mobile keeps the anchor
  var lb     = document.getElementById('footer-letterbox');
  var lbFront = document.getElementById('footer-letterbox-front');   // front speckle container (moves with lb)
  var canvas = document.getElementById('lb-footer');
  var stage  = document.querySelector('.closing');   // the tall closing stage (last work item)
  var items  = [].slice.call(document.querySelectorAll('.work-item'));
  if (!lb || !canvas || !stage || items.length < 4) return;

  // NYMZO caption + rule — reverse out (drift left + fade, rule retracts to the dot)
  // as the footer arrives, leaving a clean image beside the footer text
  var captionEl = stage.querySelector('.work-figcaption');
  var ruleEl    = stage.querySelector('.fig-rule');

  var PEEK    = 60;    // px of the WORDMARK top shown at the full peek (~3 rows)
  var hiddenY = 190;   // translateY (px) for fully hidden
  var peekY   = 130;   // translateY (px) for the peek
  // full (resting, live position) = translateY(0)

  // find the WORDMARK ink-band top (CSS px) so the shifts align to the letters
  function measureShifts() {
    var wmTop = 155;
    try {
      var ctx = canvas.getContext('2d'), dpr = window.devicePixelRatio || 1;
      var W = canvas.width, H = canvas.height, d = ctx.getImageData(0, 0, W, H).data;
      for (var y = 0; y < H; y++) {
        var n = 0, base = y * W * 4;
        for (var x = 0; x < W; x += 8) { if (d[base + x * 4 + 3] > 60) n++; }
        if (n > 15) { wmTop = Math.round(y / dpr); break; }
      }
    } catch (e) {}
    var cvH  = Math.round(canvas.getBoundingClientRect().height);
    var inkH = cvH - wmTop;  // WORDMARK block height
    hiddenY = inkH + 4;      // WORDMARK just below the fold
    peekY   = inkH - PEEK;   // top ~PEEK px showing
    // Reserve the WORDMARK's visible height + a 50px gap below the footer, so at
    // the bottom the footer block rests with the full WORDMARK 50px beneath it.
    var room = document.querySelector('.reveal-room');
    if (room) room.style.height = (inkH + 50) + 'px';
  }

  function docTop(el) { var y = 0; while (el) { y += el.offsetTop; el = el.offsetParent; } return y; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  var A = {};
  function recalc() {
    A.b1       = docTop(items[0]);   // block 1
    A.stageTop = docTop(stage);      // top of the closing stage
    A.max      = document.documentElement.scrollHeight - window.innerHeight;
  }
  // scroll position, robust to the page's scroll mechanism
  function scrollNow() { return A.stageTop - stage.getBoundingClientRect().top; }

  function update() {
    var s = scrollNow(), vh = window.innerHeight;
    var rampStart   = A.b1 - vh;          // block 1's top enters the viewport
    var revealStart = A.max - vh;         // full reveal happens over the final viewport
    // phase 1 — progressive: hidden → peek, growing across blocks 2–3 into the stage,
    // reaching the ~3-row peek as the closing stage tops out
    var p1 = clamp((s - rampStart) / Math.max(1, A.stageTop - rampStart), 0, 1);
    var y  = lerp(hiddenY, peekY, p1);
    // hold at the peek through the stage, then phase 2 — peek → full over the final
    // viewport, in sync with the footer rising into place (its own slower pace)
    var p2 = clamp((s - revealStart) / Math.max(1, A.max - revealStart), 0, 1);
    y = lerp(y, 0, p2);
    var tf = 'translateY(' + y.toFixed(1) + 'px)';
    lb.style.transform = tf;
    if (lbFront) lbFront.style.transform = tf;   // front layer tracks the back exactly

    // NYMZO caption + rule reverse-out, completing a touch before the very bottom
    var pOut = clamp((s - revealStart) / Math.max(1, (A.max - revealStart) * 0.7), 0, 1);
    if (captionEl) {
      if (pOut > 0) {
        captionEl.style.transform = 'translateX(' + (-28 * pOut).toFixed(1) + 'px)';
        captionEl.style.opacity   = (1 - pOut).toFixed(3);
      } else {
        captionEl.style.transform = '';
        captionEl.style.opacity   = '';
      }
    }
    if (ruleEl) {
      if (pOut > 0) {
        ruleEl.style.transition = 'none';               // scrub, don't ease
        ruleEl.style.transform  = 'scaleX(' + (1 - pOut).toFixed(3) + ')';  // retract into the dot
      } else {
        ruleEl.style.transition = '';                   // hand back to the CSS entrance
        ruleEl.style.transform  = '';
      }
    }

  }

  // measureShifts sizes the room first, THEN recalc reads the resulting scrollHeight
  function init() { measureShifts(); recalc(); }
  document.fonts.ready.then(function () { setTimeout(init, 500); });
  window.addEventListener('resize', function () { measureShifts(); recalc(); });
  (function loop() { update(); requestAnimationFrame(loop); }());
}());
