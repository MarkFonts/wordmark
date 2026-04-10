(function () {
  'use strict';

  var layer = document.getElementById('sticker-layer');
  if (!layer) return;

  var TEXTS = [
    'message\u202F=\u202Fmedium',
    'times new up',
    'comic deadpans',
    'a hellvetica good time',
    'kernliness \u2192 godliness',
    'bringin\u2019 robert slim bach',
    'univers health care',
    'optical sizing\u202F=\u202Fsecret sauce',
  ];

  var COLORS  = ['#7C00F6', '#ff2d55', '#e8650a', '#00a67e'];
  var MAX     = 6;
  var spawned = 0;
  var textIdx = 0;

  /* ── drag + throw physics ──────────────────────────────── */
  function makeDraggable(el) {
    var ox = 0, oy = 0, dragging = false;
    var velX = 0, velY = 0;          // smoothed velocity (px/ms)
    var lastCX = 0, lastCY = 0, lastT = 0;
    var throwRaf = null;

    function start(cx, cy) {
      // Cancel any in-progress throw
      if (throwRaf) { cancelAnimationFrame(throwRaf); throwRaf = null; }

      var er = el.getBoundingClientRect();
      var lr = layer.getBoundingClientRect();
      ox = cx - er.left;
      oy = cy - er.top;
      el.style.left = (er.left - lr.left) + 'px';
      el.style.top  = (er.top  - lr.top ) + 'px';
      el.classList.add('sticker--dragging');
      dragging = true;
      velX = 0; velY = 0;
      lastCX = cx; lastCY = cy; lastT = Date.now();
    }

    function move(cx, cy) {
      if (!dragging) return;
      var now = Date.now();
      var dt  = now - lastT;
      if (dt > 0) {
        // Exponential moving average keeps velocity smooth across jittery frames
        var ivx = (cx - lastCX) / dt;
        var ivy = (cy - lastCY) / dt;
        velX = velX * 0.6 + ivx * 0.4;
        velY = velY * 0.6 + ivy * 0.4;
      }
      lastCX = cx; lastCY = cy; lastT = now;

      var lr = layer.getBoundingClientRect();
      el.style.left = (cx - lr.left - ox) + 'px';
      el.style.top  = (cy - lr.top  - oy) + 'px';
    }

    function end() {
      if (!dragging) return;
      dragging = false;
      el.classList.remove('sticker--dragging');

      // Convert smoothed velocity (px/ms) → px/frame at ~60fps
      var fvx = velX * 16;
      var fvy = velY * 16;
      var speed = Math.sqrt(fvx * fvx + fvy * fvy);
      if (speed < 1) return; // no meaningful throw

      var FRICTION = 0.92; // per frame — fully stops in ~1.5 s
      function throwStep() {
        fvx *= FRICTION;
        fvy *= FRICTION;
        if (Math.sqrt(fvx * fvx + fvy * fvy) < 0.3) { throwRaf = null; return; }
        el.style.left = (parseFloat(el.style.left) + fvx) + 'px';
        el.style.top  = (parseFloat(el.style.top)  + fvy) + 'px';
        throwRaf = requestAnimationFrame(throwStep);
      }
      throwRaf = requestAnimationFrame(throwStep);
    }

    el.addEventListener('mousedown', function (e) {
      e.preventDefault();
      start(e.clientX, e.clientY);
    });
    window.addEventListener('mousemove', function (e) { move(e.clientX, e.clientY); });
    window.addEventListener('mouseup',   end);

    el.addEventListener('touchstart', function (e) {
      var t = e.touches[0];
      start(t.clientX, t.clientY);
    }, { passive: true });
    window.addEventListener('touchmove', function (e) {
      if (!dragging) return;
      var t = e.touches[0];
      move(t.clientX, t.clientY);
    }, { passive: true });
    window.addEventListener('touchend', end);
  }

  /* ── spawn ─────────────────────────────────────────────── */
  function spawnSticker() {
    if (spawned >= MAX) return;

    var text  = TEXTS[textIdx % TEXTS.length];
    textIdx++;

    var color = COLORS[Math.floor(Math.random() * COLORS.length)];
    var rot   = Math.random() * 30 - 15;  // ±15°
    var x     = 8  + Math.random() * 72;  // 8–80 vw
    var y     = 12 + Math.random() * 68;  // 12–80 vh

    var el = document.createElement('div');
    el.className = 'sticker';
    el.textContent = text;
    el.style.background = color;
    el.style.left = x + 'vw';
    el.style.top  = y + 'vh';
    el.style.setProperty('--rot', rot + 'deg');

    layer.appendChild(el);
    spawned++;

    // Trigger pop-in after initial scale(0) is painted
    requestAnimationFrame(function () {
      el.classList.add('sticker--visible');
    });

    // After pop-in, solidify the settled state as inline styles so no
    // animation fill-mode is needed — hover/leave can then take over cleanly.
    el.addEventListener('animationend', function (e) {
      if (e.animationName !== 'sticker-pop') return;
      el.classList.remove('sticker--visible');
      el.classList.add('sticker--settled');
      var rotStr = el.style.getPropertyValue('--rot'); // e.g. "-12.3deg"
      el.style.transform  = 'rotate(' + rotStr + ')';
      el.style.transition = 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
    });

    // Hover: start wiggle
    el.addEventListener('mouseenter', function () {
      if (el.classList.contains('sticker--dragging')) return;
      el.style.transition = 'none'; // prevent transition fighting animation
      el.classList.add('sticker--wiggling');
    });

    // Leave: stop wiggle, ease to a fresh random tilt (mirrors the GSAP settle)
    el.addEventListener('mouseleave', function () {
      el.classList.remove('sticker--wiggling');
      var newRot = Math.random() * 20 - 10;
      el.style.setProperty('--rot', newRot + 'deg');
      el.offsetHeight; // flush so browser sees current position before transition
      el.style.transition = 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
      el.style.transform  = 'rotate(' + newRot + 'deg)';
    });

    makeDraggable(el);
  }

  /* ── schedule ──────────────────────────────────────────── */
  // First sticker: 15s after the layer enters the viewport.
  // Subsequent stickers: every 2 minutes.
  var started = false;

  function startSchedule() {
    if (started) return;
    started = true;
    setTimeout(function tick() {
      spawnSticker();
      if (spawned < MAX) setTimeout(tick, 120000); // 2-min interval
    }, 15000); // 15s delay
  }

  if (window.IntersectionObserver) {
    var io = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) { startSchedule(); io.disconnect(); }
    }, { threshold: 0.1 });
    io.observe(layer);
  } else {
    startSchedule();
  }

}());
