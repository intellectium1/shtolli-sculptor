/* ============================================================
   ШТОЛЛИ — Quiz logic
   Button-based steps (fully keyboard accessible), no deps.
   Builds a formatted lead and hands off via WhatsApp / email /
   Telegram (copy) — works on a static host without a backend.
   ============================================================ */
(function () {
  'use strict';

  var root = document.getElementById('quiz');
  if (!root) return;

  var WA_NUMBER = '79384499311';
  var MAIL_TO   = 'shtolik@list.ru';

  var QUESTION_KEYS = ['type', 'material', 'size', 'timeline'];
  var LABELS = {
    type: 'Что нужно', material: 'Материал', size: 'Размер',
    timeline: 'Сроки', name: 'Имя', contact: 'Контакт', comment: 'Комментарий'
  };

  var answers = {};
  var steps = Array.prototype.slice.call(root.querySelectorAll('.quiz-step'));
  var TOTAL = steps.length;              // 4 questions + 1 contact
  var QCOUNT = QUESTION_KEYS.length;     // 4
  var current = 0;

  var fill      = document.getElementById('quiz-fill');
  var stepNow   = document.getElementById('quiz-step-now');
  var stepWord  = document.getElementById('quiz-step-word');
  var stepSR    = document.getElementById('quiz-progress-sr');
  var backBtn   = document.getElementById('quiz-back');
  var cardEl    = document.getElementById('quiz-card');
  var resultEl  = document.getElementById('quiz-result');

  /* ---------- Option buttons (questions) ---------- */
  steps.forEach(function (stepEl) {
    var key = stepEl.getAttribute('data-q');
    if (!key) return;
    var opts = stepEl.querySelectorAll('.quiz-option');
    opts.forEach(function (btn) {
      btn.addEventListener('click', function () {
        answers[key] = btn.getAttribute('data-value');
        opts.forEach(function (b) {
          var on = b === btn;
          b.classList.toggle('is-selected', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        var idx = steps.indexOf(stepEl);
        window.setTimeout(function () { goTo(idx + 1, true); }, 280);
      });
    });
  });

  /* ---------- Navigation ---------- */
  function goTo(i, doFocus) {
    if (i >= TOTAL) { i = TOTAL - 1; }
    if (i < 0) { i = 0; }
    current = i;
    steps.forEach(function (s, idx) { s.hidden = idx !== i; });
    updateProgress();
    backBtn.hidden = (i === 0);
    // focus the step heading for screen readers (only on user-driven navigation)
    if (doFocus) {
      var h = steps[i].querySelector('.quiz-step__q');
      if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
    }
  }

  function updateProgress() {
    var shown = current + 1;
    var pct = Math.round((shown / TOTAL) * 100);
    if (fill) fill.style.width = pct + '%';
    var isContact = current >= QCOUNT;
    var label = isContact ? 'Контактные данные' : ('Вопрос ' + shown + ' из ' + QCOUNT);
    if (stepNow)  stepNow.textContent = isContact ? 'Контакты' : ('Вопрос ' + shown + ' из ' + QCOUNT);
    if (stepWord) stepWord.textContent = pct + '%';
    if (stepSR)   stepSR.textContent = label;   /* announced to screen readers */
  }

  backBtn.addEventListener('click', function () { goTo(current - 1, true); });

  /* ---------- Restore selection visuals when returning ---------- */
  function syncSelections() {
    steps.forEach(function (stepEl) {
      var key = stepEl.getAttribute('data-q');
      if (!key) return;
      stepEl.querySelectorAll('.quiz-option').forEach(function (b) {
        var on = answers[key] === b.getAttribute('data-value');
        b.classList.toggle('is-selected', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    });
  }

  /* ---------- Contact step submit ---------- */
  var submitBtn = document.getElementById('quiz-submit');
  var nameInput = document.getElementById('q-name');
  var contactInput = document.getElementById('q-contact');
  var commentInput = document.getElementById('q-comment');

  function setError(input, on) {
    input.classList.toggle('has-error', on);
    input.setAttribute('aria-invalid', on ? 'true' : 'false');
  }

  if (submitBtn) {
    submitBtn.addEventListener('click', function () {
      var ok = true;
      if (!nameInput.value.trim())    { setError(nameInput, true); ok = false; } else setError(nameInput, false);
      if (!contactInput.value.trim()) { setError(contactInput, true); ok = false; } else setError(contactInput, false);
      if (!ok) { (nameInput.value.trim() ? contactInput : nameInput).focus(); return; }

      answers.name = nameInput.value.trim();
      answers.contact = contactInput.value.trim();
      answers.comment = commentInput.value.trim();
      saveLead();
      showResult();
    });
  }

  /* Сохраняем заявку в общий store (admin.html). Не мешает отправке
     через WhatsApp/Telegram/почту — это дополнительный канал учёта. */
  function saveLead() {
    if (!window.ShtolliLeads) return;
    try {
      window.ShtolliLeads.add({
        source: 'quiz',
        name: answers.name,
        contact: answers.contact,
        type: answers.type,
        material: answers.material,
        size: answers.size,
        timeline: answers.timeline,
        comment: answers.comment
      });
    } catch (e) {}
  }

  [nameInput, contactInput].forEach(function (inp) {
    if (inp) inp.addEventListener('input', function () { if (inp.value.trim()) setError(inp, false); });
  });

  /* ---------- Build & show result ---------- */
  function buildText() {
    var lines = ['Заявка с сайта ШТОЛЛИ', '------------------------------'];
    QUESTION_KEYS.forEach(function (k) {
      if (answers[k]) lines.push(LABELS[k] + ': ' + answers[k]);
    });
    lines.push(LABELS.name + ': ' + (answers.name || '—'));
    lines.push(LABELS.contact + ': ' + (answers.contact || '—'));
    if (answers.comment) lines.push(LABELS.comment + ': ' + answers.comment);
    return lines.join('\n');
  }

  function showResult() {
    var text = buildText();

    // Summary rows
    var sum = document.getElementById('quiz-summary');
    if (sum) {
      var rows = '';
      QUESTION_KEYS.concat(['name', 'contact']).forEach(function (k) {
        if (!answers[k]) return;
        rows += '<div class="quiz-summary__row"><span class="quiz-summary__key">' +
                LABELS[k] + '</span><span class="quiz-summary__val">' +
                escapeHtml(answers[k]) + '</span></div>';
      });
      if (answers.comment) {
        rows += '<div class="quiz-summary__row"><span class="quiz-summary__key">' +
                LABELS.comment + '</span><span class="quiz-summary__val">' +
                escapeHtml(answers.comment) + '</span></div>';
      }
      sum.innerHTML = rows;
    }

    var enc = encodeURIComponent(text);
    var wa = document.getElementById('quiz-wa');
    var mail = document.getElementById('quiz-mail');
    if (wa)   wa.href   = 'https://wa.me/' + WA_NUMBER + '?text=' + enc;
    if (mail) mail.href = 'mailto:' + MAIL_TO + '?subject=' +
                          encodeURIComponent('Заявка с сайта ШТОЛЛИ') + '&body=' + enc;

    // onclick (property) is idempotent — re-running showResult() after a
    // restart+resubmit must not stack duplicate listeners. The TG anchor
    // opens t.me natively via its href; here we only copy the lead text.
    var tg = document.getElementById('quiz-tg');
    if (tg) tg.onclick = function () { copyText(text); };

    var copy = document.getElementById('quiz-copy');
    if (copy) copy.onclick = function () {
      copyText(text);
      var orig = copy.getAttribute('data-label') || copy.textContent;
      copy.textContent = 'Скопировано ✓';
      window.setTimeout(function () { copy.textContent = orig; }, 1800);
    };

    cardEl.hidden = true;
    resultEl.hidden = false;
    if (fill) fill.style.width = '100%';
    if (stepNow) stepNow.textContent = 'Заявка готова';
    if (stepWord) stepWord.textContent = '100%';
    backBtn.hidden = true;
    resultEl.querySelector('.quiz-result__title').setAttribute('tabindex', '-1');
    resultEl.querySelector('.quiz-result__title').focus();
  }

  function copyText(t) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(t).catch(function () { legacyCopy(t); });
    } else { legacyCopy(t); }
  }
  function legacyCopy(t) {
    var ta = document.createElement('textarea');
    ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------- Restart ---------- */
  var restart = document.getElementById('quiz-restart');
  if (restart) restart.addEventListener('click', function () {
    answers = {};
    syncSelections();
    if (nameInput) nameInput.value = '';
    if (contactInput) contactInput.value = '';
    if (commentInput) commentInput.value = '';
    resultEl.hidden = true;
    cardEl.hidden = false;
    goTo(0, true);
  });

  /* ---------- Boot ---------- */
  root.classList.add('is-enhanced');
  goTo(0, false);
})();
