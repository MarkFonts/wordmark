/* Case-study pages: the hero word fit, the axis sliders, the closer-look tabs and the
   feature switches. No dependencies; every demo is live text in the page's own face. */
(function () {
  /* the highlight samples: Cal.com fitted to its card at 700, the heaviest it gets, and the
     Geometry sample pinned to that size, so side by side the two share a baseline */
  var grid = document.querySelector('.hl-grid');
  var word = document.querySelector('.cal-word');
  function fitWord() {
    if (!grid || !word) return;
    var save = { fs: word.style.fontSize, fv: word.style.fontVariationSettings, an: word.style.animation };
    word.style.fontSize = '100px';
    word.style.animation = 'none';
    word.style.fontVariationSettings = "'opsz' 45, 'GEOM' 50, 'wght' 700";
    var range = document.createRange(); range.selectNodeContents(word);
    var w = range.getBoundingClientRect().width;          /* the text run, not the block */
    var box = word.getBoundingClientRect().width;          /* the block spans the card's content width */
    word.style.fontSize = save.fs; word.style.animation = save.an; word.style.fontVariationSettings = save.fv;
    if (w > 0 && box > 0) grid.style.setProperty('--hl-size', Math.max(40, Math.floor(100 * box / w)) + 'px');
  }
  fitWord();
  window.addEventListener('resize', fitWord);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitWord);

  /* six sliders, one font-variation-settings string */
  document.querySelectorAll('[data-axes]').forEach(function (group) {
    var target = document.getElementById(group.dataset.axes);
    var inputs = group.querySelectorAll('input[data-axis]');
    function apply() {
      var parts = [];
      inputs.forEach(function (i) {
        parts.push("'" + i.dataset.axis + "' " + i.value);
        i.parentElement.querySelector('output').textContent = i.value;
      });
      target.style.fontVariationSettings = parts.join(', ');
    }
    inputs.forEach(function (i) { i.addEventListener('input', apply); });
    apply();
  });

  /* a single axis moved through its custom property (the booking card's GEOM) */
  document.querySelectorAll('input[data-var]').forEach(function (i) {
    var target = document.getElementById(i.dataset.target);
    function apply() {
      target.style.setProperty(i.dataset.var, i.value);
      i.parentElement.querySelector('output').textContent = i.value;
    }
    i.addEventListener('input', apply);
    apply();
  });

  /* closer look: tabs on desktop; on phones every feature is simply open */
  var items = document.querySelectorAll('.look-item');
  items.forEach(function (item) {
    var tab = item.querySelector('.look-tab');
    tab.addEventListener('click', function () {
      items.forEach(function (o) {
        var on = o === item;
        o.classList.toggle('is-active', on);
        o.querySelector('.look-tab').setAttribute('aria-expanded', on);
      });
    });
  });

  /* size waterfall: each row says as much as its width allows */
  var FALL = ['A billion meetings by 2030', 'Shall meet', 'Cal'];
  function fitFall() {
    document.querySelectorAll('.d-fall div:not(.mon)').forEach(function (row) {
      var span = row.querySelector('span');
      if (!row.clientWidth) return;
      for (var k = 0; k < FALL.length; k++) {
        span.textContent = FALL[k];
        if (span.getBoundingClientRect().right <= row.getBoundingClientRect().right + 0.5) break;
      }
    });
    /* the monster: as big as the leftover height allows, capped by the row's width */
    var mon = document.querySelector('.d-fall .mon');
    if (!mon || !mon.clientWidth) return;
    var fall = mon.parentElement, used = 0;
    mon.style.fontSize = '100px';
    fall.querySelectorAll('div:not(.mon)').forEach(function (r) { if (r.offsetHeight) used += r.offsetHeight + 6; });
    var span = mon.querySelector('span'), label = mon.querySelector('i');
    var byHeight = fall.clientHeight - used;
    var byWidth = 100 * (mon.clientWidth - span.offsetLeft + mon.offsetLeft) / span.offsetWidth;
    var size = Math.max(96, Math.floor(Math.min(byHeight, byWidth)));
    mon.style.fontSize = size + 'px';
    label.textContent = size;
  }
  fitFall();
  window.addEventListener('resize', fitFall);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitFall);

  /* default spacing: the headline sits at 0 for a while, tracks out to +55 and comes back in */
  var head = document.getElementById('d-headline'), headOut = document.getElementById('d-headline-out');
  if (head) {
    (function step(out) {
      head.classList.toggle('is-out', out);
      headOut.textContent = out ? 'letter-spacing: 0.055em' : 'letter-spacing: 0';
      setTimeout(function () { step(!out); }, out ? 1800 : 2800);
    })(false);
  }

  /* feature switches */
  document.querySelectorAll('.switch').forEach(function (sw) {
    var target = document.getElementById(sw.dataset.target);
    sw.addEventListener('click', function () {
      var on = sw.getAttribute('aria-checked') !== 'true';
      sw.setAttribute('aria-checked', on);
      target.classList.toggle('is-on', on);
    });
  });
})();
