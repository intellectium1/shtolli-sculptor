/* ============================================================
   ШТОЛЛИ — Leads store (shared)
   ------------------------------------------------------------
   Единый слой заявок для публичных форм (квиз + контакты) и
   административного окна (admin.html). Хранилище — localStorage,
   без бэкенда (выбор: автономное демо). Vanilla JS, classic
   script, без зависимостей — как остальной код проекта.

   ВАЖНО (least agency / no external egress): модуль НЕ отправляет
   данные наружу. Заявки живут в браузере. Чтобы подключить
   реальный бэкенд (Supabase / Telegram-бот / Formspree), см.
   `ShtolliLeads.remote` ниже — это явный шов, по умолчанию off.

   Namespace: window.ShtolliLeads
   ============================================================ */
(function () {
  'use strict';

  var KEY       = 'shtolli_leads_v1';
  var SEED_FLAG = 'shtolli_leads_seeded_v1';

  /* ---- Воронка: согласование проекта -> этапы реализации ---- */
  var STAGES = [
    { id: 'new',        label: 'Новая заявка',          hint: 'Только что поступила' },
    { id: 'consult',    label: 'Консультация',          hint: 'Связались, уточняем задачу' },
    { id: 'design',     label: 'Согласование эскиза/3D', hint: 'Эскиз или 3D-модель на утверждении' },
    { id: 'contract',   label: 'Договор и предоплата',   hint: 'Условия согласованы, внесена предоплата' },
    { id: 'production',  label: 'Литьё / производство',   hint: 'В работе в мастерской' },
    { id: 'finishing',  label: 'Финишная обработка',     hint: 'Патина, монтаж, контроль качества' },
    { id: 'done',       label: 'Готово / выдача',        hint: 'Завершено и передано клиенту' }
  ];
  var ARCHIVED = 'archived'; // вне основной воронки (отказ / неактуально)

  var STAGE_LABELS = {};
  STAGES.forEach(function (s) { STAGE_LABELS[s.id] = s.label; });
  STAGE_LABELS[ARCHIVED] = 'Архив';

  var FIELD_LABELS = {
    type:     'Что нужно',
    material: 'Материал',
    size:     'Размер',
    timeline: 'Сроки',
    comment:  'Комментарий'
  };

  var SOURCE_LABELS = { quiz: 'Квиз-расчёт', contact: 'Форма контактов' };

  /* ---- Низкоуровневое хранилище ---- */
  function now() { return Date.now(); }

  function uid() {
    return 'l_' + now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function read() {
    try {
      var raw = window.localStorage.getItem(KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function write(arr) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(arr));
    } catch (e) {
      // storage full / disabled — fail loud in console, не молчим
      if (window.console) console.error('[ShtolliLeads] localStorage write failed:', e);
      return false;
    }
    emit();
    return true;
  }

  /* ---- Pub/sub: тот же таб (CustomEvent) + другие табы (storage) ---- */
  var listeners = [];
  function subscribe(fn) {
    if (typeof fn === 'function') listeners.push(fn);
    return function () { listeners = listeners.filter(function (f) { return f !== fn; }); };
  }
  function emit() {
    listeners.forEach(function (fn) { try { fn(); } catch (e) {} });
  }
  window.addEventListener('storage', function (e) {
    if (e.key === KEY) emit();
  });

  /* ---- CRUD ---- */
  function all() {
    return read().sort(function (a, b) { return b.createdAt - a.createdAt; });
  }

  function get(id) {
    var found = null;
    read().forEach(function (l) { if (l.id === id) found = l; });
    return found;
  }

  // Принимает сырые поля формы, возвращает сохранённую заявку.
  function add(data) {
    data = data || {};
    var t = now();
    var lead = {
      id: uid(),
      createdAt: t,
      updatedAt: t,
      stage: 'new',
      archived: false,
      source: data.source || 'contact',
      name: (data.name || '').toString().trim(),
      contact: (data.contact || '').toString().trim(),
      type: (data.type || '').toString().trim(),
      material: (data.material || '').toString().trim(),
      size: (data.size || '').toString().trim(),
      timeline: (data.timeline || '').toString().trim(),
      comment: (data.comment || '').toString().trim(),
      demo: !!data.demo,
      notes: [],
      history: [{ at: t, stage: 'new' }]
    };
    var arr = read();
    arr.push(lead);
    write(arr);

    // Явный шов для будущего реального бэкенда (по умолчанию off).
    try { if (api.remote && typeof api.remote.send === 'function') api.remote.send(lead); } catch (e) {}

    return lead;
  }

  function mutate(id, fn) {
    var arr = read();
    var changed = false;
    arr = arr.map(function (l) {
      if (l.id !== id) return l;
      changed = true;
      fn(l);
      l.updatedAt = now();
      return l;
    });
    if (changed) write(arr);
    return changed;
  }

  function move(id, stage) {
    if (stage !== ARCHIVED && !STAGE_LABELS[stage]) return false;
    return mutate(id, function (l) {
      if (stage === ARCHIVED) { l.archived = true; }
      else { l.archived = false; l.stage = stage; }
      l.history = l.history || [];
      l.history.push({ at: now(), stage: stage });
    });
  }

  function archive(id) { return move(id, ARCHIVED); }
  function restore(id) {
    return mutate(id, function (l) {
      l.archived = false;
      l.history = l.history || [];
      l.history.push({ at: now(), stage: l.stage || 'new' });
    });
  }

  function addNote(id, text) {
    text = (text || '').toString().trim();
    if (!text) return false;
    return mutate(id, function (l) {
      l.notes = l.notes || [];
      l.notes.push({ at: now(), text: text });
    });
  }

  function update(id, patch) {
    patch = patch || {};
    return mutate(id, function (l) {
      Object.keys(patch).forEach(function (k) {
        if (k === 'id' || k === 'createdAt') return;
        l[k] = patch[k];
      });
    });
  }

  function remove(id) {
    var arr = read().filter(function (l) { return l.id !== id; });
    return write(arr);
  }

  function clearAll() { return write([]); }

  function removeDemo() {
    var arr = read().filter(function (l) { return !l.demo; });
    return write(arr);
  }

  /* ---- Демо-данные (один раз, чтобы доска не была пустой) ---- */
  function seedIfEmpty() {
    var seeded = false;
    try { seeded = window.localStorage.getItem(SEED_FLAG) === '1'; } catch (e) {}
    if (seeded || read().length) return false;

    var DAY = 86400000;
    var t = now();
    var demo = [
      {
        source: 'quiz', stage: 'design', name: 'Михаил К.', contact: '@mihail_k',
        type: 'Барельеф или портрет по фото', material: 'Бронза',
        size: 'Настольный (до 30 см)', timeline: '1–2 месяца',
        comment: 'Барельеф к юбилею по фотографии. Согласовываем 3D-модель.',
        ageDays: 6, notes: ['Отправили эскиз на утверждение 2 дня назад.']
      },
      {
        source: 'quiz', stage: 'production', name: 'Оргкомитет «Новая волна»', contact: '+7 900 000-00-00',
        type: 'Художественное литьё', material: 'Латунь',
        size: 'Серия изделий', timeline: 'Срочно — до месяца',
        comment: 'Серия наградных табличек, 24 шт. Предоплата внесена.',
        ageDays: 12, notes: ['Запущено в литьё.', 'Срок — к концу месяца.']
      },
      {
        source: 'contact', stage: 'new', name: 'Владимир С.', contact: 'vladimir@example.com',
        comment: 'Интересуют декоративные весы ~2,5 м для рынка. Нужна оценка.',
        ageDays: 0, notes: []
      }
    ];

    var arr = demo.map(function (d) {
      var created = t - (d.ageDays || 0) * DAY;
      return {
        id: uid(), createdAt: created, updatedAt: t,
        stage: d.stage || 'new', archived: false, source: d.source,
        name: d.name, contact: d.contact,
        type: d.type || '', material: d.material || '', size: d.size || '',
        timeline: d.timeline || '', comment: d.comment || '',
        demo: true,
        notes: (d.notes || []).map(function (n, i) { return { at: created + (i + 1) * 3600000, text: n }; }),
        history: [{ at: created, stage: 'new' }, { at: t, stage: d.stage || 'new' }]
      };
    });

    write(arr);
    try { window.localStorage.setItem(SEED_FLAG, '1'); } catch (e) {}
    return true;
  }

  /* ---- Публичный API ---- */
  var api = {
    STAGES: STAGES,
    ARCHIVED: ARCHIVED,
    STAGE_LABELS: STAGE_LABELS,
    FIELD_LABELS: FIELD_LABELS,
    SOURCE_LABELS: SOURCE_LABELS,
    all: all,
    get: get,
    add: add,
    move: move,
    archive: archive,
    restore: restore,
    addNote: addNote,
    update: update,
    remove: remove,
    clearAll: clearAll,
    removeDemo: removeDemo,
    seedIfEmpty: seedIfEmpty,
    subscribe: subscribe,
    // Шов для реального бэкенда. Пример включения (НЕ авто):
    //   ShtolliLeads.remote = { send: function (lead) { fetch(URL, {method:'POST', body: JSON.stringify(lead)}); } };
    remote: null
  };

  window.ShtolliLeads = api;
})();
