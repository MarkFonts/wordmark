/* The about-page A/B test: GA4 events for the page the head script stamped (<html data-abid>).
     about_view   once, on load: variant (studio|person), page (d|e)
     about_click  on the email link, CV (PDF), any Contact/footer social link, and any outbound link,
                  with variant and target (email, cv, instagram_wordmark, instagram_mark, x, linkedin,
                  github, or the link's hostname); beacon transport, as the homepage's cta_click
   The user property about_variant is set in the head. Names never overlap the homepage CTA test
   (wm-gaid / data-gaid / cta_* / cta_variant).
   GA blocked or absent: gtag is the head's dataLayer shim; nothing here throws. */
(function () {
  var page = document.documentElement.getAttribute('data-abid');
  if (page !== 'd' && page !== 'e') return;
  var variant = page === 'e' ? 'person' : 'studio';
  var send = function () {
    if (typeof window.gtag === 'function') { window.gtag.apply(window, arguments); return; }
    window.dataLayer = window.dataLayer || []; window.dataLayer.push(arguments);
  };

  send('event', 'about_view', { variant: variant, page: page });

  function target(a) {
    var href = a.getAttribute('href') || '';
    if (a.hasAttribute('data-mail') || a.id === 'contact-link' || href.indexOf('mailto:') === 0) return 'email';
    if (/Mark-Davis-CV\.pdf$/.test(href)) return 'cv';
    var u; try { u = new URL(a.href, location.href); } catch (e) { return null; }
    var h = u.hostname.replace(/^www\./, ''), p = u.pathname.toLowerCase();
    if (h === 'instagram.com') return p.indexOf('/markycdavis') === 0 ? 'instagram_mark' : 'instagram_wordmark';
    if (h === 'x.com' || h === 'twitter.com') return 'x';
    if (h === 'linkedin.com') return 'linkedin';
    if (h === 'github.com') return 'github';
    if (u.protocol.indexOf('http') === 0 && u.hostname !== location.hostname) return h;
    return null;   // internal links (../cal-sans/) are not counted
  }

  document.addEventListener('click', function (ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest('a[href]') : null;
    if (!a) return;
    var t = target(a);
    if (t) send('event', 'about_click', { variant: variant, target: t, transport_type: 'beacon' });
  }, true);
})();
