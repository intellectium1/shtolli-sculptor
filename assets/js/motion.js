/* ============================================================
   ШТОЛЛИ — Motion layer (GSAP + Lenis)
   Owns: preloader, smooth scroll, cinematic hero, scroll
   reveals, parallax, marquee, counters, magnetic buttons,
   project hover preview.
   Degrades safely: reduced-motion or missing libraries ->
   content is shown statically (see base.css .motion-off).
   ============================================================ */
(function () {
  'use strict';

  var ns   = (window.Shtolli = window.Shtolli || {});
  var docEl = document.documentElement;
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  var reduce   = docEl.classList.contains('reduce-motion');
  var hasGSAP  = typeof window.gsap !== 'undefined';
  var hasLenis = typeof window.Lenis !== 'undefined';
  var hasST    = hasGSAP && typeof window.ScrollTrigger !== 'undefined';
  var hasSplit = hasGSAP && typeof window.SplitText !== 'undefined';

  var navH = function () { var n = $('#nav'); return (n ? n.offsetHeight : 74); };
  var ease = function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); };

  /* ---------- Counters (works with or without GSAP) ---------- */
  function setCountersFinal() {
    $$('[data-count]').forEach(function (el) {
      var end = parseFloat(el.getAttribute('data-count')) || 0;
      var dec = parseInt(el.getAttribute('data-count-decimals'), 10) || 0;
      el.textContent = end.toLocaleString('ru-RU', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    });
  }

  /* ---------- Preloader ---------- */
  function dismissPreloader(done) {
    var pl = $('#preloader');
    if (!pl) { if (done) done(); return; }
    pl.classList.add('is-done');
    window.setTimeout(function () { pl.style.display = 'none'; }, reduce ? 0 : 760);
    if (done) done();
  }

  /* =========================================================
     STATIC PATH — reduced motion or libraries unavailable
     ========================================================= */
  if (reduce || !hasGSAP || !hasST) {
    if (!hasGSAP || !hasST) docEl.classList.add('motion-off');
    setCountersFinal();
    dismissPreloader();
    return;
  }

  /* =========================================================
     MOTION PATH
     ========================================================= */
  gsap.registerPlugin(ScrollTrigger);
  if (hasSplit) gsap.registerPlugin(SplitText);

  /* ---------- Smooth scroll (Lenis driven by gsap.ticker) ---------- */
  var lenis = null;
  if (hasLenis) {
    lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1, smoothWheel: true });
    ns.lenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  /* ---------- In-page anchor smooth scroll through Lenis ---------- */
  function initAnchors() {
    if (!lenis) return; // native + scroll-margin-top handles the rest
    $$('a[href^="#"]').forEach(function (a) {
      var href = a.getAttribute('href');
      if (!href || href.length < 2) return;
      var target = document.getElementById(href.slice(1));
      if (!target) return;
      a.addEventListener('click', function (e) {
        e.preventDefault();
        lenis.scrollTo(target, { offset: -navH(), duration: 1.15, easing: ease });
      });
    });
  }

  /* ---------- Cinematic hero (runs after preloader uncovers) ---------- */
  function playHero() {
    var hero    = $('.hero');
    if (!hero) return;
    var eyebrow = $('.eyebrow', hero);
    var title   = $('.hero__title', hero);
    var lead    = $('.hero__lead', hero);
    var actions = $('.hero__actions', hero);
    var mainClip   = $('.hero__main .reveal-clip', hero);
    var mainImg    = $('.hero__main img', hero);
    var detailClip = $('.hero__detail .reveal-clip', hero);

    var tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    if (eyebrow) { gsap.set(eyebrow, { y: 24, autoAlpha: 0 }); }
    if (lead)    { gsap.set(lead, { y: 26, autoAlpha: 0 }); }
    if (actions) { gsap.set(actions, { y: 26, autoAlpha: 0 }); }

    // Title: SplitText lines with mask; fallback to a simple fade-up.
    var split = null;
    if (title && hasSplit) {
      gsap.set(title, { autoAlpha: 1 });
      split = SplitText.create(title, { type: 'lines', mask: 'lines', linesClass: 'hero-line' });
      gsap.set(split.lines, { yPercent: 116 });
    } else if (title) {
      gsap.set(title, { autoAlpha: 0, y: 30 });
    }

    if (mainClip) gsap.set(mainClip, { clipPath: 'inset(0 0 100% 0)' });
    if (detailClip) gsap.set(detailClip, { clipPath: 'inset(0 0 100% 0)' });

    if (mainClip) tl.to(mainClip, { clipPath: 'inset(0 0 0% 0)', duration: 1.3, ease: 'expo.out' }, 0.1);
    if (mainImg)  tl.from(mainImg, { scale: 1.14, duration: 1.5, ease: 'expo.out' }, 0.1);
    if (eyebrow)  tl.to(eyebrow, { y: 0, autoAlpha: 1, duration: 0.7 }, 0.25);
    if (split)    tl.to(split.lines, { yPercent: 0, duration: 1.05, stagger: 0.11,
                          onComplete: function () { split.revert(); } }, 0.3);
    else if (title) tl.to(title, { y: 0, autoAlpha: 1, duration: 0.9 }, 0.3);
    if (lead)     tl.to(lead, { y: 0, autoAlpha: 1, duration: 0.8 }, '-=0.7');
    if (actions)  tl.to(actions, { y: 0, autoAlpha: 1, duration: 0.8 }, '-=0.65');
    if (detailClip) tl.to(detailClip, { clipPath: 'inset(0 0 0% 0)', duration: 1.1, ease: 'expo.out' }, 0.55);
  }

  /* ---------- Scroll-driven batch reveal (everything but hero) ---------- */
  function initReveals() {
    var targets = $$('[data-reveal]').filter(function (el) { return !el.closest('.hero'); });
    if (!targets.length) return;
    gsap.set(targets, { autoAlpha: 0, y: 40 });
    ScrollTrigger.batch(targets, {
      start: 'top 86%',
      once: true,
      interval: 0.1,
      batchMax: 5,
      onEnter: function (batch) {
        gsap.to(batch, {
          autoAlpha: 1, y: 0, duration: 0.85, ease: 'power3.out', stagger: 0.09, overwrite: true,
          onComplete: function () { gsap.set(batch, { clearProps: 'willChange' }); }
        });
      }
    });
  }

  /* ---------- Clip-path image reveals (about photo etc.) ---------- */
  function initClipReveals() {
    var clips = $$('[data-reveal-clip]').filter(function (el) { return !el.closest('.hero'); });
    clips.forEach(function (el) {
      gsap.set(el, { clipPath: 'inset(0 0 100% 0)' });
      var img = $('img', el);
      var tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 85%', once: true } });
      tl.to(el, { clipPath: 'inset(0 0 0% 0)', duration: 1.2, ease: 'expo.out' }, 0);
      if (img) tl.from(img, { scale: 1.12, duration: 1.4, ease: 'expo.out' }, 0);
    });
  }

  /* ---------- Layered parallax (scrub, compositor-friendly) ---------- */
  function initParallax() {
    $$('[data-parallax]').forEach(function (el) {
      var v = parseFloat(el.getAttribute('data-parallax')) || 0;
      if (!v) return;
      var range = v * 55; // gentle
      gsap.fromTo(el, { yPercent: range }, {
        yPercent: -range, ease: 'none',
        scrollTrigger: {
          trigger: el.closest('section') || el,
          start: 'top bottom', end: 'bottom top',
          scrub: 1.2, invalidateOnRefresh: true
        }
      });
    });
  }

  /* ---------- Seamless marquee ---------- */
  function initMarquee() {
    var track = $('#marquee-track');
    if (!track) return;
    var group = $('.marquee__group', track);
    if (!group) return;
    var clone = group.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    track.appendChild(clone);
    gsap.set(track, { willChange: 'transform' });
    var anim = gsap.to(track, { xPercent: -50, duration: 26, ease: 'none', repeat: -1 });
    ScrollTrigger.create({
      trigger: '.marquee', start: 'top bottom', end: 'bottom top',
      onEnter: function () { anim.play(); }, onLeave: function () { anim.pause(); },
      onEnterBack: function () { anim.play(); }, onLeaveBack: function () { anim.pause(); }
    });
  }

  /* ---------- Animated counters ---------- */
  function initCounters() {
    $$('[data-count]').forEach(function (el) {
      var end = parseFloat(el.getAttribute('data-count')) || 0;
      var dec = parseInt(el.getAttribute('data-count-decimals'), 10) || 0;
      var snap = gsap.utils.snap(dec === 0 ? 1 : Math.pow(0.1, dec));
      var proxy = { v: 0 };
      var fmt = function (n) { return n.toLocaleString('ru-RU', { minimumFractionDigits: dec, maximumFractionDigits: dec }); };
      gsap.to(proxy, {
        v: end, duration: 1.8, ease: 'power2.out',
        onUpdate: function () { el.textContent = fmt(snap(proxy.v)); },
        onComplete: function () { el.textContent = fmt(end); },
        scrollTrigger: { trigger: el, start: 'top 88%', once: true }
      });
    });
  }

  /* ---------- Magnetic buttons (pointer-fine only) ---------- */
  function initMagnetic() {
    if (navigator.maxTouchPoints > 0 || window.matchMedia('(hover: none)').matches) return;
    $$('[data-magnetic]').forEach(function (btn) {
      var xTo = gsap.quickTo(btn, 'x', { duration: 0.4, ease: 'power3.out' });
      var yTo = gsap.quickTo(btn, 'y', { duration: 0.4, ease: 'power3.out' });
      btn.addEventListener('mousemove', function (e) {
        var r = btn.getBoundingClientRect();
        xTo((e.clientX - (r.left + r.width / 2)) * 0.3);
        yTo((e.clientY - (r.top + r.height / 2)) * 0.3);
      });
      btn.addEventListener('mouseleave', function () {
        gsap.to(btn, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.45)' });
      });
    });
  }

  /* ---------- Featured-project cursor-follow preview ---------- */
  function initProjectPreview() {
    if (window.matchMedia('(hover: none)').matches) return;
    var preview = $('#project-preview');
    var img = $('#project-preview-img');
    var rows = $$('.project-row[data-preview]');
    if (!preview || !img || !rows.length) return;

    gsap.set(preview, { xPercent: -50, yPercent: -50, scale: 0.92, autoAlpha: 0 });
    var xTo = gsap.quickTo(preview, 'x', { duration: 0.55, ease: 'power3.out' });
    var yTo = gsap.quickTo(preview, 'y', { duration: 0.4, ease: 'power3.out' });
    function move(e) { xTo(e.clientX); yTo(e.clientY); }

    rows.forEach(function (row) {
      row.addEventListener('mouseenter', function () {
        var src = row.getAttribute('data-preview');
        if (src && img.getAttribute('src') !== src) img.setAttribute('src', src);
        gsap.to(preview, { autoAlpha: 1, scale: 1, duration: 0.35, ease: 'power2.out' });
        window.addEventListener('mousemove', move);
      });
      row.addEventListener('mouseleave', function () {
        gsap.to(preview, { autoAlpha: 0, scale: 0.92, duration: 0.25, ease: 'power2.in' });
        window.removeEventListener('mousemove', move);
      });
    });
  }

  /* ---------- Boot ---------- */
  function boot() {
    initAnchors();
    initReveals();
    initClipReveals();
    initParallax();
    initMarquee();
    initCounters();
    initMagnetic();
    initProjectPreview();

    // Recalculate trigger positions once fonts + media settle.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
    }
    window.addEventListener('load', function () { ScrollTrigger.refresh(); });
  }

  // Build scroll machinery immediately, then run preloader + hero.
  boot();

  function start() {
    // Drive the bronze-pour preloader, then uncover + play hero.
    var fill = $('#preloader-fill');
    var bar  = $('#preloader-bar');
    var tl = gsap.timeline({
      onComplete: function () {
        dismissPreloader(playHero);
        ScrollTrigger.refresh();
      }
    });
    if (fill) tl.to(fill, { clipPath: 'inset(0% 0 0 0)', duration: 0.95, ease: 'power2.out' }, 0);
    if (bar)  tl.to(bar, { width: '100%', duration: 0.95, ease: 'power1.inOut' }, 0);
    if (!fill && !bar) { dismissPreloader(playHero); }
  }

  // Kick the preloader after first paint.
  if (document.readyState === 'complete') { start(); }
  else { window.addEventListener('DOMContentLoaded', function () { requestAnimationFrame(start); }); }

})();
