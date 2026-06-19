/* ============================================================
   ШТОЛЛИ — UI interactions
   No animation library required. Runs in every mode (incl.
   reduced-motion and library-load failure). Owns: nav state,
   mobile menu, lightbox, contact form, scroll locking.
   ============================================================ */
(function () {
  'use strict';

  var ns = (window.Shtolli = window.Shtolli || {});
  var $  = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  /* ---------- Scroll lock (delegates to Lenis when present) ---------- */
  var locks = 0;
  ns.lockScroll = function () {
    locks++;
    if (ns.lenis && ns.lenis.stop) ns.lenis.stop();
    else document.body.style.overflow = 'hidden';
  };
  ns.unlockScroll = function () {
    locks = Math.max(0, locks - 1);
    if (locks > 0) return;
    if (ns.lenis && ns.lenis.start) ns.lenis.start();
    else document.body.style.overflow = '';
  };

  /* ---------- Focus trap ---------- */
  var FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),' +
                  'select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

  function createFocusTrap(container, opts) {
    opts = opts || {};
    function focusables() {
      return $$(FOCUSABLE, container).filter(function (el) {
        return el.offsetParent !== null || el === document.activeElement;
      });
    }
    function onKeydown(e) {
      if (e.key === 'Escape') { e.preventDefault(); if (opts.onClose) opts.onClose(); return; }
      if (e.key !== 'Tab') return;
      var f = focusables();
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    return {
      activate: function () {
        var f = focusables();
        if (f.length) f[0].focus();
        document.addEventListener('keydown', onKeydown);
      },
      deactivate: function () {
        document.removeEventListener('keydown', onKeydown);
        if (opts.triggerEl && opts.triggerEl.focus) opts.triggerEl.focus();
      }
    };
  }

  /* ---------- NAV: stuck state + active link ---------- */
  (function nav() {
    var navEl = $('#nav');
    if (!navEl) return;

    var onScroll = function () {
      if (window.scrollY > 50) navEl.classList.add('is-stuck');
      else navEl.classList.remove('is-stuck');
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // Active link via IntersectionObserver
    var map = {};
    $$('.nav__link').forEach(function (link) {
      var id = link.getAttribute('href');
      if (id && id.charAt(0) === '#') map[id.slice(1)] = link;
    });
    var sections = Object.keys(map).map(function (id) { return document.getElementById(id); }).filter(Boolean);
    if ('IntersectionObserver' in window && sections.length) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          var link = map[entry.target.id];
          if (!link) return;
          if (entry.isIntersecting) {
            $$('.nav__link').forEach(function (l) { l.classList.remove('is-active'); });
            link.classList.add('is-active');
          }
        });
      }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
      sections.forEach(function (s) { io.observe(s); });
    }
  })();

  /* ---------- MOBILE MENU ---------- */
  (function mobileMenu() {
    var navEl  = $('#nav');
    var burger = $('#nav-burger');
    var menu   = $('#mobile-menu');
    var main   = $('#main');
    if (!burger || !menu) return;

    var trap = createFocusTrap(menu, { triggerEl: burger, onClose: close });
    var open = false;

    function openMenu() {
      open = true;
      menu.classList.add('is-open');
      menu.setAttribute('aria-hidden', 'false');
      if (navEl) navEl.classList.add('is-open');
      burger.setAttribute('aria-expanded', 'true');
      burger.setAttribute('aria-label', 'Закрыть меню');
      if (main) main.setAttribute('inert', '');
      ns.lockScroll();
      trap.activate();
    }
    function close() {
      if (!open) return;
      open = false;
      menu.classList.remove('is-open');
      menu.setAttribute('aria-hidden', 'true');
      if (navEl) navEl.classList.remove('is-open');
      burger.setAttribute('aria-expanded', 'false');
      burger.setAttribute('aria-label', 'Открыть меню');
      if (main) main.removeAttribute('inert');
      ns.unlockScroll();
      trap.deactivate();
    }
    burger.addEventListener('click', function () { open ? close() : openMenu(); });
    // Close when a menu link is chosen (smooth scroll handled by motion.js / native)
    $$('.mobile-menu__link, .mobile-menu__cta', menu).forEach(function (a) {
      a.addEventListener('click', function () { close(); });
    });
    ns.closeMobileMenu = close;
  })();

  /* ---------- LIGHTBOX ---------- */
  (function lightbox() {
    var box     = $('#lightbox');
    var imgEl   = $('#lightbox-img');
    var capEl   = $('#lightbox-caption');
    var btnClose= $('#lightbox-close');
    var btnPrev = $('#lightbox-prev');
    var btnNext = $('#lightbox-next');
    if (!box || !imgEl) return;

    // Build the item list from the static gallery DOM
    var figures = $$('#gallery-grid .gallery__item');
    var items = figures.map(function (fig) {
      var img = $('img', fig);
      return {
        src: img ? img.getAttribute('src') : '',
        name: (function () { var n = $('.gallery__name', fig); return n ? n.textContent : ''; })(),
        material: (function () { var m = $('.gallery__material', fig); return m ? m.textContent : ''; })(),
        alt: img ? (img.getAttribute('alt') || '') : '',
        trigger: $('.gallery__btn', fig)
      };
    });
    var index = -1;
    var trap = createFocusTrap(box, { triggerEl: null, onClose: close });

    function render(i) {
      var it = items[i];
      if (!it) return;
      imgEl.removeAttribute('aria-hidden');           // expose image inside the open dialog (a11y)
      imgEl.style.opacity = '0';                        // crossfade between works
      imgEl.alt = it.alt;
      imgEl.src = it.src;
      var reveal = function () { imgEl.style.opacity = '1'; };
      if (imgEl.complete) reveal(); else { imgEl.onload = reveal; imgEl.onerror = reveal; }
      // Preload neighbours so navigation feels instant
      [items[i + 1], items[i - 1]].forEach(function (n) { if (n && n.src) { var p = new Image(); p.src = n.src; } });
      capEl.textContent = it.material ? (it.name + ' — ' + it.material) : it.name;
    }
    function openAt(i) {
      index = i;
      trap.deactivate(); // reset any previous trigger
      trap = createFocusTrap(box, { triggerEl: items[i] ? items[i].trigger : null, onClose: close });
      render(i);
      box.classList.add('is-open');
      box.setAttribute('aria-hidden', 'false');
      $$('body > *:not(#lightbox)').forEach(function (el) { el.setAttribute('inert', ''); });
      ns.lockScroll();
      trap.activate();
    }
    function close() {
      box.classList.remove('is-open');
      box.setAttribute('aria-hidden', 'true');
      $$('body > *:not(#lightbox)').forEach(function (el) { el.removeAttribute('inert'); });
      ns.unlockScroll();
      trap.deactivate();
    }
    function go(delta) {
      if (!items.length) return;
      index = (index + delta + items.length) % items.length;
      render(index);
    }

    figures.forEach(function (fig, i) {
      var btn = $('.gallery__btn', fig);
      if (btn) btn.addEventListener('click', function () { openAt(i); });
    });
    btnClose.addEventListener('click', close);
    btnPrev.addEventListener('click', function () { go(-1); });
    btnNext.addEventListener('click', function () { go(1); });
    box.addEventListener('click', function (e) { if (e.target === box) close(); });
    box.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'ArrowRight') go(1);
    });
    // Touch swipe (no arrow buttons needed on phones)
    var swipeX = 0;
    box.addEventListener('touchstart', function (e) { swipeX = e.touches[0].clientX; }, { passive: true });
    box.addEventListener('touchend', function (e) {
      var dx = e.changedTouches[0].clientX - swipeX;
      if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
    }, { passive: true });
  })();

  /* ---------- CONTACT FORM ---------- */
  (function form() {
    var formEl = $('#contact-form');
    if (!formEl) return;
    var hint = $('#form-hint');
    var submitBtn = $('#form-submit');
    var defaultLabel = submitBtn ? submitBtn.textContent : 'Отправить';

    function setError(input, message) {
      var field = input.closest('.form__field');
      var err = field ? $('.form__error', field) : null;
      if (err) { if (!err.id) err.id = input.id + '-error'; err.setAttribute('role', 'alert'); }
      if (message) {
        if (field) field.classList.add('has-error');
        input.setAttribute('aria-invalid', 'true');
        if (err) { err.textContent = message; input.setAttribute('aria-describedby', err.id); }
      } else {
        if (field) field.classList.remove('has-error');
        input.removeAttribute('aria-invalid');
        input.removeAttribute('aria-describedby');
        if (err) err.textContent = '';
      }
    }

    formEl.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = $('#f-name'), contact = $('#f-contact'), message = $('#f-message');
      var ok = true;
      if (!name.value.trim())    { setError(name, 'Укажите, как к вам обращаться'); ok = false; } else setError(name);
      if (!contact.value.trim()) { setError(contact, 'Оставьте телефон или Telegram'); ok = false; } else setError(contact);
      if (!ok) { name.value.trim() ? contact.focus() : name.focus(); return; }

      // Record the lead in the shared store so it shows up in admin.html.
      if (window.ShtolliLeads) {
        try {
          window.ShtolliLeads.add({
            source: 'contact',
            name: name.value.trim(),
            contact: contact.value.trim(),
            comment: message.value.trim()
          });
        } catch (err) {}
      }

      // No backend: compose a mailto so the message is not lost, and confirm.
      var subject = encodeURIComponent('Заявка с сайта — ' + name.value.trim());
      var body = encodeURIComponent(
        'Имя: ' + name.value.trim() + '\n' +
        'Контакт: ' + contact.value.trim() + '\n\n' +
        (message.value.trim() || '(идея не описана)')
      );
      var mailto = 'mailto:shtolik@list.ru?subject=' + subject + '&body=' + body;

      if (submitBtn) { submitBtn.textContent = 'Спасибо! Мы свяжемся с вами'; submitBtn.disabled = true; }
      if (hint) {
        hint.innerHTML = 'Заявка готова. Если почтовый клиент не открылся — напишите нам в ' +
                         '<a href="https://t.me/shtolli_sculptor" target="_blank" rel="noopener" style="text-decoration:underline">Telegram</a> или ' +
                         '<a href="https://wa.me/79384499311" target="_blank" rel="noopener" style="text-decoration:underline">WhatsApp</a>.';
      }
      try { window.location.href = mailto; } catch (err) {}

      setTimeout(function () {
        if (submitBtn) { submitBtn.textContent = defaultLabel; submitBtn.disabled = false; }
        if (hint) hint.textContent = '';
        formEl.reset();
      }, 6000);
    });
  })();

})();
