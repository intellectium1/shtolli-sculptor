/* ============================================================
   ШТОЛЛИ — отправка заявок (Formspree)

   Чтобы заявки из контактной формы и квиза приходили на e-mail
   АВТОМАТИЧЕСКИ (без ручного шага):
     1. Зарегистрируйте бесплатную форму на https://formspree.io
        и укажите получателем shtolik@list.ru
     2. Скопируйте её endpoint вида https://formspree.io/f/xxxxxxxx
     3. Вставьте его в SHTOLLI_FORMSPREE ниже и задеплойте.

   Пока строка пустая — сайт работает в РУЧНОМ режиме
   (WhatsApp / Telegram / почта), ничего не ломается.
   Альтернатива Formspree — EmailJS: тогда замените тело
   ShtolliSend на вызов emailjs.send(...). Интерфейс тот же.
   ============================================================ */
(function () {
  'use strict';

  window.SHTOLLI_FORMSPREE = ''; // <-- вставьте сюда https://formspree.io/f/XXXXXXXX

  /* Отправляет заявку. Возвращает Promise<boolean>:
     true  — успешно отправлено на сервер,
     false — не настроено или ошибка сети (вызывающий код
             покажет ручной способ: WhatsApp / Telegram / почта).
     Никогда не бросает исключение. */
  window.ShtolliSend = function (payload) {
    var url = (window.SHTOLLI_FORMSPREE || '').trim();
    if (!url) return Promise.resolve(false);
    try {
      return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
      }).then(function (r) { return r.ok; }).catch(function () { return false; });
    } catch (e) {
      return Promise.resolve(false);
    }
  };
})();
