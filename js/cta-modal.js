/* The booking modal: either homepage CTA (A's pill or B's button) opens Cal.com's inline embed of the
   design briefing in a full-viewport dialog (css/cta-modal.css), carrying the same UTM params as the
   links (js/cta-ab.js).

   - Cal.com's official embed snippet, loaded lazily: first hover, focus or touch on a CTA, or the
     click itself. The homepage's load cost does not change.
   - A plain click opens the modal; a modifier or middle click keeps the link's new tab.
   - If embed.js fails to load (blocked) or has not loaded 2.5s after the click, the plain link
     opens in a new tab instead (in this tab if the browser blocks the popup): a click never dies.
   - While open: the page is inert and its scroll is pinned (no rubber-band on iOS, the scrollbar's
     width padded back); Esc, the tint, the close button and the browser's Back all close it; focus
     returns to the CTA.
   - Events: cta_click is js/cta-ab.js's, untouched. Here: cta_modal_open, and cta_booking on Cal's
     bookingSuccessfulV2 with its status only -- never a name or an email.
   Debug: ?caldebug=1 logs every embed event to the console. */
(function () {
  var d = document, root = d.documentElement, cta = window.wmCta;
  var v = root.getAttribute('data-gaid');
  if (!cta || (v !== 'a' && v !== 'b')) return;
  var links = [].slice.call(d.querySelectorAll('.hero-cta .hero-pill, .hero-cta .cta-b'));
  if (!links.length) return;

  var NS = 'wm-briefing', CAL_LINK = 'davis/design-briefing', EMBED = 'https://app.cal.com/embed/embed.js';
  var UTM = { utm_source: 'wordmark.nyc', utm_medium: 'homepage_cta', utm_campaign: 'booking_ab_2610', utm_content: v === 'b' ? 'glassybut' : 'gradientbut' };
  var DEBUG = /[?&]caldebug=1\b/.test(location.search);
  var state = 'idle';            // idle -> loading -> loaded | failed
  var script = null, mounted = false, modal = null, opener = null, open = false, fallbackTimer = 0, lockY = 0, pushed = false, restoreY = -1;

  function theme() { return root.getAttribute('data-gaid-t') === 'light' ? 'light' : 'dark'; }
  function plainLink(from) { return (from || links[0]).href; }   // the UTM-tagged link cta-ab.js wrote

  // ── the embed, lazily ────────────────────────────────────────────────────────────────────────────
  function load() {
    if (state !== 'idle') return;
    state = 'loading';
    /* Cal.com's embed snippet, verbatim (packages/embeds/embed-snippet) */
    (function (C, A, L) { var p = function (a, ar) { a.q.push(ar); }; var d = C.document; C.Cal = C.Cal || function () { var cal = C.Cal; var ar = arguments; if (!cal.loaded) { cal.ns = {}; cal.q = cal.q || []; d.head.appendChild(d.createElement("script")).src = A; cal.loaded = true; } if (ar[0] === L) { var api = function () { p(api, arguments); }; var namespace = ar[1]; api.q = api.q || []; if (typeof namespace === "string") { cal.ns[namespace] = cal.ns[namespace] || api; p(cal.ns[namespace], ar); p(cal, ["initNamespace", namespace]); } else p(cal, ar); return; } p(cal, ar); }; })(window, EMBED, "init");
    window.Cal('init', NS, { origin: 'https://app.cal.com' });
    script = d.querySelector('script[src="' + EMBED + '"]');
    if (script) {
      script.addEventListener('load', function () { state = 'loaded'; clearTimeout(fallbackTimer); });
      script.addEventListener('error', function () { state = 'failed'; if (open) fallback(); });
    }
    var cal = window.Cal.ns[NS];
    cal('ui', { theme: theme(), hideEventTypeDetails: false, layout: 'month_view' });
    cal('on', { action: 'linkReady', callback: function () { if (modal) modal.classList.add('is-ready'); } });
    cal('on', { action: 'linkFailed', callback: function () { if (open) fallback(); } });
    cal('on', { action: 'bookingSuccessfulV2', callback: function (e) {
      var data = (e && e.detail && e.detail.data) || {};
      cta.send('event', 'cta_booking', cta.params({ booking_status: typeof data.status === 'string' ? data.status : 'unknown' }));
    } });
    if (DEBUG) cal('on', { action: '*', callback: function (e) { console.log('[cal embed]', e.detail && e.detail.type, JSON.stringify(e.detail && e.detail.data)); } });
  }
  function mount() {
    if (mounted) return;
    mounted = true;
    var cfg = { theme: theme(), layout: 'month_view', overlayCalendar: 'true' };
    for (var k in UTM) cfg[k] = UTM[k];
    window.Cal.ns[NS]('inline', { elementOrSelector: '#cta-modal-cal', calLink: CAL_LINK, config: cfg });
  }

  // ── the dialog ───────────────────────────────────────────────────────────────────────────────────
  function build() {
    if (modal) return;
    modal = d.createElement('div');
    modal.className = 'cta-modal';
    modal.innerHTML =
      '<div class="cta-modal__tint" data-close></div>' +
      '<div class="cta-modal__panel" role="dialog" aria-modal="true" aria-label="Book a design briefing">' +
        '<div class="cta-modal__bar">' +
          '<button type="button" class="cta-modal__close" aria-label="Close" data-close>' +
            '<svg viewBox="0 0 18 18" aria-hidden="true"><path d="M3 3l12 12M15 3L3 15" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/></svg>' +
          '</button>' +
        '</div>' +
        '<div class="cta-modal__body"><div class="cta-modal__status" aria-hidden="true">Loading the calendar…</div><div id="cta-modal-cal" class="cta-modal__cal"></div></div>' +
      '</div>';
    d.body.appendChild(modal);
    modal.addEventListener('click', function (e) { if (e.target.closest('[data-close]')) close(); });
    // iOS: no scroll chaining from the tint or the bar to the page behind
    modal.addEventListener('touchmove', function (e) { if (!e.target.closest('.cta-modal__body')) e.preventDefault(); }, { passive: false });
  }

  function lock() {
    lockY = window.scrollY;
    var gutter = window.innerWidth - root.clientWidth;          // the scrollbar about to go away
    root.classList.add('cta-modal-lock');                       // keeps its gutter (scrollbar-gutter: stable) where supported
    d.body.style.top = -lockY + 'px';
    if (gutter > 0 && !(window.CSS && CSS.supports('scrollbar-gutter', 'stable'))) d.body.style.paddingRight = gutter + 'px';
    [].forEach.call(d.body.children, function (el) { if (el !== modal) el.inert = true; });
  }
  function unlock() {
    [].forEach.call(d.body.children, function (el) { if (el !== modal) el.inert = false; });
    root.classList.remove('cta-modal-lock');
    d.body.style.top = ''; d.body.style.paddingRight = '';
    window.scrollTo({ top: lockY, left: 0, behavior: 'instant' });
  }

  function openModal(from) {
    if (open) return;
    opener = from; open = true;
    build(); load();
    window.Cal.ns[NS]('ui', { theme: theme() });
    mount();
    // the history entry first: the browser stores the page's scroll with the entry it leaves, and Back
    // (ours on close, or the visitor's) restores it -- it must be the real scroll, not the pinned 0
    try { history.pushState({ wmBooking: 1 }, ''); pushed = true; } catch (e) { pushed = false; }
    lock();
    modal.classList.add('is-open');
    modal.querySelector('.cta-modal__close').focus();
    cta.send('event', 'cta_modal_open', cta.params({}));
    if (state === 'failed') fallback();
    else if (state !== 'loaded') { clearTimeout(fallbackTimer); fallbackTimer = setTimeout(function () { if (open && state !== 'loaded') fallback(); }, 2500); }
  }
  function close(fromPop) {
    if (!open) return;
    open = false; clearTimeout(fallbackTimer);
    modal.classList.remove('is-open');
    unlock();
    if (pushed && !fromPop) { restoreY = lockY; history.back(); }   // the popstate it fires is ours: see below
    pushed = false;
    if (opener) opener.focus({ preventScroll: true });
  }
  function fallback() {
    var url = plainLink(opener);
    close();
    var w = null;
    try { w = window.open(url, '_blank'); } catch (e) {}
    if (w) { try { w.opener = null; } catch (e) {} }
    else location.assign(url);   // a popup blocker said no (the click's activation can expire in 2.5s): go in this tab
  }

  // ── wiring ───────────────────────────────────────────────────────────────────────────────────────
  links.forEach(function (el) {
    ['pointerenter', 'focus', 'touchstart'].forEach(function (t) { el.addEventListener(t, load, { once: true, passive: true }); });
    el.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;   // a new tab, as asked
      e.preventDefault();
      openModal(el);
    });
  });
  d.addEventListener('keydown', function (e) { if (open && e.key === 'Escape') { e.preventDefault(); close(); } });
  window.addEventListener('popstate', function () {
    if (open) { close(true); return; }
    if (restoreY >= 0) { var y = restoreY; restoreY = -1; window.scrollTo({ top: y, left: 0, behavior: 'instant' }); }
  });
})();
