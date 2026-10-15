/* The homepage CTA A/B test: GA4 events for the variant the head script stamped (<html data-gaid>).
     cta_view   once, when the shown CTA is at least half on screen
     cta_click  on a click on either look (beacon transport: the link opens a new tab, but a beacon
                survives the page going away either way)
   Both carry variant (a|b, the assignment), rendered (a|b, the look actually on screen: today always
   the variant, since B has A's box at every width; kept so a future fallback stays measurable), and
   hdr (yes|no). The user property cta_variant is set in the head.
   GA blocked or absent: gtag is the head's dataLayer shim, or a local one; nothing here throws. */
(function () {
  var d = document.documentElement, v = d.getAttribute('data-gaid');
  if (v !== 'a' && v !== 'b') return;
  var mm = function (q) { try { return window.matchMedia(q).matches; } catch (e) { return false; } };
  var send = function () {
    if (typeof window.gtag === 'function') { window.gtag.apply(window, arguments); return; }
    window.dataLayer = window.dataLayer || []; window.dataLayer.push(arguments);
  };
  function rendered() { var e = document.querySelector('.hero-cta .cta-b'); return e && e.getClientRects().length ? 'b' : 'a'; }
  function params(extra) {
    var p = { variant: v, rendered: rendered(), hdr: mm('(dynamic-range: high)') ? 'yes' : 'no' };
    for (var k in extra) p[k] = extra[k];
    return p;
  }

  var pill = document.querySelector('.hero-cta .hero-pill'), accent = document.querySelector('.hero-cta .cta-b');

  // the booking carries the variant: Cal.com stores UTM params on each booking. utm_content names the
  // look in words that still read months later (a = gradientbut, the pill with the gradient hover;
  // b = glassybut, the HDR button); GA's variant stays a|b. The static
  // href is the plain event link, so a visitor without JS still gets there.
  [pill, accent].forEach(function (el) {
    if (!el) return;
    try {
      var u = new URL(el.href);
      u.searchParams.set('utm_source', 'wordmark.nyc');
      u.searchParams.set('utm_medium', 'homepage_cta');
      u.searchParams.set('utm_campaign', 'booking_ab_2610');
      u.searchParams.set('utm_content', v === 'b' ? 'glassybut' : 'gradientbut');
      el.href = u.toString();
    } catch (e) {}
  });
  [pill, accent].forEach(function (el) {
    if (el) el.addEventListener('click', function () { send('event', 'cta_click', params({ transport_type: 'beacon' })); });
  });

  // the booking modal (js/cta-modal.js) sends its events through these, with the same params
  window.wmCta = { variant: v, params: params, send: send };

  // cta_view: whichever look is displayed when it first crosses half visible
  var viewed = false;
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (viewed || !e.isIntersecting || e.intersectionRatio < 0.5) return;
        if (!e.target.getClientRects().length) return;   // the hidden look
        viewed = true; send('event', 'cta_view', params({})); io.disconnect();
      });
    }, { threshold: [0.5] });
    [pill, accent].forEach(function (el) { if (el) io.observe(el); });
  }

  // B's PQ ground covers the page from the top to the dek's bottom, or to the spill's own bottom when
  // that is lower (in light it reaches 5.6 button heights below the button), so no plane edge meets the sRGB page
  var dek = document.getElementById('dek');
  function ground() {
    var y = window.scrollY, h = 0;
    if (dek) h = dek.getBoundingClientRect().bottom + y;
    if (accent && accent.getClientRects().length) h = Math.max(h, accent.getBoundingClientRect().bottom + y + accent.offsetHeight * 6);
    if (h) d.style.setProperty('--cta-b-ground-h', Math.ceil(h) + 'px');
  }
  if (v === 'b') {
    ground();
    window.addEventListener('resize', ground);
    window.addEventListener('load', ground);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(ground);
  }
})();
