/* ============================================================
   ШТОЛЛИ — Admin logic
   Канбан-ведение заявок поверх ShtolliLeads (localStorage).
   Vanilla JS, без зависимостей.
   ============================================================ */
(function () {
  'use strict';

  /* Демо-защита на стороне браузера. ЭТО НЕ настоящая авторизация
     (код виден в исходниках). Для реального доступа нужен бэкенд.
     Поменять код можно здесь (и в README). */
  var ADMIN_PASS    = 'shtolli2026';
  var SESSION_KEY   = 'shtolli_admin_ok';

  var L = window.ShtolliLeads;

  var STAGE_ACCENT = {
    new: 'var(--st-new)', consult: 'var(--st-consult)', design: 'var(--st-design)',
    contract: 'var(--st-contract)', production: 'var(--st-production)',
    finishing: 'var(--st-finishing)', done: 'var(--st-done)', archived: 'var(--st-archived)'
  };

  var $  = function (s, c) { return (c || document).querySelector(s); };

  var state = { search: '', source: '', showArchived: false };
  var dragId = null;

  /* ---------- helpers ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function ago(ts) {
    var d = Date.now() - ts, m = Math.floor(d / 60000);
    if (m < 1) return 'только что';
    if (m < 60) return m + ' мин назад';
    var h = Math.floor(m / 60);
    if (h < 24) return h + ' ч назад';
    var days = Math.floor(h / 24);
    if (days < 30) return days + ' дн назад';
    return new Date(ts).toLocaleDateString('ru-RU');
  }
  function fmtDate(ts) {
    return new Date(ts).toLocaleString('ru-RU', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }
  function stageIndex(id) {
    for (var i = 0; i < L.STAGES.length; i++) if (L.STAGES[i].id === id) return i;
    return -1;
  }

  /* ---------- gate ---------- */
  function isUnlocked() {
    try { return sessionStorage.getItem(SESSION_KEY) === '1'; } catch (e) { return false; }
  }
  function unlock() {
    try { sessionStorage.setItem(SESSION_KEY, '1'); } catch (e) {}
  }
  function lock() {
    try { sessionStorage.removeItem(SESSION_KEY); } catch (e) {}
  }

  function showApp() {
    $('#gate').hidden = true;
    $('#app').hidden = false;
    render();
  }

  function initGate() {
    var form = $('#gate-form'), pass = $('#gate-pass'), err = $('#gate-error');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (pass.value === ADMIN_PASS) {
        unlock();
        err.textContent = '';
        showApp();
      } else {
        err.textContent = 'Неверный код доступа';
        pass.select();
      }
    });
  }

  /* ---------- filtering ---------- */
  function matches(lead) {
    if (state.source && lead.source !== state.source) return false;
    if (state.search) {
      var hay = [lead.name, lead.contact, lead.comment, lead.type, lead.material, lead.size, lead.timeline]
        .join(' ').toLowerCase();
      if (hay.indexOf(state.search.toLowerCase()) < 0) return false;
    }
    return true;
  }

  /* ---------- card ---------- */
  function chipsHtml(lead) {
    var chips = [];
    ['type', 'material', 'size', 'timeline'].forEach(function (k) {
      if (lead[k]) chips.push('<span class="chip">' + esc(lead[k]) + '</span>');
    });
    return chips.length ? '<div class="card__chips">' + chips.join('') + '</div>' : '';
  }

  function cardHtml(lead, archivedView) {
    var idx = stageIndex(lead.stage);
    var sid = esc(lead.id);
    var moves;
    if (archivedView) {
      moves = '<button class="card__move" data-act="restore" data-id="' + sid + '" title="Вернуть в работу">↩</button>';
    } else {
      moves =
        '<button class="card__move" data-act="prev" data-id="' + sid + '" title="Предыдущий этап"' + (idx <= 0 ? ' disabled' : '') + '>◀</button>' +
        '<button class="card__move" data-act="next" data-id="' + sid + '" title="Следующий этап"' + (idx >= L.STAGES.length - 1 ? ' disabled' : '') + '>▶</button>';
    }
    return '' +
      '<article class="card" data-id="' + sid + '" draggable="true" tabindex="0" ' +
      'style="--accent:' + (STAGE_ACCENT[archivedView ? 'archived' : lead.stage] || 'var(--c-bronze)') + '">' +
        '<div class="card__top">' +
          '<span class="card__name">' + esc(lead.name || 'Без имени') + '</span>' +
          '<span class="card__src">' + esc(L.SOURCE_LABELS[lead.source] || lead.source) + '</span>' +
        '</div>' +
        (lead.contact ? '<div class="card__contact">' + esc(lead.contact) + '</div>' : '') +
        chipsHtml(lead) +
        (lead.comment ? '<p class="card__comment">' + esc(lead.comment) + '</p>' : '') +
        '<div class="card__foot">' +
          '<span class="card__time">' + esc(ago(lead.createdAt)) + '</span>' +
          (lead.demo ? '<span class="card__demo">демо</span>' : '') +
          '<span class="card__moves">' + moves + '</span>' +
        '</div>' +
      '</article>';
  }

  /* ---------- board ---------- */
  function render() {
    renderStats();
    var board = $('#board');
    var leads = L.all().filter(matches);

    if (state.showArchived) {
      var arch = leads.filter(function (l) { return l.archived; });
      board.innerHTML = colHtml({ id: 'archived', label: 'Архив', hint: 'Отказ / неактуально — можно вернуть в работу' }, arch, true);
    } else {
      var active = leads.filter(function (l) { return !l.archived; });
      board.innerHTML = L.STAGES.map(function (st) {
        var col = active.filter(function (l) { return l.stage === st.id; });
        return colHtml(st, col, false);
      }).join('');
    }
  }

  function colHtml(stage, leads, archivedView) {
    var cards = leads.length
      ? leads.map(function (l) { return cardHtml(l, archivedView); }).join('')
      : '<div class="col__empty">Пусто</div>';
    return '' +
      '<section class="col" data-stage="' + stage.id + '">' +
        '<div class="col__head">' +
          '<span class="col__dot" style="background:' + (STAGE_ACCENT[stage.id] || 'var(--c-bronze)') + '"></span>' +
          '<span class="col__title">' + esc(stage.label) + '</span>' +
          '<span class="col__count">' + leads.length + '</span>' +
        '</div>' +
        (stage.hint ? '<p class="col__hint">' + esc(stage.hint) + '</p>' : '') +
        '<div class="col__body">' + cards + '</div>' +
      '</section>';
  }

  function renderStats() {
    var all = L.all();
    var active = all.filter(function (l) { return !l.archived; });
    var fresh = active.filter(function (l) { return l.stage === 'new'; });
    var done = all.filter(function (l) { return l.stage === 'done' && !l.archived; });
    $('#admin-stats').innerHTML =
      stat(active.length, 'в работе') + stat(fresh.length, 'новых') +
      stat(done.length, 'готово') + stat(all.length, 'всего');
  }
  function stat(n, label) {
    return '<div class="admin-stat"><b>' + n + '</b><span>' + label + '</span></div>';
  }

  /* ---------- board interactions ---------- */
  function initBoard() {
    var board = $('#board');

    board.addEventListener('click', function (e) {
      var btn = e.target.closest('.card__move');
      if (btn) {
        e.stopPropagation();
        var id = btn.getAttribute('data-id'), act = btn.getAttribute('data-act');
        var lead = L.get(id);
        if (!lead) return;
        if (act === 'restore') { L.restore(id); }
        else {
          var idx = stageIndex(lead.stage);
          var ni = act === 'next' ? idx + 1 : idx - 1;
          if (ni >= 0 && ni < L.STAGES.length) L.move(id, L.STAGES[ni].id);
        }
        return;
      }
      var card = e.target.closest('.card');
      if (card) openModal(card.getAttribute('data-id'));
    });

    board.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var card = e.target.closest && e.target.closest('.card');
      if (card && e.target === card) { e.preventDefault(); openModal(card.getAttribute('data-id')); }
    });

    /* drag and drop */
    board.addEventListener('dragstart', function (e) {
      var card = e.target.closest('.card');
      if (!card) return;
      dragId = card.getAttribute('data-id');
      card.classList.add('is-dragging');
      try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', dragId); } catch (err) {}
    });
    board.addEventListener('dragend', function () {
      dragId = null;
      clearDrop();
      var d = board.querySelector('.is-dragging');
      if (d) d.classList.remove('is-dragging');
    });
    board.addEventListener('dragover', function (e) {
      var col = e.target.closest('.col');
      if (!col || dragId == null) return;
      e.preventDefault();
      if (!col.classList.contains('is-drop-target')) { clearDrop(); col.classList.add('is-drop-target'); }
    });
    board.addEventListener('drop', function (e) {
      var col = e.target.closest('.col');
      if (!col || dragId == null) return;
      e.preventDefault();
      var stage = col.getAttribute('data-stage');
      if (stage === 'archived') L.archive(dragId);
      else L.move(dragId, stage);
      clearDrop();
    });
  }
  function clearDrop() {
    Array.prototype.forEach.call(document.querySelectorAll('.is-drop-target'), function (c) {
      c.classList.remove('is-drop-target');
    });
  }

  /* ---------- modal ---------- */
  var modal = null, modalId = null;

  function openModal(id) {
    var lead = L.get(id);
    if (!lead) return;
    modalId = id;
    $('#modal-title').textContent = lead.name || 'Без имени';
    $('#modal-meta').textContent =
      (L.SOURCE_LABELS[lead.source] || lead.source) + ' · ' + fmtDate(lead.createdAt) + (lead.demo ? ' · демо' : '');
    $('#modal-body').innerHTML = modalBody(lead);
    modal.hidden = false;
    wireModalBody();
    var close = $('#modal-close'); if (close) close.focus();
  }

  function modalBody(lead) {
    var rows = '';
    rows += kv('Контакт', lead.contact || '—');
    ['type', 'material', 'size', 'timeline'].forEach(function (k) {
      if (lead[k]) rows += kv(L.FIELD_LABELS[k], lead[k]);
    });
    if (lead.comment) rows += kv(L.FIELD_LABELS.comment, lead.comment);

    var opts = L.STAGES.map(function (s) {
      return '<option value="' + s.id + '"' + (!lead.archived && lead.stage === s.id ? ' selected' : '') + '>' + esc(s.label) + '</option>';
    }).join('');
    opts += '<option value="archived"' + (lead.archived ? ' selected' : '') + '>Архив (отказ / неактуально)</option>';

    var hist = (lead.history || []).slice().reverse().map(function (h) {
      return '<li>' + esc(L.STAGE_LABELS[h.stage] || h.stage) + '<br><time>' + esc(fmtDate(h.at)) + '</time></li>';
    }).join('') || '<li>Нет событий</li>';

    var notes = (lead.notes || []).slice().reverse().map(function (n) {
      return '<li class="note">' + esc(n.text) + '<time>' + esc(fmtDate(n.at)) + '</time></li>';
    }).join('');

    return '' +
      '<div class="kv">' + rows + '</div>' +
      '<div class="modal__section-label">Этап</div>' +
      '<div class="stage-pick"><select id="m-stage" aria-label="Этап заявки">' + opts + '</select></div>' +
      '<div class="modal__section-label">Заметки</div>' +
      (notes ? '<ul class="notes">' + notes + '</ul>' : '') +
      '<div class="note-add">' +
        '<textarea id="m-note" placeholder="Добавить заметку (созвон, договорённость, замечание)…"></textarea>' +
        '<button class="btn-a" id="m-note-add" type="button">Добавить</button>' +
      '</div>' +
      '<div class="modal__section-label">История</div>' +
      '<ul class="timeline">' + hist + '</ul>' +
      '<div class="modal__actions">' +
        (lead.archived
          ? '<button class="btn-a btn-a--primary" id="m-restore" type="button">Вернуть в работу</button>'
          : '<button class="btn-a btn-a--danger" id="m-archive" type="button">В архив</button>') +
        '<button class="btn-a btn-a--danger btn-a--spacer" id="m-delete" type="button">Удалить</button>' +
      '</div>';
  }
  function kv(k, v) {
    return '<div class="kv__k">' + esc(k) + '</div><div class="kv__v">' + esc(v) + '</div>';
  }

  function wireModalBody() {
    var stageSel = $('#m-stage');
    if (stageSel) stageSel.addEventListener('change', function () {
      if (this.value === 'archived') L.archive(modalId);
      else L.move(modalId, this.value);
      reopen();
    });
    var noteAdd = $('#m-note-add');
    if (noteAdd) noteAdd.addEventListener('click', function () {
      var ta = $('#m-note');
      if (ta && ta.value.trim()) { L.addNote(modalId, ta.value.trim()); reopen(); }
    });
    bind('#m-archive', function () { L.archive(modalId); reopen(); });
    bind('#m-restore', function () { L.restore(modalId); reopen(); });
    bind('#m-delete', function () {
      if (window.confirm('Удалить заявку безвозвратно?')) { L.remove(modalId); closeModal(); }
    });
  }
  function bind(sel, fn) { var el = $(sel); if (el) el.addEventListener('click', fn); }

  function reopen() { if (modalId) openModal(modalId); }
  function closeModal() { modal.hidden = true; modalId = null; }

  function initModal() {
    modal = $('#lead-modal');
    $('#modal-close').addEventListener('click', closeModal);
    modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !modal.hidden) closeModal();
    });
  }

  /* ---------- toolbar ---------- */
  function initToolbar() {
    $('#tb-search').addEventListener('input', function () { state.search = this.value; render(); });
    $('#tb-source').addEventListener('change', function () { state.source = this.value; render(); });
    $('#tb-archive').addEventListener('click', function () {
      state.showArchived = !state.showArchived;
      this.classList.toggle('is-active', state.showArchived);
      this.setAttribute('aria-pressed', state.showArchived ? 'true' : 'false');
      render();
    });
    $('#tb-export').addEventListener('click', exportJson);
    $('#tb-demo').addEventListener('click', function () {
      if (window.confirm('Удалить все демонстрационные заявки?')) { L.removeDemo(); }
    });
    $('#tb-logout').addEventListener('click', function () { lock(); location.reload(); });
  }

  function exportJson() {
    var data = JSON.stringify(L.all(), null, 2);
    var blob = new Blob([data], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'shtolli-zayavki-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  /* ---------- boot ---------- */
  function boot() {
    document.documentElement.classList.remove('no-js');
    if (!L) { document.body.innerHTML = '<p style="padding:2rem">Ошибка: leads-store.js не загружен.</p>'; return; }
    L.seedIfEmpty();
    initGate();
    initToolbar();
    initBoard();
    initModal();
    // Любое изменение store (в т.ч. из другой вкладки/формы) — перерисовать.
    L.subscribe(function () { if (!$('#app').hidden) render(); });
    if (isUnlocked()) showApp();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
