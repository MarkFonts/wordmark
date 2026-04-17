(function () {
  'use strict';

  var wrap  = document.querySelector('.track-wrap');
  var track = document.querySelector('.track');
  if (!wrap || !track) return;

  // Disable the CSS animation — JS drives position instead
  track.style.animation = 'none';

  var px      = 0;      // current translateX (always ≤ 0)
  var vel     = 0;      // current speed px/frame (negative = leftward)
  var target  = 0;      // target speed to ease toward
  var halfW   = 0;      // width of one full logo set (seamless loop point)
  var hovered = false;
  var dragging = false;
  var dragX0  = 0;
  var px0     = 0;

  // Match original 32 s CSS speed; recomputed after measure()
  function normalSpeed() { return halfW > 0 ? -(halfW / (32 * 60)) : -2; }
  var SLOW = -0.15; // px/frame on hover

  function measure() {
    var w = track.scrollWidth / 2;
    if (w > 10) {
      halfW  = w;
      target = normalSpeed();
      vel    = normalSpeed();
    } else {
      setTimeout(measure, 100);
    }
  }

  // Measure after load (SVGs may have been inlined, changing track width)
  window.addEventListener('load', function () { measure(); });
  setTimeout(measure, 300); // fallback for cached pages

  /* ── rAF loop ─────────────────────────────────────────── */
  function tick() {
    requestAnimationFrame(tick);
    if (!halfW) return;

    // Ease velocity toward target (slower ease-in on hover, faster ease-out on leave)
    var k = hovered ? 0.03 : 0.055;
    vel += (target - vel) * k;

    if (!dragging) {
      px += vel;
      if (px <= -halfW) px += halfW;
      if (px > 0)       px -= halfW;
    }

    track.style.transform = 'translateX(' + px.toFixed(2) + 'px)';
  }
  requestAnimationFrame(tick);

  /* ── Hover slow / resume ──────────────────────────────── */
  wrap.addEventListener('mouseenter', function () {
    hovered = true;
    target  = SLOW;
  });
  wrap.addEventListener('mouseleave', function () {
    hovered  = false;
    dragging = false;
    target   = normalSpeed();
  });

  /* ── Drag to scroll (mouse) ───────────────────────────── */
  wrap.addEventListener('mousedown', function (e) {
    dragging = true;
    dragX0   = e.clientX;
    px0      = px;
    e.preventDefault();
  });
  window.addEventListener('mousemove', function (e) {
    if (!dragging) return;
    px = px0 + (e.clientX - dragX0);
    if (px > 0)       px -= halfW;
    if (px < -halfW)  px += halfW;
  });
  window.addEventListener('mouseup', function () {
    dragging = false;
  });

  /* ── Touch ────────────────────────────────────────────── */
  wrap.addEventListener('touchstart', function (e) {
    dragging = true;
    dragX0   = e.touches[0].clientX;
    px0      = px;
  }, { passive: true });
  window.addEventListener('touchmove', function (e) {
    if (!dragging) return;
    px = px0 + (e.touches[0].clientX - dragX0);
    if (px > 0)       px -= halfW;
    if (px < -halfW)  px += halfW;
  }, { passive: true });
  window.addEventListener('touchend', function () { dragging = false; });

}());
