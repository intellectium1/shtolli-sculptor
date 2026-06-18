/* ============================================================
   ШТОЛЛИ — Polish JS
   3D tilt cards · floating CTA reveal · sticky CTA bar
   reading progress · scroll-aware show/hide
   No deps. Touch-aware. Reduced-motion safe.
   ============================================================ */
(function () {
  'use strict';

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints || 0) > 0;

  /* ----- 3D TILT on .service-card[data-tilt] (desktop only, no reduced motion) ----- */
  if (!reduce && !isTouch) {
    document.querySelectorAll('[data-tilt]').forEach(function (el) {
      var maxRot = 6;
      var rafId  = 0;
      var pending = null;

      function onMove(e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width;
        var y = (e.clientY - r.top)  / r.height;
        var rotY = (x - 0.5) *  maxRot * 2;
        var rotX = (0.5 - y) *  maxRot * 2;
        pending = 'perspective(900px) rotateX(' + rotX.toFixed(2) + 'deg) rotateY(' + rotY.toFixed(2) + 'deg) translateZ(0)';
        if (!rafId) rafId = requestAnimationFrame(apply);
      }
      function apply() {
        rafId = 0;
        if (pending) el.style.transform = pending;
        pending = null;
      }
      function reset() {
        cancelAnimationFrame(rafId); rafId = 0;
        el.style.transform = '';
        el.removeAttribute('data-tilted');
      }

      el.addEventListener('mouseenter', function () { el.setAttribute('data-tilted', ''); });
      el.addEventListener('mousemove',  onMove);
      el.addEventListener('mouseleave', reset);
    });
  }

  /* ----- FLOATING CTA + STICKY BAR reveal after user scrolls past hero ----- */
  var floatCta  = document.querySelector('.float-cta');
  var stickyBar = document.querySelector('.sticky-cta-bar');
  var thresholdRevealed = false;
  var stickyDismissed   = sessionStorage.getItem('shtolliStickyDismissed') === '1';

  function onScroll() {
    var revealAt = Math.max(window.innerHeight * 0.6, 400);
    var visible  = window.scrollY > revealAt;
    if (visible !== thresholdRevealed) {
      thresholdRevealed = visible;
      if (floatCta) floatCta.classList.toggle('is-visible', visible);
      if (stickyBar && !stickyDismissed) stickyBar.classList.toggle('is-visible', visible);
    }
    // Reading progress
    if (progressBar) {
      var doc = document.documentElement;
      var max = (doc.scrollHeight - window.innerHeight) || 1;
      var pct = Math.max(0, Math.min(1, window.scrollY / max));
      progressBar.style.width = (pct * 100).toFixed(2) + '%';
    }
  }

  /* ----- READING PROGRESS bar (only on article pages) ----- */
  var progressBar = null;
  var articleBody = document.querySelector('.article-body');
  if (articleBody) {
    progressBar = document.createElement('div');
    progressBar.className = 'reading-progress';
    document.body.appendChild(progressBar);
  }

  /* ----- STICKY bar close button ----- */
  var stickyClose = document.querySelector('.sticky-cta-bar__close');
  if (stickyClose && stickyBar) {
    stickyClose.addEventListener('click', function () {
      stickyBar.classList.remove('is-visible');
      sessionStorage.setItem('shtolliStickyDismissed', '1');
      stickyDismissed = true;
    });
  }

  /* Throttle via rAF */
  var ticking = false;
  window.addEventListener('scroll', function () {
    if (!ticking) {
      window.requestAnimationFrame(function () { onScroll(); ticking = false; });
      ticking = true;
    }
  }, { passive: true });
  onScroll();

  /* ----- IntersectionObserver stagger for testimonials ----- */
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e, i) {
        if (e.isIntersecting) {
          e.target.style.transition = 'opacity 0.7s ease, transform 0.7s cubic-bezier(0.16, 0.84, 0.34, 1)';
          e.target.style.transitionDelay = (i * 0.08) + 's';
          e.target.style.opacity = '1';
          e.target.style.transform = 'translateY(0)';
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.18 });

    document.querySelectorAll('.testimonial-card, .trust-item').forEach(function (el) {
      el.style.opacity = '0';
      el.style.transform = 'translateY(18px)';
      io.observe(el);
    });
  }
})();
