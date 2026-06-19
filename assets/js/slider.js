/* ============================================================
   ШТОЛЛИ — Projects Slider (CSS scroll-snap carousel)
   Native momentum + snap (buttery on touch), IntersectionObserver
   active-tracking, subtle image parallax, progress bar + counter,
   ping-pong autoplay that yields to the user. No deps.
   ============================================================ */
(function () {
  'use strict';

  var slider = document.getElementById('projects-slider');
  var track  = document.getElementById('projects-slider-track');
  if (!slider || !track) return;

  var slides = Array.prototype.slice.call(track.querySelectorAll('.projects-slide'));
  var total  = slides.length;
  if (!total) return;

  var btnPrev  = document.getElementById('slider-prev');
  var btnNext  = document.getElementById('slider-next');
  var dotsWrap = document.getElementById('slider-dots');
  var barFill  = document.getElementById('slider-bar-fill');
  var curEl    = document.getElementById('slider-cur');
  var totalEl  = document.getElementById('slider-total');
  var reduce   = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var current  = 0;
  var pad = function (n) { return ('0' + n).slice(-2); };
  if (totalEl) totalEl.textContent = pad(total);

  /* ---- a11y + parallax headroom ---- */
  slides.forEach(function (s, i) {
    s.setAttribute('role', 'group');
    s.setAttribute('aria-roledescription', 'слайд');
    s.setAttribute('aria-label', (i + 1) + ' из ' + total);
    if (!reduce) { var im = s.querySelector('img'); if (im) im.style.transform = 'scale(1.1)'; }
  });

  /* ---- Dots ---- */
  var dots = [];
  if (dotsWrap) slides.forEach(function (s, i) {
    var d = document.createElement('button');
    d.type = 'button';
    d.className = 'slider-dot';
    d.setAttribute('aria-label', 'Проект ' + (i + 1));
    d.addEventListener('click', function () { stopAuto(); goTo(i); });
    dotsWrap.appendChild(d);
    dots.push(d);
  });

  function slideW() { return track.clientWidth || 1; }

  function goTo(i) {
    i = Math.max(0, Math.min(total - 1, i));
    track.scrollTo({ left: i * slideW(), behavior: reduce ? 'auto' : 'smooth' });
  }

  function setActive(i) {
    if (i === current) return;
    current = i;
    dots.forEach(function (d, idx) { d.classList.toggle('is-active', idx === i); });
    if (curEl)  curEl.textContent = pad(i + 1);
    if (barFill) barFill.style.width = ((i + 1) / total * 100) + '%';
    if (btnPrev) btnPrev.disabled = (i === 0);
    if (btnNext) btnNext.disabled = (i === total - 1);
  }
  setActive(0);

  /* ---- Active-slide detection (robust, no scroll math) ---- */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting && e.intersectionRatio >= 0.55) {
          setActive(slides.indexOf(e.target));
        }
      });
    }, { root: track, threshold: [0.55, 0.8] });
    slides.forEach(function (s) { io.observe(s); });
  }

  /* ---- Arrows + keyboard ---- */
  if (btnPrev) btnPrev.addEventListener('click', function () { stopAuto(); goTo(current - 1); });
  if (btnNext) btnNext.addEventListener('click', function () { stopAuto(); goTo(current + 1); });

  track.setAttribute('tabindex', '0');
  track.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft')  { e.preventDefault(); stopAuto(); goTo(current - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); stopAuto(); goTo(current + 1); }
  });

  /* ---- Subtle image parallax tied to scroll position ---- */
  var rafId = 0;
  function parallax() {
    rafId = 0;
    var tw = slideW();
    var center = track.scrollLeft + tw / 2;
    slides.forEach(function (s, i) {
      var im = s.querySelector('img');
      if (!im) return;
      var d = ((i * tw + tw / 2) - center) / tw;          // -1 … 1
      var x = Math.max(-1, Math.min(1, d)) * -18;
      im.style.transform = 'scale(1.1) translateX(' + x.toFixed(1) + 'px)';
    });
  }
  if (!reduce) {
    track.addEventListener('scroll', function () {
      if (!rafId) rafId = requestAnimationFrame(parallax);
    }, { passive: true });
    parallax();
  }

  /* ---- Ping-pong autoplay; permanently yields after first interaction ---- */
  var autoTimer = null, dir = 1, stopped = false;
  function startAuto() {
    if (reduce || stopped || total < 2) return;
    autoTimer = window.setInterval(function () {
      if (document.hidden) return;
      if (current >= total - 1) dir = -1; else if (current <= 0) dir = 1;
      goTo(current + dir);
    }, 5500);
  }
  function stopAuto() {
    stopped = true;
    if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
  }
  ['pointerdown', 'wheel', 'touchstart'].forEach(function (ev) {
    track.addEventListener(ev, stopAuto, { passive: true, once: true });
  });
  slider.addEventListener('mouseenter', function () { if (autoTimer) { clearInterval(autoTimer); autoTimer = null; } });
  slider.addEventListener('mouseleave', function () { if (!stopped) startAuto(); });

  /* ---- Keep current slide centered on resize ---- */
  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () { track.scrollTo({ left: current * slideW(), behavior: 'auto' }); }, 150);
  }, { passive: true });

  startAuto();
})();
