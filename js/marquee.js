/* marquee.js -- builds the track for every .pill[data-marquee] (css/marquee.css has the design
   note). The label stays in the DOM as .mq-lab (the accessible text); the track is aria-hidden. */
(function () {
  var pills = document.querySelectorAll('.pill[data-marquee]');
  if (!pills.length) return;
  pills.forEach(function (p) {
    var arrowEl = p.querySelector('.arrow');
    var arrow = arrowEl ? arrowEl.textContent : '';
    var label = p.textContent.replace(arrow, '').trim();
    p.innerHTML = '';
    var lab = document.createElement('span'); lab.className = 'mq-lab';
    lab.textContent = label + (arrow ? ' ' : '');
    if (arrow) { var a0 = document.createElement('span'); a0.className = 'arrow'; a0.setAttribute('aria-hidden', 'true'); a0.textContent = arrow; lab.appendChild(a0); }
    p.appendChild(lab);
    var track = document.createElement('span'); track.className = 'mq-track'; track.setAttribute('aria-hidden', 'true');
    /* three identical runs; the anchor is the first copy of the middle run, so there is a run's
       worth of copies on either side however the track moves */
    for (var k = 0; k < 3; k++) {
      var run = document.createElement('span'); run.className = 'mq-run';
      for (var i = 0; i < 5; i++) {
        var s = document.createElement('span');
        s.textContent = label + (arrow ? ' ' : '');
        if (arrow) { var a = document.createElement('span'); a.className = 'arrow'; a.textContent = arrow; s.appendChild(a); }
        if (k === 1 && i === 0) s.className = 'anchor';
        run.appendChild(s);
      }
      track.appendChild(run);
    }
    p.appendChild(track);
    p.__lab = lab; p.__track = track;
    var out = 0;
    p.addEventListener('pointerenter', function () {
      clearTimeout(out);
      track.style.transition = ''; track.style.transform = ''; track.style.animation = '';   /* restarts at rest */
      p.classList.remove('is-out'); p.classList.add('is-on');
    });
    p.addEventListener('pointerleave', function () {
      var m = new DOMMatrixReadOnly(getComputedStyle(track).transform), tx = m.m41;
      track.style.animation = 'none'; track.style.transform = 'translateX(' + tx + 'px)';
      var labMid = lab.getBoundingClientRect().left + lab.offsetWidth / 2;
      var dir = +getComputedStyle(p).getPropertyValue('--mq-dir') || 1;
      var copies = [].slice.call(track.querySelectorAll('.mq-run > span'));
      var pitch = copies.length > 1 ? Math.abs(copies[1].getBoundingClientRect().left - copies[0].getBoundingClientRect().left) : 0;
      var passed = null, approaching = null, pe = Infinity, ae = Infinity;
      copies.forEach(function (c) {
        c.classList.remove('landing');
        var r = c.getBoundingClientRect(), d = (r.left + r.width / 2) - labMid, e = d * dir;
        if (e >= -1 && e < pe) { pe = e; passed = c; }
        if (e < -1 && -e < ae) { ae = -e; approaching = c; }
      });
      var landing = (approaching && ae <= 0.10 * pitch) ? approaching : passed;
      var best = landing ? ((landing.getBoundingClientRect().left + landing.offsetWidth / 2) - labMid) : 0;
      if (landing) landing.classList.add('landing');
      p.classList.remove('is-on'); p.classList.add('is-out');
      void track.offsetWidth;
      track.style.transition = 'transform .38s cubic-bezier(.2, .8, .2, 1)';
      track.style.transform = 'translateX(' + (tx - best) + 'px)';
      out = setTimeout(function () {
        /* the silent reset: the landed picture equals the rest state one pitch over, so the swap
           happens with every transition off */
        copies.forEach(function (c) { c.style.transition = 'none'; c.classList.remove('landing'); });
        track.style.transition = 'none'; track.style.transform = ''; track.style.animation = '';
        p.classList.remove('is-out');
        void track.offsetWidth;
        requestAnimationFrame(function () { copies.forEach(function (c) { c.style.transition = ''; }); track.style.transition = ''; });
      }, 400);
    });
  });
  /* the anchor copy's centre meets the label's centre: that translate is the rest state */
  function measure() {
    pills.forEach(function (p) {
      var t = p.__track, a = t.querySelector('.anchor'), lab = p.__lab, run = t.querySelector('.mq-run');
      var labMid = lab.offsetLeft + lab.offsetWidth / 2, aMid = a.offsetLeft + a.offsetWidth / 2;
      p.style.setProperty('--mq-x0', (labMid - aMid).toFixed(2) + 'px');
      p.style.setProperty('--mq-runw', run.getBoundingClientRect().width.toFixed(2) + 'px');
    });
  }
  measure();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  addEventListener('resize', measure);
})();
