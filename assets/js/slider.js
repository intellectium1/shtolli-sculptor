/* ============================================================
   ШТОЛЛИ — Projects Slider
   Robust touch/drag with axis-lock + edge rubber-band.
   Non-circular (no fly-back), keyboard + dots, ping-pong auto.
   No deps.
   ============================================================ */
(function () {
  'use strict';

  var slider = document.querySelector('.projects-slider');
  var track  = document.getElementById('projects-slider-track');
  if (!slider || !track) return;

  var slides   = track.querySelectorAll('.projects-slide');
  var dotsWrap = document.getElementById('slider-dots');
  var btnPrev  = document.getElementById('slider-prev');
  var btnNext  = document.getElementById('slider-next');
  var total    = slides.length;
  var current  = 0;
  var dots     = [];
  var reduce   = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- Dots ---- */
  for (var i = 0; i < total; i++) {
    var dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'slider-dot';
    dot.setAttribute('aria-label', 'Проект ' + (i + 1));
    dot.dataset.index = i;
    dot.addEventListener('click', function (e) { stopAuto(); goTo(+e.currentTarget.dataset.index); });
    if (dotsWrap) dotsWrap.appendChild(dot);
    dots.push(dot);
  }

  function clamp(i) { return Math.max(0, Math.min(total - 1, i)); }

  function goTo(idx, instant) {
    current = clamp(idx);
    if (instant) track.classList.add('no-transition');
    track.style.transform = 'translateX(' + (-current * 100) + '%)';
    if (instant) { void track.offsetWidth; track.classList.remove('no-transition'); }
    refreshDots();
    updateArrows();
  }

  function refreshDots() {
    dots.forEach(function (d, i) { d.classList.toggle('is-active', i === current); });
  }

  function updateArrows() {
    if (btnPrev) btnPrev.disabled = (current === 0);
    if (btnNext) btnNext.disabled = (current === total - 1);
  }

  if (btnPrev) btnPrev.addEventListener('click', function () { stopAuto(); goTo(current - 1); });
  if (btnNext) btnNext.addEventListener('click', function () { stopAuto(); goTo(current + 1); });

  /* ---- Keyboard ---- */
  slider.setAttribute('tabindex', '0');
  slider.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft')  { e.preventDefault(); stopAuto(); goTo(current - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); stopAuto(); goTo(current + 1); }
  });

  /* ---- Drag (touch + mouse) with axis lock & rubber-band ---- */
  var dragging = false, decided = false, horizontal = false, didDrag = false;
  var startX = 0, startY = 0, dx = 0, width = 1, rafId = 0;

  function down(x, y) {
    dragging = true; decided = false; horizontal = false; didDrag = false;
    startX = x; startY = y; dx = 0;
    width = slider.offsetWidth || 1;
  }

  /* Returns true when the gesture is a horizontal swipe we own
     (caller should preventDefault to block vertical scroll hijack). */
  function move(x, y) {
    if (!dragging) return false;
    var mdx = x - startX, mdy = y - startY;
    if (!decided) {
      if (Math.abs(mdx) < 6 && Math.abs(mdy) < 6) return false; // wait for intent
      decided = true;
      horizontal = Math.abs(mdx) > Math.abs(mdy);
      if (horizontal) { slider.classList.add('is-dragging'); track.classList.add('no-transition'); }
    }
    if (!horizontal) return false; // vertical → let the page scroll
    dx = mdx;
    if (Math.abs(dx) > 4) didDrag = true;
    // resistance when pulling past the first/last slide
    if ((current === 0 && dx > 0) || (current === total - 1 && dx < 0)) dx *= 0.32;
    if (!rafId) rafId = requestAnimationFrame(apply);
    return true;
  }

  function apply() {
    rafId = 0;
    track.style.transform = 'translateX(calc(' + (-current * 100) + '% + ' + dx + 'px))';
  }

  function up() {
    if (!dragging) return;
    dragging = false;
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    slider.classList.remove('is-dragging');
    track.classList.remove('no-transition');
    if (horizontal) {
      var threshold = width * 0.18;
      if (dx <= -threshold)      goTo(current + 1);
      else if (dx >= threshold)  goTo(current - 1);
      else                       goTo(current);
    }
    dx = 0; decided = false; horizontal = false;
  }

  /* Touch — passive:false on move so we can block vertical scroll only
     once a horizontal swipe is confirmed. */
  slider.addEventListener('touchstart', function (e) {
    stopAuto();
    down(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });

  slider.addEventListener('touchmove', function (e) {
    if (move(e.touches[0].clientX, e.touches[0].clientY) && e.cancelable) e.preventDefault();
  }, { passive: false });

  slider.addEventListener('touchend', up);
  slider.addEventListener('touchcancel', up);

  /* Mouse (desktop drag) */
  slider.addEventListener('mousedown', function (e) { stopAuto(); down(e.clientX, e.clientY); });
  window.addEventListener('mousemove', function (e) { if (dragging && move(e.clientX, e.clientY)) e.preventDefault(); });
  window.addEventListener('mouseup', up);
  /* Don't fire a phantom click after a drag */
  slider.addEventListener('click', function (e) {
    if (didDrag) { e.preventDefault(); e.stopPropagation(); }
  }, true);

  /* ---- Auto-advance: ping-pong, stops on first interaction ---- */
  var autoTimer = null, autoDir = 1, userInteracted = false;

  function startAuto() {
    if (reduce || userInteracted || total < 2) return;
    autoTimer = setInterval(function () {
      if (document.hidden || dragging) return;
      if (current >= total - 1) autoDir = -1;
      else if (current <= 0)    autoDir = 1;
      goTo(current + autoDir);
    }, 5500);
  }

  function stopAuto() {
    userInteracted = true;
    if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
  }

  slider.addEventListener('mouseenter', function () {
    if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
  });
  slider.addEventListener('mouseleave', function () { if (!userInteracted) startAuto(); });

  /* ---- Boot ---- */
  goTo(0, true);
  startAuto();
})();
