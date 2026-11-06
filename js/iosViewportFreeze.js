/* iosViewportFreeze.js -- while an editable has the keyboard on iOS, viewport units stay what they were.
 *
 * Chrome on iPhone resizes the layout viewport with the keyboard: vh, svh, dvh, lvh, and innerHeight
 * all went 817 to 435 on Mark's phone, so the blocks sized in them shrank and the type tester went
 * off the top by 566pt with scrollY at 0. No scroll means iosFocusGuard has nothing to put back, and
 * no choice of unit in CSS can stop it. iPhone Safari keeps its layout viewport, so this writes
 * values equal to what it already had and nothing moves.
 *
 * At the touch or focus on an editable it measures 1vh and 1svh and sets --frozen-vh, --frozen-svh
 * on <html>, and window.wmFrozenInnerHeight. Rules use them as `calc(70 * var(--frozen-vh, 1vh))`,
 * so with the variables unset (nothing focused, off iOS) the layout is what it always was.
 * Released once focus is gone and the viewport is back; a difference between the old and new
 * values (the toolbars changed meanwhile) is scrolled away, so the editable stays where it is.
 * A rotation while focused re-measures: the frozen values stop describing the screen, and the
 * release later takes up the difference the same way. */
(function () {
  var ua = navigator.userAgent;
  if (!(/iP(hone|ad|od)/.test(ua) || (/Mac/.test(ua) && navigator.maxTouchPoints > 1))) return;

  var EDITABLE = 'textarea, [contenteditable]:not([contenteditable="false"]), input:not([type="range"], [type="checkbox"], [type="radio"], [type="button"], [type="submit"], [type="reset"], [type="file"], [type="color"])';
  var KEYBOARD_GONE = 0.8, BLUR_MIN_MS = 300, QUIET_MS = 150, ROTATED_MS = 800, GIVE_UP_MS = 1500, NO_FOCUS_MS = 700;
  var root = document.documentElement;
  var frozen = null, anchor = null, poll = 0, noFocus = 0, rotating = 0, lastResize = 0;

  var editable = function (el) { return el && el.closest ? el.closest(EDITABLE) : null; };
  var focused = function () { return !!editable(document.activeElement); };

  function unit(name) {   /* 1 of the unit in px, unrounded so calc(70 * it) lands where 70 of the unit did */
    var d = document.createElement('div');
    d.style.cssText = 'position:fixed;top:0;left:0;width:0;visibility:hidden;pointer-events:none;height:100' + name;
    root.appendChild(d);
    var h = d.getBoundingClientRect().height;
    d.remove();
    return h / 100;
  }
  function measure() {
    root.style.setProperty('--frozen-vh', unit('vh') + 'px');
    root.style.setProperty('--frozen-svh', unit('svh') + 'px');
    window.wmFrozenInnerHeight = window.innerHeight;
  }
  function stopTimers() { clearInterval(poll); clearTimeout(noFocus); poll = noFocus = 0; }

  function freeze(el) {
    anchor = el;
    stopTimers();
    if (frozen) return;
    measure();
    frozen = { innerHeight: window.innerHeight, width: window.innerWidth, rotated: false };
  }
  function release() {
    stopTimers();
    clearTimeout(rotating);
    if (!frozen) return;
    var held = anchor && anchor.isConnected ? anchor.getBoundingClientRect().top : null;
    root.style.removeProperty('--frozen-vh');
    root.style.removeProperty('--frozen-svh');
    window.wmFrozenInnerHeight = 0;
    frozen = null;
    if (held === null) return;
    var moved = anchor.getBoundingClientRect().top - held;
    if (Math.abs(moved) >= 0.5) window.scrollBy({ top: moved, behavior: 'instant' });
  }
  /* Focus goes before the keyboard does, so wait for the viewport to come back and sit still. */
  function releaseWhenSettled() {
    clearInterval(poll);
    var from = performance.now();
    poll = setInterval(function () {
      if (focused()) { clearInterval(poll); poll = 0; return; }
      var t = performance.now(), waited = t - from;
      var back = frozen && !frozen.rotated && window.innerHeight >= frozen.innerHeight * KEYBOARD_GONE
        && waited >= BLUR_MIN_MS && t - lastResize >= QUIET_MS;
      if (back || waited >= (frozen && frozen.rotated ? ROTATED_MS : GIVE_UP_MS)) release();
    }, 50);
  }

  var capture = { capture: true, passive: true };
  document.addEventListener('touchstart', function (e) {
    var el = e.touches.length === 1 && editable(e.target);
    if (el) freeze(el);
  }, capture);
  document.addEventListener('touchmove', function () { if (frozen && !focused()) release(); }, capture);   /* a scroll that began on the text */
  document.addEventListener('touchend', function () {
    if (!frozen || focused()) return;
    clearTimeout(noFocus);
    noFocus = setTimeout(function () { if (!focused()) release(); }, NO_FOCUS_MS);   /* a tap that took no focus */
  }, capture);
  document.addEventListener('touchcancel', function () { if (frozen && !focused()) release(); }, capture);
  document.addEventListener('focusin', function (e) {
    var el = editable(e.target);
    if (el) freeze(el); else if (frozen) releaseWhenSettled();
  }, true);
  document.addEventListener('focusout', function () { if (frozen) releaseWhenSettled(); }, true);
  window.addEventListener('resize', function () {
    lastResize = performance.now();
    if (!frozen || window.innerWidth === frozen.width) return;
    frozen.width = window.innerWidth;
    frozen.rotated = true;
    clearTimeout(rotating);
    rotating = setTimeout(function () {
      if (!frozen) return;
      measure();
      window.dispatchEvent(new Event('resize'));   /* what reads wmFrozenInnerHeight refits */
    }, 300);
  });
})();
