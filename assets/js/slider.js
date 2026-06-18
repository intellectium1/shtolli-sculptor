/* ============================================================
   ШТОЛЛИ — Projects Slider
   Touch / drag / keyboard / dots. No deps.
   ============================================================ */
(function () {
  'use strict';

  var slider  = document.querySelector('.projects-slider');
  var track   = document.getElementById('projects-slider-track');
  if (!slider || !track) return;

  var slides       = track.querySelectorAll('.projects-slide');
  var dotsWrap     = document.getElementById('slider-dots');
  var btnPrev      = document.getElementById('slider-prev');
  var btnNext      = document.getElementById('slider-next');
  var total        = slides.length;
  var current      = 0;
  var startX       = 0;
  var dragX        = 0;
  var isDragging   = false;
  var dots         = [];

  /* ---- Dots ---- */
  for (var i = 0; i < total; i++) {
    var dot = document.createElement('button');
    dot.type      = 'button';
    dot.className = 'slider-dot';
    dot.setAttribute('aria-label', 'Проект ' + (i + 1));
    dot.dataset.index = i;
    dot.addEventListener('click', onDotClick);
    if (dotsWrap) dotsWrap.appendChild(dot);
    dots.push(dot);
  }
  refreshDots();

  function onDotClick(e) { goTo(+e.currentTarget.dataset.index); }

  function refreshDots() {
    dots.forEach(function (d, i) { d.classList.toggle('is-active', i === current); });
  }

  function goTo(idx, skipAnim) {
    current = ((idx % total) + total) % total;
    if (skipAnim) track.classList.add('no-transition');
    track.style.transform = 'translateX(-' + current * 100 + '%)';
    if (skipAnim) requestAnimationFrame(function () { track.classList.remove('no-transition'); });
    refreshDots();
    updateArrows();
  }

  function updateArrows() {
    /* Slider is circular — arrows always enabled, just style them */
  }

  if (btnPrev) btnPrev.addEventListener('click', function () { goTo(current - 1); });
  if (btnNext) btnNext.addEventListener('click', function () { goTo(current + 1); });

  /* ---- Keyboard ---- */
  slider.setAttribute('tabindex', '0');
  slider.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft')  { e.preventDefault(); goTo(current - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); goTo(current + 1); }
  });

  /* ---- Touch / Mouse drag ---- */
  function startDrag(x) {
    startX    = x;
    dragX     = 0;
    isDragging = true;
    slider.classList.add('is-dragging');
    track.classList.add('no-transition');
  }

  function moveDrag(x) {
    if (!isDragging) return;
    dragX = x - startX;
    track.style.transform = 'translateX(calc(-' + current * 100 + '% + ' + dragX + 'px))';
  }

  function endDrag() {
    if (!isDragging) return;
    isDragging = false;
    slider.classList.remove('is-dragging');
    track.classList.remove('no-transition');
    var threshold = slider.offsetWidth * 0.18;
    if (Math.abs(dragX) > threshold) {
      goTo(dragX < 0 ? current + 1 : current - 1);
    } else {
      goTo(current);
    }
    dragX = 0;
  }

  /* Mouse */
  slider.addEventListener('mousedown',  function (e) { startDrag(e.clientX); });
  window.addEventListener('mousemove',  function (e) { if (isDragging) { e.preventDefault(); moveDrag(e.clientX); } });
  window.addEventListener('mouseup',    endDrag);

  /* Touch */
  slider.addEventListener('touchstart', function (e) { startDrag(e.touches[0].clientX); }, { passive: true });
  slider.addEventListener('touchmove',  function (e) { if (isDragging) moveDrag(e.touches[0].clientX); }, { passive: true });
  slider.addEventListener('touchend',   endDrag);
  slider.addEventListener('touchcancel', endDrag);

  /* Auto-advance */
  var autoTimer = setInterval(function () {
    if (!isDragging && !document.hidden) goTo(current + 1);
  }, 5000);

  slider.addEventListener('mouseenter', function () { clearInterval(autoTimer); });
  slider.addEventListener('mouseleave', function () {
    clearInterval(autoTimer);
    autoTimer = setInterval(function () { if (!isDragging && !document.hidden) goTo(current + 1); }, 5000);
  });

  goTo(0, true);
})();
